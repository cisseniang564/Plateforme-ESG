"""
Rate Limiting Middleware — Redis sliding window per tenant/IP.

Limits (sized for a modern SPA where each page load fires 10-30 parallel
fetches: dashboard widgets, score, indicators, materiality, audit log, …):

    - free:       300  req/min   (≈ 5 req/s sustained — single-user browsing)
    - pme:        600  req/min   (≈ 10 req/s — small team)
    - eti:       2000  req/min   (≈ 33 req/s — larger team + connectors)
    - groupe:    5000  req/min   (≈ 83 req/s — group-level traffic)
    - enterprise: unlimited
    - Legacy starter / pro kept for backwards-compat with existing subscribers.

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
    "free":       300,
    "pme":        600,
    "eti":       2000,
    "groupe":    5000,
    "enterprise": -1,    # unlimited
    # Legacy plans (kept for existing subscribers)
    "starter":    600,   # same generosity as PME
    "pro":       2000,   # same as ETI
}

# Read-only endpoints called on every page load — these should never trip the
# bucket alone. We still count them but exempt path matching is enforced for
# public/static-like routes.
_EXEMPT = {
    "/health", "/health/live", "/health/ready",
    "/", "/docs", "/redoc", "/openapi.json", "/metrics",
}

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
        path = request.url.path

        # Brute-force protection — stricter limit for auth endpoints
        if path in ("/api/v1/auth/login", "/api/v1/auth/demo-login"):
            blocked = await self._check_brute_force(request)
            if blocked:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": "Trop de tentatives",
                        "detail": "Compte temporairement bloqué après plusieurs tentatives échouées. Réessayez dans 15 minutes.",
                    },
                    headers={"Retry-After": "900"},
                )

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

        # Step 1 — check Redis counter only. Failures here are non-fatal:
        # we log and let the downstream handler run without rate limiting.
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
        except Exception as e:
            logger.warning("Rate limit Redis check failed: %s — allowing request", e)
            return await call_next(request)

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

        # Step 2 — run the downstream handler. Exceptions here must propagate
        # to be handled by the global exception handler — re-invoking call_next
        # on the same ASGI scope is illegal and was causing request hangs.
        response = await call_next(request)
        try:
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(reset_at)
        except Exception:
            pass
        return response

    async def _check_brute_force(self, request: Request) -> bool:
        """Return True if this IP should be blocked (brute-force protection).

        Strategy: sliding 15-minute window — if ≥10 failed attempts, block.
        The failed-attempt counter is incremented by the auth endpoint itself
        via the Redis key  bf:<ip>  with TTL 900s.
        """
        redis = await self._get_redis()
        if not redis:
            return False
        try:
            ip = request.client.host if request.client else "unknown"
            key = f"bf:{ip}"
            count = await redis.get(key)
            return int(count or 0) >= 10
        except Exception as e:
            logger.warning("Brute-force check failed: %s", e)
            return False

    async def _resolve_limit_and_key(self, request: Request) -> tuple[int, str]:
        """Return (requests_per_minute, redis_key_prefix).

        Authenticated requests are limited per plan tier; unauthenticated
        requests fall back to per-IP rate limiting at the free-plan level.
        """
        tenant_id = getattr(request.state, "tenant_id", None)
        if tenant_id:
            plan_tier = getattr(request.state, "plan_tier", None)
            if not plan_tier:
                plan_tier = await _get_tenant_plan(str(tenant_id))
            limit = PLAN_LIMITS.get(plan_tier, PLAN_LIMITS["free"])
            return limit, f"tenant:{tenant_id}"

        # Unauthenticated: IP-based rate limit (brute force protection)
        ip = request.client.host if request.client else "unknown"
        return PLAN_LIMITS["free"], f"ip:{ip}"
