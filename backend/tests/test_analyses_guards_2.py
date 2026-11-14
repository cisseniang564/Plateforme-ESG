"""Garde-fous « Analyses » (2) : provenance Scope 3 / BEGES."""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1] / "app"


def _read(rel):
    return (ROOT / rel).read_text()


def test_scope3_factors_not_presented_as_ademe_certified():
    src = _read("services/scope3_calculator.py")
    assert "ADEME Base Empreinte 2024" not in src
    assert "non audit" in src.lower()
    assert "FACTORS_DISCLAIMER" in _read("api/v1/endpoints/scope3.py")


def test_beges_export_makes_no_false_provenance_claims():
    svc = _read("services/beges_export_service.py")
    assert "Base Carbone ADEME v23" not in svc
    assert '"emission_factor": 1.0' not in svc
    assert "Date de soumission" not in svc
    carbon = _read("api/v1/endpoints/carbon.py")
    assert "prêt à soumettre" not in carbon
    assert 'Facteur ADEME : {e.ademe_factor}' not in carbon
