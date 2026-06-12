#!/usr/bin/env python3
"""Create new Stripe prices for ESG Flow v2 pricing (May 2026)."""
import os, sys

try:
    import stripe
except ImportError:
    sys.exit("pip install stripe")

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
if not stripe.api_key:
    sys.exit("Set STRIPE_SECRET_KEY")

PLANS = [
    {"id": "pme",    "name": "ESG Flow — PME",    "desc": "25 utilisateurs, 50 organisations, CSRD, Bilan Carbone, FEC, Taxonomie UE.", "monthly": 24900,  "annual": 212 * 12 * 100},
    {"id": "eti",    "name": "ESG Flow — ETI",    "desc": "100 utilisateurs, 250 organisations, IA narrative, connecteurs avancés.",     "monthly": 59900,  "annual": 509 * 12 * 100},
    {"id": "groupe", "name": "ESG Flow — Groupe", "desc": "500 utilisateurs, orgs illimitées, SSO/SAML, marque blanche.",               "monthly": 119900, "annual": 1019 * 12 * 100},
]

results = {}
for p in PLANS:
    plan_id = p["id"]
    query = "metadata['esgflow_plan_id']:'" + plan_id + "'"
    existing = stripe.Product.search(query=query)

    if existing.data:
        prod_id = existing.data[0].id
        stripe.Product.modify(prod_id, description=p["desc"])
        print(f"[update] Product {prod_id} for {plan_id}")
    else:
        product = stripe.Product.create(
            name=p["name"], description=p["desc"],
            metadata={"esgflow_plan_id": plan_id},
        )
        prod_id = product.id
        print(f"[create] Product {prod_id} for {plan_id}")

    results[plan_id] = {}
    for interval, amount, label in [("month", p["monthly"], "monthly"), ("year", p["annual"], "yearly")]:
        price = stripe.Price.create(
            product=prod_id,
            unit_amount=amount,
            currency="eur",
            recurring={"interval": interval},
            metadata={"plan": plan_id, "interval": label, "version": "v2_2026"},
        )
        results[plan_id][label] = price.id
        print(f"  {label}: {price.id} ({amount/100:.0f} EUR)")

print("\n" + "=" * 60)
print("Copy these into .env.prod and .env:")
print("=" * 60)
for plan_id, prices in results.items():
    key = plan_id.upper()
    print(f"STRIPE_PRICE_{key}_MONTHLY={prices['monthly']}")
    print(f"STRIPE_PRICE_{key}_YEARLY={prices['yearly']}")
