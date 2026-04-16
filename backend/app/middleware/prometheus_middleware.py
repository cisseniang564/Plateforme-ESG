"""Prometheus metrics middleware."""
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.core.metrics import http_requests_total, http_request_duration_seconds

EXCLUDED_PATHS = {"/health", "/health/live", "/health/ready", "/metrics", "/favicon.ico"}


class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path in EXCLUDED_PATHS:
            return await call_next(request)

        start_time = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start_time

        # Normalize path to avoid cardinality explosion
        normalized = self._normalize_path(path)

        http_requests_total.labels(
            method=request.method,
            endpoint=normalized,
            status_code=response.status_code
        ).inc()

        http_request_duration_seconds.labels(
            method=request.method,
            endpoint=normalized
        ).observe(duration)

        return response

    def _normalize_path(self, path: str) -> str:
        """Replace UUIDs and IDs with placeholders."""
        import re
        path = re.sub(r'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '/{uuid}', path)
        path = re.sub(r'/\d+', '/{id}', path)
        return path
