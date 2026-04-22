"""
Billing tasks — trial expiry reminders & subscription enforcement.

Runs nightly via Celery Beat:
  - Send trial-ending-soon emails (7 days, 3 days, 1 day before expiry)
  - Auto-downgrade expired tenants to free plan
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


def _run_async(coro):
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError("closed")
        return loop.run_until_complete(coro)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()


@shared_task(
    name="billing.send_trial_reminders",
    max_retries=2,
    default_retry_delay=300,
)
def send_trial_reminders() -> dict:
    """
    For each tenant whose trial ends in exactly 7, 3, or 1 day,
    send a reminder email to the tenant admin.
    """
    from app.db.session import AsyncSessionLocal
    from app.models.tenant import Tenant
    from app.models.user import User
    from app.tasks.email_tasks import send_trial_ending_soon_email
    from sqlalchemy import select

    utc_now = datetime.now(timezone.utc)
    sent = 0
    errors = 0

    async def _run():
        nonlocal sent, errors
        async with AsyncSessionLocal() as db:
            # Load all trialing tenants
            result = await db.execute(
                select(Tenant).where(
                    Tenant.trial_ends_at.isnot(None),
                    Tenant.stripe_subscription_status.in_(["trialing", None, ""]),
                )
            )
            tenants = result.scalars().all()

            for tenant in tenants:
                if not tenant.trial_ends_at:
                    continue
                ends_at = tenant.trial_ends_at
                if ends_at.tzinfo is None:
                    ends_at = ends_at.replace(tzinfo=timezone.utc)

                delta_days = (ends_at.date() - utc_now.date()).days
                if delta_days not in (7, 3, 1):
                    continue  # Only send on specific days

                # Find admin user for this tenant
                admin_result = await db.execute(
                    select(User).where(
                        User.tenant_id == tenant.id,
                        User.is_active == True,  # noqa: E712
                    ).limit(1)
                )
                admin = admin_result.scalar_one_or_none()
                if not admin:
                    continue

                try:
                    send_trial_ending_soon_email.delay(
                        email=admin.email,
                        first_name=admin.first_name or "",
                        days_left=delta_days,
                    )
                    sent += 1
                    logger.info(
                        "Trial reminder queued for tenant %s (%s), %d days left",
                        tenant.id, admin.email, delta_days,
                    )
                except Exception as exc:
                    logger.warning("Failed to queue reminder for tenant %s: %s", tenant.id, exc)
                    errors += 1

    _run_async(_run())
    logger.info("Trial reminders: %d queued, %d errors", sent, errors)
    return {"sent": sent, "errors": errors}


@shared_task(
    name="billing.downgrade_expired_trials",
    max_retries=2,
    default_retry_delay=300,
)
def downgrade_expired_trials() -> dict:
    """
    Auto-downgrade tenants whose trial expired more than 24h ago
    and have no active Stripe subscription.
    Sets plan_tier='free', resets limits, sets stripe_subscription_status='expired'.
    """
    from app.db.session import AsyncSessionLocal
    from app.models.tenant import Tenant
    from sqlalchemy import select

    utc_now = datetime.now(timezone.utc)
    grace_cutoff = utc_now - timedelta(hours=24)  # 24h grace after trial ends
    downgraded = 0

    async def _run():
        nonlocal downgraded
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Tenant).where(
                    Tenant.trial_ends_at.isnot(None),
                    Tenant.trial_ends_at < grace_cutoff,
                    Tenant.stripe_subscription_status.notin_(["active", "past_due"]),
                    Tenant.plan_tier != "enterprise",
                )
            )
            tenants = result.scalars().all()

            for tenant in tenants:
                if tenant.plan_tier == "free" and tenant.stripe_subscription_status == "expired":
                    continue  # Already downgraded

                logger.info("Auto-downgrading tenant %s (trial ended %s)", tenant.id, tenant.trial_ends_at)
                tenant.plan_tier = "free"
                tenant.stripe_subscription_status = "expired"
                # Reset to free-tier limits
                tenant.max_users = 3
                tenant.max_orgs = 1
                tenant.max_monthly_api_calls = 100
                tenant.data_retention_months = 6
                downgraded += 1

            if downgraded:
                await db.commit()

    _run_async(_run())
    logger.info("Auto-downgrade: %d tenants downgraded", downgraded)
    return {"downgraded": downgraded}
