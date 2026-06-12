---
title: "ESG Flow — Outreach Cheat Sheet"
---

<div class="cheat-sheet">

<div class="header-band">
<h1>ESG Flow — Outreach Cheat Sheet</h1>
<p>1 page · 1 process · 4 semaines · 15-20 entretiens</p>
</div>

<div class="grid-2col">

<div class="box box-emerald">
<h2>🚀 SETUP — 1 seule fois (15 min)</h2>

```bash
cd scripts/linkedin_outreach
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python outreach.py init
```

Puis éditer `.env` :
- `SENDER_FIRST_NAME` / `_LAST_NAME`
- `CALENDLY_LINK`

Optionnel : ajouter `SNOV_USER_ID` / `SNOV_API_SECRET` pour l'enrichissement email.

Installer **Tampermonkey** Chrome + activer le script `bonus/linkedin_to_csv.user.js`.

</div>

<div class="box box-blue">
<h2>📅 RYTHME HEBDO</h2>

**Lundi (1 h)** — Sourcing
LinkedIn boolean → Tampermonkey "📋 CSV" → `data/prospects.csv`

**Lundi 17h (15 min)** — Génération
`python outreach.py drafts`

**Mardi-Jeudi 9-11h (3 × 1 h)** — Envoi
Copier-coller depuis `data/drafts/*.md` → LinkedIn

**Chaque matin (5 min)** — Pilotage
`python outreach.py pipeline`

**Vendredi 17h (15 min)** — Bilan
`python outreach.py stats`

</div>

</div>

<div class="box box-violet">
<h2>⌨️ 5 COMMANDES — UN SEUL ENDROIT À MÉMORISER</h2>

| Commande | Quand | Effet |
|----------|-------|-------|
| `python outreach.py init` | 1× au setup | Crée `.env` + `data/prospects.csv` |
| `python outreach.py enrich` | Hebdo (optionnel) | Recherche emails via Snov.io |
| `python outreach.py drafts` | Après chaque batch de sourcing | Génère 4 messages par prospect (`data/drafts/*.md`) |
| `python outreach.py pipeline` | **Chaque matin** | Liste ce qu'il faut envoyer aujourd'hui |
| `python outreach.py stats` | Hebdo | Funnel acceptation / booking / entretiens |

⚠️ Avant chaque session : `source .venv/bin/activate`

</div>

<div class="grid-3col">

<div class="box box-amber">
<h2>🎯 STATUTS CSV</h2>

Dans `data/prospects.csv`, colonne `status` :

- `Liste` (défaut)
- `Connexion envoyée`
- `Connecté`
- `DM envoyé`
- `Relance 1`
- `Relance 2`
- `Réponse positive`
- `Booké`
- `Entretien fait`
- `Cold` (ghosté)
- `NoFit`

</div>

<div class="box box-cyan">
<h2>🔍 BOOLEAN LINKEDIN</h2>

Copier-coller dans la recherche :

**RSE** :
```
("responsable RSE" OR
"directeur RSE" OR
"CSO") AND France
```

**DAF** :
```
("DAF" OR "directeur
financier" OR "CFO")
AND France -comptable
```

**Risk** :
```
("risk manager" OR
"responsable conformité")
AND France
```

Filtres : Lieu = France, Niveau ≥ Cadre supérieur

</div>

<div class="box box-rose">
<h2>📚 DOCS</h2>

**Quand lire quoi ?**

- **INTERNAL_GAPS_AUDIT.pdf**
  → Stratégie produit (1×)

- **USER_RESEARCH_PLAYBOOK.pdf**
  → Avant chaque entretien (script de questions)

- **LINKEDIN_OUTREACH_BATCH1.pdf**
  → Référence templates (1×)

- **README.md** du script
  → Si bug ou question CLI

- **CHEAT_SHEET.pdf** (ce doc)
  → À côté de l'écran

</div>

</div>

<div class="box box-dark">
<h2>🎬 LE FLOW EN UNE LIGNE</h2>

LinkedIn → Tampermonkey → `prospects.csv` → `drafts` → copier-coller LinkedIn → mise à jour CSV → `pipeline` lendemain

</div>

<div class="footer">
ESG Flow — greenconnect.cloud · Cheat sheet v1 — 27/05/2026
</div>

</div>
