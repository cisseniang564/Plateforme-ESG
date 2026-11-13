"""Contact, leads et désabonnement : routes montées, jeton signé, échappement HTML."""
import pathlib

import pytest

from app.api.v1.endpoints import lead_magnets as lm
from app.api.v1.endpoints import unsubscribe as unsub
from app.middleware import auth_middleware
from app.services import unsubscribe_token as ut

ROOT = pathlib.Path(__file__).resolve().parents[2] / "app"


def test_routes_montees_dans_main():
    src = (ROOT / "main.py").read_text()
    assert "_lead_magnets.router" in src and "_unsubscribe.router" in src


def test_routes_publiques():
    for p in ("/api/v1/contact", "/api/v1/leads/newsletter", "/api/v1/leads/checklist-csrd", "/api/v1/unsubscribe"):
        assert p in auth_middleware.PUBLIC_PATHS


def test_jeton_valide_et_propre_a_l_adresse():
    t = ut.make_token("A@b.fr")
    assert ut.verify_token("a@b.fr", t)
    assert not ut.verify_token("autre@b.fr", t)
    assert not ut.verify_token("a@b.fr", None)
    assert not ut.verify_token("a@b.fr", "x" * 32)


def test_lien_contient_le_jeton():
    url = ut.unsubscribe_url("a@b.fr", "https://x.test")
    assert url.startswith("https://x.test/api/v1/unsubscribe?email=a%40b.fr&token=")


def test_page_de_desabonnement_echappe_l_adresse():
    page = unsub._confirmation_page('<script>alert(1)</script>@x.fr', True)
    assert "<script>alert(1)</script>" not in page and "&lt;script&gt;" in page


def test_email_de_contact_echappe_le_message():
    body = lm.ContactRequest(first_name="A", last_name="B", email="a@b.fr", company="<b>X</b>",
                             subject="Devis", message="<img src=x onerror=alert(1)>")
    html = lm._contact_email_html(body)
    assert "<img" not in html and "&lt;img" in html and "<b>X</b>" not in html


@pytest.mark.parametrize("over", [{"message": "ok"}, {"email": "pas-un-mail"}, {"first_name": ""}])
def test_contact_invalide_refuse(over):
    data = dict(first_name="A", last_name="B", email="a@b.fr", company="X", subject="S", message="Bonjour !!")
    data.update(over)
    with pytest.raises(Exception):
        lm.ContactRequest(**data)


def test_checklist_annoncee_correspond_au_contenu():
    n = len(lm.ESRS_CHECKLIST)
    assert f"{n} indicateurs" in (ROOT / "api/v1/endpoints/lead_magnets.py").read_text()
    assert "47 indicateurs" not in (ROOT / "api/v1/endpoints/lead_magnets.py").read_text()
