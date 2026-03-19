# ============================================================================
# Fichier: /home/claude/esg-saas-platform/GETTING_STARTED.md
# Description: Guide de démarrage rapide pour les développeurs
# ============================================================================

# 🚀 Getting Started - ESGFlow Platform

Guide de démarrage rapide pour développer sur la plateforme ESGFlow.

## ⚡ Démarrage Ultra-Rapide (Docker)

**Temps estimé: 5 minutes**

```bash
# 1. Cloner le projet
git clone https://github.com/votre-org/esg-saas-platform.git
cd esg-saas-platform

# 2. Démarrer tout l'environnement
./scripts/docker-start.sh

# 3. Ouvrir l'API dans le navigateur
open http://localhost:8000/docs
```

C'est tout ! L'environnement complet est prêt. 🎉

## 📋 Ce qui est démarré automatiquement

✅ **PostgreSQL** (port 5432) - Base de données  
✅ **Redis** (port 6379) - Cache  
✅ **Kafka** (port 9092) - Event streaming  
✅ **MinIO** (ports 9000, 9001) - Stockage S3  
✅ **Backend API** (port 8000) - FastAPI  
✅ **Celery Worker** - Tâches asynchrones  
✅ **Flower** (port 5555) - Monitoring Celery  
✅ **PgAdmin** (port 5050) - Interface DB  

## 🔑 Credentials de Test

### Demo User
- **Email**: `admin@demo.esgflow.com`
- **Password**: `Admin123!`
- **Tenant**: `demo-company`

### Database
- **Host**: `localhost:5432`
- **Database**: `esgflow_dev`
- **User**: `esgflow_user`
- **Password**: `esgflow_password_dev`

### MinIO (S3)
- **Console**: http://localhost:9001
- **Username**: `minioadmin`
- **Password**: `minioadmin`

### PgAdmin
- **URL**: http://localhost:5050
- **Email**: `admin@esgflow.local`
- **Password**: `admin`

## 🧪 Tester l'API

### Option 1: Swagger UI (Recommandé)

1. Ouvrir http://localhost:8000/docs
2. Essayer l'endpoint `POST /api/v1/auth/login`
3. Utiliser les credentials demo ci-dessus
4. Copier le `access_token` de la réponse
5. Cliquer sur "Authorize" en haut
6. Coller le token avec préfixe "Bearer "
7. Tester les autres endpoints

### Option 2: curl

```bash
# 1. Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.esgflow.com",
    "password": "Admin123!"
  }'

# 2. Copier le access_token de la réponse
TOKEN="eyJhbGc..."

# 3. Récupérer les infos utilisateur
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Option 3: Python

```python
import requests

# Login
response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    json={
        "email": "admin@demo.esgflow.com",
        "password": "Admin123!"
    }
)

token = response.json()["tokens"]["access_token"]

# Get user info
response = requests.get(
    "http://localhost:8000/api/v1/auth/me",
    headers={"Authorization": f"Bearer {token}"}
)

print(response.json())
```

## 📚 Documentation

- **API Documentation**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Docker Setup**: [docs/docker-setup.md](docs/docker-setup.md)
- **Database Migrations**: [backend/docs/database_migrations.md](backend/docs/database_migrations.md)
- **Architecture**: [docs/architecture.md](docs/architecture.md)

## 🛠️ Commandes Utiles

```bash
# Voir les logs
./scripts/docker-logs.sh backend

# Arrêter tout
./scripts/docker-stop.sh

# Redémarrer
docker-compose restart backend

# Shell dans le backend
docker-compose exec backend bash

# Shell PostgreSQL
docker-compose exec postgres psql -U esgflow_user -d esgflow_dev

# Migrations
docker-compose exec backend alembic upgrade head
```

## 📁 Structure du Projet

```
esg-saas-platform/
├── backend/              # API FastAPI
│   ├── app/
│   │   ├── api/         # Endpoints REST
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── services/    # Business logic
│   │   └── main.py      # Application principale
│   ├── scripts/         # Scripts utilitaires
│   └── tests/           # Tests
├── frontend/            # Application React (à venir)
├── docs/                # Documentation
├── scripts/             # Scripts Docker
├── deployment/          # Dockerfiles
└── docker-compose.yml   # Orchestration
```

## 🐛 Problèmes Courants

### Port 8000 déjà utilisé

```bash
# Trouver le processus
lsof -i :8000

# Le tuer
kill -9 <PID>

# Ou changer le port dans docker-compose.yml
```

### Les services ne démarrent pas

```bash
# Voir les logs
docker-compose logs

# Recréer les containers
docker-compose up -d --force-recreate
```

### Problème de base de données

```bash
# Reset complet
docker-compose down -v
./scripts/docker-start.sh
```

## 🔄 Workflow de Développement

### 1. Créer une branche

```bash
git checkout -b feature/nouvelle-fonctionnalite
```

### 2. Développer

```bash
# Le code est monté en volume, les changements sont automatiques
# Éditer dans: backend/app/

# Voir les logs en temps réel
./scripts/docker-logs.sh backend
```

### 3. Ajouter une migration

```bash
# Si vous modifiez les models
docker-compose exec backend alembic revision --autogenerate -m "description"
docker-compose exec backend alembic upgrade head
```

### 4. Tester

```bash
docker-compose exec backend pytest
```

### 5. Commit et Push

```bash
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin feature/nouvelle-fonctionnalite
```

## 🎯 Prochaines Étapes

### Backend
- [ ] Ajouter CRUD Organizations
- [ ] Ajouter CRUD Users
- [ ] Implémenter upload de fichiers
- [ ] Créer les pipelines de validation
- [ ] Implémenter le moteur de scoring

### Frontend
- [ ] Setup React + Vite
- [ ] Créer page de login
- [ ] Créer dashboard principal
- [ ] Intégrer l'API

### Infrastructure
- [ ] Setup CI/CD (GitHub Actions)
- [ ] Ajouter tests E2E
- [ ] Configurer monitoring (Prometheus/Grafana)
- [ ] Setup staging environment

## 💡 Tips

### Hot Reload

Le backend redémarre automatiquement quand vous modifiez le code grâce au montage de volume Docker.

### Debug

Pour debugger avec breakpoint:

```python
# Dans votre code
import pdb; pdb.set_trace()
```

Puis attacher au container:

```bash
docker attach esgflow-backend
```

### Performance

Pour de meilleures performances en développement:

```bash
# Utiliser Docker avec resources adéquates
# Docker Desktop > Preferences > Resources
# RAM: 8GB minimum (16GB recommandé)
# CPU: 4 cores minimum
```

## 🆘 Besoin d'Aide ?

- **Documentation**: Voir [docs/](docs/)
- **Issues**: https://github.com/esgflow/platform/issues
- **Email**: dev@esgflow.com
- **Slack**: #esg-dev

---

**Bon développement ! 🚀**