import asyncio
from uuid import UUID, uuid4
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
            tenant_id = UUID("00000000-0000-0000-0000-000000000001")
            
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
            result = await session.execute(orgs_query, {"tid": str(tenant_id)})
            organizations = [(UUID(r[0]), r[1]) for r in result.fetchall()]
            
            print(f"✅ {len(organizations)} organisations")
            
            # Récupérer indicateurs clés (30 indicateurs importants)
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
            
            result = await session.execute(indicators_query, {"tid": str(tenant_id)})
            indicators = [
                (UUID(r[0]), r[1], r[2], r[3], r[4]) 
                for r in result.fetchall()
            ]
            
            print(f"✅ {len(indicators)} indicateurs clés")
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("2️⃣ GÉNÉRATION DONNÉES RÉALISTES")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            # Générateurs de données réalistes par code
            def get_realistic_value(code, pillar):
                """Générer valeur réaliste selon l'indicateur"""
                
                # Émissions (tCO2e)
                if code.startswith('E-GHG'):
                    if code == 'E-GHG-001': return random.uniform(800, 2000)    # Scope 1
                    if code == 'E-GHG-002': return random.uniform(400, 1000)    # Scope 2
                    if code == 'E-GHG-013': return random.uniform(1500, 3500)   # Total
                    if code == 'E-GHG-014': return random.uniform(3, 15)        # Intensité
                
                # Énergie
                if code.startswith('E-ENE'):
                    if code == 'E-ENE-001': return random.uniform(2000, 5000)   # Total MWh
                    if code == 'E-ENE-005': return random.uniform(500, 2000)    # Renouvelable
                    if code == 'E-ENE-006': return random.uniform(20, 80)       # % renouvelable
                
                # Eau
                if code.startswith('E-WAT'):
                    if code == 'E-WAT-001': return random.uniform(10000, 50000) # m³
                    if code == 'E-WAT-004': return random.uniform(10, 60)       # % recyclée
                
                # Déchets
                if code.startsWith('E-WAS'):
                    if code == 'E-WAS-001': return random.uniform(500, 2000)    # tonnes
                    if code == 'E-WAS-008': return random.uniform(30, 90)       # % recyclage
                
                # Emploi
                if code.startswith('S-EMP'):
                    if code == 'S-EMP-001': return random.uniform(200, 1000)    # Effectif
                    if code == 'S-EMP-009': return random.uniform(10, 50)       # Départs
                    if code == 'S-EMP-010': return random.uniform(5, 20)        # % turnover
                
                # Diversité
                if code.startswith('S-DIV'):
                    if code == 'S-DIV-001': return random.uniform(100, 500)     # Femmes
                    if code == 'S-DIV-002': return random.uniform(35, 55)       # % femmes
                    if code == 'S-DIV-006': return random.uniform(25, 50)       # % femmes CA
                
                # Formation
                if code.startswith('S-FOR'):
                    if code == 'S-FOR-001': return random.uniform(2000, 10000)  # heures
                    if code == 'S-FOR-002': return random.uniform(15, 40)       # h/employé
                
                # Santé
                if code.startswith('S-SAN'):
                    if code == 'S-SAN-001': return random.uniform(2, 15)        # accidents
                    if code == 'S-SAN-006': return random.uniform(2, 8)         # % absent
                
                # Rémunération
                if code.startswith('S-REM'):
                    if code == 'S-REM-002': return random.uniform(35, 80)       # k€ moyen
                    if code == 'S-REM-005': return random.uniform(50, 200)      # ratio CEO
                
                # Gouvernance
                if code.startswith('G-GOV'):
                    if code == 'G-GOV-001': return random.uniform(8, 15)        # nb admin
                    if code == 'G-GOV-003': return random.uniform(30, 70)       # % indép
                
                # Éthique
                if code.startswith('G-ETH'):
                    if code == 'G-ETH-001': return 1                            # booléen
                    if code == 'G-ETH-004': return random.uniform(0, 5)         # incidents
                
                # Supply chain
                if code.startswith('G-SUP'):
                    if code == 'G-SUP-001': return random.uniform(100, 500)     # nb fourn
                    if code == 'G-SUP-002': return random.uniform(40, 90)       # % évalués
                
                # Par défaut
                return random.uniform(10, 100)
            
            # Insérer les données
            count = 0
            calc_date = date(2026, 12, 31)
            
            for org_id, org_name in organizations:
                print(f"  📊 {org_name}...")
                
                for ind_id, code, name, unit, pillar in indicators:
                    value = get_realistic_value(code, pillar)
                    
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
                        "tid": str(tenant_id),
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
