#!/usr/bin/env bash
# Restaure une sauvegarde ESGFlow (.sql.gz ou .sql.gz.gpg) dans une base CIBLE.
# Usage : ./scripts/restore-db.sh <fichier> <nom_base_cible>
# Pour un .gpg, la clé PRIVÉE doit être présente sur la machine qui restaure
# (de préférence un poste de secours, pas le serveur de production).
set -euo pipefail

FILE="${1:?Usage: $0 <fichier> <base_cible>}"
TARGET="${2:?Usage: $0 <fichier> <base_cible>}"
[[ -f "$FILE" ]] || { echo "Fichier introuvable : $FILE" >&2; exit 1; }
if [[ "$TARGET" == "esgflow" ]]; then
  echo "Refus : restaurer sur la base 'esgflow' (production) doit se faire à la main." >&2; exit 1
fi

DB_USER="${DATABASE_USER:-esgflow}"; DB_HOST="${DATABASE_HOST:-localhost}"; DB_PORT="${DATABASE_PORT:-5432}"

case "$FILE" in
  *.gpg) gpg --batch --decrypt "$FILE" | gunzip ;;
  *.gz)  gunzip -c "$FILE" ;;
  *) echo "Extension non reconnue" >&2; exit 1 ;;
esac | PGPASSWORD="${DATABASE_PASSWORD:?DATABASE_PASSWORD requis}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TARGET" -v ON_ERROR_STOP=1 -q
echo "Restauration terminée dans '${TARGET}'."
