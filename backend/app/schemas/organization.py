"""Organization schemas — multi-entity, hierarchy, consolidation."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ─── Base response ─────────────────────────────────────────────────────────
class OrganizationResponse(BaseModel):
    """Response shape returned by list and detail endpoints."""

    id: UUID
    tenant_id: Optional[UUID] = None

    # Identity
    name: str
    legal_name: Optional[str] = None
    external_id: Optional[str] = None
    org_type: Optional[str] = Field(default=None, description="Organization type")
    type: Optional[str] = Field(default=None, description="Legacy alias for org_type")

    # Legal identifiers
    siren: Optional[str] = None
    siret: Optional[str] = None
    lei_code: Optional[str] = None
    vat_number: Optional[str] = None

    # Sector & geography
    sector_code: Optional[str] = None
    industry: Optional[str] = None
    country_code: Optional[str] = None

    # Metrics
    employee_count: Optional[int] = None
    revenue_eur: Optional[Decimal] = None
    surface_m2: Optional[Decimal] = None

    # Hierarchy / consolidation
    parent_org_id: Optional[UUID] = None
    consolidation_method: Optional[str] = None
    ownership_percentage: Optional[Decimal] = None

    # State
    is_active: bool = True

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Create / Update ──────────────────────────────────────────────────────
class OrganizationCreateRequest(BaseModel):
    """Payload for POST /organizations."""

    # Required
    name: str = Field(..., min_length=1, max_length=200)
    org_type: str = Field(default="company", max_length=50)

    # Optional identity
    legal_name: Optional[str] = Field(default=None, max_length=255)
    external_id: Optional[str] = Field(default=None, max_length=50)
    industry: Optional[str] = Field(default=None, max_length=100)

    # Optional legal identifiers
    siren: Optional[str] = Field(default=None, min_length=9, max_length=9)
    siret: Optional[str] = Field(default=None, min_length=14, max_length=14)
    lei_code: Optional[str] = Field(default=None, max_length=20)
    vat_number: Optional[str] = Field(default=None, max_length=20)

    # Optional sector & geography
    sector_code: Optional[str] = Field(default=None, max_length=20)
    country_code: Optional[str] = Field(default="FR", max_length=2)

    # Optional metrics
    employee_count: Optional[int] = Field(default=None, ge=0)
    revenue_eur: Optional[Decimal] = Field(default=None, ge=0)
    surface_m2: Optional[Decimal] = Field(default=None, ge=0)

    # Hierarchy / consolidation
    parent_org_id: Optional[UUID] = None
    consolidation_method: Optional[Literal["full", "proportional", "equity", "none"]] = "full"
    ownership_percentage: Optional[Decimal] = Field(default=Decimal("100.00"), ge=0, le=100)

    @field_validator("siren")
    @classmethod
    def _siren_digits(cls, v: Optional[str]) -> Optional[str]:
        if v and not v.isdigit():
            raise ValueError("SIREN must contain only digits")
        return v


class OrganizationUpdateRequest(BaseModel):
    """Payload for PATCH /organizations/{id}. All fields optional."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    legal_name: Optional[str] = None
    org_type: Optional[str] = None
    external_id: Optional[str] = None
    industry: Optional[str] = None

    siren: Optional[str] = None
    siret: Optional[str] = None
    lei_code: Optional[str] = None
    vat_number: Optional[str] = None

    sector_code: Optional[str] = None
    country_code: Optional[str] = None

    employee_count: Optional[int] = None
    revenue_eur: Optional[Decimal] = None
    surface_m2: Optional[Decimal] = None

    parent_org_id: Optional[UUID] = None
    consolidation_method: Optional[Literal["full", "proportional", "equity", "none"]] = None
    ownership_percentage: Optional[Decimal] = Field(default=None, ge=0, le=100)

    is_active: Optional[bool] = None


# ─── List / Detail / Tree ──────────────────────────────────────────────────
class OrganizationListResponse(BaseModel):
    total: int = 0
    items: List[OrganizationResponse] = []
    model_config = {"from_attributes": True}


class OrganizationDetailResponse(OrganizationResponse):
    full_path: Optional[str] = None
    is_root: Optional[bool] = None
    is_leaf: Optional[bool] = None
    children_count: int = 0
    descendants_count: int = 0


class OrganizationTreeNode(BaseModel):
    id: UUID
    name: str
    org_type: Optional[str] = None
    consolidation_method: Optional[str] = None
    ownership_percentage: Optional[Decimal] = None
    is_active: bool = True
    children: List["OrganizationTreeNode"] = []

    model_config = {"from_attributes": True}


# ─── Consolidated indicators (roll-up) ──────────────────────────────────────
class ConsolidatedIndicator(BaseModel):
    """One row of the consolidated view for a parent org."""

    indicator_code: str
    indicator_name: str
    unit: Optional[str] = None
    period: Optional[str] = None  # ISO date or year
    value: Decimal
    contributing_orgs: int = Field(
        ..., description="Number of subsidiaries that contributed to this value"
    )


class ConsolidatedReportResponse(BaseModel):
    """Aggregated indicators across a parent and its subsidiaries."""

    parent_org_id: UUID
    parent_org_name: str
    period: Optional[str] = None
    method: str = Field(..., description="Consolidation method applied: full/proportional/mixed")
    indicators: List[ConsolidatedIndicator] = []
    descendants_included: int = 0
    descendants_excluded: int = 0


# Forward refs for the tree node
OrganizationTreeNode.model_rebuild()
