import asyncio
from uuid import uuid4
from datetime import date
from sqlalchemy import text
import random
import sys

sys.path.insert(0, '/app')
from app.db.session import AsyncSessionLocal

async def calculate_all():
    """Calculer les scores pour TOUTES les organisations"""
    
    async with AsyncSessionLocal() as session:
        try:
            tenant_id = "00000000-0000-0000-0000-000000000001"
            
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("📊 CALCUL SCORES - TOUTES ORGANISATIONS")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print()
            
            # Récupérer TOUTES les organisations
            orgs_query = text("""
                SELECT 
                    o.id,
                    o.name,
                    COUNT(DISTINCT d.indicator_id) as nb_ind,
                    AVG(d.value) as avg_val
                FROM organizations o
                LEFT JOIN indicator_data d ON d.organization_id = o.id
                WHERE o.tenant_id = :tid
                GROUP BY o.id, o.name
                ORDER BY o.name
            """)
            
            result = await session.execute(orgs_query, {"tid": tenant_id})
            organizations = result.fetchall()
            
            print(f"✅ {len(organizations)} organisations CAC40")
            print()
            
            successful = 0
            calc_date = date(2026, 12, 31)
            
            for org_id, org_name, nb_ind, avg_val in organizations:
                
                if nb_ind and nb_ind > 0:
                    # Organisation avec données réelles
                    print(f"  📊 {org_name} ({nb_ind} indicateurs) - RÉEL")
                    
                    env_score = min(100, max(0, avg_val if avg_val else 50))
                    soc_score = min(100, max(0, avg_val if avg_val else 50))
                    gov_score = min(100, max(0, avg_val if avg_val else 50))
                    overall = (env_score + soc_score + gov_score) / 3
                    completeness = (nb_ind / 30) * 100
                    confidence = 'high' if nb_ind > 20 else 'medium'
                else:
                    # Organisation sans données - scores simulés réalistes
                    print(f"  🔮 {org_name} (0 indicateurs) - SIMULÉ")
                    
                    # Scores simulés réalistes entre 40-80
                    env_score = random.uniform(40, 80)
                    soc_score = random.uniform(40, 80)
                    gov_score = random.uniform(40, 80)
                    overall = (env_score + soc_score + gov_score) / 3
                    completeness = 5.0  # Très faible
                    confidence = 'very_low'
                
                # Rating
                if overall >= 90: rating = 'AAA'
                elif overall >= 85: rating = 'AA'
                elif overall >= 80: rating = 'A'
                elif overall >= 75: rating = 'BBB'
                elif overall >= 70: rating = 'BB'
                elif overall >= 65: rating = 'B'
                elif overall >= 60: rating = 'CCC'
                elif overall >= 55: rating = 'CC'
                elif overall >= 50: rating = 'C'
                else: rating = 'D'
                
                # Insérer ou mettre à jour score
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
                        :overall, :rating, :method,
                        :complete, :confidence,
                        NOW(), NOW()
                    )
                    ON CONFLICT (organization_id, calculation_date) 
                    DO UPDATE SET
                        environmental_score = EXCLUDED.environmental_score,
                        social_score = EXCLUDED.social_score,
                        governance_score = EXCLUDED.governance_score,
                        overall_score = EXCLUDED.overall_score,
                        rating = EXCLUDED.rating,
                        data_completeness = EXCLUDED.data_completeness,
                        confidence_level = EXCLUDED.confidence_level,
                        updated_at = NOW()
                """), {
                    "id": str(uuid4()),
                    "tid": tenant_id,
                    "oid": str(org_id),
                    "date": calc_date,
                    "env": round(env_score, 2),
                    "soc": round(soc_score, 2),
                    "gov": round(gov_score, 2),
                    "overall": round(overall, 2),
                    "rating": rating,
                    "method": 'real_data' if nb_ind > 0 else 'simulated',
                    "complete": round(completeness, 2),
                    "confidence": confidence
                })
                
                print(f"    ✅ Score: {overall:.1f} - Rating: {rating}")
                successful += 1
            
            await session.commit()
            
            print()
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print(f"🎉 {successful}/{len(organizations)} SCORES CRÉÉS !")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print()
            
        except Exception as e:
            await session.rollback()
            print(f"❌ ERREUR: {e}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    asyncio.run(calculate_all())
