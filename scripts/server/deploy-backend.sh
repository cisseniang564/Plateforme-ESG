#!/usr/bin/env bash
# Met à jour le backend (API) à partir de la branche main de GitHub, avec sauvegarde et retour arrière.
# Usage (root, sur le serveur) :
#   cd /opt/esgflow && git fetch -q origin main:refs/remotes/origin/main && bash <(git show origin/main:scripts/server/deploy-backend.sh)
# Étapes : 1) montre ce qui va changer  2) demande confirmation  3) sauvegarde base + ancien code + ancienne image
#          4) reconstruit et redémarre uniquement l'API  5) vérifie  6) revient en arrière si la vérification échoue.
set -Eeuo pipefail
APP="${APP_DIR:-/opt/esgflow}"; cd "$APP"
command -v rsync >/dev/null || { echo "rsync absent : apt-get install -y rsync"; exit 1; }
STAMP="$(date +%F-%H%M)"
SAVE="/root/backend-avant-$STAMP"
NEW="/root/backend-main-$STAMP"
SITE="${SITE_URL:-https://greenconnect.cloud}"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
CONTAINER=esgflow-backend
REPLACED=0

git fetch -q origin main:refs/remotes/origin/main
mkdir -p "$NEW" && git archive origin/main backend | tar -x -C "$NEW"

echo "1/6 Fichiers qui vont changer (ancien serveur -> main) :"
diff -rq backend "$NEW/backend" -x __pycache__ -x '*.pyc' -x '.env*' -x '*.bak*' -x logs -x uploads -x '.pytest_cache' || true
echo
read -r -p "Continuer ? (oui/non) " r; [ "$r" = "oui" ] || { echo "Annulé, rien n'a été modifié."; rm -rf "$NEW"; exit 0; }

echo "2/6 Clé OpenAI (Gaïa)"
KEY="$(grep -hE '^OPENAI_API_KEY=' .env .env.prod 2>/dev/null | tail -1 | cut -d= -f2- || true)"
if [ -z "$KEY" ]; then echo "   ⚠ OPENAI_API_KEY absente : Gaïa répondra « non configurée ». Ajoute-la dans /opt/esgflow/.env puis relance ce script."; else echo "   clé présente (non affichée)"; fi

echo "3/6 Sauvegardes -> $SAVE"
mkdir -p "$SAVE"; chmod 700 "$SAVE"
[ -x scripts/backup.sh ] && scripts/backup.sh >/dev/null && echo "   base sauvegardée"
tar czf "$SAVE/backend-sources.tgz" backend --exclude=__pycache__
OLD_IMAGE="$(docker inspect "$CONTAINER" --format '{{.Image}}')"
IMAGE_NAME="$(docker inspect "$CONTAINER" --format '{{.Config.Image}}')"
docker tag "$OLD_IMAGE" "esgflow-backend-rollback:$STAMP"
echo "   ancienne image conservée : esgflow-backend-rollback:$STAMP"

rollback() {
  echo "!! Retour arrière"
  docker tag "esgflow-backend-rollback:$STAMP" "$IMAGE_NAME" || true
  rm -rf backend.new && mkdir backend.new && tar xzf "$SAVE/backend-sources.tgz" -C backend.new --strip-components=1 \
    && rm -rf backend && mv backend.new backend || true
  "${COMPOSE[@]}" up -d --no-deps --no-build backend || true
  echo "   Ancienne version remise. Détails : docker logs $CONTAINER --tail 50"
}
trap 'echo "!! Erreur ligne $LINENO"; [ "$REPLACED" = 1 ] && rollback; exit 1' ERR

echo "4/6 Remplacement du code et reconstruction (quelques minutes)"
REPLACED=1
# on copie le nouveau code SANS écraser les fichiers de configuration locaux (.env…)
rsync -a --delete --exclude='.env*' --exclude='__pycache__' --exclude='logs' --exclude='uploads' "$NEW/backend/" backend/
"${COMPOSE[@]}" build backend
"${COMPOSE[@]}" up -d --no-deps backend

echo "5/6 Vérification"
for i in $(seq 1 30); do
  docker exec "$CONTAINER" python3 -c "import app.main" >/dev/null 2>&1 && break
  sleep 2
done
docker exec "$CONTAINER" python3 -c "import app.main, pypdf; print('   API et lecteur PDF : OK')"
sleep 5
site="$(curl -s -o /dev/null -w '%{http_code}' "$SITE/")"
gaia="$(curl -s -o /dev/null -w '%{http_code}' "$SITE/api/v1/gaia/analyses")"
echo "   site : HTTP $site (attendu 200) · route Gaïa : HTTP $gaia (attendu 401 = existe, connexion requise)"
if [ "$site" != 200 ] || [ "$gaia" != 401 ]; then echo "!! Vérification échouée"; rollback; exit 1; fi

echo "6/6 Terminé. Pour revenir en arrière à la main : tar xzf $SAVE/backend-sources.tgz puis relance l'ancienne image esgflow-backend-rollback:$STAMP."
rm -rf "$NEW"
