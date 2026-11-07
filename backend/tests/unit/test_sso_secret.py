"""Le secret client SSO est chiffré (Fernet), et les anciennes valeurs base64 restent lisibles."""
import base64

from app.api.v1.endpoints.sso import _decrypt_secret, _encrypt_secret


def test_secret_chiffre_et_relu():
    enc = _encrypt_secret("s3cr3t-client")
    assert enc.startswith("enc:v1:")
    assert "s3cr3t-client" not in enc
    assert _decrypt_secret(enc) == "s3cr3t-client"


def test_ancien_format_base64_reste_lisible():
    legacy = base64.b64encode(b"ancien-secret").decode()
    assert _decrypt_secret(legacy) == "ancien-secret"
