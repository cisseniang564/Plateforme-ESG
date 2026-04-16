"""
API Usage Tracking Middleware
Counts API calls per tenant per day in Redis.
Keys: api:usage:{tenant_id}:{YYYY-MM-DD}       → total daily counter
      api:usage:{tenant_id}:{YYYY-MM-DD}:h{HH}  → hourly counter
TTL: 90 days
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

# Only track these prefixes
_TRACK_PREFIX = "/api/v1/"
# Skip purely informational paths
_SKIP_PATHS = {"/api/v1/health", "/health", "/metrics"}
_TTL_SECONDS = 90 * 24 * 3600  # 90 days


class ApiUsageMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_url: str):
        super().__init__(app)
        self._redis_url = redis_url
        self._redis = None

    def _get_redis(self):
        if self._redis is None:
            try:
                import redis as _redis
                self._redis = _redis.from_url(self._redis_url, decode_responses=True)
            except Exception as exc:
                logger.warning("ApiUsageMiddleware: cannot connect to Redis — %s", exc)
        return self._redis

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        path = request.url.path
        if not path.startswith(_TRACK_PREFIX) or path in _SKIP_PATHS:
            return response

        # Only count successful-ish responses
        if response.status_code >= 500:
            return response

        try:
            r = self._get_redis()
            if r is None:
                return response

            # Determine tenant
            tenant_id = None
            # Try to get from request state (set by auth middleware)
            tenant_id = getattr(getattr(request, "state", None), "tenant_id", None)
            if not tenant_id:
                return response  # anonymous request — skip

            now = datetime.now(timezone.utc)
            date_str = now.strftime("%Y-%m-%d")
            hour_str = now.strftime("%H")

            daily_key = f"api:usage:{tenant_id}:{date_str}"
            hourly_key = f"api:usage:{tenant_id}:{date_str}:h{hour_str}"

            pipe = r.pipeline()
            pipe.incr(daily_key)
            pipe.expire(daily_key, _TTL_SECONDS)
            pipe.incr(hourly_key)
            pipe.expire(hourly_key, _TTL_SECONDS)
            pipe.execute()

        except Exception as exc:
            logger.debug("ApiUsageMiddleware tracking failed: %s", exc)

        return response
