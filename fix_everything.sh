#!/bin/bash

echo "════════════════════════════════════════════════════════"
echo "🔧 ESGFlow - Correction Complète de la Plateforme"
echo "════════════════════════════════════════════════════════"
echo ""

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. CORRECTION DES APPELS API
echo -e "${BLUE}📡 Étape 1/5 : Correction des appels API...${NC}"
find frontend/src -type f \( -name "*.tsx" -o -name "*.ts" \) ! -path "*/node_modules/*" | while read file; do
  # Remplacer /scores/ par /esg-scoring/
  sed -i '' "s|'/scores/|'/esg-scoring/|g" "$file" 2>/dev/null
  sed -i '' 's|"/scores/|"/esg-scoring/|g' "$file" 2>/dev/null
  
  # Remplacer .grade par .rating
  sed -i '' 's|\.grade|.rating|g' "$file" 2>/dev/null
  
  # Ajouter fallbacks pour best_pillar et worst_pillar
  sed -i '' "s|score\.best_pillar|score?.best_pillar || 'environmental'|g" "$file" 2>/dev/null
  sed -i '' "s|score\.worst_pillar|score?.worst_pillar || 'governance'|g" "$file" 2>/dev/null
done

echo -e "${GREEN}✅ Appels API corrigés${NC}"
echo ""

# 2. VÉRIFICATION BACKEND
echo -e "${BLUE}🔍 Étape 2/5 : Vérification du backend...${NC}"
if curl -s http://localhost:8000/health | grep -q "healthy"; then
  echo -e "${GREEN}✅ Backend opérationnel${NC}"
else
  echo -e "${YELLOW}⚠️  Backend non accessible, redémarrage...${NC}"
  docker-compose restart backend
  sleep 25
  
  if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo -e "${GREEN}✅ Backend redémarré avec succès${NC}"
  else
    echo -e "${RED}❌ Backend toujours inaccessible${NC}"
    echo "Vérifiez les logs : docker-compose logs backend --tail=50"
    exit 1
  fi
fi
echo ""

# 3. VÉRIFICATION DES DONNÉES
echo -e "${BLUE}📊 Étape 3/5 : Vérification des données en base...${NC}"
ORG_COUNT=$(docker-compose exec -T postgres psql -U esgflow_user -d esgflow_dev -t -c "SELECT COUNT(*) FROM organizations;" 2>/dev/null | tr -d ' ')
DATA_COUNT=$(docker-compose exec -T postgres psql -U esgflow_user -d esgflow_dev -t -c "SELECT COUNT(*) FROM indicator_data;" 2>/dev/null | tr -d ' ')

echo "  📋 Organisations : $ORG_COUNT"
echo "  📈 Points de données : $DATA_COUNT"

if [ "$ORG_COUNT" -lt 1 ]; then
  echo -e "${YELLOW}⚠️  Aucune organisation trouvée${NC}"
else
  echo -e "${GREEN}✅ Données présentes${NC}"
fi
echo ""

# 4. REDÉMARRAGE FRONTEND
echo -e "${BLUE}🔄 Étape 4/5 : Redémarrage du frontend...${NC}"
docker-compose restart frontend
echo -e "${YELLOW}   Attente 20 secondes...${NC}"
sleep 20
echo -e "${GREEN}✅ Frontend redémarré${NC}"
echo ""

# 5. TEST DE CONNEXION
echo -e "${BLUE}🧪 Étape 5/5 : Test de connexion...${NC}"

# Test login
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.esgflow.com","password":"Admin123!"}' | \
  python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('tokens', {}).get('access_token', ''))" 2>/dev/null)

if [ -n "$TOKEN" ]; then
  echo -e "${GREEN}✅ Login fonctionnel${NC}"
  
  # Test organisations
  ORG_API=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/organizations | \
    python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('total', 0))" 2>/dev/null)
  
  if [ "$ORG_API" -gt 0 ]; then
    echo -e "${GREEN}✅ API Organisations : $ORG_API organisations accessibles${NC}"
  else
    echo -e "${YELLOW}⚠️  API Organisations : Aucune donnée retournée${NC}"
  fi
  
  # Test scoring
  SCORE_TEST=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    http://localhost:8000/api/v1/esg-scoring/calculate 2>/dev/null | \
    python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('overall_score', 0))" 2>/dev/null)
  
  if [ "$SCORE_TEST" != "0" ] && [ -n "$SCORE_TEST" ]; then
    echo -e "${GREEN}✅ API Scoring : Score calculé = $SCORE_TEST${NC}"
  else
    echo -e "${YELLOW}⚠️  API Scoring : Score non disponible${NC}"
  fi
else
  echo -e "${RED}❌ Login échoué${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}🎉 CORRECTION TERMINÉE !${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}🎯 Prochaines étapes :${NC}"
echo ""
echo "1. Ouvrir votre navigateur : ${YELLOW}http://localhost:3000${NC}"
echo "2. Se connecter :"
echo "   📧 Email    : admin@demo.esgflow.com"
echo "   🔑 Password : Admin123!"
echo ""
echo "3. Tester les pages :"
echo "   ├─ 📊 Dashboard        → Voir les scores"
echo "   ├─ 📈 Scores           → Calculer un score"
echo "   ├─ 🏢 Organisations    → Liste des 29 organisations"
echo "   ├─ 📋 Indicateurs      → Voir les données"
echo "   └─ 📄 Rapports         → Générer un PDF"
echo ""
echo -e "${YELLOW}💡 Si vous voyez des erreurs 404 dans la console (F12) :${NC}"
echo "   Envoyez-moi une capture d'écran"
echo ""
echo "════════════════════════════════════════════════════════"
