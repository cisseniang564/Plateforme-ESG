"""
JWT token creation and validation utilities.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from uuid import UUID

from jose import JWTError, jwt

from app.config import settings


def create_access_token(
    subject: str,
    tenant_id: UUID,
    user_id: UUID,
    expires_delta: Optional[timedelta] = None,
    additional_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Create JWT access token.

    Args:
        subject: Subject claim (usually user email)
        tenant_id: Tenant UUID
        user_id: User UUID
        expires_delta: Override default expiration
        additional_claims: Extra claims merged into the payload
    """
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    payload: Dict[str, Any] = {
        "sub": subject,
        "tenant_id": str(tenant_id),
        "user_id": str(user_id),
        "exp": expire,
        "iat": now,
        "type": "access",
    }

    if additional_claims:
        payload.update(additional_claims)

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(
    subject: str,
    tenant_id: UUID,
    user_id: UUID,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create JWT refresh token.

    Args:
        subject: Subject claim (usually user email)
        tenant_id: Tenant UUID
        user_id: User UUID
        expires_delta: Override default expiration
    """
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta
        if expires_delta is not None
        else timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    )

    payload: Dict[str, Any] = {
        "sub": subject,
        "tenant_id": str(tenant_id),
        "user_id": str(user_id),
        "exp": expire,
        "iat": now,
        "type": "refresh",
    }

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate JWT token.

    Raises:
        JWTError: If token is invalid, expired, or tampered with.
    """
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError as exc:
        raise JWTError("Invalid token") from exc


def verify_token_type(payload: Dict[str, Any], expected_type: str) -> bool:
    """Return True if the token's ``type`` claim matches ``expected_type``."""
    return payload.get("type") == expected_type


def is_token_expired(payload: Dict[str, Any]) -> bool:
    """
    Check whether a decoded token payload is expired.

    Note: ``decode_token()`` already validates expiration via python-jose.
    This function provides an explicit check for code paths that need it.
    """
    exp = payload.get("exp")
    if exp is None:
        return True
    # Compare timezone-aware datetimes to avoid implicit UTC assumptions
    return datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc)


def extract_tenant_id(payload: Dict[str, Any]) -> UUID:
    """
    Extract ``tenant_id`` from a decoded JWT payload.

    Raises:
        ValueError: If ``tenant_id`` is absent from the payload.
    """
    tenant_id = payload.get("tenant_id")
    if not tenant_id:
        raise ValueError("tenant_id not found in token payload")
    return UUID(tenant_id)


def extract_user_id(payload: Dict[str, Any]) -> UUID:
    """
    Extract ``user_id`` from a decoded JWT payload.

    Raises:
        ValueError: If ``user_id`` is absent from the payload.
    """
    user_id = payload.get("user_id")
    if not user_id:
        raise ValueError("user_id not found in token payload")
    return UUID(user_id)


def create_email_verification_token(email: str, user_id: UUID) -> str:
    """Create a 24-hour token for email address verification."""
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": email,
        "user_id": str(user_id),
        "exp": now + timedelta(hours=24),
        "iat": now,
        "type": "email_verification",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_password_reset_token(email: str, user_id: UUID) -> str:
    """Create a 1-hour token for password reset."""
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": email,
        "user_id": str(user_id),
        "exp": now + timedelta(hours=1),
        "iat": now,
        "type": "password_reset",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_2fa_temp_token(user_id: UUID) -> str:
    """Create a short-lived (5 min) token for the 2FA login step.

    The token type ``2fa_temp`` is checked by ``verify_2fa_login()`` so it
    cannot be used as a normal access token.
    """
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "user_id": str(user_id),
        "exp": now + timedelta(minutes=5),
        "iat": now,
        "type": "2fa_temp",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
