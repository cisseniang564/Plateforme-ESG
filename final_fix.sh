#!/bin/bash
echo "🚀 CORRECTION FINALE DU BACKEND"
echo "================================"

# 1. Ajouter DATABASE_URL dans le conteneur en cours d'exécution
echo "📝 Ajout de DATABASE_URL dans l'environnement..."
docker-compose exec backend sh -c 'echo "export DATABASE_URL=postgresql://esgflow_user:esgflow_password_dev@postgres:5432/esgflow_dev" >> ~/.bashrc'

# 2. Tester la connexion avec python
echo -e "\n🔌 Test de connexion:"
docker-compose exec backend python3 -c "
import asyncio
import asyncpg
import os

async def test():
    # Méthode 1: DATABASE_URL explicite
    url = 'postgresql://esgflow_user:esgflow_password_dev@postgres:5432/esgflow_dev'
    print(f'Tentative 1: {url}')
    try:
        conn = await asyncpg.connect(url)
        print('✅ SUCCÈS!')
        await conn.close()
        return True
    except Exception as e:
        print(f'❌ Échec: {e}')
    
    # Méthode 2: Variables individuelles
    print('\nTentative 2: avec variables individuelles')
    try:
        conn = await asyncpg.connect(
            host='postgres',
            port=5432,
            user='esgflow_user',
            password='esgflow_password_dev',
            database='esgflow_dev'
        )
        print('✅ SUCCÈS avec variables individuelles!')
        await conn.close()
        return True
    except Exception as e:
        print(f'❌ Échec: {e}')
        return False

result = asyncio.run(test())
exit(0 if result else 1)
"

# 3. Redémarrer le backend si le test réussit
if [ $? -eq 0 ]; then
    echo -e "\n✅ Test réussi! Redémarrage du backend..."
    docker-compose restart backend
    sleep 5
    docker-compose logs --tail=20 backend
else
    echo -e "\n❌ Test échoué. Vérifions config.py:"
    docker-compose exec backend cat /app/app/config.py | grep -A 10 -B 5 "DATABASE_URL"
fi
