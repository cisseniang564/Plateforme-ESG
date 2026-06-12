# Guide des fichiers de test E2E — ESG Flow

## Vue d'ensemble

| # | Fichier | Module testé | Format | Lignes |
|---|---------|-------------|--------|--------|
| 01 | `01_esg_environnemental_2025.csv` | Import ESG / Bilan Carbone | CSV standard | 48 indicateurs |
| 02 | `02_esg_social_2025.csv` | Import ESG / Scores | CSV standard | 47 indicateurs |
| 03 | `03_esg_gouvernance_2025.csv` | Import ESG / Conformité | CSV standard | 34 indicateurs |
| 04 | `04_esg_serie_temporelle_2023_2025.csv` | Dashboard / Tendances | CSV multi-années | 63 lignes × 3 ans |
| 05 | `05_fec_import_scope3.txt` | Connecteur Sage/Cegid | FEC pipe `\|` | 30 écritures |
| 06 | `06_indicateurs_codes_standardises.csv` | Import données legacy | CSV indicator_code | 72 indicateurs |
| 07 | `07_cas_limites_et_erreurs.csv` | Robustesse import | CSV edge cases | 20 cas limites |
| 08 | `08_donnees_mensuelles_2025.csv` | Dashboard temporel | CSV mensuel | 60 lignes mensuelles |
| 09 | `09_supply_chain_fournisseurs.csv` | Supply Chain ESG | CSV fournisseurs | 19 fournisseurs |
| 10 | `10_credits_carbone_offsets.csv` | Compensation Carbone | CSV crédits | 10 projets |
| 11 | `11_materiality_iros.csv` | Matrice de Matérialité | CSV IROs | 15 sujets |
| 12 | `12_fec_pennylane_format.csv` | Connecteur Pennylane | FEC point-virgule | 15 écritures |

---

## Scénarios de test par module

### 1. Import ESG générique (`POST /api/v1/esg-import/upload-preview`)

**Fichiers :** 01, 02, 03 (import normal) · 04 (multi-années) · 07 (edge cases)

```
Séquence :
1. Aller sur Import CSV → Glisser-déposer 01_esg_environnemental_2025.csv
2. Vérifier la prévisualisation : 48 lignes détectées, colonnes mappées automatiquement
3. Valider l'import → vérifier dans Dashboard que les indicateurs apparaissent
4. Recommencer avec 07_cas_limites_et_erreurs.csv → vérifier gestion erreurs
5. Tester 04_esg_serie_temporelle.csv → vérifier graphiques de tendance sur 3 ans
```

**Résultats attendus :**
- 01/02/03 : Import 100% sans erreur, piliers auto-détectés
- 04 : 3 points par indicateur → courbes de tendance dans dashboard
- 07 : Lignes valides importées, lignes invalides signalées avec message explicite

---

### 2. Bilan Carbone Scope 3 (`/app/carbon`)

**Fichiers :** 01 (Scope 1/2/3 par catégorie) · 08 (mensuel)

```
Séquence :
1. Importer 01_esg_environnemental_2025.csv (contient les 15 catégories Scope 3)
2. Aller sur Bilan Carbone → vérifier répartition 15 catégories
3. Cliquer "Décomposition complète →" → vérifier le graphique upstream/downstream
4. Importer 08_donnees_mensuelles_2025.csv → vérifier évolution mensuelle énergie
```

**Valeurs clés à vérifier :**
- Scope 1 total : 2 072.6 + 412.8 + 28.5 = 2 288.9 tCO2e
- Scope 2 LB : 1 124.6 tCO2e / MB : 312.4 tCO2e
- Scope 3 total : 23 149.2 tCO2e (Cat.1 = 55.5% du total)

---

### 3. Connecteur FEC Sage/Cegid (`POST /api/v1/connectors/sage-cegid/sync`)

**Fichiers :** 05 (pipe-séparé, décimales virgule) · 12 (point-virgule, décimales point)

