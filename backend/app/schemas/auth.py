"""
Pydantic schemas for authentication endpoints.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


# ============================================================================
# Request Schemas
# ============================================================================

class UserRegisterRequest(BaseModel):
    """Request schema for user registration."""
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password (min 8 chars)")
    first_name: Optional[str] = Field(None, max_length=100, description="First name")
    last_name: Optional[str] = Field(None, max_length=100, description="Last name")
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        from app.utils.security import validate_password_strength
        
        is_valid, error_msg = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_msg)
        
        return v


class TenantOnboardRequest(BaseModel):
    """Request schema for tenant onboarding (self-service registration)."""
    
    # Tenant info
    tenant_name: str = Field(..., min_length=2, max_length=255, description="Company/Organization name")
    tenant_slug: str = Field(
        ...,
        min_length=2,
        max_length=100,
        pattern="^[a-z0-9-]+$",
        description="URL-safe identifier (lowercase, numbers, hyphens only)",
    )
    plan_tier: str = Field(
        default="starter",
        pattern="^(starter|pro|enterprise)$",
        description="Subscription plan",
    )
    
    # Admin user
    admin_email: EmailStr = Field(..., description="Admin user email")
    admin_password: str = Field(..., min_length=8, description="Admin password")
    admin_first_name: str = Field(..., max_length=100, description="Admin first name")
    admin_last_name: str = Field(..., max_length=100, description="Admin last name")
    
    # Organization (optional)
    org_name: Optional[str] = Field(None, max_length=255, description="Initial organization name")
    org_siren: Optional[str] = Field(None, max_length=20, description="SIREN number")
    org_sector_code: Optional[str] = Field(None, max_length=20, description="NACE sector code")
    org_country_code: Optional[str] = Field(None, max_length=3, description="ISO country code")
    org_employee_count: Optional[int] = Field(None, ge=0, description="Number of employees")
    
    @field_validator("admin_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate admin password strength."""
        from app.utils.security import validate_password_strength
        
        is_valid, error_msg = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_msg)
        
        return v


class UserLoginRequest(BaseModel):
    """Request schema for user login."""
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class TokenRefreshRequest(BaseModel):
    """Request schema for token refresh."""

    refresh_token: Optional[str] = Field(None, description="Refresh token (cookie used as fallback)")


class PasswordChangeRequest(BaseModel):
    """Request schema for password change."""
    
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")
    
    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        """Validate new password strength."""
        from app.utils.security import validate_password_strength
        
        is_valid, error_msg = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_msg)
        
        return v


class PasswordResetRequest(BaseModel):
    """Request schema for password reset (forgot password)."""
    
    email: EmailStr = Field(..., description="User email address")


class PasswordResetConfirmRequest(BaseModel):
    """Request schema for confirming password reset."""
    
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, description="New password")
    
    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        """Validate new password strength."""
        from app.utils.security import validate_password_strength
        
        is_valid, error_msg = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_msg)
        
        return v


class EmailVerificationRequest(BaseModel):
    """Request schema for email verification."""

    token: str = Field(..., description="Email verification token")


class ProfileUpdateRequest(BaseModel):
    """Request schema for updating user profile."""

    first_name: Optional[str] = Field(None, max_length=100, description="First name")
    last_name: Optional[str] = Field(None, max_length=100, description="Last name")
    job_title: Optional[str] = Field(None, max_length=150, description="Job title")


# ============================================================================
# Response Schemas
# ============================================================================

class TokenResponse(BaseModel):
    """Response schema for authentication tokens."""
    
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Access token expiration time in seconds")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 1800,
            }
        }
    }


class UserResponse(BaseModel):
    """Response schema for user information."""

    id: UUID
    tenant_id: UUID
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    job_title: Optional[str]
    is_active: bool
    email_verified_at: Optional[datetime]
    created_at: datetime
    mfa_enabled: bool = False
    needs_onboarding: bool = False  # Injected by endpoint, not a DB field

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "tenant_id": "660e8400-e29b-41d4-a716-446655440001",
                "email": "user@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "job_title": "ESG Manager",
                "is_active": True,
                "email_verified_at": "2025-02-11T10:00:00Z",
                "created_at": "2025-02-01T10:00:00Z",
                "mfa_enabled": False,
                "needs_onboarding": False,
            }
        }
    }


class LoginResponse(BaseModel):
    """Response schema for successful login.

    If ``requires_2fa`` is True, the tokens field is None and the frontend must
    call POST /auth/2fa/verify with the ``temp_token`` + the TOTP code.
    """
    user: UserResponse
    tokens: Optional[TokenResponse] = None
    requires_2fa: bool = False
    temp_token: Optional[str] = None  # Short-lived token (5 min) for 2FA step

    model_config = {
        "json_schema_extra": {
            "example": {
                "user": {"id": "550e8400-e29b-41d4-a716-446655440000", "email": "user@example.com"},
                "tokens": {
                    "access_token": "eyJ...",
                    "refresh_token": "eyJ...",
                    "token_type": "bearer",
                    "expires_in": 1800,
                },
                "requires_2fa": False,
            }
        }
    }


class TwoFactorSetupResponse(BaseModel):
    """Response for GET /auth/2fa/setup — returns secret + provisioning URI."""
    secret: str
    uri: str  # otpauth:// URI for QR code generation


class TwoFactorEnableRequest(BaseModel):
    """Confirm 2FA setup by verifying first TOTP code."""
    totp_code: str = Field(..., min_length=6, max_length=8)


class TwoFactorEnableResponse(BaseModel):
    """Returns single-use backup codes after enabling 2FA."""
    backup_codes: list[str]
    message: str = "2FA activé avec succès"


class TwoFactorDisableRequest(BaseModel):
    """Disable 2FA — requires current password."""
    password: str


class TwoFactorVerifyRequest(BaseModel):
    """Complete login when 2FA is required."""
    temp_token: str
    totp_code: str = Field(..., min_length=6, max_length=8)


class OnboardResponse(BaseModel):
    """Response schema for successful tenant onboarding."""
    
    tenant_id: UUID
    tenant_slug: str
    admin_user_id: UUID
    organization_id: Optional[UUID]
    api_key: str
    onboarded_at: datetime
    next_steps: list[str]
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
                "tenant_slug": "acme-corp",
                "admin_user_id": "660e8400-e29b-41d4-a716-446655440001",
                "organization_id": "770e8400-e29b-41d4-a716-446655440002",
                "api_key": "esgflow_live_1234567890abcdef",
                "onboarded_at": "2025-02-11T10:30:00Z",
                "next_steps": [
                    "Configure methodology",
                    "Upload first data",
                    "Invite team members",
                ],
            }
        }
    }


class MessageResponse(BaseModel):
    """Generic message response."""
    
    message: str = Field(..., description="Response message")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "Operation completed successfully",
            }
        }
    }