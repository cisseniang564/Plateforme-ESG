"""Unit tests for authentication service."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta, timezone


class TestPasswordHashing:
    """Test password hashing utilities."""

    def test_password_hash_is_not_plaintext(self):
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed = pwd_context.hash("mysecretpassword")
        assert hashed != "mysecretpassword"
        assert hashed.startswith("$2b$")

    def test_password_verify_correct(self):
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        password = "Admin123!"
        hashed = pwd_context.hash(password)
        assert pwd_context.verify(password, hashed) is True

    def test_password_verify_wrong(self):
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed = pwd_context.hash("correct_password")
        assert pwd_context.verify("wrong_password", hashed) is False


class TestJWTTokens:
    """Test JWT token creation and decoding."""

    def test_create_access_token(self):
        from jose import jwt
        secret = "test-secret"
        data = {"sub": "user-123", "tenant_id": "tenant-abc"}
        expire = datetime.now(timezone.utc) + timedelta(minutes=30)
        token_data = {**data, "exp": expire}
        token = jwt.encode(token_data, secret, algorithm="HS256")
        assert isinstance(token, str)
        decoded = jwt.decode(token, secret, algorithms=["HS256"])
        assert decoded["sub"] == "user-123"
        assert decoded["tenant_id"] == "tenant-abc"

    def test_expired_token_raises(self):
        from jose import jwt, JWTError
        secret = "test-secret"
        expire = datetime.now(timezone.utc) - timedelta(minutes=1)
        token = jwt.encode({"sub": "user", "exp": expire}, secret, algorithm="HS256")
        with pytest.raises(JWTError):
            jwt.decode(token, secret, algorithms=["HS256"])
