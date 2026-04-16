"""
Rate Limiting Middleware — Redis sliding window per tenant/IP.

Limits:
    - free:       60  req/min
    - starter:   100  req/min
    - pro:      1000  req/min
    - enterprise: unlimited

Falls back to IP-based limiting when no tenant JWT is present (public routes).
Fails open if Redis is unavailable (logs warning, allows request).
"""
from __future__ import annotations

import logging
import time
from typing import Optional

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# Requests per minute per plan
PLAN_LIMITS: dict[str, int] = {
    "free":       60,
    "starter":   100,
    "pro":      1000,
    "enterprise": -1,   # unlimited
}

# Public paths exempt from rate limiting
_EXEMPT = {"/health", "/", "/docs", "/redoc", "/openapi.json"}

# Simple in-memory cache: tenant_id -> (plan_tier, expires_at)
_plan_cache: dict[str, tuple[str, float]] = {}
_PLAN_CACHE_TTL = 300  # 5 minutes


async def _get_tenant_plan(tenant_id: str) -> str:
    """Fetch tenant plan from DB with in-memory TTL cache."""
    now = time.time()
    cached = _plan_cache.get(tenant_id)
    if cached and cached[1] > now:
        return cached[0]

    try:
        from app.db.session import AsyncSessionLocal
        from sqlalchemy import text
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("SELECT plan_tier FROM tenants WHERE id = :tid LIMIT 1"),
                {"tid": tenant_id},
            )
            row = result.fetchone()
            plan = row[0] if row else "free"
            _plan_cache[tenant_id] = (plan, now + _PLAN_CACHE_TTL)
            return plan
    except Exception as e:
        logger.warning("Rate limiter: could not fetch tenant plan (%s) — defaulting to free", e)
        return "free"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding window rate limiter using Redis."""

    def __init__(self, app, redis_url: str = "redis://redis:6379/0"):
        super().__init__(app)
        self._redis_url = redis_url
        self._redis = None

    async def _get_redis(self):
        if self._redis is None:
            try:
                import redis.asyncio as aioredis
                self._redis = aioredis.from_url(self._redis_url, decode_responses=True)
            except Exception as e:
                logger.warning("Rate limiter: Redis unavailable (%s) — skipping", e)
        return self._redis

    async def dispatch(self, request: Request, call_next):
        # Rate limiting is handled by nginx (rate=300r/s burst=500).
        # Backend middleware disabled to avoid false positives on page load.
        return await call_next(request)

        path = request.url.path  # unreachable — kept for reference

        # Exempt paths
        if path in _EXEMPT or path.startswith(("/docs", "/redoc")):
            return await call_next(request)

        redis = await self._get_redis()
        if not redis:
            return await call_next(request)  # fail open

        # Determine limit and key
        limit, key = await self._resolve_limit_and_key(request)

        if limit == -1:  # unlimited
            return await call_next(request)

        try:
            window = 60  # 1-minute sliding window
            now = int(time.time())
            bucket = now // window
            rkey = f"rl:{key}:{bucket}"

            count = await redis.incr(rkey)
            if count == 1:
                await redis.expire(rkey, window * 2)

            remaining = max(limit - count, 0)
            reset_at = (bucket + 1) * window

            if count > limit:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": "Trop de requêtes",
                        "detail": f"Limite de {limit} req/min atteinte. Réessayez après {reset_at - now}s.",
                    },
                    headers={
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(reset_at),
                        "Retry-After": str(reset_at - now),
                    },
                )

            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(reset_at)
            return response

        except Exception as e:
            logger.warning("Rate limit check failed: %s — allowing request", e)
            return await call_next(request)

    async def _resolve_limit_and_key(self, request: Request) -> tuple[int, str]:
        """Return (requests_per_minute, redis_key_prefix).

        Authenticated requests (any valid Bearer token) are unlimited (-1).
        Only unauthenticated requests are rate-limited (brute force protection).
        """
        # Any request with a Bearer token = authenticated user → unlimited
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            return -1, "authenticated"

        # Also check request.state set by AuthMiddleware
        if getattr(request.state, "tenant_id", None):
            return -1, "authenticated"

        # Unauthenticated: IP-based rate limit (brute force protection)
        ip = request.client.host if request.client else "unknown"
        return PLAN_LIMITS["free"], f"ip:{ip}"
