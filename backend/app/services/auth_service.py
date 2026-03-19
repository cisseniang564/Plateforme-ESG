"""
Authentication service - Business logic for auth operations.
"""
import secrets
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.organization import Organization
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.auth import (
    LoginResponse,
    OnboardResponse,
    TenantOnboardRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.utils.jwt import create_access_token, create_refresh_token, decode_token
from app.utils.security import get_password_hash, verify_password


class AuthService:
    """Service for authentication operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def register_user(
        self,
        tenant_id: UUID,
        request: UserRegisterRequest,
    ) -> User:
        """
        Register a new user for existing tenant.
        
        Args:
            tenant_id: Tenant UUID
            request: User registration data
        
        Returns:
            Created User instance
        
        Raises:
            HTTPException: If email already exists or tenant not found
        """
        # Check if tenant exists
        tenant = await self.db.get(Tenant, tenant_id)
        if not tenant or not tenant.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found or inactive",
            )
        
        # Check if email already exists
        stmt = select(User).where(User.email == request.email)
        result = await self.db.execute(stmt)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        
        # Check user limit — COUNT at the database level, never load all rows
        count_stmt = select(func.count(User.id)).where(User.tenant_id == tenant_id)
        user_count: int = (await self.db.execute(count_stmt)).scalar_one()
        
        if not tenant.can_create_user(user_count):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User limit reached for plan {tenant.plan_tier}",
            )
        
        # Create user
        user = User(
            tenant_id=tenant_id,
            email=request.email,
            password_hash=get_password_hash(request.password),
            first_name=request.first_name,
            last_name=request.last_name,
            auth_provider="local",
        )
        
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        
        return user
    
    async def login(self, request: UserLoginRequest) -> LoginResponse:
        """
        Authenticate user and return tokens.
        
        Args:
            request: Login credentials
        
        Returns:
            LoginResponse with user info and tokens
        
        Raises:
            HTTPException: If credentials are invalid
        """
        # Find user by email
        stmt = select(User).where(User.email == request.email)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )
        
        # Verify password
        if not user.password_hash or not verify_password(
            request.password, user.password_hash
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive",
            )
        
        # Check if tenant is active
        tenant = await self.db.get(Tenant, user.tenant_id)
        if not tenant or not tenant.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant account is inactive",
            )
        
        # Update last login
        user.update_last_login()
        await self.db.commit()
        
        # Generate tokens
        access_token = create_access_token(
            subject=user.email,
            tenant_id=user.tenant_id,
            user_id=user.id,
        )
        
        refresh_token = create_refresh_token(
            subject=user.email,
            tenant_id=user.tenant_id,
            user_id=user.id,
        )
        
        return LoginResponse(
            user=UserResponse.model_validate(user),
            tokens=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            ),
        )
    
    async def refresh_access_token(self, refresh_token: str) -> TokenResponse:
        """
        Refresh access token using refresh token.
        
        Args:
            refresh_token: Valid refresh token
        
        Returns:
            New TokenResponse with fresh access token
        
        Raises:
            HTTPException: If refresh token is invalid
        """
        try:
            payload = decode_token(refresh_token)

            # Verify it's a refresh token
            if payload.get("type") != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type",
                )

            # Extract user info
            email = payload.get("sub")
            tenant_id = UUID(payload["tenant_id"])
            user_id = UUID(payload["user_id"])

            # Verify user still exists and is active
            user = await self.db.get(User, user_id)
            if not user or not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found or inactive",
                )

            # Generate new access token
            new_access_token = create_access_token(
                subject=email,
                tenant_id=tenant_id,
                user_id=user_id,
            )

            return TokenResponse(
                access_token=new_access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            )

        except HTTPException:
            raise
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate refresh token",
            )
    
    async def onboard_tenant(
        self,
        request: TenantOnboardRequest,
    ) -> OnboardResponse:
        """
        Onboard new tenant with admin user and optional organization.
        
        This is the self-service registration endpoint.
        
        Args:
            request: Tenant onboarding data
        
        Returns:
            OnboardResponse with tenant, user, and org details
        
        Raises:
            HTTPException: If slug already exists
        """
        # Check if slug is available
        stmt = select(Tenant).where(Tenant.slug == request.tenant_slug)
        result = await self.db.execute(stmt)
        existing_tenant = result.scalar_one_or_none()
        
        if existing_tenant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Slug '{request.tenant_slug}' is already taken",
            )
        
        # Check if admin email already exists
        stmt = select(User).where(User.email == request.admin_email)
        result = await self.db.execute(stmt)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        
        # Create tenant
        tenant = Tenant(
            name=request.tenant_name,
            slug=request.tenant_slug,
            plan_tier=request.plan_tier,
            status="active",
        )
        self.db.add(tenant)
        await self.db.flush()  # Get tenant.id
        
        # Create admin user
        admin_user = User(
            tenant_id=tenant.id,
            email=request.admin_email,
            password_hash=get_password_hash(request.admin_password),
            first_name=request.admin_first_name,
            last_name=request.admin_last_name,
            auth_provider="local",
        )
        admin_user.verify_email()  # Auto-verify for self-registration
        self.db.add(admin_user)
        await self.db.flush()
        
        # Create organization if provided
        organization_id = None
        if request.org_name:
            org = Organization(
                tenant_id=tenant.id,
                name=request.org_name,
                org_type="group",
                siren=request.org_siren,
                sector_code=request.org_sector_code,
                country_code=request.org_country_code,
                employee_count=request.org_employee_count,
            )
            self.db.add(org)
            await self.db.flush()
            organization_id = org.id
        
        await self.db.commit()
        
        # Generate a cryptographically secure API key
        api_key = f"esgflow_live_{secrets.token_urlsafe(32)}"
        
        return OnboardResponse(
            tenant_id=tenant.id,
            tenant_slug=tenant.slug,
            admin_user_id=admin_user.id,
            organization_id=organization_id,
            api_key=api_key,
            onboarded_at=datetime.now(timezone.utc),
            next_steps=[
                "Configure ESG methodology",
                "Upload first data set",
                "Invite team members",
                "Explore dashboard",
            ],
        )
    
    async def get_current_user(self, user_id: UUID) -> User:
        """
        Get current authenticated user.
        
        Args:
            user_id: User UUID from token
        
        Returns:
            User instance
        
        Raises:
            HTTPException: If user not found
        """
        user = await self.db.get(User, user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        return user
    
    async def change_password(
        self,
        user_id: UUID,
        current_password: str,
        new_password: str,
    ) -> bool:
        """
        Change user password.
        
        Args:
            user_id: User UUID
            current_password: Current password for verification
            new_password: New password
        
        Returns:
            True if successful
        
        Raises:
            HTTPException: If current password is incorrect
        """
        user = await self.db.get(User, user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        # Verify current password
        if not user.password_hash or not verify_password(
            current_password, user.password_hash
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect current password",
            )
        
        # Update password
        user.password_hash = get_password_hash(new_password)
        await self.db.commit()
        
        return True