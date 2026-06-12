# ESG Flow — LinkedIn Outreach Helper

Mini-CRM Python qui prépare automatiquement tes messages LinkedIn personnalisés pour la phase de **discovery client**. **Le script n'envoie rien à LinkedIn directement** — il génère les drafts que tu copies-colles manuellement, ce qui te garde 100 % conforme aux conditions d'utilisation LinkedIn.

## ✨ Ce que ça fait

| Capacité | Comment |
|----------|---------|
| 🎯 **Personnalisation par persona** | 6 templates de connexion + 5 DM (RSE, DAF, Risk, DG, CSO) |
| 🎲 **Variantes par trigger** | Post LinkedIn, nouvelle nomination, warm intro |
| 📧 **Enrichissement email** | Snov.io API free tier (50/mois) avec cache |
| 📋 **Pipeline tracking** | Statuts + dates de relance calculées automatiquement |
| 🔔 **Relances dues** | Liste quotidienne des actions à faire |
| 📊 **Notion export** | CSV importable directement dans ta base Notion |
| 📈 **Stats funnel** | Taux d'acceptation, booking, entretien |

## 🚀 Installation (5 minutes)

### 1. Cloner le dossier

```bash
cd /Users/cisseniang/Downloads/esgplatform/scripts/linkedin_outreach
```

### 2. Créer un environnement virtuel Python

```bash
python3 -m venv .venv
source .venv/bin/activate           # macOS / Linux
# .venv\Scripts\activate            # Windows
```

### 3. Installer les dépendances

```bash
pip install -r requirements.txt
```

### 4. Initialiser

```bash
python outreach.py init
```

Ce qui crée :
- `.env` (à éditer avec tes infos)
- `data/prospects.csv` (à éditer avec tes prospects)
- `data/drafts/` (où seront générés les messages)

### 5. Configurer

Édite `.env` :

```bash
SENDER_FIRST_NAME=Ton prénom
SENDER_LAST_NAME=Ton nom
SENDER_TITLE=Fondateur ESG Flow
CALENDLY_LINK=https://calendly.com/ton-handle/decouverte-esg
```

