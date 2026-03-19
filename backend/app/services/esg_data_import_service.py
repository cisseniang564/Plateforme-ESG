"""
ESG Data Import Service - Import CSV/Excel to data_entries table.
"""
import io
from typing import Any, Optional
from uuid import UUID
from datetime import datetime, date

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.data_upload import DataUpload
from app.models.data_entry import DataEntry
from app.services.audit_service import log_change


class ESGDataImportService:
    """Service for importing ESG data to data_entries."""
    
    COLUMN_MAPPINGS = {
        'pillar': ['pillar', 'pilier', 'esg_pillar', 'type'],
        'category': ['category', 'categorie', 'subcategory', 'sous_categorie'],
        'metric_name': ['metric', 'metric_name', 'indicator', 'indicateur', 'name', 'nom'],
        'value_numeric': ['value', 'valeur', 'amount', 'montant', 'numeric_value'],
        'unit': ['unit', 'unite', 'units'],
        'period_start': ['period_start', 'date_start', 'start_date', 'date_debut', 'date'],
        'period_end': ['period_end', 'date_end', 'end_date', 'date_fin'],
        'data_source': ['source', 'data_source', 'origine'],
        'notes': ['notes', 'comments', 'commentaires', 'description'],
    }
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def parse_and_preview(
        self,
        file_content: bytes,
        filename: str,
        tenant_id: UUID,
        user_id: UUID,
    ) -> DataUpload:
        """Parse CSV/Excel and create preview."""
        
        upload = DataUpload(
            tenant_id=tenant_id,
            uploaded_by=user_id,
            filename=filename,
            file_size=len(file_content),
            file_type=self._detect_file_type(filename),
            status="processing",
            processing_started_at=datetime.utcnow(),
        )
        self.db.add(upload)
        await self.db.flush()
        
        try:
            if filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file_content))
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(io.BytesIO(file_content))
            else:
                raise ValueError(f"Unsupported file type: {filename}")
            
            detected_mapping = self._auto_detect_columns(df.columns.tolist())
            
            total_rows = len(df)
            preview = df.head(10).to_dict('records')
            preview = self._clean_nan(preview)
            
            validation_result = self._validate_for_import(df, detected_mapping)
            
            upload.total_rows = total_rows
            upload.valid_rows = validation_result['valid_count']
            upload.invalid_rows = validation_result['invalid_count']
            upload.data_preview = preview
            upload.validation_errors = validation_result['errors']
            upload.file_metadata = {
                'columns': list(df.columns),
                'detected_mapping': detected_mapping,
                'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()},
            }
            upload.status = "completed"
            upload.processing_completed_at = datetime.utcnow()
            
        except Exception as e:
            upload.status = "failed"
            upload.error_message = str(e)
            upload.processing_completed_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(upload)
        
        return upload
    
    async def import_to_data_entries(
        self,
        upload_id: UUID,
        column_mapping: dict[str, str],
        tenant_id: UUID,
        user_id: UUID,
    ) -> dict[str, Any]:
        """Import data from upload to data_entries table."""
        
        result = await self.db.execute(
            select(DataUpload).where(
                DataUpload.id == upload_id,
                DataUpload.tenant_id == tenant_id
            )
        )
        upload = result.scalar_one_or_none()
        
        if not upload:
            raise ValueError("Upload not found")
        
        imported_count = 0
        error_count = 0
        errors = []
        
        for idx, row_data in enumerate(upload.data_preview or []):
            try:
                entry_data = self._map_row_to_entry(row_data, column_mapping)
                
                # FIX: Valider les types AVANT insertion
                self._validate_entry_types(entry_data, idx)
                
                entry = DataEntry(
                    tenant_id=tenant_id,
                    created_by=user_id,
                    collection_method='csv_import',
                    **entry_data
                )
                
                self.db.add(entry)
                await self.db.flush()
                
                await log_change(
                    db=self.db,
                    tenant_id=tenant_id,
                    entity_type='data_entries',
                    entity_id=entry.id,
                    action='create',
                    new_values={'source': 'csv_import', 'filename': upload.filename},
                )
                
                imported_count += 1
                
            except Exception as e:
                error_count += 1
                errors.append({
                    'row': idx + 1,
                    'error': str(e),
                    'data': row_data
                })
                # Continue avec les autres lignes
                continue
        
        await self.db.commit()
        
        upload.valid_rows = imported_count
        upload.invalid_rows = error_count
        upload.status = 'imported'
        await self.db.commit()
        
        return {
            'imported': imported_count,
            'errors': error_count,
            'error_details': errors[:50],
            'upload_id': str(upload_id)
        }
    
    def _validate_entry_types(self, entry_data: dict, row_idx: int):
        """Validate data types before insertion."""
        
        # String fields
        string_fields = ['pillar', 'category', 'metric_name', 'unit', 'data_source', 'notes']
        for field in string_fields:
            value = entry_data.get(field)
            if value is not None and not isinstance(value, str):
                # Convert to string
                entry_data[field] = str(value)
        
        # Numeric fields
        if 'value_numeric' in entry_data and entry_data['value_numeric'] is not None:
            try:
                entry_data['value_numeric'] = float(entry_data['value_numeric'])
            except (ValueError, TypeError) as e:
                raise ValueError(f"Row {row_idx + 1}: Invalid numeric value: {entry_data['value_numeric']}")
        
        # Date fields
        for date_field in ['period_start', 'period_end']:
            if date_field in entry_data and entry_data[date_field]:
                if not isinstance(entry_data[date_field], (date, datetime)):
                    raise ValueError(f"Row {row_idx + 1}: Invalid date format for {date_field}")
        
        # Required fields
        required = ['metric_name', 'pillar']
        for field in required:
            if not entry_data.get(field):
                raise ValueError(f"Row {row_idx + 1}: Missing required field: {field}")
    
    def _auto_detect_columns(self, columns: list[str]) -> dict[str, str]:
        """Auto-detect column mapping."""
        mapping = {}
        
        for target_col, possible_names in self.COLUMN_MAPPINGS.items():
            for col in columns:
                col_lower = col.lower().strip()
                if col_lower in possible_names:
                    mapping[target_col] = col
                    break
        
        return mapping
    
    def _map_row_to_entry(self, row: dict, mapping: dict[str, str]) -> dict:
        """Map CSV row to DataEntry fields."""
        
        entry_data = {}
        
        # FIX: Convertir toutes les valeurs en string pour les champs texte
        entry_data['pillar'] = str(row.get(mapping.get('pillar', ''), 'environmental'))
        entry_data['category'] = str(row.get(mapping.get('category', ''), '')) if mapping.get('category') else ''
        entry_data['metric_name'] = str(row.get(mapping.get('metric_name', ''), ''))
        
        # Value
        value = row.get(mapping.get('value_numeric', ''))
        if value is not None and value != '':
            try:
                entry_data['value_numeric'] = float(value)
            except (ValueError, TypeError):
                entry_data['value_numeric'] = None
        
        entry_data['unit'] = str(row.get(mapping.get('unit', ''), '')) if mapping.get('unit') else ''
        
        # Dates
        period_start = row.get(mapping.get('period_start', ''))
        if period_start:
            if isinstance(period_start, str):
                try:
                    entry_data['period_start'] = datetime.strptime(period_start, '%Y-%m-%d').date()
                except:
                    entry_data['period_start'] = date.today().replace(day=1)
            else:
                entry_data['period_start'] = period_start
        else:
            entry_data['period_start'] = date.today().replace(day=1)
        
        period_end = row.get(mapping.get('period_end', ''))
        if period_end:
            if isinstance(period_end, str):
                try:
                    entry_data['period_end'] = datetime.strptime(period_end, '%Y-%m-%d').date()
                except:
                    entry_data['period_end'] = date.today()
            else:
                entry_data['period_end'] = period_end
        else:
            entry_data['period_end'] = date.today()
        
        entry_data['data_source'] = str(row.get(mapping.get('data_source', ''), 'CSV Import'))
        entry_data['notes'] = str(row.get(mapping.get('notes', ''), '')) if mapping.get('notes') else ''
        
        return entry_data
    
    def _validate_for_import(self, df: pd.DataFrame, mapping: dict) -> dict:
        """Validate data for import."""
        
        errors = {}
        valid_count = 0
        invalid_count = 0
        
        required = ['metric_name', 'value_numeric']
        missing = [col for col in required if col not in mapping]
        
        if missing:
            return {
                'valid_count': 0,
                'invalid_count': len(df),
                'errors': {'missing_columns': missing}
            }
        
        for idx, row in df.iterrows():
            row_errors = []
            
            metric_col = mapping.get('metric_name')
            if metric_col and pd.isna(row.get(metric_col)):
                row_errors.append("Missing metric_name")
            
            value_col = mapping.get('value_numeric')
            if value_col and pd.isna(row.get(value_col)):
                row_errors.append("Missing value")
            
            if row_errors:
                errors[f'row_{idx}'] = row_errors
                invalid_count += 1
            else:
                valid_count += 1
        
        return {
            'valid_count': valid_count,
            'invalid_count': invalid_count,
            'errors': errors if errors else None
        }
    
    def _detect_file_type(self, filename: str) -> str:
        """Detect MIME type."""
        if filename.endswith('.csv'):
            return 'text/csv'
        elif filename.endswith('.xlsx'):
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        elif filename.endswith('.xls'):
            return 'application/vnd.ms-excel'
        return 'application/octet-stream'
    
    def _clean_nan(self, data: list[dict]) -> list[dict]:
        """Replace NaN with None."""
        import math
        cleaned = []
        for row in data:
            cleaned_row = {}
            for key, value in row.items():
                if isinstance(value, float) and math.isnan(value):
                    cleaned_row[key] = None
                else:
                    cleaned_row[key] = value
            cleaned.append(cleaned_row)
        return cleaned
