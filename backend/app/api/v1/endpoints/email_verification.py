"""
Email Verification Flow
POST /auth/send-verification  — send (or resend) verification email
GET  /auth/verify-email       — consume token & mark email verified
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

_ALGO = "HS256"
_TTL_HOURS = 24


def _make_token(user_id: str, tenant_id: str) -> str:
    payload = {
        "sub": str(user_id),
        "tenant_id": str(tenant_id),
        "purpose": "email_verification",
        "exp": datetime.now(timezone.utc) + timedelta(hours=_TTL_HOURS),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=_ALGO)


def _verify_token(token: str) -> dict:
    try:
        data = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[_ALGO])
        if data.get("purpose") != "email_verification":
            raise ValueError("wrong purpose")
        return data
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lien de vérification invalide ou expiré.",
        ) from exc


# ── Send / Resend ─────────────────────────────────────────────────────────────

@router.post("/send-verification", summary="Send verification email")
async def send_verification_email(
    current_user: User = Depends(get_current_user),
):
    if current_user.email_verified_at is not None:
        return {"message": "Email déjà vérifié.", "already_verified": True}

    token = _make_token(current_user.id, current_user.tenant_id)
    app_url = getattr(settings, "APP_URL", "http://localhost:3000")
    verify_url = f"{app_url}/verify-email?token={token}"

    EmailService.send_email_verification(
        email=current_user.email,
        first_name=current_user.first_name or current_user.email.split("@")[0],
        verify_url=verify_url,
    )
    logger.info("Verification email sent to user %s", current_user.id)
    return {"message": "Email de vérification envoyé.", "already_verified": False}


# ── Verify token ──────────────────────────────────────────────────────────────

@router.get("/verify-email", summary="Verify email address")
async def verify_email(
    token: str = Query(..., description="JWT verification token"),
    db: AsyncSession = Depends(get_db),
):
    data = _verify_token(token)
    user_id = data["sub"]

    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    if user.email_verified_at is not None:
        return {"message": "Email déjà vérifié.", "already_verified": True, "email": user.email}

    user.email_verified_at = datetime.now(timezone.utc)
    await db.commit()
    logger.info("Email verified for user %s", user.id)
    return {"message": "Email vérifié avec succès.", "already_verified": False, "email": user.email}
