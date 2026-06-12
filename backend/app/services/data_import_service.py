"""
Data Import Service - Parse and validate CSV/Excel files.
"""
import io
import csv
import logging
from typing import Any, Optional
from uuid import UUID
from datetime import datetime

import pandas as pd
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.data_upload import DataUpload

logger = logging.getLogger(__name__)


class DataImportService:
    """Service for importing CSV/Excel data."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def parse_file(
        self,
        file_content: bytes,
        filename: str,
        tenant_id: UUID,
        user_id: UUID,
    ) -> DataUpload:
        """Parse CSV or Excel file and create upload record."""

        # ── Set RLS tenant context on THIS session ──────────────────────────
        # The data_uploads table has RLS enabled with a USING policy of
        # ``tenant_id = current_setting('app.current_tenant_id')::uuid``.
        # The TenantMiddleware sets that setting on a different session, so we
        # must set it again here — otherwise the post-commit refresh SELECT
        # will be filtered out and raise "Could not refresh instance".
        try:
            await self.db.execute(
                text("SELECT set_config('app.current_tenant_id', :tid, false)"),
                {"tid": str(tenant_id)},
            )
        except Exception as exc:
            logger.warning("Could not set tenant RLS context: %s", exc)

        # Créer l'enregistrement upload — set created_at/updated_at Python-side
        # so we don't need a refresh-after-INSERT round-trip that can fail with
        # greenlet_spawn during the response serialisation.
        _now = datetime.utcnow()
        upload = DataUpload(
            tenant_id=tenant_id,
            uploaded_by=user_id,
            filename=filename,
            file_size=len(file_content),
            file_type=self._detect_file_type(filename),
            status="processing",
            processing_started_at=_now,
            created_at=_now,
            updated_at=_now,
        )
        self.db.add(upload)
        await self.db.flush()
        
        try:
            # Parser le fichier
            if filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file_content))
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(io.BytesIO(file_content))
            else:
                raise ValueError(f"Unsupported file type: {filename}")
            
            total_rows = len(df)
            all_rows = self._clean_nan(df.to_dict('records'))  # ← toutes les lignes
            preview = all_rows[:10]                             # ← 10 premières pour l'UI

            validation_result = self._validate_data(df)

            upload.total_rows = total_rows
            upload.valid_rows = validation_result['valid_count']
            upload.invalid_rows = validation_result['invalid_count']
            upload.data_preview = preview
            upload.validation_errors = validation_result['errors']
            upload.file_metadata = {
                'columns': list(df.columns),
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
        # NOTE: we deliberately do NOT call ``await self.db.refresh(upload)``.
        # Refresh first expires attributes then SELECTs them back. If that
        # SELECT fails (RLS, network, …), the instance is left expired and any
        # subsequent attribute read raises MissingGreenlet (sync lazy-load in
        # async context). All values we care about are set Python-side above.
        return upload
    
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
        """Replace NaN values with None for JSON serialization."""
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
    
    def _validate_data(self, df: pd.DataFrame) -> dict[str, Any]:
        """Validate data and return validation results."""
        errors = {}
        valid_count = 0
        invalid_count = 0
        
        # Règles de validation basiques
        required_columns = ['indicator_code', 'value', 'date']
        
        # Vérifier les colonnes requises
        missing_cols = [col for col in required_columns if col not in df.columns]
        if missing_cols:
            errors['missing_columns'] = missing_cols
            invalid_count = len(df)
            return {
                'valid_count': valid_count,
                'invalid_count': invalid_count,
                'errors': errors,
            }
        
        # Valider chaque ligne
        for idx, row in df.iterrows():
            row_errors = []
            
            # Vérifier que les champs requis ne sont pas vides
            if pd.isna(row.get('indicator_code')):
                row_errors.append("Missing indicator_code")
            
            if pd.isna(row.get('value')):
                row_errors.append("Missing value")
            
            if pd.isna(row.get('date')):
                row_errors.append("Missing date")
            
            if row_errors:
                errors[f'row_{idx}'] = row_errors
                invalid_count += 1
            else:
                valid_count += 1
        
        return {
            'valid_count': valid_count,
            'invalid_count': invalid_count,
            'errors': errors if errors else None,
        }