(Optionnel) inscris-toi sur [Snov.io](https://app.snov.io) et récupère tes API keys :

```bash
SNOV_USER_ID=...
SNOV_API_SECRET=...
```

## 📚 Workflow complet

### Étape 1 — Remplir la liste de prospects

Édite `data/prospects.csv`. Colonnes obligatoires :

| Colonne | Valeurs | Description |
|---------|---------|-------------|
| `first_name` | Marie | Prénom |
| `last_name` | Lefèvre | Nom |
| `company` | Acme Food SAS | Entreprise |
| `linkedin_url` | https://linkedin.com/in/... | URL profil LinkedIn |
| `role` | `RSE`, `DAF`, `Risk`, `DG`, `CSO`, `Compliance` | Rôle (détermine le template) |

Colonnes optionnelles (améliorent la personnalisation) :

| Colonne | Valeurs | Effet |
|---------|---------|-------|
| `size` | 800 | Inclus dans certains templates |
| `sector` | `agro`, `industrie`, `distribution`, `pharma`, `tech` | Personnalise le DM RSE |
| `csrd_wave` | `2024`, `2025`, `2026`, `2027` | Inclus dans la note connexion |
| `trigger` | `post sur ESRS du 12/05`, `nommée CSO en mars`, `warm intro: X` | Sélectionne automatiquement un template variante |

**Tip** : utilise le script Tampermonkey (`bonus/linkedin_to_csv.user.js`) pour copier un profil LinkedIn dans le presse-papier au format CSV.

### Étape 2 — Enrichir avec les emails (optionnel)

```bash
python outreach.py enrich
```

Le script :
- Lit `data/prospects.csv`
- Pour chaque prospect sans email, interroge Snov.io
- Met le résultat en cache (`data/.snov_cache.json`) — pas de double-paiement de crédits
- Met à jour le CSV

### Étape 3 — Générer les drafts personnalisés

```bash
python outreach.py drafts
```

Pour chaque prospect avec `status=Liste`, génère un fichier Markdown dans `data/drafts/` :

```
data/drafts/marie-lefevre-acme-food-sas.md
```

Chaque fichier contient :
1. La **note de connexion** (≤ 300 caractères, vérifié)
2. Le **DM post-connexion** (≤ 800 caractères)
3. La **relance J+5**
4. La **relance J+12**

Tu n'as plus qu'à ouvrir le fichier, copier le bloc, et le coller dans LinkedIn.

### Étape 4 — Envoyer manuellement, mettre à jour le CSV

Après chaque envoi, mets à jour ton CSV :

```csv
status,date_connection_sent
"Connexion envoyée",2026-05-28
```

Statuts disponibles :
- `Liste` — pas encore contacté
- `Connexion envoyée`
- `Connecté` — connexion acceptée
- `DM envoyé`
- `Relance 1`
- `Relance 2`
- `Réponse positive`
- `Booké` — RDV calé
- `Entretien fait`
- `Cold` — pas de réponse après 2 relances
- `NoFit` — ne correspond pas à l'ICP

### Étape 5 — Voir les actions du jour

```bash
python outreach.py pipeline
```

Affiche :
- 📋 Connexions à envoyer (status = Liste)
- 💬 DM à envoyer (connexions acceptées)
- 🔄 Relances J+5 dues
- 🔁 Relances J+12 dues

### Étape 6 — Exporter vers Notion (optionnel)

```bash
python outreach.py notion
```

Génère `data/pipeline_notion.csv` avec les bons noms de colonnes en français. Dans Notion :

1. Crée une nouvelle Base
2. Vue → ⋯ → **Importer**
3. Sélectionne le CSV
4. Mappe les colonnes (Notion détecte automatiquement)

### Étape 7 — Stats de conversion

```bash
python outreach.py stats
```

```
Pipeline funnel (50 prospects)
─────────────────────────────────────
Statut                Nombre  % total
─────────────────────────────────────
Liste                     25      50%
Connexion envoyée         15      30%
Connecté                   6      12%
DM envoyé                  4       8%

Conversion :
  Acceptation     : 40%
  Booking         : 4%
  Entretiens faits: 2%
```

## 🛠️ Personnaliser les templates

Tous les templates sont dans `templates/*.j2` (syntaxe Jinja2). Variables disponibles :

| Variable | Source |
|----------|--------|
| `{{ first_name }}`, `{{ last_name }}`, `{{ company }}` | CSV |
| `{{ role }}`, `{{ role_label }}`, `{{ size }}`, `{{ sector }}`, `{{ csrd_wave }}` | CSV |
| `{{ trigger }}` | CSV |
| `{{ calendly_link }}`, `{{ sender_first_name }}`, `{{ sender_last_name }}`, `{{ sender_title }}` | .env |

Modifications conditionnelles possibles :

```jinja
{% if sector == 'agro' %}
L'agroalimentaire est particulièrement scruté...
{% elif sector == 'industrie' %}
L'industrie est en première ligne...
{% endif %}
```

## 🏗️ Architecture

```
scripts/linkedin_outreach/
├── outreach.py              ← CLI principal
├── requirements.txt
├── .env.example             ← À copier en .env
├── README.md                ← Ce fichier
│
├── templates/
│   ├── connection_rse.j2    ← Note de connexion RSE
│   ├── connection_daf.j2    ← Note de connexion DAF
│   ├── connection_risk.j2   ← Note de connexion Risk
│   ├── connection_dg.j2     ← Note de connexion DG
│   ├── connection_cso.j2    ← Note de connexion CSO
│   ├── connection_signal_post.j2   ← Variante : prospect a posté récemment
│   ├── connection_new_role.j2      ← Variante : nouvelle nomination
│   ├── connection_warm_intro.j2    ← Variante : intro chaude
│   ├── dm_rse.j2 / dm_daf.j2 / dm_risk.j2 / dm_dg.j2 / dm_cso.j2
│   ├── relance_j5.j2
│   └── relance_j12.j2
│
└── data/
    ├── prospects.csv        ← Ta base de prospects (created by init)
    ├── prospects_example.csv ← Exemple fourni
    ├── pipeline_notion.csv  ← Export Notion (généré)
    ├── .snov_cache.json     ← Cache Snov.io (auto)
    └── drafts/              ← Drafts par prospect (.md)
        ├── marie-lefevre-....md
        └── ...
```

## 🛡️ Pourquoi pas d'envoi automatique LinkedIn ?

- LinkedIn interdit l'automatisation dans ses ToS (Article 8.2)
- Les outils d'automatisation peuvent te faire bannir ton compte
- L'envoi automatique tue la personnalisation → taux de réponse divisé par 5
- Pour la discovery (ta phase), la qualité > volume

Ce script t'aide à **scaler la qualité**, pas à spammer.

## 🆘 Troubleshooting

**`ModuleNotFoundError: No module named 'click'`**

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

**Note de connexion > 300 caractères**

Le draft affiche `⚠ TROP LONG` → édite le template `templates/connection_*.j2` pour raccourcir, ou réduit les variables qui s'y insèrent.

**Snov.io ne trouve pas l'email**

Le free tier a 50 crédits/mois. Si dépassé, attends le mois prochain ou crée un 2ème compte. Tu peux aussi essayer Apollo.io en parallèle (60/mois free).

## 📜 Conformité

- **LinkedIn ToS** : aucun envoi automatique, le script ne fait que générer du texte.
- **RGPD** : tu collectes des données publiques (LinkedIn) pour intérêt légitime (B2B prospection). Tiens un registre simple des prospects + opt-out en fin de chaque message.
- **CNIL** : pour <1000 prospects automatisés, pas de DPA obligatoire.
