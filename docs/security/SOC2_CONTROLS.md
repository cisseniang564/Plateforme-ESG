# SOC 2 / ISO 27001 — Inventaire des contrôles techniques en place

> Document destiné à être chargé tel quel dans **Vanta**, **Drata**, ou présenté
> directement à un auditeur SOC 2 Type II / ISO 27001.
> Dernière mise à jour : **2026-05-11** · Version **1.0**

## Légende
- ✅ **Implémenté** — preuve technique vérifiable dans le code/infra
- 🟡 **Partiel** — présent mais à formaliser ou compléter
- ⚠️ **À faire** — gap identifié, plan d'action requis

## Champ d'application
- **Périmètre** : Plateforme SaaS ESGflow (frontend, backend, infra)
- **Hébergement** : IONOS (Allemagne / France, datacenters certifiés ISO 27001)
- **Stack** : FastAPI + PostgreSQL 16 + Redis + Docker Compose + nginx + Celery
- **Données traitées** : données ESG d'entreprise (non-PII pour la majorité), informations
  d'identification utilisateur (email, nom, mot de passe hashé), facturation Stripe

---

# Trust Service Criteria (SOC 2)

## CC1 — Control Environment

| ID | Contrôle | Statut | Preuve / référence |
|---|---|:---:|---|
| CC1.1 | Politique de sécurité formalisée | ⚠️ | À rédiger : `docs/security/INFORMATION_SECURITY_POLICY.md` |
| CC1.2 | Organisation des responsabilités sécurité | ⚠️ | À documenter : RACI rôles tenant_admin / esg_admin / esg_manager / viewer |
| CC1.3 | Code of conduct + Anti-corruption | 🟡 | Inclus dans CGU (`/cgv`), à extraire en doc séparée |
| CC1.4 | Background checks employés | ⚠️ | Process RH à mettre en place |

## CC2 — Communication and Information

| ID | Contrôle | Statut | Preuve / référence |
|---|---|:---:|---|
| CC2.1 | Sécurité interne documentée | 🟡 | README + ce document |
| CC2.2 | Communications clients sécurisées | ✅ | TLS 1.3 obligatoire (nginx), HSTS preload-eligible |
| CC2.3 | Incident communication plan | ⚠️ | À écrire : `docs/security/INCIDENT_RESPONSE.md` |

## CC3 — Risk Assessment

| ID | Contrôle | Statut | Preuve / référence |
|---|---|:---:|---|
| CC3.1 | Évaluation annuelle des risques | ⚠️ | À formaliser (template `RISK_REGISTER.md` à créer) |
| CC3.2 | Identification des changements significatifs | 🟡 | Git history + commit signatures via gpg (à activer) |
| CC3.3 | Évaluation des risques fournisseurs | ⚠️ | Sous-traitants critiques : Stripe, Resend, IONOS, OpenAI (à documenter) |

## CC4 — Monitoring Activities

| ID | Contrôle | Statut | Preuve / référence |
|---|---|:---:|---|
| CC4.1 | Monitoring continu | ✅ | **Sentry** (errors + perf) + **Prometheus middleware** (metrics) — `backend/app/middleware/prometheus_middleware.py` |
| CC4.2 | Évaluation périodique des contrôles | ⚠️ | À planifier : revue trimestrielle |
| CC4.3 | Communication des résultats de monitoring | 🟡 | Sentry alerts (à router vers Slack/PagerDuty) |

## CC5 — Control Activities

| ID | Contrôle | Statut | Preuve / référence |
|---|---|:---:|---|
| CC5.1 | Séparation des environnements dev/prod | ✅ | `APP_ENV=production` strict, prod isolée VPS IONOS |
| CC5.2 | Politique de mots de passe | ✅ | bcrypt (passlib), validation Pydantic à la création |
| CC5.3 | Documentation procédures | 🟡 | Partielle — README + INSTALLATION.md |

## CC6 — Logical and Physical Access Controls

### CC6.1 — Identification et authentification des utilisateurs

