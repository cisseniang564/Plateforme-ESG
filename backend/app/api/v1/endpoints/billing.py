"""
Billing API endpoints — Stripe checkout, portal, subscription info, invoices.
All routes require JWT authentication.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth_middleware import get_current_tenant_id, get_current_user_id
from app.models.tenant import Tenant
from app.models.user import User
from app.core.permissions import require_role, Roles

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    # Accept either a plan name ("starter", "pro") OR a raw Stripe price_id
    plan: str = ""
    price_id: str = ""
    billing_cycle: str = "monthly"   # "monthly" | "yearly"
    success_url: str = ""
    cancel_url: str = ""


class PortalRequest(BaseModel):
    return_url: str = ""


class ChangePlanRequest(BaseModel):
    plan: str = ""           # "starter" | "pro" | "enterprise"
    price_id: str = ""       # raw price_id (overrides plan)
    billing_cycle: str = "monthly"
    proration_behavior: str = "create_prorations"  # or "none" / "always_invoice"


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _get_tenant(db: AsyncSession, tenant_id: UUID) -> Tenant:
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant introuvable")
    return tenant


async def _get_user(db: AsyncSession, user_id: UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return user


def _stripe():
    from app.services.stripe_service import StripeService
    return StripeService


def _app_url() -> str:
    from app.config import settings
    return getattr(settings, "APP_URL", "http://localhost:3000")


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/subscription", summary="Infos abonnement courant")
async def get_subscription(
    request: Request,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Return current subscription info for the authenticated tenant.

    Operator emails in ``PLAN_BYPASS_EMAILS`` always see Enterprise plan info
    (testing-phase override).
    """
    from sqlalchemy import func
    from app.models.user import User
    from app.models.organization import Organization
    from app.dependencies import _user_bypasses_plan_gate as _bypass

    user_id = getattr(request.state, "user_id", None)
    if await _bypass(db, user_id):
        ent = PLAN_LIMITS["enterprise"]
        return {
            "plan_tier": "enterprise",
            "status": "active",
            "is_active": True,
            "is_trial": False,
            "stripe_subscription_id": None,
            "stripe_customer_id": None,
            "current_period_end": None,
            "trial_ends_at": None,
            "max_users": ent["max_users"],
            "max_orgs": ent["max_orgs"],
            "max_organizations": ent["max_orgs"],
            "max_monthly_api_calls": ent["max_monthly_api_calls"],
            "max_api_calls": ent["max_monthly_api_calls"],
            "current_users": 0,
            "current_orgs": 0,
        }

    tenant = await _get_tenant(db, tenant_id)

    # Count current users and orgs for quota display (single query each)
    user_count: int = (
        await db.execute(
            select(func.count(User.id)).where(User.tenant_id == tenant_id)
        )
    ).scalar_one() or 0
    org_count: int = (
        await db.execute(
            select(func.count(Organization.id)).where(Organization.tenant_id == tenant_id)
        )
    ).scalar_one() or 0

    return {
        "plan_tier": tenant.plan_tier,
        "status": getattr(tenant, "stripe_subscription_status", None) or "active",
        "is_active": tenant.billing_is_active,
        "is_trial": tenant.is_in_trial,
        "stripe_subscription_id": getattr(tenant, "stripe_subscription_id", None),
        "stripe_customer_id": tenant.stripe_customer_id,
        "current_period_end": getattr(tenant, "stripe_current_period_end", None),
        "trial_ends_at": getattr(tenant, "trial_ends_at", None),
        # Limits
        "max_users": tenant.max_users,
        "max_orgs": tenant.max_orgs,
        "max_organizations": tenant.max_orgs,
        "max_monthly_api_calls": tenant.max_monthly_api_calls,
        "max_api_calls": tenant.max_monthly_api_calls,
        # Current usage (for quota bars)
        "current_users": user_count,
        "current_orgs": org_count,
    }


