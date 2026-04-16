"""
Connectors API — catalog, status management & proxy for external ESG data providers.
Supports: Climatiq, Carbon Interface, Schneider Electric
"""
import os
import re
import json
import logging
import httpx
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Redis helper ─────────────────────────────────────────────────────────────

def _get_redis():
    try:
        import redis as _redis
        redis_url = str(settings.REDIS_URL) if settings.REDIS_URL else "redis://redis:6379/0"
        return _redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=2)
    except Exception as e:
        logger.warning("Connectors: Redis unavailable — %s", e)
        return None


# ─── Static connector catalog ─────────────────────────────────────────────────
# Catalog metadata is static (product definition). Per-tenant STATUS is stored in Redis.

CONNECTOR_CATALOG: List[Dict[str, Any]] = [
    {"id": "sap-s4", "name": "SAP S/4HANA", "category": "ERP",
     "description": "ERP financier — dépenses énergie, achats, données carbone Scope 3",
     "status": "available", "color": "#1e40af", "authType": "oauth2",
     "lastSync": None, "records": 0, "errorMsg": None,
     "coverage": {"emissions": True, "energy": True, "hr": False, "finance": True, "waste": False, "water": False},
     "version": "S/4HANA 2023", "endpoint": "https://api.sap.com/s4hanacloud/v1"},
    {"id": "oracle-fusion", "name": "Oracle Fusion", "category": "ERP",
     "description": "Suite ERP Oracle — données financières et achats durables",
     "status": "available", "color": "#dc2626", "authType": "oauth2",
     "lastSync": None, "records": 0, "errorMsg": None,
     "coverage": {"emissions": False, "energy": True, "hr": False, "finance": True, "waste": False, "water": False},
     "version": "Oracle 23c", "endpoint": "https://api.oracle.com/erp/v1"},
    {"id": "netsuite", "name": "NetSuite", "category": "ERP",
     "description": "ERP cloud Oracle — achats, fournisseurs, données financières ESG",
     "status": "available", "color": "#7c3aed", "authType": "apikey",
     "lastSync": None, "records": 0, "errorMsg": None,
     "coverage": {"emissions": False, "energy": False, "hr": False, "finance": True, "waste": False, "water": False},
     "version": "2024.1", "endpoint": "https://[accountId].suitetalk.api.netsuite.com"},
    {"id": "workday", "name": "Workday", "category": "HR",
     "description": "SIRH — effectifs, diversité, formation, égalité salariale",
     "status": "available", "color": "#0891b2", "authType": "oauth2",
     "lastSync": None, "records": 0, "errorMsg": None,
     "coverage": {"emissions": False, "energy": False, "hr": True, "finance": False, "waste": False, "water": False},
     "version": "API v38", "endpoint": "https://wd2-impl-services1.workday.com/ccx/service"},
    {"id": "bamboohr", "name": "BambooHR", "category": "HR",
     "description": "RH PME — données collaborateurs, turnover, bien-être",
     "status": "available", "color": "#16a34a", "authType": "apikey",
     "lastSync": None, "records": 0, "errorMsg": None,
     "coverage": {"emissions": False, "energy": False, "hr": True, "finance": False, "waste": False, "water": False},
     "version": "v1", "endpoint": "https://api.bamboohr.com/api/gateway.php"},
    {"id": "successfactors", "name": "SAP SuccessFactors", "category": "HR",
     "description": "SIRH SAP — performance, formation, rémunération équitable",
     "status": "available", "color": "#9333ea", "authType": "oauth2",
     "lastSync": None, "records": 0, "errorMsg": None,
     "coverage": {"emissions": False, "energy": False, "hr": True, "finance": False, "waste": False, "water": False},
     "version": "OData v4", "endpoint": "https://api4.successfactors.com/odata/v4"},
    {"id": "schneider", "name": "Schneider Electric", "category": "Energy",
     "description": "EcoStruxure & ION — consommation électrique, efficacité énergétique bâtiments",
     "status": "available", "color": "#059669", "authType": "oauth2",
     "lastSync": None, "records": 0, "errorMsg": None,
     "coverage": {"emissions": True, "energy": True, "hr": False, "finance": False, "waste": False, "water": True},
     "version": "EcoStruxure v3", "endpoint": "https://api.exchange.se.com/ecostruxure/v3"},
    {"id": "enedis", "name": "Enedis", "category": "Energy",
     "description": "Données de consommation électrique réseau France — courbes de charge",
     "status": "available", "color": "#0284c7", "authType": "apikey",
     "lastSync": None, "records": 0, "errorMsg": None,
     "coverage": {"emissions": True, "energy": True, "hr": False, "finance": False, "waste": False, "water": False},
     "version": "API Enedis v2", "endpoint": "https://datahub-enedis.fr/api/oauth2"},
    {"id": "edf", "name": "EDF Data", "category": "Energy",
     "description": "Historiques & prévisions énergétiques EDF — mix électrique, facteurs d'émission",
     "status": "available", "color": "#b91c1c", "authType": "certificate",
     "lastSync": None, "records": 0, "errorMsg": None,
     "coverage": {"emissions": True, "energy": True, "hr": False, "finance": False, "waste": False, "water": False},
     "version": "DataAPI v1", "endpoint": "https://api.edf.fr/data/v1"},
    {"id": "climatiq", "name": "Climatiq API", "category": "Carbon",
     "description": "Base de facteurs d'émission — 40 000+ facteurs GHG Protocol certifiés",
     "status": "available", "color": "#16a34a", "authType": "apikey",
     "lastSync": None, "records": 0, "errorMsg": None,
     "coverage": {"emissions": True, "energy": False, "hr": False, "finance": False, "waste": True, "water": False},
     "version": "v3", "endpoint": "https://api.climatiq.io/v3"},
    {"id": "carbon-interface", "name": "Carbon Interface", "category": "Carbon",
     "description": "Calcul d'empreinte carbone — transport, énergie, expéditions",
     "status": "available", "color": "#0f766e", "authType": "apikey",
     "lastSync": None, "records": 0, "errorMsg": None,
     "coverage": {"emissions": True, "energy": False, "hr": False, "finance": False, "waste": False, "water": False},
     "version": "v1", "endpoint": "https://www.carboninterface.com/api/v1"},
    # ── Comptabilité française ─────────────────────────────────────────────────
    {"id": "pennylane", "name": "Pennylane", "category": "Comptabilité FR",
     "description": "Comptabilité française cloud — import automatique achats & charges pour Scope 3 catégorie 1",
     "status": "available", "color": "#6366f1", "authType": "apikey",
     "lastSync": None, "records": 0, "errorMsg": None,
     "coverage": {"emissions": True, "energy": False, "hr": False, "finance": True, "waste": False, "water": False},
     "version": "API v1", "endpoint": "https://app.pennylane.com/api/external/v1"},
    {"id": "cegid", "name": "Cegid Quadra / Loop", "category": "Comptabilité FR",
     "description": "Suite comptable française — export FEC standard, achats et charges énergétiques",
     "status": "available", "color": "#0891b2", "authType": "fec_import",
     "lastSync": None, "records": 0, "errorMsg": None,
     "coverage": {"emissions": True, "energy": True, "hr": False, "finance": True, "waste": False, "water": False},
     "version": "FEC 2024 / Loop API", "endpoint": "https://api.cegid.com/loop/v1"},
    {"id": "sage", "name": "Sage 100 / Sage X3", "category": "Comptabilité FR",
     "description": "ERP et comptabilité Sage — import FEC pour calcul automatique Scope 3 catégorie 1",
     "status": "available", "color": "#22c55e", "authType": "fec_import",
     "lastSync": None, "records": 0, "errorMsg": None,
     "coverage": {"emissions": True, "energy": True, "hr": True, "finance": True, "waste": False, "water": False},
     "version": "FEC standard / Sage API v2", "endpoint": "https://api.sage.com/accounting/v3"},
]