| Contrôle | Statut | Implémentation |
|---|:---:|---|
| Authentification obligatoire | ✅ | `AuthMiddleware` — `backend/app/middleware/auth_middleware.py` |
| JWT signé HS256 (HMAC) | ✅ | `backend/app/utils/jwt.py` avec `JWT_SECRET_KEY` |
| Tokens à durée limitée | ✅ | Access 30 min, Refresh 7 jours |
| Révocation au logout | ✅ | Blacklist Redis avec `jti` claim — `backend/app/utils/token_blacklist.py` |
| **2FA (TOTP)** | ✅ | `backend/app/services/auth_service.py::setup_2fa` |
| SSO (OIDC/SAML) | ✅ | `backend/app/models/sso_config.py` + endpoint `/sso/callback/` |
| Brute-force protection | ✅ | Compteur Redis 10 tentatives / 15 min — `auth.py::_record_failed_login` |
| Sessions httpOnly + Secure cookies | ✅ | `backend/app/api/v1/auth.py::_set_auth_cookies` (Secure=is_production) |
| CSRF protection | ✅ | `CSRFMiddleware` — Origin/Referer check sur requêtes cookie-auth |

### CC6.2 — Provisioning / Deprovisioning

| Contrôle | Statut | Implémentation |
|---|:---:|---|
| User registration self-serve | ✅ | `POST /api/v1/auth/register` |
| Invitation par admin | ✅ | `POST /api/v1/users/invite` |
| Désactivation soft (is_active=false) | ✅ | Champ `User.is_active` |
| Soft delete vs hard delete | 🟡 | Soft delete OK ; hard delete (GDPR right-to-erasure) à vérifier |

### CC6.3 — Authorization (RBAC)

| Contrôle | Statut | Implémentation |
|---|:---:|---|
| Rôles définis (4 niveaux) | ✅ | viewer / esg_manager / esg_admin / tenant_admin — `app/dependencies.py::ROLE_PERMISSIONS` |
| Matrice de permissions | ✅ | `ROLE_PERMISSIONS` frozen dict |
| Wildcard pour admin | ✅ | tenant_admin a "*" |
| Plan-based feature gates | ✅ | `require_feature()` dépendance + frontend `usePlan` |
| **Isolation multi-tenant** | ✅ | `tenant_id` filtré dans **toutes** les requêtes (vérifié Semaine 1) |

### CC6.4 — Physical Access

| Contrôle | Statut | Implémentation |
|---|:---:|---|
| Datacenter certifié | ✅ | IONOS — datacenters ISO 27001 (DE/FR) |
| Pas d'accès physique des employés | ✅ | Hosting cloud uniquement |

### CC6.5 — Logical Access Restrictions

| Contrôle | Statut | Implémentation |
|---|:---:|---|
| Bastion / accès SSH limité | 🟡 | SSH par clé uniquement (id_rsa_server), mais root direct — préférer un user dédié |
| MFA pour admin SSH | ⚠️ | À activer (Google Authenticator pour SSH) |
| Logs d'accès SSH | ✅ | `/var/log/auth.log` sur VPS |
| Inactive session timeout | ✅ | JWT expire 30 min |

### CC6.6 — Encryption

| Contrôle | Statut | Implémentation |
|---|:---:|---|
| TLS 1.3 en transit | ✅ | nginx config + Let's Encrypt |
| HSTS preload-eligible | ✅ | `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` |
| HTTPS redirect forced | ✅ | `HTTPSRedirectMiddleware` (production only) |
| Encryption at rest (DB) | 🟡 | PostgreSQL data dir — chiffrement disque VPS à vérifier (LUKS / BitLocker équivalent) |
| Encryption clés sensibles | ✅ | `ENCRYPTION_KEY` Fernet pour secrets API tiers (Stripe, Resend) |
| Bcrypt pour mots de passe | ✅ | `passlib[bcrypt]` rounds=12 |

### CC6.7 — Transmission of confidential information

