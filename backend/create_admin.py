from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from app.config import settings

# Importer TOUS les modèles en premier
from app.models.tenant import Tenant
from app.models.role import Role, UserRole, Permission
from app.models.user import User
from app.models.organization import Organization

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Convertir l'URL async en sync
database_url = str(settings.DATABASE_URL).replace("+asyncpg", "")

# Créer engine et session
engine = create_engine(database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    # Vérifier si l'utilisateur existe déjà
    existing = db.query(User).filter(User.email == "admin@demo.esgflow.com").first()
    if existing:
        print("ℹ️  User already exists!")
        print(f"Email: {existing.email}")
        print(f"Tenant ID: {existing.tenant_id}")
    else:
        # Créer le tenant
        tenant = Tenant(
            name="Demo Company",
            slug="demo-company",
            plan_tier="pro",
            status="active",
            max_users=50,
            max_orgs=100
        )
        db.add(tenant)
        db.flush()
        
        # Créer l'utilisateur
        user = User(
            tenant_id=tenant.id,
            email="admin@demo.esgflow.com",
            password_hash=pwd_context.hash("Admin123!"),
            first_name="Admin",
            last_name="Demo",
            is_active=True,
            auth_provider="local"
        )
        db.add(user)
        db.commit()
        
        print("✅ User created successfully!")
        print(f"Email: {user.email}")
        print(f"Tenant: {tenant.name}")
        print(f"Tenant ID: {tenant.id}")
    
except Exception as e:
    db.rollback()
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
