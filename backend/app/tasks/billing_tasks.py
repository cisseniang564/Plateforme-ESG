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
    name="billing.send_trial_nurture_sequence",
    max_retries=2,
    default_retry_delay=300,
)
def send_trial_nurture_sequence() -> dict:
    """
    Onboarding nurture sequence for trialing tenants.

    Pour chaque tenant en essai actif, calcule l'âge du trial (en jours depuis
    la création du tenant) et envoie l'email correspondant si on tombe pile
    sur J+3, J+7, J+11, J+13, ou J+15. Idempotent via tenant.settings.nurture_sent
    pour éviter les doublons en cas de double exécution du cron.
    """
    from app.db.session import AsyncSessionLocal
    from app.models.tenant import Tenant
    from app.models.user import User
    from app.services.email_service import EmailService
    from sqlalchemy import select

    utc_now = datetime.now(timezone.utc)
    sent = 0
    errors = 0
    NURTURE_DAYS = {3, 7, 11, 13, 15}

    async def _run():
        nonlocal sent, errors
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Tenant).where(
                    Tenant.created_at.isnot(None),
                    Tenant.stripe_subscription_status.in_(["trialing", None, "", "expired"]),
                )
            )
            tenants = result.scalars().all()

            for tenant in tenants:
                created = tenant.created_at
                if not created:
                    continue
                if created.tzinfo is None:
                    created = created.replace(tzinfo=timezone.utc)
                age_days = (utc_now.date() - created.date()).days
                if age_days not in NURTURE_DAYS:
                    continue

                # Idempotence — skip if we already sent this stage
                settings = dict(tenant.settings or {})
                nurture_log = dict(settings.get("nurture_sent", {}))
                stage_key = f"d{age_days}"
                if nurture_log.get(stage_key):
                    continue

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
                    ok = False
                    if age_days == 3:
                        ok = EmailService.send_trial_day3(admin.email, admin.first_name or "")
                    elif age_days == 7:
                        ok = EmailService.send_trial_day7(admin.email, admin.first_name or "")
                    elif age_days == 11:
                        ok = EmailService.send_trial_day11(admin.email, admin.first_name or "")
                    elif age_days == 13:
                        ok = EmailService.send_trial_day13(admin.email, admin.first_name or "")
                    elif age_days == 15:
                        ok = EmailService.send_trial_expired(admin.email, admin.first_name or "")

                    if ok:
                        nurture_log[stage_key] = utc_now.isoformat()
                        settings["nurture_sent"] = nurture_log
                        tenant.settings = settings
                        sent += 1
                        logger.info("Nurture J+%d sent to %s (tenant=%s)", age_days, admin.email, tenant.id)
                except Exception as exc:
                    logger.warning("Nurture J+%d failed for tenant %s: %s", age_days, tenant.id, exc)
                    errors += 1

            if sent:
                await db.commit()

    _run_async(_run())
    logger.info("Nurture sequence: %d sent, %d errors", sent, errors)
    return {"sent": sent, "errors": errors}


# Kept for backwards-compat with the celery beat schedule that may still
# reference billing.send_trial_reminders. Delegates to the new nurture task.
@shared_task(
    name="billing.send_trial_reminders",
    max_retries=2,
    default_retry_delay=300,
)
def send_trial_reminders() -> dict:
    return send_trial_nurture_sequence()


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

                # Use apply_plan_limits() — canonical source of truth in core.plan_limits
                tenant.stripe_subscription_status = "expired"
                tenant.apply_plan_limits("free")
                downgraded += 1

            if downgraded:
                await db.commit()

    _run_async(_run())
    logger.info("Auto-downgrade: %d tenants downgraded", downgraded)
    return {"downgraded": downgraded}
