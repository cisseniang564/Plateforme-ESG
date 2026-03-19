"""
Google Sheets integration service with retry logic.
"""
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
import json
import asyncio
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.integration import Integration, IntegrationType
from app.models.indicator import Indicator
from app.models.indicator_data import IndicatorData
from app.services.google_oauth_service import GoogleOAuthService


class GoogleSheetsService:
    """Service for Google Sheets integration with retry logic."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.oauth_service = GoogleOAuthService(db)
    
    async def _get_credentials(self, integration_id: UUID) -> Credentials:
        """Get and refresh credentials for an integration."""
        return await self.oauth_service.refresh_credentials(str(integration_id))
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(HttpError)
    )
    async def _read_sheet_with_retry(
        self,
        service: Any,
        spreadsheet_id: str,
        range_name: str,
    ) -> List[List[Any]]:
        """Read sheet data with exponential backoff retry."""
        
        # Run in executor to avoid blocking
        loop = asyncio.get_event_loop()
        
        def _read():
            result = service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=range_name
            ).execute()
            return result.get('values', [])
        
        values = await loop.run_in_executor(None, _read)
        return values
    
    async def import_from_sheet(
        self,
        tenant_id: UUID,
        integration_id: UUID,
        spreadsheet_id: str,
        sheet_name: str = "Sheet1",
    ) -> Dict[str, Any]:
        """
        Import data from Google Sheets with validation and retry logic.
        
        Expected format:
        | indicator_code | value | date       | organization | notes |
        |----------------|-------|------------|--------------|-------|
        | ENV-001        | 100   | 2024-01-01 | Org A        | ...   |
        """
        
        # Get integration
        query = select(Integration).where(
            Integration.id == integration_id,
            Integration.tenant_id == tenant_id,
            Integration.type == IntegrationType.GOOGLE_SHEETS
        )
        result = await self.db.execute(query)
        integration = result.scalar_one_or_none()
        
        if not integration:
            raise ValueError("Integration not found")
        
        if not integration.is_active:
            raise ValueError("Integration is not active")
        
        # Get credentials
        try:
            creds = await self._get_credentials(integration_id)
        except Exception as e:
            integration.last_error = f"Failed to get credentials: {str(e)}"
            await self.db.commit()
            raise ValueError(f"Authentication failed: {str(e)}")
        
        try:
            # Build service
            service = build('sheets', 'v4', credentials=creds)
            
            # Read data with retry
            range_name = f"{sheet_name}!A:E"
            values = await self._read_sheet_with_retry(service, spreadsheet_id, range_name)
            
            if not values:
                return {
                    "imported": 0,
                    "skipped": 0,
                    "errors": ["No data found in sheet"],
                    "warnings": []
                }
            
            # Validate headers
            expected_headers = ['indicator_code', 'value', 'date', 'organization', 'notes']
            headers = [h.lower().strip() for h in values[0]]
            
            if not all(h in headers for h in expected_headers[:3]):  # First 3 are required
                return {
                    "imported": 0,
                    "skipped": len(values) - 1,
                    "errors": [f"Invalid headers. Expected: {', '.join(expected_headers)}"],
                    "warnings": []
                }
            
            # Process rows
            rows = values[1:]
            imported = 0
            skipped = 0
            errors = []
            warnings = []
            
            # Get all indicators for this tenant (for validation)
            ind_query = select(Indicator).where(Indicator.tenant_id == tenant_id)
            ind_result = await self.db.execute(ind_query)
            indicators = {ind.code: ind for ind in ind_result.scalars().all()}
            
            for i, row in enumerate(rows, start=2):
                try:
                    if len(row) < 3:
                        warnings.append(f"Row {i}: Skipped - insufficient columns")
                        skipped += 1
                        continue
                    
                    # Parse data
                    indicator_code = row[0].strip() if row[0] else None
                    value_str = row[1].strip() if len(row) > 1 and row[1] else None
                    date_str = row[2].strip() if len(row) > 2 and row[2] else None
                    organization = row[3].strip() if len(row) > 3 and row[3] else None
                    notes = row[4].strip() if len(row) > 4 and row[4] else None
                    
                    # Validate required fields
                    if not indicator_code:
                        warnings.append(f"Row {i}: Missing indicator code")
                        skipped += 1
                        continue
                    
                    if not value_str:
                        warnings.append(f"Row {i}: Missing value")
                        skipped += 1
                        continue
                    
                    if not date_str:
                        warnings.append(f"Row {i}: Missing date")
                        skipped += 1
                        continue
                    
                    # Validate indicator exists
                    indicator = indicators.get(indicator_code)
                    if not indicator:
                        warnings.append(f"Row {i}: Indicator '{indicator_code}' not found")
                        skipped += 1
                        continue
                    
                    # Parse value
                    try:
                        value = float(value_str)
                    except ValueError:
                        warnings.append(f"Row {i}: Invalid value '{value_str}'")
                        skipped += 1
                        continue
                    
                    # Parse date (support multiple formats)
                    date_obj = None
                    for date_format in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']:
                        try:
                            date_obj = datetime.strptime(date_str, date_format).date()
                            break
                        except ValueError:
                            continue
                    
                    if not date_obj:
                        warnings.append(f"Row {i}: Invalid date '{date_str}'. Use YYYY-MM-DD format")
                        skipped += 1
                        continue
                    
                    # Create data point
                    data_point = IndicatorData(
                        tenant_id=tenant_id,
                        indicator_id=indicator.id,
                        date=date_obj,
                        value=value,
                        unit=indicator.unit,
                        source='google_sheets',
                        notes=notes,
                        is_verified=False,
                    )
                    
                    self.db.add(data_point)
                    imported += 1
                
                except Exception as e:
                    errors.append(f"Row {i}: {str(e)}")
                    skipped += 1
            
            # Commit all data
            await self.db.commit()
            
            # Update integration status
            integration.last_sync_at = datetime.utcnow()
            integration.last_error = None if not errors else errors[0]
            await self.db.commit()
            
            return {
                "imported": imported,
                "skipped": skipped,
                "errors": errors[:10],  # Limit errors
                "warnings": warnings[:20],  # Limit warnings
                "total_rows": len(rows),
            }
        
        except HttpError as error:
            error_msg = f"Google API error: {str(error)}"
            integration.last_error = error_msg
            await self.db.commit()
            raise ValueError(error_msg)
        
        except Exception as error:
            error_msg = f"Unexpected error: {str(error)}"
            integration.last_error = error_msg
            await self.db.commit()
            raise ValueError(error_msg)
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(HttpError)
    )
    async def export_to_sheet(
        self,
        tenant_id: UUID,
        integration_id: UUID,
        spreadsheet_id: str,
        sheet_name: str = "ESG Data",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Export indicator data to Google Sheets with filters."""
        
        # Get integration
        query = select(Integration).where(
            Integration.id == integration_id,
            Integration.tenant_id == tenant_id,
            Integration.type == IntegrationType.GOOGLE_SHEETS
        )
        result = await self.db.execute(query)
        integration = result.scalar_one_or_none()
        
        if not integration:
            raise ValueError("Integration not found")
        
        # Get credentials
        creds = await self._get_credentials(integration_id)
        
        # Build query with filters
        data_query = select(IndicatorData).where(
            IndicatorData.tenant_id == tenant_id
        )
        
        if start_date:
            data_query = data_query.where(IndicatorData.date >= start_date)
        if end_date:
            data_query = data_query.where(IndicatorData.date <= end_date)
        
        data_query = data_query.order_by(IndicatorData.date.desc()).limit(5000)
        
        data_result = await self.db.execute(data_query)
        data_points = list(data_result.scalars().all())
        
        # Get indicators
        indicators_map = {}
        for dp in data_points:
            if dp.indicator_id not in indicators_map:
                ind_query = select(Indicator).where(Indicator.id == dp.indicator_id)
                ind_result = await self.db.execute(ind_query)
                indicators_map[dp.indicator_id] = ind_result.scalar_one()
        
        # Prepare data
        headers = [
            "Indicator Code",
            "Indicator Name",
            "Pillar",
            "Value",
            "Unit",
            "Date",
            "Source",
            "Verified",
            "Notes"
        ]
        rows = [headers]
        
        for dp in data_points:
            indicator = indicators_map[dp.indicator_id]
            rows.append([
                indicator.code,
                indicator.name,
                indicator.pillar.capitalize(),
                dp.value,
                dp.unit,
                dp.date.isoformat(),
                dp.source,
                "Yes" if dp.is_verified else "No",
                dp.notes or "",
            ])
        
        # Write to sheet with retry
        service = build('sheets', 'v4', credentials=creds)
        
        try:
            # Clear existing data first
            loop = asyncio.get_event_loop()
            
            def _clear_and_write():
                # Clear
                service.spreadsheets().values().clear(
                    spreadsheetId=spreadsheet_id,
                    range=f"{sheet_name}!A1:Z"
                ).execute()
                
                # Write
                body = {'values': rows}
                result = service.spreadsheets().values().update(
                    spreadsheetId=spreadsheet_id,
                    range=f"{sheet_name}!A1",
                    valueInputOption='RAW',
                    body=body
                ).execute()
                
                return result
            
            result = await loop.run_in_executor(None, _clear_and_write)
            
            # Update integration
            integration.last_sync_at = datetime.utcnow()
            integration.last_error = None
            await self.db.commit()
            
            return {
                "exported": len(data_points),
                "updated_cells": result.get('updatedCells', 0),
                "updated_rows": result.get('updatedRows', 0),
                "spreadsheet_url": f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}",
            }
        
        except HttpError as error:
            integration.last_error = f"Google API error: {str(error)}"
            await self.db.commit()
            raise ValueError(f"Failed to write to Google Sheets: {str(error)}")
