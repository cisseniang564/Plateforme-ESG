"""
LCA Calculation Engine.

Takes the per-stage inputs stored on an ``LCAProduct`` and aggregates them
into total cradle-to-grave kgCO₂eq per functional unit, plus per-stage
breakdown and per-item contributions.

Reference methodology
---------------------
- ISO 14040:2006 / 14044:2006 — Life Cycle Assessment principles
- GHG Protocol Product Standard (2011)
- EU PEF Method (2018) — for category-specific PEFCR rules
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, List, Optional

from app.data.lca_impact_factors import (
    all_factors, get_factor, CATEGORY_LABELS_FR, CATEGORIES,
)


@dataclass
class StageItem:
    factor_code: str
    quantity: float
    unit: str
    kg_co2e: float
    factor_label_fr: str
    note: Optional[str] = None


@dataclass
class StageBreakdown:
    stage: str
    label_fr: str
    total_kg_co2e: float
    pct_of_total: float
    items: List[StageItem]


@dataclass
class LCAResult:
    total_kg_co2e: float           # per functional unit
    annual_kg_co2e: Optional[float] # × annual_volume if provided
    stages: List[StageBreakdown]
    largest_contributor: Optional[Dict]  # {stage, factor_code, kg_co2e, pct}
    computed_at: str
    methodology: str = "ISO 14040/14044 + ADEME Base Empreinte v23.0"


def compute(product) -> LCAResult:
    """
    Compute the LCA result for one ``LCAProduct``.

    ``product.stages`` is expected to be::
        {
          "raw_material":  [{factor_code, quantity, unit}, ...],
          "manufacturing": [...],
          ...
        }
    """
    stages_data: Dict = product.stages or {}
    breakdown: List[StageBreakdown] = []
    grand_total = 0.0
    all_items: List[Dict] = []  # for "largest contributor" lookup

    for stage_code in CATEGORIES:
        items_data = stages_data.get(stage_code) or []
        stage_total = 0.0
        items: List[StageItem] = []
        for raw in items_data:
            if not isinstance(raw, dict):
                continue
            factor_code = raw.get("factor_code")
            try:
                qty = float(raw.get("quantity") or 0.0)
            except (TypeError, ValueError):
                qty = 0.0
            unit = raw.get("unit") or ""
            note = raw.get("note")

            factor = get_factor(factor_code) if factor_code else None
            if factor is None or qty == 0:
                # Still surface the row so the user sees a "missing factor" indicator
                items.append(StageItem(
                    factor_code=factor_code or "",
                    quantity=qty,
                    unit=unit,
                    kg_co2e=0.0,
                    factor_label_fr=raw.get("label_fr") or (factor_code or "?"),
                    note=note or ("Facteur d'émission introuvable" if not factor else None),
                ))
                continue

            kg = qty * factor.kg_co2e_per_unit
            stage_total += kg
            item = StageItem(
                factor_code=factor.code,
                quantity=qty,
                unit=factor.unit,
                kg_co2e=round(kg, 3),
                factor_label_fr=factor.label_fr,
                note=note,
            )
            items.append(item)
            all_items.append({
                "stage":      stage_code,
                "factor_code": factor.code,
                "factor_label_fr": factor.label_fr,
                "kg_co2e": kg,
            })

        if not items and stage_code not in stages_data:
            # Stage not configured at all — skip it from the breakdown
            continue

        breakdown.append(StageBreakdown(
            stage=stage_code,
            label_fr=CATEGORY_LABELS_FR.get(stage_code, stage_code),
            total_kg_co2e=round(stage_total, 3),
            pct_of_total=0.0,  # filled after grand_total known
            items=items,
        ))
        grand_total += stage_total

    # Fill percentages
    for b in breakdown:
        b.pct_of_total = round(100 * b.total_kg_co2e / grand_total, 1) if grand_total > 0 else 0.0

    # Largest contributor
    largest: Optional[Dict] = None
    if all_items:
        item = max(all_items, key=lambda x: x["kg_co2e"])
        largest = {
            "stage":            item["stage"],
            "stage_label_fr":   CATEGORY_LABELS_FR.get(item["stage"], item["stage"]),
            "factor_code":      item["factor_code"],
            "factor_label_fr":  item["factor_label_fr"],
            "kg_co2e":          round(item["kg_co2e"], 3),
            "pct":              round(100 * item["kg_co2e"] / grand_total, 1) if grand_total > 0 else 0.0,
        }

    annual = None
    if product.annual_volume:
        annual = grand_total * float(product.annual_volume)

    return LCAResult(
        total_kg_co2e=round(grand_total, 3),
        annual_kg_co2e=round(annual, 3) if annual is not None else None,
        stages=breakdown,
        largest_contributor=largest,
        computed_at=datetime.utcnow().isoformat() + "Z",
    )


def result_to_dict(r: LCAResult) -> dict:
    return {
        "total_kg_co2e":     r.total_kg_co2e,
        "annual_kg_co2e":    r.annual_kg_co2e,
        "stages":            [
            {
                "stage":         s.stage,
                "label_fr":      s.label_fr,
                "total_kg_co2e": s.total_kg_co2e,
                "pct_of_total":  s.pct_of_total,
                "items":         [asdict(i) for i in s.items],
            } for s in r.stages
        ],
        "largest_contributor": r.largest_contributor,
        "computed_at":         r.computed_at,
        "methodology":         r.methodology,
    }


def list_impact_factors_payload() -> dict:
    """Return all impact factors grouped by category — used by the UI selector."""
    grouped: Dict[str, List[dict]] = {c: [] for c in CATEGORIES}
    for f in all_factors():
        grouped[f.category].append(f.to_dict())
    return {
        "categories": [
            {"code": c, "label_fr": CATEGORY_LABELS_FR.get(c, c), "factors": grouped[c]}
            for c in CATEGORIES
        ],
        "source": "ADEME Base Empreinte v23.0 (2024)",
    }
