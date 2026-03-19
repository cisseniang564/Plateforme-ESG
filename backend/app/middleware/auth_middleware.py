"""Authentication middleware."""
from typing import Optional
from uuid import UUID
from fastapi import HTTPException, Request, status
from jose import JWTError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.utils.jwt import decode_token, extract_tenant_id, extract_user_id, is_token_expired

PUBLIC_PATHS = frozenset([
    "/", "/docs", "/redoc", "/openapi.json", "/health",
    "/api/v1/auth/login", "/api/v1/auth/refresh",
    "/api/v1/auth/onboard", "/api/v1/auth/register",
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
            request.state.tenant_id = extract_tenant_id(payload)
            request.state.user_id = extract_user_id(payload)
            request.state.token_payload = payload
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
