"""
Enedis electricity data connector.

Supports two modes:
  1. CSV import  — upload an Enedis export file (always available)
  2. OAuth2 API  — connect directly to Enedis Datahub (requires ENEDIS_CLIENT_ID/SECRET)

OAuth2 flow (Authorization Code):
  GET  /connectors/enedis/authorize    → redirect to Enedis consent page
  GET  /connectors/enedis/callback     → exchange code for tokens, store in Integration table
  GET  /connectors/enedis/status       → check connection state
  POST /connectors/enedis/sync         → pull daily consumption from Datahub
  DELETE /connectors/enedis/disconnect → revoke & delete stored tokens
"""
import hashlib
import logging
import secrets
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import RedirectResponse, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_db, get_current_user
from app.models.data_entry import DataEntry
from app.models.integration import Integration, IntegrationType
from app.models.user import User
from app.services.enedis_mapper import (
    compute_scope2_emissions,
    map_readings_to_esg_entries,
    parse_enedis_csv,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/connectors/enedis", tags=["Enedis Connector"])

# ─── OAuth2 helpers ───────────────────────────────────────────────────────────

_ENEDIS_SCOPE = "am_consumption"   # daily consumption; add am_production if needed


def _oauth_configured() -> bool:
    return bool(settings.ENEDIS_CLIENT_ID and settings.ENEDIS_CLIENT_SECRET)


async def _get_integration(db: AsyncSession, tenant_id) -> Optional[Integration]:
    result = await db.execute(
        select(Integration).where(
            Integration.tenant_id == tenant_id,
            Integration.type == IntegrationType.ENEDIS,
        )
    )
    return result.scalar_one_or_none()


async def _exchange_code(code: str, redirect_uri: str) -> dict:
    """Exchange authorization code for access + refresh tokens."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            settings.ENEDIS_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "client_id": settings.ENEDIS_CLIENT_ID,
                "client_secret": settings.ENEDIS_CLIENT_SECRET,
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if resp.status_code != 200:
        logger.error("Enedis token exchange failed: %s — %s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail=f"Enedis token exchange failed: {resp.status_code}")
    return resp.json()


async def _refresh_token(refresh_token: str) -> dict:
    """Use refresh token to get a new access token."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            settings.ENEDIS_TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "client_id": settings.ENEDIS_CLIENT_ID,
                "client_secret": settings.ENEDIS_CLIENT_SECRET,
                "refresh_token": refresh_token,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Enedis token refresh failed")
    return resp.json()


async def _ensure_fresh_token(integration: Integration, db: AsyncSession) -> str:
    """Return a valid access token, refreshing if within 5 minutes of expiry."""
    cfg = integration.config or {}
    expires_at_str = cfg.get("expires_at")
    if expires_at_str:
        expires_at = datetime.fromisoformat(expires_at_str)
        if datetime.now(timezone.utc) >= expires_at - timedelta(minutes=5):
            token_data = await _refresh_token(cfg["refresh_token"])
            cfg["access_token"] = token_data["access_token"]
            cfg["expires_at"] = (
                datetime.now(timezone.utc) + timedelta(seconds=token_data.get("expires_in", 3600))
            ).isoformat()
            if "refresh_token" in token_data:
                cfg["refresh_token"] = token_data["refresh_token"]
            integration.config = cfg
            integration.updated_at = datetime.now(timezone.utc)
            await db.commit()
    return cfg["access_token"]


# ─── OAuth2 endpoints ─────────────────────────────────────────────────────────

@router.get("/authorize", summary="Start Enedis OAuth2 flow — redirect to consent page")
async def enedis_authorize(
    usage_point_id: Optional[str] = Query(None, description="PDL/PCE meter ID (14 digits)"),
    current_user: User = Depends(get_current_user),
):
    """
    Build the Enedis authorization URL and redirect the user to the consent page.
    After consent, Enedis redirects back to /callback with an authorization code.
    """
    if not _oauth_configured():
        raise HTTPException(
            status_code=503,
            detail="Enedis OAuth non configuré. Ajoutez ENEDIS_CLIENT_ID et ENEDIS_CLIENT_SECRET.",
        )

    redirect_uri = settings.ENEDIS_REDIRECT_URI or f"{settings.APP_URL}/api/v1/connectors/enedis/callback"

    # state = tenant_id + random nonce (hex) — verified in callback
    state = f"{current_user.tenant_id}:{secrets.token_hex(16)}"

    params = {
        "response_type": "code",
        "client_id": settings.ENEDIS_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": _ENEDIS_SCOPE,
        "state": state,
        "duration": "P1Y",   # ask for 1-year token lifespan
    }
    if usage_point_id:
        params["usage_point_id"] = usage_point_id

    auth_url = f"{settings.ENEDIS_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/callback", summary="Handle Enedis OAuth2 callback — store tokens")