# ─── Catalog schema ───────────────────────────────────────────────────────────

class ConnectorStatusUpdate(BaseModel):
    status: str  # connected | available | error
    lastSync: Optional[str] = None
    records: Optional[int] = None
    errorMsg: Optional[str] = None


# ─── Catalog endpoints ────────────────────────────────────────────────────────

@router.get("/catalog")
async def get_connector_catalog(
    current_user: User = Depends(get_current_user)
):
    """
    Retourne le catalogue des connecteurs fusionné avec le statut per-tenant depuis Redis.
    Si Redis est indisponible, renvoie le catalogue avec les statuts par défaut.
    """
    r = _get_redis()
    tenant_overrides: Dict[str, Dict] = {}
    if r:
        try:
            key = f"connectors:status:{current_user.tenant_id}"
            raw = r.get(key)
            if raw:
                tenant_overrides = json.loads(raw)
        except Exception as e:
            logger.warning("Connectors catalog: Redis read error — %s", e)

    result = []
    for item in CONNECTOR_CATALOG:
        merged = dict(item)
        if item["id"] in tenant_overrides:
            merged.update(tenant_overrides[item["id"]])
        result.append(merged)

    return {"connectors": result, "count": len(result)}


@router.patch("/{connector_id}/status")
async def update_connector_status(
    connector_id: str,
    payload: ConnectorStatusUpdate,
    current_user: User = Depends(get_current_user)
):
    """Met à jour le statut d'un connecteur pour le tenant courant."""
    # Validate connector exists in catalog
    catalog_ids = {c["id"] for c in CONNECTOR_CATALOG}
    if connector_id not in catalog_ids:
        raise HTTPException(status_code=404, detail=f"Connecteur inconnu: {connector_id}")

    r = _get_redis()
    if not r:
        raise HTTPException(status_code=503, detail="Service temporairement indisponible (Redis)")

    try:
        key = f"connectors:status:{current_user.tenant_id}"
        raw = r.get(key)
        overrides: Dict[str, Dict] = json.loads(raw) if raw else {}

        overrides[connector_id] = {
            "status": payload.status,
            "lastSync": payload.lastSync,
            "records": payload.records or 0,
            "errorMsg": payload.errorMsg,
        }
        r.setex(key, 365 * 24 * 3600, json.dumps(overrides))
        return {"ok": True, "connector_id": connector_id, "status": payload.status}
    except Exception as e:
        logger.error("Connectors status update error: %s", e)
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour")


