"""
Billing Middleware — Trial-status awareness (freemium model).

Intercepts every authenticated request to track billing status.
Requests are NEVER blocked — users can always navigate the platform.
The middleware adds an `X-Trial-Expired: true` response header when the
tenant's trial has ended and no active subscription exists, so the
frontend can display a non-intrusive upgrade banner.

Exempt paths receive no extra processing.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# Paths that are ALWAYS accessible, even with an expired subscription
_BILLING_EXEMPT_EXACT: frozenset[str] = frozenset([
    "/",
    "/health", "/health/live", "/health/ready", "/metrics",
    "/docs", "/redoc", "/openapi.json",
    # Auth — login / register / password reset must always work
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/refresh",
    "/api/v1/auth/demo-login",
    "/api/v1/auth/logout",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
    "/api/v1/auth/verify-email",
    "/api/v1/auth/send-verification",
    "/api/v1/auth/me",
    "/api/v1/auth/2fa/setup",
    "/api/v1/auth/2fa/verify",
    "/api/v1/auth/change-password",
    # Billing — users must be able to upgrade
    "/api/v1/billing/subscription",
    "/api/v1/billing/checkout",
    "/api/v1/billing/portal",
    "/api/v1/billing/features",
    "/api/v1/billing/invoices",
    "/api/v1/billing/reactivate",
    "/api/v1/billing/downgrade-free",
    # Onboarding
    "/api/v1/onboarding/status",
    "/api/v1/onboarding/sectors",
    # Notifications & profile (read-only quality-of-life)
    "/api/v1/notifications",
    "/api/v1/notifications/preferences",
    # Stripe webhook — verified by signature, must always go through
    "/api/v1/webhooks/stripe",
    # Unsubscribe — must work without auth/billing context (RFC 8058)
    "/api/v1/unsubscribe",
    # Public status — must always answer (used by DSI / monitoring)
    "/api/v1/status",
    # Lead capture — public marketing endpoints
    "/api/v1/leads/checklist-csrd",
    "/api/v1/leads/newsletter",
])

# Public path prefixes also exempted from billing checks
_BILLING_EXEMPT_PREFIXES: tuple[str, ...] = (
    "/api/v1/auth/",
    "/api/v1/billing/",
    "/api/v1/supply-chain/portal/",
    "/api/v1/sso/",
    "/api/v1/og/",  # OG images for social previews — must be cacheable & public
)

# Simple in-memory cache: tenant_id -> (is_blocked, expires_at)
_tenant_cache: dict[str, tuple[bool, float]] = {}
_CACHE_TTL = 120  # 2-minute cache — short enough to react to new subscriptions


def _is_exempt(path: str) -> bool:
    if path in _BILLING_EXEMPT_EXACT:
        return True
    return any(path.startswith(p) for p in _BILLING_EXEMPT_PREFIXES)


async def _tenant_is_blocked(tenant_id: str) -> bool:
    """Return True if the tenant has no active subscription and trial is over.

    Uses an in-memory TTL cache to avoid a DB query on every request.
    """
    now = time.monotonic()
    cached = _tenant_cache.get(tenant_id)
    if cached and cached[1] > now:
        return cached[0]

    blocked = False
    try:
        from app.db.session import AsyncSessionLocal
        from sqlalchemy import text

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text(
                    "SELECT plan_tier, stripe_subscription_status, trial_ends_at "
                    "FROM tenants WHERE id = :tid LIMIT 1"
                ),
                {"tid": tenant_id},
            )
            row = result.fetchone()

        if row:
            plan_tier, sub_status, trial_ends_at = row

            utc_now = datetime.now(timezone.utc)
            if trial_ends_at is not None and hasattr(trial_ends_at, "tzinfo") and trial_ends_at.tzinfo is None:
                trial_ends_at = trial_ends_at.replace(tzinfo=timezone.utc)
            in_trial = trial_ends_at is not None and utc_now < trial_ends_at

            # Enterprise tenants are never blocked
            if plan_tier == "enterprise":
                blocked = False

            # Active paid Stripe subscription (past_due has a grace period)
            elif sub_status in ("active", "past_due"):
                blocked = False

            # "trialing" Stripe status — blocked once the trial window closes
            elif sub_status == "trialing":
                blocked = not in_trial

            # No Stripe subscription — check trial window
            else:
                if trial_ends_at is None:
                    # No trial ever set → grant a grace period (not blocked)
                    blocked = False
                else:
                    blocked = not in_trial

    except Exception as exc:
        logger.warning("BillingMiddleware: DB check failed (%s) — allowing request", exc)
        blocked = False

    _tenant_cache[tenant_id] = (blocked, now + _CACHE_TTL)
    return blocked


class BillingMiddleware(BaseHTTPMiddleware):
    """Freemium model — never blocks, signals trial expiry via response header."""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Skip non-API and exempt paths immediately
        if not path.startswith("/api/") or _is_exempt(path):
            return await call_next(request)

        # For authenticated tenants, check billing status and propagate via header
        tenant_id = getattr(request.state, "tenant_id", None)
        if tenant_id and await _tenant_is_blocked(str(tenant_id)):
            response = await call_next(request)
            # Non-intrusive signal: frontend reads this to show the upgrade banner
            response.headers["X-Trial-Expired"] = "true"
            return response

        return await call_next(request)
