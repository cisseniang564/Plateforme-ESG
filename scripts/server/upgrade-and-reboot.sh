#!/usr/bin/env bash
# Point 2, étape B : applique les mises à jour Ubuntu puis redémarre le serveur.
# Le site sera coupé 1 à 3 minutes. À lancer hors heures de pointe.
# Usage (root) : bash scripts/server/upgrade-and-reboot.sh
# Après le redémarrage, reconnecte-toi et lance : bash scripts/server/post-reboot-check.sh
set -Eeuo pipefail
bash "$(dirname "$0")/prepare-reboot.sh"
read -r -p "Appliquer les mises à jour et redémarrer maintenant ? (oui/non) " r
[ "$r" = "oui" ] || { echo "Annulé."; exit 0; }
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get -y -q -o Dpkg::Options::=--force-confold upgrade
echo "Redémarrage dans 5 secondes..."; sleep 5; systemctl reboot
