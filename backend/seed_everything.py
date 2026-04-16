import asyncio
from uuid import UUID, uuid4
from datetime import date
from sqlalchemy import text
import sys

sys.path.insert(0, '/app')
from app.db.session import AsyncSessionLocal

async def seed_everything():
    """Créer TOUTES les données de démo"""
    
    async with AsyncSessionLocal() as session:
        try:
            tenant_id = UUID("00000000-0000-0000-0000-000000000001")
            
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("1️⃣ ORGANISATIONS CAC40")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            companies = [
                ("Air Liquide", "Chimie"),
                ("Airbus", "Aéronautique"),
                ("BNP Paribas", "Banque"),
                ("L'Oréal", "Cosmétiques"),
                ("LVMH", "Luxe"),
                ("Sanofi", "Pharmaceutique"),
                ("Schneider Electric", "Industrie"),
                ("Stellantis", "Automobile"),
                ("TotalEnergies", "Énergie"),
                ("Vinci", "Construction"),
            ]
            
            org_ids = []
            for name, industry in companies:
                org_id = uuid4()
                org_ids.append((org_id, name))
                await session.execute(text("""
                    INSERT INTO organizations (id, tenant_id, name, industry, type, created_at, updated_at)
                    VALUES (:id, :tenant_id, :name, :industry, 'company', NOW(), NOW())
                """), {
                    "id": str(org_id),
                    "tenant_id": str(tenant_id),
                    "name": name,
                    "industry": industry
                })
            
            print(f"✅ {len(companies)} organisations créées")
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("2️⃣ INDICATEURS ESRS")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            indicators = [
                # Environnement
                ("ENV-001", "Scope 1", "environmental", "Émissions", "tCO2e", "numeric"),
                ("ENV-002", "Scope 2", "environmental", "Émissions", "tCO2e", "numeric"),
                ("ENV-003", "Scope 3", "environmental", "Émissions", "tCO2e", "numeric"),
                ("ENV-004", "Total emissions", "environmental", "Émissions", "tCO2e", "numeric"),
                ("ENV-005", "Total energy", "environmental", "Énergie", "MWh", "numeric"),
                ("ENV-006", "Renewable energy", "environmental", "Énergie", "MWh", "numeric"),
                ("ENV-007", "Revenue", "environmental", "Économique", "M€", "numeric"),
                # Social
                ("SOC-001", "Headcount", "social", "Emploi", "personnes", "numeric"),
                ("SOC-002", "Average headcount", "social", "Emploi", "personnes", "numeric"),
                ("SOC-003", "Total headcount", "social", "Emploi", "personnes", "numeric"),
                ("SOC-004", "Women count", "social", "Diversité", "personnes", "numeric"),
                ("SOC-005", "Departures", "social", "Emploi", "personnes", "numeric"),
                ("SOC-006", "Training hours", "social", "Formation", "heures", "numeric"),
            ]
            
            indicator_map = {}
            for code, name, pillar, category, unit, dtype in indicators:
                ind_id = uuid4()
                indicator_map[name] = (ind_id, unit)
                await session.execute(text("""
                    INSERT INTO indicators (
                        id, tenant_id, code, name, pillar, category, 
                        unit, data_type, framework, framework_reference,
                        is_active, is_mandatory, created_at, updated_at
                    ) VALUES (
                        :id, :tenant_id, :code, :name, :pillar, :category,
                        :unit, :dtype, 'GRI', :code, true, true, NOW(), NOW()
                    )
                """), {
                    "id": str(ind_id),
                    "tenant_id": str(tenant_id),
                    "code": code,
                    "name": name,
                    "pillar": pillar,
                    "category": category,
                    "unit": unit,
                    "dtype": dtype
                })
            
            print(f"✅ {len(indicators)} indicateurs créés")
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("3️⃣ DONNÉES ESG 2026")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            # Données de test
            test_values = {
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
            # Seulement 3 premières organisations
            for org_id, org_name in org_ids[:3]:
                print(f"  📊 {org_name}...")
                for metric_name, value in test_values.items():
                    if metric_name in indicator_map:
                        ind_id, unit = indicator_map[metric_name]
                        await session.execute(text("""
                            INSERT INTO indicator_data (
                                id, tenant_id, organization_id, indicator_id,
                                date, value, unit, source, 
                                is_verified, is_estimated,
                                created_at, updated_at
                            ) VALUES (
                                :id, :tenant_id, :org_id, :ind_id,
                                :date, :value, :unit, 'seed_demo',
                                true, false, NOW(), NOW()
                            )
                        """), {
                            "id": str(uuid4()),
                            "tenant_id": str(tenant_id),
                            "org_id": str(org_id),
                            "ind_id": str(ind_id),
                            "date": date.today() - timedelta(days=30),
                            "value": value,
                            "unit": unit
                        })
                        count += 1
            
            await session.commit()
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("🎉 SEED COMPLET RÉUSSI !")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print(f"✅ {len(companies)} organisations")
            print(f"✅ {len(indicators)} indicateurs")
            print(f"✅ {count} données ESG")
            print("")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ ERREUR: {e}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    asyncio.run(seed_everything())
