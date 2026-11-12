#!/usr/bin/env bash
set -euo pipefail

if [[ "${NSOS_BACKUP_RESTORE_CI:-}" != "1" ]]; then
  echo "This rehearsal is CI-only; refusing to run without NSOS_BACKUP_RESTORE_CI=1." >&2
  exit 1
fi

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_DATABASE="${MYSQL_DATABASE:-nsos}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD is required}"
MYSQL_CLIENT_IMAGE="${MYSQL_CLIENT_IMAGE:-mysql:8.4}"

if [[ "$MYSQL_HOST" != "127.0.0.1" || "$MYSQL_DATABASE" != "nsos" ]]; then
  echo "Refusing to run outside the local CI nsos database." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for the MySQL client container." >&2
  exit 1
fi

BACKUP_DIR="$(mktemp -d)"
BACKUP_FILE="$BACKUP_DIR/nsos.sql"

mysql_cli() {
  docker run --rm --network host \
    -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" \
    "$MYSQL_CLIENT_IMAGE" mysql --protocol=tcp -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u root "$@"
}

cleanup() {
  mysql_cli -e "DROP DATABASE IF EXISTS nsos_restore; DROP TABLE IF EXISTS $MYSQL_DATABASE.backup_restore_probe;" >/dev/null 2>&1 || true
  rm -rf "$BACKUP_DIR"
}
trap cleanup EXIT

mysql_cli "$MYSQL_DATABASE" -e "
  CREATE TABLE IF NOT EXISTS backup_restore_probe (
    id INT NOT NULL PRIMARY KEY,
    marker VARCHAR(128) NOT NULL
  ) ENGINE=InnoDB;
  INSERT INTO backup_restore_probe (id, marker)
  VALUES (1, 'nsos-ci-restore-probe')
  ON DUPLICATE KEY UPDATE marker = 'nsos-ci-restore-probe';
"

docker run --rm --network host \
  -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" \
  "$MYSQL_CLIENT_IMAGE" mysqldump --protocol=tcp -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u root \
    --single-transaction --routines --triggers --events --hex-blob --databases "$MYSQL_DATABASE" --no-create-db > "$BACKUP_FILE"

# Rewrite the explicit database selection so the dump restores into the isolated target.
sed -i 's/USE `nsos`;/USE `nsos_restore`;/g' "$BACKUP_FILE"
grep -Fq 'USE `nsos_restore`;' "$BACKUP_FILE"

test -s "$BACKUP_FILE"
mysql_cli -e "CREATE DATABASE nsos_restore"

mysql_cli < "$BACKUP_FILE"

source_tables="$(mysql_cli -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$MYSQL_DATABASE'")"
restored_tables="$(mysql_cli -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'nsos_restore'")"
source_columns="$(mysql_cli -N -B -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = '$MYSQL_DATABASE'")"
restored_columns="$(mysql_cli -N -B -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'nsos_restore'")"
restored_marker="$(mysql_cli -N -B nsos_restore -e "SELECT marker FROM backup_restore_probe WHERE id = 1")"

if [[ "$source_tables" != "$restored_tables" || "$source_columns" != "$restored_columns" ]]; then
  echo "Schema restore mismatch: tables $source_tables/$restored_tables, columns $source_columns/$restored_columns." >&2
  exit 1
fi

if [[ "$restored_marker" != "nsos-ci-restore-probe" ]]; then
  echo "Synthetic data marker did not survive the backup/restore." >&2
  exit 1
fi

echo "MySQL backup/restore smoke: PASS (tables=$source_tables, columns=$source_columns, marker=$restored_marker)"