```
Séquence :
1. Aller sur Connecteurs → Sage/Cegid
2. Uploader 05_fec_import_scope3.txt → vérifier auto-détection FEC
3. Contrôler mapping PCG : compte 601 → Cat.1 Achats, 606 → Énergie, 6241 → Transport, etc.
4. Valider → vérifier que des DataEntries Scope 3 sont créés
5. Uploader 12_fec_pennylane_format.csv → vérifier séparateur ";" géré
```

**Comptes PCG présents dans les fichiers :**
- 601x → Achats matières premières → Scope 3 Cat.1
- 606x → Énergie (électricité + gaz) → Scope 3 Cat.1 / Scope 1 (6063)
- 6241 → Transport marchandises → Scope 3 Cat.4
- 6244 → Transport avion → Scope 3 Cat.6
- 625 → Déplacements → Scope 3 Cat.6
- 613 → Loyers → Scope 3
- 615 → Entretien → Scope 3
- 641/645 → Charges salariales → Indicateur social (non CO2)

---

### 4. Dashboard Exécutif + Tendances

**Fichiers :** 04 (3 années) · 08 (mensuel)

```
Séquence :
1. Importer 04_esg_serie_temporelle_2023_2025.csv
2. Dashboard → vérifier score ESG calculé automatiquement
3. Vérifier graphique tendance Scope 1 : 2341 → 2187 → 2073 tCO2e (baisse régulière)
4. Vérifier KPI sociaux en amélioration : TF 18,2 → 14,8 → 11,5 (baisse = bonne)
5. Vérifier KPI gouvernance : taux féminisation CA 30% → 40% → 40%
```

---

### 5. Matrice de Matérialité (`/app/materiality`)

**Fichier :** 11 (15 sujets avec scores double matérialité)

```
Séquence :
1. Créer manuellement les sujets dans la Matrice (ou utiliser 11 comme référence)
2. Vérifier que les sujets "Critique" sont en haut à droite de la matrice
   - Changement climatique transition (4.35) → zone rouge
   - Marché ESG opportunité (4.36) → zone verte  
   - Supply chain (4.04) → zone orange
3. Tester le drag & drop pour repositionner
4. Vérifier les types IRO : Impact / Risque / Opportunité
5. Export PDF → vérifier que la matrice est dans le rapport
```

---

### 6. Supply Chain ESG (`/app/supply-chain`)

**Fichier :** 09 (19 fournisseurs avec scoring complet)

```
Séquence :
1. Créer les fournisseurs principaux (STEELCO, POLYM FRANCE, GEODIS, KUEHNE NAGEL)
2. Saisir les données du questionnaire depuis 09_supply_chain_fournisseurs.csv
3. Vérifier fournisseurs à risque :
   - TEXTIL MAROC → score 24.8/100 → risque CRITIQUE → alerte déclenchée
   - CHINE ELECTRO CO → score 48.4/100 → risque ÉLEVÉ
4. Vérifier fournisseurs exemplaires :
   - GREEN PACK ECO → score 98.4/100
   - THYSSENKRUPP → score 92.4/100 → certifié ISO 14001+45001+9001
5. Tester l'envoi de questionnaire vers TEXTIL MAROC
```

---

### 7. Compensation Carbone (`/app/decarb` ou module offsets)

**Fichier :** 10 (10 projets carbone)

```
Séquence :
1. Saisir les crédits du fichier 10_credits_carbone_offsets.csv
2. Vérifier distinction Évitement vs Retrait CDR
3. Vérifier calcul net : Scope 1+2+3 total - offsets = net
4. Vérifier avertissement SBTi : "Les offsets ne comptent pas vers Scope 1+2+3"
5. Vérifier les projets annulés (vintage 2024) vs actifs (2025)
```

**Total offsets annulés (vintage 2024 utilisés en reporting 2025) :**
- Conservation Amazonie : 500 tCO2e (Évitement VCS)
- Énergie solaire Kenya : 300 tCO2e (Évitement GS)
- Biogaz Inde : 200 tCO2e (Évitement VCS)
- Mangroves Sénégal : 400 tCO2e (Évitement+Retrait VCS)
- Cookstoves Rwanda : 180 tCO2e (Évitement GS) ← actif mais partiel
- BECCS UK : 100 tCO2e (Retrait CDR)

