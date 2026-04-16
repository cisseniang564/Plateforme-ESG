# Runbook — Incidents de Production ESGFlow

**Version:** 1.0  
**Dernière mise à jour:** 2026-04-15  
**Équipe:** DevOps / Backend

Ce runbook couvre les incidents les plus fréquents en production. Pour chaque scénario :
Symptômes → Diagnostic → Résolution → Prévention.

Noms des containers Docker Compose :
- `esgflow-backend-1` — API FastAPI
- `esgflow-db-1` — PostgreSQL 15
- `esgflow-frontend-1` — Nginx + React build
- `esgflow-redis-1` — Cache / file de tâches

---

## 1. Backend down (container crashé)

### Symptômes
- Toutes les requêtes API retournent `502 Bad Gateway` ou `Connection refused`
- Le frontend affiche une bannière d'erreur réseau
- Alertes Sentry : connexions timeout
- Logs Nginx : `connect() failed (111: Connection refused) while connecting to upstream`

### Diagnostic

```bash
# Vérifier l'état des containers
docker compose ps

# Voir les logs récents du backend (50 dernières lignes)
docker compose logs --tail=50 backend

# Vérifier si le container est en boucle de redémarrage
docker inspect esgflow-backend-1 | grep -E '"RestartCount"|"Status"'

# Tester la connectivité interne
docker compose exec backend curl -sf http://localhost:8000/health || echo "Backend unreachable"
```

### Résolution

**Cas 1 — Crash simple (OOMKilled, exception non gérée) :**
```bash
# Redémarrer le backend
docker compose restart backend

# Vérifier que le health check passe
sleep 5 && docker compose exec backend curl -sf http://localhost:8000/health
```

**Cas 2 — Boucle de redémarrage (exit code non-0) :**
```bash
# Lire les logs de crash
docker compose logs --tail=100 backend 2>&1 | grep -E "ERROR|CRITICAL|Traceback"

# Forcer la recréation du container
docker compose up -d --force-recreate backend

# Si erreur de migration DB au démarrage :
docker compose exec backend alembic upgrade head
docker compose restart backend
```

**Cas 3 — Image corrompue :**
```bash
# Rebuild et redémarrer
docker compose build backend
docker compose up -d backend
```

### Prévention
- Configurer `deploy.restart_policy: condition: on-failure, max_attempts: 3` dans docker-compose.yml
- Ajouter un health check Docker : `HEALTHCHECK CMD curl -sf http://localhost:8000/health || exit 1`
- Alertes PagerDuty sur métrique `container_restarts > 2` dans les 10 dernières minutes
- Limiter la mémoire container : `mem_limit: 512m` pour déclencher OOMKilled explicitement

---

## 2. Connexions DB épuisées (PostgreSQL pool exhausted)

### Symptômes
- Erreurs `asyncpg.exceptions.TooManyConnectionsError` dans les logs backend
- Erreurs 500 sur toutes les routes qui accèdent à la DB
- `pg_stat_activity` montre `max_connections` atteint (default: 100)
- Latence API > 5s avant timeout

### Diagnostic

```bash
# Voir le nombre de connexions actives
docker compose exec db psql -U esgflow -d esgflow -c "
  SELECT count(*), state, wait_event_type, wait_event
  FROM pg_stat_activity
  WHERE datname = 'esgflow'
  GROUP BY state, wait_event_type, wait_event
  ORDER BY count DESC;
"

# Connexions par application / client
docker compose exec db psql -U esgflow -d esgflow -c "
  SELECT application_name, client_addr, count(*), state
  FROM pg_stat_activity
  WHERE datname = 'esgflow'
  GROUP BY application_name, client_addr, state
  ORDER BY count DESC;
"

# Voir max_connections configuré
docker compose exec db psql -U esgflow -c "SHOW max_connections;"

# Requêtes longues (> 30s) qui bloquent des connexions
docker compose exec db psql -U esgflow -d esgflow -c "
  SELECT pid, now() - query_start AS duration, query, state
  FROM pg_stat_activity
  WHERE state != 'idle'
    AND now() - query_start > interval '30 seconds'
  ORDER BY duration DESC;
"
```

### Résolution

**Étape 1 — Libération immédiate (tuer les connexions idle) :**
```bash
docker compose exec db psql -U esgflow -d esgflow -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'esgflow'
    AND state = 'idle'
    AND query_start < now() - interval '5 minutes';
"
```

**Étape 2 — Tuer les requêtes bloquées depuis > 2 minutes :**
```bash
docker compose exec db psql -U esgflow -d esgflow -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'esgflow'
    AND state NOT IN ('idle')
    AND now() - query_start > interval '2 minutes';
"
```

