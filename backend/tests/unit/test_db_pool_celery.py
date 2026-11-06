"""Le worker Celery ne doit pas partager de pool asyncpg entre boucles asyncio."""
import subprocess
import sys


def _pool_class(argv0: str) -> str:
    code = (
        "import sys, os; sys.argv[0] = %r; os.environ['APP_ENV'] = 'development';"
        "from app.db.session import engine; print(type(engine.sync_engine.pool).__name__)" % argv0
    )
    out = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, timeout=60)
    return out.stdout.strip().splitlines()[-1] if out.stdout.strip() else out.stderr[-500:]


def test_celery_worker_uses_nullpool():
    assert _pool_class("/usr/local/bin/celery") == "NullPool"


def test_api_keeps_a_real_pool():
    assert _pool_class("uvicorn") != "NullPool"
