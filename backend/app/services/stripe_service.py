"""
Stripe Billing Service — subscriptions, checkout, portal, webhooks.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

import stripe
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models.tenant import Tenant

logger = logging.getLogger(__name__)

# ─── Plan limits map (keyed by price ID env var name for readability) ──────────
PLAN_CONFIGS: Dict[str, Dict[str, Any]] = {
    "starter": {
        "plan_tier": "starter",
        "max_users": 10,
        "max_orgs": 20,
        "max_monthly_api_calls": 1_000,
        "data_retention_months": 12,
    },
    "pro": {
        "plan_tier": "pro",
        "max_users": 50,
        "max_orgs": 100,
        "max_monthly_api_calls": 10_000,
        "data_retention_months": 36,
    },
    "enterprise": {
        "plan_tier": "enterprise",
        "max_users": -1,
        "max_orgs": -1,
        "max_monthly_api_calls": -1,
        "data_retention_months": 84,
    },
}


def _get_stripe():
    """Initialize Stripe with secret key (lazy, graceful if not configured)."""
    key = getattr(settings, "STRIPE_SECRET_KEY", None)
    if not key or key.startswith("sk_test_REPLACE"):
        raise ValueError("Stripe not configured: set STRIPE_SECRET_KEY in .env")
    stripe.api_key = key
    return stripe


def _plan_config_for_price(price_id: str) -> Dict[str, Any]:
    """Return plan config based on Stripe price ID."""
    mapping = {
        getattr(settings, "STRIPE_PRICE_STARTER_MONTHLY", ""): PLAN_CONFIGS["starter"],
        getattr(settings, "STRIPE_PRICE_STARTER_YEARLY", ""): PLAN_CONFIGS["starter"],
        getattr(settings, "STRIPE_PRICE_PRO_MONTHLY", ""): PLAN_CONFIGS["pro"],
        getattr(settings, "STRIPE_PRICE_PRO_YEARLY", ""): PLAN_CONFIGS["pro"],
    }
    return mapping.get(price_id, PLAN_CONFIGS["starter"])


class StripeService:
    """All Stripe API interactions."""

    # ── Customer ──────────────────────────────────────────────────────────────

    @staticmethod
    def create_customer(email: str, name: str, tenant_id: str) -> str:
        """Create a Stripe customer and return the customer ID."""
        s = _get_stripe()
        customer = s.Customer.create(
            email=email,
            name=name,
            metadata={"tenant_id": tenant_id},
        )
        return customer.id

    # ── Checkout ──────────────────────────────────────────────────────────────

    @staticmethod
    def create_checkout_session(
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        trial_days: int = 0,
    ) -> str:
        """Create a Stripe Checkout Session and return the URL."""
        s = _get_stripe()
        params: Dict[str, Any] = {
            "customer": customer_id,
            "mode": "subscription",
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": success_url,
            "cancel_url": cancel_url,
            "allow_promotion_codes": True,
            "billing_address_collection": "auto",
        }
        if trial_days > 0:
            params["subscription_data"] = {"trial_period_days": trial_days}
        session = s.checkout.Session.create(**params)
        return session.url

    # ── Customer Portal ───────────────────────────────────────────────────────

    @staticmethod
    def create_portal_session(customer_id: str, return_url: str) -> str:
        """Create a Stripe Customer Portal Session and return the URL."""
        s = _get_stripe()
        session = s.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return session.url

    # ── Subscription management ───────────────────────────────────────────────

    @staticmethod
    def cancel_subscription(subscription_id: str) -> Dict[str, Any]:
        """Cancel subscription at end of current period."""
        s = _get_stripe()
        sub = s.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True,
        )
        return {"status": sub.status, "cancel_at": sub.cancel_at}

    @staticmethod
    def reactivate_subscription(subscription_id: str) -> Dict[str, Any]:
        """Re-enable a subscription that was set to cancel."""
        s = _get_stripe()
        sub = s.Subscription.modify(
            subscription_id,
            cancel_at_period_end=False,
        )
        return {"status": sub.status}

    # ── Plan change (upgrade / downgrade) ────────────────────────────────────

    @staticmethod
    def change_plan(
        subscription_id: str,
        new_price_id: str,
        proration_behavior: str = "create_prorations",
    ) -> Dict[str, Any]:
        """
        Upgrade or downgrade a subscription to a new price.
        - proration_behavior="create_prorations" → charge/credit immediately (upgrades)
        - proration_behavior="none"              → change takes effect at next period (downgrades)
        - proration_behavior="always_invoice"    → immediately invoice the prorated amount
        """
        s = _get_stripe()
        sub = s.Subscription.retrieve(subscription_id)
        # Get the current subscription item ID to replace
        item_id = sub["items"]["data"][0]["id"]
        updated = s.Subscription.modify(
            subscription_id,
            items=[{"id": item_id, "price": new_price_id}],
            proration_behavior=proration_behavior,
        )
        return {
            "status": updated.status,
            "plan": updated["items"]["data"][0]["price"]["id"],
            "current_period_end": updated.current_period_end,
        }

    # ── Invoices ──────────────────────────────────────────────────────────────

    @staticmethod
    def list_invoices(customer_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Return recent invoices for a customer."""
        s = _get_stripe()
        invoices = s.Invoice.list(customer=customer_id, limit=limit)
        return [
            {
                "id": inv.id,
                "number": inv.number or f"INV-{inv.id[-8:].upper()}",
                "amount_paid": inv.amount_paid / 100,
                "currency": inv.currency.upper(),
                "status": inv.status,
                "created": inv.created,
                "pdf_url": inv.invoice_pdf,
                "hosted_url": inv.hosted_invoice_url,
            }
            for inv in invoices.data
        ]

    # ── Webhook ───────────────────────────────────────────────────────────────

    @staticmethod
    def construct_webhook_event(payload: bytes, sig_header: str) -> Any:
        """Validate Stripe signature and return event object."""
        s = _get_stripe()
        secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", "")
        return s.Webhook.construct_event(payload, sig_header, secret)

    # ── DB sync helpers ───────────────────────────────────────────────────────

    @staticmethod
    async def sync_subscription_to_tenant(
        db: AsyncSession,
        stripe_customer_id: str,
        subscription: Any,
    ) -> None:
        """Update tenant DB row from a Stripe subscription object."""
        from datetime import datetime, timezone

        result = await db.execute(
            select(Tenant).where(Tenant.stripe_customer_id == stripe_customer_id)
        )
        tenant = result.scalar_one_or_none()
        if not tenant:
            logger.warning("No tenant found for Stripe customer %s", stripe_customer_id)
            return

        # Determine plan from subscription items
        price_id = ""
        try:
            price_id = subscription["items"]["data"][0]["price"]["id"]
        except (KeyError, IndexError):
            pass

        config = _plan_config_for_price(price_id)

        tenant.stripe_subscription_id = subscription["id"]
        tenant.stripe_subscription_status = subscription["status"]
        tenant.plan_tier = config["plan_tier"]
        tenant.max_users = config["max_users"]
        tenant.max_orgs = config["max_orgs"]
        tenant.max_monthly_api_calls = config["max_monthly_api_calls"]
        tenant.data_retention_months = config["data_retention_months"]

        ped = subscription.get("current_period_end")
        if ped:
            tenant.stripe_current_period_end = datetime.fromtimestamp(ped, tz=timezone.utc)

        await db.commit()
        logger.info("Synced subscription %s → tenant %s (plan=%s)", subscription["id"], tenant.id, config["plan_tier"])
