"""Sécurité des connecteurs : secrets chiffrés au repos, état OAuth à usage unique, endpoint de test authentifié."""
import json
import uuid

import pytest

from app.services import oauth_state, secret_vault


class FakeRedis:
    """Faux Redis minimal (setex / get / delete)."""
    def __init__(self):
        self.data = {}

    def setex(self, key, ttl, value):
        self.data[key] = value

    def get(self, key):
        return self.data.get(key)

    def delete(self, key):
        self.data.pop(key, None)


class TestSecretVault:
    def test_roundtrip_and_ciphertext_hides_the_secret(self):
        token = secret_vault.encrypt("sk_live_ABC123")
        assert token.startswith("enc:v1:") and "sk_live_ABC123" not in token
        assert secret_vault.decrypt(token) == "sk_live_ABC123"

    def test_legacy_plaintext_values_stay_readable(self):
        assert secret_vault.decrypt('{"climatiq": {"api_key": "abc"}}') == '{"climatiq": {"api_key": "abc"}}'
        assert not secret_vault.is_encrypted("abc")

    def test_two_encryptions_differ_but_both_decrypt(self):
        a, b = secret_vault.encrypt("x"), secret_vault.encrypt("x")
        assert a != b and secret_vault.decrypt(a) == secret_vault.decrypt(b) == "x"

    def test_wrong_key_or_tampering_fails_loudly(self):
        token = secret_vault.encrypt("secret", key_material="a" * 40)
        with pytest.raises(ValueError):
            secret_vault.decrypt(token, key_material="b" * 40)
        with pytest.raises(ValueError):
            secret_vault.decrypt(token[:-4] + "AAAA", key_material="a" * 40)


class TestCredentialsAreEncryptedInRedis:
    def test_stored_blob_is_ciphertext_and_reads_back(self, monkeypatch):
        from app.services import connector_sync_service as svc
        r, tenant = FakeRedis(), uuid.uuid4()
        monkeypatch.setattr(svc, "_get_redis", lambda: r)
        svc.set_credentials(tenant, "climatiq", {"api_key": "SECRET-KEY-123"})
        stored = r.data[f"connectors:creds:{tenant}"]
        assert secret_vault.is_encrypted(stored) and "SECRET-KEY-123" not in stored
        assert svc.get_credentials(tenant, "climatiq") == {"api_key": "SECRET-KEY-123"}

    def test_legacy_plaintext_blob_is_read_then_rewritten_encrypted(self, monkeypatch):
        from app.services import connector_sync_service as svc
        r, tenant = FakeRedis(), uuid.uuid4()
        r.data[f"connectors:creds:{tenant}"] = json.dumps({"climatiq": {"api_key": "OLD"}})
        monkeypatch.setattr(svc, "_get_redis", lambda: r)
        assert svc.get_credentials(tenant, "climatiq") == {"api_key": "OLD"}
        svc.set_credentials(tenant, "carbon-interface", {"api_key": "NEW"})
        assert secret_vault.is_encrypted(r.data[f"connectors:creds:{tenant}"])
        assert svc.get_credentials(tenant, "climatiq") == {"api_key": "OLD"}

    def test_delete_keeps_the_others_and_stays_encrypted(self, monkeypatch):
        from app.services import connector_sync_service as svc
        r, tenant = FakeRedis(), uuid.uuid4()
        monkeypatch.setattr(svc, "_get_redis", lambda: r)
        svc.set_credentials(tenant, "a", {"api_key": "1"})
        svc.set_credentials(tenant, "b", {"api_key": "2"})
        svc.delete_credentials(tenant, "a")
        assert svc.get_credentials(tenant, "a") == {} and svc.get_credentials(tenant, "b") == {"api_key": "2"}
        assert secret_vault.is_encrypted(r.data[f"connectors:creds:{tenant}"])


class TestOAuthState:
    def test_state_is_random_single_use_and_returns_the_tenant(self):
        r, tenant = FakeRedis(), uuid.uuid4()
        a, b = oauth_state.issue_state(r, "enedis", tenant), oauth_state.issue_state(r, "enedis", tenant)
        assert a != b and len(a) >= 40
        assert oauth_state.consume_state(r, "enedis", a) == tenant
        assert oauth_state.consume_state(r, "enedis", a) is None          # déjà utilisé

    def test_a_state_built_from_a_victims_tenant_id_is_refused(self):
        r, victim = FakeRedis(), uuid.uuid4()
        # ancien format : « tenant_id:nonce » fabriqué par un attaquant
        assert oauth_state.consume_state(r, "enedis", f"{victim}:{'0' * 32}") is None

    def test_state_is_bound_to_the_provider_and_unknown_values_are_refused(self):
        r, tenant = FakeRedis(), uuid.uuid4()
        s = oauth_state.issue_state(r, "enedis", tenant)
        assert oauth_state.consume_state(r, "pennylane", s) is None
        assert oauth_state.consume_state(r, "enedis", None) is None
        assert oauth_state.consume_state(r, "enedis", "x" * 500) is None
        assert oauth_state.consume_state(None, "enedis", s) is None

    def test_missing_storage_fails_closed(self):
        with pytest.raises(RuntimeError):
            oauth_state.issue_state(None, "enedis", uuid.uuid4())
