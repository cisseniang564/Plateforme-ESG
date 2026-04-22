"""
Billing Middleware — Post-trial & subscription enforcement.

Intercepts every authenticated request and returns 402 Payment Required
when the tenant's trial has expired AND no active Stripe subscription exists.

Exempt:
  - Public paths (auth, health, webhooks)
  - Billing / settings endpoints (so users can upgrade)
  - Read-only profile / notifications (so users are not locked out entirely)
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
    # Onboarding
    "/api/v1/onboarding/status",
    "/api/v1/onboarding/sectors",
    # Notifications & profile (read-only quality-of-life)
    "/api/v1/notifications",
    "/api/v1/notifications/preferences",
    # Stripe webhook — verified by signature, must always go through
    "/api/v1/webhooks/stripe",
])

_BILLING_EXEMPT_PREFIXES: tuple[str, ...] = (
    "/api/v1/auth/",
    "/api/v1/billing/",
    "/api/v1/supply-chain/portal/",
    "/api/v1/sso/",
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

            # Enterprise tenants are never blocked
            if plan_tier == "enterprise":
                blocked = False

            # Active or trialing Stripe subscription → OK
            elif sub_status in ("active", "trialing", "past_due"):
                blocked = False

            # No subscription — check trial window
            else:
                if trial_ends_at is None:
                    # Never set a trial → treat as grace period (first 14 days)
                    blocked = False
                else:
                    utc_now = datetime.now(timezone.utc)
                    if hasattr(trial_ends_at, "tzinfo") and trial_ends_at.tzinfo is None:
                        trial_ends_at = trial_ends_at.replace(tzinfo=timezone.utc)
                    blocked = utc_now > trial_ends_at

    except Exception as exc:
        logger.warning("BillingMiddleware: DB check failed (%s) — allowing request", exc)
        blocked = False

    _tenant_cache[tenant_id] = (blocked, now + _CACHE_TTL)
    return blocked


class BillingMiddleware(BaseHTTPMiddleware):
    """Block access when trial expired and no active subscription."""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Skip non-API and exempt paths immediately
        if not path.startswith("/api/") or _is_exempt(path):
            return await call_next(request)

        # Only enforce for authenticated tenants
        tenant_id = getattr(request.state, "tenant_id", None)
        if not tenant_id:
            return await call_next(request)

        if await _tenant_is_blocked(str(tenant_id)):
            return JSONResponse(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                content={
                    "error": "Abonnement expiré",
                    "detail": (
                        "Votre période d'essai est terminée. "
                        "Choisissez un plan pour continuer à utiliser ESGFlow."
                    ),
                    "upgrade_url": "/app/settings?tab=billing",
                    "code": "TRIAL_EXPIRED",
                },
            )

        return await call_next(request)
