#!/usr/bin/env bash
set -euo pipefail

if [[ "${GITHUB_ACTIONS:-}" != "true" || "${NSOS_BACKUP_RESTORE_CI:-}" != "1" ]]; then
  echo "This rehearsal is CI-only; refusing to run outside GitHub Actions or without NSOS_BACKUP_RESTORE_CI=1." >&2
  exit 1
fi

MYSQL_DATABASE="${MYSQL_DATABASE:-nsos}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD is required}"

if [[ "$MYSQL_DATABASE" != "nsos" ]]; then
  echo "Refusing to run outside the local CI nsos database." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for the MySQL service container." >&2
  exit 1
fi

MYSQL_CONTAINER_ID="$(docker ps --filter 'ancestor=mysql:8.4' --format '{{.ID}}' | head -n 1)"
if [[ -z "$MYSQL_CONTAINER_ID" ]]; then
  echo "Could not locate the ephemeral mysql:8.4 service container." >&2
  exit 1
fi

MYSQL_IMAGE="$(docker inspect --format '{{.Config.Image}}' "$MYSQL_CONTAINER_ID")"
if [[ "$MYSQL_IMAGE" != "mysql:8.4" ]]; then
  echo "Refusing unexpected MySQL service image: $MYSQL_IMAGE" >&2
  exit 1
fi

BACKUP_DIR="$(mktemp -d)"
BACKUP_FILE="$BACKUP_DIR/nsos.sql"

mysql_cli() {
  docker exec -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" "$MYSQL_CONTAINER_ID" mysql -uroot "$@"
}

mysql_dump() {
  docker exec -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" "$MYSQL_CONTAINER_ID" mysqldump -uroot "$@"
}

mysql_import() {
  docker exec -i -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" "$MYSQL_CONTAINER_ID" mysql -uroot "$@"
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

mysql_dump --single-transaction --routines --triggers --events --hex-blob --databases "$MYSQL_DATABASE" --no-create-db > "$BACKUP_FILE"

# Rewrite the explicit database selection so the dump restores into the isolated target.
sed -i 's/USE `nsos`;/USE `nsos_restore`;/g' "$BACKUP_FILE"
grep -Fq 'USE `nsos_restore`;' "$BACKUP_FILE"

test -s "$BACKUP_FILE"
mysql_cli -e "DROP DATABASE IF EXISTS nsos_restore; CREATE DATABASE nsos_restore"
mysql_import < "$BACKUP_FILE"

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
