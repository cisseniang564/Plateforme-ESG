# ADR-002: Structured Logging avec structlog

**Date:** 2026-04-15  
**Statut:** ACCEPTÉ  
**Décideurs:** Équipe DevOps

## Contexte

Les logs Python standard (`logging.getLogger`) produisent des messages texte non 
structurés. En production avec Datadog/CloudWatch, l'analyse des logs nécessite 
du parsing regex fragile. Les erreurs silencieuses en prod ont duré plusieurs heures
sans détection.

## Décision

Remplacer `logging.getLogger` par `structlog` avec output JSON en production et 
ConsoleRenderer en développement. Contexte automatique : tenant_id, request_id, 
user_id via `structlog.contextvars`.

## Conséquences

- Logs JSON directement indexables dans Datadog
- Corrélation automatique des logs par `request_id`
- Visibilité multi-tenant dans les dashboards
- Migration progressive : `get_logger()` wrapper compatible avec `logging.getLogger`
