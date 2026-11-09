"""Garde-fous du SSO : routes publiques limitées au strict nécessaire, configuration réservée aux admins."""
import inspect

from app.api.v1.endpoints import sso
from app.middleware import auth_middleware


def test_seules_les_routes_de_connexion_sont_publiques():
    pub = [p for p in auth_middleware.PUBLIC_PATHS if "sso" in p]
    assert sorted(pub) == ["/api/v1/sso/callback", "/api/v1/sso/start"]


def test_configuration_reservee_aux_admins():
    for name in ["get_sso_config", "create_or_update_sso_config", "delete_sso_config", "test_sso_config", "get_redirect_uri"]:
        src = inspect.getsource(getattr(sso, name))
        assert "require_role(Roles.TENANT_ADMIN)" in src, name



def test_config_et_connexions_sont_tracees():
    assert "log_change" in inspect.getsource(sso.create_or_update_sso_config)
    assert "log_change" in inspect.getsource(sso.delete_sso_config)
    assert '"sso_login"' in inspect.getsource(sso.sso_callback)


def test_secret_obligatoire_pour_activer():
    assert "Le Client Secret est obligatoire" in inspect.getsource(sso.create_or_update_sso_config)
