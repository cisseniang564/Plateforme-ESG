"""CSRF protection for cookie-authenticated requests.

Rationale: requests authenticated via the ``Authorization: Bearer …`` header
are immune to CSRF because browsers never attach that header automatically.
Requests authenticated via the ``access_token`` httpOnly cookie *are*
vulnerable, so this middleware enforces the standard Origin/Referer check on
every mutating method (POST/PUT/PATCH/DELETE).

The check passes when:
    - The request method is safe (GET/HEAD/OPTIONS), or
    - Authentication is via Authorization header (no cookie auth in play), or
    - The Origin header matches one of the configured CORS origins, or
    - As a fallback, the Referer header starts with one of those origins.

When none of those hold, the request is rejected with HTTP 403.

Webhooks and other path prefixes that authenticate through their own
mechanism (HMAC signatures, mTLS, …) are listed in ``EXEMPT_PATH_PREFIXES``.
"""
from __future__ import annotations

from typing import Iterable
from urllib.parse import urlparse

from fastapi import status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

# Endpoints authenticated by mechanism other than session cookies
EXEMPT_PATH_PREFIXES: tuple[str, ...] = (
    "/api/v1/webhooks/",      # Stripe & co. — verified via signature
    "/api/v1/sso/callback/",  # SSO callbacks
)


def _origin_matches(value: str, allowed: Iterable[str]) -> bool:
    """Return True if *value* (Origin or Referer) matches an allowed origin."""
    if not value:
        return False
    try:
        parsed = urlparse(value)
        if not parsed.scheme or not parsed.netloc:
            return False
        candidate = f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
    except Exception:
        return False
    for origin in allowed:
        if not origin:
            continue
        if candidate == origin.rstrip("/"):
            return True
    return False


class CSRFMiddleware(BaseHTTPMiddleware):
    """Reject mutating cookie-auth requests whose Origin is not in the allowlist."""

    def __init__(self, app, allowed_origins: Iterable[str]):
        super().__init__(app)
        self._allowed = [o for o in allowed_origins if o]

    async def dispatch(self, request: Request, call_next):
        method = request.method.upper()
        path = request.url.path

        if method in _SAFE_METHODS:
            return await call_next(request)
        if any(path.startswith(p) for p in EXEMPT_PATH_PREFIXES):
            return await call_next(request)

        # Bearer-token requests are not vulnerable to CSRF — let them through
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            return await call_next(request)

        # No auth cookie present → no session to forge → not a CSRF target
        if not request.cookies.get("access_token") and not request.cookies.get("refresh_token"):
            return await call_next(request)

        origin = request.headers.get("Origin") or ""
        referer = request.headers.get("Referer") or ""

        if _origin_matches(origin, self._allowed) or _origin_matches(referer, self._allowed):
            return await call_next(request)

        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": "CSRF check failed: Origin not allowed"},
        )
