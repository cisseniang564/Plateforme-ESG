"""
Scope 3 Calculator — méthode "spend-based" basée sur les facteurs d'émission
ADEME (Base Empreinte / Base Carbone).

Méthode reconnue par le GHG Protocol et compatible Bilan Carbone ADEME :
  émissions (kgCO₂e) = dépense (€) × facteur d'émission (kgCO₂e/€)

Les 15 catégories Scope 3 du GHG Protocol sont implémentées avec des facteurs
moyens issus de Base Empreinte (ADEME, mise à jour novembre 2024). Pour une
production stricte, les facteurs doivent être affinés par sous-catégorie
(NACE / NAF) — la structure le permet via le champ `nace_code`.

⚠️ Les facteurs ci-dessous sont des **moyennes sectorielles** France 2024.
Pour un Bilan Carbone réglementaire (>500 salariés), un audit avec facteurs
spécifiques est recommandé.
"""
from __future__ import annotations

from typing import Optional, Dict, List, Any
from dataclasses import dataclass


# ─── Catégories GHG Protocol Scope 3 ──────────────────────────────────────────
# Les 15 catégories canoniques + leurs facteurs d'émission ADEME moyens.

@dataclass
class EmissionFactor:
    """Un facteur d'émission ADEME (kgCO₂e par unité)."""
    code: str           # ex: "biens_services_marchandises"
    label: str
    category_id: int    # 1-15 (GHG Protocol Scope 3 categories)
    category_name: str
    unit: str           # "kgCO2e/EUR" | "kgCO2e/km" | "kgCO2e/kWh" | "kgCO2e/t"
    factor: float       # the actual factor
    source: str = "ADEME Base Empreinte 2024"
    notes: Optional[str] = None


# Facteurs spend-based (kgCO₂e par euro dépensé) — moyenne sectorielle ADEME
SPEND_FACTORS: List[EmissionFactor] = [
    # ── Catégorie 1 — Biens et services achetés ─────────────────────────────
    EmissionFactor("services_informatiques", "Services informatiques / SaaS",       1, "Biens et services achetés", "kgCO2e/EUR", 0.110),
    EmissionFactor("services_conseil",       "Conseil & prestations intellectuelles", 1, "Biens et services achetés", "kgCO2e/EUR", 0.095),
    EmissionFactor("marketing_communication","Marketing & communication",            1, "Biens et services achetés", "kgCO2e/EUR", 0.155),
    EmissionFactor("fournitures_bureau",     "Fournitures de bureau / papeterie",    1, "Biens et services achetés", "kgCO2e/EUR", 0.420),
    EmissionFactor("equipements_it",         "Équipements informatiques (achat)",    1, "Biens et services achetés", "kgCO2e/EUR", 0.310),
    EmissionFactor("mobilier_bureau",        "Mobilier de bureau",                   1, "Biens et services achetés", "kgCO2e/EUR", 0.490),
    EmissionFactor("vetements_textile",      "Vêtements & textile",                  1, "Biens et services achetés", "kgCO2e/EUR", 0.620),
    EmissionFactor("alimentation_restauration","Alimentation & restauration",        1, "Biens et services achetés", "kgCO2e/EUR", 1.200),
    EmissionFactor("matieres_premieres_metaux","Matières premières — métaux",        1, "Biens et services achetés", "kgCO2e/EUR", 2.150,
                   notes="Acier, aluminium, cuivre — moyenne pondérée"),
    EmissionFactor("matieres_premieres_plastique","Matières premières — plastiques", 1, "Biens et services achetés", "kgCO2e/EUR", 1.850),
    EmissionFactor("matieres_premieres_chimie","Matières premières — chimie",        1, "Biens et services achetés", "kgCO2e/EUR", 1.600),

    # ── Catégorie 2 — Immobilisations / Capital goods ────────────────────────
    EmissionFactor("immobilisations_machines","Machines & équipements industriels",  2, "Biens immobilisés", "kgCO2e/EUR", 0.580),
    EmissionFactor("immobilisations_batiment","Construction / immobilier",           2, "Biens immobilisés", "kgCO2e/EUR", 0.730),
    EmissionFactor("immobilisations_vehicules","Véhicules d'entreprise (achat)",     2, "Biens immobilisés", "kgCO2e/EUR", 0.520),

    # ── Catégorie 3 — Énergie hors Scope 1&2 ─────────────────────────────────
    EmissionFactor("energie_amont",          "Production amont énergie achetée",     3, "Activités liées à l'énergie hors S1/S2", "kgCO2e/EUR", 0.180),

    # ── Catégorie 4 — Transport amont ────────────────────────────────────────
    EmissionFactor("transport_amont_routier","Transport routier marchandises (amont)",4, "Transport amont", "kgCO2e/EUR", 0.480),
    EmissionFactor("transport_amont_maritime","Transport maritime",                  4, "Transport amont", "kgCO2e/EUR", 0.280),
    EmissionFactor("transport_amont_aerien", "Transport aérien fret",                4, "Transport amont", "kgCO2e/EUR", 1.850),

    # ── Catégorie 5 — Déchets de l'activité ──────────────────────────────────
    EmissionFactor("dechets_traitement",     "Traitement des déchets",               5, "Déchets de l'activité", "kgCO2e/EUR", 0.290),

    # ── Catégorie 6 — Déplacements professionnels ────────────────────────────
    EmissionFactor("deplacement_train",      "Déplacements train",                   6, "Déplacements professionnels", "kgCO2e/EUR", 0.020,
                   notes="TGV France ≈ 2.4 gCO2e/voyageur.km"),
    EmissionFactor("deplacement_avion_court","Déplacements avion court-courrier",    6, "Déplacements professionnels", "kgCO2e/EUR", 1.250),
    EmissionFactor("deplacement_avion_long", "Déplacements avion long-courrier",     6, "Déplacements professionnels", "kgCO2e/EUR", 0.890),
    EmissionFactor("deplacement_voiture",    "Déplacements voiture (location/note frais)", 6, "Déplacements professionnels", "kgCO2e/EUR", 0.480),
    EmissionFactor("deplacement_hotel",      "Hébergement (hôtel)",                  6, "Déplacements professionnels", "kgCO2e/EUR", 0.275),

    # ── Catégorie 7 — Déplacements domicile-travail ──────────────────────────
    EmissionFactor("dom_travail_voiture",    "Trajet domicile-travail voiture",      7, "Déplacements domicile-travail", "kgCO2e/EUR", 0.520),

    # ── Catégorie 9 — Transport aval ─────────────────────────────────────────
    EmissionFactor("transport_aval",         "Transport produits vendus (aval)",     9, "Transport aval", "kgCO2e/EUR", 0.450),

    # ── Catégorie 12 — Fin de vie produits vendus ────────────────────────────
    EmissionFactor("fin_de_vie",             "Traitement fin de vie produits",      12, "Fin de vie produits vendus", "kgCO2e/EUR", 0.310),

    # ── Catégorie 13 — Actifs loués (aval) ───────────────────────────────────
    EmissionFactor("location_immobilier",    "Location bureaux / immobilier",       13, "Actifs en location aval", "kgCO2e/EUR", 0.165),

    # ── Catégorie 15 — Investissements ───────────────────────────────────────
    EmissionFactor("investissements",        "Investissements financiers",          15, "Investissements", "kgCO2e/EUR", 0.180,
                   notes="Émissions financées — méthode PCAF simplifiée"),
]


