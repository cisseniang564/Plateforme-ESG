# Jeu de données de test ESG Flow

> Données fictives mais réalistes pour tester la plateforme **sans connecteur**.
> Permet d'évaluer : calcul des scores ESG, benchmark sectoriel, taxonomie UE,
> bilan carbone Scopes 1/2/3, audit fournisseurs, matrice de matérialité,
> registre des risques.

---

## 🏢 Entreprise fictive

| Champ          | Valeur                                       |
|---             |---                                           |
| **Nom**        | Aurora Solutions SAS                            |
| **SIREN**      | 851234567                           |
| **SIRET**      | 85123456700019                           |
| **NAF**        | 6202A — Conseil en systèmes et logiciels informatiques |
| **Secteur**    | Services aux entreprises (IT/conseil)        |
| **Effectif**   | 87 ETP                   |
| **CA**         | 8,400 k€                  |
| **Adresse**    | 42 rue de la Paix, 75002 Paris                         |
| **Exercice**   | 1er jan – 31 déc 2025    |

---

## 📂 Fichiers générés

### 1. `851234567FEC20251231.txt` — FEC comptable
- **Format** : Fichier des Écritures Comptables au format réglementaire français
  (Article A. 47 A-1 du Livre des Procédures Fiscales)
- **Encodage** : UTF-8, séparateur tabulation, séparateur décimal virgule
- **Contenu** : **375** lignes d'écritures sur l'exercice 2025
- **Comptes représentés** : 60* (achats), 61*-62* (services), 63* (impôts),
  64* (personnel), 401* (fournisseurs auxiliaires)
- **Utilité** : Import dans ESG Flow → calcul automatique du **Scope 3 spend-based**
  avec les facteurs ADEME Base Carbone®. Les comptes 625100 (déplacements pro)
  alimentent le Scope 3 catégorie 6.

**Import sur la plateforme** : `Données → Import → FEC comptable`

### 2. `indicators-esg-2025.csv` — Indicateurs ESG
- **Format** : CSV avec en-tête, séparateur point-virgule
- **Contenu** : **58 indicateurs** couvrant les 12 normes ESRS :
  ESRS 2 transversal, E1 (climat), E2 (pollution), E3 (eau), E4 (biodiversité),
  E5 (économie circulaire), S1 (effectifs), S2 (chaîne de valeur), S3
  (communautés), S4 (consommateurs), G1 (gouvernance).
- **Utilité** : Import direct dans le module ESRS pour démarrer l'évaluation
  de conformité CSRD.

**Import sur la plateforme** : `Conformité → ESRS → Import CSV`

### 3. `suppliers-2025.csv` — Fournisseurs
- **Format** : CSV ; séparateur point-virgule
- **Contenu** : **15 fournisseurs** avec dépense annuelle, niveau de
  risque, scores ESG (E/S/G), statut d'audit (EcoVadis, rapport public, etc.)
- **Utilité** : Tester le module Supply Chain ESG / CSDDD,
  audits fournisseurs, cartographie des risques.

**Import sur la plateforme** : `Parties → Supply Chain ESG → Import`

### 4. `materiality-matrix-2025.csv` — Matrice de matérialité
- **Format** : CSV ; séparateur point-virgule
- **Contenu** : **10 enjeux ESG** notés sur deux axes (impact financier
  × impact ESG, échelle 0-100), avec verdict de matérialité (oui/non) et
  priorité (haute/moyenne/basse).
- **Utilité** : Tester le module **Matérialité CSRD** (double matérialité EFRAG).

**Import sur la plateforme** : `Analyses → Matérialité → Import`

### 5. `esg-risks-register-2025.csv` — Registre des risques ESG
- **Format** : CSV ; séparateur point-virgule
- **Contenu** : **8 risques** classés par catégorie (transition,
  opérationnel, réglementaire, réputationnel) avec probabilité × impact (1-5)
  et statut de mitigation.
- **Utilité** : Tester le module **Registre des Risques** + alignement TCFD.

