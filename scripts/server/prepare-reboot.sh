#!/usr/bin/env bash
# Point 2, étape A (lecture seule + sauvegarde) : vérifie que tout redémarrera tout seul.
# Usage (root) : bash scripts/server/prepare-reboot.sh
set -uo pipefail
ok=1
say() { printf '%-55s %s\n' "$1" "$2"; }

say "Docker démarre au boot" "$(systemctl is-enabled docker 2>&1)"
[ "$(systemctl is-enabled docker 2>&1)" = "enabled" ] || ok=0

echo; echo "Politique de redémarrage des conteneurs :"
while read -r c; do
  p="$(docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' "$c")"
  say "  $c" "$p"
  case "$p" in always|unless-stopped) ;; *) ok=0 ;; esac
done < <(docker ps --format '{{.Names}}')

echo; echo "Mises à jour en attente : $(apt list --upgradable 2>/dev/null | grep -c upgradable)"
[ -f /var/run/reboot-required ] && echo "Redémarrage déjà requis par le système."

echo; if [ -x /opt/esgflow/scripts/backup.sh ]; then
  echo "Sauvegarde de la base avant intervention..."
  /opt/esgflow/scripts/backup.sh && echo "Sauvegarde OK" || { echo "!! Sauvegarde en échec"; ok=0; }
else echo "!! /opt/esgflow/scripts/backup.sh introuvable"; ok=0; fi

echo; if [ "$ok" = 1 ]; then echo "PRÊT : tu peux lancer scripts/server/upgrade-and-reboot.sh"; else echo "NON PRÊT : corrige les lignes ci-dessus d'abord."; exit 1; fi
