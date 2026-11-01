"""Validation datée de la matrice : copie figée, empreinte, différences."""
from types import SimpleNamespace

from app.services import materiality_validation as mv


def issue(i, name, fin=70.0, esg=50.0, **kw):
    base = dict(id=i, name=name, category="environmental", financial_impact=fin, esg_impact=esg, is_material=fin > 60 or esg > 60,
                esrs_topic=None, iro_type=None, iro_actual_or_potential=None, time_horizon=None, value_chain=None,
                stakeholders=None, rationale=None)
    base.update(kw)
    return SimpleNamespace(**base)


def test_snapshot_is_sorted_and_accepts_orm_objects_and_dicts():
    snap = mv.snapshot_issues([issue("2", "Zèbre"), issue("1", "abeille")])
    assert [r["name"] for r in snap] == ["abeille", "Zèbre"]
    assert mv.snapshot_issues([dict(vars(issue("1", "abeille")))]) == mv.snapshot_issues([issue("1", "abeille")])


def test_hash_is_stable_and_changes_with_any_content():
    a = mv.snapshot_issues([issue("1", "A"), issue("2", "B")])
    b = mv.snapshot_issues([issue("2", "B"), issue("1", "A")])          # ordre d'entrée différent
    assert mv.snapshot_hash(a) == mv.snapshot_hash(b)
    assert len(mv.snapshot_hash(a)) == 64
    c = mv.snapshot_issues([issue("1", "A", esg=51.0), issue("2", "B")])
    assert mv.snapshot_hash(a) != mv.snapshot_hash(c)


def test_diff_detects_added_removed_and_modified_fields():
    validated = mv.snapshot_issues([issue("1", "A"), issue("2", "B"), issue("3", "C")])
    current = mv.snapshot_issues([issue("1", "A", fin=20.0, esg=10.0, rationale="Enquête"), issue("3", "C"), issue("4", "D")])
    d = mv.diff_snapshots(validated, current)
    assert d["added"] == [{"id": "4", "name": "D"}]
    assert d["removed"] == [{"id": "2", "name": "B"}]
    assert d["modified"] == [{"id": "1", "name": "A", "fields": ["financial_impact", "esg_impact", "is_material", "rationale"]}]
    assert d["total"] == 3


def test_no_change_means_up_to_date():
    snap = mv.snapshot_issues([issue("1", "A")])
    assert mv.diff_snapshots(snap, mv.snapshot_issues([issue("1", "A")]))["total"] == 0


def test_threshold_matches_the_one_used_to_flag_material_issues():
    from app.api.v1.endpoints import materiality
    import inspect
    src = inspect.getsource(materiality)
    assert "> 60" in src and mv.MATERIALITY_THRESHOLD == 60.0
