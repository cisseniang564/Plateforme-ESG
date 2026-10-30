#!/usr/bin/env bash
# À lancer UNE FOIS sur le serveur, en root, depuis /opt/esgflow :
#   bash scripts/server/setup-ci-deploy.sh
# Crée une clé SSH dédiée au déploiement automatique depuis GitHub.
# Cette clé ne peut faire qu'UNE chose : envoyer une archive du site, qui est
# ensuite installée par scripts/deploy-frontend.sh (avec sauvegarde + retour arrière).
# Elle n'ouvre aucun terminal sur le serveur.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."

BIN=/usr/local/bin
KEY=/root/.ssh/esgflow_ci_deploy
INBOX=/root/ci-incoming

install -m 0755 -o root -g root scripts/deploy-frontend.sh "$BIN/esgflow-deploy-frontend"

cat > "$BIN/esgflow-ci-receive" <<'RECV'
#!/usr/bin/env bash
# Commande imposée à la clé CI : lit une archive sur l'entrée standard et la déploie.
set -Eeuo pipefail
INBOX=/root/ci-incoming
mkdir -p "$INBOX"; chmod 700 "$INBOX"
F="$INBOX/frontend-$(date +%F-%H%M%S).tgz"
head -c 200000000 > "$F"                       # 200 Mo maximum
[ "$(stat -c %s "$F")" -gt 100000 ] || { echo "Archive trop petite"; rm -f "$F"; exit 1; }
tar tzf "$F" | grep -q '^dist/index.html$' || tar tzf "$F" | grep -q '^\./dist/index.html$' \
  || { echo "dist/index.html absent"; rm -f "$F"; exit 1; }
/usr/local/bin/esgflow-deploy-frontend "$F"
ls -1t "$INBOX"/frontend-*.tgz | tail -n +6 | xargs -r rm -f   # garde les 5 dernières
RECV
chmod 0755 "$BIN/esgflow-ci-receive"

if [ ! -f "$KEY" ]; then
  ssh-keygen -t ed25519 -N '' -C "esgflow-github-ci" -f "$KEY" >/dev/null
fi
mkdir -p /root/.ssh && chmod 700 /root/.ssh
touch /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys
if ! grep -q 'esgflow-github-ci' /root/.ssh/authorized_keys; then
  echo "restrict,command=\"$BIN/esgflow-ci-receive\" $(cat "$KEY.pub")" >> /root/.ssh/authorized_keys
fi

echo
echo "=== Fait. À copier dans GitHub (Settings > Secrets and variables > Actions) ==="
echo "SSH_HOST        = $(curl -s https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
echo "SSH_USER        = root"
echo "SSH_KNOWN_HOSTS = (contenu ci-dessous)"
ssh-keyscan -t ed25519 localhost 2>/dev/null | sed 's/^localhost/HOTE/' || true
echo
echo "SSH_PRIVATE_KEY = (contenu complet ci-dessous, y compris les lignes BEGIN/END)"
cat "$KEY"
echo
echo "Après l'avoir copiée dans GitHub : shred -u $KEY   (la clé privée n'a plus rien à faire ici)"
