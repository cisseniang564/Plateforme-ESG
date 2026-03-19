"""User registration."""
import re
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from app.db.session import get_db
from app.models.user import User
from app.models.tenant import Tenant

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    company_name: str

def _make_slug(name: str, uid: str) -> str:
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')[:80]
    return f"{slug}-{uid[:8]}"

@router.post("/register")
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    tenant_id = uuid4()
    slug = _make_slug(data.company_name, str(tenant_id))
    tenant = Tenant(id=tenant_id, name=data.company_name, slug=slug)
    db.add(tenant)
    await db.flush()

    user = User(
        id=uuid4(), tenant_id=tenant.id, email=data.email,
        password_hash=pwd_context.hash(data.password),
        first_name=data.first_name, last_name=data.last_name,
        is_active=True, auth_provider='local', locale='fr', timezone='Europe/Paris'
    )
    db.add(user)
    await db.commit()

    # Seed default organisation + indicators for this new tenant
    try:
        from app.services.tenant_onboarding import TenantOnboardingService
        onboarding = TenantOnboardingService(db, str(tenant.id))
        await onboarding.setup(org_name=data.company_name, sector="general")
    except Exception:
        pass  # Non-blocking: registration succeeds even if seeding fails

    return {"message": "Compte créé !", "user_id": str(user.id), "email": user.email}
