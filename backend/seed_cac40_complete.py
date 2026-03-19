import asyncio
from uuid import UUID, uuid4
from datetime import date
from sqlalchemy import text
import sys

sys.path.insert(0, '/app')
from app.db.session import AsyncSessionLocal

async def seed_cac40():
    async with AsyncSessionLocal() as session:
        try:
            tenant_id = UUID("00000000-0000-0000-0000-000000000001")
            
            # Supprimer organisations existantes
            await session.execute(text("DELETE FROM indicator_data"))
            await session.execute(text("DELETE FROM esg_scores"))
            await session.execute(text("DELETE FROM organizations"))
            
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("🏢 40 ENTREPRISES CAC40")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            cac40 = [
                ("Air Liquide", "Chimie", "materials"),
                ("Airbus", "Aéronautique", "aerospace"),
                ("ArcelorMittal", "Sidérurgie", "materials"),
                ("AXA", "Assurance", "financial_services"),
                ("BNP Paribas", "Banque", "financial_services"),
                ("Bouygues", "Construction", "construction"),
                ("Capgemini", "Services IT", "technology"),
                ("Carrefour", "Distribution", "retail"),
                ("Crédit Agricole", "Banque", "financial_services"),
                ("Danone", "Agroalimentaire", "consumer_goods"),
                ("Dassault Systèmes", "Logiciels", "technology"),
                ("Engie", "Énergie", "energy"),
                ("EssilorLuxottica", "Optique", "healthcare"),
                ("Hermès", "Luxe", "consumer_goods"),
                ("Kering", "Luxe", "consumer_goods"),
                ("Legrand", "Électricité", "industrials"),
                ("L'Oréal", "Cosmétiques", "consumer_goods"),
                ("LVMH", "Luxe", "consumer_goods"),
                ("Michelin", "Pneumatiques", "automotive"),
                ("Orange", "Télécoms", "telecommunications"),
                ("Pernod Ricard", "Vins & Spiritueux", "consumer_goods"),
                ("Publicis Groupe", "Publicité", "media"),
                ("Renault", "Automobile", "automotive"),
                ("Safran", "Aéronautique", "aerospace"),
                ("Saint-Gobain", "Matériaux", "materials"),
                ("Sanofi", "Pharmaceutique", "healthcare"),
                ("Schneider Electric", "Électricité", "industrials"),
                ("Société Générale", "Banque", "financial_services"),
                ("Stellantis", "Automobile", "automotive"),
                ("STMicroelectronics", "Semi-conducteurs", "technology"),
                ("Téléperformance", "Services", "services"),
                ("Thales", "Défense", "aerospace"),
                ("TotalEnergies", "Énergie", "energy"),
                ("Unibail-Rodamco", "Immobilier", "real_estate"),
                ("Veolia", "Services", "utilities"),
                ("Vinci", "Construction", "construction"),
                ("Vivendi", "Médias", "media"),
                ("Worldline", "Paiements", "technology"),
                ("Accor", "Hôtellerie", "services"),
                ("Alstom", "Transport", "industrials"),
            ]
            
            org_ids = []
            for name, industry, sector in cac40:
                org_id = uuid4()
                org_ids.append((org_id, name))
                await session.execute(text("""
                    INSERT INTO organizations (
                        id, tenant_id, name, industry, type,
                        created_at, updated_at
                    ) VALUES (
                        :id, :tid, :name, :industry, 'company',
                        NOW(), NOW()
                    )
                """), {
                    "id": str(org_id),
                    "tid": str(tenant_id),
                    "name": name,
                    "industry": industry
                })
            
            print(f"✅ {len(cac40)} organisations créées")
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("📊 DONNÉES ESG (5 premières organisations)")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            # Récupérer indicateurs
            result = await session.execute(text("""
                SELECT id, name, unit FROM indicators 
                WHERE name IN (
                    'Scope 1', 'Scope 2', 'Total emissions', 'Revenue',
                    'Total energy', 'Renewable energy', 'Headcount',
                    'Average headcount', 'Total headcount', 'Women count',
                    'Departures', 'Training hours'
                )
            """))
            indicators = {row[1]: (row[0], row[2]) for row in result.fetchall()}
            
            # Données pour les 5 premières
            test_data = {
                "Scope 1": 1200.0,
                "Scope 2": 600.0,
                "Total emissions": 1800.0,
                "Revenue": 300.0,
                "Total energy": 3500.0,
                "Renewable energy": 2100.0,
                "Headcount": 300.0,
                "Average headcount": 300.0,
                "Total headcount": 300.0,
                "Women count": 140.0,
                "Departures": 30.0,
                "Training hours": 6000.0,
            }
            
            count = 0
            for org_id, org_name in org_ids[:5]:
                print(f"  📊 {org_name}...")
                for metric_name, value in test_data.items():
                    if metric_name in indicators:
                        ind_id, unit = indicators[metric_name]
                        await session.execute(text("""
                            INSERT INTO indicator_data (
                                id, tenant_id, organization_id, indicator_id,
                                date, value, unit, source,
                                is_verified, is_estimated,
                                created_at, updated_at
                            ) VALUES (
                                :id, :tid, :oid, :iid,
                                :date, :value, :unit, 'seed_cac40',
                                true, false, NOW(), NOW()
                            )
                        """), {
                            "id": str(uuid4()),
                            "tid": str(tenant_id),
                            "oid": str(org_id),
                            "iid": str(ind_id),
                            "date": date(2026, 12, 31),
                            "value": value,
                            "unit": unit
                        })
                        count += 1
            
            print(f"✅ {count} données ESG créées")
            
            await session.commit()
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("🎉 SEED CAC40 COMPLET !")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print(f"✅ {len(cac40)} organisations CAC40")
            print(f"✅ {count} données ESG (5 premières)")
            print("")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ ERREUR: {e}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    asyncio.run(seed_cac40())
