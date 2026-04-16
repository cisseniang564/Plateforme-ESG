# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

### Added
- Bouton "Retour" sur toutes les sous-pages de navigation
- Données indicateurs ESG générées pour les organisations sans données
- BackButton composant réutilisable (`src/components/common/BackButton.tsx`)

### Fixed
- Bug SQLAlchemy ORM JOIN causant `Role=None` dans `require_role()` → remplacé par SQL brut
- Boutons "Désactiver"/"Supprimer" non cliquables dans la gestion des utilisateurs (overlay Joyride)
- Erreur "No indicator data found for scoring" pour les organisations importées sans données
- Erreur UniqueViolationError lors de la création d'utilisateur (bypass RLS)

## [0.3.0] - 2026-04-10

### Added
- Module Supply Chain ESG avec portail fournisseur auto-évaluation
- Calcul de score ESG avancé avec pondération sectorielle (`ESGScoringEngine`)
- Détection d'anomalies ML (Isolation Forest) sur les données d'indicateurs
- Prévisions ML (ARIMA/Holt-Winters) sur 12 mois pour chaque indicateur
- Audit trail complet avec traçabilité des modifications
- Workflow de validation des données en équipe
- Export multi-standard (CSRD/GRI/CDP/TCFD) avec mapping automatique
- Connecteur Enedis pour import données énergie

### Changed
- Architecture multi-tenant renforcée avec Row Level Security PostgreSQL
- Rate limiting adaptatif par plan (Free: 60 req/min → Enterprise: illimité)
- Middleware de sécurité OWASP (HSTS, CSP, X-Frame-Options)

## [0.2.0] - 2026-03-01

### Added
- Dashboard exécutif avec scores ESG E/S/G en temps réel
- Import CSV/Excel des données indicateurs avec preview et validation
- Génération de rapports PDF/Word (CSRD, GRI, bilan carbone)
- Matrice de matérialité interactive
- Comparateur d'organisations ESG
- Intégrations INSEE (données entreprises) et Schneider/Climatiq (émissions)
- Gestion des utilisateurs multi-rôles (tenant_admin, esg_admin, analyst, viewer)
- Authentification 2FA (TOTP)

### Fixed
- Performance requêtes PostgreSQL (index sur tenant_id, indicator_id)
- Sécurité: tokens JWT à courte durée (30 min access, 7 jours refresh)

## [0.1.0] - 2026-01-15

### Added
- Architecture FastAPI + React + PostgreSQL multi-tenant
- Modèles de données ESG (indicateurs, données, scores, organisations)
- API REST complète avec documentation OpenAPI auto-générée
- Authentification JWT avec gestion des rôles RBAC
- Interface utilisateur React + TypeScript avec Tailwind CSS
- Docker Compose pour développement et production
- Migrations Alembic pour versionner le schéma DB