@router.post("/{connector_id}/sync")
async def trigger_connector_sync(
    connector_id: str,
    current_user: User = Depends(get_current_user)
):
    """Déclenche une synchronisation pour un connecteur (Schneider uniquement en temps réel, autres simulés)."""
    catalog_ids = {c["id"] for c in CONNECTOR_CATALOG}
    if connector_id not in catalog_ids:
        raise HTTPException(status_code=404, detail=f"Connecteur inconnu: {connector_id}")

    from datetime import datetime
    last_sync = datetime.utcnow().strftime("%d/%m/%Y %H:%M")

    # Pour Schneider, on peut appeler le vrai endpoint
    if connector_id == "schneider":
        try:
            from app.api.v1.endpoints.schneider import get_schneider_emissions
            data = await get_schneider_emissions()
            records = data.get("summary", {}).get("n_sites", 0) * 100
        except Exception:
            records = 0
    else:
        records = 0  # Simulation — à implémenter par connecteur

    return {
        "ok": True,
        "connector_id": connector_id,
        "last_sync": last_sync,
        "records_synced": records,
        "message": f"Synchronisation déclenchée pour {connector_id}",
    }


def _read_env_key(key: str) -> str:
    """Read a key from os.environ first, then fallback to .env file."""
    value = os.getenv(key, "")
    if value:
        return value
    # Fallback: parse .env file directly (dev mode without Docker)
    for candidate in [
        Path(__file__).parents[5] / ".env",
        Path(__file__).parents[5] / "backend" / ".env",
        Path("/app/.env"),
    ]:
        if candidate.exists():
            for line in candidate.read_text().splitlines():
                m = re.match(rf"^{re.escape(key)}\s*=\s*(.+)$", line.strip())
                if m:
                    return m.group(1).strip().strip('"').strip("'")
    return ""


