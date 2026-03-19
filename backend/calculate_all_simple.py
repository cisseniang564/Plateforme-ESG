import asyncio
from uuid import uuid4
from datetime import date
from sqlalchemy import text
import random
import sys

sys.path.insert(0, '/app')
from app.db.session import AsyncSessionLocal

async def calculate_all():
    """Calculer scores pour toutes les organisations"""
    
    async with AsyncSessionLocal() as session:
        try:
            tenant_id = "00000000-0000-0000-0000-000000000001"
            
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("📊 CALCUL 40 ORGANISATIONS CAC40")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print()
            
            # Supprimer anciens scores
            await session.execute(text("DELETE FROM esg_scores WHERE tenant_id = :tid"), {"tid": tenant_id})
            
            # Récupérer organisations
            orgs_query = text("""
                SELECT 
                    o.id, o.name,
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
            
            print(f"✅ {len(organizations)} organisations")
            print()
            
            calc_date = date(2026, 12, 31)
            
            for org_id, org_name, nb_ind, avg_val in organizations:
                
                if nb_ind and nb_ind > 0:
                    # Données réelles
                    env = min(100, max(0, avg_val or 50))
                    soc = min(100, max(0, avg_val or 50))
                    gov = min(100, max(0, avg_val or 50))
                    overall = (env + soc + gov) / 3
                    complete = (nb_ind / 30) * 100
                    conf = 'high' if nb_ind > 20 else 'medium'
                    method = 'real_data'
                    print(f"  📊 {org_name:30s} ({nb_ind:2d} ind) - RÉEL", end='')
                else:
                    # Simulé
                    env = random.uniform(40, 80)
                    soc = random.uniform(40, 80)
                    gov = random.uniform(40, 80)
                    overall = (env + soc + gov) / 3
                    complete = 5.0
                    conf = 'very_low'
                    method = 'simulated'
                    print(f"  🔮 {org_name:30s} ( 0 ind) - SIMU", end='')
                
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
                
                # Insert simple
                await session.execute(text("""
                    INSERT INTO esg_scores (
                        id, tenant_id, organization_id, calculation_date,
                        environmental_score, social_score, governance_score,
                        overall_score, rating, calculation_method,
                        data_completeness, confidence_level,
                        created_at, updated_at
                    ) VALUES (
                        :id, :tid, :oid, :date,
                        :env, :soc, :gov, :overall, :rating, :method,
                        :complete, :conf, NOW(), NOW()
                    )
                """), {
                    "id": str(uuid4()), "tid": tenant_id, "oid": str(org_id),
                    "date": calc_date, "env": env, "soc": soc, "gov": gov,
                    "overall": overall, "rating": rating, "method": method,
                    "complete": complete, "conf": conf
                })
                
                print(f" → {overall:.1f} ({rating})")
            
            await session.commit()
            
            print()
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print(f"🎉 {len(organizations)} SCORES CRÉÉS !")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            
        except Exception as e:
            await session.rollback()
            print(f"\n❌ ERREUR: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(calculate_all())
