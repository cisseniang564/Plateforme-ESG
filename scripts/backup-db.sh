#!/usr/bin/env bash
# ESGFlow Database Backup Script
# Usage: ./scripts/backup-db.sh [--upload]
# Schedule: add to crontab → 0 2 * * * /path/to/scripts/backup-db.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_DIR}/backups"
RETENTION_DAYS=30

# Load env
if [[ -f "${PROJECT_DIR}/.env.prod" ]]; then
  source "${PROJECT_DIR}/.env.prod"
fi

DB_NAME="${DATABASE_NAME:-esgflow}"
DB_USER="${DATABASE_USER:-esgflow}"
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/esgflow_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup of database '${DB_NAME}'..."

PGPASSWORD="${DATABASE_PASSWORD}" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  | gzip > "$BACKUP_FILE"

echo "[$(date)] Backup saved: ${BACKUP_FILE} ($(du -sh "$BACKUP_FILE" | cut -f1))"

# Optional: upload to MinIO/S3
if [[ "${1:-}" == "--upload" ]] && command -v mc &>/dev/null; then
  mc cp "$BACKUP_FILE" "minio/esgflow-backups/$(basename "$BACKUP_FILE")"
  echo "[$(date)] Uploaded to MinIO."
fi

# Retention: delete old backups
find "$BACKUP_DIR" -name "esgflow_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date)] Cleaned up backups older than ${RETENTION_DAYS} days."
echo "[$(date)] Backup complete."
