# ============================================================================
# Fichier: /home/claude/esg-saas-platform/backend/app/api/v1/organizations.py
# Description: API endpoints pour la gestion des organisations
# ============================================================================

"""
Organization API endpoints.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_tenant_id
from app.schemas.organization import (
    OrganizationCreateRequest,
    OrganizationDetailResponse,
    OrganizationListResponse,
    OrganizationResponse,
    OrganizationTreeNode,
    OrganizationUpdateRequest,
)
from app.services.organization_service import OrganizationService

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create organization",
    description="Create a new organization within the tenant's hierarchy.",
)
async def create_organization(
    request: OrganizationCreateRequest,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new organization.
    
    **Required fields:**
    - name: Organization name
    - org_type: One of (group, business_unit, site, department)
    
    **Optional fields:**
    - parent_org_id: Parent organization for hierarchy
    - Legal identifiers (SIREN, LEI, VAT)
    - Business metrics (employees, revenue, surface)
    - Consolidation settings
    
    **Returns:**
    - Created organization with all details
    
    **Errors:**
    - 403: Organization limit reached for your plan
    - 404: Parent organization not found
    """
    service = OrganizationService(db, tenant_id)
    org = await service.create_organization(request)
    return org


@router.get(
    "",
    response_model=OrganizationListResponse,
    summary="List organizations",
    description="Get paginated list of organizations with optional filters.",
)
async def list_organizations(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max items to return"),
    org_type: Optional[str] = Query(
        None,
        description="Filter by type (group, business_unit, site, department)",
    ),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    parent_id: Optional[UUID] = Query(None, description="Filter by parent organization"),
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    List organizations with pagination and filters.
    
    **Query parameters:**
    - skip: Pagination offset (default: 0)
    - limit: Items per page (default: 100, max: 1000)
    - org_type: Filter by organization type
    - is_active: Filter by active/inactive
    - parent_id: Get children of specific organization
    
    **Returns:**
    - List of organizations matching criteria
    - Total count for pagination
    
    **Examples:**
    - GET /organizations?limit=10
    - GET /organizations?org_type=site&is_active=true
    - GET /organizations?parent_id=123e4567-e89b-12d3-a456-426614174000
    """
    service = OrganizationService(db, tenant_id)
    orgs, total = await service.list_organizations(
        skip=skip,
        limit=limit,
        org_type=org_type,
        is_active=is_active,
        parent_id=parent_id,
    )
    
    return OrganizationListResponse(
        total=total,
        items=[OrganizationResponse.model_validate(org) for org in orgs],
    )


@router.get(
    "/tree",
    response_model=list[OrganizationTreeNode],
    summary="Get organization tree",
    description="Get hierarchical tree structure of organizations.",
)
async def get_organization_tree(
    root_id: Optional[UUID] = Query(None, description="Start from this organization"),
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get organization hierarchy as a tree.
    
    **Query parameters:**
    - root_id: Optional - Start from specific organization (default: all roots)
    
    **Returns:**
    - Tree structure with nested children
    - Each node contains: id, name, org_type, is_active, children[]
    
    **Use cases:**
    - Display organization chart
    - Navigate hierarchical structure
    - Show parent-child relationships
    
    **Example response:**
    ```json
    [
      {
        "id": "...",
        "name": "Accor Group",
        "org_type": "group",
        "children": [
          {
            "id": "...",
            "name": "Accor Europe",
            "org_type": "business_unit",
            "children": [...]
          }
        ]
      }
    ]
    ```
    """
    service = OrganizationService(db, tenant_id)
    tree = await service.get_organization_tree(root_id)
    
    return [OrganizationTreeNode.model_validate(org) for org in tree]


@router.get(
    "/{org_id}",
    response_model=OrganizationDetailResponse,
    summary="Get organization details",
    description="Get detailed information about a specific organization.",
)
async def get_organization(
    org_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get organization by ID with full details.
    
    **Path parameters:**
    - org_id: Organization UUID
    
    **Returns:**
    - Complete organization details
    - Hierarchical information (full_path, parent, children)
    - All business metrics and identifiers
    
    **Errors:**
    - 404: Organization not found
    
    **Includes:**
    - Full hierarchical path
    - Parent organization (if any)
    - Direct children organizations
    - All legal identifiers
    - All business metrics
    """
    service = OrganizationService(db, tenant_id)
    org = await service.get_organization(org_id)
    
    # Build detailed response
    response_data = OrganizationResponse.model_validate(org).model_dump()
    
    # Add computed fields
    response_data["full_path"] = org.full_path
    response_data["is_root"] = org.parent_org_id is None
    response_data["is_leaf"] = len(org.children) == 0
    response_data["children_count"] = len(org.children)
    
    # TODO: Calculate descendants_count recursively
    response_data["descendants_count"] = len(org.children)
    
    return OrganizationDetailResponse(**response_data)


@router.put(
    "/{org_id}",
    response_model=OrganizationResponse,
    summary="Update organization",
    description="Update organization details.",
)
async def update_organization(
    org_id: UUID,
    request: OrganizationUpdateRequest,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Update an existing organization.
    
    **Path parameters:**
    - org_id: Organization UUID
    
    **Request body:**
    - Any fields to update (all optional)
    - Only provided fields will be updated
    
    **Returns:**
    - Updated organization
    
    **Errors:**
    - 404: Organization not found
    - 400: Invalid update (circular reference, invalid parent, etc.)
    
    **Examples:**
    - Update name: `{"name": "New Name"}`
    - Change parent: `{"parent_org_id": "..."}`
    - Update metrics: `{"employee_count": 150, "revenue_eur": 5000000}`
    - Deactivate: `{"is_active": false}`
    
    **Notes:**
    - Cannot create circular parent-child relationships
    - Cannot set organization as its own parent
    """
    service = OrganizationService(db, tenant_id)
    org = await service.update_organization(org_id, request)
    return org


@router.delete(
    "/{org_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete organization",
    description="Soft delete an organization (sets is_active=false).",
)
async def delete_organization(
    org_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete (deactivate) an organization.
    
    **Path parameters:**
    - org_id: Organization UUID
    
    **Behavior:**
    - Soft delete (sets is_active=false)
    - Organization data is preserved
    - Can be reactivated by setting is_active=true via PUT
    
    **Returns:**
    - 204 No Content on success
    
    **Errors:**
    - 404: Organization not found
    - 400: Organization has active children (must deactivate children first)
    
    **Notes:**
    - Cannot delete organization with active children
    - Deactivate all children first, then parent
    - Use PUT to reactivate: `PUT /organizations/{id}` with `{"is_active": true}`
    """
    service = OrganizationService(db, tenant_id)
    await service.delete_organization(org_id)
    return None