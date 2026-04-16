"""Maps Enedis electricity consumption data to ESG indicators."""
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

# French grid emission factor (kgCO2e/kWh) - RTE 2023
FRANCE_GRID_EMISSION_FACTOR = 0.0234  # kg CO2e per kWh


def parse_enedis_csv(content: str) -> List[Dict[str, Any]]:
    """
    Parse Enedis CSV export file.
    Supports two Enedis CSV formats:
    1. Standard: Date;Heures;Valeur (semicolon-separated, kWh)
    2. Monthly: Mois;Consommation (kWh)
    Returns list of {date: str (YYYY-MM-DD), kwh: float}
    """
    import csv
    import io
    from datetime import datetime

    lines = content.strip().split('\n')
    readings = []

    # Detect separator
    sep = ';' if lines[0].count(';') > lines[0].count(',') else ','

    reader = csv.DictReader(io.StringIO(content), delimiter=sep)

    for row in reader:
        # Try different column name patterns
        kwh_val = None
        date_val = None

        # kWh column
        for key in ['Valeur', 'Consommation', 'Energie soutirée (Wh)', 'valeur', 'kwh', 'kWh']:
            if key in row and row[key]:
                try:
                    val = float(row[key].replace(',', '.').replace(' ', ''))
                    # If in Wh, convert to kWh
                    if key == 'Energie soutirée (Wh)':
                        val = val / 1000
                    kwh_val = val
                    break
                except ValueError:
                    pass

        # Date column
        for key in ['Date', 'Mois', 'date', 'Horodate']:
            if key in row and row[key]:
                date_str = row[key].strip()
                # Try multiple date formats
                for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%Y-%m', '%m/%Y']:
                    try:
                        parsed = datetime.strptime(date_str, fmt)
                        date_val = parsed.strftime('%Y-%m-%d')
                        break
                    except ValueError:
                        continue
                if date_val:
                    break

        if kwh_val is not None and date_val:
            readings.append({'date': date_val, 'kwh': kwh_val})

    return readings


def compute_scope2_emissions(kwh: float) -> float:
    """Compute Scope 2 CO2e emissions from electricity consumption."""
    return round(kwh * FRANCE_GRID_EMISSION_FACTOR, 4)


def map_readings_to_esg_entries(readings: List[Dict], org_id: str = None) -> List[Dict]:
    """
    Convert kWh readings to ESG data entry format compatible with DataEntry model.
    Returns list of dicts ready for bulk insert.
    """
    from datetime import date, timedelta
    import calendar

    entries = []
    for r in readings:
        # Derive period_start / period_end from the date string (YYYY-MM-DD)
        year, month, day = int(r['date'][:4]), int(r['date'][5:7]), int(r['date'][8:10])
        period_start = date(year, month, day)
        # period_end = last day of that month
        last_day = calendar.monthrange(year, month)[1]
        period_end = date(year, month, last_day)

        # Energy consumption entry
        entries.append({
            'pillar': 'environmental',
            'category': 'Energie',
            'metric_name': 'Consommation électrique',
            'value_numeric': r['kwh'],
            'unit': 'kWh',
            'period_start': period_start,
            'period_end': period_end,
            'period_type': 'monthly',
            'data_source': 'Enedis',
            'collection_method': 'file_import',
            'notes': f"Import automatique Enedis - {r['date']}",
        })

        # Scope 2 emissions entry
        co2 = compute_scope2_emissions(r['kwh'])
        entries.append({
            'pillar': 'environmental',
            'category': 'Emissions GES',
            'metric_name': 'Emissions Scope 2 (électricité)',
            'value_numeric': co2,
            'unit': 'kgCO2e',
            'period_start': period_start,
            'period_end': period_end,
            'period_type': 'monthly',
            'data_source': 'Enedis (calculé)',
            'collection_method': 'calculated',
            'calculation_method': f"Consommation électrique × facteur RTE {FRANCE_GRID_EMISSION_FACTOR} kgCO2e/kWh",
            'notes': f"Calculé depuis conso. électrique - facteur RTE {FRANCE_GRID_EMISSION_FACTOR} kgCO2e/kWh",
        })

    return entries
