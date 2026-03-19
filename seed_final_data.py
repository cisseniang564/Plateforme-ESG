import asyncio
from uuid import UUID, uuid4
from datetime import date
from sqlalchemy import text
import sys

sys.path.insert(0, '/app')
from app.db.session import AsyncSessionLocal

async def seed_final_data():
    """Créer données de démo avec structure correcte"""
    
    async with AsyncSessionLocal() as session:
        try:
            tenant_id = UUID("00000000-0000-0000-0000-000000000001")
            
            # Récupérer organisations
            result = await session.execute(text("""
                SELECT id, name FROM organizations ORDER BY name LIMIT 3
            """))
            orgs = result.fetchall()
            
            # Récupérer indicateurs
            result = await session.execute(text("""
                SELECT id, name, unit FROM indicators 
                WHERE name IN ('Scope 1', 'Scope 2', 'Total emissions', 'Revenue', 
                               'Total energy', 'Renewable energy', 'Headcount', 
                               'Average headcount', 'Total headcount', 'Women count', 
                               'Departures', 'Training hours')
            """))
            indicators = {row[1]: (row[0], row[2]) for row in result.fetchall()}
            
            print(f"✅ {len(orgs)} organisations")
            print(f"✅ {len(indicators)} indicateurs")
            print("")
            
            # Données de test pour 2026
            test_data = {
                "Scope 1": 1000.0,
                "Scope 2": 500.0,
                "Total emissions": 1500.0,
                "Revenue": 250.0,
                "Total energy": 3000.0,
                "Renewable energy": 1800.0,
                "Headcount": 250.0,
                "Average headcount": 250.0,
                "Total headcount": 250.0,
                "Women count": 120.0,
                "Departures": 25.0,
                "Training hours": 5000.0,
            }
            
            count = 0
            for org_id, org_name in orgs:
                print(f"📊 {org_name}...")
                for metric_name, value in test_data.items():
                    if metric_name in indicators:
                        ind_id, unit = indicators[metric_name]
                        await session.execute(text("""
                            INSERT INTO indicator_data (
                                id, tenant_id, organization_id, indicator_id,
                                date, value, unit, source, is_verified, is_estimated,
                                created_at, updated_at
                            ) VALUES (
                                :id, :tenant_id, :org_id, :ind_id,
                                :date, :value, :unit, 'seed_demo', true, false,
                                NOW(), NOW()
                            )
                        """), {
                            "id": str(uuid4()),
                            "tenant_id": str(tenant_id),
                            "org_id": str(org_id),
                            "ind_id": str(ind_id),
                            "date": date(2026, 12, 31),
                            "value": value,
                            "unit": unit
                        })
                        count += 1
                print(f"   ✅ {len([k for k in test_data.keys() if k in indicators])} métriques")
            
            await session.commit()
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("🎉 SEED COMPLET RÉUSSI !")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print(f"✅ {count} données ESG créées")
            print("")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ ERREUR: {e}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    asyncio.run(seed_final_data())
