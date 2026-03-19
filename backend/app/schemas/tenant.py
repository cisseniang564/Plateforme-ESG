# ============================================================================
# Fichier: /home/claude/esg-saas-platform/backend/app/schemas/tenant.py
# Description: Schemas Pydantic pour Tenants
# ============================================================================

"""
Pydantic schemas for Tenant endpoints.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ============================================================================
# Request Schemas
# ============================================================================

class TenantUpdateRequest(BaseModel):
    """Request schema for updating tenant settings."""
    
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    billing_email: Optional[EmailStr] = None
    settings: Optional[dict] = Field(None, description="Tenant-specific settings (JSON)")
    feature_flags: Optional[dict] = Field(None, description="Feature flags (JSON)")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Accor Hotels SA",
                "billing_email": "billing@accor.com",
                "settings": {
                    "default_currency": "EUR",
                    "fiscal_year_start": "01-01",
                    "data_retention_years": 7,
                },
                "feature_flags": {
                    "advanced_analytics": True,
                    "api_access": True,
                    "custom_reports": False,
                }
            }
        }
    }


# ============================================================================
# Response Schemas
# ============================================================================

class TenantResponse(BaseModel):
    """Response schema for tenant."""
    
    id: UUID
    name: str
    slug: str
    plan_tier: str
    status: str
    
    billing_email: Optional[str]
    stripe_customer_id: Optional[str]
    
    settings: dict
    feature_flags: dict
    
    # Limits
    max_users: int
    max_orgs: int
    max_monthly_api_calls: Optional[int]
    data_retention_months: int
    
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Demo Company",
                "slug": "demo-company",
                "plan_tier": "pro",
                "status": "active",
                "billing_email": "billing@demo.com",
                "max_users": 50,
                "max_orgs": 100,
                "max_monthly_api_calls": 100000,
                "data_retention_months": 36,
            }
        }
    }


class TenantStatsResponse(BaseModel):
    """Statistics about the tenant."""
    
    # Usage
    total_users: int
    active_users: int
    total_organizations: int
    active_organizations: int
    
    # Limits
    max_users: int
    max_orgs: int
    users_remaining: int
    orgs_remaining: int
    
    # API usage (last 30 days)
    api_calls_last_30_days: int
    api_calls_limit: Optional[int]
    
    # Storage
    storage_used_mb: float = Field(0, description="Storage used in MB")
    storage_limit_mb: Optional[float] = Field(None, description="Storage limit in MB")
    
    # Billing
    plan_tier: str
    billing_status: str
    next_billing_date: Optional[datetime] = None
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "total_users": 25,
                "active_users": 23,
                "total_organizations": 45,
                "active_organizations": 42,
                "max_users": 50,
                "max_orgs": 100,
                "users_remaining": 25,
                "orgs_remaining": 55,
                "api_calls_last_30_days": 45678,
                "api_calls_limit": 100000,
                "storage_used_mb": 2456.7,
                "storage_limit_mb": 50000.0,
                "plan_tier": "pro",
                "billing_status": "active",
            }
        }
    }


class TenantUsageResponse(BaseModel):
    """Detailed usage metrics for the tenant."""
    
    period: str = Field(..., description="Period (e.g., '2024-02', 'last_30_days')")
    
    # Users
    user_logins: int = Field(0, description="Number of user logins")
    unique_users: int = Field(0, description="Unique users who logged in")
    
    # API
    api_calls: int = Field(0, description="Total API calls")
    api_calls_by_endpoint: dict[str, int] = Field(default_factory=dict)
    
    # Data
    data_uploads: int = Field(0, description="Number of data uploads")
    data_uploads_size_mb: float = Field(0, description="Total upload size in MB")
    
    # Scoring
    scores_calculated: int = Field(0, description="Number of scores calculated")
    reports_generated: int = Field(0, description="Number of reports generated")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "period": "2024-02",
                "user_logins": 456,
                "unique_users": 23,
                "api_calls": 45678,
                "api_calls_by_endpoint": {
                    "/api/v1/organizations": 1234,
                    "/api/v1/users": 567,
                    "/api/v1/data/upload": 89,
                },
                "data_uploads": 89,
                "data_uploads_size_mb": 1234.5,
                "scores_calculated": 234,
                "reports_generated": 45,
            }
        }
    }


class TenantFeatureResponse(BaseModel):
    """Available features for the tenant's plan."""
    
    plan_tier: str
    
    # Core features (always available)
    core_features: list[str] = Field(
        default_factory=lambda: [
            "user_management",
            "organization_hierarchy",
            "basic_reporting",
        ]
    )
    
    # Plan-specific features
    available_features: list[str] = Field(default_factory=list)
    unavailable_features: list[str] = Field(default_factory=list)
    
    # Feature flags (custom toggles)
    feature_flags: dict[str, bool] = Field(default_factory=dict)
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "plan_tier": "pro",
                "core_features": [
                    "user_management",
                    "organization_hierarchy",
                    "basic_reporting",
                ],
                "available_features": [
                    "advanced_analytics",
                    "api_access",
                    "custom_reports",
                    "data_export",
                    "audit_trail",
                ],
                "unavailable_features": [
                    "white_label",
                    "dedicated_support",
                    "custom_integrations",
                ],
                "feature_flags": {
                    "beta_features": True,
                    "ai_insights": False,
                }
            }
        }
    }