CLIMATIQ_API_KEY = _read_env_key("CLIMATIQ_API_KEY")
CARBON_INTERFACE_API_KEY = _read_env_key("CARBON_INTERFACE_API_KEY")


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ConnectorTestRequest(BaseModel):
    connector_id: str
    api_key: Optional[str] = None  # override from .env if provided by user


class ClimatiqEstimateRequest(BaseModel):
    emission_factor: dict
    parameters: dict


class CarbonInterfaceEstimateRequest(BaseModel):
    type: str  # "electricity", "flight", "shipping", "vehicle", "fuel_combustion"
    electricity_unit: Optional[str] = "kwh"
    electricity_value: Optional[float] = None
    country: Optional[str] = "fr"


# ─── Climatiq ─────────────────────────────────────────────────────────────────

@router.post("/test")
async def test_connector(req: ConnectorTestRequest):
    """Test la connexion à un connecteur externe."""
    connector = req.connector_id.lower()
    api_key = req.api_key  # user-provided key (optional override)

    if connector == "climatiq":
        return await _test_climatiq(api_key or CLIMATIQ_API_KEY)
    elif connector in ("carbon-interface", "carbon_interface"):
        return await _test_carbon_interface(api_key or CARBON_INTERFACE_API_KEY)
    elif connector == "schneider":
        return await _test_schneider()
    else:
        raise HTTPException(status_code=400, detail=f"Connecteur inconnu: {connector}")


