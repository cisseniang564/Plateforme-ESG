"""
ESG Data Import API - Import CSV to data_entries
"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.permissions import Roles
from app.dependencies import get_db, require_any_role
from app.models.user import User
from app.services.esg_data_import_service import (
    AlreadyImportedError, ESGDataImportService, UploadNotFoundError,
)

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
    current_user: User = Depends(require_any_role(*Roles.ENTRY_OR_ABOVE))
):
    """Upload CSV/Excel and get preview with auto-detected columns."""
    
    # L'extension fait foi (le type MIME envoyé par le navigateur n'est pas fiable).
    filename = (file.filename or "").strip()
    if not filename.lower().endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Format non pris en charge : utilisez un fichier .csv, .xlsx ou .xls.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Le fichier est vide.")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (10 Mo maximum).")

    # Parse and preview
    service = ESGDataImportService(db)
    upload = await service.parse_and_preview(
        file_content=content,
        filename=filename,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id
    )

    # If parsing failed, return a clear 400 (not a 500 crash)
    if upload.status == "failed":
        import logging
        logging.getLogger(__name__).warning("Import preview failed (%s): %s", filename, upload.error_message)
        raise HTTPException(
            status_code=400,
            detail="Impossible de lire ce fichier. Vérifiez qu'il s'agit d'un CSV ou d'un Excel valide, avec une ligne d'en-tête.",
        )
    if not upload.total_rows:
        raise HTTPException(status_code=400, detail="Le fichier ne contient aucune ligne de données.")

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

    columns = file_meta.get('columns', [])
    return {
        # Destination réelle des lignes : 'generic' (saisies ESG), 'materiality',
        # 'risks' ou 'suppliers' — décidée d'après les colonnes du fichier.
        'intent': ESGDataImportService._detect_file_intent(columns),
        'upload_id': str(upload.id),
        'filename': upload.filename,
        'total_rows': upload.total_rows,
        'columns': columns,
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
    current_user: User = Depends(require_any_role(*Roles.ENTRY_OR_ABOVE))
):
    """Import data from upload to data_entries table. Auto-triggers score recalculation."""

    service = ESGDataImportService(db)

    # Extract organization_id before building column_mapping dict
    org_id = mapping.organization_id
    mapping_dict = mapping.dict(exclude_none=True)
    mapping_dict.pop('organization_id', None)

    try:
        result = await service.import_to_data_entries(
            upload_id=upload_id,
            column_mapping=mapping_dict,
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            organization_id=org_id,
            user=current_user,
        )
    except UploadNotFoundError:
        raise HTTPException(status_code=404, detail="Fichier introuvable. Recommencez l'import.")
    except AlreadyImportedError:
        raise HTTPException(status_code=409, detail="Ce fichier a déjà été importé. Pour le réimporter, déposez-le à nouveau.")

    # ── Auto-recalculate ESG scores after a successful import ─────────────
    # Run in the background (best-effort) so the import response is fast.
    scores_recalculated = 0
    if result.get('imported', 0) > 0 and result.get('target', 'generic') == 'generic':
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
