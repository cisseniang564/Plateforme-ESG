"""
Script de test pour les emails transactionnels Resend.
Usage : python test_email.py [template] [dest@email.com]

Exemples :
  python test_email.py                        # teste welcome sur l'adresse FROM
  python test_email.py all you@email.com      # tous les templates
  python test_email.py welcome you@email.com
  python test_email.py password_reset you@email.com
"""
import sys
import os

# Charger .env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Valeurs factices pour satisfaire la validation Pydantic (non utilisées pour l'envoi d'email)
os.environ.setdefault("DATABASE_URL",        "postgresql+asyncpg://x:x@localhost/x")
os.environ.setdefault("DATABASE_PASSWORD",   "dummy-db-password")
os.environ.setdefault("JWT_SECRET_KEY",      "dummy-jwt-secret-key-32-chars-ok!")
os.environ.setdefault("ENCRYPTION_KEY",      "dummyencryptionkey1234567890abcd")
os.environ.setdefault("S3_ACCESS_KEY_ID",    "dummy-s3-access-key")
os.environ.setdefault("S3_SECRET_ACCESS_KEY","dummy-s3-secret-key")

from app.services.email_service import EmailService

TEMPLATE = sys.argv[1] if len(sys.argv) > 1 else "welcome"
TO = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("RESEND_FROM_EMAIL", "")

if not TO:
    print("❌ Précise une adresse email : python test_email.py [template] you@email.com")
    sys.exit(1)

TESTS = {
    "welcome": lambda: EmailService.send_welcome(TO, "Alice", "Demo Corp"),
    "trial_started": lambda: EmailService.send_trial_started(TO, "Alice", "Demo Corp", "06/04/2026"),
    "trial_ending": lambda: EmailService.send_trial_ending_soon(TO, "Alice", 3),
    "password_reset": lambda: EmailService.send_password_reset(TO, "Alice", "http://localhost:3000/reset-password?token=test_token"),
    "password_changed": lambda: EmailService.send_password_changed(TO, "Alice"),
    "subscription_activated": lambda: EmailService.send_subscription_activated(TO, "Alice", "Pro", "99€/mois", "23/04/2026"),
    "subscription_canceled": lambda: EmailService.send_subscription_canceled(TO, "Alice", "Pro", "23/04/2026"),
    "payment_failed": lambda: EmailService.send_payment_failed(TO, "Alice", "99€", "30/03/2026"),
    "invoice_paid": lambda: EmailService.send_invoice_paid(TO, "Alice", "99€", "https://stripe.com/invoice/test", "INV-2026-001"),
    "user_invited": lambda: EmailService.send_user_invited(TO, "Bob Martin", "Demo Corp", "http://localhost:3000/login"),
}

to_run = TESTS if TEMPLATE == "all" else {TEMPLATE: TESTS.get(TEMPLATE)}

if None in to_run.values():
    print(f"❌ Template inconnu : {TEMPLATE}")
    print(f"   Templates disponibles : {', '.join(TESTS.keys())}, all")
    sys.exit(1)

for name, fn in to_run.items():
    result = fn()
    status = "✅" if result else "❌"
    print(f"{status} {name} → {TO}")
