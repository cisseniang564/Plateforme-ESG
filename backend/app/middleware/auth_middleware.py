"""Authentication middleware."""
from typing import Optional
from uuid import UUID
from fastapi import HTTPException, Request, status
from jwt import PyJWTError as JWTError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.utils.jwt import decode_token, extract_tenant_id, extract_user_id, is_token_expired
from app.utils.token_blacklist import is_token_blacklisted

PUBLIC_PATHS = frozenset([
    "/", "/docs", "/redoc", "/openapi.json",
    "/health", "/health/live", "/health/ready", "/metrics",
    "/api/v1/auth/login", "/api/v1/auth/refresh",
    "/api/v1/auth/demo-login",
    "/api/v1/auth/demo-session",
    "/api/v1/auth/onboard", "/api/v1/auth/register",
    "/api/v1/auth/2fa/verify",   # 2FA verification uses temp_token, not full JWT
    "/api/v1/auth/forgot-password",  # Password reset request — no auth
    "/api/v1/auth/reset-password",   # Password reset confirmation — no auth
    "/api/v1/webhooks/stripe",  # Stripe webhook — signature-verified, no JWT
    "/api/v1/connectors/test",  # External API connectivity test — no user data
    "/api/v1/reports/verify",   # Public report hash verification — no PII returned
    "/api/v1/unsubscribe",      # Email unsubscribe — must work without JWT (RFC 8058)
    "/api/v1/status",           # Public status page — must work without JWT (DSI/operator)
    "/api/v1/leads/checklist-csrd",  # Lead magnet form — public capture
    "/api/v1/leads/newsletter",      # Newsletter subscription — public
])

# Path prefix exempt patterns (in addition to PUBLIC_PATH_PREFIXES below if any).
# Used for the OG image generator which has dynamic slugs.
_PUBLIC_GET_PREFIXES = (
    "/api/v1/og/",  # social-preview images, fully public + cached
)

PUBLIC_PATH_PREFIXES = frozenset([
    "/api/v1/supply-chain/portal/",
    "/api/v1/sso/callback/",  # SSO callbacks don't carry a JWT
    "/api/v1/auditor-reviews/public/",  # auditor uses an invitation token, not JWT
    "/api/v1/stakeholder-surveys/public/",  # external stakeholders use a public token
    "/api/v1/reports/shared/",          # shared report download links
    "/api/v1/og/",                      # dynamic OG images for social previews
    "/api/v1/vigilance-public/",        # anonymous whistleblowing portal (Loi Sapin 2 Art. 8)
])

_WWW_AUTHENTICATE = {"WWW-Authenticate": "Bearer"}

def _extract_token(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization")
    if auth_header:
        parts = auth_header.split(" ", 1)
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header format", headers=_WWW_AUTHENTICATE)
    return request.cookies.get("access_token")

def _unauthorized(detail: str) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": detail}, headers=_WWW_AUTHENTICATE)

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)
        if request.url.path in PUBLIC_PATHS:
            return await call_next(request)
        if any(request.url.path.startswith(p) for p in PUBLIC_PATH_PREFIXES):
            return await call_next(request)
        try:
            token = _extract_token(request)
        except HTTPException as exc:
            return _unauthorized(exc.detail)
        if not token:
            return _unauthorized("Authentication required")
        try:
            payload = decode_token(token)
            if is_token_expired(payload):
                return _unauthorized("Token has expired")
            jti = payload.get("jti")
            if jti and await is_token_blacklisted(jti):
                return _unauthorized("Token has been revoked")
            request.state.tenant_id = extract_tenant_id(payload)
            request.state.user_id = extract_user_id(payload)
            request.state.token_payload = payload
            # Quota embedded in token (avoids DB hit per request; stale ≤ 30 min on plan change)
            request.state.max_monthly_api_calls = payload.get("max_monthly_api_calls", 0)
            request.state.plan_tier = payload.get("plan_tier", "free")
        except JWTError:
            return _unauthorized("Invalid or expired token")
        except Exception:
            return _unauthorized("Could not validate credentials")
        return await call_next(request)

async def get_current_user_id(request: Request) -> UUID:
    if not hasattr(request.state, "user_id"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return request.state.user_id

async def get_current_tenant_id(request: Request) -> UUID:
    if not hasattr(request.state, "tenant_id"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return request.state.tenant_id

def get_optional_current_user_id(request: Request) -> Optional[UUID]:
    return getattr(request.state, "user_id", None)
