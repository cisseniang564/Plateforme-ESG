# 📊 GUIDE D'UTILISATION DES FICHIERS DE TEST

## 📁 FICHIERS DISPONIBLES

### 1️⃣ **01_donnees_environnementales.csv**
- **Contenu**: Indicateurs environnementaux (E)
- **Usage**: Tester import données climat, énergie, eau, déchets
- **Exemples de calculs possibles**:
  - Scope 3 = Scope 1 + Scope 2 = 1250 + 580 = **1830 tCO2e**
  - Intensité carbone = (1250 + 580) / 50 M€ = **36.6 tCO2e/M€**
  - % énergies renouvelables = 2100 / 3500 = **60%**
  - Taux recyclage = 315 / 450 = **70%**

### 2️⃣ **02_donnees_sociales.csv**
- **Contenu**: Indicateurs sociaux (S)
- **Usage**: Tester import RH, formation, sécurité
- **Exemples de calculs possibles**:
  - Taux de turnover = 42 / 450 × 100 = **9.3%**
  - Part de femmes = 195 / 450 × 100 = **43.3%**
  - Taux de formation = 9000 / 450 = **20 h/employé**
  - Taux de fréquence accidents = 8 / (450 × 1600) × 1000000 = **11.1**

### 3️⃣ **03_donnees_gouvernance.csv**
- **Contenu**: Indicateurs gouvernance (G)
- **Usage**: Tester import conseil, éthique, conformité
- **KPIs**: Indépendance CA, diversité, formation ESG

### 4️⃣ **04_donnees_completes_2026.csv**
- **Contenu**: Tous piliers E+S+G pour une organisation
- **Usage**: Import complet pour tester tableau de bord
- **Organisation**: Acme Corp (exemple fictif)

### 5️⃣ **05_evolution_temporelle.csv**
- **Contenu**: Évolution 2024-2026 des indicateurs clés
- **Usage**: Tester graphiques d'évolution, tendances
- **Analyses**: Progression % renouvelables, réduction émissions

### 6️⃣ **06_template_import_vide.csv**
- **Contenu**: Template à remplir
- **Usage**: Guide pour créer vos propres fichiers d'import

---

## 🧪 SCÉNARIOS DE TEST

### TEST 1: Import basique
```
1. Allez sur http://localhost:3000/app/import-csv
2. Chargez: 01_donnees_environnementales.csv
3. Mappez les colonnes (auto-détecté)
4. Importez
5. Vérifiez dans "Mes Données"
```

### TEST 2: Calculs automatiques
```
1. Importez: 04_donnees_completes_2026.csv
2. Allez sur: /app/calculated-metrics
3. Vérifiez les calculs:
   - Scope 3 total
   - Intensité carbone
   - % renouvelables
   - Taux turnover
   - Taux formation
   - % femmes
```

### TEST 3: Détection anomalies IA
```
1. Importez: 01_donnees_environnementales.csv
2. Allez sur: /app/intelligence
3. Vérifiez détection anomalies
4. Consultez suggestions IA
```

### TEST 4: Génération rapport PDF
```
1. Importez: 04_donnees_completes_2026.csv
2. Allez sur: /app/reports/generate
3. Sélectionnez: Rapport CSRD
4. Année: 2026
5. Générez le PDF
6. Vérifiez tableaux par pilier
```

### TEST 5: Évolution temporelle
```
1. Importez: 05_evolution_temporelle.csv
2. Allez sur: /app/indicators
3. Sélectionnez un indicateur
4. Vérifiez évolution 2024→2026
```

---

## 📊 RÉSULTATS ATTENDUS

### Calculs automatiques attendus:
- **Scope 3 total**: 1830 tCO2e
- **Intensité carbone**: 36.6 tCO2e/M€
- **% Énergies renouvelables**: 60%
- **Taux turnover**: 9.3%
- **Taux formation**: 20 h/employé
- **% Femmes**: 43.3%

### Scores ESG (exemple):
- **Environnemental (E)**: 72/100 (bon progrès renouvelables)
- **Social (S)**: 68/100 (diversité à améliorer)
- **Gouvernance (G)**: 85/100 (excellence)
- **Score global**: 75/100 (B+)

---

## 💡 CONSEILS

1. **Commencez par**: 04_donnees_completes_2026.csv
2. **Testez les calculs**: Vérifiez formules dans /calculated-metrics
3. **Détection IA**: Vérifiez que les valeurs normales ne déclenchent pas d'alertes
4. **Rapports PDF**: Téléchargez et vérifiez le rendu professionnel

---

## 🐛 DÉPANNAGE

**Erreur d'import?**
- Vérifiez que les noms de colonnes correspondent
- UTF-8 encodage requis
- Format dates: YYYY-MM-DD

**Calculs incorrects?**
- Vérifiez que metric_name correspond exactement
- Vérifiez les unités (tCO2e, MWh, etc.)

**Anomalies détectées à tort?**
- Normal si peu de données historiques
- L'IA apprend avec le volume

---

Bon test ! 🚀
