"""Service OpenID Connect : état chiffré, PKCE, domaines, vérification du jeton d'identité."""
import base64
import hashlib
import json
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.services import oidc_service as o

ISSUER = "https://idp.example.com"
CLIENT = "client-123"


@pytest.fixture(scope="module")
def keypair():
    priv = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(priv.public_key()))
    jwk.update(kid="k1", alg="RS256", use="sig")
    return priv, {"keys": [jwk]}


def _token(priv, **over):
    claims = {"iss": ISSUER, "aud": CLIENT, "sub": "u1", "nonce": "n1",
              "exp": int(time.time()) + 300, "email": "Alice@Acme.fr", "email_verified": True}
    claims.update(over)
    return jwt.encode(claims, priv, algorithm="RS256", headers={"kid": "k1"})


def test_pkce_challenge_est_le_sha256_du_verifier():
    p = o.new_pkce()
    expected = base64.urlsafe_b64encode(hashlib.sha256(p["verifier"].encode()).digest()).rstrip(b"=").decode()
    assert p["challenge"] == expected


def test_etat_aller_retour_et_expiration():
    s = o.pack_state({"t": "tenant", "n": "x"}, now=1000)
    assert o.unpack_state(s, now=1100)["t"] == "tenant"
    with pytest.raises(o.OIDCError):
        o.unpack_state(s, now=1000 + o.STATE_TTL_SECONDS + 1)


def test_etat_falsifie_refuse():
    with pytest.raises(o.OIDCError):
        o.unpack_state("n-importe-quoi")


def test_domaines():
    assert o.email_domain("a@Acme.FR") == "acme.fr"
    assert o.email_allowed("a@acme.fr", "acme.fr, autre.com")
    assert not o.email_allowed("a@evil.com", "acme.fr")
    assert not o.email_allowed("a@acme.fr", None)
    assert not o.email_allowed("a@acme.fr", "")


@pytest.mark.parametrize("url", ["http://idp.example.com", "https://127.0.0.1", "https://localhost", "ftp://x.com", ""])
def test_url_non_publique_refusee(url):
    with pytest.raises(o.OIDCError):
        o.assert_public_https(url)


def test_jeton_valide(keypair):
    priv, jwks = keypair
    claims = o.verify_id_token(_token(priv), jwks, issuer=ISSUER, client_id=CLIENT, nonce="n1")
    assert o.extract_email(claims) == "alice@acme.fr"


@pytest.mark.parametrize("over,kw", [
    ({"aud": "autre"}, {}),
    ({"iss": "https://evil.example.com"}, {}),
    ({"exp": int(time.time()) - 10}, {}),
    ({"nonce": "autre"}, {}),
])
def test_jeton_invalide_refuse(keypair, over, kw):
    priv, jwks = keypair
    with pytest.raises(o.OIDCError):
        o.verify_id_token(_token(priv, **over), jwks, issuer=ISSUER, client_id=CLIENT, nonce="n1")


def test_signature_d_une_autre_cle_refusee(keypair):
    _, jwks = keypair
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    with pytest.raises(o.OIDCError):
        o.verify_id_token(_token(other), jwks, issuer=ISSUER, client_id=CLIENT, nonce="n1")


def test_algorithme_none_ou_hs256_refuse(keypair):
    _, jwks = keypair
    forged = jwt.encode({"iss": ISSUER, "aud": CLIENT, "sub": "u", "nonce": "n1",
                         "exp": int(time.time()) + 60}, "secret-secret-secret-secret-1234", algorithm="HS256",
                        headers={"kid": "k1"})
    with pytest.raises(o.OIDCError):
        o.verify_id_token(forged, jwks, issuer=ISSUER, client_id=CLIENT, nonce="n1")


def test_email_non_verifie_ou_absent_refuse():
    with pytest.raises(o.OIDCError):
        o.extract_email({"email": "a@b.fr", "email_verified": False})
    with pytest.raises(o.OIDCError):
        o.extract_email({})


def test_url_d_autorisation_contient_pkce_et_nonce():
    doc = {"authorization_endpoint": "https://idp.example.com/auth"}
    url = o.build_authorization_url(doc, client_id=CLIENT, redirect_uri="https://app.example.com/cb",
                                    scopes="openid email", state="S", nonce="N", challenge="C")
    for frag in ["code_challenge=C", "code_challenge_method=S256", "nonce=N", "state=S", "response_type=code"]:
        assert frag in url
