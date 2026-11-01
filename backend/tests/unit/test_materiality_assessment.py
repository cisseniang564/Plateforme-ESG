"""Champs d'évaluation des enjeux de matérialité : justification, horizon de temps, chaîne de valeur."""
import pytest
from pydantic import ValidationError

from app.api.v1.endpoints.materiality import (
    MaterialityIssueCreate,
    MaterialityIssueResponse,
    MaterialityIssueUpdate,
)


def _base(**extra):
    return {"name": "Émissions de GES", "category": "environmental", **extra}


def test_empty_strings_from_the_form_are_stored_as_none():
    issue = MaterialityIssueCreate(**_base(rationale="  ", time_horizon="", value_chain=""))
    assert issue.rationale is None and issue.time_horizon is None and issue.value_chain is None


def test_valid_values_are_kept_and_rationale_is_trimmed():
    issue = MaterialityIssueCreate(**_base(rationale="  Notes des parties prenantes  ", time_horizon="long", value_chain="upstream"))
    assert issue.rationale == "Notes des parties prenantes"
    assert (issue.time_horizon, issue.value_chain) == ("long", "upstream")


@pytest.mark.parametrize("field,value", [("time_horizon", "forever"), ("value_chain", "everywhere")])
def test_unknown_choices_are_rejected(field, value):
    with pytest.raises(ValidationError):
        MaterialityIssueCreate(**_base(**{field: value}))
    with pytest.raises(ValidationError):
        MaterialityIssueUpdate(**{field: value})


def test_rationale_is_capped():
    issue = MaterialityIssueUpdate(rationale="x" * 9000)
    assert len(issue.rationale) == 4000


def test_update_without_the_new_fields_leaves_them_unset():
    # exclude_unset : un déplacement de point sur la matrice ne doit pas effacer la justification
    assert "rationale" not in MaterialityIssueUpdate(name="x").dict(exclude_unset=True)


def test_response_exposes_the_new_fields():
    assert {"rationale", "time_horizon", "value_chain"} <= set(MaterialityIssueResponse.model_fields)
