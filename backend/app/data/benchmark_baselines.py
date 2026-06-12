"""
Public sector benchmark baselines.

When a tenant's sector has fewer than ``MIN_COHORT_SIZE`` other organizations
contributing to ESGflow, we fall back to these reference values, sourced from
publicly-available sector studies. This keeps the benchmarking UI meaningful
for early adopters while we build up real cross-tenant data.

Sources
-------
- CDP (Carbon Disclosure Project) sector reports 2023-2024
- MSCI ESG Ratings methodology — sector medians from public disclosures
- ADEME Base Carbone — emission intensity benchmarks by NAF activity
- Refinitiv ESG Sector Benchmarks 2024
- Eurostat industry statistics (gender pay gap, accident rates)

These are *reference* values, not legal benchmarks. They should always be
labeled in the UI as ``source: "public_reference"`` so users understand the
distinction from peer-comparison data.

Scores are on the 0-100 ESGflow scale (higher = better ESG performance).
"""
from __future__ import annotations

# Minimum number of organizations required to compute real cross-tenant
# benchmarks. Below this, we fall back to public baselines. K-anonymity
# threshold for individual data protection.
MIN_COHORT_SIZE = 5


# ────────────────────────────────────────────────────────────────────────────
# Sector reference baselines (overall + per-pillar)
# ────────────────────────────────────────────────────────────────────────────
# Key = lower-cased normalized sector label (we match by ``in``).
# Each entry provides: p25 / median / p75 / top10 for overall + each pillar,
# plus typical indicator values (carbon intensity, gender pay gap, etc.).