@router.post("/checkout", summary="Créer une session Stripe Checkout")
async def create_checkout(
    body: CheckoutRequest,
    _: None = Depends(require_role(Roles.TENANT_ADMIN)),
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """Créer une session Checkout Stripe (tenant_admin uniquement)."""
    tenant = await _get_tenant(db, tenant_id)
    user = await _get_user(db, user_id)

    # ── Resolve price_id ─────────────────────────────────────────────────────
    from app.config import settings as _cfg
    cycle = body.billing_cycle.lower()
    PLAN_TO_PRICE: dict = {
        # New commercial tiers
        ("pme",    "monthly"): getattr(_cfg, "STRIPE_PRICE_PME_MONTHLY",    ""),
        ("pme",    "yearly"):  getattr(_cfg, "STRIPE_PRICE_PME_YEARLY",     ""),
        ("eti",    "monthly"): getattr(_cfg, "STRIPE_PRICE_ETI_MONTHLY",    ""),
        ("eti",    "yearly"):  getattr(_cfg, "STRIPE_PRICE_ETI_YEARLY",     ""),
        ("groupe", "monthly"): getattr(_cfg, "STRIPE_PRICE_GROUPE_MONTHLY", ""),
        ("groupe", "yearly"):  getattr(_cfg, "STRIPE_PRICE_GROUPE_YEARLY",  ""),
        # Legacy tiers (existing subscribers)
        ("starter", "monthly"): getattr(_cfg, "STRIPE_PRICE_STARTER_MONTHLY", ""),
        ("starter", "yearly"):  getattr(_cfg, "STRIPE_PRICE_STARTER_YEARLY",  ""),
        ("pro",     "monthly"): getattr(_cfg, "STRIPE_PRICE_PRO_MONTHLY",     ""),
        ("pro",     "yearly"):  getattr(_cfg, "STRIPE_PRICE_PRO_YEARLY",      ""),
    }
    resolved_price_id = body.price_id or PLAN_TO_PRICE.get((body.plan, cycle), "")
    if not resolved_price_id:
        raise HTTPException(
            status_code=400,
            detail=f"Plan inconnu ou price_id manquant: '{body.plan or body.price_id}'. "
                   f"Plans disponibles: {list(PLAN_TO_PRICE.keys())}",
        )

    try:
        svc = _stripe()

        # Ensure Stripe customer exists
        if not tenant.stripe_customer_id:
            cid = svc.create_customer(
                email=user.email,
                name=tenant.name,
                tenant_id=str(tenant_id),
            )
            tenant.stripe_customer_id = cid
            await db.commit()

        app_url = _app_url()
        success_url = body.success_url or f"{app_url}/app/billing?checkout=success"
        cancel_url = body.cancel_url or f"{app_url}/app/billing"

        url = svc.create_checkout_session(
            customer_id=tenant.stripe_customer_id,
            price_id=resolved_price_id,
            success_url=success_url,
            cancel_url=cancel_url,
        )
        return {"checkout_url": url}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=f"Stripe non configuré: {e}")
    except Exception as e:
        logger.exception("Checkout session error")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/portal", summary="Créer une session portail client Stripe")
async def create_portal(
    body: PortalRequest,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """Create a Stripe Customer Portal session for billing management."""
    tenant = await _get_tenant(db, tenant_id)

    if not tenant.stripe_customer_id:
        raise HTTPException(
            status_code=400,
            detail="Aucun abonnement Stripe. Souscrivez d'abord à un plan."
        )

    try:
        app = _app_url()
        return_url = body.return_url or f"{app}/app/settings?tab=billing"
        url = _stripe().create_portal_session(
            customer_id=tenant.stripe_customer_id,
            return_url=return_url,
        )
        return {"portal_url": url}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=f"Stripe non configuré: {e}")
    except Exception as e:
        logger.exception("Portal session error")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cancel", summary="Annuler l'abonnement à la fin de la période")