async def enedis_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    usage_point_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Called by Enedis after the user grants consent.
    Exchanges the authorization code for access + refresh tokens
    and stores them in the Integration table.
    """
    if error:
        frontend_url = f"{settings.APP_URL}/settings/integrations?enedis=error&reason={urllib.parse.quote(error)}"
        return RedirectResponse(url=frontend_url)

    if not code or not state:
        raise HTTPException(status_code=400, detail="Paramètres manquants (code ou state)")

    # Extract tenant_id from state
    try:
        tenant_id_str, _ = state.split(":", 1)
        from uuid import UUID as _UUID
        tenant_id = _UUID(tenant_id_str)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="State invalide")

    redirect_uri = settings.ENEDIS_REDIRECT_URI or f"{settings.APP_URL}/api/v1/connectors/enedis/callback"

    # Exchange code for tokens
    token_data = await _exchange_code(code, redirect_uri)

    expires_at = (
        datetime.now(timezone.utc) + timedelta(seconds=token_data.get("expires_in", 3600))
    ).isoformat()

    config = {
        "access_token":  token_data["access_token"],
        "refresh_token": token_data.get("refresh_token", ""),
        "token_type":    token_data.get("token_type", "Bearer"),
        "expires_at":    expires_at,
        "scope":         token_data.get("scope", _ENEDIS_SCOPE),
        "usage_point_id": usage_point_id or token_data.get("usage_points_id", ""),
        "connected_at":  datetime.now(timezone.utc).isoformat(),
    }

    # Upsert Integration record
    integration = await _get_integration(db, tenant_id)
    if integration:
        integration.config     = config
        integration.is_active  = True
        integration.last_error = None
    else:
        integration = Integration(
            id=uuid4(),
            tenant_id=tenant_id,
            name="Enedis Datahub",
            type=IntegrationType.ENEDIS,
            config=config,
            is_active=True,
        )
        db.add(integration)

    await db.commit()

    # Redirect back to frontend with success
    frontend_url = f"{settings.APP_URL}/settings/integrations?enedis=connected"
    return RedirectResponse(url=frontend_url)


@router.get("/status", summary="Check Enedis connection status")
async def enedis_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return whether Enedis is connected for this tenant."""
    if not _oauth_configured():
        return {
            "connected": False,
            "oauth_configured": False,
            "message": "OAuth non configuré — utilisez l'import CSV",
        }

    integration = await _get_integration(db, current_user.tenant_id)
    if not integration or not integration.is_active:
        return {"connected": False, "oauth_configured": True}

    cfg = integration.config or {}
    return {
        "connected":      True,
        "oauth_configured": True,
        "usage_point_id": cfg.get("usage_point_id"),
        "scope":          cfg.get("scope"),
        "connected_at":   cfg.get("connected_at"),
        "last_sync_at":   integration.last_sync_at.isoformat() if integration.last_sync_at else None,
        "last_error":     integration.last_error,
    }