**Étape 3 — Réduire le pool SQLAlchemy si nécessaire :**
Editer `backend/.env` ou les variables d'environnement du container :
```bash
# Réduire temporairement
docker compose exec backend sh -c "
  export DB_POOL_SIZE=5
  export DB_MAX_OVERFLOW=10
"
docker compose restart backend
```

**Étape 4 — Augmenter max_connections PostgreSQL (nécessite redémarrage) :**
```bash
docker compose exec db psql -U esgflow -c "ALTER SYSTEM SET max_connections = 200;"
docker compose restart db
```

### Prévention
- Configurer PgBouncer en mode transaction pooling devant PostgreSQL
- Limiter `DB_POOL_SIZE=10, DB_MAX_OVERFLOW=20` dans les variables d'environnement
- Alertes sur `pg_stat_activity count > 80` (80% de max_connections)
- Timeout automatique : `statement_timeout = '30s'` dans postgresql.conf

---

## 3. Redis unavailable

### Symptômes
- Erreurs `redis.exceptions.ConnectionError` dans les logs backend
- Les endpoints de rate limiting retournent 500 au lieu de dépasser la limite
- Le cache des scores ESG est contourné (requêtes plus lentes)
- Les tokens de portail Supply Chain sont inaccessibles

### Diagnostic

```bash
# Vérifier l'état du container Redis
docker compose ps redis
docker compose logs --tail=30 redis

# Tester la connectivité Redis
docker compose exec redis redis-cli ping
# Réponse attendue : PONG

# Vérifier la mémoire utilisée
docker compose exec redis redis-cli info memory | grep -E "used_memory_human|maxmemory"

# Voir les erreurs récentes
docker compose exec redis redis-cli info stats | grep -E "rejected_connections|evicted_keys"
```

### Résolution

**Cas 1 — Container Redis arrêté :**
```bash
docker compose start redis
sleep 2
docker compose exec redis redis-cli ping
docker compose restart backend  # Pour reconnecter le pool
```

**Cas 2 — Redis OOM (eviction de clés) :**
```bash
# Vérifier la politique d'éviction
docker compose exec redis redis-cli config get maxmemory-policy

# Augmenter la mémoire allouée (éditer docker-compose.yml)
# environment:
#   - REDIS_MAXMEMORY=512mb
#   - REDIS_MAXMEMORY_POLICY=allkeys-lru
docker compose up -d redis
```

**Cas 3 — Données corrompues (flush forcé) :**
```bash
# ATTENTION : efface TOUTES les données Redis — à utiliser en dernier recours
docker compose exec redis redis-cli FLUSHALL

# Redémarrer le backend pour réécrire le cache
docker compose restart backend
```

**Mode dégradé (si Redis ne peut pas être restauré rapidement) :**

Le backend ESGFlow est conçu pour fonctionner sans Redis en mode dégradé.
Vérifier que `REDIS_OPTIONAL=true` est dans les variables d'environnement :
```bash
docker compose exec backend sh -c "echo \$REDIS_OPTIONAL"
# Si vide, ajouter dans docker-compose.yml sous environment:
#   REDIS_OPTIONAL: "true"
docker compose up -d backend
```

### Prévention
- Activer la persistence AOF : `appendonly yes` dans redis.conf
- Snapshot RDB toutes les 5 minutes : `save 300 1` dans redis.conf
- Monitorer `redis_connected_clients` et `redis_memory_used_bytes`
- Ne jamais utiliser `FLUSHALL` en production sans sauvegarde préalable

---

## 4. Score calculation timeout

### Symptômes
- Endpoint `POST /api/v1/scores/calculate` retourne 504 Gateway Timeout
- Logs backend : `TimeoutError` ou `Task exceeded time limit`
- Dashboard ESG affiche des scores "N/A" ou ne se charge pas
- CPU container backend > 90% pendant plusieurs minutes

### Diagnostic

```bash
# Voir les requêtes lentes en cours
docker compose logs --tail=100 backend 2>&1 | grep -E "timeout|score|calculate|slow"

# Vérifier la charge CPU du backend
docker stats esgflow-backend-1 --no-stream

# Compter les organisations avec beaucoup d'indicateurs
docker compose exec db psql -U esgflow -d esgflow -c "
  SELECT o.name, count(id.id) as indicator_count
  FROM organizations o
  LEFT JOIN indicator_data id ON id.organization_id = o.id
  GROUP BY o.id, o.name
  ORDER BY indicator_count DESC
  LIMIT 10;
"

# Voir les requêtes SQL longues liées aux scores
docker compose exec db psql -U esgflow -d esgflow -c "
  SELECT pid, now() - query_start AS duration, left(query, 200) as query_preview
  FROM pg_stat_activity
  WHERE query ILIKE '%score%' OR query ILIKE '%indicator%'
  ORDER BY duration DESC;
"
```

### Résolution