# Facteurs activité (par km, kWh, tonne) — pour saisies physiques précises
ACTIVITY_FACTORS: List[EmissionFactor] = [
    EmissionFactor("act_voiture_essence",    "Voiture essence",                      6, "Déplacements professionnels", "kgCO2e/km",  0.193),
    EmissionFactor("act_voiture_diesel",     "Voiture diesel",                       6, "Déplacements professionnels", "kgCO2e/km",  0.171),
    EmissionFactor("act_voiture_electrique", "Voiture électrique",                   6, "Déplacements professionnels", "kgCO2e/km",  0.103),
    EmissionFactor("act_avion_court",        "Avion court-courrier <1500 km",        6, "Déplacements professionnels", "kgCO2e/km",  0.230),
    EmissionFactor("act_avion_long",         "Avion long-courrier >3500 km",         6, "Déplacements professionnels", "kgCO2e/km",  0.150),
    EmissionFactor("act_train_tgv",          "TGV France",                           6, "Déplacements professionnels", "kgCO2e/km",  0.0024),
    EmissionFactor("act_train_intl",         "Train international",                  6, "Déplacements professionnels", "kgCO2e/km",  0.037),
    EmissionFactor("act_metro",              "Métro/RER/tramway France",             6, "Déplacements professionnels", "kgCO2e/km",  0.0029),
    EmissionFactor("act_bus_urbain",         "Bus urbain France",                    6, "Déplacements professionnels", "kgCO2e/km",  0.103),
    EmissionFactor("act_electricite_france", "Électricité France (mix)",             3, "Activités liées à l'énergie hors S1/S2", "kgCO2e/kWh", 0.0571),
    EmissionFactor("act_gaz_naturel",        "Gaz naturel (chaudière)",              3, "Activités liées à l'énergie hors S1/S2", "kgCO2e/kWh", 0.227),
    EmissionFactor("act_transport_routier",  "Transport routier marchandises",       4, "Transport amont", "kgCO2e/t.km", 0.092),
    EmissionFactor("act_transport_maritime", "Transport maritime conteneur",         4, "Transport amont", "kgCO2e/t.km", 0.011),
    EmissionFactor("act_transport_aerien",   "Transport aérien fret",                4, "Transport amont", "kgCO2e/t.km", 1.140),
    EmissionFactor("act_papier",             "Papier (production)",                  1, "Biens et services achetés", "kgCO2e/t", 919.0),
    EmissionFactor("act_dechet_incineration","Déchet — incinération",                5, "Déchets de l'activité", "kgCO2e/t",   368.0),
    EmissionFactor("act_dechet_enfouissement","Déchet — enfouissement (CET)",        5, "Déchets de l'activité", "kgCO2e/t",   434.0),
    EmissionFactor("act_dechet_recyclage",   "Déchet — tri & recyclage",             5, "Déchets de l'activité", "kgCO2e/t",     21.0),
]


