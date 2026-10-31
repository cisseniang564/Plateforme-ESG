"""Chaque modèle doit être importé dans app.models : sinon create_all ne crée pas sa table (bug réel : notifications)."""
import re
from pathlib import Path

import app.models  # noqa: F401
from app.db.base import Base

MODELS_DIR = Path(app.models.__file__).parent


def test_every_declared_table_is_registered():
    declared = set()
    for f in MODELS_DIR.glob("*.py"):
        declared |= set(re.findall(r'__tablename__\s*=\s*["\']([a-z_0-9]+)["\']', f.read_text(encoding="utf-8")))
    missing = sorted(declared - set(Base.metadata.tables))
    assert missing == [], f"Tables déclarées mais non enregistrées (ajouter l'import dans app/models/__init__.py) : {missing}"
