"""Régression : l'inscription (/auth/onboard) échouait en production quand la RLS est active.

`SET LOCAL row_security = off` (sans droit BYPASSRLS) reste actif jusqu'à la fin de la transaction et fait
échouer l'INSERT suivant dans `tenants` : « query would be affected by row-level security policy ».
La route n'a pas de client identifié : get_db fournit déjà une session système (bypass RLS).
"""
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

SRC = Path(__file__).resolve().parents[2] / "app" / "services" / "auth_service.py"


def test_onboard_n_utilise_pas_row_security_off():
    code = "\n".join(l for l in SRC.read_text(encoding="utf-8").splitlines() if not l.lstrip().startswith("#"))
    assert "SET LOCAL row_security" not in code
    assert "begin_nested" not in code.split("async def onboard_tenant")[1].split("async def ")[0]
