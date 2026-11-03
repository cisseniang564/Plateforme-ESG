"""Limite générale de requêtes : 300/min en production, relevable uniquement par configuration."""
from app.config import Settings
from app.middleware import rate_limit_middleware as rl


def test_la_valeur_par_defaut_reste_celle_de_la_production():
    # Garde-fou : relever ce défaut affaiblirait la protection pour tous les clients.
    assert Settings.model_fields["RATE_LIMIT_FREE_PER_MIN"].default == 300
    assert rl.PLAN_LIMITS["free"] == 300


def test_palier_gratuit_et_palier_inconnu_lisent_la_configuration(monkeypatch):
    monkeypatch.setattr(rl._settings(), "RATE_LIMIT_FREE_PER_MIN", 3000)
    assert rl.limit_for_plan("free") == 3000
    assert rl.limit_for_plan("palier-inconnu") == 3000


def test_les_paliers_payants_ne_changent_pas(monkeypatch):
    monkeypatch.setattr(rl._settings(), "RATE_LIMIT_FREE_PER_MIN", 3000)
    assert rl.limit_for_plan("pme") == 600
    assert rl.limit_for_plan("eti") == 2000
    assert rl.limit_for_plan("groupe") == 5000
    assert rl.limit_for_plan("enterprise") == -1


def test_sans_configuration_le_palier_gratuit_est_a_300():
    assert rl.limit_for_plan("free") == 300
