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
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Return current subscription info for the authenticated tenant."""
    tenant = await _get_tenant(db, tenant_id)
    return {
        "plan_tier": tenant.plan_tier,
        "status": getattr(tenant, "stripe_subscription_status", None) or "active",
        "stripe_subscription_id": getattr(tenant, "stripe_subscription_id", None),
        "stripe_customer_id": tenant.stripe_customer_id,
        "current_period_end": getattr(tenant, "stripe_current_period_end", None),
        "trial_ends_at": getattr(tenant, "trial_ends_at", None),
        "max_users": tenant.max_users,
        "max_orgs": tenant.max_orgs,
        "max_monthly_api_calls": tenant.max_monthly_api_calls,
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
# Tiers in ascending order: free < starter < pro < enterprise
_TIER_ORDER = {"free": 0, "starter": 1, "pro": 2, "enterprise": 3}

PLAN_LIMITS: Dict[str, Dict] = {
    "free": {
        "max_users": 3,
        "max_orgs": 5,
        "max_monthly_api_calls": 1_000,
        "features": {
            "basic_reports": True,
            "csrd_report": False,
            "sfdr_report": False,
            "dpef_report": False,
            "carbon_report": False,
            "ai_narrative": False,
            "fec_import": False,
            "advanced_connectors": False,
            "materiality_matrix": True,
            "esrs_gap_analysis": False,
            "supply_chain_esg": False,
            "benchmark": False,
            "api_access": False,
            "data_export": False,
            "multi_standard": False,
        },
    },
    "starter": {
        "max_users": 10,
        "max_orgs": 25,
        "max_monthly_api_calls": 10_000,
        "features": {
            "basic_reports": True,
            "csrd_report": True,
            "sfdr_report": False,
            "dpef_report": True,
            "carbon_report": True,
            "ai_narrative": False,
            "fec_import": True,
            "advanced_connectors": False,
            "materiality_matrix": True,
            "esrs_gap_analysis": True,
            "supply_chain_esg": True,
            "benchmark": False,
            "api_access": True,
            "data_export": True,
            "multi_standard": False,
        },
    },
    "pro": {
        "max_users": 50,
        "max_orgs": 100,
        "max_monthly_api_calls": 100_000,
        "features": {
            "basic_reports": True,
            "csrd_report": True,
            "sfdr_report": True,
            "dpef_report": True,
            "carbon_report": True,
            "ai_narrative": True,
            "fec_import": True,
            "advanced_connectors": True,
            "materiality_matrix": True,
            "esrs_gap_analysis": True,
            "supply_chain_esg": True,
            "benchmark": True,
            "api_access": True,
            "data_export": True,
            "multi_standard": True,
        },
    },
    "enterprise": {
        "max_users": 9999,
        "max_orgs": 9999,
        "max_monthly_api_calls": 9_999_999,
        "features": {k: True for k in [
            "basic_reports", "csrd_report", "sfdr_report", "dpef_report", "carbon_report",
            "ai_narrative", "fec_import", "advanced_connectors", "materiality_matrix",
            "esrs_gap_analysis", "supply_chain_esg", "benchmark", "api_access",
            "data_export", "multi_standard",
        ]},
    },
}

# Minimum plan labels per feature (for upgrade prompts)
FEATURE_MIN_PLAN: Dict[str, str] = {
    "csrd_report": "Starter",
    "sfdr_report": "Pro",
    "dpef_report": "Starter",
    "carbon_report": "Starter",
    "ai_narrative": "Pro",
    "fec_import": "Starter",
    "advanced_connectors": "Pro",
    "esrs_gap_analysis": "Starter",
    "supply_chain_esg": "Starter",
    "benchmark": "Pro",
    "api_access": "Starter",
    "data_export": "Starter",
    "multi_standard": "Pro",
}


@router.get("/features", summary="Feature gates du plan courant")
async def get_plan_features(
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Return the feature flags and limits for the current tenant's plan."""
    tenant = await _get_tenant(db, tenant_id)
    tier = (tenant.plan_tier or "free").lower()
    limits = PLAN_LIMITS.get(tier, PLAN_LIMITS["free"])
    return {
        "plan_tier": tier,
        "max_users": tenant.max_users or limits["max_users"],
        "max_orgs": tenant.max_orgs or limits["max_orgs"],
        "max_monthly_api_calls": tenant.max_monthly_api_calls or limits["max_monthly_api_calls"],
        "features": limits["features"],
        "feature_min_plan": FEATURE_MIN_PLAN,
        "is_free": tier == "free",
        "is_trial": tenant.is_in_trial,
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
