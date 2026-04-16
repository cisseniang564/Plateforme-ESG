# Compatibility shim — re-exports from canonical locations
from app.utils.security import verify_password, get_password_hash  # noqa: F401
from app.utils.jwt import create_access_token  # noqa: F401
