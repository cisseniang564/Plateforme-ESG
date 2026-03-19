from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

# Importer TOUS les modèles
from app.models.tenant import Tenant
from app.models.user import User
from app.models.role import Role, UserRole, Permission
from app.models.organization import Organization

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
engine = create_engine("postgresql://esgflow_user:esgflow_password_dev@postgres:5432/esgflow_dev")
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    tenant = db.query(Tenant).filter(Tenant.slug == "demo-company").first()
    
    # Vérifier si les users existent
    existing_users = db.query(User).filter(User.tenant_id == tenant.id).count()
    print(f"ℹ️  {existing_users} users already exist")
    
    users_to_create = [
        {"email": "manager@demo.esgflow.com", "first_name": "Sarah", "last_name": "Manager"},
        {"email": "analyst@demo.esgflow.com", "first_name": "John", "last_name": "Analyst"},
    ]
    
    created = 0
    for user_data in users_to_create:
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing:
            user = User(
                tenant_id=tenant.id,
                email=user_data["email"],
                password_hash=pwd_context.hash("Demo123!"),
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                is_active=True,
                auth_provider="local"
            )
            db.add(user)
            created += 1
    
    db.commit()
    print(f"✅ Created {created} new users")
    
except Exception as e:
    db.rollback()
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
