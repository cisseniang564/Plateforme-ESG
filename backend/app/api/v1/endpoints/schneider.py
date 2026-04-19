"""
Schneider Electric → Climatiq integration.

Reads energy consumption from Schneider EcoStruxure (mock data in dev) and
converts each site's kWh to CO₂e via Climatiq's emission-factor API.

Production endpoint:
  GET https://api.exchange.se.com/ecostruxure/v3/sites/{siteId}/consumption
"""
import asyncio
import os
import re
from pathlib import Path
from typing import Optional

import httpx
from fastapi import APIRouter, Query

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _climatiq_key() -> str:
    """Read CLIMATIQ_API_KEY from env, then fall back to .env file."""
    key = os.getenv("CLIMATIQ_API_KEY", "")
    if key:
        return key
    for candidate in [
        Path(__file__).parents[5] / ".env",
        Path(__file__).parents[5] / "backend" / ".env",
        Path("/app/.env"),
    ]:
        if candidate.exists():
            for line in candidate.read_text().splitlines():
                m = re.match(r"^CLIMATIQ_API_KEY\s*=\s*(.+)$", line.strip())
                if m:
                    return m.group(1).strip().strip('"').strip("'")
    return ""


# ── Mock EcoStruxure sites ────────────────────────────────────────────────────
# Each entry mirrors what Schneider's API returns for a meter reading.

_MOCK_SITES = [
    {"site_id": "FR-001", "name": "Paris La Défense",    "country": "FR", "type": "Bureau",      "kwh": 45_230.0},
    {"site_id": "FR-002", "name": "Usine Lyon Sud",       "country": "FR", "type": "Industrie",   "kwh": 128_400.0},
    {"site_id": "FR-003", "name": "Data Center Bordeaux", "country": "FR", "type": "Data Center", "kwh": 87_100.0},
    {"site_id": "FR-004", "name": "Entrepôt Marseille",   "country": "FR", "type": "Entrepôt",    "kwh": 23_600.0},
    {"site_id": "DE-001", "name": "Berlin Büro",           "country": "DE", "type": "Bureau",      "kwh": 19_800.0},
    {"site_id": "ES-001", "name": "Barcelona Oficina",    "country": "ES", "type": "Bureau",      "kwh": 14_500.0},
]

# Climatiq region codes (ISO-2 → Climatiq region string)
_REGION = {"FR": "FR", "DE": "DE", "ES": "ES", "GB": "GB", "IT": "IT", "NL": "NL"}

# IEA 2023 grid averages — used as fallback when Climatiq is unavailable
_FALLBACK_EF: dict[str, float] = {
    "FR": 0.0234,   # Nuclear-heavy grid
    "DE": 0.3800,   # Coal/gas mix
    "ES": 0.1930,   # Renewables + gas
    "GB": 0.2330,   # Gas + wind
    "DEFAULT": 0.2330,
}


def _apply_fallback(site: dict) -> dict:
    factor = _FALLBACK_EF.get(site["country"], _FALLBACK_EF["DEFAULT"])
    return {
        **site,
        "co2e_kg":      round(site["kwh"] * factor, 2),
        "co2e_unit":    "kg",
        "ef_value":     factor,
        "ef_source":    "IEA 2023 (fallback)",
        "ef_year":      2023,
        "via_climatiq": False,
    }


async def _enrich_site(client: httpx.AsyncClient, api_key: str, site: dict) -> dict:
    """Call Climatiq /data/v1/estimate for a single site."""
    region = _REGION.get(site["country"], "FR")
    try:
        resp = await client.post(
            "https://api.climatiq.io/data/v1/estimate",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "emission_factor": {
                    "activity_id": "electricity-supply_grid-source_residual_mix",
                    "region": region,
                    "data_version": "^0",
                },
                "parameters": {"energy": site["kwh"], "energy_unit": "kWh"},
            },
            timeout=10.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            ef = data.get("emission_factor", {})
            co2e = data.get("co2e", 0.0)
            return {
                **site,
                "co2e_kg":      round(co2e, 2),
                "co2e_unit":    data.get("co2e_unit", "kg"),
                "ef_value":     round(co2e / site["kwh"], 6) if site["kwh"] else 0,
                "ef_source":    ef.get("source", "Climatiq"),
                "ef_year":      ef.get("year"),
                "via_climatiq": True,
            }
    except Exception:
        pass
    return _apply_fallback(site)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/emissions")
async def get_schneider_emissions(
    period: Optional[str] = Query(default="2026-02", description="YYYY-MM period"),
):
    """
    Schneider EcoStruxure energy data enriched with Climatiq CO₂e calculations.

    For each site:
      kWh (EcoStruxure)  →  Climatiq /estimate  →  CO₂e (kg / t)
    """
    api_key = _climatiq_key()
    sites = [{**s, "period": period} for s in _MOCK_SITES]

    if not api_key:
        results = [_apply_fallback(s) for s in sites]
    else:
        async with httpx.AsyncClient() as client:
            results = list(await asyncio.gather(*[_enrich_site(client, api_key, s) for s in sites]))

    total_kwh  = sum(s["kwh"]     for s in results)
    total_co2e = sum(s["co2e_kg"] for s in results)

    return {
        "period": period,
        "sites":  results,
        "is_demo": True,
        "summary": {
            "total_kwh":     round(total_kwh, 0),
            "total_co2e_kg": round(total_co2e, 1),
            "total_co2e_t":  round(total_co2e / 1000, 2),
            "n_sites":       len(results),
            "source":        "Schneider Electric EcoStruxure (demo — connect your EcoStruxure account to use real data)",
            "climatiq_used": any(s.get("via_climatiq") for s in results),
        },
    }


@router.post("/sync")
async def sync_schneider(
    period: Optional[str] = Query(default="2026-02"),
):
    """Trigger a manual re-sync of Schneider → Climatiq data."""
    return await get_schneider_emissions(period=period)