**Étape 1 — Annuler les calculs bloqués :**
```bash
# Tuer les requêtes SQL longues liées aux scores
docker compose exec db psql -U esgflow -d esgflow -c "
  SELECT pg_cancel_backend(pid)
  FROM pg_stat_activity
  WHERE now() - query_start > interval '60 seconds'
    AND query ILIKE '%score%';
"
```

**Étape 2 — Recalculer en mode segmenté :**

Si une organisation a trop de données, calculer par pilier :
```bash
# Via l'API avec timeout étendu
curl -X POST http://localhost:8000/api/v1/scores/calculate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"organization_id": "...", "pillar": "environmental", "force": true}'
```

**Étape 3 — Vérifier les index DB :**
```bash
docker compose exec db psql -U esgflow -d esgflow -c "
  EXPLAIN ANALYZE
  SELECT * FROM indicator_data
  WHERE organization_id = 'votre-org-id'
  ORDER BY period_start DESC;
"
# Si Seq Scan → créer l'index manquant :
docker compose exec db psql -U esgflow -d esgflow -c "
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_indicator_data_org_period
  ON indicator_data(organization_id, period_start DESC);
"
```

**Étape 4 — Augmenter le timeout Uvicorn temporairement :**
```bash
# Dans docker-compose.yml, modifier la commande backend :
# command: uvicorn app.main:app --timeout-keep-alive 120
docker compose up -d backend
```

### Prévention
- Mettre en cache les scores calculés dans Redis (TTL 1 heure)
- Implémenter le calcul asynchrone via Celery pour les gros volumes
- Ajouter des index DB sur `(organization_id, period_start)` dans indicator_data
- Alertes sur `request_duration_p95 > 10s` pour les endpoints `/scores/`

---

## 5. Disk space critique

### Symptômes
- Erreurs `No space left on device` dans les logs
- PostgreSQL ne peut plus écrire (WAL logs bloqués)
- Uploads de fichiers CSV/Excel échouent avec 500
- Docker ne peut plus créer de nouveaux containers/layers

### Diagnostic

```bash
# Vue d'ensemble de l'utilisation disque
df -h

# Ce qui utilise le plus d'espace dans /var/lib/docker
du -sh /var/lib/docker/volumes/*
du -sh /var/lib/docker/overlay2/

# Taille des volumes Docker spécifiques
docker system df -v | grep -E "esgflow|VOLUME"

# Taille des logs Docker par container
du -sh /var/lib/docker/containers/*/\*.log | sort -rh | head -10

# Taille des WAL PostgreSQL
docker compose exec db sh -c "du -sh \$PGDATA/pg_wal/"

# Fichiers de logs applicatifs
du -sh /var/log/nginx/ 2>/dev/null
docker compose exec backend find /app/logs -name "*.log" -exec du -sh {} \; 2>/dev/null | sort -rh
```

### Résolution

**Étape 1 — Nettoyage Docker immédiat (sans perte de données) :**
```bash
# Supprimer images, containers et networks inutilisés (SANS toucher les volumes)
docker system prune -f

# Supprimer les images non taguées / dangling
docker image prune -f

# Voir l'espace récupéré
docker system df
```

**Étape 2 — Rotation des logs Docker :**
```bash
# Tronquer les logs des containers en production
for container in esgflow-backend-1 esgflow-frontend-1 esgflow-redis-1; do
  truncate -s 0 "$(docker inspect --format='{{.LogPath}}' $container)"
done
```

**Étape 3 — Nettoyage des WAL PostgreSQL :**
```bash
# Forcer un checkpoint pour libérer les anciens WAL
docker compose exec db psql -U esgflow -c "CHECKPOINT;"

# Voir les slots de réplication qui retiennent les WAL
docker compose exec db psql -U esgflow -c "
  SELECT slot_name, active, restart_lsn
  FROM pg_replication_slots;
"
# Si un slot est inactif et retient des WAL :
# docker compose exec db psql -U esgflow -c "SELECT pg_drop_replication_slot('nom_slot');"
```

**Étape 4 — VACUUM pour récupérer l'espace PostgreSQL :**
```bash
docker compose exec db psql -U esgflow -d esgflow -c "VACUUM FULL ANALYZE;"
```

**Étape 5 — Nettoyage des fichiers uploadés anciens :**
```bash
# Fichiers d'import CSV/Excel de plus de 30 jours
docker compose exec backend find /app/uploads -name "*.csv" -o -name "*.xlsx" \
  | xargs ls -la --time-style=+%s 2>/dev/null \
  | awk -v cutoff=$(date -d '30 days ago' +%s) '$6 < cutoff {print $7}' \
  | xargs rm -f
```

### Prévention
- Configurer la rotation des logs Docker dans `/etc/docker/daemon.json` :
  ```json
  {
    "log-driver": "json-file",
    "log-opts": {
      "max-size": "50m",
      "max-file": "3"
    }
  }
  ```
