"""
Connector Sync Service — cadre générique d'adaptateurs pour les connecteurs API du Hub.

Objectif (architecture "future-proof") :
  Permettre de brancher un VRAI connecteur (ex: Schneider, Enedis, BambooHR…) sur de
  vraies données plus tard SANS modifier l'API, le frontend, ni le moteur de scoring —
  il suffit d'écrire une fonction `fetch_xxx()` et de l'enregistrer dans `ADAPTERS`.

Composants :
  - Stockage des identifiants par tenant dans Redis (`connectors:creds:{tenant_id}`),
    sur le même modèle que les statuts (`connectors:status:{tenant_id}`).
  - `NormalizedDataPoint` : format pivot, indépendant du connecteur source.
  - `_write_data_points()` : écriture idempotente dans `data_entries`
    (delete-then-insert, comme l'import FEC), avec `collection_method=f"api_{connector_id}"`.
    Ces lignes sont ensuite lues automatiquement par `ESGScoringEngine`
    (`_collect_from_data_entries`) — AUCUNE modification du moteur de scoring requise.
  - `ADAPTERS` : registre {connector_id -> fetch()}. Un connecteur sans adaptateur reste
    "simulé" (statut `simulated`, comportement legacy, aucune écriture en base).
  - `sync_connector()` : point d'entrée unique appelé par l'API.
  - `fetch_climatiq()` : premier adaptateur réel — calcule les émissions Scope 2
    (tCO2e) à partir de la consommation d'énergie déjà saisie par le tenant, via
    l'API Climatiq (facteur réseau résiduel France).
"""
import json
import logging
import os
import re
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any, Awaitable, Callable, Dict, List, Optional
from uuid import UUID

import httpx
from sqlalchemy import and_, delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.data_entry import DataEntry

logger = logging.getLogger(__name__)


# ─── Redis helpers ──────────────────────────────────────────────────────────

def _get_redis():
    try:
        import redis as _redis
        redis_url = str(settings.REDIS_URL) if settings.REDIS_URL else "redis://redis:6379/0"
        return _redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=2)
    except Exception as e:
        logger.warning("ConnectorSync: Redis unavailable — %s", e)
        return None


def _creds_key(tenant_id: UUID) -> str:
    return f"connectors:creds:{tenant_id}"


def get_credentials(tenant_id: UUID, connector_id: str) -> Dict[str, str]:
    """Retourne les identifiants stockés par le tenant pour ce connecteur (ou {})."""
    r = _get_redis()
    if not r:
        return {}
    try:
        raw = r.get(_creds_key(tenant_id))
        all_creds: Dict[str, Dict[str, str]] = json.loads(raw) if raw else {}
        return all_creds.get(connector_id, {})
    except Exception as e:
        logger.warning("ConnectorSync: credential read error — %s", e)
        return {}


def set_credentials(tenant_id: UUID, connector_id: str, creds: Dict[str, str]) -> None:
    """Enregistre/écrase les identifiants du tenant pour ce connecteur."""
    r = _get_redis()
    if not r:
        raise RuntimeError("Service temporairement indisponible (Redis)")
    raw = r.get(_creds_key(tenant_id))
    all_creds: Dict[str, Dict[str, str]] = json.loads(raw) if raw else {}
    # On ne stocke que des valeurs non vides
    cleaned = {k: v for k, v in creds.items() if v}
    if cleaned:
        all_creds[connector_id] = cleaned
    else:
        all_creds.pop(connector_id, None)
    r.setex(_creds_key(tenant_id), 365 * 24 * 3600, json.dumps(all_creds))


def delete_credentials(tenant_id: UUID, connector_id: str) -> None:
    r = _get_redis()
    if not r:
        raise RuntimeError("Service temporairement indisponible (Redis)")
    raw = r.get(_creds_key(tenant_id))
    all_creds: Dict[str, Dict[str, str]] = json.loads(raw) if raw else {}
    if connector_id in all_creds:
        del all_creds[connector_id]
        r.setex(_creds_key(tenant_id), 365 * 24 * 3600, json.dumps(all_creds))


# ─── Clés API "plateforme" (fallback .env, partagées par défaut) ────────────

def _read_env_key(key: str) -> str:
    value = os.getenv(key, "")
    if value:
        return value
    for candidate in [Path("/app/.env"), Path(__file__).resolve().parents[3] / ".env"]:
        if candidate.exists():
            for line in candidate.read_text().splitlines():
                m = re.match(rf"^{re.escape(key)}\s*=\s*(.+)$", line.strip())
                if m:
                    return m.group(1).strip().strip('"').strip("'")
    return ""


_PLATFORM_ENV_KEYS = {
    "climatiq": "CLIMATIQ_API_KEY",
    "carbon-interface": "CARBON_INTERFACE_API_KEY",
}


