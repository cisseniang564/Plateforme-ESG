"""Vue exploitant : accès strictement limité aux emails de PLATFORM_ADMIN_EMAILS."""
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints import platform_admin as pa
from app.config import settings

pytestmark = pytest.mark.unit


def _user(email):
    return SimpleNamespace(email=email)


def test_aucun_email_configure_personne_n_a_acces(monkeypatch):
    monkeypatch.setattr(settings, "PLATFORM_ADMIN_EMAILS", "")
    assert pa._allowed_emails() == set()


def test_liste_d_emails_insensible_a_la_casse_et_aux_espaces(monkeypatch):
    monkeypatch.setattr(settings, "PLATFORM_ADMIN_EMAILS", " Boss@Example.com , autre@example.com ,")
    assert pa._allowed_emails() == {"boss@example.com", "autre@example.com"}


@pytest.mark.asyncio
async def test_un_utilisateur_non_autorise_recoit_403(monkeypatch):
    monkeypatch.setattr(settings, "PLATFORM_ADMIN_EMAILS", "boss@example.com")
    with pytest.raises(HTTPException) as e:
        await pa.require_platform_admin(_user("client@example.com"))
    assert e.value.status_code == 403


@pytest.mark.asyncio
async def test_un_exploitant_autorise_passe(monkeypatch):
    monkeypatch.setattr(settings, "PLATFORM_ADMIN_EMAILS", "boss@example.com")
    u = _user("BOSS@example.com")
    assert await pa.require_platform_admin(u) is u
    assert (await pa.platform_me(u)) == {"is_platform_admin": True}
    assert (await pa.platform_me(_user("x@y.z"))) == {"is_platform_admin": False}
