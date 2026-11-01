"""
Qonto connector — syncs bank transactions via Qonto API v2
and maps spending categories to ESG Scope 3 emissions categories.

POST /api/v1/connectors/qonto/sync
  body: { login: str, secret_key: str, year: int }
  returns: { synced: int, total_spend: float, year: int }
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

QONTO_API_URL = "https://thirdparty.qonto.com/v2/transactions"

# Scope 3 category mapping — same logic as Pennylane but for transaction labels
SCOPE3_RULES: List[tuple] = [
    (
        ["voyage", "transport", "deplacement", "train", "avion", "taxi", "uber", "lyft", "sncf", "ratp"],
        "scope3_cat6_travel",
        "Scope 3 Cat. 6 — Déplacements professionnels",
        "environmental",
        "SCOPE3_CAT6",
    ),
    (
        ["cloud", "saas", "logiciel", "software", "informatique", "aws", "azure", "gcp", "github", "ovh"],
        "scope3_cat1_it",
        "Scope 3 Cat. 1 — Achats IT / Cloud",
        "environmental",
        "SCOPE3_CAT1",
    ),
    (
        ["bureau", "fourniture", "papeterie", "mobilier", "consommable", "amazon"],
        "scope3_cat1_office",
        "Scope 3 Cat. 1 — Fournitures de bureau",
        "environmental",
        "SCOPE3_CAT1",
    ),
    (
        ["energie", "electricite", "gaz", "fuel", "chauffage", "edf", "engie", "enedis", "total"],
        "scope3_cat3_energy",
        "Scope 3 Cat. 3 — Énergie et combustibles",
        "environmental",
        "SCOPE3_CAT3",
    ),
    (
        ["restaurant", "repas", "traiteur", "cantine", "dejeuner", "diner"],
        "scope3_cat6_meals",
        "Scope 3 Cat. 6 — Repas professionnels",
        "environmental",
        "SCOPE3_CAT6",
    ),
]

def _classify_transaction(label: str, amount: float) -> Optional[tuple]:
    """Return the first matching Scope 3 rule for a transaction label."""
    label_lower = label.lower()
    for keywords, metric_name, category_label, pillar, category_code in SCOPE3_RULES:
        if any(kw in label_lower for kw in keywords):
            return metric_name, category_label, pillar, category_code, abs(amount)
    return None


async def _fetch_qonto_transactions(login: str, secret_key: str, year: int) -> List[Dict]:
    """
    Récupère les transactions depuis l'API Qonto. Ne renvoie JAMAIS de donnée inventée :
    en cas de refus d'identifiants ou d'indisponibilité, lève ConnectorFetchError.
    """
    params = {
        "filters[settled_at_from]": f"{year}-01-01T00:00:00.000Z",
        "filters[settled_at_to]": f"{year}-12-31T23:59:59.999Z",
        "filters[side]": "debit",
        "per_page": 200,
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(QONTO_API_URL, headers={"Authorization": f"{login}:{secret_key}"}, params=params)
    except httpx.HTTPError as exc:
        logger.warning("Qonto API unreachable: %s", exc)
        raise ConnectorFetchError("unavailable", "Qonto est injoignable pour le moment. Réessayez dans quelques minutes.")
    if resp.status_code in (401, 403):
        raise ConnectorFetchError("auth", "Qonto a refusé les identifiants. Vérifiez le login et la clé secrète.")
    if resp.status_code >= 400:
        logger.warning("Qonto API error: status %d", resp.status_code)
        raise ConnectorFetchError("unavailable", f"Qonto a répondu une erreur ({resp.status_code}).")
    try:
        data = resp.json()
    except ValueError:
        raise ConnectorFetchError("unavailable", "Réponse illisible de Qonto.")
    return data.get("transactions", data.get("data", [])) if isinstance(data, dict) else []


class QontoSyncRequest(BaseModel):
    login: str
    secret_key: str
    year: int


@router.post("/sync")
async def qonto_sync(
    body: QontoSyncRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Récupère les transactions Qonto et les range dans les catégories Scope 3.
    N'écrit que des données réellement reçues ; ne remplace jamais une saisie du client.
    """
    if body.year < 2000 or body.year > 2100:
        raise HTTPException(status_code=400, detail="Année invalide")

    started = time.monotonic()
    try:
        transactions = await _fetch_qonto_transactions(body.login, body.secret_key, body.year)
    except ConnectorFetchError as exc:
        await connector_log.log_sync(db, current_user.tenant_id, "qonto", "error", 0, exc.message, int((time.monotonic() - started) * 1000))
        await db.commit()
        raise HTTPException(status_code=400 if exc.kind == "auth" else 502, detail=exc.message)

    # Les débits Qonto sont négatifs : on additionne les montants absolus
    aggregated = accounting_sync.aggregate(
        transactions, SCOPE3_RULES,
        label_of=lambda t: t.get("label") or t.get("reference") or t.get("description") or "",
        amount_of=lambda t: abs(float(t.get("local_amount") or t.get("amount") or 0.0)),
    )
    report = await accounting_sync.write_entries(db, current_user.tenant_id, current_user.id, aggregated, body.year, "api_qonto")
    msg = None if aggregated else "Aucune ligne rattachable à une catégorie Scope 3."
    if report.conflicts:
        msg = f"{len(report.conflicts)} catégorie(s) ignorée(s) : une saisie existe déjà."
    await connector_log.log_sync(db, current_user.tenant_id, "qonto", "ok" if report.written else "no_data", report.written, msg, int((time.monotonic() - started) * 1000))
    await db.commit()

    return {
        "synced": report.written,
        "total_spend": round(sum(i["amount"] for m, i in aggregated.items() if m not in report.conflicts), 2),
        "categories": {m: round(i["amount"], 2) for m, i in aggregated.items() if m not in report.conflicts},
        "conflicts": report.conflicts,
        "transactions_read": len(transactions),
        "year": body.year,
        "source": "api",
        "message": None if aggregated else "Aucune transaction n'a pu être rattachée à une catégorie Scope 3 : rien n'a été enregistré.",
    }
