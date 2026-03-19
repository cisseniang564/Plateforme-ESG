#!/bin/bash
echo "🚀 CORRECTION FINALE - AJOUT DE LA TABLE ROLES"
echo "==============================================="

# 1. Ajouter la table roles
echo "📝 Création de la table roles..."
docker-compose exec -T postgres psql -U esgflow_user -d esgflow_dev << 'SQL'
-- Créer la table roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB,
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insérer les rôles de base
INSERT INTO roles (name, description, is_system_role) VALUES
    ('super_admin', 'Super administrateur avec tous les droits', true),
    ('admin', 'Administrateur de plateforme', true),
    ('org_admin', 'Administrateur d\'organisation', true),
    ('user', 'Utilisateur standard', true),
    ('viewer', 'Lecteur seul', true)
ON CONFLICT (name) DO NOTHING;

-- Vérifier
SELECT '✅ Roles créés:' as message, COUNT(*) as nombre FROM roles;
SQL

# 2. Recréer toutes les tables
echo -e "\n🔄 Création de toutes les tables..."
docker-compose exec -T backend python << 'PYTHON'
import asyncio
from app.db.session import engine
from app.db.base import Base

async def create_all():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Toutes les tables ont été créées avec succès!")

asyncio.run(create_all())
PYTHON

# 3. Créer un admin par défaut
echo -e "\n👤 Création d'un utilisateur admin..."
docker-compose exec -T backend python << 'PYTHON'
import asyncio
import uuid
from datetime import datetime
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.role import Role
from app.core.security import get_password_hash
from sqlalchemy import select

async def create_admin():
    async with AsyncSessionLocal() as session:
        # Chercher le rôle admin
        result = await session.execute(select(Role).where(Role.name == 'super_admin'))
        admin_role = result.scalar_one_or_none()
        
        if not admin_role:
            print("❌ Rôle super_admin non trouvé!")
            return
        
        # Créer l'admin
        admin = User(
            id=uuid.uuid4(),
            email="admin@demo.esgflow.com",
            password_hash=get_password_hash("Admin123!"),
            full_name="Admin User",
            is_active=True,
            is_superuser=True,
            role_id=admin_role.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        session.add(admin)
        await session.commit()
        print("✅ Admin créé avec succès!")

asyncio.run(create_admin())
PYTHON

# 4. Redémarrer le backend
echo -e "\n🔄 Redémarrage du backend..."
docker-compose restart backend

# 5. Vérifier les logs
echo -e "\n📋 Logs du backend..."
sleep 5
docker-compose logs --tail=30 backend

# 6. Tester l'API
echo -e "\n🌐 Test de l'API..."
sleep 5
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.esgflow.com","password":"Admin123!"}' | python -m json.tool || echo "En attente..."