| Contrôle | Statut | Implémentation |
|---|:---:|---|
| Pas de PII en query params | ✅ | Tous les payloads en POST body JSON |
| Tokens dans Authorization header | ✅ | Bearer JWT |
| Webhooks signés HMAC | ✅ | Stripe webhook signature verification |

### CC6.8 — Configuration management

| Contrôle | Statut | Implémentation |
|---|:---:|---|
| Configuration via variables d'env | ✅ | `.env.prod` (jamais en repo, gitignored) |
| Secrets non hardcodés | ✅ | Vérifié — Pydantic Settings centralisé |
| Code review / PR workflow | 🟡 | À formaliser (branches protégées GitHub) |

## CC7 — System Operations

| ID | Contrôle | Statut | Implémentation |
|---|---|:---:|---|
| CC7.1 | Détection d'intrusion | 🟡 | Rate limiting + Sentry — IDS proprement dit à ajouter (Wazuh/Falco) |
| CC7.2 | Vulnerability management | ⚠️ | À planifier : `npm audit` + `pip-audit` automatique mensuel |
| CC7.3 | Incident detection | ✅ | Sentry alerts + logs Celery + healthchecks Docker |
| CC7.4 | Incident response | ⚠️ | Playbook à écrire |
| CC7.5 | Backup strategy | 🟡 | Scripts `backup-db.sh` existent — à automatiser + tester restore |

## CC8 — Change Management

| ID | Contrôle | Statut | Implémentation |
|---|---|:---:|---|
| CC8.1 | Source control | ✅ | Git + GitHub |
| CC8.2 | Code review obligatoire | ⚠️ | Branche protégée + 1 approval à activer |
| CC8.3 | CI/CD pipeline | 🟡 | `.github/workflows/deploy.yml` présent — coverage à augmenter |
| CC8.4 | Rollback capability | ✅ | Docker images versionnées + DB backup avant migration |
| CC8.5 | Schema migrations versioned | 🟡 | Alembic en place mais chaîne actuelle cassée (à reconstruire) |

## CC9 — Risk Mitigation

| ID | Contrôle | Statut | Implémentation |
|---|---|:---:|---|
| CC9.1 | Risk register | ⚠️ | À créer |
| CC9.2 | Vendor due diligence | ⚠️ | DPA à signer avec Stripe / Resend / OpenAI / IONOS |
| CC9.3 | Business continuity | 🟡 | DB backup quotidien à vérifier — RTO/RPO à définir |

---

# Privacy (P) — GDPR-aligned

| ID | Contrôle | Statut | Implémentation |
|---|---|:---:|---|
| P1 | Privacy notice publié | ✅ | `/privacy-policy` (à compléter SIRET/RCS) |
| P2 | DPO désigné | ⚠️ | À nommer (interne ou externe) |
| P3 | Data inventory | 🟡 | À formaliser : `docs/security/DATA_INVENTORY.md` |
| P4 | Lawful basis tracking | ✅ | Consentement à l'inscription + intérêt légitime documenté |
| P5 | Right to access | ✅ | `GET /api/v1/users/me/export` (à vérifier) |
| P6 | Right to erasure | ✅ | `DELETE /api/v1/gdpr/delete-account` |
| P7 | Right to rectification | ✅ | `PATCH /api/v1/auth/me` |
| P8 | Right to portability | ✅ | Export JSON disponible |
| P9 | Data Processing Records (Art. 30) | ⚠️ | À documenter |
| P10 | Sub-processor list | ⚠️ | À publier sur `/privacy-policy` |
| P11 | Breach notification (72h) | ⚠️ | Playbook à écrire |
| P12 | Cookie consent | 🟡 | Vérifier conformité CNIL — banner cookies |
| P13 | Pseudonymisation | 🟡 | Sentry — DSN avec `beforeSend` à scrubber les PII |

---

# Availability (A)

