"""
Indicator service - Business logic for ESG indicators.
"""
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.indicator import Indicator
from app.schemas.indicator import IndicatorCreate, IndicatorUpdate


class IndicatorService:
    """Service for managing ESG indicators."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_indicator(
        self,
        tenant_id: UUID,
        data: IndicatorCreate,
    ) -> Indicator:
        """Create a new indicator."""
        indicator = Indicator(
            tenant_id=tenant_id,
            **data.model_dump()
        )
        self.db.add(indicator)
        await self.db.commit()
        await self.db.refresh(indicator)
        return indicator
    
    async def get_indicator(
        self,
        indicator_id: UUID,
        tenant_id: UUID,
    ) -> Optional[Indicator]:
        """Get indicator by ID."""
        query = select(Indicator).where(
            Indicator.id == indicator_id,
            Indicator.tenant_id == tenant_id,
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_indicators(
        self,
        tenant_id: UUID,
        pillar: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[Indicator], int]:
        """Get list of indicators with filters."""
        query = select(Indicator).where(Indicator.tenant_id == tenant_id)
        
        if pillar:
            query = query.where(Indicator.pillar == pillar)
        if is_active is not None:
            query = query.where(Indicator.is_active == is_active)
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)
        
        # Get paginated results
        query = query.offset(skip).limit(limit).order_by(Indicator.code)
        result = await self.db.execute(query)
        indicators = list(result.scalars().all())
        
        return indicators, total or 0
    
    async def update_indicator(
        self,
        indicator_id: UUID,
        tenant_id: UUID,
        data: IndicatorUpdate,
    ) -> Optional[Indicator]:
        """Update an indicator."""
        indicator = await self.get_indicator(indicator_id, tenant_id)
        if not indicator:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(indicator, field, value)
        
        await self.db.commit()
        await self.db.refresh(indicator)
        return indicator
    
    async def delete_indicator(
        self,
        indicator_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Delete an indicator."""
        indicator = await self.get_indicator(indicator_id, tenant_id)
        if not indicator:
            return False
        
        await self.db.delete(indicator)
        await self.db.commit()
        return True
    
    async def get_indicators_by_pillar(
        self,
        tenant_id: UUID,
    ) -> dict[str, list[Indicator]]:
        """Get indicators grouped by pillar."""
        query = select(Indicator).where(
            Indicator.tenant_id == tenant_id,
            Indicator.is_active == True,
        ).order_by(Indicator.pillar, Indicator.code)
        
        result = await self.db.execute(query)
        indicators = list(result.scalars().all())
        
        grouped = {
            'environmental': [],
            'social': [],
            'governance': [],
        }
        
        for indicator in indicators:
            if indicator.pillar in grouped:
                grouped[indicator.pillar].append(indicator)
        
        return grouped
