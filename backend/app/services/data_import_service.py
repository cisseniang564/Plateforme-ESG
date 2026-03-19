"""
Data Import Service - Parse and validate CSV/Excel files.
"""
import io
import csv
from typing import Any, Optional
from uuid import UUID
from datetime import datetime

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.data_upload import DataUpload


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
        
        # Créer l'enregistrement upload
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
            # Parser le fichier
            if filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file_content))
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(io.BytesIO(file_content))
            else:
                raise ValueError(f"Unsupported file type: {filename}")
            
            # Extraire les données
            total_rows = len(df)
            preview = df.head(10).to_dict('records')
            
            # Nettoyer les NaN pour JSON
            preview = self._clean_nan(preview)
            
            # Valider les données
            validation_result = self._validate_data(df)
            
            # Mettre à jour l'upload
            upload.total_rows = total_rows
            upload.valid_rows = validation_result['valid_count']
            upload.invalid_rows = validation_result['invalid_count']
            upload.data_preview = preview
            upload.validation_errors = validation_result['errors']
            upload.file_metadata = {
                'columns': list(df.columns),
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
    
    def _detect_file_type(self, filename: str) -> str:
        """Detect MIME type from filename."""
        if filename.endswith('.csv'):
            return 'text/csv'
        elif filename.endswith('.xlsx'):
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        elif filename.endswith('.xls'):
            return 'application/vnd.ms-excel'
        return 'application/octet-stream'
    
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
