# ============================================================================
# Fichier: /home/claude/esg-saas-platform/backend/app/services/tenant_service.py
# Description: Service de gestion des tenants
# ============================================================================

"""
Tenant service - Business logic for tenant operations.
"""
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenant import TenantUpdateRequest


class TenantService:
    """Service for tenant operations."""
    
    def __init__(self, db: AsyncSession, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id
    
    async def get_tenant(self) -> Tenant:
        """
        Get tenant information.
        
        Returns:
            Tenant instance
        
        Raises:
            HTTPException 404: If tenant not found
        """
        tenant = await self.db.get(Tenant, self.tenant_id)
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found",
            )
        
        return tenant
    
    async def update_tenant(self, request: TenantUpdateRequest) -> Tenant:
        """
        Update tenant settings.
        
        Args:
            request: Update data
        
        Returns:
            Updated Tenant instance
        """
        tenant = await self.get_tenant()
        
        # Update fields
        update_data = request.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(tenant, field, value)
        
        await self.db.commit()
        await self.db.refresh(tenant)
        
        return tenant
    
    async def get_stats(self) -> dict:
        """
        Get tenant statistics.
        
        Returns:
            Dictionary with tenant stats
        """
        tenant = await self.get_tenant()
        
        # Count users
        stmt = select(func.count(User.id)).where(
            User.tenant_id == self.tenant_id
        )
        result = await self.db.execute(stmt)
        total_users = result.scalar() or 0
        
        # Count active users
        stmt = select(func.count(User.id)).where(
            User.tenant_id == self.tenant_id,
            User.is_active == True,
        )
        result = await self.db.execute(stmt)
        active_users = result.scalar() or 0
        
        # Count organizations
        stmt = select(func.count(Organization.id)).where(
            Organization.tenant_id == self.tenant_id
        )
        result = await self.db.execute(stmt)
        total_orgs = result.scalar() or 0
        
        # Count active organizations
        stmt = select(func.count(Organization.id)).where(
            Organization.tenant_id == self.tenant_id,
            Organization.is_active == True,
        )
        result = await self.db.execute(stmt)
        active_orgs = result.scalar() or 0
        
        # Calculate remaining capacity
        users_remaining = max(0, tenant.max_users - total_users)
        orgs_remaining = max(0, tenant.max_orgs - total_orgs)
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "total_organizations": total_orgs,
            "active_organizations": active_orgs,
            "max_users": tenant.max_users,
            "max_orgs": tenant.max_orgs,
            "users_remaining": users_remaining,
            "orgs_remaining": orgs_remaining,
            "api_calls_last_30_days": await self._get_api_calls_last_30_days(),
            "api_calls_limit": tenant.max_monthly_api_calls,
            "storage_used_mb": 0.0,
            "storage_limit_mb": None,
            "plan_tier": tenant.plan_tier,
            "billing_status": tenant.status,
            "next_billing_date": (
                tenant.stripe_current_period_end.isoformat()
                if getattr(tenant, "stripe_current_period_end", None)
                else None
            ),
        }
    
    async def get_usage(self, period: str = "last_30_days") -> dict:
        """
        Get detailed usage metrics.
        
        Args:
            period: Period to analyze
        
        Returns:
            Dictionary with usage metrics
        """
        # Calculate date range
        if period == "last_30_days":
            start_date = datetime.utcnow() - timedelta(days=30)
            end_date = datetime.utcnow()
        else:
            # Parse period as YYYY-MM
            start_date = datetime.utcnow() - timedelta(days=30)
            end_date = datetime.utcnow()
        
        # Count user logins in period
        stmt = select(func.count(User.id)).where(
            User.tenant_id == self.tenant_id,
            User.last_login_at >= start_date,
            User.last_login_at <= end_date,
        )
        result = await self.db.execute(stmt)
        user_logins = result.scalar() or 0
        
        # Count unique users
        stmt = select(func.count(func.distinct(User.id))).where(
            User.tenant_id == self.tenant_id,
            User.last_login_at >= start_date,
            User.last_login_at <= end_date,
        )
        result = await self.db.execute(stmt)
        unique_users = result.scalar() or 0
        
        api_calls = await self._get_api_calls_last_30_days()
        return {
            "period": period,
            "user_logins": user_logins,
            "unique_users": unique_users,
            "api_calls": api_calls,
            "api_calls_by_endpoint": {},
            "data_uploads": 0,
            "data_uploads_size_mb": 0.0,
            "scores_calculated": 0,
            "reports_generated": 0,
        }
    
    async def _get_api_calls_last_30_days(self) -> int:
        """Sum Redis daily API usage counters for the last 30 days."""
        try:
            import redis.asyncio as aioredis
            from app.config import settings as _cfg
            from datetime import date, timedelta
            redis_url = getattr(_cfg, "REDIS_URL", None) or "redis://redis:6379/0"
            r = aioredis.from_url(redis_url, decode_responses=True)
            total = 0
            today = date.today()
            for i in range(30):
                day = (today - timedelta(days=i)).isoformat()
                key = f"api:usage:{self.tenant_id}:{day}"
                val = await r.get(key)
                if val:
                    total += int(val)
            await r.aclose()
            return total
        except Exception:
            return 0

    async def get_features(self) -> dict:
        """
        Get available features for tenant's plan.
        
        Returns:
            Dictionary with feature information
        """
        tenant = await self.get_tenant()
        
        # Define features by plan
        plan_features = {
            "starter": [
                "user_management",
                "organization_hierarchy",
                "basic_reporting",
                "data_upload",
            ],
            "pro": [
                "user_management",
                "organization_hierarchy",
                "basic_reporting",
                "data_upload",
                "advanced_analytics",
                "api_access",
                "custom_reports",
                "data_export",
                "audit_trail",
            ],
            "enterprise": [
                "user_management",
                "organization_hierarchy",
                "basic_reporting",
                "data_upload",
                "advanced_analytics",
                "api_access",
                "custom_reports",
                "data_export",
                "audit_trail",
                "white_label",
                "dedicated_support",
                "custom_integrations",
                "sso",
                "advanced_security",
            ],
        }
        
        all_features = [
            "user_management",
            "organization_hierarchy",
            "basic_reporting",
            "data_upload",
            "advanced_analytics",
            "api_access",
            "custom_reports",
            "data_export",
            "audit_trail",
            "white_label",
            "dedicated_support",
            "custom_integrations",
            "sso",
            "advanced_security",
        ]
        
        available = plan_features.get(tenant.plan_tier, plan_features["starter"])
        unavailable = [f for f in all_features if f not in available]
        
        return {
            "plan_tier": tenant.plan_tier,
            "core_features": [
                "user_management",
                "organization_hierarchy",
                "basic_reporting",
            ],
            "available_features": available,
            "unavailable_features": unavailable,
            "feature_flags": tenant.feature_flags or {},
        }