#!/usr/bin/env bash
# Met en ligne un nouveau frontend (dossier dist) dans le conteneur esgflow-frontend-1.
# v2 : sauvegarde et restauration par archive tar (plus fiable que « docker cp »).
# - sauvegarde l'ancien site dans /root/frontend-html-avant-<date>/site.tgz et la contrôle
# - remplace le site
# - vérifie le résultat ; en cas d'échec (ou d'erreur), remet l'ancien site automatiquement
# Usage : bash deploy-frontend-v2.sh /root/esgflow-frontend-design-91a5561.tgz
set -Eeuo pipefail

ARCHIVE="${1:?Usage: bash deploy-frontend-v2.sh <archive.tgz>}"
CONTAINER="${CONTAINER:-esgflow-frontend-1}"
HTML="${HTML_DIR:-/usr/share/nginx/html}"
SITE="${SITE_URL:-https://greenconnect.cloud/}"
BACKUP="/root/frontend-html-avant-$(date +%F-%H%M)"
WORK="$(mktemp -d)"
REPLACED=0

restore() {
  echo ">> Retour arrière : remise de l'ancien site depuis $BACKUP/site.tgz"
  docker exec "$CONTAINER" sh -c "rm -rf $HTML/*"
  docker exec -i "$CONTAINER" tar xzf - -C "$HTML" < "$BACKUP/site.tgz"
  echo ">> Ancien site remis en place."
}

on_error() {
  echo "!! Erreur à la ligne $1."
  if [ "$REPLACED" = "1" ]; then restore; else echo ">> Rien n'avait encore été modifié."; fi
  exit 1
}
trap 'on_error $LINENO' ERR

docker ps --format '{{.Names}}' | grep -qx "$CONTAINER" || { echo "Conteneur $CONTAINER introuvable."; exit 1; }
tar xzf "$ARCHIVE" -C "$WORK"
[ -f "$WORK/dist/index.html" ] || { echo "dist/index.html introuvable dans l'archive."; exit 1; }

echo "1/4 Sauvegarde de l'ancien site -> $BACKUP/site.tgz"
mkdir -p "$BACKUP"
docker exec "$CONTAINER" tar czf - -C "$HTML" . > "$BACKUP/site.tgz"
size="$(stat -c %s "$BACKUP/site.tgz")"
tar tzf "$BACKUP/site.tgz" > "$WORK/liste.txt"   # fichier intermédiaire : évite l'erreur SIGPIPE de « grep -q » sous pipefail
grep -qx './index.html' "$WORK/liste.txt" || { echo "Sauvegarde sans index.html, arrêt (rien n'a été modifié)."; exit 1; }
[ "$size" -gt 100000 ] || { echo "Sauvegarde trop petite ($size octets), arrêt (rien n'a été modifié)."; exit 1; }
echo "   sauvegarde : $size octets, $(wc -l < "$WORK/liste.txt") entrées"

echo "2/4 Remplacement du site"
REPLACED=1
docker exec "$CONTAINER" sh -c "rm -rf $HTML/*"
tar czf - -C "$WORK/dist" . | docker exec -i "$CONTAINER" tar xzf - -C "$HTML"

echo "3/4 Vérification"
sleep 2
inside="$(docker exec "$CONTAINER" wget -qO- http://127.0.0.1/ || true)"
outside="$(curl -s -o /dev/null -w '%{http_code}' "$SITE" || true)"
echo "   page d'accueil dans le conteneur : $(grep -c 'id="root"' <<<"$inside" || true) (attendu 1)"
echo "   $SITE -> HTTP $outside (attendu 200)"
if ! grep -q 'id="root"' <<<"$inside" || [ "$outside" != "200" ]; then
  echo "!! Vérification échouée."
  restore
  exit 1
fi

echo "4/4 Terminé. Nouveau site en ligne."
echo "Pour revenir à l'ancien site à tout moment :"
echo "  docker exec $CONTAINER sh -c 'rm -rf $HTML/*' && docker exec -i $CONTAINER tar xzf - -C $HTML < $BACKUP/site.tgz"
rm -rf "$WORK"
