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
    # mark_done=False so the setup wizard is still shown on first login
    try:
        from app.services.tenant_onboarding import TenantOnboardingService
        onboarding = TenantOnboardingService(db, str(tenant.id))
        await onboarding.setup(org_name=data.company_name, sector="general", mark_done=False)
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

    # ── Trial: always set trial period (regardless of Stripe) ────────────
    try:
        from app.config import settings as app_settings
        from app.services.stripe_service import PLAN_CONFIGS
        from datetime import datetime, timedelta, timezone

        trial_days = getattr(app_settings, "TRIAL_DAYS", 14)
        pro_cfg = PLAN_CONFIGS.get("pro", {})
        tenant.plan_tier = "pro"
        tenant.max_users = pro_cfg.get("max_users", 50)
        tenant.max_orgs = pro_cfg.get("max_orgs", 100)
        tenant.max_monthly_api_calls = pro_cfg.get("max_monthly_api_calls", 100000)
        tenant.data_retention_months = pro_cfg.get("data_retention_months", 36)
        tenant.trial_ends_at = datetime.now(timezone.utc) + timedelta(days=trial_days)
        tenant.stripe_subscription_status = "trialing"
        await db.commit()
    except Exception:
        pass  # Non-blocking

    # ── Stripe: create customer (optional, non-blocking) ──────────────────
    try:
        from app.services.stripe_service import StripeService
        cid = StripeService.create_customer(
            email=data.email,
            name=data.company_name,
            tenant_id=str(tenant.id),
        )
        tenant.stripe_customer_id = cid
        await db.commit()
    except Exception:
        pass  # Non-blocking: Stripe unavailable does not break registration

    # ── Email: welcome + trial started ────────────────────────────────────
    try:
        from app.config import settings
        from app.tasks.email_tasks import send_welcome_email, send_trial_started_email
        from datetime import timedelta, timezone, datetime

        trial_days = getattr(settings, "TRIAL_DAYS", 14)
        trial_end = (datetime.now(timezone.utc) + timedelta(days=trial_days)).strftime("%d/%m/%Y")

        send_welcome_email.delay(
            email=user.email,
            first_name=user.first_name,
            company=data.company_name,
        )
        send_trial_started_email.delay(
            email=user.email,
            first_name=user.first_name,
            company=data.company_name,
            trial_end=trial_end,
        )
    except Exception:
        pass  # Non-blocking: email failure never breaks registration

    return {"message": "Compte créé !", "user_id": str(user.id), "email": user.email}
