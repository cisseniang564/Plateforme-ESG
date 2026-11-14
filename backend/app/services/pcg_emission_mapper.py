"""
Conversion des charges d'un FEC (comptes du Plan Comptable Général) en émissions estimées.

Principe : une dépense n'est convertie en CO2e QUE si un ratio monétaire publié
correspond à la nature du compte. Les autres dépenses (énergie, carburant,
matières, marchandises, transport, loyers…) ne sont PAS converties : aucun ratio
générique ne les représente correctement, et l'ADEME recommande pour elles des
données physiques (kWh, litres, km, tonnes). Elles sont restituées telles
quelles dans `unconverted_spend()` pour que l'utilisateur sache quoi saisir.

Source des ratios : Base Carbone® de l'ADEME, ratios monétaires par secteur
(« Achats de services »), en kgCO2e par k€ HT, incertitude 80 %. Ce sont les
valeurs de la série historique ; l'ADEME a publié depuis une série révisée
(travaux SDES/INSEE). À confronter à la Base Empreinte avant tout usage
réglementaire : il s'agit d'ordres de grandeur, pas de mesures.
"""
from collections import defaultdict
from typing import Any, Dict, List, Optional

RATIO_SOURCE = "Base Carbone ADEME — ratios monétaires (série historique), incertitude 80 %"
RATIO_UNCERTAINTY_PCT = 80

# Libellé ADEME → kgCO2e par k€ HT
_ADEME = {
    "assurance": ("Assurance, services bancaires, conseil et honoraires", 110),
    "services": ("Services (imprimerie, publicité, ingénierie, maintenance des bâtiments, nettoyage, sécurité…)", 170),
    "telecom": ("Télécommunications", 170),
    "reparation": ("Réparation et installation de machines et d'équipements", 390),
    "hebergement": ("Hébergement et restauration", 320),
    "recherche": ("Recherche et développement", 250),
}


def _ratio(key: str, category: str, metric_name: str) -> Dict[str, Any]:
    label, value = _ADEME[key]
    return {
        "category": category, "pillar": "environmental", "metric_name": metric_name,
        "unit": "kgCO2e", "ratio_kgco2e_per_keur": value, "ademe_label": label,
    }


# Préfixe de compte PCG → ratio. Le préfixe le plus long l'emporte.
PCG_EMISSION_MAP: Dict[str, Dict[str, Any]] = {
    "6155": _ratio("reparation", "Entretien", "Entretien et réparations sur biens mobiliers"),
    "615":  _ratio("services", "Entretien", "Entretien et réparations"),
    "616":  _ratio("assurance", "Services", "Primes d'assurance"),
    "617":  _ratio("recherche", "Services", "Études et recherches"),
    "622":  _ratio("assurance", "Services", "Honoraires et rémunérations d'intermédiaires"),
    "623":  _ratio("services", "Services", "Publicité, publications, relations publiques"),
    "6256": _ratio("hebergement", "Déplacements", "Missions (hébergement et restauration)"),
    "6257": _ratio("hebergement", "Déplacements", "Réceptions"),
    "626":  _ratio("telecom", "Services", "Frais postaux et de télécommunications"),
    "627":  _ratio("assurance", "Services", "Services bancaires"),
}

# Charges de personnel : restituées en k€ (indicateur social), jamais converties en CO2e.
PCG_SOCIAL_MAP: Dict[str, Dict[str, Any]] = {
    "641": {"category": "Emploi", "pillar": "social", "metric_name": "Charges salariales", "unit": "k€"},
    "645": {"category": "Protection sociale", "pillar": "social", "metric_name": "Charges sociales patronales", "unit": "k€"},
}

