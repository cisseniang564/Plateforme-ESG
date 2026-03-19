"""
Indicator schemas for API validation.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, validator


class IndicatorBase(BaseModel):
    """Base schema for Indicator."""
    code: str = Field(..., max_length=50, description="Unique code")
    name: str = Field(..., max_length=200, description="Indicator name")
    pillar: str = Field(..., description="ESG pillar: environmental, social, governance")
    category: Optional[str] = Field(None, max_length=100)
    unit: str = Field(..., max_length=50, description="Unit of measure")
    data_type: str = Field(default="numeric", description="Data type")
    description: Optional[str] = None
    calculation_method: Optional[str] = None
    weight: Optional[float] = Field(None, ge=0, le=1)
    target_value: Optional[float] = None
    is_active: bool = True
    is_mandatory: bool = False
    framework: Optional[str] = Field(None, max_length=50)
    framework_reference: Optional[str] = Field(None, max_length=100)
    
    @validator('pillar')
    def validate_pillar(cls, v):
        allowed = ['environmental', 'social', 'governance']
        if v not in allowed:
            raise ValueError(f"Pillar must be one of: {', '.join(allowed)}")
        return v
    
    @validator('data_type')
    def validate_data_type(cls, v):
        allowed = ['numeric', 'percentage', 'boolean', 'text']
        if v not in allowed:
            raise ValueError(f"Data type must be one of: {', '.join(allowed)}")
        return v


class IndicatorCreate(IndicatorBase):
    """Schema for creating an Indicator."""
    pass


class IndicatorUpdate(BaseModel):
    """Schema for updating an Indicator."""
    name: Optional[str] = Field(None, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    calculation_method: Optional[str] = None
    weight: Optional[float] = Field(None, ge=0, le=1)
    target_value: Optional[float] = None
    is_active: Optional[bool] = None
    is_mandatory: Optional[bool] = None


class IndicatorResponse(IndicatorBase):
    """Schema for Indicator response."""
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class IndicatorListResponse(BaseModel):
    """Schema for paginated list of Indicators."""
    items: list[IndicatorResponse]
    total: int
    page: int = 1
    page_size: int = 20
