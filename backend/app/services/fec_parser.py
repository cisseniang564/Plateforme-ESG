"""
FEC (Fichier des Écritures Comptables) parser.
Handles French accounting exports from Sage 100, Cegid, EBP, Quadratus.
Official format: 18 columns, pipe-separated (|), YYYYMMDD dates.
"""
import csv
import io
from datetime import datetime
from typing import List, Dict, Any


# Mandatory FEC columns (some may be optional in practice)
FEC_COLUMNS = [
    "JournalCode", "JournalLib", "EcritureNum", "EcritureDate",
    "CompteNum", "CompteLib", "CompAuxNum", "CompAuxLib",
    "PieceRef", "PieceDate", "EcritureLib", "Debit", "Credit",
    "EcritureLet", "DateLet", "ValidDate", "Montantdevise", "Idevise"
]


def _normalize_decimal(val: str) -> float:
    """Handle French decimal separator (comma) and spaces."""
    if not val or val.strip() == '':
        return 0.0
    cleaned = val.strip().replace(' ', '').replace('\xa0', '').replace(',', '.')
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _parse_date(date_str: str) -> str:
    """Parse YYYYMMDD to YYYY-MM-DD."""
    date_str = date_str.strip()
    if len(date_str) == 8 and date_str.isdigit():
        return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
    # Try other formats
    for fmt in ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y']:
        try:
            return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
        except ValueError:
            pass
    return date_str


def parse_fec(content: bytes, filename: str = '') -> List[Dict[str, Any]]:
    """
    Parse a FEC file and return normalized entries.
    Returns list of dicts with: compte_num, compte_lib, journal_code,
    date (YYYY-MM-DD), debit, credit, net_amount, libelle
    """
    # Detect encoding
    text = None
    for encoding in ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']:
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        text = content.decode('latin-1', errors='replace')

    # Detect separator: FEC spec says '|' but Cegid sometimes uses ';' or '\t'
    first_line = text.split('\n')[0]
    sep = '|'
    for candidate in ['|', ';', '\t']:
        if first_line.count(candidate) >= 10:
            sep = candidate
            break

    rows = []
    reader = csv.DictReader(io.StringIO(text), delimiter=sep)

    # Normalize header keys (strip whitespace, accents)
    for row in reader:
        normalized = {k.strip(): v for k, v in row.items()}

        compte_num = normalized.get('CompteNum', '').strip()
        if not compte_num:
            continue

        debit = _normalize_decimal(normalized.get('Debit', '0'))
        credit = _normalize_decimal(normalized.get('Credit', '0'))
        net_amount = debit - credit  # positive = expense

        if net_amount <= 0:  # Skip credits and zero entries
            continue

        date_str = normalized.get('EcritureDate', '').strip()

        rows.append({
            'compte_num': compte_num,
            'compte_lib': normalized.get('CompteLib', '').strip(),
            'journal_code': normalized.get('JournalCode', '').strip(),
            'date': _parse_date(date_str) if date_str else '',
            'debit': debit,
            'credit': credit,
            'net_amount': net_amount,
            'libelle': normalized.get('EcritureLib', '').strip(),
        })

    return rows
