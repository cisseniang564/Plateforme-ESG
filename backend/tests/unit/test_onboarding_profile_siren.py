"""Le SIREN vide envoyé par le formulaire ne doit pas provoquer de 422."""
import pytest
from pydantic import ValidationError

from app.api.v1.endpoints.onboarding import ProfileRequest


def test_empty_siren_is_accepted_as_none():
    assert ProfileRequest(org_name="ARCM CORP", siren="").siren is None


def test_valid_siren_kept():
    assert ProfileRequest(org_name="ARCM CORP", siren="123456789").siren == "123456789"


@pytest.mark.parametrize("bad", ["123", "12345678a", "1234567890"])
def test_invalid_siren_rejected(bad):
    with pytest.raises(ValidationError):
        ProfileRequest(org_name="ARCM CORP", siren=bad)
