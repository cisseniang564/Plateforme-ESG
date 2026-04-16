# ADR-001: Stockage Supply Chain dans Redis uniquement (à migrer)

**Date:** 2026-01-15  
**Statut:** DÉPRÉCIÉ → Migration PostgreSQL en cours (voir ADR-003)  
**Décideurs:** Équipe backend

## Contexte

Le module Supply Chain nécessitait un stockage rapide pour les données fournisseurs
avec des tokens de portail à durée limitée. Redis offrait une solution rapide à
implémenter avec TTL intégré.

## Décision

Stocker tous les fournisseurs dans Redis avec une clé `supply_chain:suppliers:{tenant_id}`,
valeur JSON, TTL 365 jours. Les tokens de portail comme clés séparées avec TTL 90 jours.

## Conséquences

**Positives :**
- Implémentation rapide (2 jours)
- TTL natif pour les tokens expirés
- Lecture très rapide (< 1ms)

**Négatives :**
- **CRITIQUE:** Perte de données si Redis redémarre sans persistence AOF activée
- Impossible de faire des requêtes SQL complexes (filtres, tri, jointures)
- Pas de FK vers tenants/organisations → pas d'intégrité référentielle
- Pas d'historique d'audit des modifications fournisseurs
- Problèmes de scalabilité avec > 1000 fournisseurs par tenant (JSON entier chargé en mémoire)

## Alternatives considérées

- PostgreSQL directement → rejeté pour la rapidité d'implémentation initiale
- MongoDB → rejeté (complexité additionnelle)

## Décision de migration

Voir ADR-003 pour la migration vers PostgreSQL (Semaine 9).
