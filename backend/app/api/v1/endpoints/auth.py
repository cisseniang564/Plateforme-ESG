"""
Authentication endpoints
"""
from datetime import timedelta
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr

from app.utils.security import verify_password, get_password_hash
from app.utils.jwt import create_access_token, create_password_reset_token
from app.dependencies import get_db
from app.models.user import User
from app.models.organization import Organization

import logging
logger = logging.getLogger(__name__)


async def _record_failed_login(request: Request) -> None:
    """Increment the brute-force counter for this IP (TTL = 15 min)."""
    try:
        from app.config import settings
        import redis.asyncio as aioredis
        redis_url = str(settings.REDIS_URL) if settings.REDIS_URL else "redis://redis:6379/0"
        r = aioredis.from_url(redis_url, decode_responses=True)
        ip = request.client.host if request.client else "unknown"
        key = f"bf:{ip}"
        pipe = r.pipeline()
        pipe.incr(key)
        pipe.expire(key, 900)  # reset window after 15 min of inactivity
        await pipe.execute()
        await r.aclose()
    except Exception as exc:
        logger.debug("Could not record failed login attempt: %s", exc)


async def _clear_failed_logins(request: Request) -> None:
    """Clear the brute-force counter on successful login."""
    try:
        from app.config import settings
        import redis.asyncio as aioredis
        redis_url = str(settings.REDIS_URL) if settings.REDIS_URL else "redis://redis:6379/0"
        r = aioredis.from_url(redis_url, decode_responses=True)
        ip = request.client.host if request.client else "unknown"
        await r.delete(f"bf:{ip}")
        await r.aclose()
    except Exception as exc:
        logger.debug("Could not clear failed login counter: %s", exc)

router = APIRouter()


# Schémas Pydantic
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenResponse(BaseModel):
    tokens: Token
    user: dict


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    company_name: str


