"""
Celery tasks for proactive notifications.

Scheduled via beat in app.tasks.celery_app:
  * daily-deadline-scan      → 07:00 UTC
  * weekly-missing-data-scan → Monday 08:00 UTC
"""
from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _async_scan_deadlines() -> dict:
    """Iterate all active tenants and create deadline notifications."""
    from app.db.session import AsyncSessionLocal
    from app.models.tenant import Tenant
    from app.services.notification_service import generate_deadline_notifications

    total_created = 0
    tenants_scanned = 0

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Tenant.id).where(Tenant.status == "active")
        )
        tenant_ids = [row[0] for row in result.all()]

    for tenant_id in tenant_ids:
        try:
            async with AsyncSessionLocal() as db:
                created = await generate_deadline_notifications(db, tenant_id)
                total_created += created
                tenants_scanned += 1
        except Exception as exc:
            logger.error(
                "Deadline scan failed for tenant %s: %s", tenant_id, exc, exc_info=True
            )

    return {"tenants_scanned": tenants_scanned, "notifications_created": total_created}


async def _async_scan_missing_data() -> dict:
    """Create one rolling missing-data notification per active tenant."""
    from app.db.session import AsyncSessionLocal
    from app.models.tenant import Tenant
    from app.services.notification_service import generate_missing_data_notifications

    total_created = 0
    tenants_scanned = 0

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Tenant.id).where(Tenant.status == "active")
        )
        tenant_ids = [row[0] for row in result.all()]

    for tenant_id in tenant_ids:
        try:
            async with AsyncSessionLocal() as db:
                created = await generate_missing_data_notifications(db, tenant_id)
                total_created += created
                tenants_scanned += 1
        except Exception as exc:
            logger.error(
                "Missing-data scan failed for tenant %s: %s", tenant_id, exc, exc_info=True
            )

    return {"tenants_scanned": tenants_scanned, "notifications_created": total_created}


# ─── Celery wrappers ────────────────────────────────────────────────────────


@celery_app.task(name="notifications.scan_deadlines")
def scan_deadlines() -> dict:
    """Scan compliance deadlines for all tenants. Runs daily at 07:00 UTC."""
    return asyncio.run(_async_scan_deadlines())


@celery_app.task(name="notifications.scan_missing_data")
def scan_missing_data() -> dict:
    """Scan CSRD missing required datapoints. Runs weekly Monday 08:00 UTC."""
    return asyncio.run(_async_scan_missing_data())


@celery_app.task(name="notifications.test")
def test_notification(tenant_id: str) -> dict:
    """Smoke-test: create a notification for the given tenant_id."""
    async def _run():
        from app.db.session import AsyncSessionLocal
        from app.services.notification_service import NotificationService
        async with AsyncSessionLocal() as db:
            service = NotificationService(db)
            n = await service.create(
                tenant_id=UUID(tenant_id),
                type="system",
                priority="low",
                title="Test notification",
                body="Ceci est une notification de test depuis Celery.",
                link="/app",
                dedupe_key="test:smoke",
            )
            return {"created": n is not None, "id": str(n.id) if n else None}
    return asyncio.run(_run())
