"""
Public status endpoint — health check of all subsystems for the status page.

NEVER requires auth (must be reachable when the platform is degraded).
NEVER leaks tenant-scoped data.

Returns:
    {
      "status": "operational" | "degraded" | "outage",
      "checks": {
        "api":   { "status": "up", "latency_ms": 2 },
        "db":    { "status": "up", "latency_ms": 5 },
        "redis": { "status": "up", "latency_ms": 1 }
      },
      "version": "0.1.0",
      "timestamp": "2026-05-19T17:00:00Z"
    }
"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter()


async def _check_db(timeout: float = 3.0) -> Dict[str, Any]:
    """Single-shot health probe against PostgreSQL."""
    from app.db.session import AsyncSessionLocal
    from sqlalchemy import text

    started = time.monotonic()
    try:
        async with asyncio.timeout(timeout):
            async with AsyncSessionLocal() as db:
                await db.execute(text("SELECT 1"))
        return {"status": "up", "latency_ms": round((time.monotonic() - started) * 1000, 1)}
    except asyncio.TimeoutError:
        return {"status": "down", "latency_ms": None, "error": "timeout"}
    except Exception as exc:
        return {"status": "down", "latency_ms": None, "error": str(exc)[:80]}


async def _check_redis(timeout: float = 2.0) -> Dict[str, Any]:
    """Single-shot health probe against Redis."""
    started = time.monotonic()
    try:
        import redis.asyncio as aioredis
        from app.config import settings
        # Pydantic v2 may type this as Url — cast to plain str for the redis client.
        url = str(getattr(settings, "REDIS_URL", "redis://redis:6379/0"))
        client = aioredis.from_url(url, decode_responses=True, socket_timeout=timeout)
        async with asyncio.timeout(timeout):
            pong = await client.ping()
        try:
            await client.aclose()
        except Exception:
            pass
        if pong:
            return {"status": "up", "latency_ms": round((time.monotonic() - started) * 1000, 1)}
        return {"status": "down", "latency_ms": None, "error": "no pong"}
    except asyncio.TimeoutError:
        return {"status": "down", "latency_ms": None, "error": "timeout"}
    except Exception as exc:
        return {"status": "down", "latency_ms": None, "error": str(exc)[:80]}


@router.get("/status", include_in_schema=True, summary="Public platform status")
async def public_status() -> Dict[str, Any]:
    """Return aggregated platform status — no auth, no tenant data leak."""
    db_check, redis_check = await asyncio.gather(_check_db(), _check_redis())
    checks = {
        "api":   {"status": "up", "latency_ms": 0.5},  # we reached the endpoint
        "db":    db_check,
        "redis": redis_check,
    }
    overall = (
        "operational" if all(c["status"] == "up" for c in checks.values())
        else "outage"  if all(c["status"] == "down" for c in checks.values() if c is not checks["api"])
        else "degraded"
    )
    return {
        "status": overall,
        "checks": checks,
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
