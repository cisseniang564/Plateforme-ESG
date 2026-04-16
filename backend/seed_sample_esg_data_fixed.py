import asyncio
from uuid import uuid4
from datetime import date
from sqlalchemy import text
import random
import sys

sys.path.insert(0, '/app')
from app.db.session import AsyncSessionLocal

async def seed_sample_data():
    """Créer des données ESG pour les 10 premières organisations"""
    
    async with AsyncSessionLocal() as session:
        try:
            tenant_id = "00000000-0000-0000-0000-000000000001"
            
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("1️⃣ RÉCUPÉRATION ORGANISATIONS & INDICATEURS")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            # Récupérer 10 premières organisations
            orgs_query = text("""
                SELECT id, name FROM organizations 
                WHERE tenant_id = :tid
                ORDER BY name 
                LIMIT 10
            """)
            result = await session.execute(orgs_query, {"tid": tenant_id})
            organizations = [(r[0], r[1]) for r in result.fetchall()]  # ✅ Pas de conversion UUID
            
            print(f"✅ {len(organizations)} organisations")
            
            # Récupérer indicateurs clés
            indicators_query = text("""
                SELECT id, code, name, unit, pillar FROM indicators
                WHERE tenant_id = :tid
                    AND code IN (
                        'E-GHG-001', 'E-GHG-002', 'E-GHG-013', 'E-GHG-014',
                        'E-ENE-001', 'E-ENE-005', 'E-ENE-006',
                        'E-WAT-001', 'E-WAT-004',
                        'E-WAS-001', 'E-WAS-008',
                        'S-EMP-001', 'S-EMP-009', 'S-EMP-010',
                        'S-DIV-001', 'S-DIV-002', 'S-DIV-006',
                        'S-FOR-001', 'S-FOR-002',
                        'S-SAN-001', 'S-SAN-006',
                        'S-REM-002', 'S-REM-005',
                        'G-GOV-001', 'G-GOV-003',
                        'G-ETH-001', 'G-ETH-004',
                        'G-SUP-001', 'G-SUP-002'
                    )
                ORDER BY code
            """)
            
            result = await session.execute(indicators_query, {"tid": tenant_id})
            indicators = [(r[0], r[1], r[2], r[3], r[4]) for r in result.fetchall()]
            
            print(f"✅ {len(indicators)} indicateurs clés")
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("2️⃣ GÉNÉRATION DONNÉES RÉALISTES")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            # Générateur de valeurs réalistes
            def get_realistic_value(code):
                """Générer valeur réaliste selon l'indicateur"""
                
                values = {
                    'E-GHG-001': lambda: random.uniform(800, 2000),
                    'E-GHG-002': lambda: random.uniform(400, 1000),
                    'E-GHG-013': lambda: random.uniform(1500, 3500),
                    'E-GHG-014': lambda: random.uniform(3, 15),
                    'E-ENE-001': lambda: random.uniform(2000, 5000),
                    'E-ENE-005': lambda: random.uniform(500, 2000),
                    'E-ENE-006': lambda: random.uniform(20, 80),
                    'E-WAT-001': lambda: random.uniform(10000, 50000),
                    'E-WAT-004': lambda: random.uniform(10, 60),
                    'E-WAS-001': lambda: random.uniform(500, 2000),
                    'E-WAS-008': lambda: random.uniform(30, 90),
                    'S-EMP-001': lambda: random.uniform(200, 1000),
                    'S-EMP-009': lambda: random.uniform(10, 50),
                    'S-EMP-010': lambda: random.uniform(5, 20),
                    'S-DIV-001': lambda: random.uniform(100, 500),
                    'S-DIV-002': lambda: random.uniform(35, 55),
                    'S-DIV-006': lambda: random.uniform(25, 50),
                    'S-FOR-001': lambda: random.uniform(2000, 10000),
                    'S-FOR-002': lambda: random.uniform(15, 40),
                    'S-SAN-001': lambda: random.uniform(2, 15),
                    'S-SAN-006': lambda: random.uniform(2, 8),
                    'S-REM-002': lambda: random.uniform(35, 80),
                    'S-REM-005': lambda: random.uniform(50, 200),
                    'G-GOV-001': lambda: random.uniform(8, 15),
                    'G-GOV-003': lambda: random.uniform(30, 70),
                    'G-ETH-001': lambda: 1,
                    'G-ETH-004': lambda: random.uniform(0, 5),
                    'G-SUP-001': lambda: random.uniform(100, 500),
                    'G-SUP-002': lambda: random.uniform(40, 90),
                }
                
                return values.get(code, lambda: random.uniform(10, 100))()
            
            # Insérer les données
            count = 0
            calc_date = date.today() - timedelta(days=30)
            
            for org_id, org_name in organizations:
                print(f"  📊 {org_name}...")
                
                for ind_id, code, name, unit, pillar in indicators:
                    value = get_realistic_value(code)
                    
                    await session.execute(text("""
                        INSERT INTO indicator_data (
                            id, tenant_id, organization_id, indicator_id,
                            date, value, unit, source,
                            is_verified, is_estimated,
                            created_at, updated_at
                        ) VALUES (
                            :id, :tid, :oid, :iid,
                            :date, :value, :unit, 'seed_demo',
                            true, false, NOW(), NOW()
                        )
                    """), {
                        "id": str(uuid4()),
                        "tid": tenant_id,
                        "oid": str(org_id),
                        "iid": str(ind_id),
                        "date": calc_date,
                        "value": value,
                        "unit": unit
                    })
                    count += 1
            
            await session.commit()
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("🎉 SEED RÉUSSI !")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print(f"✅ {len(organizations)} organisations")
            print(f"✅ {len(indicators)} indicateurs par organisation")
            print(f"✅ {count} données ESG créées")
            print("")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ ERREUR: {e}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    asyncio.run(seed_sample_data())
