#!/usr/bin/env bash
# Retire des saisies les anciennes « données de démonstration » écrites par les connecteurs
# Pennylane et Qonto quand leur API était injoignable (data_source = mock_pennylane / mock_qonto).
# Ces lignes étaient comptées dans les scores et les rapports : elles ne doivent pas y rester.
# Usage (root, sur le serveur) :
#   cd /opt/esgflow && git fetch -q origin main:refs/remotes/origin/main \
#     && D=$(mktemp -d) && git show origin/main:scripts/server/purge-demo-data.sh > $D/purge-demo-data.sh \
#     && bash $D/purge-demo-data.sh
# 1) montre ce qui serait supprimé, par client  2) demande confirmation  3) sauvegarde les lignes en CSV  4) supprime.
set -Eeuo pipefail
APP="${APP_DIR:-/opt/esgflow}"; cd "$APP"
DB=esgflow-db-1
U="$(docker exec $DB printenv POSTGRES_USER)"; P="$(docker exec $DB printenv POSTGRES_DB)"
# La base applique l'isolation par client : ce script doit voir toutes les lignes.
psqlq() { docker exec -i -e PGOPTIONS="-c app.bypass_rls=on" $DB psql -At -v ON_ERROR_STOP=1 -U "$U" -d "$P" -c "$1"; }
WHERE="data_source LIKE 'mock\_%'"

TOTAL="$(psqlq "select count(*) from data_entries where $WHERE")"
echo "Lignes de démonstration trouvées : $TOTAL"
[ "$TOTAL" -gt 0 ] || { echo "Rien à nettoyer."; exit 0; }
echo "Par client (identifiant, source, lignes) :"
psqlq "select tenant_id, data_source, count(*) from data_entries where $WHERE group by 1,2 order by 3 desc"

read -r -p "Sauvegarder ces lignes puis les supprimer ? (oui/non) " r; [ "$r" = oui ] || { echo "Annulé, rien n'a été modifié."; exit 0; }

SAVE="/root/purge-demo-$(date +%F-%H%M).csv"
docker exec -i -e PGOPTIONS="-c app.bypass_rls=on" $DB psql -U "$U" -d "$P" -c "\copy (select * from data_entries where $WHERE) to stdout csv header" > "$SAVE"
chmod 600 "$SAVE"; echo "Sauvegarde : $SAVE ($(wc -l < "$SAVE") lignes)"
DELETED="$(psqlq "with d as (delete from data_entries where $WHERE returning 1) select count(*) from d")"
echo "Supprimées : $DELETED"
echo "À faire ensuite : relancer le calcul des scores dans l'application (Scores > Calculer)."
