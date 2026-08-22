#!/usr/bin/env bash

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT="${BACKUP_DIR}/nevo-${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

docker compose exec -T postgres \
  pg_dump \
  -U "${POSTGRES_USER:?POSTGRES_USER must be provided}" \
  -d "${POSTGRES_DB:-postgres}" \
  -Fc \
  > "${OUTPUT}"

echo "PostgreSQL backup created:"
echo "${OUTPUT}"