"""
Indicator Data Service - Import uploaded data to indicators.
"""
from typing import Optional
from uuid import UUID
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.indicator import Indicator
from app.models.indicator_data import IndicatorData
from app.models.data_upload import DataUpload
from app.models.organization import Organization


class IndicatorDataService:
    """Service for managing indicator data."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def import_from_upload(
        self,
        upload_id: UUID,
        tenant_id: UUID,
    ) -> dict:
        """Import data from upload to indicator_data table."""
        
        # Récupérer l'upload
        upload_query = select(DataUpload).where(
            DataUpload.id == upload_id,
            DataUpload.tenant_id == tenant_id
        )
        upload_result = await self.db.execute(upload_query)
        upload = upload_result.scalar_one_or_none()
        
        if not upload:
            raise ValueError("Upload not found")
        
        # Lire toutes les lignes (data_preview = 10 lignes seulement pour l'UI)
        all_rows = (upload.file_metadata or {}).get('all_rows') or upload.data_preview or []
        if not all_rows:
            raise ValueError("No data to import")

        imported = 0
        skipped = 0
        errors = []

        # Récupérer tous les indicators du tenant
        indicators_query = select(Indicator).where(Indicator.tenant_id == tenant_id)
        indicators_result = await self.db.execute(indicators_query)
        indicators = {ind.code: ind for ind in indicators_result.scalars().all()}

        # Récupérer toutes les organizations
        orgs_query = select(Organization).where(Organization.tenant_id == tenant_id)
        orgs_result = await self.db.execute(orgs_query)
        organizations = {org.name: org for org in orgs_result.scalars().all()}

        # Importer chaque ligne
        for idx, row in enumerate(all_rows):
            try:
                indicator_code = row.get('indicator_code')
                value = row.get('value')
                date_str = row.get('date')
                org_name = row.get('organization')
                notes = row.get('notes')
                
                if not indicator_code or value is None or not date_str:
                    errors.append(f"Row {idx}: Missing required fields")
                    skipped += 1
                    continue
                
                # Trouver l'indicator
                indicator = indicators.get(indicator_code)
                if not indicator:
                    errors.append(f"Row {idx}: Indicator {indicator_code} not found")
                    skipped += 1
                    continue
                
                # Trouver l'organization (optionnel)
                org_id = None
                if org_name:
                    org = organizations.get(org_name)
                    if org:
                        org_id = org.id
                
                # Parser la date
                try:
                    if isinstance(date_str, str):
                        data_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                    else:
                        data_date = date_str
                except:
                    errors.append(f"Row {idx}: Invalid date format")
                    skipped += 1
                    continue
                
                # Créer l'indicator_data
                indicator_data = IndicatorData(
                    tenant_id=tenant_id,
                    indicator_id=indicator.id,
                    organization_id=org_id,
                    upload_id=upload_id,
                    date=data_date,
                    value=float(value),
                    unit=indicator.unit,
                    notes=notes,
                    source="upload",
                    is_verified=False,
                )
                
                self.db.add(indicator_data)
                imported += 1
                
            except Exception as e:
                errors.append(f"Row {idx}: {str(e)}")
                skipped += 1
        
        await self.db.commit()
        
        return {
            "imported": imported,
            "skipped": skipped,
            "errors": errors[:10],  # Limiter à 10 erreurs
        }
    
    async def get_indicator_timeseries(
        self,
        indicator_id: UUID,
        tenant_id: UUID,
        organization_id: Optional[UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> list[IndicatorData]:
        """Get time-series data for an indicator."""
        
        query = select(IndicatorData).where(
            IndicatorData.indicator_id == indicator_id,
            IndicatorData.tenant_id == tenant_id
        )
        
        if organization_id:
            query = query.where(IndicatorData.organization_id == organization_id)
        
        if start_date:
            query = query.where(IndicatorData.date >= start_date)
        
        if end_date:
            query = query.where(IndicatorData.date <= end_date)
        
        query = query.order_by(IndicatorData.date)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
