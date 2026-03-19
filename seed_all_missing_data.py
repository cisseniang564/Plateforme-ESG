import asyncio
from uuid import UUID, uuid4
from datetime import date, datetime
from sqlalchemy import text
import sys

sys.path.insert(0, '/app')
from app.db.session import AsyncSessionLocal

async def seed_all_missing():
    """Créer toutes les données manquantes"""
    
    async with AsyncSessionLocal() as session:
        try:
            tenant_id = UUID("00000000-0000-0000-0000-000000000001")
            
            # Récupérer organisations
            result = await session.execute(text("""
                SELECT id, name FROM organizations ORDER BY name
            """))
            orgs = result.fetchall()
            
            print(f"✅ {len(orgs)} organisations trouvées")
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("1️⃣ ENJEUX DE MATÉRIALITÉ")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            materiality_issues = [
                ("Émissions GES", "Réduction empreinte carbone", "environmental", 4.5, 4.8, True, "high"),
                ("Consommation d'eau", "Gestion ressources hydriques", "environmental", 3.5, 4.0, True, "medium"),
                ("Déchets", "Économie circulaire", "environmental", 3.8, 4.2, True, "high"),
                ("Diversité & Inclusion", "Équité et représentation", "social", 4.2, 4.5, True, "high"),
                ("Santé & Sécurité", "Protection des employés", "social", 4.8, 4.9, True, "critical"),
                ("Formation", "Développement des compétences", "social", 3.5, 3.8, True, "medium"),
                ("Éthique & Conformité", "Lutte anti-corruption", "governance", 4.5, 4.7, True, "high"),
                ("Transparence", "Reporting et communication", "governance", 4.0, 4.3, True, "high"),
            ]
            
            mat_count = 0
            mat_ids = []
            for name, desc, cat, fin, esg, is_mat, priority in materiality_issues:
                mat_id = uuid4()
                mat_ids.append((mat_id, name))
                await session.execute(text("""
                    INSERT INTO materiality_issues (
                        id, tenant_id, name, description, category,
                        financial_impact, esg_impact, is_material, priority,
                        created_at, updated_at
                    ) VALUES (
                        :id, :tenant_id, :name, :desc, :cat,
                        :fin, :esg, :is_mat, :priority,
                        NOW(), NOW()
                    )
                """), {
                    "id": str(mat_id),
                    "tenant_id": str(tenant_id),
                    "name": name,
                    "desc": desc,
                    "cat": cat,
                    "fin": fin,
                    "esg": esg,
                    "is_mat": is_mat,
                    "priority": priority
                })
                mat_count += 1
            
            print(f"✅ {mat_count} enjeux de matérialité créés")
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("2️⃣ RISQUES ESG")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            risks = [
                ("Risque climatique", "Impact changement climatique", "environmental", 4, 5, "identified"),
                ("Pénurie d'eau", "Disponibilité ressources", "environmental", 3, 4, "identified"),
                ("Turnover élevé", "Rétention des talents", "social", 3, 3, "monitoring"),
                ("Accidents du travail", "Sécurité des employés", "social", 4, 5, "mitigated"),
                ("Non-conformité CSRD", "Risque réglementaire", "governance", 5, 5, "identified"),
            ]
            
            risk_count = 0
            for title, desc, cat, prob, impact, status in risks:
                risk_score = prob * impact
                severity = "critical" if risk_score >= 20 else "high" if risk_score >= 12 else "medium"
                
                # Associer à un enjeu de matérialité aléatoire
                mat_id = mat_ids[risk_count % len(mat_ids)][0]
                
                await session.execute(text("""
                    INSERT INTO esg_risks (
                        id, tenant_id, materiality_issue_id, title, description,
                        category, probability, impact, risk_score, status, severity,
                        created_at, updated_at
                    ) VALUES (
                        :id, :tenant_id, :mat_id, :title, :desc,
                        :cat, :prob, :impact, :score, :status, :severity,
                        NOW(), NOW()
                    )
                """), {
                    "id": str(uuid4()),
                    "tenant_id": str(tenant_id),
                    "mat_id": str(mat_id),
                    "title": title,
                    "desc": desc,
                    "cat": cat,
                    "prob": prob,
                    "impact": impact,
                    "score": risk_score,
                    "status": status,
                    "severity": severity
                })
                risk_count += 1
            
            print(f"✅ {risk_count} risques ESG créés")
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("3️⃣ SCORES ESG")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
            score_count = 0
            # Créer des scores pour les 3 premières organisations
            for org_id, org_name in orgs[:3]:
                await session.execute(text("""
                    INSERT INTO esg_scores (
                        id, tenant_id, organization_id,
                        period_year, period_month,
                        environmental_score, social_score, governance_score,
                        overall_score, grade,
                        created_at, updated_at
                    ) VALUES (
                        :id, :tenant_id, :org_id,
                        2026, 12,
                        :env, :soc, :gov,
                        :overall, :grade,
                        NOW(), NOW()
                    )
                """), {
                    "id": str(uuid4()),
                    "tenant_id": str(tenant_id),
                    "org_id": str(org_id),
                    "env": 75.5,
                    "soc": 82.3,
                    "gov": 88.7,
                    "overall": 82.2,
                    "grade": "B+"
                })
                score_count += 1
            
            print(f"✅ {score_count} scores ESG créés")
            
            await session.commit()
            
            print("")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("🎉 SEED COMPLET RÉUSSI !")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print(f"✅ {mat_count} enjeux matérialité")
            print(f"✅ {risk_count} risques ESG")
            print(f"✅ {score_count} scores ESG")
            print("")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ ERREUR: {e}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    asyncio.run(seed_all_missing())
