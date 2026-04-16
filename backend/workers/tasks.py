"""
Celery tasks — data retention, email reminders, API usage reports.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from celery import shared_task
from sqlalchemy import delete, select, text, and_
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def _sync_session():
    """Return a synchronous SQLAlchemy session for Celery tasks."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.config import settings

    # Use sync URL (replace asyncpg with psycopg2)
    url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(url, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


def _redis_client():
    import redis as _redis
    from app.config import settings
    return _redis.from_url(settings.REDIS_URL, decode_responses=True)


# ─── 1. Data Retention Tasks ──────────────────────────────────────────────────

@shared_task(name="workers.tasks.cleanup_old_esg_scores", bind=True, max_retries=3)
def cleanup_old_esg_scores(self, retention_days: int = 730):
    """
    Delete ESG scores older than `retention_days` (default 2 years).
    Respects tenant-level retention settings if present.
    """
    from app.models.esg_score import ESGScore
    from app.models.tenant import Tenant

    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    deleted_total = 0

    try:
        db: Session = _sync_session()
        try:
            tenants = db.execute(select(Tenant).where(Tenant.is_active == True)).scalars().all()
            for tenant in tenants:
                # Tenant may override retention period via settings JSON
                tenant_retention = (tenant.settings or {}).get("data_retention_days", retention_days)
                tenant_cutoff = datetime.now(timezone.utc) - timedelta(days=tenant_retention)

                result = db.execute(
                    delete(ESGScore).where(
                        and_(
                            ESGScore.tenant_id == tenant.id,
                            ESGScore.created_at < tenant_cutoff,
                        )
                    )
                )
                count = result.rowcount
                if count:
                    logger.info("Deleted %d old ESG scores for tenant %s", count, tenant.id)
                    deleted_total += count

            db.commit()
        finally:
            db.close()
    except Exception as exc:
        logger.error("cleanup_old_esg_scores failed: %s", exc)
        raise self.retry(exc=exc, countdown=300)

    return {"deleted_scores": deleted_total, "cutoff_days": retention_days}


@shared_task(name="workers.tasks.cleanup_audit_logs", bind=True, max_retries=3)
def cleanup_audit_logs(self, retention_days: int = 90):
    """Delete audit log entries older than `retention_days` (default 90 days)."""
    from app.models.audit_log import AuditLog

    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)

    try:
        db: Session = _sync_session()
        try:
            result = db.execute(
                delete(AuditLog).where(AuditLog.created_at < cutoff)
            )
            count = result.rowcount
            db.commit()
            logger.info("Deleted %d audit log entries older than %d days", count, retention_days)
        finally:
            db.close()
    except Exception as exc:
        logger.error("cleanup_audit_logs failed: %s", exc)
        raise self.retry(exc=exc, countdown=300)

    return {"deleted_audit_logs": count, "cutoff_days": retention_days}


@shared_task(name="workers.tasks.cleanup_soft_deleted_records", bind=True, max_retries=3)
def cleanup_soft_deleted_records(self, grace_days: int = 30):
    """
    Permanently delete records that were soft-deleted more than `grace_days` ago.
    Covers: Organizations, Users, Indicators, IndicatorData.
    """
    from app.models.organization import Organization
    from app.models.user import User
    from app.models.indicator import Indicator
    from app.models.indicator_data import IndicatorData

    cutoff = datetime.now(timezone.utc) - timedelta(days=grace_days)
    report = {}

    try:
        db: Session = _sync_session()
        try:
            for Model, label in [
                (IndicatorData, "indicator_data"),
                (Indicator, "indicators"),
                (Organization, "organizations"),
                (User, "users"),
            ]:
                if not hasattr(Model, "deleted_at"):
                    continue
                result = db.execute(
                    delete(Model).where(
                        and_(Model.deleted_at != None, Model.deleted_at < cutoff)
                    )
                )
                count = result.rowcount
                if count:
                    logger.info("Hard-deleted %d %s (grace period expired)", count, label)
                report[label] = count

            db.commit()
        finally:
            db.close()
    except Exception as exc:
        logger.error("cleanup_soft_deleted_records failed: %s", exc)
        raise self.retry(exc=exc, countdown=300)

    return {"purged": report, "grace_days": grace_days}