**Import sur la plateforme** : `Analyses → Risques → Import`

### 6. `carbon-emissions-2025.csv` — Bilan carbone Scopes 1/2/3
- **Format** : CSV ; séparateur point-virgule
- **Contenu** : **21 sources d'émission** ventilées Scopes 1/2/3
  avec les 15 catégories GHG Protocol, méthode de calcul (spend-based,
  average-data, location-based, market-based) et valeurs en **tCO₂e**.
- **Total attendu** : ~2 300 tCO₂e (réaliste pour une PME services 87 ETP)
- **Utilité** : Tester le module **Bilan Carbone** + scores ESRS E1.

**Import sur la plateforme** : `Conformité → Bilan Carbone → Import`

### 7. `Aurora-Solutions-SAS-DATASET-2025.xlsx` — Classeur Excel complet
- **Format** : .xlsx avec **5 onglets** (Indicateurs, Carbone, Fournisseurs,
  Matérialité, Risques) + 1 onglet présentation.
- **Utilité** : Vue d'ensemble unique du dataset, plus pratique pour ouvrir
  dans Excel/LibreOffice. Mêmes données que les CSV séparés.

---

## 🚀 Ordre de test recommandé

1. **Créer un compte** sur https://greenconnect.cloud/register (essai ETI 14j)
2. **Compléter le profil organisation** avec les données ci-dessus (sirET,
   secteur, effectif…)
3. **Importer le FEC** (`851234567FEC20251231.txt`) → vérifier le calcul Scope 3
   automatique (~1 650 tCO₂e attendus sur cat 1)
4. **Importer le bilan carbone détaillé** (`carbon-emissions-2025.csv`) → vérifier
   le total ~2 300 tCO₂e
5. **Importer les indicateurs ESG** (`indicators-esg-2025.csv`) → score ESG global
   calculé sur les 12 normes
6. **Importer les fournisseurs** (`suppliers-2025.csv`) → score Supply Chain ESG
7. **Importer la matrice de matérialité** (`materiality-matrix-2025.csv`) → matrice 4
   quadrants prête
8. **Importer les risques** (`esg-risks-register-2025.csv`) → registre rempli avec scores
9. **Tester le benchmark sectoriel** : aller dans `Analyses → Benchmarking`,
   choisir le secteur "Services aux entreprises" et comparer Aurora vs
   référentiel sectoriel
10. **Générer un rapport CSRD** (`Rapports → Générer un rapport → CSRD`) →
    PDF + iXBRL avec toutes les données peuplées

## 🎯 Résultats attendus

Avec ces données, la plateforme devrait calculer :

- **Score ESG global** : ~ **72 / 100** (Note BBB)
- **Bilan carbone total** : **~2 300 tCO₂e** (Scope 3 = 99 % du total)
- **Score Supply Chain** : ~ **68 / 100** (15 fournisseurs évalués)
- **Couverture ESRS** : **58 / ~80 indicateurs prioritaires** = ~75 %
- **Risques critiques** : **3 risques** identifiés (cyberattaque, talents, CSRD vague 2)
- **Matrice de matérialité** : **9 enjeux matériels sur 10**
- **Délai de paiement fournisseurs** : 38 jours (conforme LME)
- **Gender pay gap** : 5,8 % (conforme Loi Avenir Pro)

## 📝 Notes importantes

- **Données fictives** — aucune entreprise réelle n'est concernée
- **SIREN 851234567** est volontairement invalide (algorithme de Luhn non
  conforme) pour éviter toute confusion avec une vraie société
- **Reproductibilité** : le script utilise `random.seed(42)`, donc régénérer
  le dataset produit exactement les mêmes valeurs
- **Régénération** :
  ```bash
  /Users/cisseniang/Downloads/esgplatform/.claude/worktrees/elastic-moore/backend/.venv/bin/python \
      scripts/generate_test_dataset.py
  ```

---

*Fichiers générés le 20/05/2026 à 20:06 par `scripts/generate_test_dataset.py`*