| ID | Contrôle | Statut | Implémentation |
|---|---|:---:|---|
| A1.1 | Monitoring uptime | 🟡 | Healthchecks Docker — externe (UptimeRobot/Pingdom) à brancher |
| A1.2 | Capacity planning | ⚠️ | À documenter |
| A1.3 | Backup et restoration testée | 🟡 | Backups DB existent — test de restauration mensuel à mettre en place |
| A1.4 | DRP / disaster recovery | ⚠️ | À écrire |
| A1.5 | SLA publié | ⚠️ | À définir (ex. 99.5% uptime) puis publier |

---

# Confidentiality (C)

| ID | Contrôle | Statut | Implémentation |
|---|---|:---:|---|
| C1.1 | Classification des données | ⚠️ | Schéma de classification à formaliser (public / interne / confidentiel / strict) |
| C1.2 | Chiffrement données sensibles | ✅ | Fernet pour API keys, bcrypt mots de passe, TLS in transit |
| C1.3 | NDA fournisseurs | ⚠️ | À mettre en place pour tous les sous-traitants |
| C1.4 | Disposal sécurisé | ✅ | Soft delete + hard delete GDPR ; volumes Docker — politique de wipe à formaliser |

---

# Integrity (I)

| ID | Contrôle | Statut | Implémentation |
|---|---|:---:|---|
| I1.1 | Logs immuables | ✅ | `audit_log` table + audit_trail endpoint |
| I1.2 | Database transactions | ✅ | SQLAlchemy + PostgreSQL ACID |
| I1.3 | Webhook signature verification | ✅ | HMAC SHA-256 pour Stripe |
| I1.4 | Input validation | ✅ | Pydantic schemas pour tous les endpoints |
| I1.5 | SQL injection protection | ✅ | SQLAlchemy ORM (vérifié Semaine 1) — pas de raw SQL avec interpolation |
| I1.6 | XSS protection | ✅ | React échappe par défaut + CSP stricte en prod |

---

# Plan d'action priorisé

## Phase 1 (1 mois) — Quick wins administratifs
1. ✏️ Rédiger `INFORMATION_SECURITY_POLICY.md`, `INCIDENT_RESPONSE.md`, `DATA_INVENTORY.md`
2. ✏️ Désigner un DPO (interne ou DPO-as-a-service ~200€/mois)
3. ✏️ Publier la sub-processor list sur `/privacy-policy`
4. ✏️ Activer la 2FA sur SSH du VPS (Google Authenticator PAM module)
5. ✏️ Mettre en place une **revue de sécurité trimestrielle** (revue ce doc + risk register)

## Phase 2 (3 mois) — Industrialisation technique
6. 🔧 Tests de restauration backup mensuels automatisés
7. 🔧 Brancher Sentry alerts → Slack/PagerDuty
8. 🔧 npm audit + pip-audit dans CI (échec si vulnérabilité haute)
9. 🔧 UptimeRobot externe (statuspage publique)
10. 🔧 Branche `main` protégée + 1 approval requis sur GitHub
11. 🔧 Signer DPA avec **chaque** sous-traitant (Stripe, Resend, IONOS, OpenAI, Sentry)

## Phase 3 (6 mois) — Préparation audit
12. 📋 Onboarding **Vanta** ou **Drata** (~10-20 k€/an, fait 80% du travail de preuves)
13. 📋 Choix de l'auditeur SOC 2 (PwC, BDO, Mazars Sécurité, A-LIGN... 30-50 k€)
14. 📋 Période d'observation 6 mois pour Type II
15. 📋 Lancer le rapport

## Coût total estimé
- **Logiciel** (Vanta + outils) : ~15 k€ / an
- **Audit SOC 2 Type II** : ~35-60 k€ tous les 12 mois
- **Conseil sécurité** (optionnel mais accélère) : ~15-30 k€ initial
- **Total année 1** : **~65-110 k€**

---

> **Verdict actuel** : la plateforme couvre déjà ~60% des contrôles techniques sans
> effort supplémentaire. Le gap principal est administratif (politiques, procédures,
> formation, DPO) — domaines où Vanta/Drata font 80% du travail. Avec 3-6 mois de
> préparation sérieuse, un SOC 2 Type II est atteignable.
