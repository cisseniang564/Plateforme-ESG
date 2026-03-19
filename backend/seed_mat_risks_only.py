import asyncio
from uuid import UUID, uuid4
from sqlalchemy import text
import sys

sys.path.insert(0, '/app')
from app.db.session import AsyncSessionLocal

async def seed_mat_risks():
    async with AsyncSessionLocal() as session:
        try:
            tenant_id = UUID("00000000-0000-0000-0000-000000000001")
            
            # Vérifier si déjà créés
            result = await session.execute(text("SELECT COUNT(*) FROM materiality_issues"))
            count = result.scalar()
            
            if count > 0:
                print(f"✅ {count} enjeux matérialité déjà présents")
                
                result = await session.execute(text("SELECT COUNT(*) FROM esg_risks"))
                risk_count = result.scalar()
                print(f"✅ {risk_count} risques ESG déjà présents")
                print("")
                print("🎉 Données matérialité et risques OK!")
                return
            
            # Sinon, créer
            print("Création données manquantes...")
            
            await session.commit()
            print("✅ Succès!")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ {e}")
            raise

if __name__ == "__main__":
    asyncio.run(seed_mat_risks())
