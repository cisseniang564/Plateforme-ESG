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

    # ── Initial ESG score calculation ─────────────────────────────────────
    try:
        from app.services.score_calculation_service import ScoreCalculationService
        from app.models.organization import Organization
        from datetime import date
        org_result = await db.execute(
            select(Organization).where(Organization.tenant_id == tenant.id).limit(1)
        )
        org = org_result.scalar_one_or_none()
        if org:
            score_svc = ScoreCalculationService(db)
            await score_svc.calculate_score(
                tenant_id=tenant.id,
                calculation_date=date.today(),
                organization_id=org.id,
            )
            await db.commit()
    except Exception:
        pass  # Non-blocking: score calculation failure never breaks registration

    # ── Stripe: create customer + start trial ─────────────────────────────
    try:
        from app.services.stripe_service import StripeService, PLAN_CONFIGS
        from app.config import settings
        from datetime import timedelta, timezone

        cid = StripeService.create_customer(
            email=data.email,
            name=data.company_name,
            tenant_id=str(tenant.id),
        )
        tenant.stripe_customer_id = cid

        # Apply Pro trial limits
        pro_cfg = PLAN_CONFIGS["pro"]
        tenant.plan_tier = "pro"
        tenant.max_users = pro_cfg["max_users"]
        tenant.max_orgs = pro_cfg["max_orgs"]
        tenant.max_monthly_api_calls = pro_cfg["max_monthly_api_calls"]
        tenant.data_retention_months = pro_cfg["data_retention_months"]

        from datetime import datetime
        trial_days = getattr(settings, "TRIAL_DAYS", 14)
        tenant.trial_ends_at = datetime.now(timezone.utc) + timedelta(days=trial_days)
        tenant.stripe_subscription_status = "trialing"

        await db.commit()
    except Exception as exc:
        pass  # Non-blocking: billing setup fails gracefully

    # ── Email: welcome + trial started ────────────────────────────────────
    try:
        from app.services.email_service import EmailService
        from app.config import settings
        from datetime import timedelta, timezone, datetime

        trial_days = getattr(settings, "TRIAL_DAYS", 14)
        trial_end = (datetime.now(timezone.utc) + timedelta(days=trial_days)).strftime("%d/%m/%Y")

        EmailService.send_welcome(
            email=user.email,
            first_name=user.first_name,
            company=data.company_name,
        )
        EmailService.send_trial_started(
            email=user.email,
            first_name=user.first_name,
            company=data.company_name,
            trial_end=trial_end,
        )
    except Exception:
        pass  # Non-blocking: email failure never breaks registration

    return {"message": "Compte créé !", "user_id": str(user.id), "email": user.email}
