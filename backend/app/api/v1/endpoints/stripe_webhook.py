"""
Stripe Webhook Handler — public endpoint, signature-verified.
Must be registered BEFORE AuthMiddleware or added to PUBLIC_PATHS.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/stripe", summary="Stripe webhook (public)")
async def stripe_webhook(request: Request):
    """
    Receive and process Stripe webhook events.
    Stripe sends POST with raw body + Stripe-Signature header.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    # Import here to avoid circular imports
    from app.services.stripe_service import StripeService
    from app.services.email_service import EmailService

    try:
        event = StripeService.construct_webhook_event(payload, sig_header)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {e}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook signature invalid: {e}")

    event_type: str = event["type"]
    data: Any = event["data"]["object"]

    logger.info("Stripe webhook received: %s (id=%s)", event_type, event["id"])

    # Get DB session — must pass request so RLS context variables are set
    db_gen = get_db(request)
    db = await db_gen.__anext__()

    try:
        if event_type == "checkout.session.completed":
            await _handle_checkout_completed(db, data, EmailService)

        elif event_type == "customer.subscription.updated":
            await StripeService.sync_subscription_to_tenant(db, data["customer"], data)

        elif event_type == "customer.subscription.deleted":
            await _handle_subscription_canceled(db, data, EmailService)

        elif event_type == "customer.subscription.paused":
            await _handle_subscription_paused(db, data, EmailService)

        elif event_type == "customer.subscription.resumed":
            await _handle_subscription_resumed(db, data, EmailService)

        elif event_type == "customer.subscription.trial_will_end":
            await _handle_trial_ending(db, data, EmailService)

        elif event_type == "invoice.payment_succeeded":
            await _handle_invoice_paid(db, data, EmailService)

        elif event_type == "invoice.payment_failed":
            await _handle_payment_failed(db, data, EmailService)

    except Exception:
        logger.exception("Error processing Stripe event %s", event_type)
        # Still return 200 so Stripe doesn't retry indefinitely
    finally:
        try:
            await db_gen.aclose()
        except Exception:
            pass

    return {"received": True}


# ─── Event handlers ───────────────────────────────────────────────────────────

