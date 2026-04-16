"""
ESG Data Import API - Import CSV to data_entries
"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.esg_data_import_service import ESGDataImportService

router = APIRouter()


class ColumnMappingRequest(BaseModel):
    pillar: str = ''
    category: str = ''
    metric_name: str
    value_numeric: str
    unit: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    data_source: Optional[str] = None
    notes: Optional[str] = None
    # When provided, IndicatorData bridge records will be linked to this org
    organization_id: Optional[UUID] = None


@router.post("/upload-preview")
async def upload_and_preview(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload CSV/Excel and get preview with auto-detected columns."""
    
    # Validate file type
    allowed_types = ['text/csv', 'application/vnd.ms-excel', 
                     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    
    if file.content_type not in allowed_types and not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    # Read content
    content = await file.read()
    
    # Size limit
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    # Parse and preview
    service = ESGDataImportService(db)
    upload = await service.parse_and_preview(
        file_content=content,
        filename=file.filename,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id
    )
    
    return {
        'upload_id': str(upload.id),
        'filename': upload.filename,
        'total_rows': upload.total_rows,
        'columns': upload.file_metadata.get('columns', []),
        'detected_mapping': upload.file_metadata.get('detected_mapping', {}),
        'preview': upload.data_preview,
        'validation': {
            'valid_rows': upload.valid_rows,
            'invalid_rows': upload.invalid_rows,
            'errors': upload.validation_errors
        }
    }


@router.post("/uploads/{upload_id}/import")
async def import_data(
    upload_id: UUID,
    mapping: ColumnMappingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import data from upload to data_entries table."""
    
    service = ESGDataImportService(db)

    # Extract organization_id before building column_mapping dict
    org_id = mapping.organization_id
    mapping_dict = mapping.dict(exclude_none=True)
    mapping_dict.pop('organization_id', None)

    result = await service.import_to_data_entries(
        upload_id=upload_id,
        column_mapping=mapping_dict,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        organization_id=org_id,
    )

    return result
