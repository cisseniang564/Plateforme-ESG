"""Les exports CSV/Excel ne doivent pas laisser un champ libre devenir une formule."""
from pathlib import Path

import pytest

from app.utils.spreadsheet_safe import safe_cell

ROOT = Path(__file__).parents[2] / "app"


@pytest.mark.parametrize("raw", ["=HYPERLINK(\"http://x\",\"a\")", "+cmd|' /C calc'!A0", "-2+3", "@SUM(A1)", "\t=1+1", "\r=1"])
def test_chaines_a_risque_sont_neutralisees(raw):
    assert safe_cell(raw) == "'" + raw


@pytest.mark.parametrize("raw", ["Émissions Scope 1", "", "12 tCO2e", "a=b", None, 0, -5.5, 3.2])
def test_valeurs_normales_inchangees(raw):
    assert safe_cell(raw) == raw


def test_export_donnees_utilise_safe_cell():
    src = (ROOT / "api/v1/endpoints/data_entry.py").read_text()
    export = src[src.index("async def export_data_entries"):]
    assert "safe_cell(v)" in export
    assert export.index("safe_cell(v)") < export.index("csv.DictWriter")


def test_export_questionnaire_utilise_safe_cell():
    src = (ROOT / "services/questionnaire_service.py").read_text()
    assert 'safe_cell(q["text"])' in src
