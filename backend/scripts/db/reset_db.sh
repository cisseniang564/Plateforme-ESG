#!/bin/bash
# ============================================================================
# Fichier: /home/claude/esg-saas-platform/backend/scripts/db/reset_db.sh
# Description: Script pour réinitialiser complètement la base de données
# ============================================================================

set -e

echo "============================================================================"
echo "ESGFlow - Database Reset"
echo "============================================================================"
echo ""
echo "⚠️  WARNING: This will DELETE ALL DATA in the database!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "🗑️  Dropping all tables..."
alembic downgrade base

echo ""
echo "📊 Running migrations..."
alembic upgrade head

echo ""
echo "🌱 Seeding initial data..."
python scripts/db/seed_data.py

echo ""
echo "============================================================================"
echo "✅ Database reset completed successfully!"
echo "============================================================================"