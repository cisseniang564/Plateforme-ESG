"""Le plan de décarbonation est stocké en PostgreSQL (plus seulement Redis)."""
import asyncio
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints import carbon

SRC = (Path(__file__).parents[2] / "app/api/v1/endpoints/carbon.py").read_text()
SESSION_SRC = (Path(__file__).parents[2] / "app/db/session.py").read_text()
USER = SimpleNamespace(tenant_id=uuid4())


def _db_returning(row):
    db = MagicMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = row
    db.execute = AsyncMock(return_value=result)
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    return db


def test_plus_d_ecriture_redis_pour_le_plan():
    save = SRC[SRC.index("async def save_decarb_plan"):SRC.index("beges-export.xlsx")]
    assert "r.set(" not in save and "_get_redis" not in save
    assert "_PLAN_FRAMEWORK" in SRC


def test_index_unique_un_plan_par_tenant():
    assert "uq_framework_assessments_decarb_plan" in SESSION_SRC


def test_get_renvoie_le_plan_en_base():
    plan = {"actions": [{"id": "a1"}]}
    db = _db_returning(SimpleNamespace(data=plan))
    assert asyncio.run(carbon.get_decarb_plan(current_user=USER, db=db)) == plan


def test_get_sans_plan_ni_redis_renvoie_liste_vide():
    db = _db_returning(None)
    with patch.object(carbon, "_get_redis", return_value=None):
        assert asyncio.run(carbon.get_decarb_plan(current_user=USER, db=db)) == {"actions": []}


def test_get_reprend_l_ancien_plan_redis_et_le_copie_en_base():
    db = _db_returning(None)
    redis = MagicMock()
    redis.get.return_value = '{"actions": [{"id": "old"}]}'
    with patch.object(carbon, "_get_redis", return_value=redis):
        out = asyncio.run(carbon.get_decarb_plan(current_user=USER, db=db))
    assert out == {"actions": [{"id": "old"}]}
    db.commit.assert_awaited()


def test_get_erreur_base_renvoie_503_et_non_un_plan_vide():
    db = MagicMock()
    db.execute = AsyncMock(side_effect=RuntimeError("db down"))
    with pytest.raises(HTTPException) as e:
        asyncio.run(carbon.get_decarb_plan(current_user=USER, db=db))
    assert e.value.status_code == 503


def test_post_enregistre_et_commit():
    db = _db_returning(None)
    out = asyncio.run(carbon.save_decarb_plan(payload={"actions": []}, current_user=USER, db=db))
    assert out == {"saved": True}
    db.commit.assert_awaited()


def test_post_echec_base_renvoie_saved_false():
    db = MagicMock()
    db.execute = AsyncMock(side_effect=RuntimeError("db down"))
    db.rollback = AsyncMock()
    out = asyncio.run(carbon.save_decarb_plan(payload={"actions": []}, current_user=USER, db=db))
    assert out == {"saved": False}


def test_post_trop_volumineux_refuse():
    db = _db_returning(None)
    with pytest.raises(HTTPException) as e:
        asyncio.run(carbon.save_decarb_plan(payload={"x": "a" * 600_000}, current_user=USER, db=db))
    assert e.value.status_code == 413
