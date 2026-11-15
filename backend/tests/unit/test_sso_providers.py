"""SSO : erreurs de saisie courantes avec Microsoft Entra et Google, messages explicites."""
import pytest

from app.services.oidc_service import OIDCError, check_issuer_url


@pytest.mark.parametrize("url", [
    "https://accounts.google.com",
    "https://login.microsoftonline.com/0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0/v2.0",
    "https://acme.okta.com",
])
def test_urls_valides(url):
    check_issuer_url(url)


@pytest.mark.parametrize("url", [
    "https://login.microsoftonline.com/{tenant}/v2.0",
    "https://{domain}.okta.com",
])
def test_accolades_non_remplacees(url):
    with pytest.raises(OIDCError, match="accolades"):
        check_issuer_url(url)


@pytest.mark.parametrize("seg", ["common", "organizations", "consumers"])
def test_microsoft_multi_annuaire_refuse(seg):
    with pytest.raises(OIDCError, match="annuaire"):
        check_issuer_url(f"https://login.microsoftonline.com/{seg}/v2.0")
