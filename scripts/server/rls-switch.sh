#!/usr/bin/env bash
# Active (on) ou désactive (off) l'isolation des données entre clients (RLS) en production.
# Usage (root, sur le serveur) :
#   cd /opt/esgflow && git fetch -q origin main:refs/remotes/origin/main \
#     && D=$(mktemp -d) && git show origin/main:scripts/server/rls-switch.sh > $D/rls-switch.sh \
#     && bash $D/rls-switch.sh on        # ou : off
# on  : sauvegarde complète -> ESG_ENABLE_RLS=1 -> reconstruit API + Celery -> vérifie -> revient en arrière si KO.
# off : retire les règles RLS dans la base et remet ESG_ENABLE_RLS=0 (retour au fonctionnement d'avant).
set -Eeuo pipefail
MODE="${1:-}"; [ "$MODE" = on ] || [ "$MODE" = off ] || { echo "Usage : $0 on|off"; exit 1; }
APP="${APP_DIR:-/opt/esgflow}"; cd "$APP"
STAMP="$(date +%F-%H%M)"; SAVE="/root/rls-$MODE-$STAMP"; mkdir -p "$SAVE"; chmod 700 "$SAVE"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
DB=esgflow-db-1; ENVF=.env.prod
U="$(docker exec $DB printenv POSTGRES_USER)"; P="$(docker exec $DB printenv POSTGRES_DB)"
psqlq() { docker exec -i -e PGOPTIONS="${PGO:-}" $DB psql -At -v ON_ERROR_STOP=1 -U "$U" -d "$P" -c "$1"; }
SVC=(backend celery_worker celery_beat)

echo "== RLS : $MODE =="
if [ "$MODE" = on ]; then
  [ "$(psqlq "select rolsuper from pg_roles where rolname=current_user")" = f ] \
    || { echo "!! Le rôle $U est super-utilisateur : la RLS serait ignorée. Arrêt."; exit 1; }
  grep -q "SystemSessionLocal" backend/app/db/session.py \
    || { echo "!! Le code déployé n'a pas les sessions système : lance d'abord deploy-backend.sh. Arrêt."; exit 1; }
  read -r -p "Activer l'isolation entre clients maintenant ? (oui/non) " r; [ "$r" = oui ] || { echo "Annulé."; exit 0; }

  echo "1/5 Sauvegarde complète de la base -> $SAVE"
  PGO="-c app.bypass_rls=on" ; export PGO
  docker exec -e PGOPTIONS="-c app.bypass_rls=on" $DB pg_dump --enable-row-security -U "$U" "$P" | gzip > "$SAVE/base.sql.gz"
  [ "$(stat -c%s "$SAVE/base.sql.gz")" -gt 1000 ] || { echo "!! Sauvegarde trop petite, arrêt."; exit 1; }
  cp "$ENVF" "$SAVE/env.prod.avant"; chmod 600 "$SAVE/env.prod.avant"
  BEFORE_ENTRIES="$(psqlq "select count(*) from data_entries")"; BEFORE_IND="$(psqlq "select count(*) from indicators")"
  echo "   $BEFORE_ENTRIES saisies, $BEFORE_IND indicateurs avant activation"

  echo "2/5 ESG_ENABLE_RLS=1 dans $ENVF"
  grep -q '^ESG_ENABLE_RLS=' "$ENVF" && sed -i 's/^ESG_ENABLE_RLS=.*/ESG_ENABLE_RLS=1/' "$ENVF" || echo 'ESG_ENABLE_RLS=1' >> "$ENVF"

  rollback() {
    echo "!! Retour arrière"
    cp "$SAVE/env.prod.avant" "$ENVF"
    for t in $(psqlq "select relname from pg_class where relkind='r' and relrowsecurity"); do
      psqlq "ALTER TABLE $t NO FORCE ROW LEVEL SECURITY; ALTER TABLE $t DISABLE ROW LEVEL SECURITY" >/dev/null || true
    done
    "${COMPOSE[@]}" up -d --no-deps "${SVC[@]}" || true
    echo "   RLS retirée, ancienne configuration remise. Sauvegarde : $SAVE/base.sql.gz"
  }
  trap 'echo "!! Erreur ligne $LINENO"; rollback; exit 1' ERR

  echo "3/5 Reconstruction et redémarrage : API + Celery (quelques minutes)"
  "${COMPOSE[@]}" build "${SVC[@]}"
  "${COMPOSE[@]}" up -d --no-deps "${SVC[@]}"
  for i in $(seq 1 60); do docker exec esgflow-backend python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/health')" >/dev/null 2>&1 && break; sleep 2; done

  echo "4/5 Vérifications"
  N="$(psqlq "select count(*) from pg_class where relkind='r' and relforcerowsecurity")"; echo "   tables sous RLS forcée : $N (attendu ≥ 15)"; [ "$N" -ge 15 ]
  AFTER_ENTRIES="$(PGO='-c app.bypass_rls=on' psqlq "select count(*) from data_entries")"; AFTER_IND="$(PGO='-c app.bypass_rls=on' psqlq "select count(*) from indicators")"
  echo "   données intactes : $AFTER_ENTRIES saisies / $AFTER_IND indicateurs (avant : $BEFORE_ENTRIES / $BEFORE_IND)"; [ "$AFTER_ENTRIES" = "$BEFORE_ENTRIES" ] && [ "$AFTER_IND" = "$BEFORE_IND" ]
  SANS="$(PGO='' psqlq "select count(*) from data_entries")"; echo "   visibles sans identification de client : $SANS (attendu 0)"; [ "$SANS" = 0 ]
  docker exec esgflow-celery_worker-1 celery -A app.tasks.celery_app inspect ping --timeout=8 >/dev/null 2>&1 && echo "   Celery : répond" || echo "   ⚠ Celery ne répond pas encore (peut démarrer lentement) : docker logs esgflow-celery_worker-1 --tail 30"
  trap - ERR
  echo "5/5 Terminé. À FAIRE MAINTENANT : connecte-toi sur le site, ouvre Données, un score, et Gaïa. Si quelque chose cloche : bash $0 off"
  echo "⚠ Sauvegardes : tout script qui lance pg_dump doit ajouter  PGOPTIONS='-c app.bypass_rls=on' --enable-row-security  sinon la sauvegarde sera VIDE. Vérifie le tien :"
  grep -n "pg_dump" scripts/backup.sh 2>/dev/null || echo "   (scripts/backup.sh : pas de pg_dump trouvé, à vérifier)"
else
  read -r -p "Désactiver l'isolation entre clients ? (oui/non) " r; [ "$r" = oui ] || { echo "Annulé."; exit 0; }
  cp "$ENVF" "$SAVE/env.prod.avant"; chmod 600 "$SAVE/env.prod.avant"
  for t in $(psqlq "select relname from pg_class where relkind='r' and relrowsecurity"); do
    psqlq "ALTER TABLE $t NO FORCE ROW LEVEL SECURITY; ALTER TABLE $t DISABLE ROW LEVEL SECURITY" >/dev/null
  done
  grep -q '^ESG_ENABLE_RLS=' "$ENVF" && sed -i 's/^ESG_ENABLE_RLS=.*/ESG_ENABLE_RLS=0/' "$ENVF" || echo 'ESG_ENABLE_RLS=0' >> "$ENVF"
  "${COMPOSE[@]}" up -d --no-deps "${SVC[@]}"
  echo "RLS désactivée ($(psqlq "select count(*) from pg_class where relkind='r' and relrowsecurity") tables restantes sous RLS)."
fi
