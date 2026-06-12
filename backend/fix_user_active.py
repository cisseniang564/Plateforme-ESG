"""
Script pour diagnostiquer et corriger un compte bloqué (is_active=False).
Usage: python fix_user_active.py admin@greenconnect.cloud
"""
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config import settings

email = sys.argv[1] if len(sys.argv) > 1 else "admin@greenconnect.cloud"

database_url = str(settings.DATABASE_URL).replace("+asyncpg", "")
engine = create_engine(database_url)
Session = sessionmaker(bind=engine)
db = Session()

try:
    # ── Diagnostiquer l'état actuel ──────────────────────────────────────────
    result = db.execute(text("""
        SELECT u.id, u.email, u.is_active as user_active,
               t.id as tenant_id, t.name as tenant_name, t.is_active as tenant_active, t.plan_tier
        FROM users u
        JOIN tenants t ON t.id = u.tenant_id
        WHERE u.email = :email
    """), {"email": email}).fetchone()

    if not result:
        print(f"❌  Utilisateur '{email}' introuvable en base de données.")
        print("    Vérifiez l'email ou créez le compte avec create_admin.py")
        sys.exit(1)

    print(f"\n── Diagnostic pour {email} ──────────────────────────")
    print(f"  User is_active    : {result.user_active}  {'✅' if result.user_active else '❌ PROBLÈME'}")
    print(f"  Tenant            : {result.tenant_name}")
    print(f"  Tenant is_active  : {result.tenant_active}  {'✅' if result.tenant_active else '❌ PROBLÈME'}")
    print(f"  Plan tier         : {result.plan_tier}")

    needs_fix = not result.user_active or not result.tenant_active

    if not needs_fix:
        print("\n✅  Le compte est actif. La 403 vient peut-être d'un mauvais mot de passe.")
        print("   → Retournez sur /login et essayez 'Mot de passe oublié ?'")
        sys.exit(0)

    # ── Corriger ─────────────────────────────────────────────────────────────
    print("\n🔧  Réactivation en cours...")

    if not result.user_active:
        db.execute(text("UPDATE users SET is_active = true WHERE email = :email"), {"email": email})
        print(f"  ✅  Utilisateur réactivé")

    if not result.tenant_active:
        db.execute(text("UPDATE tenants SET is_active = true WHERE id = :tid"), {"tid": result.tenant_id})
        print(f"  ✅  Tenant '{result.tenant_name}' réactivé")

    db.commit()
    print(f"\n✅  Compte restauré. Vous pouvez maintenant vous connecter avec {email}.")

except Exception as e:
    db.rollback()
    print(f"❌  Erreur: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