SECTOR_BASELINES = {
    # ── Tech / Software ─────────────────────────────────────────────────────
    "tech": {
        "label": "Tech / Logiciels",
        "naf_codes": ["62", "63", "58"],
        "source": "CDP Tech 2024 + MSCI Software Sector",
        "overall":      {"p25": 55, "median": 68, "p75": 78, "top10": 84},
        "environmental":{"p25": 60, "median": 72, "p75": 82, "top10": 88},
        "social":       {"p25": 58, "median": 70, "p75": 80, "top10": 86},
        "governance":   {"p25": 60, "median": 73, "p75": 82, "top10": 88},
        "indicators": {
            "carbon_intensity_per_revenue": 8.5,    # tCO2e / M€
            "renewable_energy_pct":         62.0,   # %
            "gender_pay_gap":               12.5,   # %
            "employee_turnover":            18.0,   # %
            "ceo_pay_ratio":                85.0,   # x
        },
    },
    # ── Finance / Banking ──────────────────────────────────────────────────
    "finance": {
        "label": "Finance / Banque / Assurance",
        "naf_codes": ["64", "65", "66"],
        "source": "MSCI Financials 2024 + UNEP FI",
        "overall":      {"p25": 58, "median": 70, "p75": 80, "top10": 86},
        "environmental":{"p25": 55, "median": 68, "p75": 78, "top10": 84},
        "social":       {"p25": 60, "median": 71, "p75": 79, "top10": 85},
        "governance":   {"p25": 65, "median": 76, "p75": 84, "top10": 90},
        "indicators": {
            "carbon_intensity_per_revenue": 6.0,
            "renewable_energy_pct":         55.0,
            "gender_pay_gap":               18.5,
            "employee_turnover":            12.0,
            "ceo_pay_ratio":                145.0,
        },
    },
    # ── Industry / Manufacturing ───────────────────────────────────────────
    "industry": {
        "label": "Industrie / Manufacture",
        "naf_codes": ["10", "11", "12", "13", "14", "15", "16", "17", "18",
                       "19", "20", "21", "22", "23", "24", "25", "26", "27",
                       "28", "29", "30", "31", "32", "33"],
        "source": "CDP Climate 2024 + ADEME Industrie",
        "overall":      {"p25": 45, "median": 58, "p75": 70, "top10": 78},
        "environmental":{"p25": 40, "median": 53, "p75": 66, "top10": 75},
        "social":       {"p25": 50, "median": 62, "p75": 73, "top10": 80},
        "governance":   {"p25": 52, "median": 64, "p75": 74, "top10": 82},
        "indicators": {
            "carbon_intensity_per_revenue": 285.0,
            "renewable_energy_pct":         28.0,
            "gender_pay_gap":               14.5,
            "employee_turnover":            15.0,
            "ceo_pay_ratio":                95.0,
            "accident_rate":                12.5,   # per million hours
        },
    },
    # ── Retail / Consumer ──────────────────────────────────────────────────
    "retail": {
        "label": "Commerce / Retail / Consommation",
        "naf_codes": ["45", "46", "47"],
        "source": "MSCI Consumer Staples + CDP Retail",
        "overall":      {"p25": 50, "median": 62, "p75": 73, "top10": 80},
        "environmental":{"p25": 48, "median": 60, "p75": 71, "top10": 79},
        "social":       {"p25": 52, "median": 64, "p75": 75, "top10": 82},
        "governance":   {"p25": 55, "median": 67, "p75": 76, "top10": 83},
        "indicators": {
            "carbon_intensity_per_revenue": 45.0,
            "renewable_energy_pct":         42.0,
            "gender_pay_gap":               16.0,
            "employee_turnover":            32.0,
            "ceo_pay_ratio":                160.0,
        },
    },
    # ── Construction / Real Estate ─────────────────────────────────────────
    "construction": {
        "label": "BTP / Construction / Immobilier",
        "naf_codes": ["41", "42", "43", "68"],
        "source": "CDP Built Environment 2024",
        "overall":      {"p25": 42, "median": 55, "p75": 68, "top10": 76},
        "environmental":{"p25": 38, "median": 50, "p75": 64, "top10": 73},
        "social":       {"p25": 45, "median": 58, "p75": 70, "top10": 78},
        "governance":   {"p25": 48, "median": 61, "p75": 72, "top10": 80},
        "indicators": {
            "carbon_intensity_per_revenue": 320.0,
            "renewable_energy_pct":         22.0,
            "gender_pay_gap":               17.0,
            "employee_turnover":            20.0,
            "ceo_pay_ratio":                75.0,
            "accident_rate":                28.5,
        },
    },
    # ── Transport / Logistics ──────────────────────────────────────────────
    "transport": {
        "label": "Transport / Logistique",
        "naf_codes": ["49", "50", "51", "52", "53"],
        "source": "CDP Transport 2024",
        "overall":      {"p25": 40, "median": 54, "p75": 67, "top10": 75},
        "environmental":{"p25": 35, "median": 48, "p75": 62, "top10": 71},
        "social":       {"p25": 45, "median": 58, "p75": 70, "top10": 78},
        "governance":   {"p25": 48, "median": 60, "p75": 71, "top10": 79},
        "indicators": {
            "carbon_intensity_per_revenue": 410.0,
            "renewable_energy_pct":         18.0,
            "gender_pay_gap":               13.0,
            "employee_turnover":            22.0,
            "ceo_pay_ratio":                70.0,
            "accident_rate":                18.0,
        },
    },
    # ── Energy / Utilities ─────────────────────────────────────────────────
    "energy": {
        "label": "Énergie / Utilities",
        "naf_codes": ["35", "36"],
        "source": "CDP Energy 2024",
        "overall":      {"p25": 48, "median": 62, "p75": 74, "top10": 82},
        "environmental":{"p25": 40, "median": 55, "p75": 69, "top10": 78},
        "social":       {"p25": 52, "median": 65, "p75": 76, "top10": 84},
        "governance":   {"p25": 55, "median": 68, "p75": 78, "top10": 85},
        "indicators": {
            "carbon_intensity_per_revenue": 580.0,
            "renewable_energy_pct":         48.0,
            "gender_pay_gap":               14.0,
            "employee_turnover":            10.0,
            "ceo_pay_ratio":                110.0,
        },
    },
    # ── Healthcare / Pharma ────────────────────────────────────────────────
    "healthcare": {
        "label": "Santé / Pharmacie",
        "naf_codes": ["86", "87", "21"],
        "source": "MSCI Healthcare + WHO Sector Index",
        "overall":      {"p25": 55, "median": 67, "p75": 78, "top10": 85},
        "environmental":{"p25": 52, "median": 64, "p75": 75, "top10": 82},
        "social":       {"p25": 60, "median": 72, "p75": 81, "top10": 88},
        "governance":   {"p25": 58, "median": 70, "p75": 80, "top10": 86},
        "indicators": {
            "carbon_intensity_per_revenue": 35.0,
            "renewable_energy_pct":         45.0,
            "gender_pay_gap":               11.0,
            "employee_turnover":            16.0,
            "ceo_pay_ratio":                125.0,
        },
    },
    # ── Services / Conseil ─────────────────────────────────────────────────
    "services": {
        "label": "Services / Conseil",
        "naf_codes": ["69", "70", "71", "73", "74", "78", "82"],
        "source": "Refinitiv Services Sector + ESGflow internal",
        "overall":      {"p25": 52, "median": 64, "p75": 75, "top10": 82},
        "environmental":{"p25": 58, "median": 70, "p75": 80, "top10": 86},
        "social":       {"p25": 55, "median": 67, "p75": 77, "top10": 84},
        "governance":   {"p25": 55, "median": 67, "p75": 77, "top10": 84},
        "indicators": {
            "carbon_intensity_per_revenue": 12.0,
            "renewable_energy_pct":         58.0,
            "gender_pay_gap":               13.5,
            "employee_turnover":            20.0,
            "ceo_pay_ratio":                90.0,
        },
    },
    # ── Agriculture / Agroalimentaire ─────────────────────────────────────
    "agriculture": {
        "label": "Agriculture / Agroalimentaire",
        "naf_codes": ["01", "02", "03", "10", "11"],
        "source": "CDP Agriculture 2024 + ADEME Agri + FAO GLEAM",
        "overall":      {"p25": 38, "median": 52, "p75": 65, "top10": 74},
        "environmental":{"p25": 30, "median": 45, "p75": 60, "top10": 72},
        "social":       {"p25": 42, "median": 55, "p75": 68, "top10": 78},
        "governance":   {"p25": 45, "median": 58, "p75": 70, "top10": 78},
        "indicators": {
            "carbon_intensity_per_revenue": 180.0,
            "renewable_energy_pct":         28.0,
            "gender_pay_gap":               16.0,
            "employee_turnover":            22.0,
            "ceo_pay_ratio":                55.0,
            "water_intensity_m3_per_meur":  4200.0,
            "waste_recycling_pct":          45.0,
            "accident_rate_per_1000":       35.0,
        },
    },
    # ── Immobilier / Foncier ──────────────────────────────────────────────
    "real_estate": {
        "label": "Immobilier / Foncier",
        "naf_codes": ["68", "41"],
        "source": "GRESB 2024 + CRREM + ADEME DPE",
        "overall":      {"p25": 42, "median": 56, "p75": 68, "top10": 77},
        "environmental":{"p25": 38, "median": 52, "p75": 66, "top10": 76},
        "social":       {"p25": 48, "median": 60, "p75": 72, "top10": 80},
        "governance":   {"p25": 50, "median": 62, "p75": 73, "top10": 80},
        "indicators": {
            "carbon_intensity_per_revenue": 45.0,
            "renewable_energy_pct":         32.0,
            "gender_pay_gap":               15.0,
            "employee_turnover":            14.0,
            "ceo_pay_ratio":                75.0,
            "energy_intensity_kwh_per_m2":  180.0,
            "green_certified_pct":          35.0,
        },
    },
    # ── Chimie / Pharma ───────────────────────────────────────────────────
    "chemicals": {
        "label": "Chimie / Pharmacie",
        "naf_codes": ["20", "21"],
        "source": "CDP Chemical 2024 + EFPIA + CEFIC Responsible Care",
        "overall":      {"p25": 40, "median": 55, "p75": 68, "top10": 78},
        "environmental":{"p25": 35, "median": 50, "p75": 65, "top10": 76},
        "social":       {"p25": 48, "median": 62, "p75": 74, "top10": 82},
        "governance":   {"p25": 52, "median": 65, "p75": 76, "top10": 84},
        "indicators": {
            "carbon_intensity_per_revenue": 95.0,
            "renewable_energy_pct":         35.0,
            "gender_pay_gap":               11.0,
            "employee_turnover":            10.0,
            "ceo_pay_ratio":                165.0,
            "r_and_d_pct_revenue":          15.0,
            "accident_rate_per_1000":       8.5,
        },
    },
    # ── Télécoms / Médias ─────────────────────────────────────────────────
    "telecoms": {
        "label": "Télécommunications / Médias",
        "naf_codes": ["61", "60", "59"],
        "source": "GSMA ESG Metrics 2024 + ITU Green Standards",
        "overall":      {"p25": 52, "median": 65, "p75": 76, "top10": 83},
        "environmental":{"p25": 50, "median": 64, "p75": 75, "top10": 82},
        "social":       {"p25": 55, "median": 68, "p75": 78, "top10": 85},
        "governance":   {"p25": 58, "median": 70, "p75": 80, "top10": 87},
        "indicators": {
            "carbon_intensity_per_revenue": 22.0,
            "renewable_energy_pct":         55.0,
            "gender_pay_gap":               14.0,
            "employee_turnover":            15.0,
            "ceo_pay_ratio":                120.0,
            "digital_inclusion_score":      62.0,
        },
    },
    # ── Tourisme / Hôtellerie / Restauration ──────────────────────────────
    "hospitality": {
        "label": "Tourisme / Hôtellerie / Restauration",
        "naf_codes": ["55", "56", "79"],
        "source": "GSTC 2024 + Sustainable Hospitality Alliance",
        "overall":      {"p25": 38, "median": 50, "p75": 62, "top10": 72},
        "environmental":{"p25": 35, "median": 48, "p75": 60, "top10": 70},
        "social":       {"p25": 40, "median": 52, "p75": 64, "top10": 74},
        "governance":   {"p25": 42, "median": 55, "p75": 66, "top10": 75},
        "indicators": {
            "carbon_intensity_per_revenue": 55.0,
            "renewable_energy_pct":         25.0,
            "gender_pay_gap":               18.0,
            "employee_turnover":            35.0,
            "ceo_pay_ratio":                60.0,
            "food_waste_kg_per_cover":      0.85,
            "water_intensity_m3_per_meur":  2800.0,
        },
    },
    # ── Textile / Mode ────────────────────────────────────────────────────
    "textile": {
        "label": "Textile / Mode / Luxe",
        "naf_codes": ["13", "14", "15"],
        "source": "Textile Exchange 2024 + SAC Higg Index",
        "overall":      {"p25": 35, "median": 48, "p75": 62, "top10": 73},
        "environmental":{"p25": 30, "median": 44, "p75": 58, "top10": 70},
        "social":       {"p25": 38, "median": 50, "p75": 64, "top10": 75},
        "governance":   {"p25": 42, "median": 55, "p75": 68, "top10": 78},
        "indicators": {
            "carbon_intensity_per_revenue": 120.0,
            "renewable_energy_pct":         22.0,
            "gender_pay_gap":               20.0,
            "employee_turnover":            28.0,
            "ceo_pay_ratio":                70.0,
            "recycled_material_pct":        18.0,
            "water_intensity_m3_per_meur":  6500.0,
        },
    },
    # ── Default fallback ───────────────────────────────────────────────────
    "default": {
        "label": "Tous secteurs (référence générale)",
        "naf_codes": [],
        "source": "ESGflow cross-sector reference",
        "overall":      {"p25": 50, "median": 62, "p75": 73, "top10": 80},
        "environmental":{"p25": 48, "median": 60, "p75": 72, "top10": 80},
        "social":       {"p25": 52, "median": 64, "p75": 74, "top10": 81},
        "governance":   {"p25": 55, "median": 66, "p75": 75, "top10": 82},
        "indicators": {
            "carbon_intensity_per_revenue": 60.0,
            "renewable_energy_pct":         40.0,
            "gender_pay_gap":               14.0,
            "employee_turnover":            18.0,
            "ceo_pay_ratio":                100.0,
        },
    },
}


