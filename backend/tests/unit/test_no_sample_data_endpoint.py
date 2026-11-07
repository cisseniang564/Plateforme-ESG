from pathlib import Path

SRC = (Path(__file__).parents[2] / "app/api/v1/endpoints/esg_scoring.py").read_text()


def test_populate_sample_data_endpoint_removed():
    # Aucune route ne doit injecter de données simulées dans un tenant réel.
    assert "populate-sample-data" not in SRC
    assert "is_estimated" not in SRC or "random." not in SRC
