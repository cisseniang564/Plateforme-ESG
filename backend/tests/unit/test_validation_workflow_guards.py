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
