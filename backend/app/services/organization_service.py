# ============================================================================
# Fichier: /home/claude/esg-saas-platform/backend/app/services/organization_service.py
# Description: Service de gestion des organisations
# ============================================================================

"""
Organization service - Business logic for organization operations.
"""
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.organization import Organization
from app.models.tenant import Tenant
from app.schemas.organization import (
    OrganizationCreateRequest,
    OrganizationUpdateRequest,
)


class OrganizationService:
    """Service for organization operations."""
    
    def __init__(self, db: AsyncSession, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id
    
    async def create_organization(
        self,
        request: OrganizationCreateRequest,
    ) -> Organization:
        """
        Create a new organization.
        
        Args:
            request: Organization creation data
        
        Returns:
            Created Organization instance
        
        Raises:
            HTTPException 404: If parent organization not found
            HTTPException 403: If organization limit reached
        """
        # Check tenant exists and is active
        tenant = await self.db.get(Tenant, self.tenant_id)
        if not tenant or not tenant.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found or inactive",
            )
        
        # Check if parent exists (if provided)
        if request.parent_org_id:
            parent = await self.db.get(Organization, request.parent_org_id)
            if not parent or parent.tenant_id != self.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parent organization not found",
                )
        
        # Check organization limit
        stmt = select(func.count(Organization.id)).where(
            Organization.tenant_id == self.tenant_id
        )
        result = await self.db.execute(stmt)
        org_count = result.scalar() or 0
        
        if not tenant.can_create_org(org_count):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Organization limit reached for plan {tenant.plan_tier}",
            )
        
        # Create organization
        org = Organization(
            tenant_id=self.tenant_id,
            parent_org_id=request.parent_org_id,
            name=request.name,
            legal_name=request.legal_name,
            org_type=request.org_type,
            siren=request.siren,
            lei_code=request.lei_code,
            vat_number=request.vat_number,
            sector_code=request.sector_code,
            country_code=request.country_code,
            employee_count=request.employee_count,
            revenue_eur=request.revenue_eur,
            surface_m2=request.surface_m2,
            consolidation_method=request.consolidation_method,
            ownership_percentage=request.ownership_percentage,
        )
        
        self.db.add(org)
        await self.db.commit()
        await self.db.refresh(org)
        
        return org
    
    async def get_organization(self, org_id: UUID) -> Organization:
        """
        Get organization by ID.
        
        Args:
            org_id: Organization UUID
        
        Returns:
            Organization instance
        
        Raises:
            HTTPException 404: If organization not found
        """
        stmt = (
            select(Organization)
            .where(
                Organization.id == org_id,
                Organization.tenant_id == self.tenant_id,
            )
            .options(
                #selectinload(Organization.parent),
                selectinload(Organization.children),
            )
        )
        
        result = await self.db.execute(stmt)
        org = result.scalar_one_or_none()
        
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found",
            )
        
        return org
    
    async def list_organizations(
        self,
        skip: int = 0,
        limit: int = 100,
        org_type: Optional[str] = None,
        is_active: Optional[bool] = None,
        parent_id: Optional[UUID] = None,
    ) -> tuple[list[Organization], int]:
        """
        List organizations with filters.
        
        Args:
            skip: Number of items to skip
            limit: Max number of items to return
            org_type: Filter by organization type
            is_active: Filter by active status
            parent_id: Filter by parent organization
        
        Returns:
            Tuple of (organizations list, total count)
        """
        # Base query
        stmt = select(Organization).where(
            Organization.tenant_id == self.tenant_id
        )
        
        # Apply filters
        if org_type:
            stmt = stmt.where(Organization.org_type == org_type)
        
        if is_active is not None:
            stmt = stmt.where(Organization.is_active == is_active)
        
        if parent_id is not None:
            stmt = stmt.where(Organization.parent_org_id == parent_id)
        
        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar() or 0
        
        # Apply pagination
        stmt = stmt.offset(skip).limit(limit).order_by(Organization.name)
        
        # Execute
        result = await self.db.execute(stmt)
        orgs = result.scalars().all()
        
        return list(orgs), total
    
    async def update_organization(
        self,
        org_id: UUID,
        request: OrganizationUpdateRequest,
    ) -> Organization:
        """
        Update organization.
        
        Args:
            org_id: Organization UUID
            request: Update data
        
        Returns:
            Updated Organization instance
        
        Raises:
            HTTPException 404: If organization not found
            HTTPException 400: If creating circular reference
        """
        org = await self.get_organization(org_id)
        
        # Check parent if being updated
        if request.parent_org_id is not None:
            if request.parent_org_id == org_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Organization cannot be its own parent",
                )
            
            # Check parent exists
            if request.parent_org_id:
                parent = await self.db.get(Organization, request.parent_org_id)
                if not parent or parent.tenant_id != self.tenant_id:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Parent organization not found",
                    )
                
                # Check for circular reference
                if await self._would_create_cycle(org_id, request.parent_org_id):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Would create circular reference",
                    )
        
        # Update fields
        update_data = request.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(org, field, value)
        
        await self.db.commit()
        await self.db.refresh(org)
        
        return org
    
    async def delete_organization(self, org_id: UUID) -> bool:
        """
        Delete organization (soft delete by setting is_active=False).
        
        Args:
            org_id: Organization UUID
        
        Returns:
            True if deleted
        
        Raises:
            HTTPException 404: If organization not found
            HTTPException 400: If organization has active children
        """
        org = await self.get_organization(org_id)
        
        # Check if has active children
        stmt = select(func.count(Organization.id)).where(
            Organization.parent_org_id == org_id,
            Organization.is_active == True,
        )
        result = await self.db.execute(stmt)
        children_count = result.scalar() or 0
        
        if children_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete organization with {children_count} active children",
            )
        
        # Soft delete
        org.is_active = False
        await self.db.commit()
        
        return True
    
    async def get_organization_tree(
        self,
        root_id: Optional[UUID] = None,
    ) -> list[Organization]:
        """
        Get organization tree (hierarchical structure).
        
        Args:
            root_id: Start from this organization (None for all roots)
        
        Returns:
            List of root organizations with children loaded
        """
        # Build query
        stmt = select(Organization).where(
            Organization.tenant_id == self.tenant_id
        )
        
        if root_id:
            stmt = stmt.where(Organization.id == root_id)
        else:
            stmt = stmt.where(Organization.parent_org_id.is_(None))
        
        stmt = stmt.options(selectinload(Organization.children))
        
        result = await self.db.execute(stmt)
        roots = result.scalars().all()
        
        # Recursively load all descendants
        for root in roots:
            await self._load_descendants(root)
        
        return list(roots)
    
    async def _load_descendants(self, org: Organization) -> None:
        """Recursively load all descendants."""
        for child in org.children:
            await self.db.refresh(child, ["children"])
            await self._load_descendants(child)
    
    async def _would_create_cycle(
        self,
        org_id: UUID,
        new_parent_id: UUID,
    ) -> bool:
        """Check if setting new_parent_id would create a cycle."""
        current_id = new_parent_id
        visited = {org_id}
        
        while current_id:
            if current_id in visited:
                return True
            
            visited.add(current_id)
            
            stmt = select(Organization.parent_org_id).where(
                Organization.id == current_id
            )
            result = await self.db.execute(stmt)
            current_id = result.scalar_one_or_none()
        
        return False