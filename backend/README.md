# ============================================================================
# Fichier: /home/claude/esg-saas-platform/backend/README.md
# Description: Documentation du backend ESGFlow
# ============================================================================

# ESGFlow Backend

API Backend pour la plateforme ESGFlow - SaaS ESG Data Management & Scoring

## 🚀 Quick Start

### Prérequis

- Python 3.11+
- PostgreSQL 15+
- Redis 6+ (optionnel pour développement)

### Installation

```bash
# 1. Créer l'environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Copier et configurer .env
cp .env.example .env
# Éditer .env avec vos configurations

# 4. Créer la base de données
python scripts/db/create_db.py

# 5. Appliquer les migrations
alembic upgrade head

# 6. Seed les données initiales
python scripts/db/seed_data.py

# 7. Lancer le serveur
uvicorn app.main:app --reload
```

### Vérification de l'installation

```bash
# Tester les imports et la configuration
python test_setup.py

# Devrait afficher:
# ✅ All tests passed! Backend setup is correct.
```

## 📚 Documentation

- [API Documentation](http://localhost:8000/docs) - Swagger UI
- [Database Migrations](docs/database_migrations.md) - Guide Alembic
- [Authentication](docs/authentication.md) - Guide authentification
- [Architecture](../docs/architecture.md) - Architecture globale

## 🏗️ Structure du Projet

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py          # Endpoints authentification
│   │       ├── tenants.py       # Endpoints tenants
│   │       └── ...
│   ├── models/                  # SQLAlchemy models
│   │   ├── tenant.py
│   │   ├── user.py
│   │   ├── organization.py
│   │   └── role.py
│   ├── schemas/                 # Pydantic schemas
│   │   ├── auth.py
│   │   └── ...
│   ├── services/                # Business logic
│   │   ├── auth_service.py
│   │   └── ...
│   ├── middleware/              # Middleware
│   │   ├── auth_middleware.py
│   │   └── tenant_middleware.py
│   ├── utils/                   # Utilities
│   │   ├── security.py
│   │   └── jwt.py
│   ├── db/                      # Database
│   │   ├── session.py
│   │   ├── base.py
│   │   └── migrations/          # Alembic migrations
│   ├── config.py                # Configuration
│   ├── dependencies.py          # FastAPI dependencies
│   └── main.py                  # Application principale
├── scripts/
│   └── db/
│       ├── create_db.py         # Création DB
│       ├── seed_data.py         # Données initiales
│       └── reset_db.sh          # Reset complet
├── tests/
│   ├── unit/
│   └── integration/
├── requirements.txt
├── pyproject.toml
├── alembic.ini
└── README.md
```

## 🔐 Authentication

L'API utilise JWT (JSON Web Tokens) pour l'authentification.

### Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.esgflow.com",
    "password": "Admin123!"
  }'
```

Réponse:
```json
{
  "user": {
    "id": "...",
    "email": "admin@demo.esgflow.com",
    "first_name": "Admin"
  },
  "tokens": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "token_type": "bearer",
    "expires_in": 1800
  }
}
```

### Utiliser le token

```bash
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGc..."
```

## 📊 Database

### Migrations

```bash
# Créer une nouvelle migration
alembic revision --autogenerate -m "add new table"

# Appliquer les migrations
alembic upgrade head

# Rollback
alembic downgrade -1

# Voir l'historique
alembic history
```

### Reset Database

```bash
# Reset complet (supprime toutes les données!)
./scripts/db/reset_db.sh
```

## 🧪 Tests

```bash
# Lancer tous les tests
pytest

# Tests avec couverture
pytest --cov=app --cov-report=html

# Tests spécifiques
pytest tests/unit/test_auth.py
pytest tests/integration/
```

## 🔧 Configuration

Variables d'environnement importantes (voir `.env.example`):

```bash
# Application
APP_ENV=development
APP_DEBUG=true

# Database
DATABASE_HOST=localhost
DATABASE_NAME=esgflow_dev
DATABASE_USER=esgflow_user
DATABASE_PASSWORD=your_password

# Security
SECRET_KEY=your-secret-key-min-32-chars
JWT_SECRET_KEY=your-jwt-secret-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email
SMTP_PASSWORD=your-password
```

## 📝 API Endpoints

### Authentication

- `POST /api/v1/auth/onboard` - Onboarding tenant
- `POST /api/v1/auth/register` - Créer utilisateur
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Info utilisateur
- `POST /api/v1/auth/change-password` - Changer mot de passe
- `POST /api/v1/auth/logout` - Logout

### Health

- `GET /health` - Health check
- `GET /` - API info

## 🐛 Debugging

### Logs

```bash
# Activer les logs détaillés
LOG_LEVEL=DEBUG uvicorn app.main:app --reload

# Logs dans fichier
LOG_FILE=/var/log/esgflow/app.log
```

### Database Queries

```bash
# Voir toutes les queries SQL
DATABASE_ECHO=true uvicorn app.main:app --reload
```

## 🚀 Déploiement

### Production Checklist

- [ ] Changer `SECRET_KEY` et `JWT_SECRET_KEY`
- [ ] Configurer `APP_ENV=production`
- [ ] Désactiver `APP_DEBUG=false`
- [ ] Configurer le SMTP production
- [ ] Activer HTTPS
- [ ] Configurer Sentry/DataDog
- [ ] Setup backup automatique DB
- [ ] Configurer rate limiting
- [ ] Review CORS origins

### Docker

```bash
# Build
docker build -t esgflow-backend .

# Run
docker run -p 8000:8000 esgflow-backend
```

## 📦 Dependencies

Principales dépendances:

- **FastAPI** - Framework web async
- **SQLAlchemy 2.0** - ORM avec support async
- **Alembic** - Migrations DB
- **Pydantic** - Validation données
- **python-jose** - JWT tokens
- **passlib** - Password hashing
- **asyncpg** - PostgreSQL async driver

## 🤝 Contributing

1. Créer une branche: `git checkout -b feature/new-feature`
2. Commit: `git commit -am 'Add new feature'`
3. Push: `git push origin feature/new-feature`
4. Créer Pull Request

## 📄 License

Proprietary - Tous droits réservés

## 👥 Support

- Email: support@esgflow.com
- Documentation: https://docs.esgflow.com
- Issues: https://github.com/esgflow/platform/issues