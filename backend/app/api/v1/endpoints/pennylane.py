"""
Pennylane connector — syncs customer invoices via Pennylane external API
and maps expense categories to ESG Scope 3 emissions categories.

POST /api/v1/connectors/pennylane/sync
  body: { api_key: str, year: int }
  returns: { synced: int, categories: dict, year: int }
"""
import logging
import time
from typing import Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.services import accounting_sync
from app.services.accounting_sync import ConnectorFetchError
from app.services import connector_log
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

PENNYLANE_API_URL = "https://app.pennylane.com/api/external/v1/customer_invoices"

# Scope 3 category mapping
# (keyword_fragments_in_label, metric_name, category_label, pillar, category_code)
SCOPE3_RULES: List[tuple] = [
    (
        ["voyage", "transport", "deplacement", "train", "avion", "taxi", "uber", "billet"],
        "scope3_cat6_travel",
        "Scope 3 Cat. 6 — Déplacements professionnels",
        "environmental",
        "SCOPE3_CAT6",
    ),
    (
        ["cloud", "saas", "logiciel", "software", "informatique", "it ", "serveur", "hebergement"],
        "scope3_cat1_it",
        "Scope 3 Cat. 1 — Achats IT / Cloud",
        "environmental",
        "SCOPE3_CAT1",
    ),
    (
        ["bureau", "fourniture", "papeterie", "mobilier", "consommable"],
        "scope3_cat1_office",
        "Scope 3 Cat. 1 — Fournitures de bureau",
        "environmental",
        "SCOPE3_CAT1",
    ),
    (
        ["energie", "electricite", "gaz", "fuel", "chauffage", "fioul"],
        "scope3_cat3_energy",
        "Scope 3 Cat. 3 — Énergie et combustibles",
        "environmental",
        "SCOPE3_CAT3",
    ),
]

def _classify_invoice(label: str, amount: float) -> Optional[tuple]:
    """Return the first matching Scope 3 rule for a given invoice label."""
    label_lower = label.lower()
    for keywords, metric_name, category_label, pillar, category_code in SCOPE3_RULES:
        if any(kw in label_lower for kw in keywords):
            return metric_name, category_label, pillar, category_code, amount
    return None


async def _fetch_pennylane_invoices(api_key: str, year: int) -> List[Dict]:
    """
    Récupère les factures depuis l'API Pennylane. Ne renvoie JAMAIS de donnée inventée :
    en cas de refus d'identifiants ou d'indisponibilité, lève ConnectorFetchError.
    """
    params = {
        "filter[date][gte]": f"{year}-01-01",
        "filter[date][lte]": f"{year}-12-31",
        "limit": 500,
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(PENNYLANE_API_URL, headers={"Authorization": f"Bearer {api_key}"}, params=params)
    except httpx.HTTPError as exc:
        logger.warning("Pennylane API unreachable: %s", exc)
        raise ConnectorFetchError("unavailable", "Pennylane est injoignable pour le moment. Réessayez dans quelques minutes.")
    if resp.status_code in (401, 403):
        raise ConnectorFetchError("auth", "Pennylane a refusé la clé API. Vérifiez la clé et ses autorisations.")
    if resp.status_code >= 400:
        logger.warning("Pennylane API error: status %d", resp.status_code)
        raise ConnectorFetchError("unavailable", f"Pennylane a répondu une erreur ({resp.status_code}).")
    try:
        data = resp.json()
    except ValueError:
        raise ConnectorFetchError("unavailable", "Réponse illisible de Pennylane.")
    return data.get("invoices", data.get("data", [])) if isinstance(data, dict) else []


class PennylaneSyncRequest(BaseModel):
    api_key: str
    year: int


@router.post("/sync")
async def pennylane_sync(
    body: PennylaneSyncRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Récupère les factures Pennylane et les range dans les catégories Scope 3.
    N'écrit que des données réellement reçues ; ne remplace jamais une saisie du client.
    """
    if body.year < 2000 or body.year > 2100:
        raise HTTPException(status_code=400, detail="Année invalide")

    started = time.monotonic()
    try:
        invoices = await _fetch_pennylane_invoices(body.api_key, body.year)
    except ConnectorFetchError as exc:
        await connector_log.log_sync(db, current_user.tenant_id, "pennylane", "error", 0, exc.message, int((time.monotonic() - started) * 1000))
        await db.commit()
        raise HTTPException(status_code=400 if exc.kind == "auth" else 502, detail=exc.message)

    aggregated = accounting_sync.aggregate(
        invoices, SCOPE3_RULES,
        label_of=lambda i: i.get("label") or i.get("description") or i.get("subject") or "",
        amount_of=lambda i: float(i.get("amount") or i.get("total_amount") or 0.0),
    )
    report = await accounting_sync.write_entries(db, current_user.tenant_id, current_user.id, aggregated, body.year, "api_pennylane")
    msg = None if aggregated else "Aucune ligne rattachable à une catégorie Scope 3."
    if report.conflicts:
        msg = f"{len(report.conflicts)} catégorie(s) ignorée(s) : une saisie existe déjà."
    await connector_log.log_sync(db, current_user.tenant_id, "pennylane", "ok" if report.written else "no_data", report.written, msg, int((time.monotonic() - started) * 1000))
    await db.commit()

    return {
        "synced": report.written,
        "categories": {m: round(i["amount"], 2) for m, i in aggregated.items() if m not in report.conflicts},
        "conflicts": report.conflicts,
        "invoices_read": len(invoices),
        "year": body.year,
        "source": "api",
        "message": None if aggregated else "Aucune facture n'a pu être rattachée à une catégorie Scope 3 : rien n'a été enregistré.",
    }
