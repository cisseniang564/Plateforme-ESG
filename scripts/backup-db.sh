#!/usr/bin/env bash
# ESGFlow Database Backup Script
# Usage: ./scripts/backup-db.sh [--upload]
#
# Chiffrement : définir BACKUP_GPG_RECIPIENT (empreinte ou e-mail d'une clé PUBLIQUE
# importée sur le serveur, cf. docs/BACKUP_ENCRYPTION.md). La clé privée ne doit PAS
# rester sur le serveur : sans elle, une sauvegarde volée est illisible.
# Sans BACKUP_GPG_RECIPIENT, la sauvegarde reste en clair et un avertissement est émis.
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
GPG_RECIPIENT="${BACKUP_GPG_RECIPIENT:-}"
if [[ -n "$GPG_RECIPIENT" ]]; then
  command -v gpg >/dev/null || { echo "ERREUR : gpg introuvable (apt install gnupg)" >&2; exit 1; }
  gpg --list-keys "$GPG_RECIPIENT" >/dev/null 2>&1 || { echo "ERREUR : clé publique '${GPG_RECIPIENT}' absente du trousseau" >&2; exit 1; }
  BACKUP_FILE="${BACKUP_DIR}/esgflow_${TIMESTAMP}.sql.gz.gpg"
else
  echo "[$(date)] AVERTISSEMENT : BACKUP_GPG_RECIPIENT non défini, sauvegarde NON chiffrée." >&2
  BACKUP_FILE="${BACKUP_DIR}/esgflow_${TIMESTAMP}.sql.gz"
fi

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup of database '${DB_NAME}'..."

# Sauvegarde complète malgré la RLS : autorisation système limitée à cette connexion
PGOPTIONS="-c app.bypass_rls=on" PGPASSWORD="${DATABASE_PASSWORD}" pg_dump \
  --enable-row-security \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  | gzip \
  | if [[ -n "$GPG_RECIPIENT" ]]; then
      gpg --batch --yes --encrypt --recipient "$GPG_RECIPIENT" --trust-model always --output -
    else
      cat
    fi > "$BACKUP_FILE"

# Garde-fou : une sauvegarde vide ou illisible ne doit pas passer pour réussie
if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "ERREUR : sauvegarde vide ($BACKUP_FILE)" >&2; rm -f "$BACKUP_FILE"; exit 1
fi
if [[ -n "$GPG_RECIPIENT" ]]; then
  gpg --list-packets "$BACKUP_FILE" >/dev/null 2>&1 || { echo "ERREUR : fichier chiffré invalide" >&2; rm -f "$BACKUP_FILE"; exit 1; }
fi
chmod 600 "$BACKUP_FILE"

echo "[$(date)] Backup saved: ${BACKUP_FILE} ($(du -sh "$BACKUP_FILE" | cut -f1))"

# Optional: upload to MinIO/S3
if [[ "${1:-}" == "--upload" ]] && command -v mc &>/dev/null; then
  mc cp "$BACKUP_FILE" "minio/esgflow-backups/$(basename "$BACKUP_FILE")"
  echo "[$(date)] Uploaded to MinIO."
fi

# Retention: delete old backups
find "$BACKUP_DIR" \( -name "esgflow_*.sql.gz" -o -name "esgflow_*.sql.gz.gpg" \) -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date)] Cleaned up backups older than ${RETENTION_DAYS} days."
echo "[$(date)] Backup complete."