- Alertes sur `disk_usage_percent > 80%` (warning) et `> 90%` (critical)
- Cron de nettoyage hebdomadaire des uploads temporaires
- Activer `autovacuum` PostgreSQL (activé par défaut, vérifier qu'il n'est pas désactivé)

---

## 6. SSL Certificate expiry

### Symptômes
- Les navigateurs affichent `ERR_CERT_DATE_INVALID` ou `NET::ERR_CERT_AUTHORITY_INVALID`
- Les appels API depuis le frontend échouent avec erreur SSL
- Les webhooks entrants sont rejetés
- Alerte monitoring : `ssl_certificate_expiry_days < 14`

### Diagnostic

```bash
# Vérifier la date d'expiration du certificat en production
echo | openssl s_client -connect esgflow.votredomaine.com:443 2>/dev/null \
  | openssl x509 -noout -dates

# Via le container Nginx
docker compose exec frontend openssl x509 -in /etc/nginx/ssl/cert.pem -noout -dates 2>/dev/null \
  || docker compose exec frontend openssl x509 -in /etc/letsencrypt/live/esgflow.votredomaine.com/cert.pem -noout -dates

# Jours restants avant expiration
echo | openssl s_client -connect esgflow.votredomaine.com:443 2>/dev/null \
  | openssl x509 -noout -enddate \
  | awk -F= '{print $2}' \
  | xargs -I{} sh -c 'echo $(( ($(date -d "{}" +%s) - $(date +%s)) / 86400 )) days remaining'

# Vérifier si certbot/acme est configuré
docker compose exec frontend certbot certificates 2>/dev/null \
  || which certbot && certbot certificates
```

### Résolution

**Cas 1 — Renouvellement Let's Encrypt (certbot) :**
```bash
# Renouvellement manuel
certbot renew --force-renewal --nginx

# Ou via Docker si certbot est dans un container séparé
docker compose run --rm certbot renew --force-renewal

# Recharger Nginx après renouvellement
docker compose exec frontend nginx -s reload

# Vérifier que le nouveau certificat est actif
echo | openssl s_client -connect esgflow.votredomaine.com:443 2>/dev/null \
  | openssl x509 -noout -dates
```

**Cas 2 — Certificat commercial (wildcard, OV/EV) :**
```bash
# Copier le nouveau certificat dans le container
docker cp /chemin/vers/nouveau_cert.pem esgflow-frontend-1:/etc/nginx/ssl/cert.pem
docker cp /chemin/vers/nouveau_key.pem  esgflow-frontend-1:/etc/nginx/ssl/key.pem

# Vérifier la cohérence cert/clé
docker compose exec frontend openssl x509 -noout -modulus -in /etc/nginx/ssl/cert.pem | md5sum
docker compose exec frontend openssl rsa  -noout -modulus -in /etc/nginx/ssl/key.pem  | md5sum
# Les deux hash doivent être identiques

# Tester la config Nginx
docker compose exec frontend nginx -t

# Recharger Nginx
docker compose exec frontend nginx -s reload
```

**Cas 3 — Certificat déjà expiré (accès urgence) :**
```bash
# En dernier recours — accepter temporairement HTTP en interne
# Modifier nginx.conf pour ajouter un vhost HTTP sur port 8080
# ATTENTION : ne jamais exposer HTTP sur internet sans VPN/bastion

# Émettre un certificat d'urgence auto-signé (développement seulement)
docker compose exec frontend openssl req -x509 -newkey rsa:4096 \
  -keyout /etc/nginx/ssl/key.pem \
  -out /etc/nginx/ssl/cert.pem \
  -days 7 -nodes \
  -subj "/CN=esgflow.votredomaine.com"
docker compose exec frontend nginx -s reload
```

### Prévention
- Configurer le renouvellement automatique certbot : `0 3 * * * certbot renew --quiet --nginx`
- Alertes à J-30 et J-7 avant expiration (monitoring Uptime Robot, Zabbix, ou Datadog)
- Documenter la date d'expiration dans le wiki et le calendrier d'équipe
- Tester le renouvellement en staging 2 semaines avant l'expiration en production
- Utiliser des certificats wildcard `*.esgflow.votredomaine.com` pour couvrir tous les sous-domaines

---

## Contacts d'urgence

| Rôle | Contact | Disponibilité |
|------|---------|---------------|
| Lead DevOps | devops@esgflow.com | Astreinte 24/7 |
| DBA PostgreSQL | dba@esgflow.com | Heures ouvrées |
| Support hébergeur | ticket via portail | 24/7 |

## Références

- [Docker Compose docs](https://docs.docker.com/compose/)
- [PostgreSQL pg_stat_activity](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [Certbot renew](https://certbot.eff.org/docs/using.html#renewing-certificates)
- [Redis persistence](https://redis.io/docs/manual/persistence/)
