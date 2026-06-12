"""
API Usage Tracking & Quota Enforcement Middleware
================================================
Counts API calls per tenant per day/hour in Redis, then enforces the
monthly quota defined in PLAN_LIMITS.

Keys
----
  api:usage:{tenant_id}:{YYYY-MM-DD}        → daily total
  api:usage:{tenant_id}:{YYYY-MM-DD}:h{HH}  → hourly bucket
  api:quota:{tenant_id}:{YYYY-MM}            → monthly total (auto-reset each month)

Behaviour
---------
  • Unlimited plan (limit < 0) → never blocked, no header added.
  • Usage ≥ 100 % of monthly quota → 429 JSON response.
  • Usage ≥ 80 % of monthly quota → continues but adds headers:
        X-Quota-Warning: api_calls
        X-Quota-Usage-Pct: 85   (integer percentage)
        X-Quota-Remaining: 1500
  • Quota headers (X-Quota-Limit, X-Quota-Used, X-Quota-Remaining) are
    set on ALL responses, including 5xx, so the client always knows its usage.
  • Errors in quota enforcement are always silently swallowed so that a
    Redis outage never takes down the whole API (fail-open design).

TTL
---
  Daily / hourly keys → 90 days
  Monthly key         → 35 days (safely covers month boundary)

Redis
-----
  Uses redis.asyncio (non-blocking) to avoid blocking the event loop.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

from app.core.plan_limits import QUOTA_WARNING_THRESHOLD

logger = logging.getLogger(__name__)

_TRACK_PREFIX = "/api/v1/"

_SKIP_PATHS: set[str] = {
    "/api/v1/health",
    "/health",
    "/metrics",
}
_SKIP_PREFIXES: tuple[str, ...] = (
    "/api/v1/auth/",
    "/api/v1/billing/",
    "/api/v1/webhooks/",
    "/api/v1/usage/",
)

_TTL_DAILY_SEC   = 90 * 24 * 3_600   # 90 days
_TTL_MONTHLY_SEC = 35 * 24 * 3_600   # 35 days


class ApiUsageMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_url: str):
        super().__init__(app)
        self._redis_url = redis_url
        self._redis = None   # lazy async client (redis.asyncio)

    # ── Async Redis connection (lazy, singleton) ──────────────────────────────

    async def _get_redis(self):
        if self._redis is None:
            try:
                import redis.asyncio as _aioredis
                self._redis = _aioredis.from_url(self._redis_url, decode_responses=True)
            except Exception as exc:
                logger.warning("ApiUsageMiddleware: cannot connect to Redis — %s", exc)
        return self._redis

    # ── Path filtering ────────────────────────────────────────────────────────

    def _should_track(self, path: str) -> bool:
        if not path.startswith(_TRACK_PREFIX):
            return False
        if path in _SKIP_PATHS:
            return False
        return not any(path.startswith(p) for p in _SKIP_PREFIXES)

    # ── Key helpers ───────────────────────────────────────────────────────────

    @staticmethod
    def _monthly_key(tenant_id: str, now: datetime) -> str:
        return f"api:quota:{tenant_id}:{now.strftime('%Y-%m')}"

    @staticmethod
    def _daily_key(tenant_id: str, date_str: str) -> str:
        return f"api:usage:{tenant_id}:{date_str}"

    @staticmethod
    def _hourly_key(tenant_id: str, date_str: str, hour_str: str) -> str:
        return f"api:usage:{tenant_id}:{date_str}:h{hour_str}"

    # ── Main dispatch ─────────────────────────────────────────────────────────

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        if not self._should_track(path):
            return await call_next(request)

        state     = getattr(request, "state", None)
        tenant_id: str | None = getattr(state, "tenant_id", None)
        if not tenant_id:
            return await call_next(request)

        # Monthly quota (-1 = unlimited, 0 = not set / skip enforcement)
        quota: int = getattr(state, "max_monthly_api_calls", 0)

        # Unlimited plan → track but never block
        if quota < 0:
            await self._increment_counters(tenant_id)
            return await call_next(request)

        if quota == 0:
            return await call_next(request)

        # ── Pre-request quota check ───────────────────────────────────────────
        monthly_usage = await self._get_monthly_usage(tenant_id)

        if monthly_usage is not None and monthly_usage >= quota:
            logger.info(
                "API quota exceeded for tenant %s: %d/%d this month",
                tenant_id, monthly_usage, quota,
            )
            return JSONResponse(
                status_code=429,
                content={
                    "detail": (
                        f"Quota mensuel d'appels API atteint ({monthly_usage}/{quota}). "
                        "Passez à un plan supérieur pour continuer."
                    ),
                    "code": "api_quota_exceeded",
                    "current": monthly_usage,
                    "limit": quota,
                    "upgrade_url": "/app/billing",
                },
                headers={
                    "Retry-After": "2592000",
                    "X-Quota-Limit": str(quota),
                    "X-Quota-Used": str(monthly_usage),
                    "X-Quota-Remaining": "0",
                },
            )

        # ── Forward request ───────────────────────────────────────────────────
        response = await call_next(request)

        # ── Increment counters (always — even on 5xx, the call was made) ──────
        new_monthly = await self._increment_counters(tenant_id)

        # ── Quota headers on every response ───────────────────────────────────
        if new_monthly is not None:
            remaining = max(0, quota - new_monthly)
            pct = int(new_monthly / quota * 100) if quota > 0 else 0
            response.headers["X-Quota-Limit"]     = str(quota)
            response.headers["X-Quota-Used"]      = str(new_monthly)
            response.headers["X-Quota-Remaining"] = str(remaining)

            if new_monthly / quota >= QUOTA_WARNING_THRESHOLD:
                response.headers["X-Quota-Warning"]   = "api_calls"
                response.headers["X-Quota-Usage-Pct"] = str(pct)
                logger.info(
                    "Quota warning for tenant %s: %d/%d (%d%%)",
                    tenant_id, new_monthly, quota, pct,
                )

        return response

    # ── Async Redis helpers ───────────────────────────────────────────────────

    async def _get_monthly_usage(self, tenant_id: str) -> int | None:
        try:
            r = await self._get_redis()
            if r is None:
                return None
            now = datetime.now(timezone.utc)
            val = await r.get(self._monthly_key(tenant_id, now))
            return int(val) if val else 0
        except Exception as exc:
            logger.debug("get_monthly_usage error: %s", exc)
            return None

    async def _increment_counters(self, tenant_id: str) -> int | None:
        """
        Atomically increment daily, hourly, and monthly counters (async).
        Returns the new monthly total, or None on Redis error.
        """
        try:
            r = await self._get_redis()
            if r is None:
                return None

            now      = datetime.now(timezone.utc)
            date_str = now.strftime("%Y-%m-%d")
            hour_str = now.strftime("%H")

            dk = self._daily_key(tenant_id, date_str)
            hk = self._hourly_key(tenant_id, date_str, hour_str)
            mk = self._monthly_key(tenant_id, now)

            pipe = r.pipeline()
            pipe.incr(dk);  pipe.expire(dk, _TTL_DAILY_SEC)
            pipe.incr(hk);  pipe.expire(hk, _TTL_DAILY_SEC)
            pipe.incr(mk);  pipe.expire(mk, _TTL_MONTHLY_SEC)
            results = await pipe.execute()

            # results order: [incr_dk, expire_dk, incr_hk, expire_hk, incr_mk, expire_mk]
            # Index 4 = result of INCR mk
            return int(results[4]) if results and len(results) >= 5 else None

        except Exception as exc:
            logger.debug("increment_counters error: %s", exc)
            return None
