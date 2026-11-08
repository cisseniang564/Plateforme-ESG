# Chiffrement des sauvegardes

Les dumps PostgreSQL sont chiffrés avec **gpg à clé publique** : le serveur ne détient que la clé
publique, donc une sauvegarde volée (disque, snapshot IONOS, copie MinIO) est illisible.

## Mise en place (une fois)

1. Sur ton poste (pas sur le serveur) :
   `gpg --quick-generate-key "ESGFlow Backup <contact@greenconnect.cloud>" rsa4096 encr 5y`
2. Exporte la clé publique : `gpg --export --armor "ESGFlow Backup" > backup-pub.asc`
3. Sauvegarde la clé **privée** hors serveur (gestionnaire de mots de passe / coffre) :
   `gpg --export-secret-keys --armor "ESGFlow Backup" > backup-private.asc` — ne la copie jamais sur le VPS.
4. Sur le serveur : `gpg --import backup-pub.asc`
5. Dans `/opt/esgflow/.env.prod` : `BACKUP_GPG_RECIPIENT="ESGFlow Backup"`
6. Test : `./scripts/backup-db.sh` → un fichier `esgflow_*.sql.gz.gpg` doit apparaître.

## Restauration (test régulier recommandé)

Sur une machine qui possède la clé privée :
`./scripts/restore-db.sh esgflow_AAAAMMJJ_HHMMSS.sql.gz.gpg esgflow_restore_test`

Le script refuse de restaurer directement sur la base `esgflow`.

Perdre la clé privée = perdre les sauvegardes chiffrées : garde-en deux copies.
Sans `BACKUP_GPG_RECIPIENT`, le script sauvegarde en clair avec un avertissement.
