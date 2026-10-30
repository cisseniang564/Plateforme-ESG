#!/usr/bin/env bash
# Point 4 : met à l'écart (sans rien supprimer) les anciennes copies de fichiers .env et .bak,
# puis aligne .env.prod sur les clés réellement utilisées en production.
# Usage (root, sur le serveur) :
#   bash scripts/server/cleanup-secrets.sh          # simulation : liste seulement
#   bash scripts/server/cleanup-secrets.sh --apply  # fait le rangement
set -Eeuo pipefail
APP="${APP_DIR:-/opt/esgflow}"
APPLY=0; [ "${1:-}" = "--apply" ] && APPLY=1
QUAR=/root/quarantaine-$(date +%F-%H%M)

mapfile -t FILES < <(find "$APP" -maxdepth 3 \( -path "$APP/frontend/node_modules" -o -path "$APP/.git" \) -prune -o -type f \
  \( -name '.env.bak*' -o -name '.env.before-*' -o -name '.env.backup*' -o -name '*.bak' -o -name '*.bak.*' \
     -o -name '*.backup*' -o -name 'docker-compose.yml.before-*' \) -print | sort)

echo "Fichiers à mettre à l'écart : ${#FILES[@]}"
printf '  %s\n' "${FILES[@]}"
if [ "$APPLY" = 0 ]; then echo; echo "Simulation seulement. Relance avec --apply."; exit 0; fi

mkdir -p "$QUAR"; chmod 700 "$QUAR"
for f in "${FILES[@]}"; do
  dest="$QUAR/${f#$APP/}"; mkdir -p "$(dirname "$dest")"; mv -- "$f" "$dest"
done
echo "Déplacés dans $QUAR (rien n'est supprimé ; à effacer toi-même quand tu es sûr)."

# Alignement de .env.prod : on ne touche qu'à ces trois clés, et seulement si elles diffèrent.
if [ -f "$APP/.env" ] && [ -f "$APP/.env.prod" ]; then
  cp -p "$APP/.env.prod" "$QUAR/.env.prod.avant-alignement"
  for k in JWT_SECRET_KEY SECRET_KEY ENCRYPTION_KEY; do
    live="$(grep -E "^$k=" "$APP/.env" | tail -1 | cut -d= -f2- || true)"
    [ -n "$live" ] || { echo "  $k absente de .env : ignorée"; continue; }
    cur="$(grep -E "^$k=" "$APP/.env.prod" | tail -1 | cut -d= -f2- || true)"
    if [ "$live" = "$cur" ]; then echo "  $k : déjà identique"; continue; fi
    if grep -qE "^$k=" "$APP/.env.prod"; then
      awk -v k="$k" -v v="$live" 'BEGIN{FS=OFS="="} $1==k{print k"="v; next} {print}' "$APP/.env.prod" > "$APP/.env.prod.new"
      cat "$APP/.env.prod.new" > "$APP/.env.prod"; rm -f "$APP/.env.prod.new"
    else
      printf '%s=%s\n' "$k" "$live" >> "$APP/.env.prod"
    fi
    echo "  $k : alignée sur .env"
  done
  chmod 600 "$APP/.env" "$APP/.env.prod"
fi
echo "Terminé. Les conteneurs n'ont pas été touchés."
