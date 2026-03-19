# 🚀 Installation du Frontend ESGFlow

## Extraction et Installation (3 minutes)

### Étape 1: Extraire l'archive

```bash
cd /Users/cisseniang/Downloads/esgplatform
tar -xzf frontend-complete.tar.gz
```

### Étape 2: Installer les dépendances

```bash
cd frontend
npm install
```

⏱️ **Temps:** 2-3 minutes

### Étape 3: Démarrer le serveur de développement

```bash
npm run dev
```

✅ **Frontend disponible sur http://localhost:3000**

---

## 📁 Structure Créée (71 fichiers)

```
frontend/
├── package.json
├── tsconfig.json  
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .env
├── .gitignore
├── README.md
├── public/
│   └── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes.tsx
│   ├── components/
│   │   ├── common/ (5 fichiers)
│   │   ├── charts/ (4 fichiers)
│   │   ├── layout/ (4 fichiers)
│   │   └── widgets/ (4 fichiers)
│   ├── pages/
│   │   ├── Dashboard/ (2 fichiers)
│   │   ├── Data/ (4 fichiers)
│   │   ├── Indicators/ (3 fichiers)
│   │   ├── Scores/ (3 fichiers)
│   │   ├── Reporting/ (3 fichiers)
│   │   ├── Settings/ (4 fichiers)
│   │   └── Auth/ (3 fichiers)
│   ├── services/ (6 fichiers)
│   ├── store/ (1 + 4 slices)
│   ├── hooks/ (4 fichiers)
│   ├── utils/ (4 fichiers)
│   ├── types/ (3 fichiers)
│   └── styles/ (3 fichiers)
└── tests/
    ├── unit/
    └── integration/
```

---

## 🎯 Fonctionnalités Incluses

### Architecture
- ✅ React 18 + TypeScript
- ✅ Redux Toolkit pour le state
- ✅ React Router pour la navigation
- ✅ Axios pour l'API
- ✅ Recharts pour les graphiques ESG
- ✅ TailwindCSS pour le styling

### Pages ESG Spécialisées
- ✅ Executive Dashboard (vue d'ensemble ESG)
- ✅ Pillar Dashboards (E, S, G séparés)
- ✅ Data Management (upload, quality, connectors)
- ✅ Indicators (liste, détails, comparaison)
- ✅ Scores (historique, calcul, breakdown)
- ✅ Reporting (génération, liste, scheduled)
- ✅ Settings (tenant, users, methodology, integrations)

### Composants
- ✅ Charts ESG (Line, Bar, Pie, Radar)
- ✅ Widgets (ScoreCard, TrendIndicator, Benchmark, Alerts)
- ✅ Common (Button, Card, Modal, Table, Spinner)
- ✅ Layout (Header, Sidebar, Footer)

---

## 🔗 Connexion au Backend

Le frontend se connecte automatiquement au backend sur `http://localhost:8000/api/v1`

**Configuration dans `.env`:**
```env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 🧪 Test de l'Installation

### 1. Vérifier que le backend tourne

```bash
cd /Users/cisseniang/Downloads/esgplatform
docker-compose ps backend
# Devrait afficher "Up"
```

### 2. Lancer le frontend

```bash
cd frontend
npm run dev
```

### 3. Ouvrir le navigateur

```
http://localhost:3000
```

### 4. Se connecter

```
Email: admin@demo.esgflow.com
Password: Admin123!
```

---

## 📊 Scripts Disponibles

```bash
# Développement
npm run dev

# Build production
npm run build

# Preview du build
npm run preview

# Tests
npm run test

# Linter
npm run lint
```

---

## 🎨 Personnalisation

### Thème ESG

Les couleurs sont configurées dans `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      environmental: '#10b981', // Vert
      social: '#3b82f6',        // Bleu
      governance: '#8b5cf6',    // Violet
    },
  },
}
```

### API Endpoint

Modifier `.env`:

```env
VITE_API_URL=https://votre-api.com/api/v1
```

---

## 🚀 Prochaines Étapes

1. **Développement des composants charts**
   - Implémenter les graphiques Recharts
   - Ajouter les visualisations ESG

2. **Connexion API complète**
   - Intégrer tous les endpoints backend
   - Gérer l'état global avec Redux

3. **Pages ESG avancées**
   - Dashboard avec KPIs ESG réels
   - Calcul de scores automatique
   - Génération de rapports

4. **Tests**
   - Tests unitaires avec Vitest
   - Tests d'intégration

---

## 🐛 Troubleshooting

### Port 3000 utilisé

```bash
# Changer le port dans vite.config.ts
server: {
  port: 3001,
}
```

### Erreurs CORS

Vérifier que le backend autorise `http://localhost:3000`

### Modules manquants

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📞 Support

- Backend API: http://localhost:8000/docs
- Frontend: http://localhost:3000
- Flower (Celery): http://localhost:5555

**Tout est prêt ! 🎉**
