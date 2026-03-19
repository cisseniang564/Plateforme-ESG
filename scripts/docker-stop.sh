#!/bin/bash
# ============================================================================
# Fichier: /home/claude/esg-saas-platform/scripts/docker-stop.sh
# Description: Script pour arrêter l'environnement Docker
# ============================================================================

set -e

echo "============================================================================"
echo "ESGFlow - Stopping Docker Environment"
echo "============================================================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "\n${YELLOW}🛑 Stopping all services...${NC}"
docker-compose down

echo -e "\n${GREEN}✅ All services stopped.${NC}"
echo ""
echo "To remove all data (volumes), run:"
echo "  docker-compose down -v"
echo ""
echo "To start again, run:"
echo "  ./scripts/docker-start.sh"
echo ""