def get_factor(code: str) -> Optional[EmissionFactor]:
    """Find a factor by its code (in either list)."""
    for f in SPEND_FACTORS + ACTIVITY_FACTORS:
        if f.code == code:
            return f
    return None


def list_categories() -> List[Dict[str, Any]]:
    """Return the 15 GHG Protocol Scope 3 categories with their factor counts."""
    cat_map: Dict[int, Dict[str, Any]] = {}
    canonical = {
        1:  "Biens et services achetés",
        2:  "Biens immobilisés",
        3:  "Activités liées à l'énergie hors S1/S2",
        4:  "Transport amont",
        5:  "Déchets de l'activité",
        6:  "Déplacements professionnels",
        7:  "Déplacements domicile-travail",
        8:  "Actifs en location amont",
        9:  "Transport aval",
        10: "Transformation des produits vendus",
        11: "Utilisation des produits vendus",
        12: "Fin de vie produits vendus",
        13: "Actifs en location aval",
        14: "Franchises",
        15: "Investissements",
    }
    for cid, label in canonical.items():
        cat_map[cid] = {
            "category_id": cid,
            "label": label,
            "spend_factors": [],
            "activity_factors": [],
        }
    for f in SPEND_FACTORS:
        if f.category_id in cat_map:
            cat_map[f.category_id]["spend_factors"].append({
                "code": f.code, "label": f.label, "factor": f.factor, "unit": f.unit, "notes": f.notes,
            })
    for f in ACTIVITY_FACTORS:
        if f.category_id in cat_map:
            cat_map[f.category_id]["activity_factors"].append({
                "code": f.code, "label": f.label, "factor": f.factor, "unit": f.unit, "notes": f.notes,
            })
    return [cat_map[k] for k in sorted(cat_map.keys())]


# ─── Computation ────────────────────────────────────────────────────────────

@dataclass
class LineItem:
    """Une ligne d'entrée du calculateur."""
    factor_code: str
    quantity: float  # € for spend, km/kWh/t for activity
    label: Optional[str] = None  # user-provided label (e.g. supplier name)


@dataclass
class LineResult:
    factor_code: str
    factor_label: str
    factor_value: float
    factor_unit: str
    category_id: int
    category_name: str
    quantity: float
    emissions_kgco2e: float
    emissions_tco2e: float
    user_label: Optional[str] = None


def calculate(lines: List[LineItem]) -> Dict[str, Any]:
    """Compute total Scope 3 emissions for a list of input lines.

    Returns:
        {
          "total_kgco2e": float,
          "total_tco2e":  float,
          "by_category":  [{category_id, category_name, kgco2e, tco2e, lines: int}, ...],
          "details":      [LineResult.__dict__ ...],
          "warnings":     [...]
        }
    """
    details: List[Dict[str, Any]] = []
    by_cat: Dict[int, Dict[str, Any]] = {}
    warnings: List[str] = []
    total = 0.0

    for line in lines:
        f = get_factor(line.factor_code)
        if not f:
            warnings.append(f"Facteur inconnu : '{line.factor_code}' — ligne ignorée")
            continue
        if line.quantity is None or line.quantity < 0:
            warnings.append(f"Quantité invalide pour '{line.factor_code}' — ligne ignorée")
            continue

        kg = line.quantity * f.factor
        total += kg
        r = LineResult(
            factor_code=f.code,
            factor_label=f.label,
            factor_value=f.factor,
            factor_unit=f.unit,
            category_id=f.category_id,
            category_name=f.category_name,
            quantity=line.quantity,
            emissions_kgco2e=round(kg, 2),
            emissions_tco2e=round(kg / 1000.0, 3),
            user_label=line.label,
        )
        details.append(r.__dict__)

        if f.category_id not in by_cat:
            by_cat[f.category_id] = {
                "category_id": f.category_id,
                "category_name": f.category_name,
                "kgco2e": 0.0,
                "tco2e":  0.0,
                "lines":  0,
            }
        by_cat[f.category_id]["kgco2e"] += kg
        by_cat[f.category_id]["tco2e"]  += kg / 1000.0
        by_cat[f.category_id]["lines"]  += 1

    # Round once at the end
    for c in by_cat.values():
        c["kgco2e"] = round(c["kgco2e"], 2)
        c["tco2e"]  = round(c["tco2e"], 3)

    return {
        "total_kgco2e": round(total, 2),
        "total_tco2e":  round(total / 1000.0, 3),
        "by_category":  sorted(by_cat.values(), key=lambda c: c["category_id"]),
        "details":      details,
        "warnings":     warnings,
        "source":       "ADEME Base Empreinte 2024",
        "method":       "spend-based + activity-based mix",
    }
