import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from app.models.audit_log import AuditLog
from app.services.audit_chain_service import compute_entry_hash, verify_chain


class _Res:
    def __init__(self, rows): self._rows = rows
    def scalars(self): return self
    def all(self): return self._rows


class _DB:
    def __init__(self, rows): self.rows = rows
    async def execute(self, stmt):
        rows = list(self.rows)
        # `limit` : la requête réelle renvoie les N plus récentes (ordre décroissant)
        if getattr(stmt, "_limit_clause", None) is not None:
            n = stmt._limit_clause.value
            rows = list(reversed(rows))[:n]
        return _Res(rows)


def _chain(n, sealed_from=0):
    tid = uuid.uuid4()
    t0 = datetime(2026, 1, 1, tzinfo=timezone.utc)
    out, prev = [], None
    for i in range(n):
        e = AuditLog(
            id=uuid.uuid4(), tenant_id=tid, entity_type="x", entity_id=uuid.uuid4(),
            action="update", new_values={"i": i}, created_at=t0 + timedelta(minutes=i),
        )
        if i >= sealed_from:
            e.previous_hash = prev
            e.entry_hash = compute_entry_hash(e, prev)
            prev = e.entry_hash
        out.append(e)
    return tid, out


def run(db, tid, **kw):
    return asyncio.run(verify_chain(db, tid, **kw))


def test_chaine_intacte():
    tid, rows = _chain(5)
    r = run(_DB(rows), tid)
    assert r["is_valid"] and r["checked"] == 5 and r["invalid"] == 0


def test_modification_detectee():
    tid, rows = _chain(5)
    rows[2].new_values = {"i": 999}
    r = run(_DB(rows), tid)
    assert not r["is_valid"] and r["first_broken_id"] == str(rows[2].id)


def test_fenetre_partielle_pas_de_faux_positif():
    tid, rows = _chain(8)
    r = run(_DB(rows), tid, limit=3)
    assert r["is_valid"] and r["checked"] == 3 and r["partial"]


def test_entrees_non_scellees_comptees_a_part():
    tid, rows = _chain(6, sealed_from=2)
    r = run(_DB(rows), tid)
    assert r["unsealed"] == 2 and r["checked"] == 4 and r["is_valid"]
