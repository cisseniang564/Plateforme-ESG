"""
Chiffrement des secrets au repos (clés API des connecteurs, jetons OAuth).

Fernet (AES-128-CBC + HMAC) avec une clé dérivée de ENCRYPTION_KEY. Une valeur chiffrée porte le
préfixe « enc:v1: ». Une valeur sans préfixe est lue telle quelle (anciennes données non chiffrées) :
elle est rechiffrée à sa prochaine écriture, sans migration à lancer.
"""
import base64
import hashlib
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

PREFIX = "enc:v1:"


def _fernet(key_material: Optional[str] = None) -> Fernet:
    secret = (key_material or settings.ENCRYPTION_KEY).encode("utf-8")
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(secret).digest()))


def encrypt(plain: str, key_material: Optional[str] = None) -> str:
    return PREFIX + _fernet(key_material).encrypt(plain.encode("utf-8")).decode("ascii")


def is_encrypted(value: Optional[str]) -> bool:
    return isinstance(value, str) and value.startswith(PREFIX)


def decrypt(value: str, key_material: Optional[str] = None) -> str:
    """Déchiffre une valeur « enc:v1: » ; renvoie telle quelle une valeur d'ancien format non chiffrée."""
    if not is_encrypted(value):
        return value
    try:
        return _fernet(key_material).decrypt(value[len(PREFIX):].encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        # Clé de chiffrement changée ou donnée corrompue : on ne devine pas, on échoue clairement.
        raise ValueError("Secret illisible : la clé de chiffrement a changé ou la donnée est corrompue.") from exc
