"""Créer/modifier un fournisseur relit l'instance par SELECT (pas refresh)."""
from pathlib import Path

SRC = (Path(__file__).parents[2] / "app/services/supply_chain_service.py").read_text()


def test_pas_de_refresh_apres_commit():
    assert "db.refresh(supplier)" not in SRC


def test_relecture_complete():
    assert "populate_existing=True" in SRC
    assert SRC.count("_reload(") >= 3  # définition + create + update
