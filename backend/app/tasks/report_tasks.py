"""
Report tasks — background report generation.
Long-running PDF/Excel/Word exports run here so they don't block API workers.
"""
from __future__ import annotations

import logging
from typing import Optional
from uuid import UUID

from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


@shared_task(
    name="reports.generate",
    bind=True,
    max_retries=2,
    soft_time_limit=120,   # 2 min warning
    time_limit=180,        # 3 min hard kill
)
def generate_report_async(
    self,
    tenant_id: str,
    org_id: Optional[str],
    report_type: str,
    period: str,
    year: Optional[int],
    fmt: str,
    user_id: str,
) -> dict:
    """
    Generate a report in background and store result in Redis.

    Returns {"status": "done", "key": "<redis_key>", "filename": "<name>"}
    so the API can serve it when the client polls /reports/result/<task_id>.
    """
    import io
    import asyncio
    from app.db.session import AsyncSessionLocal
    from app.services.report_service import ReportService

    logger.info(
        "Generating %s report (format=%s, org=%s, year=%s)",
        report_type, fmt, org_id, year,
    )

    async def _run():
        async with AsyncSessionLocal() as db:
            svc = ReportService(db)
            buf: io.BytesIO = await svc.generate(
                report_type=report_type,
                org_id=UUID(org_id) if org_id else None,
                tenant_id=UUID(tenant_id),
                period=period,
                year=year,
                fmt=fmt,
            )
            return buf.getvalue()

    try:
        content = asyncio.get_event_loop().run_until_complete(_run())
    except RuntimeError:
        # No event loop in Celery worker thread — create a new one
        loop = asyncio.new_event_loop()
        content = loop.run_until_complete(_run())
        loop.close()

    # Cache result in Redis for 1 hour
    try:
        import redis as _redis
        from app.config import settings
        redis_url = str(settings.REDIS_URL) if settings.REDIS_URL else "redis://redis:6379/0"
        r = _redis.from_url(redis_url)
        redis_key = f"report:{self.request.id}"
        r.setex(redis_key, 3600, content)
        logger.info("Report cached at key %s (%d bytes)", redis_key, len(content))
        return {"status": "done", "key": redis_key, "size": len(content)}
    except Exception as e:
        logger.error("Could not cache report result: %s", e)
        return {"status": "error", "message": str(e)}


@shared_task(name="reports.cleanup_old")
def cleanup_old_reports() -> int:
    """Delete report cache keys older than 24 h (belt-and-suspenders beyond Redis TTL)."""
    try:
        import redis as _redis
        from app.config import settings
        redis_url = str(settings.REDIS_URL) if settings.REDIS_URL else "redis://redis:6379/0"
        r = _redis.from_url(redis_url)
        keys = r.keys("report:*")
        count = 0
        for key in keys:
            ttl = r.ttl(key)
            if ttl < 0:  # no TTL set — delete
                r.delete(key)
                count += 1
        logger.info("Cleaned up %d stale report keys", count)
        return count
    except Exception as e:
        logger.error("Report cleanup failed: %s", e)
        return 0
