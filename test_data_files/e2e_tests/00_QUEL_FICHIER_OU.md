# Quel fichier importer où ?

## Import CSV générique (`/app/import-csv`)
Ces fichiers ont les colonnes : metric_name · value_numeric · unit · period_start · period_end · pillar · category

| Fichier | Contenu |
|---------|---------|
| `01_esg_environnemental_2025.csv` | 45 indicateurs E (Scope 1/2/3, énergie, eau, déchets) |
| `02_esg_social_2025.csv` | 53 indicateurs S (effectifs, sécurité, formation, diversité) |
| `03_esg_gouvernance_2025.csv` | 44 indicateurs G (CA, éthique, cyber, RGPD) |
| `04_esg_serie_temporelle_2023_2025.csv` | 3 années de données pour les graphiques de tendance |
| `06_indicateurs_codes_standardises.csv` | 74 indicateurs avec codes normalisés (GHG_SCOPE1_TOTAL…) |
| `07_cas_limites_et_erreurs.csv` | Test de robustesse — edge cases |
| `08_donnees_mensuelles_2025.csv` | Données mensuelles pour graphiques temporels |
| `11b_materiality_import_csv.csv` | Scores de matérialité (format adapté Import CSV) |

**Ordre recommandé :** commencer par `01`, puis `02`, puis `03` pour remplir les 3 piliers.

---

## Connecteurs → Sage/Cegid (`/app/connectors`)
Format FEC (fichier d'écriture comptable) → calcule le Scope 3 automatiquement

| Fichier | Format |
|---------|--------|
| `05_fec_import_scope3.txt` | Séparateur pipe `\|` · décimales virgule (Sage 100, Cegid) |
| `12_fec_pennylane_format.csv` | Séparateur `;` · décimales point (Pennylane, EBP) |

---

## Supply Chain ESG (`/app/supply-chain`)
Saisie manuelle des fournisseurs depuis ce fichier de référence

| Fichier | Contenu |
|---------|---------|
| `09_supply_chain_fournisseurs.csv` | 19 fournisseurs avec scoring ESG complet — **saisie manuelle** dans le portail fournisseurs |

---

## Matrice de Matérialité (`/app/materiality`)
Saisie manuelle des sujets IRO dans l'interface drag & drop

| Fichier | Contenu |
|---------|---------|
| `11_materiality_iros.csv` | 15 sujets IRO avec scores — **référence pour saisie manuelle** dans la matrice |
| `11b_materiality_import_csv.csv` | Même données au format Import CSV si vous voulez les tracer comme indicateurs |

---

## Compensation Carbone (module Décarbonation)
Saisie manuelle des crédits carbone

| Fichier | Contenu |
|---------|---------|
| `10_credits_carbone_offsets.csv` | 10 projets carbone (VCS, Gold Standard, Biochar, DAC…) — **saisie manuelle** |
