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
from app.models.indicator import Indicator
from app.models.indicator_data import IndicatorData
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
            all_rows = self._clean_nan(df.to_dict('records'))   # ← toutes les lignes
            preview = all_rows[:10]                              # ← 10 premières pour l'UI

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
                'all_rows': all_rows,   # ← stockage complet pour l'import réel
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
        organization_id: Optional[UUID] = None,
    ) -> dict[str, Any]:
        """Import data from upload to data_entries table.

        Also creates IndicatorData records for any row whose metric_name
        matches a known Indicator (by name or code), so the ESG scoring
        engine can pick up the data immediately.
        """

        result = await self.db.execute(
            select(DataUpload).where(
                DataUpload.id == upload_id,
                DataUpload.tenant_id == tenant_id
            )
        )
        upload = result.scalar_one_or_none()

        if not upload:
            raise ValueError("Upload not found")

        # ------------------------------------------------------------------
        # Build indicator lookup: name (lowercase) → Indicator
        #                        code (lowercase) → Indicator
        # ------------------------------------------------------------------
        ind_result = await self.db.execute(
            select(Indicator).where(
                Indicator.tenant_id == tenant_id,
                Indicator.is_active == True,
            )
        )
        indicators_by_name: dict[str, Indicator] = {}
        indicators_by_code: dict[str, Indicator] = {}
        for ind in ind_result.scalars().all():
            indicators_by_name[ind.name.lower().strip()] = ind
            indicators_by_code[ind.code.lower().strip()] = ind

        imported_count = 0
        indicator_data_created = 0
        error_count = 0
        errors = []

        # Lire toutes les lignes (data_preview = 10 lignes seulement pour l'UI)
        all_rows = (upload.file_metadata or {}).get('all_rows') or upload.data_preview or []

        for idx, row_data in enumerate(all_rows):
            try:
                entry_data = self._map_row_to_entry(row_data, column_mapping)

                # Valider les types AVANT insertion
                self._validate_entry_types(entry_data, idx)

                # Resolve organization_id: explicit arg > CSV 'organisation' column
                resolved_org_id = organization_id
                if not resolved_org_id:
                    # Some CSVs may carry an org name; skip lookup here –
                    # callers who need multi-org should use IndicatorDataService.
                    pass

                entry = DataEntry(
                    tenant_id=tenant_id,
                    created_by=user_id,
                    collection_method='csv_import',
                    organization_id=resolved_org_id,
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

                # ----------------------------------------------------------
                # Bridge: also write to indicator_data so the scoring engine
                # can find this data (it only queries indicator_data).
                # Match metric_name against Indicator.name or Indicator.code.
                # ----------------------------------------------------------
                if resolved_org_id and entry_data.get('value_numeric') is not None:
                    metric_key = str(entry_data.get('metric_name', '')).lower().strip()
                    matched_indicator = (
                        indicators_by_name.get(metric_key)
                        or indicators_by_code.get(metric_key)
                    )
                    if matched_indicator:
                        data_date = entry_data.get('period_start')
                        if not isinstance(data_date, date):
                            data_date = date.today()

                        ind_data = IndicatorData(
                            tenant_id=tenant_id,
                            indicator_id=matched_indicator.id,
                            organization_id=resolved_org_id,
                            upload_id=upload_id,
                            date=data_date,
                            value=float(entry_data['value_numeric']),
                            unit=entry_data.get('unit') or matched_indicator.unit,
                            notes=entry_data.get('notes'),
                            source='upload',
                            is_verified=False,
                        )
                        self.db.add(ind_data)
                        indicator_data_created += 1

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
            'indicator_data_created': indicator_data_created,
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
        """Detect file type identifier from filename (kept ≤ 50 chars)."""
        if filename.endswith('.csv'):
            return 'csv'
        elif filename.endswith('.xlsx'):
            return 'xlsx'
        elif filename.endswith('.xls'):
            return 'xls'
        return 'unknown'
    
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
