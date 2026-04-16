"""Enedis electricity data connector."""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4
from datetime import datetime, timezone

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.data_entry import DataEntry
from app.services.enedis_mapper import (
    parse_enedis_csv,
    map_readings_to_esg_entries,
    compute_scope2_emissions,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/connectors/enedis", tags=["Enedis Connector"])


class EnedisImportResult(BaseModel):
    readings_parsed: int
    entries_created: int
    energy_total_kwh: float
    co2_total_kgco2e: float
    periods: list[str]


@router.post("/import-csv", response_model=EnedisImportResult)
async def import_enedis_csv(
    file: UploadFile = File(...),
    org_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Import electricity consumption data from an Enedis CSV export file.
    Automatically creates:
    - Energy consumption entries (kWh/month)
    - Scope 2 CO2e emission entries (calculated from French grid factor)
    """
    if not file.filename or not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="Veuillez fournir un fichier CSV Enedis")

    content_bytes = await file.read()
    try:
        content = content_bytes.decode('utf-8')
    except UnicodeDecodeError:
        try:
            content = content_bytes.decode('latin-1')
        except Exception:
            raise HTTPException(status_code=400, detail="Impossible de lire le fichier CSV")

    # Parse CSV
    try:
        readings = parse_enedis_csv(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur de parsing CSV: {str(e)}")

    if not readings:
        raise HTTPException(status_code=400, detail="Aucune donnée valide trouvée dans le fichier")

    # Map to ESG entries
    esg_entries = map_readings_to_esg_entries(readings, org_id)

    # Insert into DataEntry
    now = datetime.now(timezone.utc)
    created_count = 0
    for entry_data in esg_entries:
        entry = DataEntry(
            id=uuid4(),
            tenant_id=current_user.tenant_id,
            pillar=entry_data['pillar'],
            category=entry_data['category'],
            metric_name=entry_data['metric_name'],
            value_numeric=entry_data.get('value_numeric'),
            unit=entry_data.get('unit'),
            period_start=entry_data['period_start'],
            period_end=entry_data['period_end'],
            period_type=entry_data.get('period_type', 'monthly'),
            data_source=entry_data.get('data_source'),
            collection_method=entry_data.get('collection_method'),
            calculation_method=entry_data.get('calculation_method'),
            notes=entry_data.get('notes'),
            created_by=current_user.id,
            created_at=now,
            updated_at=now,
        )
        db.add(entry)
        created_count += 1

    await db.commit()

    # Compute summary stats
    total_kwh = sum(r['kwh'] for r in readings)
    total_co2 = compute_scope2_emissions(total_kwh)
    periods = sorted(set(r['date'][:7] for r in readings))

    return EnedisImportResult(
        readings_parsed=len(readings),
        entries_created=created_count,
        energy_total_kwh=round(total_kwh, 2),
        co2_total_kgco2e=round(total_co2, 4),
        periods=periods,
    )


@router.get("/template")
async def get_csv_template():
    """Return a sample Enedis CSV template for download."""
    csv_content = """Date;Valeur;Unité
2024-01-01;1250.5;kWh
2024-02-01;1180.2;kWh
2024-03-01;1320.8;kWh
2024-04-01;980.1;kWh
2024-05-01;850.3;kWh
2024-06-01;720.9;kWh
2024-07-01;680.4;kWh
2024-08-01;710.2;kWh
2024-09-01;820.7;kWh
2024-10-01;1050.5;kWh
2024-11-01;1190.3;kWh
2024-12-01;1380.6;kWh
"""
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=enedis_template.csv"},
    )
