"""
Authentication service - Business logic for auth operations.
"""
import secrets
from datetime import datetime, timezone, timedelta
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
    TwoFactorSetupResponse,
    TwoFactorEnableResponse,
)
from app.utils.jwt import create_access_token, create_refresh_token, create_2fa_temp_token, decode_token
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

        # Notify the newly added user (fire-and-forget)
        from app.services.email_service import EmailService
        from app.config import settings as app_settings
        EmailService.send_user_invited(
            email=user.email,
            inviter_name=tenant.name,
            company=tenant.name,
            invite_url=f"{app_settings.APP_URL}/login",
        )

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

        # ── Compute needs_onboarding ──────────────────────────────────────
        needs_onboarding = not bool(
            tenant.settings.get("onboarding_done") if tenant.settings else False
        )
        user_resp = UserResponse.model_validate(user)
        user_resp.needs_onboarding = needs_onboarding

        # ── 2FA gate ──────────────────────────────────────────────────────
        if getattr(user, "mfa_enabled", False):
            temp_token = create_2fa_temp_token(user_id=user.id)
            return LoginResponse(
                user=user_resp,
                requires_2fa=True,
                temp_token=temp_token,
            )

        # Generate full tokens
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
            user=user_resp,
            tokens=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            ),
        )
    
    async def demo_login(self) -> LoginResponse:
        """
        Log in instantly as the pre-seeded demo account.
        Looks up admin@demo.esgflow.com and issues full JWT tokens.
        If the demo account doesn't exist yet it is created on the fly.
        """
        DEMO_EMAIL = "admin@demo.esgflow.com"
        DEMO_PASSWORD = "Admin123!"

        stmt = select(User).where(User.email == DEMO_EMAIL)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            # Auto-provision demo tenant + admin if seed script hasn't run
            from app.schemas.auth import TenantOnboardRequest
            onboard_req = TenantOnboardRequest(
                tenant_name="ESGFlow Demo",
                tenant_slug="demo",
                plan_tier="pro",
                admin_email=DEMO_EMAIL,
                admin_password=DEMO_PASSWORD,
                admin_first_name="Admin",
                admin_last_name="Demo",
                org_name="ESGFlow Demo Corp",
            )
            try:
                await self.onboard_tenant(onboard_req)
                result2 = await self.db.execute(select(User).where(User.email == DEMO_EMAIL))
                user = result2.scalar_one_or_none()
            except Exception:
                pass

        if not user:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Demo account not available. Please try again later.",
            )

        tenant = await self.db.get(Tenant, user.tenant_id)
        needs_onboarding = not bool(
            tenant.settings.get("onboarding_done") if tenant and tenant.settings else False
        )

        user_resp = UserResponse.model_validate(user)
        user_resp.needs_onboarding = needs_onboarding

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
            user=user_resp,
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

        # Assign tenant_admin role to the admin user (non-blocking)
        try:
            from app.models.role import Role
            role_result = await self.db.execute(
                select(Role).where(Role.name == "tenant_admin", Role.is_system_role == True)
            )
            tenant_admin_role = role_result.scalar_one_or_none()
            if tenant_admin_role:
                admin_user.role_id = tenant_admin_role.id
        except Exception:
            pass  # Non-blocking — role assignment failure never breaks registration
        
        # Create organization if provided
        organization_id = None
        if request.org_name:
            org = Organization(
                tenant_id=tenant.id,
                name=request.org_name,
                org_type="company",
                external_id=getattr(request, "org_siren", None),
                industry=getattr(request, "org_sector_code", None),
                custom_data={
                    k: v for k, v in {
                        "siren": getattr(request, "org_siren", None),
                        "country_code": getattr(request, "org_country_code", None),
                        "employee_count": getattr(request, "org_employee_count", None),
                    }.items() if v is not None
                },
            )
            self.db.add(org)
            await self.db.flush()
            organization_id = org.id
        
        # Set trial period on the tenant
        try:
            from app.config import settings as app_settings
            from app.services.stripe_service import PLAN_CONFIGS
            trial_days = getattr(app_settings, 'TRIAL_DAYS', 14)
            pro_cfg = PLAN_CONFIGS.get('pro', {})
            tenant.plan_tier = 'pro'
            tenant.max_users = pro_cfg.get('max_users', 50)
            tenant.max_orgs = pro_cfg.get('max_orgs', 100)
            tenant.max_monthly_api_calls = pro_cfg.get('max_monthly_api_calls', 100_000)
            tenant.data_retention_months = pro_cfg.get('data_retention_months', 36)
            tenant.trial_ends_at = datetime.now(timezone.utc) + timedelta(days=trial_days)
            tenant.stripe_subscription_status = 'trialing'
        except Exception:
            pass  # Non-blocking

        await self.db.commit()

        # Stripe customer (optional, non-blocking)
        try:
            from app.services.stripe_service import StripeService
            cid = StripeService.create_customer(
                email=admin_user.email,
                name=tenant.name,
                tenant_id=str(tenant.id),
            )
            tenant.stripe_customer_id = cid
            await self.db.commit()
        except Exception:
            pass  # Non-blocking

        # Send welcome + trial emails (fire-and-forget)
        from app.services.email_service import EmailService
        trial_end = (datetime.now(timezone.utc) + timedelta(days=14)).strftime("%d/%m/%Y")
        EmailService.send_welcome(
            email=admin_user.email,
            first_name=admin_user.first_name or "",
            company=tenant.name,
        )
        EmailService.send_trial_started(
            email=admin_user.email,
            first_name=admin_user.first_name or "",
            company=tenant.name,
            trial_end=trial_end,
        )

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

        from app.services.email_service import EmailService
        EmailService.send_password_changed(
            email=user.email,
            first_name=user.first_name or "",
        )

        return True

    # ── 2FA / TOTP ────────────────────────────────────────────────────────────

    async def setup_2fa(self, user_id: UUID) -> dict:
        """Generate a TOTP secret and return the provisioning URI for QR code display.
        The secret is stored on the user but 2FA is NOT yet enabled — the user
        must confirm by calling ``enable_2fa()`` with a valid TOTP code.
        """
        import pyotp

        user = await self.db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(name=user.email, issuer_name="ESGFlow")

        # Persist secret (not yet enabled)
        user.totp_secret = secret
        await self.db.commit()

        return {"secret": secret, "uri": uri}

    async def enable_2fa(self, user_id: UUID, totp_code: str) -> dict:
        """Verify the first TOTP code and activate 2FA. Returns backup codes."""
        import pyotp, secrets as _secrets

        user = await self.db.get(User, user_id)
        if not user or not user.totp_secret:
            raise HTTPException(status_code=400, detail="Setup 2FA non commencé")

        if not pyotp.TOTP(user.totp_secret).verify(totp_code, valid_window=1):
            raise HTTPException(status_code=400, detail="Code invalide")

        backup_codes = [
            f"{_secrets.token_hex(3).upper()}-{_secrets.token_hex(3).upper()}"
            for _ in range(8)
        ]
        user.mfa_enabled = True
        user.mfa_backup_codes = backup_codes
        await self.db.commit()

        return {"backup_codes": backup_codes}

    async def disable_2fa(self, user_id: UUID, password: str) -> dict:
        """Disable 2FA after verifying the user's password."""
        user = await self.db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        if not user.password_hash or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=400, detail="Mot de passe incorrect")

        user.mfa_enabled = False
        user.totp_secret = None
        user.mfa_backup_codes = None
        await self.db.commit()
        return {"message": "2FA désactivé"}

    async def verify_2fa_login(self, temp_token: str, totp_code: str, response_obj=None) -> "LoginResponse":
        """Verify a TOTP code (or backup code) and issue full JWT tokens."""
        import pyotp
        from jose import JWTError as _JWTError

        try:
            payload = decode_token(temp_token)
            if payload.get("type") != "2fa_temp":
                raise ValueError("bad type")
            user_id = UUID(payload["user_id"])
        except Exception:
            raise HTTPException(status_code=401, detail="Token temporaire invalide ou expiré")

        user = await self.db.get(User, user_id)
        if not user or not getattr(user, "mfa_enabled", False) or not user.totp_secret:
            raise HTTPException(status_code=400, detail="2FA non configuré sur ce compte")

        totp = pyotp.TOTP(user.totp_secret)
        code_clean = totp_code.strip().upper().replace("-", "").replace(" ", "")

        if totp.verify(totp_code.strip(), valid_window=1):
            pass  # Valid TOTP
        elif user.mfa_backup_codes and code_clean in [
            c.replace("-", "") for c in (user.mfa_backup_codes or [])
        ]:
            # Consume the backup code
            remaining = [c for c in user.mfa_backup_codes if c.replace("-", "") != code_clean]
            user.mfa_backup_codes = remaining
            await self.db.commit()
        else:
            raise HTTPException(status_code=400, detail="Code invalide")

        tenant = await self.db.get(Tenant, user.tenant_id)
        needs_onboarding = not bool(
            tenant.settings.get("onboarding_done") if tenant and tenant.settings else False
        )

        access_token = create_access_token(subject=user.email, tenant_id=user.tenant_id, user_id=user.id)
        refresh_token_val = create_refresh_token(subject=user.email, tenant_id=user.tenant_id, user_id=user.id)

        user_resp = UserResponse.model_validate(user)
        user_resp.needs_onboarding = needs_onboarding

        return LoginResponse(
            user=user_resp,
            tokens=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token_val,
                token_type="bearer",
                expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            ),
        )