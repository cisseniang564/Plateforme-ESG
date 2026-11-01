"""
Socle commun des connecteurs comptables et bancaires (Pennylane, Qonto) : agrégation par catégorie
Scope 3 et écriture dans `data_entries`.

Règles d'intégrité (elles protègent le score et les rapports du client) :
  1. On n'invente JAMAIS de donnée : si l'API refuse les identifiants, est injoignable ou ne renvoie
     rien d'exploitable, rien n'est écrit et l'erreur est explicite.
  2. Une saisie faite par le client (manuelle, import FEC…) n'est jamais écrasée par un connecteur :
     elle est signalée comme « conflit » et laissée telle quelle.
  3. Seules les lignes que ce connecteur a lui-même écrites sont mises à jour (ou, par nettoyage,
     les anciennes lignes de démonstration « mock_… »).
"""
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.data_entry import DataEntry


class ConnectorFetchError(Exception):
    """Échec d'appel à l'API d'un tiers. `kind` : « auth » (identifiants refusés) ou « unavailable »."""

    def __init__(self, kind: str, message: str):
        super().__init__(message)
        self.kind = kind
        self.message = message


@dataclass
class WriteReport:
    written: int = 0
    conflicts: List[str] = field(default_factory=list)      # métriques où une saisie du client existe déjà


Rule = Tuple[List[str], str, str, str, str]   # (mots-clés, métrique, libellé, pilier, code catégorie)


def aggregate(items: Iterable[Dict[str, Any]], rules: List[Rule],
              label_of: Callable[[Dict[str, Any]], str],
              amount_of: Callable[[Dict[str, Any]], float]) -> Dict[str, Dict[str, Any]]:
    """Additionne les montants par métrique Scope 3 d'après le libellé. Les lignes non reconnues sont ignorées."""
    out: Dict[str, Dict[str, Any]] = {}
    for item in items:
        label = (label_of(item) or "").lower()
        amount = amount_of(item)
        if amount <= 0:
            continue
        for keywords, metric, category_label, pillar, code in rules:
            if any(k in label for k in keywords):
                slot = out.setdefault(metric, {"amount": 0.0, "label": category_label, "pillar": pillar, "category_code": code, "count": 0})
                slot["amount"] += amount
                slot["count"] += 1
                break
    return out


def classify_existing(existing_source: Optional[str], connector_source: str) -> str:
    """Que faire d'une ligne déjà présente : « update » (la nôtre ou ancienne démo) ou « conflict » (saisie du client)."""
    if existing_source == connector_source or (existing_source or "").startswith("mock_"):
        return "update"
    return "conflict"


async def write_entries(db: AsyncSession, tenant_id: UUID, user_id: Optional[UUID], aggregated: Dict[str, Dict[str, Any]],
                        year: int, data_source: str) -> WriteReport:
    """Écrit les agrégats dans `data_entries` en respectant les règles d'intégrité ci-dessus."""
    report = WriteReport()
    period_start, period_end = date(year, 1, 1), date(year, 12, 31)
    for metric, info in aggregated.items():
        amount = round(info["amount"], 2)
        existing = (await db.execute(
            select(DataEntry).where(and_(
                DataEntry.tenant_id == tenant_id, DataEntry.metric_name == metric, DataEntry.period_start == period_start,
            ))
        )).scalars().first()
        if existing is not None:
            if classify_existing(existing.data_source, data_source) == "conflict":
                report.conflicts.append(metric)
                continue
            existing.value_numeric = amount
            existing.unit = "EUR"
            existing.data_source = data_source
            existing.notes = info["label"]
        else:
            db.add(DataEntry(
                tenant_id=tenant_id, pillar=info["pillar"], category=info["category_code"], metric_name=metric,
                value_numeric=amount, unit="EUR", period_start=period_start, period_end=period_end,
                data_source=data_source, notes=info["label"], created_by=user_id,
            ))
        report.written += 1
    return report