async def _get_tenant_user(db, customer_id: str):
    """Find tenant and first admin user by Stripe customer ID."""
    from app.models.tenant import Tenant
    from app.models.user import User

    result = await db.execute(
        select(Tenant).where(Tenant.stripe_customer_id == customer_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        return None, None

    result2 = await db.execute(
        select(User).where(User.tenant_id == tenant.id).limit(1)
    )
    user = result2.scalar_one_or_none()
    return tenant, user


async def _handle_checkout_completed(db, session, EmailService):
    """Sync subscription after successful checkout."""
    from app.services.stripe_service import StripeService
    import stripe

    customer_id = session.get("customer")
    subscription_id = session.get("subscription")
    if not customer_id or not subscription_id:
        return

    # Retrieve full subscription object
    try:
        stripe.api_key = __import__("app.config", fromlist=["settings"]).settings.__dict__.get(
            "STRIPE_SECRET_KEY", ""
        )
        sub = stripe.Subscription.retrieve(subscription_id)
        await StripeService.sync_subscription_to_tenant(db, customer_id, sub)
    except Exception as e:
        logger.warning("Could not retrieve subscription %s: %s", subscription_id, e)
        return

    tenant, user = await _get_tenant_user(db, customer_id)
    if user and tenant:
        from app.services.stripe_service import _plan_config_for_price, PLAN_CONFIGS
        price_id = ""
        try:
            price_id = sub["items"]["data"][0]["price"]["id"]
        except (KeyError, IndexError):
            pass
        config = _plan_config_for_price(price_id)
        plan_name = config["plan_tier"].capitalize()
        # Send activation email (non-blocking)
        try:
            from app.tasks.email_tasks import send_subscription_activated_email
            send_subscription_activated_email.delay(
                email=user.email,
                first_name=user.first_name or "cher client",
                plan_name=plan_name,
                amount="—",
                next_date="—",
            )
        except Exception:
            pass


async def _handle_subscription_canceled(db, subscription, EmailService):
    """Mark tenant subscription as canceled."""
    from app.models.tenant import Tenant

    customer_id = subscription.get("customer")
    tenant, user = await _get_tenant_user(db, customer_id)
    if not tenant:
        return

    tenant.stripe_subscription_status = "canceled"
    tenant.plan_tier = "free"
    tenant.max_users = 5
    tenant.max_orgs = 5
    tenant.max_monthly_api_calls = 500
    await db.commit()

    if user:
        try:
            from app.tasks.email_tasks import send_subscription_canceled_email
            cancel_at = subscription.get("canceled_at") or subscription.get("current_period_end")
            end_date = datetime.fromtimestamp(cancel_at, tz=timezone.utc).strftime("%d/%m/%Y") if cancel_at else "—"
            send_subscription_canceled_email.delay(
                email=user.email,
                first_name=user.first_name or "cher client",
                plan_name=tenant.plan_tier.capitalize(),
                end_date=end_date,
            )
        except Exception:
            pass


async def _handle_trial_ending(db, subscription, EmailService):
    """Warn user that trial ends soon."""
    customer_id = subscription.get("customer")
    _tenant, user = await _get_tenant_user(db, customer_id)
    if user:
        try:
            trial_end = subscription.get("trial_end")
            if trial_end:
                days_left = max(1, (datetime.fromtimestamp(trial_end, tz=timezone.utc) - datetime.now(timezone.utc)).days)
            else:
                days_left = 3
            from app.tasks.email_tasks import send_trial_ending_soon_email
            send_trial_ending_soon_email.delay(
                email=user.email,
                first_name=user.first_name or "cher client",
                days_left=days_left,
            )
        except Exception:
            pass


async def _handle_invoice_paid(db, invoice, EmailService):
    """Send invoice paid email."""
    customer_id = invoice.get("customer")
    _tenant, user = await _get_tenant_user(db, customer_id)
    if user:
        try:
            amount = f"{invoice.get('amount_paid', 0) / 100:.2f} {(invoice.get('currency','eur')).upper()}"
            from app.tasks.email_tasks import send_invoice_paid_email
            send_invoice_paid_email.delay(
                email=user.email,
                first_name=user.first_name or "cher client",
                amount=amount,
                invoice_url=invoice.get("invoice_pdf") or invoice.get("hosted_invoice_url") or "#",
                invoice_number=invoice.get("number") or invoice.get("id", "")[-8:].upper(),
            )
        except Exception:
            pass


async def _handle_subscription_paused(db, subscription, EmailService):
    """Mark tenant subscription as paused — access should be restricted."""
    customer_id = subscription.get("customer")
    tenant, user = await _get_tenant_user(db, customer_id)
    if not tenant:
        return

    tenant.stripe_subscription_status = "paused"
    await db.commit()

    if user:
        # No dedicated "paused" email template — log event, send canceled-like notification
        logger.info(
            "Subscription paused for tenant %s (user %s)",
            tenant.id if tenant else "?", user.email,
        )


async def _handle_subscription_resumed(db, subscription, EmailService):
    """Restore tenant subscription after pause."""
    customer_id = subscription.get("customer")
    tenant, user = await _get_tenant_user(db, customer_id)
    if not tenant:
        return

    tenant.stripe_subscription_status = "active"
    await db.commit()

    if user:
        # Reuse subscription_activated email to notify the user their access is restored
        try:
            from app.tasks.email_tasks import send_subscription_activated_email
            send_subscription_activated_email.delay(
                email=user.email,
                first_name=user.first_name or "cher client",
                plan_name=tenant.plan_tier.capitalize(),
                amount="—",
                next_date="—",
            )
        except Exception:
            pass


async def _handle_payment_failed(db, invoice, EmailService):
    """Send payment failed email and update tenant status."""
    from app.models.tenant import Tenant

    customer_id = invoice.get("customer")
    tenant, user = await _get_tenant_user(db, customer_id)

    if tenant:
        tenant.stripe_subscription_status = "past_due"
        await db.commit()

    if user:
        try:
            amount = f"{invoice.get('amount_due', 0) / 100:.2f} {(invoice.get('currency','eur')).upper()}"
            next_attempt = invoice.get("next_payment_attempt")
            retry_date = (
                datetime.fromtimestamp(next_attempt, tz=timezone.utc).strftime("%d/%m/%Y")
                if next_attempt else None
            )
            from app.tasks.email_tasks import send_payment_failed_email
            send_payment_failed_email.delay(
                email=user.email,
                first_name=user.first_name or "cher client",
                amount=amount,
                retry_date=retry_date,
            )
        except Exception:
            pass
