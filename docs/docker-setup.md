# ============================================================================
# Fichier: /home/claude/esg-saas-platform/docs/docker-setup.md
# Description: Guide complet pour l'environnement Docker
# ============================================================================

# Docker Setup Guide

Guide complet pour démarrer et gérer l'environnement de développement ESGFlow avec Docker.

## 📋 Prérequis

- **Docker Desktop** 4.0+ (ou Docker Engine + Docker Compose)
- **8GB RAM** minimum (16GB recommandé)
- **20GB** d'espace disque libre
- **Ports disponibles**: 5432, 6379, 8000, 9000, 9001, 9092, 5050, 5555

### Installation Docker

#### macOS
```bash
# Télécharger Docker Desktop
# https://www.docker.com/products/docker-desktop

# Ou avec Homebrew
brew install --cask docker
```

#### Linux (Ubuntu/Debian)
```bash
# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installer Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER
```

#### Windows
```bash
# Télécharger Docker Desktop pour Windows
# https://www.docker.com/products/docker-desktop
```

## 🚀 Démarrage Rapide

### 1. Cloner le projet

```bash
git clone https://github.com/votre-org/esg-saas-platform.git
cd esg-saas-platform
```

### 2. Démarrer tous les services

```bash
./scripts/docker-start.sh
```

Ce script va automatiquement:
- ✅ Builder les images Docker
- ✅ Démarrer tous les services
- ✅ Attendre que tout soit prêt
- ✅ Exécuter les migrations
- ✅ Seed les données initiales
- ✅ Afficher les URLs d'accès

### 3. Vérifier que tout fonctionne

```bash
# Tester l'API
curl http://localhost:8000/health

# Devrait retourner:
# {"status":"healthy","version":"0.1.0","environment":"development"}
```

## 📦 Services Déployés

### Backend API (Port 8000)
- **URL**: http://localhost:8000
- **Docs**: http://localhost:8000/docs
- **Framework**: FastAPI
- **Container**: `esgflow-backend`

### PostgreSQL (Port 5432)
- **Host**: localhost
- **Port**: 5432
- **Database**: esgflow_dev
- **User**: esgflow_user
- **Password**: esgflow_password_dev
- **Container**: `esgflow-postgres`

### Redis (Port 6379)
- **Host**: localhost
- **Port**: 6379
- **Container**: `esgflow-redis`

### MinIO - S3 Storage (Ports 9000, 9001)
- **API**: http://localhost:9000
- **Console**: http://localhost:9001
- **Username**: minioadmin
- **Password**: minioadmin
- **Container**: `esgflow-minio`

### Kafka (Port 9092)
- **Bootstrap Server**: localhost:9092
- **Containers**: `esgflow-kafka`, `esgflow-zookeeper`

### PgAdmin (Port 5050)
- **URL**: http://localhost:5050
- **Email**: admin@esgflow.local
- **Password**: admin
- **Container**: `esgflow-pgadmin`

### Flower - Celery Monitoring (Port 5555)
- **URL**: http://localhost:5555
- **Container**: `esgflow-flower`

## 🔧 Commandes Utiles

### Gestion des Services

```bash
# Démarrer tous les services
./scripts/docker-start.sh

# Arrêter tous les services
./scripts/docker-stop.sh

# Voir les logs
./scripts/docker-logs.sh backend

# Voir tous les logs
docker-compose logs -f

# Redémarrer un service
docker-compose restart backend

# Voir le statut
docker-compose ps
```

### Accès aux Containers

```bash
# Shell dans le backend
docker-compose exec backend bash

# Shell dans PostgreSQL
docker-compose exec postgres psql -U esgflow_user -d esgflow_dev

# Shell dans Redis
docker-compose exec redis redis-cli
```

### Base de Données

```bash
# Migrations
docker-compose exec backend alembic upgrade head
docker-compose exec backend alembic downgrade -1
docker-compose exec backend alembic current

# Seed data
docker-compose exec backend python scripts/db/seed_data.py

# Reset complet
docker-compose exec backend ./scripts/db/reset_db.sh

# Backup
docker-compose exec postgres pg_dump -U esgflow_user esgflow_dev > backup.sql

# Restore
cat backup.sql | docker-compose exec -T postgres psql -U esgflow_user -d esgflow_dev
```

