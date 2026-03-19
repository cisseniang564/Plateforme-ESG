# ============================================================================
# Fichier: /home/claude/esg-saas-platform/backend/app/schemas/user.py
# Description: Schemas Pydantic pour Users
# ============================================================================

"""
Pydantic schemas for User endpoints.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


# ============================================================================
# Request Schemas
# ============================================================================

class UserCreateRequest(BaseModel):
    """Request schema for creating a user."""
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(
        ...,
        min_length=8,
        description="Password (min 8 chars, must contain uppercase, lowercase, number, special char)",
    )
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    job_title: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    locale: str = Field("en", max_length=10, description="Locale (e.g., en, fr)")
    timezone: str = Field("UTC", max_length=50, description="Timezone")
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain number")
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in v):
            raise ValueError("Password must contain special character")
        return v
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "john.doe@company.com",
                "password": "SecurePass123!",
                "first_name": "John",
                "last_name": "Doe",
                "job_title": "ESG Manager",
                "phone": "+33 1 23 45 67 89",
                "locale": "fr",
                "timezone": "Europe/Paris",
            }
        }
    }


class UserUpdateRequest(BaseModel):
    """Request schema for updating a user."""
    
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    job_title: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    locale: Optional[str] = Field(None, max_length=10)
    timezone: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "job_title": "Senior ESG Manager",
                "phone": "+33 1 98 76 54 32",
            }
        }
    }


class UserRoleAssignRequest(BaseModel):
    """Request schema for assigning roles to user."""
    
    role_id: UUID = Field(..., description="Role UUID to assign")
    org_id: Optional[UUID] = Field(None, description="Organization scope (optional)")
    expires_at: Optional[datetime] = Field(None, description="Role expiration date")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "role_id": "550e8400-e29b-41d4-a716-446655440000",
                "org_id": "660e8400-e29b-41d4-a716-446655440001",
                "expires_at": "2025-12-31T23:59:59Z",
            }
        }
    }


# ============================================================================
# Response Schemas
# ============================================================================

class UserResponse(BaseModel):
    """Response schema for user."""
    
    id: UUID
    tenant_id: UUID
    email: EmailStr
    
    first_name: str
    last_name: str
    job_title: Optional[str]
    phone: Optional[str]
    
    auth_provider: str
    is_active: bool
    email_verified_at: Optional[datetime]
    last_login_at: Optional[datetime]
    
    locale: str
    timezone: str
    
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "tenant_id": "660e8400-e29b-41d4-a716-446655440001",
                "email": "john.doe@company.com",
                "first_name": "John",
                "last_name": "Doe",
                "job_title": "ESG Manager",
                "auth_provider": "local",
                "is_active": True,
                "email_verified_at": "2024-01-15T10:30:00Z",
                "last_login_at": "2024-02-15T09:15:00Z",
                "locale": "en",
                "timezone": "UTC",
            }
        }
    }


class RoleAssignmentResponse(BaseModel):
    """Response schema for user role assignment."""
    
    id: UUID
    user_id: UUID
    role_id: UUID
    org_id: Optional[UUID]
    granted_at: datetime
    granted_by: Optional[UUID]
    expires_at: Optional[datetime]
    
    model_config = {"from_attributes": True}


class UserWithRolesResponse(UserResponse):
    """User response with roles included."""
    
    roles: list[RoleAssignmentResponse] = []


class UserListResponse(BaseModel):
    """Response for list of users."""
    
    total: int = Field(..., description="Total number of users")
    items: list[UserResponse]
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "total": 5,
                "items": [
                    {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "email": "admin@company.com",
                        "first_name": "Admin",
                        "last_name": "User",
                        "is_active": True,
                    }
                ]
            }
        }
    }


class UserStatsResponse(BaseModel):
    """Statistics about users."""
    
    total_users: int
    active_users: int
    inactive_users: int
    verified_users: int
    users_by_role: dict[str, int] = Field(default_factory=dict)
    recent_logins: int = Field(..., description="Logins in last 30 days")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "total_users": 25,
                "active_users": 23,
                "inactive_users": 2,
                "verified_users": 20,
                "users_by_role": {
                    "esg_admin": 5,
                    "esg_manager": 10,
                    "data_contributor": 8,
                    "viewer": 2,
                },
                "recent_logins": 18,
            }
        }
    }