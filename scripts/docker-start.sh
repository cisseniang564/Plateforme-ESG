#!/bin/bash
# ============================================================================
# Fichier: /home/claude/esg-saas-platform/scripts/docker-start.sh
# Description: Script pour démarrer l'environnement Docker complet
# ============================================================================

set -e

echo "============================================================================"
echo "ESGFlow - Starting Docker Environment"
echo "============================================================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}⚠️  docker-compose is not installed. Please install it first.${NC}"
    exit 1
fi

echo -e "\n${BLUE}📦 Building Docker images...${NC}"
docker-compose build

echo -e "\n${BLUE}🚀 Starting services...${NC}"
docker-compose up -d

echo -e "\n${BLUE}⏳ Waiting for services to be ready...${NC}"

# Wait for PostgreSQL
echo -n "  Waiting for PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U esgflow_user -d esgflow_dev > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}✓${NC}"

# Wait for Redis
echo -n "  Waiting for Redis..."
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}✓${NC}"

# Wait for Kafka
echo -n "  Waiting for Kafka..."
sleep 10  # Kafka takes a bit longer to start
echo -e " ${GREEN}✓${NC}"

# Wait for backend
echo -n "  Waiting for Backend API..."
until curl -s http://localhost:8000/health > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}✓${NC}"

echo -e "\n${BLUE}🔄 Running database migrations...${NC}"
docker-compose exec -T backend alembic upgrade head

echo -e "\n${BLUE}🌱 Seeding initial data...${NC}"
docker-compose exec -T backend python scripts/db/seed_data.py

echo -e "\n${GREEN}============================================================================${NC}"
echo -e "${GREEN}✅ ESGFlow environment is ready!${NC}"
echo -e "${GREEN}============================================================================${NC}"

echo -e "\n${BLUE}📍 Services URLs:${NC}"
echo "  🌐 Backend API:        http://localhost:8000"
echo "  📚 API Documentation:  http://localhost:8000/docs"
echo "  🗄️  PgAdmin:           http://localhost:5050"
echo "  🪣  MinIO Console:     http://localhost:9001"
echo "  🌸 Flower (Celery):    http://localhost:5555"

echo -e "\n${BLUE}🔑 Demo Credentials:${NC}"
echo "  Email:    admin@demo.esgflow.com"
echo "  Password: Admin123!"

echo -e "\n${BLUE}🗄️  Database:${NC}"
echo "  Host:     localhost"
echo "  Port:     5432"
echo "  Database: esgflow_dev"
echo "  User:     esgflow_user"
echo "  Password: esgflow_password_dev"

echo -e "\n${BLUE}💡 Useful Commands:${NC}"
echo "  View logs:        docker-compose logs -f"
echo "  Stop all:         docker-compose down"
echo "  Restart service:  docker-compose restart backend"
echo "  Shell into DB:    docker-compose exec postgres psql -U esgflow_user -d esgflow_dev"
echo "  Backend shell:    docker-compose exec backend bash"

echo -e "\n${BLUE}📖 Next Steps:${NC}"
echo "  1. Open http://localhost:8000/docs"
echo "  2. Try the /api/v1/auth/login endpoint"
echo "  3. Use the demo credentials above"
echo ""