# ============================================================================
# Fichier: /home/claude/esg-saas-platform/backend/app/api/v1/tenants.py
# Description: API endpoints pour la gestion des tenants
# ============================================================================

"""
Tenant API endpoints.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_tenant_id
from app.schemas.tenant import (
    TenantFeatureResponse,
    TenantResponse,
    TenantStatsResponse,
    TenantUpdateRequest,
    TenantUsageResponse,
)
from app.services.tenant_service import TenantService

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.get(
    "/me",
    response_model=TenantResponse,
    summary="Get current tenant",
    description="Get information about the current tenant.",
)
async def get_current_tenant(
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current tenant information.
    
    **Returns:**
    - Tenant details
    - Plan tier and limits
    - Settings and feature flags
    - Billing information
    
    **Use cases:**
    - Display tenant info in UI
    - Check plan limits
    - Verify feature availability
    
    **Example response:**
    ```json
    {
      "id": "...",
      "name": "Demo Company",
      "slug": "demo-company",
      "plan_tier": "pro",
      "status": "active",
      "max_users": 50,
      "max_orgs": 100,
      "settings": {...},
      "feature_flags": {...}
    }
    ```
    """
    service = TenantService(db, tenant_id)
    tenant = await service.get_tenant()
    return tenant


@router.put(
    "/me",
    response_model=TenantResponse,
    summary="Update tenant settings",
    description="Update tenant name, settings, or feature flags.",
)
async def update_tenant(
    request: TenantUpdateRequest,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Update tenant settings.
    
    **Request body:**
    - name: Tenant display name
    - billing_email: Billing contact email
    - settings: Custom settings (JSON)
    - feature_flags: Feature toggles (JSON)
    
    **Returns:**
    - Updated tenant
    
    **Examples:**
    - Update name: `{"name": "New Company Name"}`
    - Update billing: `{"billing_email": "finance@company.com"}`
    - Update settings: `{"settings": {"default_currency": "EUR"}}`
    - Toggle features: `{"feature_flags": {"beta_features": true}}`
    
    **Notes:**
    - Cannot change plan_tier (contact support)
    - Cannot change slug (permanent identifier)
    - Settings and feature_flags are merged (not replaced)
    """
    service = TenantService(db, tenant_id)
    tenant = await service.update_tenant(request)
    return tenant


@router.get(
    "/me/stats",
    response_model=TenantStatsResponse,
    summary="Get tenant statistics",
    description="Get usage statistics and limits for the tenant.",
)
async def get_tenant_stats(
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get tenant statistics and usage.
    
    **Returns:**
    - User counts (total, active, remaining)
    - Organization counts
    - API usage (last 30 days)
    - Storage usage
    - Plan limits
    - Billing status
    
    **Use cases:**
    - Dashboard overview
    - Capacity planning
    - Usage monitoring
    - Billing reconciliation
    
    **Example response:**
    ```json
    {
      "total_users": 25,
      "active_users": 23,
      "max_users": 50,
      "users_remaining": 25,
      "total_organizations": 45,
      "max_orgs": 100,
      "orgs_remaining": 55,
      "api_calls_last_30_days": 45678,
      "api_calls_limit": 100000,
      "plan_tier": "pro",
      "billing_status": "active"
    }
    ```
    """
    service = TenantService(db, tenant_id)
    stats = await service.get_stats()
    return stats


@router.get(
    "/me/usage",
    response_model=TenantUsageResponse,
    summary="Get tenant usage metrics",
    description="Get detailed usage metrics for a specific period.",
)
async def get_tenant_usage(
    period: str = Query(
        "last_30_days",
        description="Period: 'last_30_days' or 'YYYY-MM'",
    ),
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed usage metrics.
    
    **Query parameters:**
    - period: Time period to analyze
      - 'last_30_days': Last 30 days (default)
      - 'YYYY-MM': Specific month (e.g., '2024-02')
    
    **Returns:**
    - User activity (logins, unique users)
    - API usage (calls, by endpoint)
    - Data uploads (count, size)
    - Scoring activity
    - Reports generated
    
    **Use cases:**
    - Usage reports
    - Billing verification
    - Activity monitoring
    - Trend analysis
    
    **Examples:**
    - GET /tenants/me/usage
    - GET /tenants/me/usage?period=2024-02
    - GET /tenants/me/usage?period=last_30_days
    """
    service = TenantService(db, tenant_id)
    usage = await service.get_usage(period)
    return usage


@router.get(
    "/me/features",
    response_model=TenantFeatureResponse,
    summary="Get available features",
    description="Get list of available and unavailable features for the tenant's plan.",
)
async def get_tenant_features(
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get available features for current plan.
    
    **Returns:**
    - plan_tier: Current plan
    - core_features: Always available
    - available_features: Included in plan
    - unavailable_features: Require upgrade
    - feature_flags: Custom toggles
    
    **Use cases:**
    - Feature gating in UI
    - Plan comparison
    - Upgrade prompts
    - Feature discovery
    
    **Example response:**
    ```json
    {
      "plan_tier": "pro",
      "core_features": [
        "user_management",
        "organization_hierarchy",
        "basic_reporting"
      ],
      "available_features": [
        "advanced_analytics",
        "api_access",
        "custom_reports"
      ],
      "unavailable_features": [
        "white_label",
        "dedicated_support"
      ],
      "feature_flags": {
        "beta_features": true
      }
    }
    ```
    
    **Plan tiers:**
    - **starter**: Basic features
    - **pro**: Advanced features + API
    - **enterprise**: All features + custom
    """
    service = TenantService(db, tenant_id)
    features = await service.get_features()
    return features