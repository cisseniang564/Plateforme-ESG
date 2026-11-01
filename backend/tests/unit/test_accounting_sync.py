"""Connecteurs Pennylane et Qonto : aucune donnée inventée, aucune saisie du client écrasée."""
import asyncio
import uuid
from types import SimpleNamespace

import httpx
import pytest

from app.api.v1.endpoints import pennylane, qonto
from app.services import accounting_sync as acc
from app.services.accounting_sync import ConnectorFetchError


# ── Faux accès base : juste ce que write_entries utilise ───────────────────────
class FakeDB:
    def __init__(self, existing=None):
        self.existing = existing or {}        # métrique -> ligne existante
        self.added = []
        self._metric = None

    async def execute(self, stmt):
        # on retrouve la métrique demandée dans la clause WHERE compilée
        sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        row = next((r for m, r in self.existing.items() if f"'{m}'" in sql), None)
        return SimpleNamespace(scalars=lambda: SimpleNamespace(first=lambda: row))

    def add(self, obj):
        self.added.append(obj)


def run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


AGG = {"scope3_cat1_it": {"amount": 100.0, "label": "Achats IT", "pillar": "environmental", "category_code": "SCOPE3_CAT1", "count": 2}}
TENANT, USER = uuid.uuid4(), uuid.uuid4()


class TestWriteEntries:
    def test_creates_the_entry_when_nothing_exists(self):
        db = FakeDB()
        report = run(acc.write_entries(db, TENANT, USER, AGG, 2025, "api_pennylane"))
        assert report.written == 1 and report.conflicts == []
        assert db.added[0].value_numeric == 100.0 and db.added[0].data_source == "api_pennylane"

    def test_a_manual_entry_is_never_overwritten(self):
        manual = SimpleNamespace(value_numeric=999.0, data_source="manual", unit="EUR", notes=None)
        db = FakeDB({"scope3_cat1_it": manual})
        report = run(acc.write_entries(db, TENANT, USER, AGG, 2025, "api_pennylane"))
        assert report.written == 0 and report.conflicts == ["scope3_cat1_it"]
        assert manual.value_numeric == 999.0 and manual.data_source == "manual"

    def test_a_fec_import_is_not_overwritten_either(self):
        fec = SimpleNamespace(value_numeric=5.0, data_source="fec_import", unit="EUR", notes=None)
        assert run(acc.write_entries(FakeDB({"scope3_cat1_it": fec}), TENANT, USER, AGG, 2025, "api_qonto")).conflicts

    def test_its_own_previous_rows_and_old_demo_rows_are_updated(self):
        for source in ("api_pennylane", "mock_pennylane", "mock_qonto"):
            row = SimpleNamespace(value_numeric=1.0, data_source=source, unit="EUR", notes=None)
            report = run(acc.write_entries(FakeDB({"scope3_cat1_it": row}), TENANT, USER, AGG, 2025, "api_pennylane"))
            assert report.written == 1 and row.value_numeric == 100.0 and row.data_source == "api_pennylane"


class TestAggregate:
    def test_sums_by_category_ignores_unknown_and_non_positive_lines(self):
        items = [
            {"label": "AWS — hébergement cloud", "amount": 100}, {"label": "Microsoft 365 logiciel", "amount": 50},
            {"label": "Cadeaux clients", "amount": 80}, {"label": "Cloud remboursé", "amount": -20},
        ]
        out = acc.aggregate(items, pennylane.SCOPE3_RULES, lambda i: i["label"], lambda i: float(i["amount"]))
        assert out["scope3_cat1_it"]["amount"] == 150.0 and out["scope3_cat1_it"]["count"] == 2
        assert set(out) == {"scope3_cat1_it"}

    def test_no_match_gives_nothing_instead_of_default_figures(self):
        assert acc.aggregate([{"label": "xyz", "amount": 10}], pennylane.SCOPE3_RULES, lambda i: i["label"], lambda i: 10.0) == {}


# ── Appels réseau simulés : l'échec doit lever une erreur, jamais produire des chiffres ──
def patch_http(monkeypatch, handler):
    real = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: real(transport=httpx.MockTransport(handler), **kw))


@pytest.mark.parametrize("fetch,args", [
    (pennylane._fetch_pennylane_invoices, ("k", 2025)),
    (qonto._fetch_qonto_transactions, ("login", "secret", 2025)),
])
class TestFetchNeverInventsData:
    def test_refused_credentials_raise_an_auth_error(self, monkeypatch, fetch, args):
        patch_http(monkeypatch, lambda req: httpx.Response(401))
        with pytest.raises(ConnectorFetchError) as e:
            run(fetch(*args))
        assert e.value.kind == "auth"

    def test_server_error_raises_unavailable(self, monkeypatch, fetch, args):
        patch_http(monkeypatch, lambda req: httpx.Response(500))
        with pytest.raises(ConnectorFetchError) as e:
            run(fetch(*args))
        assert e.value.kind == "unavailable"

    def test_network_failure_raises_unavailable(self, monkeypatch, fetch, args):
        def boom(req):
            raise httpx.ConnectError("réseau coupé")
        patch_http(monkeypatch, boom)
        with pytest.raises(ConnectorFetchError) as e:
            run(fetch(*args))
        assert e.value.kind == "unavailable"

    def test_an_empty_account_returns_an_empty_list_not_sample_data(self, monkeypatch, fetch, args):
        patch_http(monkeypatch, lambda req: httpx.Response(200, json={"invoices": [], "transactions": []}))
        assert run(fetch(*args)) == []


def test_no_demo_data_generators_remain():
    assert not hasattr(pennylane, "_generate_mock_invoices") and not hasattr(qonto, "_generate_mock_transactions")
    assert not hasattr(pennylane, "_MOCK_AMOUNTS") and not hasattr(qonto, "_MOCK_AMOUNTS")
