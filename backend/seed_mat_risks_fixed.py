import asyncio
from uuid import UUID, uuid4
from datetime import date
from sqlalchemy import text
import sys

sys.path.insert(0, '/app')
from app.db.session import AsyncSessionLocal

async def seed_final():
    async with AsyncSessionLocal() as session:
        try:
            tenant_id = UUID("00000000-0000-0000-0000-000000000001")
            
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("1️⃣ MATÉRIALITÉ")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            mat_data = [
                ("Émissions GES", "Réduction empreinte carbone", "environmental", 4.5, 4.8, True, "high"),
                ("Eau", "Gestion ressources hydriques", "environmental", 3.5, 4.0, True, "medium"),
                ("Déchets", "Économie circulaire", "environmental", 3.8, 4.2, True, "high"),
                ("Diversité", "Équité et représentation", "social", 4.2, 4.5, True, "high"),
                ("Santé Sécurité", "Protection employés", "social", 4.8, 4.9, True, "critical"),
                ("Formation", "Développement compétences", "social", 3.5, 3.8, True, "medium"),
                ("Éthique", "Lutte anti-corruption", "governance", 4.5, 4.7, True, "high"),
                ("Transparence", "Reporting", "governance", 4.0, 4.3, True, "high"),
            ]
            
            mat_ids = []
            for name, desc, cat, fin, esg, is_mat, priority in mat_data:
                mat_id = uuid4()
                mat_ids.append((mat_id, name))
                await session.execute(text("""
                    INSERT INTO materiality_issues (
                        id, tenant_id, name, description, category,
                        financial_impact, esg_impact, is_material, priority,
                        created_at, updated_at
                    ) VALUES (
                        :id, :tid, :name, :desc, :cat,
                        :fin, :esg, :mat, :prio, NOW(), NOW()
                    )
                """), {
                    "id": str(mat_id), "tid": str(tenant_id),
                    "name": name, "desc": desc, "cat": cat,
                    "fin": fin, "esg": esg, "mat": is_mat, "prio": priority
                })
            
            print(f"✅ {len(mat_data)} enjeux créés")
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("2️⃣ RISQUES")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            risks = [
                ("Risque climatique", "Impact changement climatique", "environmental", 4, 5, "identified"),
                ("Pénurie eau", "Disponibilité ressources", "environmental", 3, 4, "identified"),
                ("Turnover élevé", "Rétention talents", "social", 3, 3, "monitoring"),
                ("Accidents travail", "Sécurité employés", "social", 4, 5, "mitigated"),
                ("Non-conformité CSRD", "Risque réglementaire", "governance", 5, 5, "identified"),
            ]
            
            for idx, (title, desc, cat, prob, impact, status) in enumerate(risks):
                score = prob * impact
                sev = "critical" if score >= 20 else "high" if score >= 12 else "medium"
                mat_id = mat_ids[idx % len(mat_ids)][0]
                
                await session.execute(text("""
                    INSERT INTO esg_risks (
                        id, tenant_id, materiality_issue_id, title, description,
                        category, probability, impact, risk_score, status, severity,
                        created_at, updated_at
                    ) VALUES (
                        :id, :tid, :mid, :title, :desc,
                        :cat, :prob, :imp, :score, :stat, :sev,
                        NOW(), NOW()
                    )
                """), {
                    "id": str(uuid4()), "tid": str(tenant_id), "mid": str(mat_id),
                    "title": title, "desc": desc, "cat": cat,
                    "prob": prob, "imp": impact, "score": score,
                    "stat": status, "sev": sev
                })
            
            print(f"✅ {len(risks)} risques créés")
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("3️⃣ SCORES ESG (structure correcte)")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            # Récupérer 3 organisations
            result = await session.execute(text("SELECT id FROM organizations LIMIT 3"))
            orgs = [r[0] for r in result.fetchall()]
            
            for org_id in orgs:
                await session.execute(text("""
                    INSERT INTO esg_scores (
                        id, tenant_id, organization_id, calculation_date,
                        environmental_score, social_score, governance_score,
                        overall_score, rating, calculation_method,
                        data_completeness, confidence_level,
                        created_at, updated_at
                    ) VALUES (
                        :id, :tid, :oid, :date,
                        :env, :soc, :gov, :overall, :rating, 'weighted_average',
                        :complete, 'high', NOW(), NOW()
                    )
                """), {
                    "id": str(uuid4()), "tid": str(tenant_id),
                    "oid": str(org_id), "date": date(2026, 12, 31),
                    "env": 75.5, "soc": 82.3, "gov": 88.7,
                    "overall": 82.2, "rating": "B+", "complete": 95.0
                })
            
            print(f"✅ {len(orgs)} scores créés")
            
            await session.commit()
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("🎉 SEED COMPLET RÉUSSI !")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(seed_final())