### Rebuild

```bash
# Rebuild tout
docker-compose build

# Rebuild un service spécifique
docker-compose build backend

# Rebuild et redémarrer
docker-compose up -d --build backend
```

## 🧪 Tester l'API

### Avec curl

```bash
# Health check
curl http://localhost:8000/health

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.esgflow.com",
    "password": "Admin123!"
  }'

# Get current user (avec token)
TOKEN="votre-token-ici"
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Avec Swagger UI

1. Ouvrir http://localhost:8000/docs
2. Cliquer sur "Authorize" en haut à droite
3. Login via `/api/v1/auth/login`
4. Copier le `access_token` de la réponse
5. Coller dans "Value" avec préfixe "Bearer "
6. Tester les autres endpoints

## 🗂️ Volumes Docker

Les données sont persistées dans des volumes Docker:

```bash
# Lister les volumes
docker volume ls | grep esgflow

# Inspecter un volume
docker volume inspect esg-saas-platform_postgres_data

# Supprimer tous les volumes (⚠️ perte de données!)
docker-compose down -v
```

### Localisation des volumes

- **postgres_data**: Données PostgreSQL
- **redis_data**: Données Redis
- **minio_data**: Fichiers S3
- **kafka_data**: Messages Kafka
- **pgadmin_data**: Configuration PgAdmin

## 🔍 Debugging

### Logs en temps réel

```bash
# Tous les services
docker-compose logs -f

# Service spécifique
docker-compose logs -f backend

# Avec tail
docker-compose logs -f --tail=100 backend
```

### Vérifier la santé

```bash
# Health checks de tous les services
docker-compose ps

# Services en erreur
docker-compose ps | grep "unhealthy\|Exit"

# Inspecter un container
docker inspect esgflow-backend
```

### Problèmes Courants

#### Port déjà utilisé

```bash
# Trouver le processus utilisant le port 8000
lsof -i :8000
# ou
sudo netstat -tulpn | grep 8000

# Tuer le processus
kill -9 <PID>
```

#### Container ne démarre pas

```bash
# Voir les logs complets
docker-compose logs backend

# Recréer le container
docker-compose up -d --force-recreate backend
```

#### Base de données corrompue

```bash
# Supprimer le volume et recommencer
docker-compose down
docker volume rm esg-saas-platform_postgres_data
./scripts/docker-start.sh
```

## 🧹 Nettoyage

### Nettoyage Léger

```bash
# Arrêter les services
docker-compose down

# Supprimer les images non utilisées
docker image prune
```

### Nettoyage Complet

```bash
# Arrêter et supprimer tout (⚠️ perte de données!)
docker-compose down -v --rmi all

# Nettoyer tout Docker
docker system prune -a --volumes
```

## 🔐 Sécurité

### Credentials par Défaut

⚠️ **NE JAMAIS utiliser en production!**

Les credentials suivants sont pour le développement uniquement:

```env
# PostgreSQL
POSTGRES_PASSWORD=esgflow_password_dev

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# PgAdmin
PGADMIN_DEFAULT_PASSWORD=admin

# JWT
JWT_SECRET_KEY=dev-jwt-secret-key-change-this-in-production
```

### Pour Production

1. Changer TOUS les mots de passe
2. Utiliser des secrets Docker
3. Activer HTTPS/TLS
4. Configurer les pare-feu
5. Limiter l'accès réseau

## 📊 Monitoring

### Métriques Container

```bash
# Stats en temps réel
docker stats

# Stats d'un container
docker stats esgflow-backend
```

### Celery Monitoring

Ouvrir http://localhost:5555 pour voir:
- Tâches en cours
- Workers actifs
- Historique des tâches
- Statistiques

## 🚀 Production

Pour déployer en production, utiliser:

```bash
# Fichier docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml up -d
```

Différences en production:
- Pas de reload automatique
- Logs dans fichiers
- Secrets chiffrés
- HTTPS activé
- Monitoring activé
- Backups automatiques

## 📚 Ressources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)