@shared_task(name="workers.tasks.cleanup_expired_verification_tokens")
def cleanup_expired_verification_tokens():
    """
    Remove expired email-verification token keys from Redis (pattern: email_verify:*).
    Python-jose handles expiry at decode time; this just cleans up any manually stored keys.
    """
    try:
        r = _redis_client()
        keys = r.keys("email_verify:*")
        if keys:
            r.delete(*keys)
            logger.info("Cleaned up %d expired verification token keys", len(keys))
        return {"cleaned_keys": len(keys)}
    except Exception as exc:
        logger.warning("cleanup_expired_verification_tokens failed: %s", exc)
        return {"error": str(exc)}


# ─── 2. Trial Reminder Task ───────────────────────────────────────────────────

@shared_task(name="workers.tasks.send_trial_ending_reminders")
def send_trial_ending_reminders():
    """
    Send trial-ending reminder emails to tenants whose trial ends in 3 or 7 days.
    """
    from app.models.tenant import Tenant
    from app.services.email_service import EmailService

    now = datetime.now(timezone.utc)
    reminders_sent = 0

    try:
        db: Session = _sync_session()
        try:
            tenants = db.execute(
                select(Tenant).where(
                    and_(
                        Tenant.trial_ends_at != None,
                        Tenant.plan_tier == "free",
                        Tenant.is_active == True,
                    )
                )
            ).scalars().all()

            for tenant in tenants:
                days_left = (tenant.trial_ends_at - now).days
                if days_left in (3, 7):
                    # Get first admin user
                    from app.models.user import User
                    admin = db.execute(
                        select(User).where(
                            and_(User.tenant_id == tenant.id, User.is_active == True)
                        ).order_by(User.created_at)
                    ).scalar_one_or_none()

                    if admin:
                        EmailService.send_trial_ending_soon(
                            email=admin.email,
                            first_name=admin.first_name or "là",
                            days_left=days_left,
                        )
                        reminders_sent += 1
                        logger.info("Trial reminder sent to %s (%d days left)", admin.email, days_left)
        finally:
            db.close()
    except Exception as exc:
        logger.error("send_trial_ending_reminders failed: %s", exc)

    return {"reminders_sent": reminders_sent}


# ─── 3. API Usage Report Task ─────────────────────────────────────────────────

@shared_task(name="workers.tasks.generate_monthly_api_usage_report")
def generate_monthly_api_usage_report():
    """
    Aggregate previous month's API usage from Redis counters into a summary log.
    Keys pattern: api:usage:{tenant_id}:{YYYY-MM-DD}
    """
    from app.models.tenant import Tenant

    now = datetime.now(timezone.utc)
    last_month = (now.replace(day=1) - timedelta(days=1))
    month_prefix = last_month.strftime("%Y-%m")

    report = []

    try:
        r = _redis_client()
        db: Session = _sync_session()
        try:
            tenants = db.execute(select(Tenant).where(Tenant.is_active == True)).scalars().all()
            for tenant in tenants:
                pattern = f"api:usage:{tenant.id}:{month_prefix}-*"
                keys = r.keys(pattern)
                total = sum(int(r.get(k) or 0) for k in keys)
                if total:
                    report.append({"tenant_id": str(tenant.id), "month": month_prefix, "total_calls": total})
                    logger.info("Tenant %s — %d API calls in %s", tenant.id, total, month_prefix)
        finally:
            db.close()
    except Exception as exc:
        logger.error("generate_monthly_api_usage_report failed: %s", exc)
        return {"error": str(exc)}

    return {"month": month_prefix, "tenants": len(report), "report": report}