@router.post("/sync", summary="Pull latest consumption data from Enedis Datahub")
async def enedis_sync(
    start: Optional[str] = Query(None, description="YYYY-MM-DD (défaut: 1 an en arrière)"),
    end: Optional[str] = Query(None, description="YYYY-MM-DD (défaut: aujourd'hui)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch daily electricity consumption from Enedis Datahub using stored OAuth tokens.
    Creates DataEntry records for energy consumption + Scope 2 CO2e emissions.
    """
    if not _oauth_configured():
        raise HTTPException(
            status_code=503,
            detail="Enedis OAuth non configuré. Utilisez /import-csv à la place.",
        )

    integration = await _get_integration(db, current_user.tenant_id)
    if not integration or not integration.is_active:
        raise HTTPException(
            status_code=400,
            detail="Enedis non connecté. Lancez d'abord /authorize.",
        )

    cfg = integration.config or {}
    usage_point_id = cfg.get("usage_point_id")
    if not usage_point_id:
        raise HTTPException(status_code=400, detail="usage_point_id manquant dans la configuration")

    # Date range defaults
    today = datetime.now(timezone.utc).date()
    end_date   = end   or today.isoformat()
    start_date = start or (today - timedelta(days=365)).isoformat()

    # Ensure fresh token
    access_token = await _ensure_fresh_token(integration, db)

    # Call Datahub API
    api_url = f"{settings.ENEDIS_API_BASE}/customers_metering_data/v5/daily_consumption"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                api_url,
                params={
                    "usage_point_id": usage_point_id,
                    "start": start_date,
                    "end": end_date,
                },
                headers={"Authorization": f"Bearer {access_token}"},
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Erreur réseau Enedis: {exc}")

    if resp.status_code == 401:
        integration.is_active = True
        integration.last_error = "Token expiré ou révoqué — reconnectez-vous"
        await db.commit()
        raise HTTPException(status_code=401, detail="Token Enedis invalide. Reconnectez-vous via /authorize.")

    if resp.status_code != 200:
        err = resp.text[:200]
        integration.last_error = f"Datahub error {resp.status_code}: {err}"
        await db.commit()
        raise HTTPException(status_code=502, detail=f"Datahub API error {resp.status_code}")

    data = resp.json()

    # Parse Datahub response — extract interval readings
    # Datahub v5 response shape: {"meter_reading": {"interval_reading": [{"value": "...", "date": "..."}]}}
    meter = data.get("meter_reading", {})
    readings = []
    for reading in meter.get("interval_reading", []):
        try:
            kwh = float(reading.get("value", 0)) / 1000  # Wh → kWh
            date_str = reading["date"][:10]
            readings.append({"kwh": kwh, "date": date_str})
        except (ValueError, KeyError):
            continue

    if not readings:
        raise HTTPException(status_code=204, detail="Aucune donnée de consommation trouvée pour cette période")

    # Map to ESG DataEntry records
    esg_entries = map_readings_to_esg_entries(readings)
    now = datetime.now(timezone.utc)
    created_count = 0

    for entry_data in esg_entries:
        entry = DataEntry(
            id=uuid4(),
            tenant_id=current_user.tenant_id,
            pillar=entry_data["pillar"],
            category=entry_data["category"],
            metric_name=entry_data["metric_name"],
            value_numeric=entry_data.get("value_numeric"),
            unit=entry_data.get("unit"),
            period_start=entry_data["period_start"],
            period_end=entry_data["period_end"],
            period_type=entry_data.get("period_type", "monthly"),
            data_source="enedis_datahub",
            collection_method="api",
            calculation_method=entry_data.get("calculation_method"),
            notes=f"PDL {usage_point_id} — sync automatique Datahub",
            created_by=current_user.id,
            created_at=now,
            updated_at=now,
        )
        db.add(entry)
        created_count += 1

    # Update last_sync_at
    integration.last_sync_at = now
    integration.last_error   = None
    await db.commit()

    total_kwh = sum(r["kwh"] for r in readings)
    return {
        "readings_fetched":  len(readings),
        "entries_created":   created_count,
        "energy_total_kwh":  round(total_kwh, 2),
        "co2_total_kgco2e":  round(compute_scope2_emissions(total_kwh), 4),
        "period":            {"start": start_date, "end": end_date},
        "usage_point_id":    usage_point_id,
        "source":            "enedis_datahub",
    }


@router.delete("/disconnect", summary="Disconnect Enedis — revoke stored tokens")
async def enedis_disconnect(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove the stored Enedis OAuth tokens for this tenant."""
    integration = await _get_integration(db, current_user.tenant_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Aucune connexion Enedis trouvée")

    await db.delete(integration)
    await db.commit()
    return {"message": "Connexion Enedis supprimée avec succès"}


# ─── CSV import (always available) ────────────────────────────────────────────


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
