#!/bin/bash
# ============================================================================
# Fichier: /home/claude/esg-saas-platform/scripts/docker-restart.sh
# Description: Redémarre les services Docker
# ============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 Restarting ESGFlow services...${NC}"

# Rebuild if requested
if [ "$1" == "--build" ]; then
    echo -e "\n${BLUE}📦 Rebuilding images...${NC}"
    docker-compose build
fi

# Restart services
echo -e "\n${BLUE}♻️  Restarting containers...${NC}"
docker-compose restart

echo -e "\n${GREEN}✅ Services restarted!${NC}"
echo ""
echo "View logs: ./scripts/docker-logs.sh"
echo ""