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

    # If parsing failed, return a clear 400 (not a 500 crash)
    if upload.status == "failed":
        raise HTTPException(
            status_code=400,
            detail=f"Impossible d'analyser le fichier : {upload.error_message or 'format non reconnu'}"
        )

    file_meta = upload.file_metadata or {}
    raw_mapping = file_meta.get('detected_mapping', {})

    # Convert composite directives / inferences into a frontend-friendly shape
    # ``display_mapping``: ``{target: human_string}`` (composites → "a + b + c")
    # ``detected_mapping``: ``{target: source_col_or_null}``  (flat strings,
    #   ready to be POSTed back by the import endpoint)
    display_mapping: dict[str, str] = {}
    flat_mapping:    dict[str, str] = {}
    inferences:      dict[str, str] = {}
    for key, val in raw_mapping.items():
        if key.startswith('_'):
            # Inference hints (_inferred_unit, _inferred_pillar, …)
            inferences[key.lstrip('_')] = val if isinstance(val, str) else str(val)
            continue
        if isinstance(val, dict):
            if '_composite' in val:
                display_mapping[key] = ' + '.join(val['_composite']) + '  (composite)'
                # Pick the first component as a sensible default for the user
                flat_mapping[key] = val['_composite'][0] if val['_composite'] else ''
        else:
            display_mapping[key] = str(val)
            flat_mapping[key] = str(val)

    return {
        'upload_id': str(upload.id),
        'filename': upload.filename,
        'total_rows': upload.total_rows,
        'columns': file_meta.get('columns', []),
        'detected_mapping': flat_mapping,
        'display_mapping': display_mapping,
        'inferences':      inferences,    # e.g. {"inferred_unit": "tCO2e"}
        'preview': upload.data_preview or [],
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
    """Import data from upload to data_entries table. Auto-triggers score recalculation."""

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

    # ── Auto-recalculate ESG scores after a successful import ─────────────
    # Run in the background (best-effort) so the import response is fast.
    scores_recalculated = 0
    if result.get('imported', 0) > 0:
        try:
            from sqlalchemy import select as _select
            from app.models.organization import Organization
            from app.services.esg_scoring_engine import ESGScoringEngine

            orgs_res = await db.execute(
                _select(Organization).where(Organization.tenant_id == current_user.tenant_id)
            )
            organizations = orgs_res.scalars().all()

            engine = ESGScoringEngine(db)
            for org in organizations:
                try:
                    await engine.calculate_organization_score(
                        tenant_id=current_user.tenant_id,
                        organization_id=org.id,
                        calculation_date=None,
                        period_months=36,  # Fenêtre élargie pour données historiques
                    )
                    scores_recalculated += 1
                except Exception:
                    pass  # Org sans données — normal, ne bloque pas l'import
        except Exception:
            pass  # Scoring failure never blocks import result

    result['scores_recalculated'] = scores_recalculated
    return result
