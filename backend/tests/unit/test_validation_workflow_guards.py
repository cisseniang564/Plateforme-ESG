"""Workflow de validation : rôles, 4 yeux, motif de refus obligatoire, pas de promesse de conformité."""
import inspect

from app.api.v1.endpoints import validation_workflow as vw


def _src(fn):
    return inspect.getsource(fn)


def test_approbation_et_refus_reserves_aux_managers():
    assert "MANAGER_OR_ABOVE" in _src(vw.approve_entries)
    assert "MANAGER_OR_ABOVE" in _src(vw.reject_entries)


def test_soumission_reservee_a_la_saisie():
    assert "ENTRY_OR_ABOVE" in _src(vw.submit_for_review)


def test_pas_d_auto_validation():
    assert "submitted_by == current_user.id" in _src(vw.approve_entries)
    assert "vous assigner" in _src(vw.submit_for_review)


def test_motif_de_refus_obligatoire():
    assert "422" in _src(vw.reject_entries)


def test_aucune_promesse_de_conformite_dans_les_donnees():
    src = inspect.getsource(vw)
    for banned in ("ISAE 3000", "Art. 29a", "[Signature électronique]", "preuve légale"):
        assert banned not in src
    assert "SHA-256" in src


def test_les_brouillons_sont_listes_et_statistiques_coherentes():
    assert hasattr(vw, "list_drafts")
    assert 'or "draft"' in _src(vw.validation_stats)


def test_audit_enregistre_l_ip_et_scelle():
    src = _src(vw._write_audit_logs)
    assert "ip_address" in src and "seal_entry" in src


def test_full_name_est_une_propriete_pas_une_colonne():
    """full_name n'est pas sélectionnable en SQL : l'avoir dans un select() faisait planter /pending et /drafts."""
    src = inspect.getsource(vw)
    assert "User.full_name" not in src
    assert "select(User.id" not in src


# ── Validation par un seul utilisateur (paramètre du compte) ──────────────────

def test_validateur_unique_desactive_par_defaut():
    from app.services import self_approval
    assert '"allow_self_approval", False' in inspect.getsource(self_approval.setting_enabled)


def test_meme_regle_pour_les_deux_pages():
    """Workflow et Qualité des données appliquent la même règle d'auto-validation."""
    from app.api.v1.endpoints import data_validation as dv
    assert "self_approval.can_self_approve" in inspect.getsource(vw)
    assert "self_approval.setting_enabled" in inspect.getsource(dv)


def test_parametre_reserve_aux_admins_et_trace():
    src = _src(vw.update_validation_settings)
    assert "ADMIN_OR_ABOVE" in src
    assert "AuditLog" in src and "seal_entry" in src


def test_action_d_audit_tient_dans_la_colonne():
    """La colonne audit_logs.action est un VARCHAR(20)."""
    import re
    for action in re.findall(r'action="([^"]+)"', inspect.getsource(vw)):
        assert len(action) <= 20, action


def test_auto_validation_signalee():
    src = _src(vw.approve_entries)
    assert "validate_self" in src
    assert "auto-validation" in src
    assert "self_approved" in src
