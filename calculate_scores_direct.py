import asyncio
from uuid import uuid4
from datetime import date
from sqlalchemy import text
import sys

sys.path.insert(0, '/app')
from app.db.session import AsyncSessionLocal

async def calculate_direct():
    """Calculer les scores directement"""
    
    async with AsyncSessionLocal() as session:
        try:
            tenant_id = "00000000-0000-0000-0000-000000000001"
            
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("📊 CALCUL DIRECT DES SCORES")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print()
            
            # Récupérer organisations avec données
            orgs_query = text("""
                SELECT DISTINCT 
                    o.id,
                    o.name,
                    COUNT(DISTINCT d.indicator_id) as nb_ind,
                    AVG(d.value) as avg_val
                FROM organizations o
                JOIN indicator_data d ON d.organization_id = o.id
                WHERE o.tenant_id = :tid
                GROUP BY o.id, o.name
                HAVING COUNT(DISTINCT d.indicator_id) >= 5
                ORDER BY nb_ind DESC
            """)
            
            result = await session.execute(orgs_query, {"tid": tenant_id})
            organizations = result.fetchall()
            
            print(f"✅ {len(organizations)} organisations avec données")
            print()
            
            if not organizations:
                print("❌ Aucune organisation avec suffisamment de données")
                return
            
            successful = 0
            calc_date = date(2026, 12, 31)
            
            for org_id, org_name, nb_ind, avg_val in organizations:
                print(f"  🔄 {org_name} ({nb_ind} indicateurs)...")
                
                # Calculer scores simplifiés (basé sur moyenne)
                # E/S/G = moyenne normalisée sur 100
                env_score = min(100, max(0, avg_val if avg_val else 50))
                soc_score = min(100, max(0, avg_val if avg_val else 50))
                gov_score = min(100, max(0, avg_val if avg_val else 50))
                overall = (env_score + soc_score + gov_score) / 3
                
                # Rating
                if overall >= 90: rating = 'AAA'
                elif overall >= 85: rating = 'AA'
                elif overall >= 80: rating = 'A'
                elif overall >= 75: rating = 'BBB'
                elif overall >= 70: rating = 'BB'
                elif overall >= 65: rating = 'B'
                elif overall >= 60: rating = 'CCC'
                else: rating = 'C'
                
                # Insérer score
                await session.execute(text("""
                    INSERT INTO esg_scores (
                        id, tenant_id, organization_id, calculation_date,
                        environmental_score, social_score, governance_score,
                        overall_score, rating, calculation_method,
                        data_completeness, confidence_level,
                        created_at, updated_at
                    ) VALUES (
                        :id, :tid, :oid, :date,
                        :env, :soc, :gov,
                        :overall, :rating, 'simplified',
                        :complete, 'medium',
                        NOW(), NOW()
                    )
                    ON CONFLICT (organization_id, calculation_date) 
                    DO UPDATE SET
                        environmental_score = :env,
                        social_score = :soc,
                        governance_score = :gov,
                        overall_score = :overall,
                        rating = :rating,
                        updated_at = NOW()
                """), {
                    "id": str(uuid4()),
                    "tid": tenant_id,
                    "oid": str(org_id),
                    "date": calc_date,
                    "env": env_score,
                    "soc": soc_score,
                    "gov": gov_score,
                    "overall": overall,
                    "rating": rating,
                    "complete": (nb_ind / 30) * 100  # Sur 30 indicateurs max
                })
                
                print(f"    ✅ Score: {overall:.1f} - Rating: {rating}")
                successful += 1
            
            await session.commit()
            
            print()
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print(f"🎉 {successful} SCORES CRÉÉS !")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print()
            
        except Exception as e:
            await session.rollback()
            print(f"❌ ERREUR: {e}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    asyncio.run(calculate_direct())
