"""
Auto-compute GHG Protocol Scope 3 Category 7 (Employee Commuting) from HR data.

This is the *activity-based* approach (GHG Protocol Corporate Value Chain
Standard § 5.4) — more accurate than spend-based estimation when the company
knows its headcount and rough location distribution.

Methodology
-----------
Per employee, annual commute emissions =
    distance_per_trip × 2 (round-trip) × working_days
  × Σ (modal_share × emission_factor_per_pkm)
  × (1 − teleworking_share)

Defaults sourced from:
  - INSEE 2022 — Mobilité quotidienne des actifs (avg one-way distance,
    modal split per geographic zone)
  - ADEME Base Empreinte v23.0 — emission factors per passenger.km
  - DARES 2023 — average working days per year (~215 after PTO/holidays)

These are *defaults*; clients can override via the API for higher accuracy
(e.g., based on a HR survey of employee commute patterns).
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict, List, Optional


# ────────────────────────────────────────────────────────────────────────────
# Defaults
# ────────────────────────────────────────────────────────────────────────────

# Average one-way commute distance (km), source INSEE 2022
DEFAULT_DISTANCE_KM_ONE_WAY = 14.0

# Working days per year (after PTO, sick leave, public holidays) — DARES 2023
DEFAULT_WORKING_DAYS = 215

# ADEME Base Empreinte v23.0 — kgCO2eq per passenger.km
EMISSION_FACTORS_PKM = {
    "car_avg":           0.193,    # Voiture particulière (mix essence/diesel/hybride/EV moyen FR)
    "car_diesel":        0.218,
    "car_gasoline":      0.193,
    "car_hybrid":        0.111,
    "car_ev":            0.014,    # mix électrique français
    "motorbike":         0.158,
    "bus_urban":         0.106,
    "tram":              0.0035,
    "metro":             0.0035,
    "train_regional":    0.0098,   # TER/Transilien
    "bike":              0.0,
    "ebike":             0.011,    # incl. fabrication + électricité
    "walk":              0.0,
}

# Modal split defaults per geographic zone (INSEE 2022 — % of commuters)
MODAL_SPLITS: Dict[str, Dict[str, float]] = {
    # Dense urban (Paris, Lyon, Lille intra-muros…)
    "dense_urban": {
        "car_avg":     0.30,
        "bus_urban":   0.10,
        "metro":       0.35,
        "train_regional": 0.10,
        "bike":        0.07,
        "ebike":       0.03,
        "walk":        0.05,
    },
    # Suburban / mid-size cities
    "suburban": {
        "car_avg":     0.60,
        "bus_urban":   0.10,
        "train_regional": 0.15,
        "metro":       0.05,
        "bike":        0.05,
        "ebike":       0.03,
        "walk":        0.02,
    },
    # Rural / small towns (most of France geographically)
    "rural": {
        "car_avg":     0.85,
        "motorbike":   0.02,
        "bus_urban":   0.03,
        "train_regional": 0.04,
        "bike":        0.03,
        "walk":        0.03,
    },
    # National average — INSEE all-France
    "national_avg": {
        "car_avg":     0.74,
        "motorbike":   0.02,
        "bus_urban":   0.06,
        "metro":       0.05,
        "tram":        0.02,
        "train_regional": 0.05,
        "bike":        0.03,
        "ebike":       0.01,
        "walk":        0.02,
    },
}


# ────────────────────────────────────────────────────────────────────────────
# Result types
# ────────────────────────────────────────────────────────────────────────────

@dataclass
class ModeContribution:
    mode: str
    label_fr: str
    modal_share_pct: float
    emission_factor_kgco2e_per_pkm: float
    annual_pkm_per_employee: float
    annual_kgco2e_per_employee: float
    annual_kgco2e_total: float
    pct_of_total: float


@dataclass
class CommuteResult:
    inputs: Dict
    annual_pkm_per_employee: float
    annual_kgco2e_per_employee: float
    annual_kgco2e_total: float
    annual_tco2e_total: float
    by_mode: List[ModeContribution]
    methodology: str = "GHG Protocol Scope 3 Cat. 7 (activity-based) · INSEE 2022 · ADEME BE v23.0"

    def to_dict(self) -> dict:
        return {
            "inputs":                       self.inputs,
            "annual_pkm_per_employee":      round(self.annual_pkm_per_employee, 1),
            "annual_kgco2e_per_employee":   round(self.annual_kgco2e_per_employee, 1),
            "annual_kgco2e_total":          round(self.annual_kgco2e_total, 0),
            "annual_tco2e_total":           round(self.annual_tco2e_total, 2),
            "by_mode":                      [asdict(c) for c in self.by_mode],
            "methodology":                  self.methodology,
        }


MODE_LABELS_FR = {
    "car_avg":          "Voiture particulière (mix FR)",
    "car_diesel":       "Voiture diesel",
    "car_gasoline":     "Voiture essence",
    "car_hybrid":       "Voiture hybride",
    "car_ev":           "Voiture électrique",
    "motorbike":        "2-roues motorisé",
    "bus_urban":        "Bus / autocar",
    "tram":             "Tramway",
    "metro":            "Métro / RER",
    "train_regional":   "Train régional (TER/Transilien)",
    "bike":             "Vélo",
    "ebike":            "Vélo électrique",
    "walk":             "Marche à pied",
}


# ────────────────────────────────────────────────────────────────────────────
# Compute
# ────────────────────────────────────────────────────────────────────────────

def compute_commute_emissions(
    headcount: int,
    geographic_profile: str = "national_avg",
    distance_km_one_way: Optional[float] = None,
    working_days: Optional[int] = None,
    teleworking_days_per_week: float = 0.0,
    modal_split_override: Optional[Dict[str, float]] = None,
) -> CommuteResult:
    """
    Compute total annual commute emissions for an organization.

    Parameters
    ----------
    headcount
        Number of employees (FTE-equivalent ideally).
    geographic_profile
        "dense_urban" | "suburban" | "rural" | "national_avg" — selects the
        default modal split. Ignored if ``modal_split_override`` provided.
    distance_km_one_way
        Average one-way home-to-work distance. Defaults to INSEE 14 km.
    working_days
        Annual working days. Defaults to 215.
    teleworking_days_per_week
        Average remote days per employee per week (0-5). Reduces commute
        proportionally: 1 day → −20%, 2 days → −40%.
    modal_split_override
        Custom split, e.g. ``{"car_avg": 0.50, "metro": 0.30, "bike": 0.20}``.
        Should sum to ~1.0; we normalize if not.
    """
    if headcount <= 0:
        raise ValueError("Headcount must be > 0")

    distance = distance_km_one_way if distance_km_one_way is not None else DEFAULT_DISTANCE_KM_ONE_WAY
    days = working_days if working_days is not None else DEFAULT_WORKING_DAYS

    # Modal split: validate + normalize
    if modal_split_override:
        split = dict(modal_split_override)
    else:
        split = dict(MODAL_SPLITS.get(geographic_profile, MODAL_SPLITS["national_avg"]))

    total_share = sum(split.values())
    if total_share <= 0:
        raise ValueError("Modal split shares must sum to > 0")
    # normalize so it sums to 1.0
    split = {k: v / total_share for k, v in split.items()}

    # Adjust working days for teleworking
    teleworking_share = max(0.0, min(1.0, teleworking_days_per_week / 5.0))
    effective_days = days * (1.0 - teleworking_share)

    # Round-trip per employee
    annual_pkm = distance * 2 * effective_days  # km/year per employee

    by_mode: List[ModeContribution] = []
    total_kg_per_employee = 0.0

    for mode, share in split.items():
        factor = EMISSION_FACTORS_PKM.get(mode, 0.0)
        pkm_mode = annual_pkm * share
        kg_per_employee = pkm_mode * factor
        total_kg = kg_per_employee * headcount
        total_kg_per_employee += kg_per_employee
        by_mode.append(ModeContribution(
            mode=mode,
            label_fr=MODE_LABELS_FR.get(mode, mode),
            modal_share_pct=round(share * 100, 1),
            emission_factor_kgco2e_per_pkm=factor,
            annual_pkm_per_employee=round(pkm_mode, 1),
            annual_kgco2e_per_employee=round(kg_per_employee, 1),
            annual_kgco2e_total=round(total_kg, 0),
            pct_of_total=0.0,  # filled after totals known
        ))

    total_kg = total_kg_per_employee * headcount

    # Sort descending by emissions + compute percentages
    by_mode.sort(key=lambda x: -x.annual_kgco2e_total)
    for m in by_mode:
        m.pct_of_total = round(100 * m.annual_kgco2e_total / total_kg, 1) if total_kg > 0 else 0.0

    return CommuteResult(
        inputs={
            "headcount":                  headcount,
            "geographic_profile":         geographic_profile,
            "distance_km_one_way":        distance,
            "working_days":               days,
            "teleworking_days_per_week":  teleworking_days_per_week,
            "teleworking_share":          round(teleworking_share, 3),
            "modal_split":                {k: round(v, 3) for k, v in split.items()},
        },
        annual_pkm_per_employee=annual_pkm,
        annual_kgco2e_per_employee=total_kg_per_employee,
        annual_kgco2e_total=total_kg,
        annual_tco2e_total=total_kg / 1000,
        by_mode=by_mode,
    )


def get_defaults_payload() -> dict:
    """Return all default assumptions for UI transparency."""
    return {
        "distance_km_one_way":   DEFAULT_DISTANCE_KM_ONE_WAY,
        "working_days":          DEFAULT_WORKING_DAYS,
        "modal_splits":          MODAL_SPLITS,
        "emission_factors_pkm":  EMISSION_FACTORS_PKM,
        "mode_labels_fr":        MODE_LABELS_FR,
        "geographic_profiles": [
            {"code": "dense_urban",   "label": "Urbain dense (Paris, Lyon centre, etc.)"},
            {"code": "suburban",      "label": "Périurbain / villes moyennes"},
            {"code": "rural",         "label": "Rural / petites villes"},
            {"code": "national_avg",  "label": "Moyenne nationale France"},
        ],
        "sources": [
            "INSEE 2022 — Mobilité quotidienne des actifs",
            "ADEME Base Empreinte v23.0 — facteurs d'émission transport",
            "DARES 2023 — jours travaillés moyens par actif",
        ],
    }
