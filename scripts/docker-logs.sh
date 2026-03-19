#!/bin/bash
# ============================================================================
# Fichier: /home/claude/esg-saas-platform/scripts/docker-logs.sh
# Description: Script pour voir les logs des services Docker
# ============================================================================

SERVICE=${1:-}

if [ -z "$SERVICE" ]; then
    echo "============================================================================"
    echo "ESGFlow - Docker Logs"
    echo "============================================================================"
    echo ""
    echo "Usage: ./scripts/docker-logs.sh [service]"
    echo ""
    echo "Available services:"
    echo "  backend          - FastAPI backend"
    echo "  postgres         - PostgreSQL database"
    echo "  redis            - Redis cache"
    echo "  kafka            - Kafka event streaming"
    echo "  celery-worker    - Celery worker"
    echo "  flower           - Flower (Celery monitoring)"
    echo "  minio            - MinIO (S3 storage)"
    echo "  pgadmin          - PgAdmin (database UI)"
    echo ""
    echo "Examples:"
    echo "  ./scripts/docker-logs.sh backend"
    echo "  ./scripts/docker-logs.sh postgres"
    echo ""
    echo "To view all logs:"
    echo "  docker-compose logs -f"
    echo ""
else
    echo "📋 Viewing logs for: $SERVICE"
    echo "Press Ctrl+C to exit"
    echo ""
    docker-compose logs -f "$SERVICE"
fi