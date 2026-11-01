"""Rapports planifiés : règles d'échéance et exécuteur (sans Redis ni base)."""
import json
from datetime import datetime

import pytest

from app.services.report_schedule import due_schedules, is_due, mark_run, next_run_after


def sch(**kw):
    base = {"id": "s1", "title": "Mensuel", "report_type": "executive", "frequency": "monthly",
            "status": "active", "next_run": "2026-11-01T08:00:00", "recipients": ["a@example.com"]}
    base.update(kw)
    return base


NOW = datetime(2026, 11, 1, 9, 0)


def test_due_only_when_active_and_next_run_reached():
    assert is_due(sch(), NOW)
    assert not is_due(sch(next_run="2026-11-02T08:00:00"), NOW)
    assert not is_due(sch(status="paused"), NOW)


def test_schedule_after_end_date_is_not_due():
    assert not is_due(sch(end_date="2026-10-31"), NOW)
    assert is_due(sch(end_date="2026-11-01"), NOW)


@pytest.mark.parametrize("freq,expected", [
    ("daily", "2026-11-02T08:00:00"), ("weekly", "2026-11-08T08:00:00"),
    ("monthly", "2026-12-01T08:00:00"), ("quarterly", "2027-02-01T08:00:00"),
])
def test_next_run_follows_frequency(freq, expected):
    assert next_run_after(sch(frequency=freq), datetime(2026, 11, 1, 8, 0)).isoformat() == expected


def test_monthly_clamps_to_end_of_shorter_month():
    assert next_run_after(sch(), datetime(2026, 1, 31, 8, 0)).isoformat() == "2026-02-28T08:00:00"


def test_mark_run_does_not_replay_missed_runs():
    # Serveur arrêté pendant 3 semaines : une seule génération, puis la prochaine échéance future.
    late = sch(frequency="weekly", next_run="2026-10-10T08:00:00")
    out = mark_run(late, NOW, ok=True)
    assert datetime.fromisoformat(out["next_run"]) > NOW
    assert out["last_status"] == "ok" and out["status"] == "active"


def test_mark_run_records_failure_and_completes_after_end_date():
    out = mark_run(sch(end_date="2026-11-15"), NOW, ok=False, detail="boom")
    assert out["last_status"] == "error" and out["last_detail"] == "boom"
    assert out["status"] == "completed"  # prochaine échéance (décembre) après la date de fin


def test_due_schedules_filters_list():
    items = [sch(id="a"), sch(id="b", next_run="2027-01-01T08:00:00"), sch(id="c", status="paused")]
    assert [s["id"] for s in due_schedules(items, NOW)] == ["a"]


def test_dispatcher_sends_mail_updates_calendar_and_isolates_failures(monkeypatch):
    from app.tasks import report_schedule_tasks as t

    store = {
        "reports:scheduled:11111111-1111-1111-1111-111111111111": json.dumps([
            sch(id="ok", recipients=["a@example.com", "b@example.com"]),
            sch(id="boom", report_type="boom"),
            sch(id="later", next_run="2027-05-01T08:00:00"),
        ])
    }

    class FakeRedis:
        def scan_iter(self, match=None):
            return iter(list(store))
        def get(self, k):
            return store[k]
        def setex(self, k, ttl, v):
            store[k] = v

    sent = []

    async def fake_generate(tenant_id, schedule):
        if schedule["report_type"] == "boom":
            raise RuntimeError("génération impossible")
        return "TOKEN123"

    class FakeEmail:
        @staticmethod
        def send_scheduled_report(to, title, link, days):
            sent.append((to, link))
            return True

    monkeypatch.setattr(t, "_redis", lambda: FakeRedis())
    monkeypatch.setattr(t, "_generate_and_archive", fake_generate)
    import app.services.email_service as es
    monkeypatch.setattr(es, "EmailService", FakeEmail)
    monkeypatch.setattr(t, "datetime", type("D", (), {"utcnow": staticmethod(lambda: NOW),
                                                      "now": staticmethod(lambda tz=None: NOW)}))

    summary = t.dispatch_scheduled_reports.run()
    assert summary == {"checked": 3, "sent": 1, "failed": 1}
    assert [to for to, _ in sent] == ["a@example.com", "b@example.com"]
    assert all(link.endswith("/api/v1/reports/shared/TOKEN123") for _, link in sent)

    saved = {s["id"]: s for s in json.loads(next(iter(store.values())))}
    assert saved["ok"]["last_status"] == "ok" and saved["ok"]["next_run"].startswith("2026-12-01")
    assert saved["boom"]["last_status"] == "error"
    assert "last_run" not in saved["later"]  # non échu : intact
