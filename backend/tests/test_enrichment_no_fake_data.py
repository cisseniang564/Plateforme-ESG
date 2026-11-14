import pathlib

import pytest

SVC = pathlib.Path(__file__).resolve().parents[1] / "app/services/esg_data_enrichment_service.py"
EP = pathlib.Path(__file__).resolve().parents[1] / "app/api/v1/endpoints/esg_enrichment.py"


def test_no_random_no_sector_tables():
    src = SVC.read_text()
    assert "import random" not in src and "random." not in src
    assert "BASE_VALUES_BY_SECTOR" not in src and "SIZE_MULTIPLIERS" not in src
    assert "collection_method='automatic'" not in src


@pytest.mark.asyncio
async def test_generation_refused():
    pytest.importorskip("tenacity")
    from app.services.esg_data_enrichment_service import ESGDataEnrichmentService

    with pytest.raises(ValueError):
        await ESGDataEnrichmentService(None).generer_donnees_data_entries()


def test_endpoint_gone_and_never_generates():
    src = EP.read_text()
    assert "status_code=410" in src
    assert "generer_donnees=False" in src
