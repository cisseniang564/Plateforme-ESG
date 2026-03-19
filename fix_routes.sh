#!/bin/bash

cd /Users/cisseniang/Downloads/esgplatform/frontend/src

echo "Vérification routes.tsx..."
if grep -q "ProtectedRoute" routes.tsx; then
  echo "✅ ProtectedRoute trouvé"
else
  echo "❌ ProtectedRoute manquant - à corriger"
fi

echo ""
echo "Vérification useAuth.tsx..."
if [ -f "hooks/useAuth.tsx" ]; then
  echo "✅ useAuth.tsx existe"
  echo ""
  echo "Contenu actuel (redirection après login):"
  grep -A 5 "navigate" hooks/useAuth.tsx | head -10
else
  echo "❌ useAuth.tsx introuvable"
fi
