"""
Authentication API routes.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.schemas.auth import (
    LoginResponse,
    MessageResponse,
    OnboardResponse,
    PasswordChangeRequest,
    PasswordResetRequest,
    PasswordResetConfirmRequest,
    ProfileUpdateRequest,
    TenantOnboardRequest,
    TokenRefreshRequest,
    TokenResponse,
    TwoFactorDisableRequest,
    TwoFactorEnableRequest,
    TwoFactorEnableResponse,
    TwoFactorSetupResponse,
    TwoFactorVerifyRequest,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

_COOKIE_SAMESITE = "lax"


def _set_auth_cookies(response: Response, tokens: TokenResponse) -> None:
    """Set httpOnly auth cookies on the response."""
    is_secure = settings.is_production
    response.set_cookie(
        key="access_token",
        value=tokens.access_token,
        httponly=True,
        secure=is_secure,
        samesite=_COOKIE_SAMESITE,
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=tokens.refresh_token,
        httponly=True,
        secure=is_secure,
        samesite=_COOKIE_SAMESITE,
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/v1/auth/refresh",
    )


def _clear_auth_cookies(response: Response) -> None:
    """Delete auth cookies from the browser."""
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token", path="/api/v1/auth/refresh")


@router.post(
    "/onboard",
    response_model=OnboardResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Onboard new tenant",
    description="""
    Self-service tenant onboarding endpoint.
    
    Creates:
    - New tenant account
    - Admin user with credentials
    - Optional initial organization
    
    This is the first step for new customers to start using the platform.
    """,
)
async def onboard_tenant(
    request: TenantOnboardRequest,
    db: AsyncSession = Depends(get_db),
) -> OnboardResponse:
    """Onboard new tenant with admin user."""
    auth_service = AuthService(db)
    return await auth_service.onboard_tenant(request)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
    description="""
    Register a new user for an existing tenant.
    
    This endpoint is used by tenant admins to invite new users.
    Requires authentication.
    """,
)
async def register_user(
    request_data: UserRegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Register new user for existing tenant."""
    # Extract tenant_id from authenticated request
    tenant_id = getattr(request.state, "tenant_id", None)
    
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    
    auth_service = AuthService(db)
    user = await auth_service.register_user(tenant_id, request_data)
    
    return UserResponse.model_validate(user)


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Login",
    description="""
    Authenticate user and receive JWT tokens.

    Tokens are delivered in two ways simultaneously:
    - **JSON body**: `tokens.access_token` / `tokens.refresh_token`
    - **httpOnly cookies**: `access_token` / `refresh_token` (for browser clients)

    Token lifetimes:
    - Access token: 30 min
    - Refresh token: 7 days
    """,
)
async def login(
    request: UserLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """Login with email and password."""
    auth_service = AuthService(db)
    result = await auth_service.login(request)
    if result.tokens:
        _set_auth_cookies(response, result.tokens)
    return result


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
    description="""
    Refresh an expired access token.

    Accepts the refresh token via:
    - **JSON body**: `refresh_token` field
    - **Cookie**: `refresh_token` httpOnly cookie (sent automatically by browsers)

    Returns a new access token and updates the `access_token` cookie.
    """,
)
async def refresh_token(
    http_request: Request,
    response: Response,
    request: TokenRefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Refresh access token using refresh token from body or cookie."""
    # Accept refresh token from JSON body or httpOnly cookie
    token = request.refresh_token or http_request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is required",
        )
    auth_service = AuthService(db)
    result = await auth_service.refresh_access_token(token)
    # Refresh the access_token cookie
    is_secure = settings.is_production
    response.set_cookie(
        key="access_token",
        value=result.access_token,
        httponly=True,
        secure=is_secure,
        samesite=_COOKIE_SAMESITE,
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return result


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
)
async def get_current_user(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Get current authenticated user information, including onboarding status."""
    from app.models.tenant import Tenant as TenantModel
    auth_service = AuthService(db)
    user = await auth_service.get_current_user(user_id)
    tenant = await db.get(TenantModel, user.tenant_id)
    needs_onboarding = not bool(
        tenant.settings.get("onboarding_done") if tenant and tenant.settings else False
    )
    resp = UserResponse.model_validate(user)
    resp.needs_onboarding = needs_onboarding
    return resp


# ── 2FA endpoints ──────────────────────────────────────────────────────────────

@router.get(
    "/2fa/setup",
    response_model=TwoFactorSetupResponse,
    summary="Initiate 2FA setup — returns secret + provisioning URI",
)
async def setup_2fa(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    data = await auth_service.setup_2fa(user_id)
    return TwoFactorSetupResponse(**data)


@router.post(
    "/2fa/enable",
    response_model=TwoFactorEnableResponse,
    summary="Confirm 2FA setup with first TOTP code — activates 2FA and returns backup codes",
)
async def enable_2fa(
    body: TwoFactorEnableRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    data = await auth_service.enable_2fa(user_id, body.totp_code)
    return TwoFactorEnableResponse(**data)


@router.post(
    "/2fa/disable",
    response_model=MessageResponse,
    summary="Disable 2FA — requires current password",
)
async def disable_2fa(
    body: TwoFactorDisableRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    await auth_service.disable_2fa(user_id, body.password)
    return MessageResponse(message="2FA désactivé avec succès")


@router.post(
    "/2fa/verify",
    response_model=LoginResponse,
    summary="Complete login when 2FA is required",
)
async def verify_2fa(
    body: TwoFactorVerifyRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Verify TOTP code (or backup code) and issue full JWT tokens."""
    auth_service = AuthService(db)
    result = await auth_service.verify_2fa_login(body.temp_token, body.totp_code)
    if result.tokens:
        _set_auth_cookies(response, result.tokens)
    return result


@router.post(
    "/demo-login",
    summary="Auto-login as shared read-only demo account",
    description="""
    Issues short-lived tokens (8 h) for the shared demo account.
    Looks up or creates the demo user on first call.
    No credentials required — intended for the public demo page.
    """,
)
async def demo_login(db: AsyncSession = Depends(get_db)):
    """
    Auto-login as the shared read-only demo account.
    Creates the demo user on first call (piggybacks on the admin tenant
    so the demo sees real pre-populated ESG data).
    """
    from datetime import datetime, timezone, timedelta
    from uuid import uuid4 as _uuid4
    from sqlalchemy.orm import selectinload
    from app.models.user import User
    from app.utils.jwt import create_access_token
    from app.utils.security import get_password_hash

    DEMO_EMAIL = "demo@greenconnect.cloud"

    # 1. Lookup or create demo user
    result = await db.execute(
        select(User)
        .options(selectinload(User.role))
        .where(User.email == DEMO_EMAIL)
    )
    demo_user = result.scalar_one_or_none()

    if not demo_user:
        # Reuse admin tenant so demo shows real data; fallback to own tenant
        admin_res = await db.execute(
            select(User).where(User.email == "admin@greenconnect.cloud")
        )
        admin = admin_res.scalar_one_or_none()

        if admin:
            tenant_id = admin.tenant_id
        else:
            # No admin — create a standalone demo tenant
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
            id=_uuid4(),
            tenant_id=tenant_id,
            email=DEMO_EMAIL,
            # Random hash — demo account is never logged-in with a password
            password_hash=get_password_hash(str(_uuid4())),
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
        expires_delta=timedelta(hours=8),
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


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request password reset email",
)
async def forgot_password(
    request: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Send password reset email. Always returns success to prevent user enumeration."""
    from sqlalchemy import select
    from app.models.user import User
    from app.utils.jwt import create_password_reset_token
    from app.services.email_service import EmailService

    stmt = select(User).where(User.email == request.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user and user.is_active:
        token = create_password_reset_token(user.email, user.id)
        reset_url = f"{settings.APP_URL}/reset-password?token={token}"
        try:
            from app.tasks.email_tasks import send_password_reset_email
            send_password_reset_email.delay(
                email=user.email,
                first_name=user.first_name or "",
                reset_url=reset_url,
            )
        except Exception:
            pass  # Never reveal email errors to caller

    return MessageResponse(message="Si cet email est enregistré, vous recevrez les instructions de réinitialisation.")


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Confirm password reset with token",
)
async def reset_password(
    request: PasswordResetConfirmRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Verify reset token and set new password."""
    from jose import JWTError
    from uuid import UUID as _UUID
    from sqlalchemy import select
    from app.models.user import User
    from app.utils.jwt import decode_token
    from app.utils.security import get_password_hash

    try:
        payload = decode_token(request.token)
        if payload.get("type") != "password_reset":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token invalide ou expiré.")
        user_id = _UUID(payload["user_id"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token invalide ou expiré.")

    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token invalide ou expiré.")

    user.password_hash = get_password_hash(request.new_password)
    await db.commit()
    return MessageResponse(message="Mot de passe réinitialisé avec succès.")


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update current user profile",
)
async def update_profile(
    request: ProfileUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Update first name, last name, or job title."""
    from app.models.user import User
    from app.models.tenant import Tenant as TenantModel

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if request.first_name is not None:
        user.first_name = request.first_name
    if request.last_name is not None:
        user.last_name = request.last_name
    if request.job_title is not None:
        user.job_title = request.job_title

    await db.commit()
    await db.refresh(user)

    tenant = await db.get(TenantModel, user.tenant_id)
    needs_onboarding = not bool(
        tenant.settings.get("onboarding_done") if tenant and tenant.settings else False
    )
    resp = UserResponse.model_validate(user)
    resp.needs_onboarding = needs_onboarding
    return resp


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change password",
    description="""
    Change password for currently authenticated user.
    
    Requires:
    - Current password for verification
    - New password meeting security requirements
    """,
)
async def change_password(
    request: PasswordChangeRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Change user password."""
    auth_service = AuthService(db)
    await auth_service.change_password(
        user_id=user_id,
        current_password=request.current_password,
        new_password=request.new_password,
    )
    
    return MessageResponse(message="Password changed successfully")


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Logout",
    description="""
    Logout current user.

    Clears the `access_token` and `refresh_token` httpOnly cookies.
    For API clients using Bearer tokens, simply discard the token client-side.
    """,
)
async def logout(
    response: Response,
    user_id: UUID = Depends(get_current_user_id),
) -> MessageResponse:
    """Logout user and clear auth cookies."""
    _clear_auth_cookies(response)
    return MessageResponse(message="Logged out successfully")