def platform_key(connector_id: str) -> str:
    """Clé API fournie par la plateforme (compte ESGFlow) pour ce connecteur, si dispo."""
    env_key = _PLATFORM_ENV_KEYS.get(connector_id)
    if not env_key:
        return ""
    return _read_env_key(env_key)


def has_platform_key(connector_id: str) -> bool:
    return bool(platform_key(connector_id))


# ─── Format pivot ────────────────────────────────────────────────────────────

@dataclass
class NormalizedDataPoint:
    """Point de donnée ESG normalisé, indépendant du connecteur source."""
    pillar: str               # environmental | social | governance
    category: str
    metric_name: str          # doit idéalement correspondre à _METRIC_NAME_TO_CODE
    value_numeric: float
    unit: str
    period_start: date
    period_end: date
    notes: Optional[str] = None


@dataclass
class SyncResult:
    status: str               # ok | simulated | not_configured | no_data | error
    connector_id: str
    records_written: int = 0
    message: str = ""
    last_sync: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)


# ─── Écriture idempotente dans data_entries ─────────────────────────────────

async def _write_data_points(
    db: AsyncSession,
    tenant_id: UUID,
    connector_id: str,
    points: List[NormalizedDataPoint],
) -> int:
    """
    Écrit les points normalisés dans `data_entries` de façon idempotente :
    on supprime d'abord les entrées précédemment écrites par CE connecteur
    pour ce tenant (collection_method=f"api_{connector_id}"), puis on
    réinsère les nouvelles valeurs. Mêmes pattern que l'import FEC.

    Ces lignes sont lues sans filtre de source par
    `ESGScoringEngine._collect_from_data_entries` — elles alimentent donc
    automatiquement le score ESG global, dès l'écriture.
    """
    if not points:
        return 0

    collection_method = f"api_{connector_id}"

    await db.execute(
        delete(DataEntry).where(
            and_(
                DataEntry.tenant_id == tenant_id,
                DataEntry.collection_method == collection_method,
            )
        )
    )

    inserted = 0
    for p in points:
        entry = DataEntry(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            organization_id=None,
            pillar=p.pillar,
            category=p.category,
            metric_name=p.metric_name,
            value_numeric=p.value_numeric,
            unit=p.unit,
            period_start=p.period_start,
            period_end=p.period_end,
            collection_method=collection_method,
            verification_status="pending",
            data_source=f"API {connector_id}",
            notes=p.notes,
        )
        db.add(entry)
        inserted += 1

    await db.commit()
    return inserted


# ─── Adaptateurs ──────────────────────────────────────────────────────────────
# Chaque adaptateur reçoit (db, tenant_id, credentials) et renvoie une liste de
# NormalizedDataPoint. Aucune autre partie du code n'a besoin d'être modifiée
# pour en ajouter un nouveau : il suffit de l'enregistrer dans ADAPTERS.

# Noms de métriques "consommation d'énergie" reconnus dans data_entries
# (saisie manuelle, modèles sectoriels, imports CSV…). On reste tolérant sur
# le libellé exact car il varie selon la source.
_ENERGY_METRIC_HINTS = ["nergie", "lectricit", "electric", "energy"]
_ENERGY_UNITS = {"kwh": 1.0, "mwh": 1_000.0, "gwh": 1_000_000.0, "wh": 0.001}