# Achats et services NON convertis : ce qu'il faut saisir à la place.
PCG_UNCONVERTED: Dict[str, Dict[str, str]] = {
    "601":  {"label": "Achats de matières premières", "advice": "Saisissez les quantités achetées par matière (tonnes)."},
    "602":  {"label": "Achats d'autres approvisionnements", "advice": "Saisissez les quantités par type de fourniture."},
    "604":  {"label": "Achats d'études et de prestations", "advice": "Demandez le bilan carbone du prestataire ou saisissez la prestation."},
    "605":  {"label": "Achats de matériel et de travaux", "advice": "Saisissez la nature et les quantités des équipements."},
    "6061": {"label": "Eau, énergie (électricité, gaz)", "advice": "Saisissez vos consommations en kWh (factures ou connecteur Enedis)."},
    "6062": {"label": "Combustibles", "advice": "Saisissez les volumes consommés (kWh, litres, m³)."},
    "6063": {"label": "Fournitures d'entretien et petit équipement", "advice": "Saisissez la nature des fournitures si le poste est significatif."},
    "606":  {"label": "Achats non stockés (énergie, carburant, fournitures)", "advice": "Saisissez vos consommations d'énergie et de carburant (kWh, litres)."},
    "607":  {"label": "Achats de marchandises", "advice": "Saisissez les quantités par famille de produits."},
    "611":  {"label": "Sous-traitance générale", "advice": "Demandez les données d'émission à vos sous-traitants."},
    "613":  {"label": "Locations", "advice": "Saisissez les surfaces louées et leurs consommations d'énergie."},
    "614":  {"label": "Charges locatives et de copropriété", "advice": "Saisissez les consommations d'énergie refacturées."},
    "624":  {"label": "Transports de biens et transports collectifs", "advice": "Saisissez les tonnes.km ou les distances par mode de transport."},
    "6251": {"label": "Voyages et déplacements", "advice": "Saisissez les distances parcourues par mode (avion, train, voiture)."},
}


def _longest_prefix(compte_num: str, table: Dict[str, Any]) -> Optional[str]:
    for length in (4, 3, 2):
        prefix = (compte_num or "")[:length]
        if prefix in table:
            return prefix
    return None


def _find_mapping(compte_num: str) -> Optional[Dict[str, Any]]:
    """Ratio (ou indicateur social) applicable à un compte, sinon None."""
    prefix = _longest_prefix(compte_num, PCG_EMISSION_MAP)
    if prefix:
        return PCG_EMISSION_MAP[prefix]
    social = _longest_prefix(compte_num, PCG_SOCIAL_MAP)
    return PCG_SOCIAL_MAP[social] if social else None


def co2e_kg(amount_eur: float, ratio_kgco2e_per_keur: float) -> float:
    """Montant HT en euros × ratio (kgCO2e par k€) → kgCO2e."""
    return amount_eur / 1000.0 * ratio_kgco2e_per_keur


def aggregate_by_category(entries: List[Dict]) -> List[Dict]:
    """Regroupe les écritures par poste et calcule les totaux prêts à devenir des saisies."""
    groups: Dict[str, Any] = defaultdict(lambda: {"total_amount": 0.0, "entry_count": 0, "mapping": None, "dates": []})

    for entry in entries:
        mapping = _find_mapping(entry["compte_num"])
        if not mapping:
            continue
        group = groups[mapping["metric_name"]]
        group["total_amount"] += entry["net_amount"]
        group["entry_count"] += 1
        group["mapping"] = mapping
        if entry.get("date"):
            group["dates"].append(entry["date"])

    results = []
    for metric_name, group in groups.items():
        mapping = group["mapping"]
        dates = sorted(group["dates"])
        ratio = mapping.get("ratio_kgco2e_per_keur")
        if ratio:
            value, unit = round(co2e_kg(group["total_amount"], ratio), 2), "kgCO2e"
            note = f"Ratio monétaire ADEME « {mapping['ademe_label']} » : {ratio} kgCO2e/k€ HT (incertitude {RATIO_UNCERTAINTY_PCT} %)"
        else:
            value, unit = round(group["total_amount"] / 1000, 2), "k€"
            note = "Indicateur social (montant comptable)"
        results.append({
            "pillar": mapping["pillar"],
            "category": mapping["category"],
            "metric_name": metric_name,
            "value": value,
            "unit": unit,
            "period": dates[0][:7] if dates else "",
            "total_amount_eur": round(group["total_amount"], 2),
            "entry_count": group["entry_count"],
            "ratio_kgco2e_per_keur": ratio,
            "note": note,
        })
    return results


def unconverted_spend(entries: List[Dict]) -> List[Dict]:
    """Achats et services du FEC laissés sans estimation, avec ce qu'il faut saisir à la place."""
    totals: Dict[str, float] = defaultdict(float)
    for entry in entries:
        compte = entry["compte_num"] or ""
        if _find_mapping(compte) is not None:
            continue
        prefix = _longest_prefix(compte, PCG_UNCONVERTED)
        if prefix:
            totals[prefix] += entry["net_amount"]
    return [
        {"account": prefix, "label": PCG_UNCONVERTED[prefix]["label"],
         "amount_eur": round(amount, 2), "advice": PCG_UNCONVERTED[prefix]["advice"]}
        for prefix, amount in sorted(totals.items(), key=lambda kv: -kv[1]) if amount > 0
    ]
