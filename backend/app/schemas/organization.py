"""Organization schemas (compat layer)."""
from __future__ import annotations

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


# --- Base response used by list/detail ---
class OrganizationResponse(BaseModel):
    id: UUID
    tenant_id: Optional[UUID] = None

    name: str
    external_id: Optional[str] = None

    # keep both names to avoid breaking old code
    org_type: Optional[str] = Field(default=None, description="Organization type")
    type: Optional[str] = Field(default=None, description="Legacy alias for org_type")

    industry: Optional[str] = None
    is_active: Optional[bool] = True

    parent_org_id: Optional[UUID] = None

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- Create / Update request schemas (names expected by organizations.py) ---
class OrganizationCreateRequest(BaseModel):
    name: str
    org_type: str = "company"
    external_id: Optional[str] = None
    industry: Optional[str] = None
    parent_org_id: Optional[UUID] = None


class OrganizationUpdateRequest(BaseModel):
    name: Optional[str] = None
    org_type: Optional[str] = None
    external_id: Optional[str] = None
    industry: Optional[str] = None
    parent_org_id: Optional[UUID] = None
    is_active: Optional[bool] = None


# --- List / Detail / Tree schemas expected by imports ---
class OrganizationListResponse(BaseModel):
    total: int = 0
    items: List[OrganizationResponse] = []
    model_config = {"from_attributes": True}


class OrganizationDetailResponse(OrganizationResponse):
    # Optional extra fields if your API expects them
    full_path: Optional[str] = None
    is_root: Optional[bool] = None
    is_leaf: Optional[bool] = None
    children_count: int = 0
    descendants_count: int = 0


class OrganizationTreeNode(BaseModel):
    id: UUID
    name: str
    org_type: Optional[str] = None
    is_active: Optional[bool] = True
    children: List["OrganizationTreeNode"] = []

    model_config = {"from_attributes": True}
