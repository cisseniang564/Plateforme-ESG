/**
 * ESGFlow — Guide de présentation client
 * Génère un document Word professionnel A à Z
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, ExternalHyperlink,
  LevelFormat, TableOfContents, UnderlineType,
} = require('docx');
const fs = require('fs');

// ─── Palette ESGFlow ──────────────────────────────────────────────────────────
const C_NAVY    = '0F172A';
const C_GREEN   = '059669';
const C_GREEN_L = 'D1FAE5';  // emerald-100
const C_BLUE    = '2563EB';
const C_PURPLE  = '7C3AED';
const C_GRAY_H  = 'F8FAFC';  // slate-50
const C_GRAY_B  = 'E2E8F0';  // slate-200
const C_WHITE   = 'FFFFFF';
const C_TEXT    = '1E293B';   // slate-800
const C_LIGHT   = 'F0FDF4';  // green-50

// ─── Helpers ──────────────────────────────────────────────────────────────────

const border = (color = C_GRAY_B, size = 4) => ({
  style: BorderStyle.SINGLE, size, color,
});
const noBorder = () => ({ style: BorderStyle.NONE, size: 0, color: C_WHITE });
const cellBorders = (color = C_GRAY_B) => ({
  top: border(color), bottom: border(color),
  left: border(color), right: border(color),
});
const noBorders = () => ({
  top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder(),
});

function h(text, level, color = C_NAVY, spacing = { before: 280, after: 160 }) {
  return new Paragraph({
    heading: level,
    spacing,
    children: [new TextRun({ text, color, bold: true,
      size: level === HeadingLevel.HEADING_1 ? 36 : level === HeadingLevel.HEADING_2 ? 28 : 24,
      font: 'Arial',
    })],
  });
}

function p(text, { bold = false, color = C_TEXT, size = 22, italic = false, center = false, spacing = { before: 80, after: 100 } } = {}) {
  const parts = typeof text === 'string' ? [{ text }] : text;
  return new Paragraph({
    alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing,
    children: parts.map(part =>
      new TextRun({
        text: typeof part === 'string' ? part : part.text,
        bold: typeof part === 'string' ? bold : (part.bold ?? bold),
        italic: typeof part === 'string' ? italic : (part.italic ?? italic),
        color: typeof part === 'string' ? color : (part.color ?? color),
        size: typeof part === 'string' ? size : (part.size ?? size),
        font: 'Arial',
      })
    ),
  });
}

function spacer(lines = 1) {
  return Array.from({ length: lines }, () =>
    new Paragraph({ children: [new TextRun('')], spacing: { before: 0, after: 80 } })
  );
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { before: 40, after: 60 },
    children: [new TextRun({ text, size: 22, font: 'Arial', color: C_TEXT })],
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'numbers', level },
    spacing: { before: 60, after: 80 },
    children: [new TextRun({ text, size: 22, font: 'Arial', color: C_TEXT })],
  });
}

function sectionDivider(title, color = C_GREEN) {
  return new Paragraph({
    spacing: { before: 360, after: 240 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color } },
    children: [
      new TextRun({ text: '  ', font: 'Arial' }),
      new TextRun({ text: title, bold: true, size: 32, color, font: 'Arial' }),
    ],
  });
}

function infoBox(lines, bgColor = C_GREEN_L, borderColor = C_GREEN) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        borders: cellBorders(borderColor),
        shading: { fill: bgColor, type: ShadingType.CLEAR },
        margins: { top: 160, bottom: 160, left: 240, right: 240 },
        width: { size: 9360, type: WidthType.DXA },
        children: lines.map(line =>
          typeof line === 'string'
            ? p(line, { size: 22, color: C_TEXT })
            : line
        ),
      })],
    })],
  });
}

function twoCol(left, right, widths = [4600, 4600]) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: noBorders(),
          width: { size: widths[0], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 0, right: 160 },
          children: Array.isArray(left) ? left : [left],
        }),
        new TableCell({
          borders: noBorders(),
          width: { size: widths[1], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 160, right: 0 },
          children: Array.isArray(right) ? right : [right],
        }),
      ],
    })],
  });
}

function featureTable(headers, rows, colWidths) {
  const total = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => new TableCell({
          borders: cellBorders(C_GREEN),
          shading: { fill: C_NAVY, type: ShadingType.CLEAR },
          width: { size: colWidths[i], type: WidthType.DXA },
          margins: { top: 120, bottom: 120, left: 160, right: 160 },
          children: [new Paragraph({
            children: [new TextRun({ text: h, bold: true, color: C_WHITE, size: 20, font: 'Arial' })],
          })],
        })),
      }),
      ...rows.map((row, ri) => new TableRow({
        children: row.map((cell, ci) => new TableCell({
          borders: cellBorders(C_GRAY_B),
          shading: { fill: ri % 2 === 0 ? C_WHITE : C_GRAY_H, type: ShadingType.CLEAR },
          width: { size: colWidths[ci], type: WidthType.DXA },
          margins: { top: 100, bottom: 100, left: 160, right: 160 },
          children: [new Paragraph({
            children: [new TextRun({ text: cell, size: 20, font: 'Arial', color: C_TEXT })],
          })],
        })),
      })),
    ],
  });
}

// ─── Cover page ───────────────────────────────────────────────────────────────

const cover = [
  // Hero band
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        shading: { fill: C_NAVY, type: ShadingType.CLEAR },
        borders: noBorders(),
        margins: { top: 640, bottom: 640, left: 480, right: 480 },
        width: { size: 9360, type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 120 },
            children: [new TextRun({ text: 'ESGFlow', bold: true, size: 80, color: C_WHITE, font: 'Arial' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 200 },
            children: [new TextRun({ text: 'Plateforme de Pilotage ESG & CSRD', size: 36, color: 'A7F3D0', font: 'Arial', italic: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '─────────────────────────────────────', color: '334155', font: 'Arial', size: 16 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 160, after: 0 },
            children: [new TextRun({ text: 'Guide d\'utilisation complet', size: 28, color: '94A3B8', font: 'Arial' })],
          }),
        ],
      })],
    })],
  }),

  ...spacer(2),

  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text: 'À l\'attention des Directions ESG, RSE & Finance', size: 24, italic: true, color: '64748B', font: 'Arial' })],
  }),

  ...spacer(1),

  // 3 pillars summary table
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3120, 3120, 3120],
    rows: [new TableRow({
      children: [
        ['🌱  Environnement', 'Émissions · Énergie · Eau · Biodiversité'],
        ['👥  Social', 'Emploi · Formation · Diversité · Santé'],
        ['🏛  Gouvernance', 'Éthique · Transparence · Conformité'],
      ].map(([title, desc]) => new TableCell({
        borders: cellBorders(C_GREEN),
        shading: { fill: C_LIGHT, type: ShadingType.CLEAR },
        width: { size: 3120, type: WidthType.DXA },
        margins: { top: 160, bottom: 160, left: 200, right: 200 },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: title, bold: true, size: 22, color: C_NAVY, font: 'Arial' })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: desc, size: 18, color: '64748B', font: 'Arial' })] }),
        ],
      })),
    })],
  }),

  ...spacer(2),

  // Meta info
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    rows: [
      [['Version', '2.0 — 2026'], ['Confidentialité', 'Usage commercial']],
      [['Plateforme', 'ESGFlow SaaS · Cloud EU'], ['Contact', 'contact@esgflow.io']],
    ].map(row => new TableRow({
      children: row.map(([label, value]) => new TableCell({
        borders: { top: noBorder(), bottom: border(C_GRAY_B, 2), left: noBorder(), right: noBorder() },
        shading: { fill: C_WHITE, type: ShadingType.CLEAR },
        width: { size: 4680, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 0, right: 160 },
        children: [new Paragraph({ children: [
          new TextRun({ text: `${label} : `, bold: true, size: 20, color: C_NAVY, font: 'Arial' }),
          new TextRun({ text: value, size: 20, color: '475569', font: 'Arial' }),
        ]})],
      })),
    })),
  }),

  new Paragraph({ children: [new PageBreak()] }),
];

// ─── Document sections ────────────────────────────────────────────────────────

const sections_content = [

  // ── TABLE DES MATIÈRES ───────────────────────────────────────────────────
  new TableOfContents('Table des matières', {
    hyperlink: true,
    headingStyleRange: '1-3',
    stylesWithLevels: [{ styleName: 'Heading1', level: 1 }],
  }),
  new Paragraph({ children: [new PageBreak()] }),

  // ── 1. PRÉSENTATION ─────────────────────────────────────────────────────
  sectionDivider('1. Présentation de la plateforme'),

  h('Qu\'est-ce qu\'ESGFlow ?', HeadingLevel.HEADING_1),
  p('ESGFlow est une plateforme SaaS B2B dédiée au pilotage ESG (Environnement, Social, Gouvernance) et à la conformité réglementaire CSRD pour les ETI et grandes entreprises européennes.'),
  p('Elle centralise l\'ensemble du cycle de vie de la donnée ESG : collecte, vérification, scoring, analyse prédictive et reporting réglementaire, en un seul outil intégré.'),

  ...spacer(1),

  infoBox([
    p([{ text: '💡 Pourquoi ESGFlow ?', bold: true, size: 22, color: C_NAVY }], {}),
    p('La directive CSRD (Corporate Sustainability Reporting Directive) impose depuis 2024 un reporting ESG standardisé selon les ESRS (European Sustainability Reporting Standards). Sans outillage dédié, cette obligation mobilise des équipes entières pour des tâches manuelles chronophages et sources d\'erreurs.'),
  ]),

  ...spacer(1),

  h('Pour qui ?', HeadingLevel.HEADING_2),
  featureTable(
    ['Profil', 'Cas d\'usage principal', 'Valeur ajoutée'],
    [
      ['Direction RSE / ESG', 'Pilotage des indicateurs, reporting CSRD', 'Gain de temps ×10 sur la collecte'],
      ['Direction Financière (CFO)', 'Scoring ESG, conformité taxonomie UE', 'Réduction du risque réglementaire'],
      ['Direction Achats', 'Évaluation fournisseurs ESG', 'Sécurisation de la chaîne d\'approvisionnement'],
      ['Auditeurs / Commissaires aux comptes', 'Traçabilité, piste d\'audit', 'Données vérifiées et certifiables'],
      ['Direction Générale', 'Vue exécutive, benchmarking sectoriel', 'Décisions stratégiques basées sur les données'],
    ],
    [2400, 3500, 3460]
  ),

  ...spacer(1),

  h('Couverture réglementaire', HeadingLevel.HEADING_2),
  featureTable(
    ['Standard', 'Périmètre', 'Statut'],
    [
      ['CSRD / ESRS', 'Tous piliers E, S, G — 100+ indicateurs', '✅ Intégré'],
      ['GRI (Global Reporting Initiative)', 'Standards universels & sectoriels', '✅ Intégré'],
      ['TCFD', 'Risques climatiques & financiers', '✅ Intégré'],
      ['Taxonomie UE', 'Alignement activités durables', '✅ Intégré'],
      ['CDP', 'Disclosure environnement & eau', '🔜 Roadmap 2026'],
      ['SFDR', 'Reporting durabilité fonds', '🔜 Roadmap 2026'],
    ],
    [2800, 4000, 2560]
  ),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 2. DÉMARRAGE ─────────────────────────────────────────────────────────
  sectionDivider('2. Prise en main — De zéro au premier rapport'),

  h('Étape 1 — Création du compte et de l\'espace tenant', HeadingLevel.HEADING_1),
  p('Chaque entreprise dispose de son propre espace isolé (tenant). La création se fait en 3 clics depuis la page d\'accueil.'),

  ...spacer(1),

  featureTable(
    ['Champ', 'Description', 'Exemple'],
    [
      ['Nom de l\'organisation', 'Raison sociale complète', 'DIOP ESG SAS'],
      ['Slug / Identifiant URL', 'Identifiant unique en minuscules', 'diop-esg'],
      ['Plan tarifaire', 'Starter · Pro · Enterprise', 'Pro (50 utilisateurs)'],
      ['Email administrateur', 'Identifiant de connexion principal', 'admin@diop-esg.com'],
      ['Mot de passe', 'Minimum 8 caractères, 1 majuscule, 1 chiffre', '—'],
    ],
    [2400, 4000, 2960]
  ),

  ...spacer(1),

  infoBox([
    p([{ text: '⚡ Activation automatique à la création : ', bold: true, size: 22 }, { text: 'période d\'essai 14 jours · clé API générée · email de bienvenue · organisation principale créée', size: 22 }]),
  ]),

  ...spacer(1),

  h('Étape 2 — Tour guidé interactif', HeadingLevel.HEADING_1),
  p('À la première connexion, un tour guidé en 7 étapes se déclenche automatiquement (pop-ups react-joyride) pour découvrir les modules clés. Il est rejouable à tout moment via le bouton « Tour guidé » dans la barre du haut.'),

  featureTable(
    ['Étape', 'Module', 'Ce que vous apprenez'],
    [
      ['1', 'Bienvenue', 'Vue d\'ensemble de la plateforme et navigation'],
      ['2', 'Dashboard', 'Lecture des scores ESG et indicateurs clés'],
      ['3', 'Saisie des données', 'Saisie manuelle Scope 1 / 2 / 3'],
      ['4', 'Fournisseurs', 'Évaluation ESG des fournisseurs'],
      ['5', 'Décarbonisation', 'Création d\'un plan d\'actions Net Zéro'],
      ['6', 'Double matérialité', 'Analyse CSRD des enjeux significatifs'],
      ['7', 'Reporting', 'Génération du rapport CSRD en PDF'],
    ],
    [800, 2200, 6360]
  ),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 3. DASHBOARD ─────────────────────────────────────────────────────────
  sectionDivider('3. Dashboard — Vue exécutive'),

  h('Tableau de bord ESG', HeadingLevel.HEADING_1),
  p('Le dashboard centralise l\'ensemble des indicateurs de performance ESG en temps réel. Il est accessible depuis le menu latéral → « Dashboard ».'),

  ...spacer(1),

  twoCol(
    [
      h('Métriques disponibles', HeadingLevel.HEADING_3, C_GREEN),
      bullet('Score ESG global (AAA → D)'),
      bullet('Scores par pilier : Environnement / Social / Gouvernance'),
      bullet('Tendances : évolution mois/mois et N-1'),
      bullet('Taux de complétion des données (%)'),
      bullet('Nombre d\'anomalies actives'),
      bullet('Alertes CSRD prioritaires'),
    ],
    [
      h('Vues disponibles', HeadingLevel.HEADING_3, C_BLUE),
      bullet('Dashboard exécutif (KPI synthétiques)'),
      bullet('Dashboard par pilier (détail E / S / G)'),
      bullet('Benchmarking sectoriel'),
      bullet('Évolution temporelle (12 / 24 mois)'),
      bullet('Carte de chaleur des indicateurs'),
      bullet('Alertes et notifications en temps réel'),
    ]
  ),

  ...spacer(1),

  h('Grille de notation ESG', HeadingLevel.HEADING_2),
  featureTable(
    ['Note', 'Score', 'Interprétation', 'Action recommandée'],
    [
      ['AAA', '90 – 100', 'Leader sectoriel reconnu', 'Communiquer & labelliser'],
      ['AA', '80 – 89', 'Excellence opérationnelle', 'Maintenir & documenter'],
      ['A', '70 – 79', 'Bonne performance', 'Optimiser les derniers leviers'],
      ['BBB', '60 – 69', 'Performance satisfaisante', 'Plan d\'amélioration ciblé'],
      ['BB', '50 – 59', 'Performance correcte', 'Identifier les gaps prioritaires'],
      ['B', '40 – 49', 'En cours de structuration', 'Renforcer la collecte de données'],
      ['CCC', '25 – 39', 'Performance insuffisante', 'Programme ESG urgent'],
      ['CC', '10 – 24', 'Faible engagement', 'Accompagnement intensif'],
      ['D', '0 – 9', 'Non conforme', 'Intervention immédiate'],
    ],
    [1200, 1600, 3200, 3360]
  ),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 4. COLLECTE DE DONNÉES ────────────────────────────────────────────────
  sectionDivider('4. Collecte des données ESG'),

  h('Les 4 canaux de collecte', HeadingLevel.HEADING_1),
  p('ESGFlow supporte plusieurs modes de collecte pour s\'adapter aux processus existants de chaque organisation.'),

  ...spacer(1),

  featureTable(
    ['Canal', 'Description', 'Idéal pour', 'Format'],
    [
      ['Saisie manuelle', 'Formulaires guidés par indicateur', 'PME, données ponctuelles', 'Interface web'],
      ['Import CSV', 'Upload fichier structuré avec mapping colonnes', 'Données volumineuses', '.csv, .xlsx'],
      ['Connecteurs ERP', 'Synchronisation automatique SAP, Workday, Salesforce', 'Grandes entreprises', 'API REST / OAuth'],
      ['API REST', 'Intégration technique avec vos systèmes', 'DSI / développeurs', 'JSON / OpenAPI 3.0'],
    ],
    [2000, 2800, 2400, 2160]
  ),

  ...spacer(1),

  h('Saisie manuelle — Scopes 1, 2 et 3', HeadingLevel.HEADING_2),
  p('Accessible via « Saisie des données » dans le menu latéral. Chaque indicateur est accompagné d\'une description, de l\'unité de mesure et de la référence ESRS correspondante.'),

  ...spacer(1),

  featureTable(
    ['Scope', 'Définition', 'Exemples d\'indicateurs', 'Unité'],
    [
      ['Scope 1', 'Émissions directes de l\'entreprise', 'Combustibles fossiles, fluides frigorigènes, véhicules de société', 'tCO₂e'],
      ['Scope 2', 'Émissions indirectes liées à l\'énergie achetée', 'Électricité, chaleur, froid, vapeur', 'tCO₂e (market-based / location-based)'],
      ['Scope 3 Amont', 'Achats de biens & services, transport, déchets', '15 catégories GHG Protocol — Cat. 1 à 8', 'tCO₂e'],
      ['Scope 3 Aval', 'Distribution, utilisation, fin de vie produits', 'Cat. 9 à 15 GHG Protocol', 'tCO₂e'],
    ],
    [1400, 2800, 3200, 1960]
  ),

  ...spacer(1),

  infoBox([
    p([{ text: '📋 Flux de validation des données :', bold: true, size: 22, color: C_NAVY }]),
    p('Brouillon → Soumis → En révision → Vérifié ✅ — ou — Rejeté ❌ (avec commentaire)'),
    p('Chaque modification est tracée dans la piste d\'audit horodatée (RGPD-compliant).'),
  ]),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 5. FOURNISSEURS ───────────────────────────────────────────────────────
  sectionDivider('5. Gestion des fournisseurs'),

  h('Module Supply Chain ESG', HeadingLevel.HEADING_1),
  p('Le module « Chaîne d\'approvisionnement » permet d\'évaluer et piloter la performance ESG de l\'ensemble des fournisseurs, sous-traitants et partenaires. Indispensable pour la conformité CSRD (ESRS S1, E1) et la Loi sur le Devoir de Vigilance.'),

  ...spacer(1),

  featureTable(
    ['Fonctionnalité', 'Description', 'Standard couvert'],
    [
      ['Questionnaire ESG fournisseur', 'Envoi automatisé, collecte réponses, scoring', 'ESRS S1 · Loi Sapin II'],
      ['Scoring ESG automatique', 'Notation sur 100 pts basée sur réponses', 'GRI 308 · GRI 414'],
      ['Segmentation par risque', 'Matrice risque/impact par fournisseur', 'TCFD · ISO 31000'],
      ['Alertes compliance', 'Notification si fournisseur sous le seuil', 'CSRD Art. 29-a'],
      ['Export rapport fournisseurs', 'Liste consolidée avec scores pour auditeurs', 'ISAE 3000'],
    ],
    [2600, 3800, 2960]
  ),

  ...spacer(1),

  h('Processus d\'évaluation fournisseur', HeadingLevel.HEADING_2),
  numbered('Créer la fiche fournisseur (raison sociale, SIRET, secteur, pays)'),
  numbered('Affecter le questionnaire ESG adapté au secteur'),
  numbered('Envoyer le questionnaire par email (lien sécurisé)'),
  numbered('Le fournisseur complète en ligne, sans compte requis'),
  numbered('ESGFlow calcule automatiquement le score ESG'),
  numbered('Générer le rapport de due diligence fournisseur'),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 6. DÉCARBONISATION ────────────────────────────────────────────────────
  sectionDivider('6. Plan de décarbonisation'),

  h('Module Décarbonisation & Net Zéro', HeadingLevel.HEADING_1),
  p('Accessible via « Décarbonisation » dans le menu. Ce module traduit les données d\'émissions en trajectoire de réduction concrète, alignée sur les objectifs SBTi (Science Based Targets initiative) et Accord de Paris.'),

  ...spacer(1),

  twoCol(
    [
      h('Création du plan', HeadingLevel.HEADING_3, C_GREEN),
      bullet('Définition de l\'année de référence (baseline)'),
      bullet('Paramétrage de l\'objectif de réduction (%)'),
      bullet('Sélection de l\'horizon temporel (2030 / 2040 / 2050)'),
      bullet('Répartition par scope (1, 2, 3)'),
      bullet('Définition des actions par site / BU / entité'),
    ],
    [
      h('Suivi des actions', HeadingLevel.HEADING_3, C_BLUE),
      bullet('Tableau de bord avancement (% réalisé)'),
      bullet('KPI : tCO₂e économisées vs objectif'),
      bullet('Alertes si trajectoire hors cible'),
      bullet('Lien avec les prévisions ML ARIMA'),
      bullet('Export plan pour reporting CSRD E1'),
    ]
  ),

  ...spacer(1),

  h('Leviers de réduction disponibles', HeadingLevel.HEADING_2),
  featureTable(
    ['Levier', 'Impact estimé', 'Effort', 'ROI moyen', 'Horizon'],
    [
      ['Passage aux énergies renouvelables', '−45 % Scope 2', 'Élevé', '4 – 7 ans', '12 – 24 mois'],
      ['Isolation bâtiments & HVAC', '−20 % consommation', 'Moyen', '3 – 5 ans', '6 – 12 mois'],
      ['Optimisation tournées logistiques', '−18 % Scope 3 Cat.4', 'Faible', '< 1 an', '1 – 3 mois'],
      ['Télétravail 2 jours / semaine', '−30 % déplacements', 'Très faible', 'Immédiat', '1 mois'],
      ['Sourcing fournisseurs locaux', '−25 % Scope 3 Cat.1', 'Moyen', 'Variable', '6 – 18 mois'],
      ['Installation panneaux solaires', '−40 à −80 % Scope 2', 'Élevé', '5 – 8 ans', '12 – 18 mois'],
    ],
    [2600, 1800, 1400, 1480, 2080]
  ),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 7. DOUBLE MATÉRIALITÉ ────────────────────────────────────────────────
  sectionDivider('7. Double matérialité CSRD'),

  h('Analyse de double matérialité', HeadingLevel.HEADING_1),
  p('Exigence fondamentale de la CSRD, l\'analyse de double matérialité consiste à identifier les enjeux ESG qui sont matériels selon deux axes complémentaires, conformément à l\'ESRS 1.'),

  ...spacer(1),

  twoCol(
    [
      h('Matérialité d\'impact', HeadingLevel.HEADING_3, C_GREEN),
      p('Comment l\'entreprise impacte-t-elle l\'environnement et la société ?', { italic: true, size: 20 }),
      ...spacer(0),
      bullet('Impact positif ou négatif, réel ou potentiel'),
      bullet('Couverture : propre activité + chaîne de valeur'),
      bullet('Évaluation : amplitude × probabilité × portée'),
      bullet('Sources : parties prenantes, données internes'),
    ],
    [
      h('Matérialité financière', HeadingLevel.HEADING_3, C_BLUE),
      p('Comment les enjeux ESG affectent-ils financièrement l\'entreprise ?', { italic: true, size: 20 }),
      ...spacer(0),
      bullet('Risques et opportunités à court, moyen, long terme'),
      bullet('Impacts sur revenus, coûts, actifs, passifs'),
      bullet('Risques physiques, de transition, de réputation'),
      bullet('Alignement TCFD (Task Force on Climate)'),
    ]
  ),

  ...spacer(1),

  h('Utilisation du module', HeadingLevel.HEADING_2),
  numbered('Accéder à « Double Matérialité » dans le menu Pilotage ESG'),
  numbered('Consulter les enjeux pré-remplis par secteur d\'activité'),
  numbered('Évaluer chaque enjeu sur les deux axes (curseur 1-5)'),
  numbered('La matrice se génère automatiquement (drag & drop disponible)'),
  numbered('Documenter les parties prenantes consultées'),
  numbered('Exporter le rapport de matérialité pour l\'annexe CSRD'),

  ...spacer(1),

  infoBox([
    p([{ text: '⚠️ Obligation CSRD : ', bold: true, size: 22, color: C_NAVY }, { text: 'La liste des enjeux matériels doit être documentée et actualisée annuellement. ESGFlow conserve l\'historique de toutes les versions pour les auditeurs.', size: 22 }]),
  ], 'FEF3C7', 'F59E0B'),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 8. REPORTING ─────────────────────────────────────────────────────────
  sectionDivider('8. Reporting & Export'),

  h('Génération de rapports', HeadingLevel.HEADING_1),
  p('Le module Reporting génère automatiquement des rapports conformes aux standards réglementaires, à partir des données saisies dans la plateforme. Le PDF est prêt en moins d\'une minute.'),

  ...spacer(1),

  featureTable(
    ['Type de rapport', 'Standard', 'Contenu', 'Format'],
    [
      ['Rapport CSRD complet', 'ESRS 1 à ESRS G1', 'Tous piliers E/S/G + double matérialité', 'PDF professionnel'],
      ['Rapport GRI', 'GRI Standards 2021', 'Indicateurs universels + sectoriels', 'PDF + XLSX'],
      ['Rapport TCFD', 'TCFD 2017', 'Gouvernance, stratégie, risques, métriques', 'PDF'],
      ['Bilan carbone', 'GHG Protocol', 'Scopes 1, 2, 3 détaillés', 'PDF + XLSX'],
      ['Score ESG exécutif', 'Interne ESGFlow', 'Synthèse KPI + notation + benchmarks', 'PDF 1 page'],
      ['Export données brutes', '—', 'Toutes les données pour auditeurs', 'XLSX / CSV'],
    ],
    [2200, 2000, 3000, 2160]
  ),

  ...spacer(1),

  h('Rapports planifiés', HeadingLevel.HEADING_2),
  p('Les rapports peuvent être planifiés pour une génération automatique périodique (mensuelle, trimestrielle, annuelle) avec envoi par email aux destinataires configurés.'),

  numbered('Aller dans « Rapports → Rapports planifiés »'),
  numbered('Sélectionner le type de rapport et la période'),
  numbered('Configurer la fréquence (mensuel / trimestriel / annuel)'),
  numbered('Ajouter les destinataires (emails internes ou externes)'),
  numbered('Activer la planification — génération automatique en arrière-plan'),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 9. IA & ML ────────────────────────────────────────────────────────────
  sectionDivider('9. Intelligence Artificielle & Machine Learning'),

  h('Module IA & ML', HeadingLevel.HEADING_1),
  p('Accessible via « Intelligence Prédictive » dans le menu, ce module apporte une couche analytique avancée au-dessus des données ESG pour anticiper, détecter et recommander.'),

  ...spacer(1),

  h('1. Prévisions d\'émissions (ARIMA / Holt-Winters)', HeadingLevel.HEADING_2),
  p('Le moteur de prévisions choisit automatiquement le meilleur algorithme selon la quantité de données disponibles :'),

  featureTable(
    ['Données disponibles', 'Algorithme', 'Précision', 'Intervalles de confiance'],
    [
      ['≥ 24 points', 'ARIMA(1,1,1) — statsmodels', 'Haute (R² > 0.85)', '95 % CI natifs'],
      ['6 – 23 points', 'Holt-Winters (lissage exponentiel)', 'Bonne', '95 % CI via résidus'],
      ['3 – 5 points', 'Régression linéaire OLS', 'Indicative', 'Prediction interval 95 %'],
    ],
    [2000, 2800, 2400, 2160]
  ),

  ...spacer(1),

  p('Le graphique de prévision affiche :'),
  bullet('La trajectoire centrale prédite (ligne violette)'),
  bullet('La bande de confiance à 95 % (zone grisée)'),
  bullet('Une alerte si la trajectoire dépasse l\'objectif fixé (ex : −30 %)'),
  bullet('La saisonnalité détectée automatiquement'),

  ...spacer(1),

  h('2. Détection d\'anomalies (Isolation Forest + Z-score)', HeadingLevel.HEADING_2),
  p('Approche hybride combinant deux algorithmes complémentaires :'),

  twoCol(
    [
      p([{ text: 'Isolation Forest (sklearn)', bold: true, size: 22, color: C_NAVY }]),
      bullet('Détection multivariée contextuelle'),
      bullet('Identifie des patterns non linéaires'),
      bullet('Contamination attendue : 10 %'),
      bullet('Score IF : 0 – 100 % d\'anomalie'),
    ],
    [
      p([{ text: 'Z-score statistique', bold: true, size: 22, color: C_NAVY }]),
      bullet('Détection univariée par métrique'),
      bullet('Interprétable : écart en sigma (σ)'),
      bullet('Seuils : 2σ faible · 2.5σ moyen · 3σ élevé'),
      bullet('Recommandation d\'action incluse'),
    ]
  ),

  ...spacer(1),

  featureTable(
    ['Sévérité', 'Condition de déclenchement', 'Action recommandée'],
    [
      ['🔴 Critique (High)', 'Z ≥ 3σ ou Z ≥ 2.5σ + IF > 75 %', 'Vérification immédiate requise'],
      ['🟡 Modéré (Medium)', 'Z ≥ 2.5σ ou Z ≥ 2σ + IF > 60 %', 'Investigation dans les 48h'],
      ['🔵 Faible (Low)', 'Z ≥ 2σ (seuil minimal)', 'Surveillance et documentation'],
    ],
    [2400, 3800, 3160]
  ),

  ...spacer(1),

  h('3. Recommandations IA (GPT-4o-mini)', HeadingLevel.HEADING_2),
  p('ESGFlow génère 3 recommandations ESG prioritaires personnalisées via OpenAI GPT-4o-mini, en analysant le profil complet de l\'entreprise :'),

  bullet('Secteur d\'activité et taille'),
  bullet('Scores ESG par pilier (Environnement / Social / Gouvernance)'),
  bullet('Top 5 des émetteurs identifiés dans les données'),
  bullet('Taux de complétion et de vérification des données'),

  ...spacer(1),

  p('Chaque recommandation inclut :'),
  featureTable(
    ['Champ', 'Description', 'Exemple'],
    [
      ['Titre', 'Action courte et percutante', 'Audit énergétique des bâtiments'],
      ['Description', 'Explication du quoi et du pourquoi', '2 à 3 phrases actionnables'],
      ['Gain tCO₂e', 'Économies carbone estimées / an', '350 tCO₂e/an'],
      ['Gain €', 'Économies financières estimées / an', '25 000 €/an'],
      ['Difficulté', 'Score 1 (facile) à 5 (très difficile)', '2/5'],
      ['Délai', 'Court (< 6 mois) · Moyen · Long', 'Court'],
      ['Ressources', 'Rôles et budgets nécessaires', 'Resp. HSE · Bureau d\'études'],
    ],
    [2000, 3600, 3760]
  ),

  infoBox([
    p([{ text: '🔐 Confidentialité : ', bold: true, size: 22 }, { text: 'Les données envoyées à OpenAI sont anonymisées (pas de noms d\'entreprise ni de données personnelles). La clé API reste dans l\'environnement serveur sécurisé.', size: 22 }]),
  ]),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 10. PARAMÈTRES & INTÉGRATIONS ────────────────────────────────────────
  sectionDivider('10. Paramètres, intégrations & sécurité'),

  h('Gestion des utilisateurs & rôles', HeadingLevel.HEADING_1),
  featureTable(
    ['Rôle', 'Permissions principales', 'Idéal pour'],
    [
      ['Admin', 'Accès total + gestion tenant + facturation', 'DSI, Directeur RSE'],
      ['Manager', 'Lecture, saisie, validation, export rapports', 'Responsable RSE'],
      ['Collaborateur', 'Saisie de données uniquement', 'Opérationnels'],
      ['Auditeur', 'Lecture seule + piste d\'audit', 'CAC, auditeurs externes'],
      ['API (technique)', 'Accès via clé API + scopes configurables', 'Développeurs, intégrations'],
    ],
    [1800, 4200, 3360]
  ),

  ...spacer(1),

  h('Connecteurs disponibles', HeadingLevel.HEADING_2),
  featureTable(
    ['Système', 'Type', 'Données synchronisées', 'Protocole'],
    [
      ['SAP S/4HANA', 'ERP', 'Consommations énergie, achats, transport', 'API REST / OAuth 2.0'],
      ['Workday', 'SIRH', 'Effectifs, formations, absences, accidents', 'API REST'],
      ['Salesforce', 'CRM', 'Données clients, mobilité commerciale', 'Salesforce Connect'],
      ['Google Sheets', 'Tableur', 'Import / export flexible via mapping', 'Google Sheets API v4'],
      ['Enedis / EDF Data', 'Énergie', 'Consommation électrique en temps réel', 'API Data'],
      ['INSEE', 'Référentiel', 'Données sectorielles, SIRET, NAF', 'API Entreprises'],
    ],
    [1800, 1400, 3000, 3160]
  ),

  ...spacer(1),

  h('Sécurité & conformité de la plateforme', HeadingLevel.HEADING_2),
  twoCol(
    [
      h('Sécurité technique', HeadingLevel.HEADING_3, C_GREEN),
      bullet('Authentification JWT + refresh tokens'),
      bullet('Chiffrement en transit (TLS 1.3) et au repos'),
      bullet('Multi-tenant : isolation totale des données'),
      bullet('Audit trail complet (toutes les actions horodatées)'),
      bullet('2FA disponible (TOTP)'),
    ],
    [
      h('Conformité réglementaire', HeadingLevel.HEADING_3, C_BLUE),
      bullet('Hébergement Cloud EU (AWS eu-west-1)'),
      bullet('RGPD : droit à l\'oubli, portabilité, DPO désigné'),
      bullet('Sauvegardes quotidiennes chiffrées (30 jours)'),
      bullet('Monitoring temps réel (Sentry)'),
      bullet('SOC 2 Type II en cours de certification'),
    ]
  ),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 11. FACTURATION ───────────────────────────────────────────────────────
  sectionDivider('11. Plans tarifaires'),

  h('Offres ESGFlow', HeadingLevel.HEADING_1),
  featureTable(
    ['', 'Starter', 'Pro', 'Enterprise'],
    [
      ['Prix mensuel', '290 € HT / mois', '890 € HT / mois', 'Sur devis'],
      ['Utilisateurs', 'Jusqu\'à 10', 'Jusqu\'à 50', 'Illimité'],
      ['Organisations', 'Jusqu\'à 10', 'Jusqu\'à 50', 'Illimité'],
      ['Appels API / mois', '10 000', '100 000', 'Illimité'],
      ['Connecteurs ERP', '2 connecteurs', '10 connecteurs', 'Illimité'],
      ['Recommandations IA', 'Règles métier', 'GPT-4o-mini', 'GPT-4o + dédié'],
      ['Support', 'Email 5j/7', 'Email + chat 5j/7', 'CSM dédié 7j/7'],
      ['SLA uptime', '99,5 %', '99,9 %', '99,99 %'],
      ['Rétention données', '12 mois', '36 mois', 'Illimitée'],
    ],
    [2500, 2287, 2287, 2286]
  ),

  ...spacer(1),

  infoBox([
    p([{ text: '🎁 Essai gratuit 14 jours ', bold: true, size: 22, color: C_NAVY }, { text: '— Aucune carte bancaire requise. Migration des données incluse pour les plans Enterprise.', size: 22 }]),
  ]),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 12. ROADMAP ───────────────────────────────────────────────────────────
  sectionDivider('12. Roadmap & évolutions'),

  h('Évolutions prévues 2026 – 2027', HeadingLevel.HEADING_1),
  featureTable(
    ['Fonctionnalité', 'Trimestre', 'Statut'],
    [
      ['Connecteur CDP (Carbon Disclosure Project)', 'Q2 2026', '🔜 En développement'],
      ['Module SFDR pour gestionnaires d\'actifs', 'Q2 2026', '🔜 En développement'],
      ['Application mobile iOS / Android', 'Q3 2026', '📋 Planifié'],
      ['Scan de factures par OCR (IA)', 'Q3 2026', '📋 Planifié'],
      ['Benchmark en temps réel (10 000 entreprises)', 'Q3 2026', '📋 Planifié'],
      ['Certification automatique par tiers de confiance', 'Q4 2026', '🔬 Recherche'],
      ['Module blockchain pour traçabilité données', 'Q1 2027', '🔬 Recherche'],
      ['Connecteur IoT capteurs énergie temps réel', 'Q1 2027', '🔬 Recherche'],
    ],
    [3800, 1800, 3760]
  ),

  new Paragraph({ children: [new PageBreak()] }),

  // ── 13. GETTING STARTED CHECKLIST ────────────────────────────────────────
  sectionDivider('13. Checklist de démarrage rapide'),

  h('Votre plan de lancement en 5 étapes', HeadingLevel.HEADING_1),
  p('Suivez ce guide pour être opérationnel sur ESGFlow en moins de 2 semaines :'),

  ...spacer(1),

  featureTable(
    ['Semaine', 'Étape', 'Actions clés', 'Responsable'],
    [
      ['S1', '1. Activation', 'Création compte, tour guidé, paramétrage tenant, invitations équipe', 'Admin IT + RSE'],
      ['S1', '2. Données de base', 'Saisie des données N-1 (bilan carbone existant), mapping indicateurs', 'Équipe RSE'],
      ['S2', '3. Validation', 'Vérification des données saisies, résolution anomalies ML', 'Manager RSE'],
      ['S2', '4. Configuration', 'Branchement connecteurs ERP, paramétrage double matérialité', 'DSI + RSE'],
      ['S2', '5. Premier rapport', 'Génération rapport CSRD, partage avec direction et auditeurs', 'Directeur RSE'],
    ],
    [1000, 1600, 4600, 2160]
  ),

  ...spacer(1),

  infoBox([
    p([{ text: '📞 Accompagnement disponible : ', bold: true, size: 22, color: C_GREEN }]),
    p('ESGFlow propose des sessions d\'onboarding individuel (1h, visio) pour accélérer la prise en main. Contactez votre Customer Success Manager ou écrivez à onboarding@esgflow.io.'),
  ]),

  ...spacer(2),

  // Final CTA
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        shading: { fill: C_NAVY, type: ShadingType.CLEAR },
        borders: noBorders(),
        margins: { top: 400, bottom: 400, left: 480, right: 480 },
        width: { size: 9360, type: WidthType.DXA },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 },
            children: [new TextRun({ text: 'Prêt à piloter votre ESG avec confiance ?', bold: true, size: 36, color: C_WHITE, font: 'Arial' })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 160 },
            children: [new TextRun({ text: 'Démarrez votre essai gratuit 14 jours — Sans engagement', size: 24, color: 'A7F3D0', font: 'Arial', italic: true })] }),
          new Paragraph({ alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '🌐 www.esgflow.io    📧 contact@esgflow.io    📞 +33 1 XX XX XX XX', size: 22, color: '94A3B8', font: 'Arial' })] }),
        ],
      })],
    })],
  }),
];

// ─── Assemble document ────────────────────────────────────────────────────────

const doc = new Document({
  creator:  'ESGFlow',
  title:    'ESGFlow — Guide d\'utilisation complet',
  subject:  'Plateforme ESG & CSRD — Présentation client',
  keywords: 'ESG, CSRD, ESRS, RSE, développement durable, reporting',

  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 560, hanging: 280 } } },
        }, {
          level: 1, format: LevelFormat.BULLET, text: '◦',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1000, hanging: 280 } } },
        }],
      },
      {
        reference: 'numbers',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  },

  styles: {
    default: { document: { run: { font: 'Arial', size: 22, color: C_TEXT } } },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, color: C_NAVY, font: 'Arial' },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, color: C_NAVY, font: 'Arial' },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, color: '334155', font: 'Arial' },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 },
      },
    ],
  },

  sections: [
    // ── Page de garde (sans header/footer) ────────────────────────────────
    {
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } },
      },
      children: cover,
    },
    // ── Contenu principal ─────────────────────────────────────────────────
    {
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C_GREEN, space: 8 } },
            spacing: { before: 0, after: 120 },
            children: [
              new TextRun({ text: 'ESGFlow', bold: true, size: 20, color: C_NAVY, font: 'Arial' }),
              new TextRun({ text: '  —  Guide d\'utilisation complet  —  v2.0  —  2026', size: 18, color: '94A3B8', font: 'Arial' }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: C_GRAY_B, space: 6 } },
            alignment: AlignmentType.RIGHT,
            spacing: { before: 80, after: 0 },
            children: [
              new TextRun({ text: 'Page ', size: 18, color: '94A3B8', font: 'Arial' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, color: C_NAVY, font: 'Arial', bold: true }),
              new TextRun({ text: ' / ', size: 18, color: '94A3B8', font: 'Arial' }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '94A3B8', font: 'Arial' }),
            ],
          })],
        }),
      },
      children: sections_content,
    },
  ],
});

// ─── Write output ─────────────────────────────────────────────────────────────

const OUTPUT = '/Users/cisseniang/Downloads/ESGFlow_Guide_Presentation.docx';

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUTPUT, buffer);
  console.log(`✅ Document généré : ${OUTPUT}`);
  console.log(`   Taille : ${(buffer.length / 1024).toFixed(0)} Ko`);
});
