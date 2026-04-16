#!/bin/bash
# =============================================================================
# GreenConnect ESG — Setup VPS IONOS (Ubuntu 22.04)
# Usage : ssh root@<IP_VPS> "bash -s" < setup-vps.sh
# =============================================================================
set -e

DOMAIN="greenconnect.cloud"
APP_DIR="/opt/esgflow"
EMAIL="REMPLACER_ton_email@greenconnect.cloud"

echo "=== [1/6] Mise à jour système ==="
apt-get update -qq && apt-get upgrade -y -qq

echo "=== [2/6] Installation Docker ==="
apt-get install -y -qq ca-certificates curl gnupg lsb-release
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "=== [3/6] Installation Certbot (SSL Let's Encrypt) ==="
apt-get install -y -qq certbot

echo "=== [4/6] Certificat SSL pour $DOMAIN ==="
# Assure-toi que le port 80 est libre avant de lancer
certbot certonly --standalone \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

# Copier les certs au format attendu par nginx.conf
mkdir -p "$APP_DIR/nginx/ssl/certs" "$APP_DIR/nginx/ssl/private"
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem "$APP_DIR/nginx/ssl/certs/$DOMAIN.crt"
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem   "$APP_DIR/nginx/ssl/private/$DOMAIN.key"

# Renouvellement automatique (cron)
echo "0 3 * * * root certbot renew --quiet && \
  cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $APP_DIR/nginx/ssl/certs/$DOMAIN.crt && \
  cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $APP_DIR/nginx/ssl/private/$DOMAIN.key && \
  docker compose -f $APP_DIR/docker-compose.prod.yml exec nginx nginx -s reload" \
  > /etc/cron.d/certbot-renew

echo "=== [5/6] Création répertoire app ==="
mkdir -p "$APP_DIR"
echo "→ Copie maintenant les fichiers du projet dans $APP_DIR"
echo "  scp -r ./esgplatform/* root@<IP_VPS>:$APP_DIR/"

echo "=== [6/6] Instructions finales ==="
cat <<EOF

✅ VPS prêt. Prochaines étapes :

1. Copier le projet sur le VPS :
   scp -r /chemin/local/esgplatform/* root@<IP_VPS>:/opt/esgflow/

2. Remplir les valeurs dans .env.prod :
   nano /opt/esgflow/.env.prod
   # Remplacer tous les REMPLACER_... par les vraies valeurs

3. Lancer l'application :
   cd /opt/esgflow
   docker compose -f docker-compose.prod.yml up -d --build

4. Vérifier que tout tourne :
   docker compose -f docker-compose.prod.yml ps
   curl https://greenconnect.cloud/health

EOF
