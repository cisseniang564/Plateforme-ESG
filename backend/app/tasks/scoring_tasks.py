"""
Scoring tasks — background ESG score recalculation.
"""
from __future__ import annotations

import asyncio
import logging

from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


def _run_async(coro):
    """Run an async coroutine from a sync Celery task."""
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
    name="scoring.calculate_org",
    bind=True,
    max_retries=2,
    soft_time_limit=60,
    time_limit=90,
)
def calculate_org_score(self, org_id: str, tenant_id: str) -> dict:
    """Recalculate ESG score for a single organisation."""
    from app.db.session import AsyncSessionLocal
    from app.services.esg_scoring_engine import ESGScoringEngine
    from uuid import UUID

    logger.info("Scoring org %s (tenant %s)", org_id, tenant_id)

    async def _run():
        async with AsyncSessionLocal() as db:
            engine = ESGScoringEngine(db)
            result = await engine.calculate_score(
                organization_id=UUID(org_id),
                tenant_id=UUID(tenant_id),
            )
            return result

    try:
        score = _run_async(_run())
        logger.info("Org %s scored: %.2f", org_id, score.get("overall_score", 0))
        return score
    except Exception as exc:
        logger.error("Scoring failed for org %s: %s", org_id, exc)
        raise self.retry(exc=exc, countdown=30)


@shared_task(
    name="scoring.refresh_all_scores",
    soft_time_limit=600,
    time_limit=720,
)
def refresh_all_scores() -> dict:
    """Nightly: recalculate scores for all active organisations across all tenants."""
    from app.db.session import AsyncSessionLocal
    from app.services.esg_scoring_engine import ESGScoringEngine
    from app.models.organization import Organization
    from sqlalchemy import select

    logger.info("Starting nightly score refresh")

    async def _run():
        updated = 0
        errors = 0
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Organization).where(Organization.is_active == True))  # noqa: E712
            orgs = result.scalars().all()
            engine = ESGScoringEngine(db)
            for org in orgs:
                try:
                    await engine.calculate_score(
                        organization_id=org.id,
                        tenant_id=org.tenant_id,
                    )
                    updated += 1
                except Exception as e:
                    logger.warning("Skipping org %s: %s", org.id, e)
                    errors += 1
        return {"updated": updated, "errors": errors, "total": updated + errors}

    stats = _run_async(_run())
    logger.info("Nightly score refresh done: %s", stats)
    return stats


@shared_task(name="scoring.cleanup_stale_results")
def cleanup_stale_results() -> int:
    """Weekly: delete ESGScore records older than 2 years to keep DB lean."""
    from app.db.session import AsyncSessionLocal
    from app.models.esg_score import ESGScore
    from sqlalchemy import delete
    from datetime import datetime, timedelta

    cutoff = datetime.utcnow() - timedelta(days=730)

    async def _run():
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                delete(ESGScore).where(ESGScore.created_at < cutoff)
            )
            await db.commit()
            return result.rowcount

    deleted = _run_async(_run())
    logger.info("Cleanup: deleted %d stale ESGScore records (older than %s)", deleted, cutoff.date())
    return deleted