async def _find_latest_energy_entry(db: AsyncSession, tenant_id: UUID) -> Optional[DataEntry]:
    """
    Cherche la dernière donnée de consommation d'énergie/électricité du tenant
    (en kWh/MWh/GWh/Wh). Le filtre sur l'unité est essentiel : des libellés
    contenant "Électricité" existent aussi côté émissions (ex: "Émissions GES
    scope 2 — Électricité", unité tCO2e) — ce ne sont PAS des consommations
    d'énergie et ne doivent pas être envoyées à Climatiq comme telles.
    """
    from sqlalchemy import func

    conditions = [c.ilike(f"%{h}%") for h in _ENERGY_METRIC_HINTS for c in (DataEntry.metric_name, DataEntry.category)]
    query = (
        select(DataEntry)
        .where(
            and_(
                DataEntry.tenant_id == tenant_id,
                DataEntry.value_numeric.isnot(None),
                or_(*conditions),
                func.lower(DataEntry.unit).in_(list(_ENERGY_UNITS.keys())),
            )
        )
        .order_by(DataEntry.period_end.desc())
        .limit(1)
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def fetch_climatiq(
    db: AsyncSession,
    tenant_id: UUID,
    credentials: Dict[str, str],
) -> List[NormalizedDataPoint]:
    """
    Adaptateur réel Climatiq : calcule les émissions Scope 2 (tCO2e) à partir de
    la consommation d'énergie/électricité déjà renseignée par le tenant
    (saisie manuelle, import HR/CSV, modèle sectoriel…), via le facteur réseau
    résiduel France de Climatiq.
    """
    api_key = credentials.get("api_key", "")
    if not api_key:
        raise RuntimeError("Clé API Climatiq manquante")

    energy_entry = await _find_latest_energy_entry(db, tenant_id)
    if not energy_entry:
        return []

    unit = (energy_entry.unit or "kwh").strip().lower()
    factor_to_kwh = _ENERGY_UNITS.get(unit, 1.0)
    energy_kwh = float(energy_entry.value_numeric) * factor_to_kwh

    payload = {
        "emission_factor": {
            "activity_id": "electricity-supply_grid-source_residual_mix",
            "region": "FR",
            "data_version": "^0",
        },
        "parameters": {"energy": energy_kwh, "energy_unit": "kWh"},
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            "https://api.climatiq.io/data/v1/estimate",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

    if resp.status_code != 200:
        raise RuntimeError(f"Climatiq HTTP {resp.status_code}: {resp.text[:200]}")

    data = resp.json()
    co2e_kg = float(data.get("co2e", 0))
    co2e_t = round(co2e_kg / 1000.0, 4)
    ef = data.get("emission_factor", {})

    return [
        NormalizedDataPoint(
            pillar="environmental",
            category="scope2_emissions",
            # Nom volontairement identique à _METRIC_NAME_TO_CODE['Émissions Scope 2 (tCO2e)'] = 'ENV-002'
            metric_name="Émissions Scope 2 (tCO2e)",
            value_numeric=co2e_t,
            unit="tCO2e",
            period_start=energy_entry.period_start,
            period_end=energy_entry.period_end,
            notes=(
                f"Calculé via Climatiq API (data/v1, data_version ^0) à partir de "
                f"{energy_entry.value_numeric:g} {energy_entry.unit or ''} "
                f"« {energy_entry.metric_name} » — facteur réseau résiduel France "
                f"(source: {ef.get('source', '?')}, année {ef.get('year', '?')})."
            ),
        )
    ]


ADAPTERS: Dict[str, Callable[[AsyncSession, UUID, Dict[str, str]], Awaitable[List[NormalizedDataPoint]]]] = {
    "climatiq": fetch_climatiq,
}


# ─── Dispatcher ──────────────────────────────────────────────────────────────

async def sync_connector(
    db: AsyncSession,
    tenant_id: UUID,
    connector_id: str,
) -> SyncResult:
    """
    Point d'entrée unique pour synchroniser un connecteur.

    - Pas d'adaptateur enregistré → résultat "simulated" (comportement legacy,
      aucune écriture en base) — c'est le cas par défaut tant qu'aucune
      intégration réelle n'a été développée pour ce connecteur.
    - Adaptateur enregistré mais aucune clé API (ni tenant, ni plateforme) →
      "not_configured".
    - Sinon : exécute l'adaptateur, normalise les données et les écrit dans
      `data_entries` (idempotent). Ces données alimentent immédiatement le
      moteur de scoring ESG, sans aucune autre modification de code.
    """
    now = datetime.utcnow().strftime("%d/%m/%Y %H:%M")

    adapter = ADAPTERS.get(connector_id)
    if adapter is None:
        return SyncResult(
            status="simulated",
            connector_id=connector_id,
            records_written=0,
            message=(
                f"Synchronisation simulée pour « {connector_id} » — l'adaptateur réel "
                f"n'est pas encore disponible (en attente des identifiants API de l'entreprise)."
            ),
            last_sync=now,
        )

    creds = get_credentials(tenant_id, connector_id)
    api_key = creds.get("api_key") or platform_key(connector_id)
    if not api_key:
        return SyncResult(
            status="not_configured",
            connector_id=connector_id,
            records_written=0,
            message=(
                f"Aucune clé API configurée pour « {connector_id} ». "
                f"Renseignez-la dans l'onglet Configuration pour activer la synchronisation réelle."
            ),
            last_sync=None,
        )

    try:
        points = await adapter(db, tenant_id, {**creds, "api_key": api_key})
    except Exception as e:
        logger.error("ConnectorSync[%s] adapter error: %s", connector_id, e)
        return SyncResult(
            status="error",
            connector_id=connector_id,
            records_written=0,
            message=f"Erreur lors de la synchronisation : {e}",
            last_sync=now,
        )

    if not points:
        return SyncResult(
            status="no_data",
            connector_id=connector_id,
            records_written=0,
            message=(
                "Connexion réussie, mais aucune donnée source exploitable n'a été trouvée "
                "pour le moment (aucune consommation d'énergie renseignée)."
            ),
            last_sync=now,
        )

    inserted = await _write_data_points(db, tenant_id, connector_id, points)

    return SyncResult(
        status="ok",
        connector_id=connector_id,
        records_written=inserted,
        message=(
            f"{inserted} indicateur(s) synchronisé(s) depuis « {connector_id} » "
            f"et injecté(s) dans le calcul du score ESG."
        ),
        last_sync=now,
        details={"metrics": [p.metric_name for p in points]},
    )