---

### 8. TCFD Builder (`/app/tcfd`)

**Pas de fichier CSV — test de saisie manuelle**

```
Séquence :
1. Ouvrir TCFD Builder → choisir référentiel TCFD
2. Pilier 1 — Gouvernance : renseigner comité RSE (4 réunions) + rémunération ESG CEO (30%)
3. Pilier 2 — Stratégie : coller risques de 11_materiality_iros.csv (colonnes horizon + magnitude)
4. Pilier 3 — Gestion risques : saisir processus identification (analyse double matérialité 2025)
5. Pilier 4 — Indicateurs : Scope 1 2073 / Scope 2 MB 312 / Scope 3 23149 / -11,4% vs 2023
6. Switcher vers ISSB S2 → vérifier que les paragraphes §6-§33 apparaissent
7. Exporter → vérifier fichier Markdown généré
8. Vérifier persistance localStorage : recharger la page → données toujours là
```

---

### 9. Indicateurs codes standardisés (`POST /api/v1/data/upload`)

**Fichier :** 06

```
Séquence :
1. Importer 06_indicateurs_codes_standardises.csv via page Upload Data
2. Vérifier que les codes GHG_SCOPE1_TOTAL, SAFETY_LTIR, etc. sont reconnus
3. Vérifier liaison automatique aux indicateurs ESRS (ex: GHG_SCOPE1 → ESRS E1-6)
4. Dashboard Scores → vérifier que le score ESG se recalcule
```

---

### 10. Test de robustesse (edge cases)

**Fichier :** 07

```
Résultats attendus ligne par ligne :
- Lignes 1-4 : Import OK (entier, virgule fr, %, float entier)
- Ligne 5 (valeur vide) : DataEntry créé avec value_numeric = NULL, value_text = NULL
- Ligne 6 (sans pilier) : Import OK, pilier = "environmental" par défaut ou auto-detect
- Ligne 7 (sans dates) : Import avec date = today() OU rejeté avec message
- Ligne 8 (nom >200 chars) : Tronqué à 200 chars sans crash
- Ligne 9 (accents) : Import OK — UTF-8 natif
- Ligne 10 (virgule dans guillemets) : Import OK — CSV parser correct
- Lignes 11-12 (doublon) : Les deux importées (pas de dédup silencieux)
- Ligne 13 (négatif) : Import OK
- Ligne 14 (zéro) : Import OK — zéro ≠ null
- Ligne 15 (très grand) : Import OK ou warning overflow float
- Ligne 16 (très petit) : Import OK — precision float
- Lignes 17-18 (passé/futur) : Import OK
- Lignes 19-20 (pilier majuscule/français) : Normalisé → "environmental"
```

---

## Données de référence pour les assertions

### Scopes GES 2025
```
Scope 1 : 2 288.9 tCO2e (stationnaire 1847.3 + mobile 412.8 + fuites 28.5 + procédés 0)
Scope 2 LB : 1 124.6 tCO2e | Scope 2 MB : 312.4 tCO2e
Scope 3 : 23 149.2 tCO2e (cat.1 à cat.15)
Total S1+S2+S3 MB : 25 750.5 tCO2e
Réduction vs 2023 (28 811.4) : -10.6%
Trajectoire SBTi 2033 : -50% vs 2023 → objectif 14 405.7 tCO2e
```

### Scores sociaux clés 2025
```
Effectif : 273 | ETP : 261.4 | Féminisation : 39.6% | Encadrement F : 34.1%
TF accidents : 11.5 | Formation : 26.7h/salarié | Turnover : 7.2%
Index égalité : 82/100 | Engagement : 74/100
```

### Scores gouvernance clés 2025
```
Indépendants CA : 60% | Féminisation CA : 40% | Présence CA : 91.4%
ESG dans variable CEO : 30% | Say on pay : 87.3%
Formation anticorruption : 78.4% | EcoVadis moyen fournisseurs : 52.4/100
```
