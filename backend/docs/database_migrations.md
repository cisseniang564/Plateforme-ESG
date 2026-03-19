# ============================================================================
# Fichier: /home/claude/esg-saas-platform/backend/docs/database_migrations.md
# Description: Documentation sur les migrations de base de données
# ============================================================================

# Database Migrations Guide

Ce guide explique comment gérer les migrations de base de données avec Alembic.

## 📚 Table des matières

1. [Setup Initial](#setup-initial)
2. [Commandes Courantes](#commandes-courantes)
3. [Créer une Migration](#créer-une-migration)
4. [Appliquer les Migrations](#appliquer-les-migrations)
5. [Rollback](#rollback)
6. [Best Practices](#best-practices)

---

## Setup Initial

### 1. Créer la base de données

```bash
# Lancer le script de création
python scripts/db/create_db.py

# Entrer le mot de passe postgres quand demandé
```

### 2. Appliquer les migrations

```bash
# Appliquer toutes les migrations
alembic upgrade head

# Vérifier la version actuelle
alembic current
```

### 3. Seed les données initiales

```bash
# Créer permissions, rôles et tenant demo
python scripts/db/seed_data.py
```

---

## Commandes Courantes

### Vérifier l'état

```bash
# Voir la version actuelle
alembic current

# Voir l'historique des migrations
alembic history

# Voir les migrations non appliquées
alembic heads
```

### Appliquer des migrations

```bash
# Appliquer toutes les migrations
alembic upgrade head

# Appliquer une migration spécifique
alembic upgrade <revision>

# Appliquer +1 migration
alembic upgrade +1
```

### Rollback

```bash
# Rollback toutes les migrations
alembic downgrade base

# Rollback -1 migration
alembic downgrade -1

# Rollback à une révision spécifique
alembic downgrade <revision>
```

---

## Créer une Migration

### Auto-génération (Recommandé)

Alembic peut détecter automatiquement les changements dans vos models:

```bash
# Créer une migration auto-générée
alembic revision --autogenerate -m "add email_notifications table"

# La migration sera créée dans:
# app/db/migrations/versions/YYYY_MM_DD_HHMM-<rev>_add_email_notifications_table.py
```

### Migration Manuelle

Pour des changements complexes (triggers, fonctions, RLS):

```bash
# Créer une migration vide
alembic revision -m "add custom trigger"

# Éditer le fichier créé et ajouter le SQL
```

Exemple de migration manuelle:

```python
# File: app/db/migrations/versions/002_add_custom_trigger.py

def upgrade() -> None:
    """Add custom trigger for updated_at."""
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    op.execute("""
        CREATE TRIGGER update_tenants_updated_at
        BEFORE UPDATE ON tenants
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    """)

def downgrade() -> None:
    """Remove custom trigger."""
    op.execute("DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column()")
```

---

## Appliquer les Migrations

### En Développement

```bash
# 1. Créer la migration
alembic revision --autogenerate -m "your message"

# 2. Vérifier le fichier généré
# Éditer si nécessaire: app/db/migrations/versions/...

# 3. Appliquer
alembic upgrade head

# 4. Tester
python -m pytest tests/
```

### En Production

```bash
# 1. Backup de la DB
pg_dump -h localhost -U esgflow_user esgflow_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Appliquer les migrations
alembic upgrade head

# 3. Vérifier
alembic current

# 4. Tester l'application
curl http://api.esgflow.com/health
```

---

## Rollback

Si une migration pose problème:

```bash
# 1. Rollback immédiat
alembic downgrade -1

# 2. Vérifier l'état
alembic current

# 3. Restaurer depuis backup si nécessaire
psql -h localhost -U esgflow_user esgflow_prod < backup_20250211_120000.sql
```

---

## Best Practices

### ✅ DO

1. **Toujours tester localement** avant de déployer en production
2. **Créer des backups** avant d'appliquer des migrations en production
3. **Versionner les migrations** dans Git
4. **Écrire des migrations réversibles** (downgrade fonctionnel)
5. **Utiliser des transactions** pour les changements critiques
6. **Documenter les migrations complexes**

### ❌ DON'T

1. **Ne jamais modifier** une migration déjà appliquée en production
2. **Ne pas appliquer** de migrations directement en prod sans test
3. **Ne pas supprimer** de vieux fichiers de migration
4. **Ne pas commit** de migration auto-générée sans l'avoir vérifiée

---

## Exemples de Migrations

### Ajouter une colonne

```python
def upgrade() -> None:
    op.add_column(
        'tenants',
        sa.Column('subscription_ends_at', sa.DateTime(timezone=True), nullable=True)
    )

def downgrade() -> None:
    op.drop_column('tenants', 'subscription_ends_at')
```

### Créer un index

```python
def upgrade() -> None:
    op.create_index(
        'ix_users_email_verified',
        'users',
        ['email_verified_at'],
        unique=False
    )

def downgrade() -> None:
    op.drop_index('ix_users_email_verified', table_name='users')
```

### Ajouter Row-Level Security

```python
def upgrade() -> None:
    # Enable RLS
    op.execute("ALTER TABLE data_uploads ENABLE ROW LEVEL SECURITY")
    
    # Create policy
    op.execute("""
        CREATE POLICY tenant_isolation ON data_uploads
        FOR ALL
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    """)

def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation ON data_uploads")
    op.execute("ALTER TABLE data_uploads DISABLE ROW LEVEL SECURITY")
```

---

## Troubleshooting

### Migration ne détecte pas les changements

```bash
# Vérifier que les models sont importés dans env.py
# Vérifier app/db/migrations/env.py ligne "from app.models..."

# Forcer la re-détection
alembic revision --autogenerate -m "force detection"
```

### Erreur "target database has pending upgrade operations"

```bash
# Vérifier l'état
alembic current

# Appliquer les migrations manquantes
alembic upgrade head
```

### Conflit de révisions

```bash
# Merger les branches
alembic merge heads -m "merge revisions"
```

---

## Scripts Utiles

### Reset complet de la DB

```bash
# Utiliser le script fourni
./scripts/db/reset_db.sh
```

### Backup automatique

```bash
# Ajouter dans crontab
0 2 * * * pg_dump -h localhost -U esgflow_user esgflow_prod | gzip > /backups/esgflow_$(date +\%Y\%m\%d).sql.gz
```

---

## Ressources

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)