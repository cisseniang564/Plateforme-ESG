"""
Maps French PCG (Plan Comptable Général) account numbers to ESG emission categories.
PCG structure:
  6xx = Charges d'exploitation
  60x = Achats (marchandises, matières premières)
  606 = Achats non stockés (énergie, eau, carburant)
  61x = Services extérieurs (entretien, assurances, loyers)
  62x = Autres services extérieurs (transport, publicité, déplacements)
  63x = Impôts et taxes
  64x = Charges de personnel
  65x = Autres charges
  67x = Charges exceptionnelles
"""
from typing import List, Dict, Any, Optional
from collections import defaultdict


# PCG account prefix → ESG mapping
# Format: prefix → {category, pillar, metric_name, unit, ef_per_euro (kgCO2e/€), note}
PCG_EMISSION_MAP: Dict[str, Dict] = {
    # Energy and fuel purchases (compte 606)
    "6061": {"category": "Énergie", "pillar": "environmental", "metric_name": "Achats électricité", "unit": "kgCO2e", "ef_per_euro": 0.00023, "note": "RTE 2023"},
    "6062": {"category": "Énergie", "pillar": "environmental", "metric_name": "Achats combustibles (gaz)", "unit": "kgCO2e", "ef_per_euro": 0.00180, "note": "ADEME 2023"},
    "6063": {"category": "Énergie", "pillar": "environmental", "metric_name": "Achats carburants", "unit": "kgCO2e", "ef_per_euro": 0.00250, "note": "GHG Protocol"},
    "606":  {"category": "Énergie", "pillar": "environmental", "metric_name": "Achats énergie & carburant", "unit": "kgCO2e", "ef_per_euro": 0.00200, "note": "ADEME générique"},

    # Raw materials and goods (compte 601, 602, 607)
    "601":  {"category": "Matières premières", "pillar": "environmental", "metric_name": "Achats matières premières", "unit": "kgCO2e", "ef_per_euro": 0.00150, "note": "Base Carbone ADEME"},
    "602":  {"category": "Matières premières", "pillar": "environmental", "metric_name": "Achats autres approvisionnements", "unit": "kgCO2e", "ef_per_euro": 0.00120, "note": "Base Carbone ADEME"},
    "607":  {"category": "Achats marchandises", "pillar": "environmental", "metric_name": "Achats marchandises", "unit": "kgCO2e", "ef_per_euro": 0.00130, "note": "Base Carbone ADEME"},

    # Transport services (compte 6241, 6244, 625)
    "6241": {"category": "Transport", "pillar": "environmental", "metric_name": "Transport de marchandises", "unit": "kgCO2e", "ef_per_euro": 0.00220, "note": "ADEME transport routier"},
    "6244": {"category": "Transport", "pillar": "environmental", "metric_name": "Déplacements professionnels (avion)", "unit": "kgCO2e", "ef_per_euro": 0.00450, "note": "ADEME aviation"},
    "625":  {"category": "Déplacements", "pillar": "environmental", "metric_name": "Déplacements & réceptions", "unit": "kgCO2e", "ef_per_euro": 0.00180, "note": "ADEME moyen"},

    # Building/facilities (compte 613, 614, 615)
    "613":  {"category": "Immobilier", "pillar": "environmental", "metric_name": "Loyers & charges locatives", "unit": "kgCO2e", "ef_per_euro": 0.00080, "note": "ADEME bâtiments"},
    "615":  {"category": "Entretien", "pillar": "environmental", "metric_name": "Entretien & réparations", "unit": "kgCO2e", "ef_per_euro": 0.00090, "note": "ADEME maintenance"},

    # Staff (compte 641, 645) → social indicators
    "641":  {"category": "Emploi", "pillar": "social", "metric_name": "Charges salariales", "unit": "k€", "ef_per_euro": None, "note": "indicateur social"},
    "645":  {"category": "Protection sociale", "pillar": "social", "metric_name": "Charges sociales patronales", "unit": "k€", "ef_per_euro": None, "note": "indicateur social"},

    # Default for unmatched 6xx accounts
    "6":    {"category": "Charges d'exploitation", "pillar": "environmental", "metric_name": "Autres achats & charges", "unit": "kgCO2e", "ef_per_euro": 0.00100, "note": "ADEME générique Scope 3"},
}


def _find_mapping(compte_num: str) -> Optional[Dict]:
    """Find the most specific PCG mapping for an account number."""
    # Try progressively shorter prefixes (most specific first)
    for length in [4, 3, 2, 1]:
        prefix = compte_num[:length]
        if prefix in PCG_EMISSION_MAP:
            return PCG_EMISSION_MAP[prefix]
    return None


def aggregate_by_category(entries: List[Dict]) -> List[Dict]:
    """
    Group FEC entries by ESG category and compute totals.
    Returns list of aggregated entries ready for ESG DataEntry creation.
    """
    groups: Dict[str, Any] = defaultdict(lambda: {
        'total_amount': 0.0,
        'total_co2e': 0.0,
        'entry_count': 0,
        'mapping': None,
        'dates': [],
    })

    for entry in entries:
        mapping = _find_mapping(entry['compte_num'])
        if not mapping:
            continue

        key = mapping['metric_name']
        groups[key]['total_amount'] += entry['net_amount']
        groups[key]['entry_count'] += 1
        groups[key]['mapping'] = mapping
        if entry['date']:
            groups[key]['dates'].append(entry['date'])

        # Compute CO2e only for environmental indicators with emission factor
        if mapping.get('ef_per_euro') and mapping['pillar'] == 'environmental':
            groups[key]['total_co2e'] += entry['net_amount'] * mapping['ef_per_euro']

    results = []
    for metric_name, group in groups.items():
        mapping = group['mapping']
        if not mapping:
            continue

        # Determine period from dates
        dates = sorted(group['dates'])
        period = dates[0][:7] if dates else ''  # YYYY-MM

        if mapping['pillar'] == 'environmental' and mapping.get('ef_per_euro'):
            value = round(group['total_co2e'], 2)
            unit = 'kgCO2e'
        else:
            value = round(group['total_amount'] / 1000, 2)  # Convert to k€
            unit = 'k€'

        results.append({
            'pillar': mapping['pillar'],
            'category': mapping['category'],
            'metric_name': metric_name,
            'value': value,
            'unit': unit,
            'period': period,
            'total_amount_eur': round(group['total_amount'], 2),
            'entry_count': group['entry_count'],
            'note': mapping.get('note', ''),
        })

    return results
