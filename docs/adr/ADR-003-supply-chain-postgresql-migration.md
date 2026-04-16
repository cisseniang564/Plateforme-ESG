# ADR-003: Migration Supply Chain de Redis vers PostgreSQL

**Date:** 2026-04-15  
**Statut:** EN COURS (Semaine 9)  
**Supersède:** ADR-001

## Contexte

ADR-001 a identifié des risques critiques avec Redis-only pour les données fournisseurs.
Un incident en production (redis-cli FLUSHALL pendant maintenance) a effacé tous les
fournisseurs d'un tenant.

## Décision

Créer le modèle `Supplier` en PostgreSQL avec migration Alembic `004_add_suppliers_table`.
Redis reste comme cache optionnel (dégradation gracieuse si Redis indisponible).
Service `SupplyChainService` extrait la logique métier de l'endpoint.

## Plan de migration

1. Créer `models/supplier.py` + migration `004_add_suppliers_table.py`
2. Créer `services/supply_chain_service.py` 
3. Script one-shot : lire clés Redis → insérer en PostgreSQL → supprimer clés Redis
4. Mettre à jour `endpoints/supply_chain.py` pour utiliser le service
5. Déployer en production avec migration automatique au démarrage

## Risques

- **Migration de données :** script de migration one-shot à tester en staging
- **Downtime :** zéro downtime si migration pendant faible trafic
- **Rollback :** migration Alembic réversible (`alembic downgrade -1`)
