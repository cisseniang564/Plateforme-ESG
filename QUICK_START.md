# ============================================================================
# Fichier: /home/claude/esg-saas-platform/QUICK_START.md
# Description: Guide de démarrage ultra-rapide (5 minutes)
# ============================================================================

# 🚀 Quick Start - 5 Minutes Setup

## Prerequisites

- Docker & Docker Compose installed
- 8GB RAM available
- Ports available: 5432, 6379, 8000, 9000, 9001

## Step 1: Start Everything

```bash
cd /path/to/esg-saas-platform

# Start all services (auto migrations + seed data)
docker-compose up -d

# Wait for all services to be ready (~30 seconds)
docker-compose ps
```

## Step 2: Verify Backend is Running

```bash
# Check health
curl http://localhost:8000/health

# Expected: {"status":"healthy","version":"0.1.0","environment":"development"}
```

## Step 3: Test Authentication

### Option A: Using Swagger UI (Easiest)

1. Open http://localhost:8000/docs
2. Click `/api/v1/auth/login` endpoint
3. Click "Try it out"
4. Use credentials:
   ```json
   {
     "email": "admin@demo.esgflow.com",
     "password": "Admin123!"
   }
   ```
5. Click "Execute"
6. Copy the `access_token` from response
7. Click "Authorize" button (top right)
8. Paste token with "Bearer " prefix
9. Try other endpoints!

### Option B: Using curl

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.esgflow.com",
    "password": "Admin123!"
  }'

# Copy the access_token from response
TOKEN="paste-your-token-here"

# Get current user
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## Step 4: Check Celery Workers

```bash
# View worker logs
docker-compose logs celery-worker | grep "ready"

# Expected: "celery@... ready"

# Open Flower monitoring
open http://localhost:5555
```

## Step 5: Run Database Migrations (if needed)

```bash
# Apply migrations
docker-compose exec backend alembic upgrade head

# Seed demo data
docker-compose exec backend python scripts/db/seed_data.py
```

## 🎉 You're Done!

### Available Services

| Service | URL | Credentials |
|---------|-----|-------------|
| API Docs | http://localhost:8000/docs | - |
| API | http://localhost:8000 | - |
| PgAdmin | http://localhost:5050 | admin@esgflow.local / admin |
| MinIO | http://localhost:9001 | minioadmin / minioadmin |
| Flower | http://localhost:5555 | - |

### Demo Credentials

```
Email: admin@demo.esgflow.com
Password: Admin123!
Tenant: demo-company
```

### Database Access

```
Host: localhost
Port: 5432
Database: esgflow_dev
User: esgflow_user
Password: esgflow_password_dev
```

## 🛑 Stop Everything

```bash
docker-compose down

# To remove all data (volumes)
docker-compose down -v
```

## 🔧 Troubleshooting

### Port already in use

```bash
# Find process using port 8000
lsof -i :8000

# Kill it
kill -9 <PID>
```

### Services not starting

```bash
# View logs
docker-compose logs backend
docker-compose logs celery-worker

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

### Database issues

```bash
# Reset database
docker-compose exec backend alembic downgrade base
docker-compose exec backend alembic upgrade head
docker-compose exec backend python scripts/db/seed_data.py
```

## 📚 Next Steps

- Read [GETTING_STARTED.md](GETTING_STARTED.md) for detailed guide
- Check [docs/docker-setup.md](docs/docker-setup.md) for Docker details
- See [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) for full architecture

## 💡 Quick Commands

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f celery-worker

# Restart a service
docker-compose restart backend

# Shell into backend
docker-compose exec backend bash

# Shell into database
docker-compose exec postgres psql -U esgflow_user -d esgflow_dev

# Run tests
docker-compose exec backend pytest

# Check migrations
docker-compose exec backend alembic current
```

---

**Need help?** Check the full documentation or create an issue.