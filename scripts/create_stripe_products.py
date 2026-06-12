#!/usr/bin/env python3
"""
Create ESG Flow Stripe products and prices (PME / ETI / Groupe).

Usage:
    STRIPE_SECRET_KEY=sk_live_... python scripts/create_stripe_products.py

After running, copy the printed price IDs into:
  - /opt/esgflow/.env  (server, backend)
  - frontend/.env.production  (frontend build)
  - Restart backend: docker compose restart esgflow-api
  - Rebuild frontend: npm run build && deploy
"""
import os
import sys

try:
    import stripe
except ImportError:
    sys.exit("stripe package not found — run: pip install stripe")

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
if not stripe.api_key or stripe.api_key.startswith("sk_test_REPLACE"):
    sys.exit("Set STRIPE_SECRET_KEY env var to your live (or test) secret key.")

PLANS = [
    {
        "id": "pme",
        "name": "ESG Flow — PME",
        "description": "PME soumises CSRD ou supply-chain. 25 utilisateurs, 50 organisations, Import FEC, Taxonomie UE.",
        "monthly_eur": 24900,   # 249 €/mois
        "annual_eur":  212 * 12 * 100,  # 2 544 €/an (212 €/mois, -15%)
    },
    {
        "id": "eti",
        "name": "ESG Flow — ETI",
        "description": "ETI en transformation ESG. 100 utilisateurs, 250 organisations, IA narrative, connecteurs avancés.",
        "monthly_eur": 59900,   # 599 €/mois
        "annual_eur":  509 * 12 * 100,  # 6 108 €/an (509 €/mois, -15%)
    },
    {
        "id": "groupe",
        "name": "ESG Flow — Groupe",
        "description": "Grands groupes & reporting consolidé. 500 utilisateurs, orgs illimitées, SSO/SAML, marque blanche.",
        "monthly_eur": 119900,  # 1 199 €/mois
        "annual_eur":  1019 * 12 * 100,  # 12 228 €/an (1 019 €/mois, -15%)
    },
]


def create_or_get_product(plan: dict) -> str:
    """Create a Stripe product (idempotent via metadata lookup)."""
    existing = stripe.Product.search(query=f"metadata['esgflow_plan_id']:'{plan['id']}'")
    if existing.data:
        prod_id = existing.data[0].id
        print(f"  [existing] product {prod_id} for {plan['id']}")
        return prod_id

    product = stripe.Product.create(
        name=plan["name"],
        description=plan["description"],
        metadata={"esgflow_plan_id": plan["id"]},
    )
    print(f"  [created]  product {product.id} for {plan['id']}")
    return product.id


def create_price(product_id: str, unit_amount: int, interval: str, plan_id: str) -> str:
    """Create a recurring price (monthly or yearly). Returns price_id."""
    existing = stripe.Price.search(
        query=f"product:'{product_id}' AND metadata['interval']:'{interval}' AND metadata['plan']:'{plan_id}'"
    )
    if existing.data:
        price_id = existing.data[0].id
        print(f"  [existing] price  {price_id}  ({interval})")
        return price_id

    recurring_interval = "month" if interval == "monthly" else "year"
    price = stripe.Price.create(
        product=product_id,
        unit_amount=unit_amount,
        currency="eur",
        recurring={"interval": recurring_interval},
        metadata={"plan": plan_id, "interval": interval},
    )
    print(f"  [created]  price  {price.id}  ({interval}  {unit_amount/100:.0f} EUR)")
    return price.id


def main():
    results = {}
    for plan in PLANS:
        print(f"\n{'='*50}")
        print(f"Plan: {plan['name']}")
        prod_id = create_or_get_product(plan)
        monthly_id = create_price(prod_id, plan["monthly_eur"], "monthly", plan["id"])
        annual_id  = create_price(prod_id, plan["annual_eur"],  "yearly",  plan["id"])
        results[plan["id"]] = {"monthly": monthly_id, "annual": annual_id}

    print("\n" + "=" * 60)
    print("SUCCESS — copy these into /opt/esgflow/.env and frontend/.env.production:")
    print("=" * 60)
    for plan_id, prices in results.items():
        key = plan_id.upper()
        print(f"\n# {plan_id.upper()}")
        print(f"STRIPE_PRICE_{key}_MONTHLY={prices['monthly']}")
        print(f"STRIPE_PRICE_{key}_YEARLY={prices['annual']}")
        print(f"VITE_STRIPE_PRICE_{key}_MONTHLY={prices['monthly']}")
        print(f"VITE_STRIPE_PRICE_{key}_ANNUAL={prices['annual']}")

    print("\nNext steps:")
    print("  1. Paste the STRIPE_PRICE_* lines into /opt/esgflow/.env on the server")
    print("  2. Paste the VITE_STRIPE_PRICE_* lines into frontend/.env.production")
    print("  3. Rebuild frontend: cd frontend && npm run build")
    print("  4. Deploy: rsync -az dist/ root@212.227.206.189:/var/www/esgflow/")
    print("  5. Restart backend: ssh root@212.227.206.189 'cd /opt/esgflow && docker compose restart esgflow-api'")


if __name__ == "__main__":
    main()
