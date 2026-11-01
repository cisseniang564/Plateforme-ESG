"""Les routes de connecteurs dédiées ne doivent pas être masquées par la route générique /{connector_id}/sync."""
import pytest
from starlette.routing import Match

from app.main import app


def first_match(method: str, path: str):
    scope = {"type": "http", "method": method, "path": path, "root_path": "", "query_string": b"", "headers": []}
    for route in app.routes:
        match, _ = route.matches(scope)
        if match == Match.FULL:
            return route
    return None


@pytest.mark.parametrize("path,endpoint", [
    ("/api/v1/connectors/pennylane/sync", "pennylane_sync"),
    ("/api/v1/connectors/qonto/sync", "qonto_sync"),
    ("/api/v1/connectors/sage-cegid/sync", "sync_fec_to_entries"),
    ("/api/v1/connectors/enedis/sync", "enedis_sync"),
])
def test_dedicated_sync_routes_win_over_the_generic_one(path, endpoint):
    route = first_match("POST", path)
    assert route is not None and route.endpoint.__name__ == endpoint, (
        f"{path} est servi par {route.endpoint.__name__ if route else None} au lieu de {endpoint}"
    )


def test_generic_sync_still_serves_the_other_connectors():
    assert first_match("POST", "/api/v1/connectors/schneider/sync").endpoint.__name__ == "trigger_connector_sync"
    assert first_match("POST", "/api/v1/connectors/workday/sync").endpoint.__name__ == "trigger_connector_sync"


def test_sync_log_is_not_captured_by_a_connector_id_route():
    assert first_match("GET", "/api/v1/connectors/sync-log").endpoint.__name__ == "get_sync_log"
