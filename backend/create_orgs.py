from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Importer TOUS les modèles dans le bon ordre
from app.models.tenant import Tenant
from app.models.user import User
from app.models.role import Role, UserRole, Permission
from app.models.organization import Organization

# Configuration DB
engine = create_engine("postgresql://esgflow_user:esgflow_password_dev@postgres:5432/esgflow_dev")
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    # Récupérer le tenant
    tenant = db.query(Tenant).filter(Tenant.slug == "demo-company").first()
    
    if not tenant:
        print("❌ Tenant not found")
        exit(1)
    
    # Vérifier si les orgs existent déjà
    existing = db.query(Organization).filter(Organization.tenant_id == tenant.id).count()
    if existing > 0:
        print(f"ℹ️  {existing} organizations already exist")
    else:
        # Créer des organisations
        orgs = [
            Organization(tenant_id=tenant.id, name="Headquarters", org_type="group", is_active=True),
            Organization(tenant_id=tenant.id, name="Manufacturing Plant", org_type="business_unit", is_active=True),
            Organization(tenant_id=tenant.id, name="R&D Center", org_type="business_unit", is_active=True),
        ]
        
        for org in orgs:
            db.add(org)
        
        db.commit()
        print(f"✅ Created {len(orgs)} organizations")
    
except Exception as e:
    db.rollback()
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
