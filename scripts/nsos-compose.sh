#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${NSOS_COMPOSE_ENV_FILE:-.env.runtime}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing Compose environment file: $ENV_FILE" >&2
  exit 1
fi

if grep -Eq '^[[:space:]]*JWT_SECRET[[:space:]]*=' "$ENV_FILE"; then
  echo "Do not store JWT_SECRET in $ENV_FILE; export it in the invoking shell or use a secret manager." >&2
  exit 1
fi

export COMPOSE_DISABLE_ENV_FILE=1
exec docker compose --env-file "$ENV_FILE" "$@"
