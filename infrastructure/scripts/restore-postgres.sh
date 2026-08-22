#!/usr/bin/env bash

set -euo pipefail

BACKUP_FILE="${1:?Usage: restore-postgres.sh <backup.dump>}"

test -f "${BACKUP_FILE}" || {
  echo "Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
}

docker compose exec -T postgres \
  pg_restore \
  -U "${POSTGRES_USER:?POSTGRES_USER must be provided}" \
  -d "${POSTGRES_DB:-postgres}" \
  --clean \
  --if-exists \
  < "${BACKUP_FILE}"

echo "PostgreSQL restore completed."