async def cancel_subscription(
    _: None = Depends(require_role(Roles.TENANT_ADMIN)),
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Schedule subscription cancellation at end of billing period."""
    tenant = await _get_tenant(db, tenant_id)
    sub_id = getattr(tenant, "stripe_subscription_id", None)
    if not sub_id:
        raise HTTPException(status_code=400, detail="Aucun abonnement actif")
    try:
        result = _stripe().cancel_subscription(sub_id)
        return {"message": "Abonnement annulé à la fin de la période.", **result}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/reactivate", summary="Réactiver un abonnement")
async def reactivate_subscription(
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Cancel a scheduled cancellation (reactivate subscription)."""
    tenant = await _get_tenant(db, tenant_id)
    sub_id = getattr(tenant, "stripe_subscription_id", None)
    if not sub_id:
        raise HTTPException(status_code=400, detail="Aucun abonnement")
    try:
        result = _stripe().reactivate_subscription(sub_id)
        return {"message": "Abonnement réactivé.", **result}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/change-plan", summary="Changer de plan (upgrade / downgrade / cycle)")
async def change_plan(
    body: ChangePlanRequest,
    _: None = Depends(require_role(Roles.TENANT_ADMIN)),
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Upgrade or downgrade an existing Stripe subscription without a new Checkout session.
    Uses Subscription.modify() with prorations so the customer is billed/credited
    immediately (or at next renewal for downgrades with proration_behavior='none').
    """
    tenant = await _get_tenant(db, tenant_id)
    sub_id = getattr(tenant, "stripe_subscription_id", None)
    if not sub_id:
        raise HTTPException(
            status_code=400,
            detail="Aucun abonnement actif — utilisez /billing/checkout pour souscrire.",
        )

    from app.config import settings as _cfg
    cycle = body.billing_cycle.lower()
    PLAN_TO_PRICE: dict = {
        # New commercial tiers
        ("pme",    "monthly"): getattr(_cfg, "STRIPE_PRICE_PME_MONTHLY",    ""),
        ("pme",    "yearly"):  getattr(_cfg, "STRIPE_PRICE_PME_YEARLY",     ""),
        ("eti",    "monthly"): getattr(_cfg, "STRIPE_PRICE_ETI_MONTHLY",    ""),
        ("eti",    "yearly"):  getattr(_cfg, "STRIPE_PRICE_ETI_YEARLY",     ""),
        ("groupe", "monthly"): getattr(_cfg, "STRIPE_PRICE_GROUPE_MONTHLY", ""),
        ("groupe", "yearly"):  getattr(_cfg, "STRIPE_PRICE_GROUPE_YEARLY",  ""),
        # Legacy tiers (existing subscribers)
        ("starter", "monthly"): getattr(_cfg, "STRIPE_PRICE_STARTER_MONTHLY", ""),
        ("starter", "yearly"):  getattr(_cfg, "STRIPE_PRICE_STARTER_YEARLY",  ""),
        ("pro",     "monthly"): getattr(_cfg, "STRIPE_PRICE_PRO_MONTHLY",     ""),
        ("pro",     "yearly"):  getattr(_cfg, "STRIPE_PRICE_PRO_YEARLY",      ""),
    }
    resolved_price_id = body.price_id or PLAN_TO_PRICE.get((body.plan, cycle), "")
    if not resolved_price_id:
        raise HTTPException(status_code=400, detail=f"Plan/cycle inconnu : {body.plan}/{cycle}")

    try:
        svc = _stripe()
        result = svc.change_plan(
            subscription_id=sub_id,
            new_price_id=resolved_price_id,
            proration_behavior=body.proration_behavior,
        )
        # Sync tenant limits from updated subscription
        from app.services.stripe_service import StripeService
        import stripe as _stripe_lib
        stripe_key = getattr(_cfg, "STRIPE_SECRET_KEY", "")
        _stripe_lib.api_key = stripe_key
        updated_sub = _stripe_lib.Subscription.retrieve(sub_id)
        await StripeService.sync_subscription_to_tenant(
            db, tenant.stripe_customer_id, updated_sub
        )
        return {"message": "Plan mis à jour avec succès.", **result}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("change_plan error")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/retry-payment", summary="Relancer le paiement en échec")
async def retry_payment(
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Attempt to pay the latest open invoice (useful when subscription is past_due)."""
    tenant = await _get_tenant(db, tenant_id)
    if not tenant.stripe_customer_id:
        raise HTTPException(status_code=400, detail="Aucun client Stripe")
    try:
        from app.services.stripe_service import _get_stripe
        import stripe as _stripe_lib
        _get_stripe()
        invoices = _stripe_lib.Invoice.list(
            customer=tenant.stripe_customer_id,
            status="open",
            limit=1,
        )
        if not invoices.data:
            return {"message": "Aucune facture ouverte trouvée."}
        inv = _stripe_lib.Invoice.pay(invoices.data[0].id)
        if inv.status == "paid":
            tenant.stripe_subscription_status = "active"
            await db.commit()
        return {"invoice_id": inv.id, "status": inv.status}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("retry_payment error")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Plan feature gates ───────────────────────────────────────────────────────

# Canonical list of features and the minimum plan tier that unlocks them.
# Tiers in ascending order: free < pme < eti < groupe < enterprise
_TIER_ORDER = {
    "free": 0,
    "pme": 1, "eti": 2, "groupe": 3, "enterprise": 4,
    # Legacy — map to equivalent new-tier rank for upgrade comparisons
    "starter": 1, "pro": 2,
}

# ─── API Feature Map ──────────────────────────────────────────────────────────
# NOTE: This dict exists solely to serialize feature flags as {key: bool} in the
# /billing/features response. The *quota limits* (max_users, max_orgs,
# max_monthly_api_calls) are defined in app/core/plan_limits.py — that file is
# the single source of truth for enforcement. If you add/change quota values,
# update core/plan_limits.py FIRST. If feature keys here drift, update billing.py
# separately (the two dicts serve different purposes: enforcement vs. API shape).
_FREE_FEATURES = {
    "basic_reports": True, "csrd_report": False, "sfdr_report": False,
    "dpef_report": False, "carbon_report": False, "ai_narrative": False,
    "fec_import": False, "advanced_connectors": False, "materiality_matrix": True,
    "esrs_gap_analysis": False, "supply_chain_esg": False, "benchmark": False,
    "api_access": False, "data_export": False, "multi_standard": False,
    "taxonomy_alignment": False, "risk_register": False, "sso_saml": False,
}
_PME_FEATURES = {
    **_FREE_FEATURES,
    "csrd_report": True, "dpef_report": True, "carbon_report": True,
    "fec_import": True, "esrs_gap_analysis": True, "supply_chain_esg": True,
    "api_access": True, "data_export": True, "taxonomy_alignment": True,
    "risk_register": True,
}
_ETI_FEATURES = {
    **_PME_FEATURES,
    "sfdr_report": True, "ai_narrative": True, "advanced_connectors": True,
    "benchmark": True, "multi_standard": True,
}
_ALL_FEATURES = {k: True for k in _FREE_FEATURES}

PLAN_LIMITS: Dict[str, Dict] = {
    "free":     {"max_users": 3,   "max_orgs": 5,    "max_monthly_api_calls": 1_000,     "features": _FREE_FEATURES},
    "pme":      {"max_users": 15,  "max_orgs": 30,   "max_monthly_api_calls": 50_000,    "features": _PME_FEATURES},
    "eti":      {"max_users": 75,  "max_orgs": 150,  "max_monthly_api_calls": 500_000,   "features": _ETI_FEATURES},
    "groupe":   {"max_users": 300, "max_orgs": 9999, "max_monthly_api_calls": 2_000_000, "features": {**_ETI_FEATURES, "sso_saml": True}},
    "enterprise": {"max_users": 9999, "max_orgs": 9999, "max_monthly_api_calls": 9_999_999, "features": _ALL_FEATURES},
    # Legacy tiers (existing subscribers — same feature shape as new equivalents)
    "starter":  {"max_users": 10,  "max_orgs": 25,  "max_monthly_api_calls": 10_000,    "features": _PME_FEATURES},
    "pro":      {"max_users": 50,  "max_orgs": 100, "max_monthly_api_calls": 100_000,   "features": _ETI_FEATURES},
}

# Minimum plan labels per feature (for upgrade prompts in the UI)
FEATURE_MIN_PLAN: Dict[str, str] = {
    "csrd_report": "PME", "dpef_report": "PME", "carbon_report": "PME",
    "fec_import": "PME", "esrs_gap_analysis": "PME", "supply_chain_esg": "PME",
    "api_access": "PME", "data_export": "PME", "taxonomy_alignment": "PME",
    "risk_register": "PME",
    "sfdr_report": "ETI", "ai_narrative": "ETI", "advanced_connectors": "ETI",
    "benchmark": "ETI", "multi_standard": "ETI",
    "sso_saml": "Groupe",
}


@router.get("/features", summary="Feature gates du plan courant")
async def get_plan_features(
    request: Request,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Return the feature flags and limits for the current tenant's plan.

    When the trial has expired and there is no active subscription, the tenant
    is treated as 'free' regardless of the stored plan_tier (which may still
    say 'pro' from the trial period).

    Operator emails listed in ``dependencies.PLAN_BYPASS_EMAILS`` always see
    the Enterprise feature set (testing-phase override).
    """
    from app.dependencies import _user_bypasses_plan_gate as _bypass

    user_id = getattr(request.state, "user_id", None)
    if await _bypass(db, user_id):
        ent = PLAN_LIMITS["enterprise"]
        return {
            "plan_tier": "enterprise",
            "max_users": ent["max_users"],
            "max_orgs": ent["max_orgs"],
            "max_monthly_api_calls": ent["max_monthly_api_calls"],
            "features": ent["features"],
            "feature_min_plan": FEATURE_MIN_PLAN,
            "is_free": False,
            "is_trial": False,
        }

    tenant = await _get_tenant(db, tenant_id)
    tier = (tenant.plan_tier or "free").lower()

    # Enforce free-tier features when billing is not active (trial expired,
    # no paid subscription).  Enterprise is never downgraded automatically.
    effective_tier = tier
    if tier != "enterprise" and not tenant.billing_is_active:
        effective_tier = "free"

    limits = PLAN_LIMITS.get(effective_tier, PLAN_LIMITS["free"])
    return {
        "plan_tier": effective_tier,
        "max_users": limits["max_users"],
        "max_orgs": limits["max_orgs"],
        "max_monthly_api_calls": limits["max_monthly_api_calls"],
        "features": limits["features"],
        "feature_min_plan": FEATURE_MIN_PLAN,
        "is_free": effective_tier == "free",
        "is_trial": tenant.is_in_trial,
    }


@router.post("/downgrade-free", summary="Passer au plan gratuit")
async def downgrade_to_free(
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Downgrade tenant to the Free plan immediately.

    - Cancels any active Stripe subscription (non-blocking).
    - Resets plan_tier, limits, and trial fields to Free defaults.
    - Safe to call even if there is no Stripe subscription.
    """
    from app.core.plan_limits import get_limits as _get_limits
    tenant = await _get_tenant(db, tenant_id)

    # Try to cancel the Stripe subscription (non-blocking)
    sub_id = getattr(tenant, "stripe_subscription_id", None)
    if sub_id:
        try:
            import stripe as _stripe_lib
            from app.config import settings as _cfg
            _stripe_lib.api_key = getattr(_cfg, "STRIPE_SECRET_KEY", "")
            if _stripe_lib.api_key:
                _stripe_lib.Subscription.delete(sub_id)
        except Exception as exc:
            logger.warning("Could not cancel Stripe subscription during downgrade-free: %s", exc)

    # Apply Free plan limits via canonical method (single source of truth)
    tenant.stripe_subscription_id = None
    tenant.stripe_subscription_status = None
    tenant.stripe_current_period_end = None
    tenant.trial_ends_at = None  # Clear trial so banner won't show
    tenant.apply_plan_limits("free")  # sets plan_tier, max_users, max_orgs, max_monthly_api_calls, data_retention_months

    await db.commit()

    free = _get_limits("free")
    logger.info("Tenant %s downgraded to free plan.", tenant_id)
    return {
        "message": "Plan mis à jour vers Free.",
        "plan_tier": "free",
        "max_users": free["max_users"],
        "max_orgs": free["max_orgs"],
        "max_monthly_api_calls": free["max_monthly_api_calls"],
    }


@router.get("/invoices", summary="Liste des factures Stripe")
async def list_invoices(
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Return the 10 most recent invoices for this tenant."""
    tenant = await _get_tenant(db, tenant_id)
    if not tenant.stripe_customer_id:
        return []
    try:
        return _stripe().list_invoices(tenant.stripe_customer_id)
    except ValueError:
        return []
    except Exception as e:
        logger.warning("Could not fetch invoices: %s", e)
        return []
