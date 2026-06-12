"""User registration."""
import logging
import re
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, text
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from app.db.session import get_db
from app.models.user import User
from app.models.tenant import Tenant

logger = logging.getLogger(__name__)

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
    # ── Check for existing user — but allow re-registration if the user is
    # orphaned (their tenant has been deleted). This happens when a workspace
    # is deleted: the user row should cascade out but might remain if the
    # deletion was partial. Auto-clean it here so the user can sign up again.
    existing_q = await db.execute(select(User).where(User.email == data.email))
    existing = existing_q.scalar_one_or_none()
    if existing:
        # Is the tenant still alive?
        tenant_q = await db.execute(
            select(Tenant).where(Tenant.id == existing.tenant_id)
        )
        owning_tenant = tenant_q.scalar_one_or_none()
        if owning_tenant is None or owning_tenant.status == "deleted":
            # Orphan or soft-deleted — wipe the user so registration can proceed.
            logger.warning(
                "Cleaning orphan user %s (tenant=%s status=%s) so registration can proceed",
                existing.email, existing.tenant_id,
                getattr(owning_tenant, "status", "MISSING"),
            )
            await db.execute(
                text("DELETE FROM users WHERE id = :uid"),
                {"uid": str(existing.id)},
            )
            await db.commit()
        else:
            raise HTTPException(status_code=400, detail="Email déjà utilisé")

    tenant_id = uuid4()
    slug = _make_slug(data.company_name, str(tenant_id))
    tenant = Tenant(id=tenant_id, name=data.company_name, slug=slug)
    db.add(tenant)
    await db.flush()

    user_id = uuid4()
    user = User(
        id=user_id, tenant_id=tenant.id, email=data.email,
        password_hash=pwd_context.hash(data.password),
        first_name=data.first_name, last_name=data.last_name,
        is_active=True, auth_provider='local', locale='fr', timezone='Europe/Paris'
    )
    db.add(user)
    await db.commit()

    # Capture scalars now — post-create blocks may corrupt the session with
    # rollbacks, making ORM attribute access trigger greenlet errors later.
    user_id_str = str(user_id)
    user_email = data.email

    # ── Safety check: confirm the tenant row actually persists after commit.
    # If a downstream code path (or rollback elsewhere) removed it, we
    # rollback the user too so we don't leave an orphan in the DB.
    tenant_check = await db.execute(
        select(Tenant).where(Tenant.id == tenant_id)
    )
    if tenant_check.scalar_one_or_none() is None:
        logger.error("Tenant %s vanished right after registration commit — cleaning user", tenant_id)
        await db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": user_id_str})
        await db.commit()
        raise HTTPException(
            status_code=500,
            detail="Erreur lors de la création du compte — réessayez.",
        )

    # All post-create steps are non-blocking and ISOLATED — each rolls back
    # any previous broken session state before running, and uses raw
    # ``update(Tenant).where(id=...)`` instead of ORM attribute mutation
    # (the latter triggers SQLAlchemy's "expected 1 row(s); 0 were matched"
    # error if the session was put in a stale/expired state by a previous
    # block that failed silently).

    # NOTE: We intentionally do NOT seed indicators or call the onboarding
    # service here — the 5-step wizard (FirstTimeSetup) does that itself in
    # steps 1 (profile/org) and 3 (indicators). Calling setup() here would
    # bypass the wizard and confuse the user about where to start.
    #
    # The tenant has been created above; the first organization will be
    # created by the wizard when the user submits step 1 (profile).

    # ── Initial ESG score calculation ─────────────────────────────────────
    try:
        from app.services.score_calculation_service import ScoreCalculationService
        from app.models.organization import Organization
        from datetime import date
        org_result = await db.execute(
            select(Organization).where(Organization.tenant_id == tenant_id).limit(1)
        )
        org = org_result.scalar_one_or_none()
        if org:
            score_svc = ScoreCalculationService(db)
            await score_svc.calculate_score(
                tenant_id=tenant_id,
                calculation_date=date.today(),
                organization_id=org.id,
            )
            await db.commit()
    except Exception as exc:
        logger.warning("Initial score calc failed for tenant %s: %s", tenant_id, exc)
        try:
            await db.rollback()
        except Exception:
            pass

    # ── Free trial: 14-day ETI trial ────────────────────────────────────
    # New users get a full-featured trial on the ETI plan so they can
    # experience the platform's capabilities. After TRIAL_DAYS the
    # billing_is_active property returns False and /billing/features
    # automatically downgrades the effective tier to "free".
    try:
        try:
            await db.rollback()  # clean any prior aborted state
        except Exception:
            pass
        from app.core.plan_limits import get_limits
        from app.config import settings as _cfg
        from datetime import timedelta, timezone as tz, datetime as dt

        trial_days = getattr(_cfg, "TRIAL_DAYS", 14)
        trial_end_dt = dt.now(tz.utc) + timedelta(days=trial_days)
        trial_tier = "eti"
        trial_cfg = get_limits(trial_tier)

        await db.execute(
            update(Tenant)
            .where(Tenant.id == tenant_id)
            .values(
                plan_tier=trial_tier,
                max_users=trial_cfg.get("max_users", 100),
                max_orgs=trial_cfg.get("max_orgs", 250),
                max_monthly_api_calls=trial_cfg.get("max_monthly_api_calls", 1_000_000),
                data_retention_months=trial_cfg.get("data_retention_months", 60),
                trial_ends_at=trial_end_dt,
                stripe_subscription_status="trialing",
            )
        )
        await db.commit()
    except Exception as exc:
        logger.warning("Trial setup failed for tenant %s: %s", tenant_id, exc)
        try:
            await db.rollback()
        except Exception:
            pass

    # ── Stripe: create customer (optional, non-blocking) ──────────────────
    try:
        try:
            await db.rollback()  # clean any prior aborted state
        except Exception:
            pass
        from app.services.stripe_service import StripeService
        cid = StripeService.create_customer(
            email=data.email,
            name=data.company_name,
            tenant_id=str(tenant_id),
        )
        await db.execute(
            update(Tenant)
            .where(Tenant.id == tenant_id)
            .values(stripe_customer_id=cid)
        )
        await db.commit()
    except Exception as exc:
        logger.warning("Stripe customer creation failed for tenant %s: %s", tenant_id, exc)
        try:
            await db.rollback()
        except Exception:
            pass

    # ── Email: welcome + trial started ────────────────────────────────────
    try:
        from app.config import settings
        from app.tasks.email_tasks import send_welcome_email, send_trial_started_email
        from datetime import timedelta, timezone, datetime

        trial_days = getattr(settings, "TRIAL_DAYS", 14)
        trial_end = (datetime.now(timezone.utc) + timedelta(days=trial_days)).strftime("%d/%m/%Y")

        send_welcome_email.delay(
            email=user_email,
            first_name=data.first_name,
            company=data.company_name,
        )
        send_trial_started_email.delay(
            email=user_email,
            first_name=data.first_name,
            company=data.company_name,
            trial_end=trial_end,
        )
    except Exception:
        pass  # Non-blocking: email failure never breaks registration

    return {"message": "Compte créé !", "user_id": user_id_str, "email": user_email}
