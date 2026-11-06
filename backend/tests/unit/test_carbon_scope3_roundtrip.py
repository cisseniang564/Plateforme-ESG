"""Le Scope 3 écrit par /save-scope3 doit être relu par scope-summary."""
from pathlib import Path

from app.api.v1.endpoints.carbon import _scope3_cat_id

SRC = (Path(__file__).parents[2] / "app/api/v1/endpoints/carbon.py").read_text()


def test_format_ecrit_par_save_scope3_est_relu():
    assert _scope3_cat_id("Cat. 1 - Achats de biens & services", "Scope 3") == 1
    assert _scope3_cat_id("Cat. 15 - Investissements", "Scope 3") == 15


def test_format_import_historique():
    assert _scope3_cat_id("Scope 3 Cat.4 transport", "") == 4


def test_pas_de_faux_positif():
    assert _scope3_cat_id("Cat. 3 - Divers", "Social") is None
    assert _scope3_cat_id("Scope 1 - Émissions directes", "Scope 1") is None
    assert _scope3_cat_id("Cat. 99 - x", "Scope 3") is None


def test_plus_de_facteur_location_based_invente():
    assert "scope2_total * 1.05" not in SRC
    assert "location_based" not in SRC


def test_endpoint_scope12_present():
    assert '"/save-scope12"' in SRC