async def _test_climatiq(api_key: str):
    """Teste la clé Climatiq avec un calcul d'émission réel (1 kWh électricité France)."""
    if not api_key:
        raise HTTPException(status_code=400, detail="Clé API Climatiq manquante. Définissez CLIMATIQ_API_KEY dans .env")

    payload = {
        "emission_factor": {
            "activity_id": "electricity-supply_grid-source_residual_mix",
            "region": "FR",
            "data_version": "^0",
        },
        "parameters": {"energy": 1, "energy_unit": "kWh"},
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(
                "https://api.climatiq.io/data/v1/estimate",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if resp.status_code == 200:
            data = resp.json()
            co2e = data.get("co2e", "?")
            co2e_unit = data.get("co2e_unit", "kg")
            ef = data.get("emission_factor", {})
            return {
                "status": "success",
                "connector": "Climatiq API",
                "message": (
                    f"Connexion réussie — Test: 1 kWh électricité France = {co2e} {co2e_unit} CO₂e"
                ),
                "details": {
                    "api_version": "data/v1",
                    "source": ef.get("source", "?"),
                    "year": ef.get("year", "?"),
                    "region": ef.get("region", "FR"),
                    "http_status": 200,
                },
            }
        elif resp.status_code == 401:
            return {
                "status": "error",
                "connector": "Climatiq API",
                "message": "Clé API invalide ou expirée (HTTP 401). Vérifiez votre clé sur app.climatiq.io",
                "details": {"http_status": 401},
            }
        else:
            return {
                "status": "error",
                "connector": "Climatiq API",
                "message": f"Réponse inattendue HTTP {resp.status_code}",
                "details": {"http_status": resp.status_code, "body": resp.text[:200]},
            }
    except httpx.TimeoutException:
        return {
            "status": "error",
            "connector": "Climatiq API",
            "message": "Délai de connexion dépassé (timeout 12s)",
            "details": {},
        }
    except Exception as e:
        return {
            "status": "error",
            "connector": "Climatiq API",
            "message": f"Erreur réseau: {str(e)}",
            "details": {},
        }


async def _test_carbon_interface(api_key: str):
    """Teste la clé Carbon Interface avec un calcul électricité minimal."""
    if not api_key:
        raise HTTPException(status_code=400, detail="Clé API Carbon Interface manquante.")

    payload = {
        "type": "electricity",
        "electricity_unit": "kwh",
        "electricity_value": 1,
        "country": "fr",
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(
                "https://www.carboninterface.com/api/v1/estimates",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if resp.status_code in (200, 201):
            data = resp.json() if resp.text.strip() else {}
            attrs = data.get("data", {}).get("attributes", {})
            co2e = attrs.get("carbon_kg", "?")
            return {
                "status": "success",
                "connector": "Carbon Interface",
                "message": f"Connexion réussie — Test: 1 kWh France = {co2e} kg CO₂e",
                "details": {
                    "api_version": "v1",
                    "endpoint": "https://www.carboninterface.com/api/v1",
                    "http_status": resp.status_code,
                },
            }
        elif resp.status_code == 401:
            return {
                "status": "error",
                "connector": "Carbon Interface",
                "message": "Clé API invalide ou expirée (HTTP 401). Vérifiez votre clé sur carboninterface.com",
                "details": {"http_status": 401, "hint": "Régénérez la clé dans votre dashboard Carbon Interface"},
            }
        elif resp.status_code == 403:
            return {
                "status": "error",
                "connector": "Carbon Interface",
                "message": "Accès refusé — plan API insuffisant (HTTP 403)",
                "details": {"http_status": 403},
            }
        else:
            return {
                "status": "error",
                "connector": "Carbon Interface",
                "message": f"Réponse inattendue HTTP {resp.status_code}",
                "details": {"http_status": resp.status_code, "body": resp.text[:200]},
            }
    except httpx.TimeoutException:
        return {
            "status": "error",
            "connector": "Carbon Interface",
            "message": "Délai de connexion dépassé (timeout 12s)",
            "details": {},
        }
    except Exception as e:
        return {
            "status": "error",
            "connector": "Carbon Interface",
            "message": f"Erreur réseau: {str(e)}",
            "details": {},
        }


async def _test_schneider():
    """Teste le connecteur Schneider EcoStruxure via la logique interne."""
    from app.api.v1.endpoints.schneider import get_schneider_emissions, _climatiq_key
    try:
        data = await get_schneider_emissions()
        summary = data.get("summary", {})
        n = summary.get("n_sites", 0)
        co2e_t = summary.get("total_co2e_t", 0)
        climatiq = summary.get("climatiq_used", False)
        return {
            "status": "success",
            "connector": "Schneider Electric",
            "message": (
                f"EcoStruxure connecté — {n} sites · {co2e_t} t CO₂e"
                + (" · Climatiq ✓" if climatiq else " · Facteurs IEA (fallback)")
            ),
            "details": {
                "sites": n,
                "total_co2e_t": co2e_t,
                "source": summary.get("source", "EcoStruxure"),
                "climatiq_used": climatiq,
            },
        }
    except Exception as e:
        return {
            "status": "error",
            "connector": "Schneider Electric",
            "message": f"Erreur EcoStruxure : {str(e)}",
            "details": {},
        }


# ─── Climatiq proxy — calcul d'émissions ──────────────────────────────────────

@router.post("/climatiq/estimate")
async def climatiq_estimate(req: ClimatiqEstimateRequest):
    """Proxy vers Climatiq pour un calcul d'émission GES."""
    if not CLIMATIQ_API_KEY:
        raise HTTPException(status_code=503, detail="Clé Climatiq non configurée")

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            "https://api.climatiq.io/data/v1/estimate",
            headers={"Authorization": f"Bearer {CLIMATIQ_API_KEY}"},
            json={"emission_factor": req.emission_factor, "parameters": req.parameters},
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


# ─── Carbon Interface proxy — calcul empreinte ────────────────────────────────

@router.post("/carbon-interface/estimate")
async def carbon_interface_estimate(req: CarbonInterfaceEstimateRequest):
    """Proxy vers Carbon Interface pour un calcul d'empreinte carbone."""
    if not CARBON_INTERFACE_API_KEY:
        raise HTTPException(status_code=503, detail="Clé Carbon Interface non configurée")

    payload: dict = {"type": req.type}
    if req.electricity_value is not None:
        payload["electricity_unit"] = req.electricity_unit
        payload["electricity_value"] = req.electricity_value
        payload["country"] = req.country

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            "https://www.carboninterface.com/api/v1/estimates",
            headers={
                "Authorization": f"Bearer {CARBON_INTERFACE_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


# ─── FEC Import — Fichier des Écritures Comptables ────────────────────────────
# Format légal français compatible Sage, Cegid, Pennylane, QuickBooks FR.
# Utilisé pour calculer automatiquement le Scope 3 catégorie 1 (achats).

class FECImportPayload(BaseModel):
    content: str          # Contenu texte du fichier FEC
    year: int
    separator: str = "|"  # Séparateur standard FEC (pipe)
    dry_run: bool = False  # Si True : aperçu sans import


# Mapping comptes → catégories ESG + facteurs d'émission ADEME (kgCO2e/€)
_FEC_ACCOUNT_MAP = [
    ("601",  "environmental", "Achats matières premières",     "scope3_cat1_raw_materials",    0.000150),
    ("602",  "environmental", "Achats consommables",           "scope3_cat1_consumables",       0.000080),
    ("604",  "environmental", "Achats énergie",                "scope3_cat2_energy_purchased",  0.000200),
    ("6061", "environmental", "Carburants (Scope 1)",          "scope1_fuel_vehicles",          0.002500),
    ("606",  "environmental", "Fournitures générales",         "scope3_cat1_supplies",          0.000060),
    ("60",   "environmental", "Achats de marchandises",        "scope3_cat1_goods",             0.000110),
    ("61",   "environmental", "Services extérieurs",           "scope3_cat1_services",          0.000040),
    ("6251", "environmental", "Voyages & déplacements",        "scope3_cat6_business_travel",   0.000400),
    ("6256", "environmental", "Missions professionnelles",     "scope3_cat6_missions",          0.000120),
    ("62",   "environmental", "Autres services extérieurs",    "scope3_cat1_other_services",    0.000035),
]


@router.post("/fec/import")
async def import_fec(
    payload: FECImportPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Importe un fichier FEC (Fichier des Écritures Comptables) et génère
    automatiquement des DataEntry pour le Scope 3 catégorie 1.
    Compatible : Sage 100, Cegid Quadra, Pennylane, ACD, Ciel Compta.
    """
    from sqlalchemy.ext.asyncio import AsyncSession as _AS
    from app.db.session import get_db as _get_db
    from app.models.data_entry import DataEntry
    from datetime import date
    import uuid

    lines = payload.content.strip().splitlines()
    if not lines:
        raise HTTPException(status_code=400, detail="Fichier FEC vide")

    # Detect separator — try payload value, then auto-detect from first line
    first_line = lines[0]
    sep = payload.separator  # default "|"
    if sep not in first_line:
        # Count candidates and pick the most frequent
        candidates = ["\t", ";", ",", "|"]
        sep = max(candidates, key=lambda s: first_line.count(s))
        if first_line.count(sep) == 0:
            sep = "|"  # last resort

    headers_raw = lines[0].split(sep)
    headers = [h.strip().lower().replace('\ufeff', '') for h in headers_raw]

    def col(name: str, parts: list, fallback: int) -> str:
        try:
            idx = headers.index(name)
            return parts[idx].strip() if idx < len(parts) else ""
        except ValueError:
            return parts[fallback].strip() if fallback < len(parts) else ""

    # Aggregate debits by account prefix
    totals: dict[str, float] = {}
    skipped = 0
    for raw in lines[1:]:
        if not raw.strip():
            continue
        parts = raw.split(sep)
        if len(parts) < 10:
            skipped += 1
            continue
        compte = col("comptenum", parts, 4)
        debit_str = col("debit", parts, 11).replace(",", ".").replace(" ", "").replace("\xa0", "")
        try:
            debit = float(debit_str) if debit_str else 0.0
        except ValueError:
            skipped += 1
            continue
        if debit <= 0:
            continue
        # Match to first applicable account rule (longest prefix wins)
        for prefix, *_ in sorted(_FEC_ACCOUNT_MAP, key=lambda x: -len(x[0])):
            if compte.startswith(prefix):
                totals[prefix] = totals.get(prefix, 0.0) + debit
                break

    lines_total = len(lines) - 1  # exclude header
    if not totals:
        return {
            "imported": 0, "dry_run": payload.dry_run, "year": payload.year,
            "lines_parsed": lines_total, "lines_matched": 0,
            "total_debit_eur": 0, "total_co2e_kg": 0,
            "skipped_lines": skipped,
            "message": "Aucune écriture comptable ESG détectée. Vérifiez le séparateur et les comptes 60x/61x/62x.",
            "preview": [],
        }

    # Build preview / entries
    preview = []
    for prefix, pillar, label, metric_key, ef_per_eur in _FEC_ACCOUNT_MAP:
        amount = totals.get(prefix, 0.0)
        if amount <= 0:
            continue
        co2e = round(amount * ef_per_eur, 4)
        preview.append({
            "metric_name": label,
            "category": metric_key,
            "pillar": pillar,
            "value_eur": round(amount, 2),
            "value_co2e_tonne": round(co2e / 1000, 4),
            "factor_kgco2e_per_eur": ef_per_eur,
        })

    total_eur = round(sum(r["value_eur"] for r in preview), 2)
    total_co2e_kg = round(sum(r["value_co2e_tonne"] * 1000 for r in preview), 2)
    # Reshape preview for frontend
    preview_out = [
        {
            "account": r["category"],
            "label": r["metric_name"],
            "debit_eur": r["value_eur"],
            "co2e_kg": round(r["value_co2e_tonne"] * 1000, 2),
            "category": r["pillar"],
        }
        for r in preview
    ]
    if payload.dry_run:
        return {
            "imported": 0, "dry_run": True, "year": payload.year,
            "lines_parsed": lines_total, "lines_matched": len(preview),
            "total_debit_eur": total_eur, "total_co2e_kg": total_co2e_kg,
            "skipped_lines": skipped, "preview": preview_out,
        }

    # Real import → DataEntry records (delete existing FEC entries for this year first)
    try:
        from sqlalchemy import delete, and_, extract
        await db.execute(
            delete(DataEntry).where(
                and_(
                    DataEntry.tenant_id == current_user.tenant_id,
                    DataEntry.collection_method == "fec_import",
                    extract("year", DataEntry.period_start) == payload.year,
                )
            )
        )

        inserted = 0
        period_start = date(payload.year, 1, 1)
        period_end   = date(payload.year, 12, 31)
        for row in preview:
            entry = DataEntry(
                id=uuid.uuid4(),
                tenant_id=current_user.tenant_id,
                pillar=row["pillar"],
                category=row["category"],
                metric_name=row["metric_name"],
                value_numeric=row["value_co2e_tonne"],
                unit="tCO2e",
                period_start=period_start,
                period_end=period_end,
                collection_method="fec_import",
                verification_status="pending",
                data_source="FEC Import",
                notes=f"Montant comptable : {row['value_eur']:,.0f} € · Facteur ADEME : {row['factor_kgco2e_per_eur']} kgCO2e/€",
            )
            db.add(entry)
            inserted += 1
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error("FEC import DB error: %s", e)
        raise HTTPException(status_code=500, detail=f"Erreur import base de données : {e}")

    # Update connector status in Redis
    r = _get_redis()
    if r:
        try:
            key = f"connectors:status:{current_user.tenant_id}"
            raw = r.get(key)
            overrides = json.loads(raw) if raw else {}
            for cid in ("sage", "cegid", "pennylane"):
                overrides[cid] = {"status": "connected",
                                  "lastSync": date.today().isoformat(),
                                  "records": inserted}
            r.setex(key, 86400 * 30, json.dumps(overrides))
        except Exception:
            pass

    return {
        "imported": inserted,
        "inserted": inserted,
        "dry_run": False,
        "year": payload.year,
        "lines_parsed": lines_total,
        "lines_matched": len(preview),
        "total_debit_eur": total_eur,
        "total_co2e_kg": total_co2e_kg,
        "skipped_lines": skipped,
        "message": f"{inserted} indicateurs Scope 3 importés depuis le FEC {payload.year}",
        "preview": preview_out,
    }
