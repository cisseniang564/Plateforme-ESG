import asyncio
from uuid import UUID, uuid4
from datetime import datetime, timedelta
from sqlalchemy import text
import sys

sys.path.insert(0, '/app')
from app.db.session import AsyncSessionLocal

async def seed_demo_data():
    """Créer données complètes de démo"""
    
    async with AsyncSessionLocal() as session:
        try:
            tenant_id = UUID("00000000-0000-0000-0000-000000000001")
            
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("📊 CRÉATION ORGANISATIONS CAC40")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            cac40_companies = [
                ("TotalEnergies", "Énergie", "energy"),
                ("LVMH", "Luxe", "consumer_goods"),
                ("L'Oréal", "Cosmétiques", "consumer_goods"),
                ("Sanofi", "Pharmaceutique", "healthcare"),
                ("Air Liquide", "Chimie", "materials"),
                ("BNP Paribas", "Banque", "financial_services"),
                ("Schneider Electric", "Industrie", "technology"),
                ("Airbus", "Aéronautique", "aerospace"),
                ("Stellantis", "Automobile", "automotive"),
                ("Vinci", "Construction", "construction"),
            ]
            
            org_ids = []
            for name, industry, sector in cac40_companies:
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
            
            print(f"   ✅ {len(cac40_companies)} organisations créées")
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("📏 CRÉATION INDICATEURS ESRS")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            indicators = [
                # Environnement
                ("ENV-001", "Scope 1", "environmental", "Émissions", "tCO2e", "numeric", "GRI", "305-1", True),
                ("ENV-002", "Scope 2", "environmental", "Émissions", "tCO2e", "numeric", "GRI", "305-2", True),
                ("ENV-003", "Scope 3", "environmental", "Émissions", "tCO2e", "numeric", "GRI", "305-3", True),
                ("ENV-004", "Total emissions", "environmental", "Émissions", "tCO2e", "numeric", "GRI", "305", True),
                ("ENV-005", "Consommation eau", "environmental", "Eau", "m³", "numeric", "GRI", "303-5", True),
                ("ENV-006", "Déchets recyclés", "environmental", "Déchets", "%", "percentage", "GRI", "306-4", True),
                ("ENV-007", "Total energy", "environmental", "Énergie", "MWh", "numeric", "GRI", "302-1", True),
                ("ENV-008", "Renewable energy", "environmental", "Énergie", "MWh", "numeric", "GRI", "302-1", True),
                ("ENV-009", "Revenue", "environmental", "Économique", "M€", "numeric", "GRI", "201-1", True),
                
                # Social
                ("SOC-001", "Headcount", "social", "Emploi", "personnes", "numeric", "GRI", "102-8", True),
                ("SOC-002", "Average headcount", "social", "Emploi", "personnes", "numeric", "GRI", "102-8", True),
                ("SOC-003", "Total headcount", "social", "Emploi", "personnes", "numeric", "GRI", "102-8", True),
                ("SOC-004", "Women count", "social", "Diversité", "personnes", "numeric", "GRI", "405-1", True),
                ("SOC-005", "Departures", "social", "Emploi", "personnes", "numeric", "GRI", "401-1", True),
                ("SOC-006", "Training hours", "social", "Formation", "heures", "numeric", "GRI", "404-1", True),
                ("SOC-007", "Accidents travail", "social", "Santé-Sécurité", "nombre", "numeric", "GRI", "403-9", True),
                ("SOC-008", "Taux absentéisme", "social", "Santé-Sécurité", "%", "percentage", "GRI", "403-2", True),
                
                # Gouvernance
                ("GOV-001", "Femmes CA", "governance", "Diversité", "%", "percentage", "GRI", "405-1", True),
                ("GOV-002", "Indépendants CA", "governance", "Gouvernance", "%", "percentage", "GRI", "102-22", True),
                ("GOV-003", "Formation éthique", "governance", "Éthique", "heures", "numeric", "GRI", "205-2", True),
                ("GOV-004", "Incidents corruption", "governance", "Éthique", "nombre", "numeric", "GRI", "205-3", False),
            ]
            
            indicator_ids = {}
            for code, name, pillar, category, unit, data_type, framework, ref, mandatory in indicators:
                ind_id = uuid4()
                indicator_ids[name] = ind_id
                await session.execute(text("""
                    INSERT INTO indicators (
                        id, tenant_id, code, name, pillar, category, unit, data_type,
                        framework, framework_reference, is_active, is_mandatory,
                        created_at, updated_at
                    ) VALUES (
                        :id, :tenant_id, :code, :name, :pillar, :category, :unit, :data_type,
                        :framework, :ref, true, :mandatory, NOW(), NOW()
                    )
                """), {
                    "id": str(ind_id),
                    "tenant_id": str(tenant_id),
                    "code": code,
                    "name": name,
                    "pillar": pillar,
                    "category": category,
                    "unit": unit,
                    "data_type": data_type,
                    "framework": framework,
                    "ref": ref,
                    "mandatory": mandatory
                })
            
            print(f"   ✅ {len(indicators)} indicateurs créés")
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("📈 CRÉATION DONNÉES ESG 2026")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            # Données de test pour 3 premières organisations
            test_data = [
                ("Scope 1", 1000.0),
                ("Scope 2", 500.0),
                ("Total emissions", 1500.0),
                ("Revenue", 250.0),
                ("Total energy", 3000.0),
                ("Renewable energy", 1800.0),
                ("Headcount", 250.0),
                ("Average headcount", 250.0),
                ("Total headcount", 250.0),
                ("Women count", 120.0),
                ("Departures", 25.0),
                ("Training hours", 5000.0),
            ]
            
            count = 0
            for org_id, org_name in org_ids[:3]:  # 3 premières orgas
                for metric_name, value in test_data:
                    if metric_name in indicator_ids:
                        await session.execute(text("""
                            INSERT INTO indicator_data (
                                id, tenant_id, organization_id, indicator_id,
                                period_start, period_end, value, source,
                                created_at, updated_at
                            ) VALUES (
                                :id, :tenant_id, :org_id, :ind_id,
                                '2026-01-01', '2026-12-31', :value, 'seed_demo',
                                NOW(), NOW()
                            )
                        """), {
                            "id": str(uuid4()),
                            "tenant_id": str(tenant_id),
                            "org_id": str(org_id),
                            "ind_id": str(indicator_ids[metric_name]),
                            "value": value
                        })
                        count += 1
            
            print(f"   ✅ {count} points de données créés")
            
            await session.commit()
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("🎉 SEED COMPLET TERMINÉ !")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("")
            print(f"✅ {len(cac40_companies)} organisations")
            print(f"✅ {len(indicators)} indicateurs ESRS")
            print(f"✅ {count} données ESG 2026")
            print("")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ ERREUR: {e}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    asyncio.run(seed_demo_data())
