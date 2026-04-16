"""
API Usage stats endpoint — returns Redis counters for the authenticated tenant.
GET /api/usage/daily?days=30
GET /api/usage/hourly?date=2026-03-31
GET /api/usage/summary
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query

from app.config import settings
from app.dependencies import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/usage", tags=["api-usage"])


def _redis():
    import redis as _redis
    return _redis.from_url(settings.REDIS_URL, decode_responses=True)


@router.get("/daily", summary="Daily API call counts (last N days)")
async def get_daily_usage(
    days: int = Query(30, ge=1, le=90),
    current_user: User = Depends(get_current_user),
):
    tenant_id = str(current_user.tenant_id)
    now = datetime.now(timezone.utc)
    result = []

    try:
        r = _redis()
        for i in range(days):
            d = now - timedelta(days=i)
            date_str = d.strftime("%Y-%m-%d")
            key = f"api:usage:{tenant_id}:{date_str}"
            val = r.get(key)
            result.append({"date": date_str, "calls": int(val or 0)})
    except Exception as exc:
        logger.warning("get_daily_usage failed: %s", exc)

    result.reverse()  # chronological order
    return {"tenant_id": tenant_id, "days": days, "data": result}


@router.get("/hourly", summary="Hourly API call counts for a given date")
async def get_hourly_usage(
    date: str = Query(None, description="YYYY-MM-DD (defaults to today)"),
    current_user: User = Depends(get_current_user),
):
    tenant_id = str(current_user.tenant_id)
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    result = []
    try:
        r = _redis()
        for hour in range(24):
            key = f"api:usage:{tenant_id}:{date}:h{hour:02d}"
            val = r.get(key)
            result.append({"hour": f"{hour:02d}:00", "calls": int(val or 0)})
    except Exception as exc:
        logger.warning("get_hourly_usage failed: %s", exc)

    return {"tenant_id": tenant_id, "date": date, "data": result}


@router.get("/summary", summary="Current month & today usage summary")
async def get_usage_summary(
    current_user: User = Depends(get_current_user),
):
    tenant_id = str(current_user.tenant_id)
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")
    month_prefix = now.strftime("%Y-%m")

    today_calls = 0
    month_calls = 0

    try:
        r = _redis()
        today_calls = int(r.get(f"api:usage:{tenant_id}:{today_str}") or 0)

        # Sum all daily keys for current month
        keys = r.keys(f"api:usage:{tenant_id}:{month_prefix}-*")
        # Filter out hourly keys
        daily_keys = [k for k in keys if ":h" not in k]
        if daily_keys:
            month_calls = sum(int(r.get(k) or 0) for k in daily_keys)
    except Exception as exc:
        logger.warning("get_usage_summary failed: %s", exc)

    # Get plan limit from tenant
    from sqlalchemy import select
    from app.db.session import AsyncSessionLocal
    from app.models.tenant import Tenant

    plan_limit = None
    try:
        async with AsyncSessionLocal() as db:
            tenant = (await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))).scalar_one_or_none()
            if tenant:
                plan_limit = tenant.max_api_calls
    except Exception:
        pass

    return {
        "tenant_id": tenant_id,
        "today": {"date": today_str, "calls": today_calls},
        "current_month": {"month": month_prefix, "calls": month_calls, "limit": plan_limit},
        "usage_pct": round(month_calls / plan_limit * 100, 1) if plan_limit else None,
    }
