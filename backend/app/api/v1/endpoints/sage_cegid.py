"""
Sage / Cegid FEC connector.
Parses French FEC accounting exports and maps expense accounts
to ESG data entries (Scope 3 emissions + social indicators).
"""
import logging
from datetime import datetime, date, timezone
from typing import Optional, List
from uuid import uuid4, UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.fec_parser import parse_fec
from app.services.pcg_emission_mapper import aggregate_by_category

logger = logging.getLogger(__name__)
router = APIRouter()


class FECParseResult(BaseModel):
    entries_parsed: int
    categories_found: int
    total_co2e_kgco2e: float
    total_amount_eur: float
    categories: List[dict]
    year: Optional[int]


class FECSyncResult(BaseModel):
    entries_created: int
    total_co2e_kgco2e: float
    categories: List[str]


@router.post("/parse", response_model=FECParseResult)
async def parse_fec_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Parse a FEC file and return a preview of mapped ESG categories.
    Does NOT write to database — use /sync to persist.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Aucun fichier fourni")

    ext = file.filename.lower().split('.')[-1]
    if ext not in ('txt', 'csv', 'fec'):
        raise HTTPException(status_code=400, detail="Format accepté: .txt, .csv ou .fec")

    content = await file.read()

    try:
        rows = parse_fec(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur de parsing FEC: {str(e)}")

    if not rows:
        raise HTTPException(status_code=400, detail="Aucune écriture valide trouvée dans le fichier")

    aggregated = aggregate_by_category(rows)

    # Extract year from dates
    dates = [r['date'] for r in rows if r.get('date')]
    year = None
    if dates:
        years = set(d[:4] for d in dates if len(d) >= 4)
        year = int(max(years)) if years else None

    total_co2e = sum(a['value'] for a in aggregated if a['unit'] == 'kgCO2e')
    total_amount = sum(a['total_amount_eur'] for a in aggregated)

    return FECParseResult(
        entries_parsed=len(rows),
        categories_found=len(aggregated),
        total_co2e_kgco2e=round(total_co2e, 2),
        total_amount_eur=round(total_amount, 2),
        categories=aggregated,
        year=year,
    )


@router.post("/sync", response_model=FECSyncResult)
async def sync_fec_to_entries(
    file: UploadFile = File(...),
    org_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Parse FEC file and create ESG DataEntry records from mapped categories.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Aucun fichier fourni")

    content = await file.read()

    try:
        rows = parse_fec(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur de parsing FEC: {str(e)}")

    if not rows:
        raise HTTPException(status_code=400, detail="Aucune écriture valide trouvée")

    aggregated = aggregate_by_category(rows)

    from app.models.data_entry import DataEntry

    now = datetime.now(timezone.utc)
    created_count = 0

    for agg in aggregated:
        # Determine period dates
        period_start_date = date(now.year, 1, 1)
        period_end_date = date(now.year, 12, 31)
        period_type = 'annual'

        if agg.get('period'):
            try:
                year_str, month_str = agg['period'].split('-')
                period_start_date = date(int(year_str), int(month_str), 1)
                # Last day of that month
                if int(month_str) == 12:
                    period_end_date = date(int(year_str), 12, 31)
                else:
                    period_end_date = date(int(year_str), int(month_str) + 1, 1).__class__(
                        int(year_str), int(month_str) + 1, 1
                    )
                    # Subtract one day to get last day of current month
                    from datetime import timedelta
                    period_end_date = period_end_date - timedelta(days=1)
                period_type = 'monthly'
            except Exception:
                pass

        note = (
            f"FEC Import (Sage/Cegid) — {agg['entry_count']} écritures — "
            f"{agg['note']} — Montant: {agg['total_amount_eur']}€"
        )

        entry_kwargs: dict = {
            'id': uuid4(),
            'tenant_id': current_user.tenant_id,
            'pillar': agg['pillar'],
            'category': agg['category'],
            'metric_name': agg['metric_name'],
            'value_numeric': float(agg['value']),
            'unit': agg['unit'],
            'period_start': period_start_date,
            'period_end': period_end_date,
            'period_type': period_type,
            'data_source': 'FEC Import (Sage/Cegid)',
            'collection_method': 'import',
            'notes': note,
            'created_at': now,
            'updated_at': now,
            'created_by': current_user.id,
        }

        # Optional org_id
        if org_id:
            try:
                entry_kwargs['organization_id'] = UUID(org_id)
            except (ValueError, AttributeError):
                pass

        db.add(DataEntry(**entry_kwargs))
        created_count += 1

    await db.commit()

    total_co2e = sum(a['value'] for a in aggregated if a['unit'] == 'kgCO2e')
    category_names = [a['metric_name'] for a in aggregated]

    return FECSyncResult(
        entries_created=created_count,
        total_co2e_kgco2e=round(total_co2e, 2),
        categories=category_names,
    )


@router.get("/pcg-mapping")
async def get_pcg_mapping(
    current_user: User = Depends(get_current_user),
):
    """Return the PCG account → ESG category mapping table."""
    from app.services.pcg_emission_mapper import PCG_EMISSION_MAP
    return {
        "mappings": [
            {
                "compte_prefix": prefix,
                **mapping,
            }
            for prefix, mapping in PCG_EMISSION_MAP.items()
        ],
        "total_mappings": len(PCG_EMISSION_MAP),
    }


@router.get("/template")
async def get_fec_template(
    current_user: User = Depends(get_current_user),
):
    """Return info about expected FEC format."""
    return {
        "format": "FEC (Fichier des Écritures Comptables)",
        "separator": "| (pipe) ou ; (semicolon)",
        "encoding": "UTF-8 ou Latin-1",
        "date_format": "YYYYMMDD",
        "required_columns": [
            "JournalCode", "EcritureDate", "CompteNum", "CompteLib",
            "Debit", "Credit", "EcritureLib"
        ],
        "supported_erp": ["Sage 100", "Sage 50", "Cegid", "EBP", "Quadratus", "ACD"],
        "export_instructions": {
            "Sage 100": "Menu Comptabilité → Exercices → FEC → Exporter",
            "Cegid": "Outils → Export FEC → Format DGFiP",
            "EBP": "Fichier → Export → FEC fiscal",
        },
    }
