#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Fix : Calcul de score ESG — "No indicator data found for scoring"
#
# Correctifs appliqués :
#   1. Backend : esg_scoring_engine.py — fallback sur données sans org_id
#      + fenêtre temporelle élargie (36 mois)
#   2. Frontend : ScoreCalculation.tsx — champ calculation_date (was score_date)
#      + validation date (anti-bug an 0001 Safari)
#      + period_months=36 envoyé au backend
#
# Usage sur le serveur :
#   cd /opt/esgflow
#   bash scripts/deploy-score-fix.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd /opt/esgflow

echo ""
echo "══════════════════════════════════════════════════"
echo "  ESGFlow — Fix Score Calculation"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "══════════════════════════════════════════════════"

# ── 1. Backend ────────────────────────────────────────────────────────────────
echo ""
echo "▶ [1/3] Déploiement backend…"

BACKEND=$(docker ps --format '{{.Names}}' | grep -iE 'backend' | grep -viE 'celery|beat|worker' | head -1 || true)
if [ -z "$BACKEND" ]; then
    echo "  ⚠  Aucun container backend trouvé"
    exit 1
fi
echo "  Container : $BACKEND"

docker cp backend/app/services/esg_scoring_engine.py \
    "$BACKEND":/app/app/services/esg_scoring_engine.py

echo "  ✅ esg_scoring_engine.py copié"
docker restart "$BACKEND"
echo "  ✅ Backend redémarré"

# ── 2. Frontend ───────────────────────────────────────────────────────────────
echo ""
echo "▶ [2/3] Build frontend (ScoreCalculation.tsx modifié)…"

cd /opt/esgflow/frontend
VITE_API_URL=/api/v1 npx vite build --mode production 2>&1 | tail -10
echo "  ✅ Frontend compilé"

cd /opt/esgflow
FRONTEND=$(docker ps --format '{{.Names}}' | grep -iE 'frontend' | head -1 || true)
if [ -n "$FRONTEND" ]; then
    docker cp frontend/dist/. "$FRONTEND":/usr/share/nginx/html/
    docker restart "$FRONTEND"
    echo "  ✅ Frontend déployé → $FRONTEND"
fi

# ── 3. Santé ──────────────────────────────────────────────────────────────────
echo ""
echo "▶ [3/3] Vérification…"
sleep 6
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health || echo "000")
echo "  Backend health : HTTP $HTTP"

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✅ Déploiement terminé"
echo "══════════════════════════════════════════════════"
echo ""
echo "  TEST : Aller sur greenconnect.cloud"
echo "  1. Vérifier que les données CSV ont bien été importées"
echo "     AVEC une organisation sélectionnée (ESG UGB)"
echo "  2. Aller sur Calculer un Score"
echo "  3. Sélectionner l'org + date récente → Calculer"
echo ""
echo "  Si 'No indicator data found' persiste :"
echo "  → Réimporter le CSV en sélectionnant l'organisation"
echo "     OU le moteur utilisera maintenant les données"
echo "     importées sans organisation (fallback automatique)"
echo ""
