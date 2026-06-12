#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ESGFlow hotfix — déploiement sans rebuild Docker
# Prérequis : les fichiers sources ont été uploadés via scp sur le serveur.
# Usage:  cd /opt/esgflow && bash scripts/hotfix.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e
cd /opt/esgflow

echo ""
echo "══════════════════════════════════════════════════"
echo "  ESGFlow HotFix — $(date '+%Y-%m-%d %H:%M:%S')"
echo "══════════════════════════════════════════════════"

# ── 1. Identifier le container backend ───────────────────────────────────────
echo ""
echo "▶ [1/4] Injection des fichiers backend dans le container…"

BACKEND=$(docker ps --format '{{.Names}}' | grep -iE 'backend' | grep -viE 'celery|beat|worker' | head -1 || true)
if [ -z "$BACKEND" ]; then
    echo "  ⚠  Aucun container backend trouvé — abandon"
    exit 1
fi
echo "  Container backend : $BACKEND"

# Backend Python files
docker cp backend/app/api/v1/endpoints/api_usage.py        "$BACKEND":/app/app/api/v1/endpoints/api_usage.py
docker cp backend/app/api/v1/endpoints/esg_scoring.py      "$BACKEND":/app/app/api/v1/endpoints/esg_scoring.py
docker cp backend/app/api/v1/endpoints/billing.py           "$BACKEND":/app/app/api/v1/endpoints/billing.py
docker cp backend/app/main.py                               "$BACKEND":/app/app/main.py
docker cp backend/app/middleware/billing_middleware.py       "$BACKEND":/app/app/middleware/billing_middleware.py
docker cp backend/app/middleware/security_headers.py        "$BACKEND":/app/app/middleware/security_headers.py
docker cp backend/app/models/tenant.py                      "$BACKEND":/app/app/models/tenant.py
docker cp backend/app/services/esg_scoring_engine.py        "$BACKEND":/app/app/services/esg_scoring_engine.py
docker cp backend/app/services/report_service.py            "$BACKEND":/app/app/services/report_service.py

docker restart "$BACKEND"
echo "  ✅ Backend redémarré : $BACKEND"

# ── 2. Rebuild frontend ───────────────────────────────────────────────────────
echo ""
echo "▶ [2/4] Rebuild du frontend (VITE_API_URL=/api/v1)…"

cd /opt/esgflow/frontend
VITE_API_URL=/api/v1 npx vite build --mode production
echo "  ✅ Frontend compilé"

# ── 3. Déploiement frontend → nginx ──────────────────────────────────────────
echo ""
echo "▶ [3/4] Déploiement vers le container nginx…"

cd /opt/esgflow
FRONTEND=$(docker ps --format '{{.Names}}' | grep -iE 'frontend' | head -1 || true)
if [ -z "$FRONTEND" ]; then
    echo "  ⚠  Aucun container frontend trouvé"
else
    docker cp frontend/dist/. "$FRONTEND":/usr/share/nginx/html/
    docker restart "$FRONTEND"
    echo "  ✅ Frontend déployé : $FRONTEND"
fi

# ── 4. Vérification santé ─────────────────────────────────────────────────────
echo ""
echo "▶ [4/4] Vérification santé backend…"
sleep 5
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health || echo "000")
if [ "$HTTP" = "200" ]; then
    echo "  ✅ Backend OK (HTTP $HTTP)"
else
    echo "  ⚠  Backend répond HTTP $HTTP — vérifiez les logs : docker logs $BACKEND"
fi

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✅ HotFix complet — $(date '+%Y-%m-%d %H:%M:%S')"
echo "══════════════════════════════════════════════════"
echo ""
echo "  → Essai : compte à rebours affiché pendant le trial."
echo "  → 'Continuer gratuitement' → downgrade réel vers Free."
echo "  → Features Free appliquées dès expiration du trial."
echo "  → Vérifiez greenconnect.cloud"
echo ""