def normalize_sector(raw: str) -> str:
    """
    Normalize a free-text sector / industry label to one of our baseline keys.

    Matching is intentionally fuzzy — labels in the wild vary widely
    ("Software", "Tech", "IT services", "Édition de logiciels", etc.).
    """
    if not raw:
        return "default"
    s = raw.lower().strip()

    # NB: keywords must not be common substrings of unrelated words
    # (e.g. "usine" → matches "business", "vente" → "convention"). We use
    # substring matching for FR/EN flexibility, so anchor with discriminating
    # roots only.
    rules = [
        (["tech", "software", "logiciel", "saas", "informat", "digital", "édition"], "tech"),
        (["finance", "bank", "banque", "assur", "insurance", "fintech"],            "finance"),
        (["industr", "manufact", "fabric", "automotive", "automobil"],              "industry"),
        (["retail", "commerc", "distribut", "magasin", "consumer", "supermarch"],   "retail"),
        (["constru", "btp", "bâtim"],                                               "construction"),
        (["immobil", "real estate", "foncier", "property"],                         "real_estate"),
        (["transport", "logistique", "logistic", "fret", "shipping"],               "transport"),
        (["énergie", "energie", "energy", "utilit", "électric", "pétrole"],         "energy"),
        (["santé", "sante", "health", "médical", "biotech", "hôpita"],              "healthcare"),
        (["pharma", "chimie", "chemic", "laborat"],                                 "chemicals"),
        (["agri", "agroaliment", "aliment", "food", "boisson"],                     "agriculture"),
        (["télécom", "telecom", "média", "media", "broadcast"],                     "telecoms"),
        (["hôtel", "hotel", "restaur", "tourism", "tourisme", "héberg"],            "hospitality"),
        (["textile", "mode", "fashion", "luxe", "luxury", "habillem"],              "textile"),
        (["conseil", "consult", "audit", "avocat", "juridiq", "advisory"],          "services"),
    ]
    for keywords, code in rules:
        for kw in keywords:
            if kw in s:
                return code
    return "default"


def get_baseline(sector_key: str) -> dict:
    """Look up a baseline by normalized sector key; falls back to ``default``."""
    return SECTOR_BASELINES.get(sector_key) or SECTOR_BASELINES["default"]