class RegisterResponse(BaseModel):
    message: str
    user_id: str
    email: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Login endpoint — accepts JSON body"""

    # Chercher l'utilisateur avec son rôle chargé
    result = await db.execute(
        select(User)
        .options(selectinload(User.role))
        .where(User.email == data.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        await _record_failed_login(request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    # Créer les tokens (format compatible avec auth_middleware extract_user_id)
    access_token = create_access_token(
        subject=user.email,
        tenant_id=user.tenant_id,
        user_id=user.id,
    )
    refresh_token = create_access_token(
        subject=user.email,
        tenant_id=user.tenant_id,
        user_id=user.id,
        expires_delta=timedelta(days=7),
        additional_claims={"type": "refresh"},
    )
    
    # Successful login — clear any brute-force counter
    await _clear_failed_logins(request)

    return {
        "tokens": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        },
        "user": {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.name if user.role else "viewer",
            "tenant_id": str(user.tenant_id),
            "email_verified_at": user.email_verified_at.isoformat() if user.email_verified_at else None,
            "mfa_enabled": user.mfa_enabled,
        }
    }


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user and create their organization (tenant)
    """
    
    # Vérifier si l'email existe déjà
    existing_user = await db.execute(
        select(User).where(User.email == data.email)
    )
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Créer une nouvelle organisation (tenant)
    new_org = Organization(
        id=uuid4(),
        name=data.company_name,
        industry="General",
        country="FR",
        size="medium",
        is_active=True
    )
    db.add(new_org)
    await db.flush()  # Pour obtenir l'ID
    
    # Créer l'utilisateur
    new_user = User(
        id=uuid4(),
        tenant_id=new_org.id,
        email=data.email,
        password_hash=get_password_hash(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        is_active=True,
        email_verified_at=None  # À vérifier par email plus tard
    )
    db.add(new_user)
    await db.commit()

    # Send verification email via Celery (non-blocking)
    try:
        from app.config import settings as app_settings
        from datetime import datetime, timedelta, timezone
        from jose import jwt as _jwt
        from app.tasks.email_tasks import send_email_verification
        _token = _jwt.encode(
            {
                "sub": str(new_user.id),
                "tenant_id": str(new_user.tenant_id),
                "purpose": "email_verification",
                "exp": datetime.now(timezone.utc) + timedelta(hours=24),
            },
            app_settings.JWT_SECRET_KEY,
            algorithm="HS256",
        )
        verify_url = f"{app_settings.APP_URL}/verify-email?token={_token}"
        send_email_verification.delay(
            email=new_user.email,
            first_name=new_user.first_name or new_user.email.split("@")[0],
            verify_url=verify_url,
        )
    except Exception:
        pass  # Never block registration on email failure

    return RegisterResponse(
        message="Account created successfully. Please check your email to verify your account.",
        user_id=str(new_user.id),
        email=new_user.email
    )


@router.post("/forgot-password")
async def forgot_password(
    email: EmailStr,
    db: AsyncSession = Depends(get_db)
):
    """
    Request password reset
    """
    
    # Chercher l'utilisateur
    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    # Toujours retourner succès (sécurité - ne pas révéler si email existe)
    if user:
        from app.config import settings as app_settings
        from app.tasks.email_tasks import send_password_reset_email
        token = create_password_reset_token(user.email, user.id)
        reset_url = f"{app_settings.APP_URL}/reset-password?token={token}"
        send_password_reset_email.delay(
            email=user.email,
            first_name=user.first_name or "",
            reset_url=reset_url,
        )

    return {
        "message": "If this email is registered, you will receive password reset instructions."
    }


@router.post("/demo-login")
async def demo_login(db: AsyncSession = Depends(get_db)):
    """
    Auto-login as the shared read-only demo account.
    Creates the demo user on first call (piggybacks on the admin tenant
    so the demo sees real pre-populated ESG data).
    """
    from datetime import datetime, timezone

    DEMO_EMAIL = "demo@greenconnect.cloud"

    # 1. Lookup or create demo user
    result = await db.execute(
        select(User)
        .options(selectinload(User.role))
        .where(User.email == DEMO_EMAIL)
    )
    demo_user = result.scalar_one_or_none()

    if not demo_user:
        # Reuse admin tenant so demo shows real data; fallback to own org
        admin_res = await db.execute(
            select(User).where(User.email == "admin@greenconnect.cloud")
        )
        admin = admin_res.scalar_one_or_none()

        if admin:
            tenant_id = admin.tenant_id
        else:
            # No admin — create a standalone demo tenant
            from uuid import uuid4 as _uuid4
            from app.models.tenant import Tenant as _Tenant
            _slug = f"greenconnect-demo-{str(_uuid4())[:8]}"
            fallback_tenant = _Tenant(
                id=_uuid4(),
                name="GreenConnect — Démo",
                slug=_slug,
            )
            db.add(fallback_tenant)
            await db.flush()
            tenant_id = fallback_tenant.id

        demo_user = User(
            id=uuid4(),
            tenant_id=tenant_id,
            email=DEMO_EMAIL,
            # Random hash — demo account is never logged-in with a password
            password_hash=get_password_hash(str(uuid4())),
            first_name="Compte",
            last_name="Démo",
            is_active=True,
            email_verified_at=datetime.now(timezone.utc),
            mfa_enabled=False,
        )
        db.add(demo_user)
        await db.commit()
        await db.refresh(demo_user)

    # 2. Issue short-lived tokens (8 h — demo sessions expire same day)
    access_token = create_access_token(
        subject=demo_user.email,
        tenant_id=demo_user.tenant_id,
        user_id=demo_user.id,
    )
    refresh_token = create_access_token(
        subject=demo_user.email,
        tenant_id=demo_user.tenant_id,
        user_id=demo_user.id,
        expires_delta=timedelta(hours=8),
        additional_claims={"type": "refresh"},
    )

    return {
        "tokens": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        },
        "user": {
            "id": str(demo_user.id),
            "email": demo_user.email,
            "first_name": demo_user.first_name,
            "last_name": demo_user.last_name,
            "role": demo_user.role.name if demo_user.role else "viewer",
            "tenant_id": str(demo_user.tenant_id),
            "email_verified_at": demo_user.email_verified_at.isoformat() if demo_user.email_verified_at else None,
            "mfa_enabled": demo_user.mfa_enabled,
            "needs_onboarding": False,
        },
    }