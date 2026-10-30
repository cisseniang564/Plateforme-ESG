#!/usr/bin/env bash
# À lancer après le redémarrage : vérifie que tout est reparti.
set -uo pipefail
echo "Uptime : $(uptime -p)"
echo; docker ps --format 'table {{.Names}}\t{{.Status}}'
echo; bad="$(docker ps -a --format '{{.Names}} {{.Status}}' | grep -vE ' Up ' || true)"
[ -z "$bad" ] || printf "Conteneurs arrêtés ou en erreur :\n%s\n" "$bad"
code="$(curl -s -o /dev/null -w '%{http_code}' https://greenconnect.cloud/)"
api="$(curl -s -o /dev/null -w '%{http_code}' https://greenconnect.cloud/api/health || true)"
echo "Site : HTTP $code (attendu 200) — API health : HTTP $api"
[ "$code" = 200 ] && [ -z "$bad" ] && echo "TOUT EST OK" || { echo "À vérifier : docker logs <conteneur> --tail 50"; exit 1; }
