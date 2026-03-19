"""
Authentication API routes.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.schemas.auth import (
    LoginResponse,
    MessageResponse,
    OnboardResponse,
    PasswordChangeRequest,
    TenantOnboardRequest,
    TokenRefreshRequest,
    TokenResponse,
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
    description="""
    Get information about the currently authenticated user.
    
    Requires valid access token in Authorization header.
    """,
)
async def get_current_user(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Get current authenticated user information."""
    auth_service = AuthService(db)
    user = await auth_service.get_current_user(user_id)
    
    return UserResponse.model_validate(user)


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