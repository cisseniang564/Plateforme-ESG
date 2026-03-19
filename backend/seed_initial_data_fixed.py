import asyncio
from uuid import UUID, uuid4
from passlib.context import CryptContext
from sqlalchemy import text
import sys

sys.path.insert(0, '/app')

# CORRECTION: Utiliser AsyncSessionLocal au lieu de async_session
from app.db.session import AsyncSessionLocal

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_initial_data():
    """Créer tenant, rôle et utilisateur admin"""
    
    # Utiliser AsyncSessionLocal() au lieu de async_session()
    async with AsyncSessionLocal() as session:
        try:
            tenant_id = UUID("00000000-0000-0000-0000-000000000001")
            role_id = uuid4()
            user_id = uuid4()
            
            print("1️⃣ Création du tenant...")
            await session.execute(text("""
                INSERT INTO tenants (
                    id, name, slug, plan_tier, status,
                    max_users, max_orgs, max_monthly_api_calls, data_retention_months,
                    created_at, updated_at
                ) VALUES (
                    :id, 'Demo ESGFlow', 'demo-esgflow', 'enterprise', 'active',
                    100, 50, 1000000, 24,
                    NOW(), NOW()
                )
                ON CONFLICT (id) DO NOTHING
            """), {"id": str(tenant_id)})
            print("   ✅ Tenant créé")
            
            print("2️⃣ Création du rôle admin...")
            await session.execute(text("""
                INSERT INTO roles (
                    id, tenant_id, name, description, is_system_role,
                    created_at, updated_at
                ) VALUES (
                    :id, NULL, 'admin', 'Administrateur système', true,
                    NOW(), NOW()
                )
            """), {"id": str(role_id)})
            print("   ✅ Rôle créé")
            
            print("3️⃣ Création utilisateur admin...")
            password_hash = pwd_context.hash("Admin123!")
            
            await session.execute(text("""
                INSERT INTO users (
                    id, tenant_id, email, password_hash, auth_provider,
                    role_id, first_name, last_name, is_active,
                    locale, timezone, created_at, updated_at
                ) VALUES (
                    :id, :tenant_id, :email, :password_hash, 'local',
                    :role_id, 'Admin', 'Demo', true,
                    'fr', 'Europe/Paris', NOW(), NOW()
                )
                ON CONFLICT (tenant_id, email) DO NOTHING
            """), {
                "id": str(user_id),
                "tenant_id": str(tenant_id),
                "email": "admin@demo.esgflow.com",
                "password_hash": password_hash,
                "role_id": str(role_id)
            })
            print("   ✅ Utilisateur créé")
            
            await session.commit()
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("✅ DONNÉES INITIALES CRÉÉES !")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("")
            print(f"Tenant ID: {tenant_id}")
            print(f"Email:     admin@demo.esgflow.com")
            print(f"Password:  Admin123!")
            print(f"User ID:   {user_id}")
            print(f"Role ID:   {role_id}")
            print("")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ ERREUR: {e}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    asyncio.run(create_initial_data())
