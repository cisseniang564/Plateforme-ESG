import FeaturesMegaMenu from './FeaturesMegaMenu';
import FeaturesOverview from './FeaturesOverview';
import { FEATURE_GROUPS } from './featuresCatalog';
import { useState, useEffect, useLayoutEffect, useCallback, useId } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePageSeo } from '@/hooks/usePageSeo';
import LazySection from '@/components/common/LazySection';
import {
  TrendingUp, Shield, Zap, Users, FileText, BarChart3,
  ArrowRight, Brain, CheckCircle, Building2, Plus, Minus, Check, X,
  ChevronDown, ChevronRight, Truck, ClipboardList,
  FlameKindling, ShieldCheck, Flame, Lock, Target, Layers, Plug, Radio, Server, Activity, Search, Bell,
  GitMerge, BarChart2, AlertTriangle, BookOpen, Upload, CheckSquare, Code2,
  Menu, X as XIcon, Calculator, FileCheck, Mail, Landmark,
} from 'lucide-react';
import { LogoMark, Wordmark } from '@/components/common/Logo';
import '@fontsource-variable/newsreader/wght.css';

// ─── Utilitaires de page ──────────────────────────────────────────────────────
/** La page d'accueil est dessinée en thème clair : on retire la classe « dark » le temps de la visite, puis on la remet. */
function useLightTheme() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    const previousScheme = root.style.colorScheme;
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
    return () => {
      if (wasDark) root.classList.add('dark');
      root.style.colorScheme = previousScheme;
    };
  }, []);
}

/** Défilement vers une ancre, sans animation pour les personnes qui ont demandé moins de mouvement. */
function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

/** Textes propres à la page d'accueil : clé `landing.home.*`, texte français par défaut. */
function useHome() {
  const { t, i18n } = useTranslation();
  const h = (key: string, fallback: string) => t(`landing.home.${key}`, fallback) as string;
  return { t, h, lang: i18n.language };
}

// Styles partagés : un seul vocabulaire de boutons, de titres et de largeur de page.
const WRAP = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2';
const BTN_PRIMARY = `inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-emerald-800 ${FOCUS}`;
const BTN_SECONDARY = `inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3.5 text-[15px] font-semibold text-gray-800 transition-colors hover:bg-gray-50 ${FOCUS}`;
const H2 = 'font-display text-3xl font-medium tracking-tight text-gray-900 sm:text-4xl';
const LEAD = 'mt-4 max-w-2xl text-lg leading-relaxed text-gray-600';

// Un seul moment animé : l'apparition des normes dans le rapport du hero.
const PAGE_CSS = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes lp-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .lp-rise { animation: lp-rise .5s cubic-bezier(.2,.7,.2,1) both; }
}`;

// ─── Module data ──────────────────────────────────────────────────────────────
// ─── Module data ──────────────────────────────────────────────────────────────
const MODULES = [
  {
    id: 'dashboard',
    icon: BarChart3,
    color: '#16a34a',
    bg: 'bg-green-500',
    lightBg: 'bg-green-50',
    lightText: 'text-green-700',
    name: 'Dashboard Exécutif',
    tagline: 'Pilotage ESG en temps réel',
    desc: 'Vue d\'ensemble de vos 3 piliers ESG, KPIs clés, alertes IA et tendances. Tout en un coup d\'œil pour vos comités de direction.',
    badges: ['Score global /100', 'Tendances', 'Alertes', 'Benchmark anonymisé'],
    preview: 'dashboard',
  },
  {
    id: 'scope3',
    icon: Flame,
    color: '#ea580c',
    bg: 'bg-orange-500',
    lightBg: 'bg-orange-50',
    lightText: 'text-orange-700',
    name: 'Bilan Carbone Scope 3',
    tagline: '15 catégories GHG Protocol + ADEME',
    desc: 'Calculez vos émissions indirectes en amont et aval selon les 15 catégories officielles du GHG Protocol avec les facteurs d\'émission ADEME intégrés.',
    badges: ['15 catégories Scope 3', 'Facteurs indicatifs', 'Calcul automatique', 'Détail par catégorie'],
    preview: 'scope3',
    featurePath: '/features/bilan-carbone',
  },
  {
    id: 'materiality',
    icon: Target,
    color: '#7c3aed',
    bg: 'bg-violet-500',
    lightBg: 'bg-violet-50',
    lightText: 'text-violet-700',
    name: 'Matrice de Matérialité',
    tagline: 'Double matérialité CSRD · Drag & drop',
    desc: 'Outil interactif de double matérialité : questionnaire parties prenantes, matrice drag & drop, suggestions IA sectorielles et export PDF.',
    badges: ['Drag & drop', 'Questionnaire parties prenantes', 'Enjeux types par secteur', 'Export rapport'],
    preview: 'materiality',
    featurePath: '/features/double-materialite',
  },
  {
    id: 'decarb',
    icon: FlameKindling,
    color: '#059669',
    bg: 'bg-emerald-500',
    lightBg: 'bg-emerald-50',
    lightText: 'text-emerald-700',
    name: 'Plan de Décarbonation',
    tagline: 'SBTi · Net Zero 2050 · catalogue d\'actions',
    desc: 'Construisez votre trajectoire de décarbonation alignée SBTi 1.5°C. Catalogue d\'actions avec ROI estimé, scénarios what-if et graphique 2024–2050.',
    badges: ['Trajectoire SBTi 1.5°C', 'Actions + ROI estimé', 'Scénarios What-if', 'Net Zero 2050'],
    preview: 'decarb',
    featurePath: '/features/decarbonation',
  },
  {
    id: 'ia',
    icon: Brain,
    color: '#db2777',
    bg: 'bg-pink-500',
    lightBg: 'bg-pink-50',
    lightText: 'text-pink-700',
    name: 'IA & Automatisation',
    tagline: 'Assistant ESG · Anomalies · Prévisions',
    desc: 'Intelligence artificielle générative pour votre ESG : assistant réglementaire, détection d\'anomalies et prévisions de tendances.',
    badges: ['Assistant ESG', 'Détection anomalies', 'Prévisions'],
    preview: 'ia',
    featurePath: '/features/ia-automatisation',
  },
  {
    id: 'supplychain',
    icon: Truck,
    color: '#2563eb',
    bg: 'bg-blue-500',
    lightBg: 'bg-blue-50',
    lightText: 'text-blue-700',
    name: 'Supply Chain ESG',
    tagline: 'Fournisseurs · Scoring ESG · CSDDD',
    desc: 'Évaluez vos fournisseurs sur 6 dimensions ESG, envoyez des questionnaires et structurez votre démarche de due diligence pour la CSDDD (directive UE 2024/1760).',
    badges: ['Scoring 6 dimensions', 'Questionnaires auto', 'Suivi fournisseurs', 'CSDDD-ready'],
    preview: 'supply',
    featurePath: '/features/supply-chain',
  },
  {
    id: 'compliance',
    icon: ShieldCheck,
    color: '#7c3aed',
    bg: 'bg-violet-600',
    lightBg: 'bg-violet-50',
    lightText: 'text-violet-700',
    name: 'Multi-Réglementaire',
    tagline: '10 référentiels · Check conformité auto',
    desc: 'Suivi centralisé de vos obligations : CSRD/ESRS, Taxonomie UE, BEGES, SFDR, CSDDD, Devoir de vigilance (Loi 2017-399), Sapin 2, SBTi, GRI et TCFD — 10 référentiels couverts.',
    badges: ['CSRD & ESRS', 'Taxonomie UE', 'SFDR & BEGES', 'Roadmap échéances'],
    preview: 'compliance',
  },
  {
    id: 'audit',
    icon: ClipboardList,
    color: '#374151',
    bg: 'bg-slate-700',
    lightBg: 'bg-slate-50',
    lightText: 'text-slate-700',
    name: 'Piste d\'Audit',
    tagline: 'Traçabilité · Versionning · Export auditeurs',
    desc: 'Journal d\'audit détaillé : qui / quand / quoi / où. Versionning avant/après, pièces justificatives, empreintes SHA-256 par entrée et export complet pour vos auditeurs.',
    badges: ['Journal complet', 'Versionning données', 'Empreintes SHA-256', 'Export pour auditeurs'],
    preview: 'audit',
    featurePath: '/features/audit-trail',
  },
  {
    id: 'connectors',
    icon: Plug,
    color: '#0891b2',
    bg: 'bg-cyan-500',
    lightBg: 'bg-cyan-50',
    lightText: 'text-cyan-700',
    name: 'Connecteurs et imports',
    tagline: 'Import FEC · RH · Climatiq · APIs en bêta',
    desc: 'Alimentez la plateforme sans ressaisie : import FEC (Sage, Cegid, Pennylane…), exports RH (Silae, Lucca, PayFit), CSV et Excel, et calcul de votre Scope 2 via Climatiq. Connexions API Pennylane, Qonto et Enedis en bêta ; SAP, Oracle ou Workday sur demande.',
    badges: ['Import FEC · CSV · Excel', 'Exports RH (Silae, Lucca, PayFit)', 'Scope 2 via Climatiq', 'Journal des synchronisations'],
    preview: 'connectors',
  },
  {
    id: 'insee',
    icon: Building2,
    color: '#1d4ed8',
    bg: 'bg-blue-700',
    lightBg: 'bg-blue-50',
    lightText: 'text-blue-700',
    name: 'Enrichissement INSEE',
    tagline: 'API Sirene · Recherche SIREN / SIRET',
    desc: 'Enrichissez automatiquement vos données ESG avec la base officielle Sirene : recherche par SIREN/SIRET, données légales, activité NAF, effectifs et géolocalisation en temps réel.',
    badges: ['Base Sirene (INSEE)', 'Recherche SIREN/SIRET', 'Données officielles'],
    preview: 'insee',
  },
  {
    id: 'webhooks',
    icon: Radio,
    color: '#7c3aed',
    bg: 'bg-violet-600',
    lightBg: 'bg-violet-50',
    lightText: 'text-violet-700',
    name: 'Webhooks & API',
    tagline: 'Événements · Notifications · Intégrations temps réel',
    desc: 'Connectez ESGFlow à vos outils externes via webhooks : recevez des notifications en temps réel pour chaque événement ESG (données, scores, indicateurs, seuils) avec signature HMAC.',
    badges: ['6 types d\'événements', 'Signature HMAC-SHA256', 'Journal des livraisons'],
    preview: 'webhooks',
  },
  {
    id: 'scores',
    icon: BarChart2,
    color: '#0284c7',
    bg: 'bg-sky-500',
    lightBg: 'bg-sky-50',
    lightText: 'text-sky-700',
    name: 'Scores ESG',
    tagline: 'Scoring automatique · Historique · Breakdown piliers',
    desc: 'Calculez automatiquement votre score ESG /100 par pilier (E/S/G) et par organisation. Suivez l\'évolution historique, comparez vos scores et obtenez un breakdown détaillé avec recommandations.',
    badges: ['Score /100 automatique', 'Historique temporel', 'Breakdown E/S/G', 'Comparaison organisations'],
    preview: 'scores',
  },
  {
    id: 'validation',
    icon: CheckSquare,
    color: '#059669',
    bg: 'bg-emerald-600',
    lightBg: 'bg-emerald-50',
    lightText: 'text-emerald-700',
    name: 'Workflow Validation',
    tagline: 'Brouillon → Révision → Approuvé · Audit complet',
    desc: 'Processus de validation des données ESG en 3 étapes : soumission, révision et approbation. Chaque action est tracée dans la Piste d\'Audit avec motif, date et responsable.',
    badges: ['Flux Brouillon → Approuvé', 'Approbation / Rejet', 'Motif de rejet', 'Tracé dans l\'audit'],
    preview: 'validation',
  },
  {
    id: 'esrs',
    icon: BookOpen,
    color: '#7c3aed',
    bg: 'bg-violet-600',
    lightBg: 'bg-violet-50',
    lightText: 'text-violet-700',
    name: 'Analyse ESRS / DMA',
    tagline: 'Gap analysis CSRD · 80 points de données · Roadmap',
    desc: 'Analysez vos écarts de conformité face aux 80 points de données ESRS. Identifiez les points manquants, priorisez les actions et suivez votre progression vers la conformité CSRD.',
    badges: ['80 points de données ESRS', 'Gap analysis automatique', 'Roadmap priorisée', 'Export rapport PDF'],
    preview: 'esrs',
  },
  {
    id: 'taxonomy',
    icon: Layers,
    color: '#0369a1',
    bg: 'bg-blue-700',
    lightBg: 'bg-blue-50',
    lightText: 'text-blue-700',
    name: 'Taxonomie UE',
    tagline: '6 objectifs environnementaux · Eligibilité · Alignement',
    desc: 'Évaluez l\'alignement de vos activités avec la Taxonomie européenne durable : 6 objectifs environnementaux, critères DNSH, critères minimaux sociaux et pourcentage d\'alignement.',
    badges: ['6 objectifs environnementaux', 'Critères DNSH', 'Calcul % alignement', 'Rapport investisseurs'],
    preview: 'taxonomy',
    featurePath: '/features/taxonomie-ue',
  },
  {
    id: 'benchmarking',
    icon: TrendingUp,
    color: '#b45309',
    bg: 'bg-amber-600',
    lightBg: 'bg-amber-50',
    lightText: 'text-amber-700',
    name: 'Benchmarking Sectoriel',
    tagline: 'Comparatif secteur · Percentile · Indicateurs clés',
    desc: 'Positionnez-vous face à votre secteur d\'activité : comparez votre score ESG, vos émissions et vos indicateurs clés aux moyennes sectorielles et identifiez vos leviers d\'amélioration.',
    badges: ['Comparaison sectorielle', 'Score percentile', 'Indicateurs clés', 'Recommandations IA'],
    preview: 'benchmarking',
  },
  {
    id: 'risks',
    icon: AlertTriangle,
    color: '#dc2626',
    bg: 'bg-red-600',
    lightBg: 'bg-red-50',
    lightText: 'text-red-700',
    name: 'Registre des Risques',
    tagline: 'Risques ESG · Probabilité · Impact · Plan d\'action',
    desc: 'Identifiez, qualifiez et gérez vos risques ESG dans un registre centralisé. Matrice probabilité/impact, plans de mitigation, suivi des actions et alertes dépassement de seuil.',
    badges: ['Matrice risques P/I', 'Plans de mitigation', 'Alertes seuils', 'Liens ESRS obligatoires'],
    preview: 'risks',
  },
  {
    id: 'csrdbuilder',
    icon: FileText,
    color: '#0369a1',
    bg: 'bg-sky-700',
    lightBg: 'bg-sky-50',
    lightText: 'text-sky-700',
    name: 'CSRD Report Builder',
    tagline: 'Rapport CSRD complet · PDF/Word/Excel/JSON',
    desc: 'Construisez votre rapport de durabilité CSRD section par section. Suivi de complétion des indicateurs ESRS, score global, et export multi-formats (PDF, Word, Excel, JSON) en 1 clic.',
    badges: ['Sections ESRS structurées', 'Score de complétion /100', 'Export PDF/Word/Excel', 'Prêt pour auditeurs'],
    preview: 'csrdbuilder',
    featurePath: '/features/csrd-reporting',
  },
  {
    id: 'multistandard',
    icon: GitMerge,
    color: '#0d9488',
    bg: 'bg-teal-600',
    lightBg: 'bg-teal-50',
    lightText: 'text-teal-700',
    name: 'Mapping Multi-Référentiels',
    tagline: 'Saisir une fois · GRI · CDP · TCFD · SDG',
    desc: 'Saisissez vos données une seule fois et mappez-les automatiquement vers CSRD/ESRS, GRI, CDP, TCFD et SDG. Identifiez les lacunes par référentiel et exportez votre reporting multi-standard.',
    badges: ['CSRD/ESRS natif', 'GRI · CDP · TCFD', 'SDG alignment', 'Export consolidé'],
    preview: 'multistandard',
  },
  {
    id: 'smartalerts',
    icon: Bell,
    color: '#ea580c',
    bg: 'bg-orange-600',
    lightBg: 'bg-orange-50',
    lightText: 'text-orange-700',
    name: 'Alertes Intelligentes',
    tagline: 'Seuils · KPIs · Notifications · Temps réel',
    desc: 'Créez des alertes personnalisées sur vos indicateurs ESG : dépassement de seuil, variation anormale, échéances réglementaires. Recevez des notifications en temps réel par email ou webhook.',
    badges: ['Seuils personnalisables', 'Alertes KPI temps réel', 'Notifications email/webhook', 'Historique des alertes'],
    preview: 'smartalerts',
  },
  {
    id: 'apiportal',
    icon: Code2,
    color: '#4f46e5',
    bg: 'bg-indigo-600',
    lightBg: 'bg-indigo-50',
    lightText: 'text-indigo-700',
    name: 'API & Portail Développeur',
    tagline: 'REST API · Clés · Swagger · OAuth2',
    desc: 'Accédez à l\'ensemble de vos données ESG via notre API REST sécurisée. Générez des clés API, explorez la documentation Swagger interactive et intégrez ESGFlow à vos outils sur mesure.',
    badges: ['API REST complète', 'Clés API par scope', 'Documentation Swagger', 'OAuth2'],
    preview: 'apiportal',
  },
  {
    id: 'dataquality',
    icon: Activity,
    color: '#7c3aed',
    bg: 'bg-violet-600',
    lightBg: 'bg-violet-50',
    lightText: 'text-violet-700',
    name: 'Qualité des Données',
    tagline: 'Score qualité · Complétude · Anomalies · ESRS',
    desc: 'Mesurez et améliorez la qualité de vos données ESG : score de complétude par pilier, détection d\'anomalies, données manquantes par exigence ESRS et recommandations d\'amélioration.',
    badges: ['Score complétude /100', 'Détection anomalies', 'Données manquantes ESRS', 'Recommandations IA'],
    preview: 'dataquality',
  },
];

// ─── Preview mock components ──────────────────────────────────────────────────
function PreviewDashboard() {
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white font-bold text-lg">Score ESG Global</div>
          <div className="text-slate-400 text-xs">Mis à jour il y a 2 min</div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 rounded-full">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-400 text-xs font-medium">Live</span>
        </div>
      </div>
      <div className="flex gap-4">
        <svg className="w-24 h-24 -rotate-90 flex-shrink-0" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle cx="40" cy="40" r="32" fill="none" stroke="#22c55e" strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 32 * 0.78} ${2 * Math.PI * 32 * 0.22}`} strokeLinecap="round" />
          <text x="40" y="40" dominantBaseline="middle" textAnchor="middle" style={{ transform: 'rotate(90deg)', transformOrigin: '40px 40px', fontSize: 14, fontWeight: 'bold', fill: 'white' }}>78</text>
        </svg>
        <div className="flex-1 space-y-2.5">
          {[{ l: 'Environnemental', v: 82, c: '#22c55e' }, { l: 'Social', v: 74, c: '#3b82f6' }, { l: 'Gouvernance', v: 79, c: '#a855f7' }].map(p => (
            <div key={p.l}>
              <div className="flex justify-between text-xs mb-1"><span className="text-slate-300">{p.l}</span><span className="text-white font-semibold">{p.v}</span></div>
              <div className="h-2 bg-white/10 rounded-full"><div className="h-2 rounded-full" style={{ width: `${p.v}%`, backgroundColor: p.c }} /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-end gap-1.5 h-14">
        {[52, 61, 58, 68, 72, 74, 78].map((h, i) => (
          <div key={i} className="flex-1 bg-green-500/30 rounded-t hover:bg-green-500/60 transition-colors" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

function PreviewScope3() {
  const cats = [
    { l: 'Achats biens & services', v: 41 }, { l: 'Capital goods', v: 12 },
    { l: 'Transport amont', v: 18 }, { l: 'Déchets opérations', v: 5 },
    { l: 'Déplacements pros', v: 8 }, { l: 'Trajets dom-travail', v: 6 },
    { l: 'Transport aval', v: 10 },
  ];
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-bold">Scope 3 — 15 catégories</div>
        <div className="text-xs text-orange-300 font-semibold">12 459 tCO₂e</div>
      </div>
      {cats.map((c, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-1"><span className="text-slate-300 truncate">{c.l}</span><span className="text-white font-mono ml-2">{c.v}%</span></div>
          <div className="h-2.5 bg-white/10 rounded-full"><div className="h-2.5 rounded-full bg-orange-400" style={{ width: `${c.v * 2}%` }} /></div>
        </div>
      ))}
      <div className="mt-3 flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-xl">
        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
        Facteurs ADEME 2024 · GHG Protocol v1.0
      </div>
    </div>
  );
}

function PreviewMateriality() {
  const dots = [
    { x: 30, y: 20, label: 'Biodiversité', size: 10 },
    { x: 70, y: 15, label: 'Climat', size: 14, hot: true },
    { x: 80, y: 30, label: 'Énergie', size: 11, hot: true },
    { x: 55, y: 60, label: 'Social', size: 9 },
    { x: 25, y: 70, label: 'Déchets', size: 7 },
    { x: 65, y: 75, label: 'Gouvernance', size: 8 },
    { x: 40, y: 45, label: 'Eau', size: 8 },
  ];
  return (
    <div className="p-5">
      <div className="text-white font-bold mb-3">Double Matérialité CSRD</div>
      <div className="relative bg-white/5 rounded-xl" style={{ height: 180 }}>
        <div className="absolute top-2 left-1/2 text-xs text-slate-400">Impact financier ↑</div>
        <div className="absolute right-2 top-1/2 text-xs text-slate-400 rotate-90">Parties prenantes →</div>
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10" />
        {dots.map((d, i) => (
          <div key={i} className={`absolute rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-125 ${d.hot ? 'bg-green-400' : 'bg-blue-400'}`}
            style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.size * 2, height: d.size * 2, transform: 'translate(-50%, -50%)' }}>
            <div className="text-white text-xs font-bold leading-none hidden" />
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-violet-300 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green-400" />Double matérialité
        <span className="w-2 h-2 rounded-full bg-blue-400 ml-2" />Matérialité financière
      </div>
    </div>
  );
}

function PreviewDecarb() {
  const years = [2024, 2027, 2030, 2035, 2040, 2050];
  const bau = [12500, 13000, 13500, 14200, 15000, 16000];
  const sbti = [12500, 10200, 7250, 4800, 2900, 800];
  const plan = [12500, 11000, 8500, 6000, 3500, 1200];
  const maxV = 16000;
  const W = 280, H = 100, PL = 30, PB = 15;
  const xS = (i: number) => PL + (i / 5) * (W - PL);
  const yS = (v: number) => H - PB - ((v / maxV) * (H - PB));
  const makePath = (data: number[]) => data.map((v, i) => `${i === 0 ? 'M' : 'L'}${xS(i)},${yS(v)}`).join(' ');
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-white font-bold">Trajectoire 2024–2050</div>
        <div className="text-xs text-emerald-300 font-semibold">Plan: -85%</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <path d={makePath(bau)} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" opacity={0.6} />
        <path d={makePath(sbti)} fill="none" stroke="#22c55e" strokeWidth="2" />
        <path d={makePath(plan)} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5 3" />
        {years.map((y, i) => <text key={i} x={xS(i)} y={H} textAnchor="middle" fontSize={7} fill="#6b7280">{y}</text>)}
      </svg>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        {[{ l: 'Actions plan', v: '24', c: 'text-blue-300' }, { l: 'Réduction', v: '7 200 tCO₂e', c: 'text-emerald-300' }, { l: 'ROI moyen', v: '18 mois', c: 'text-amber-300' }].map((s, i) => (
          <div key={i} className="text-center bg-white/5 rounded-lg p-2">
            <div className={`font-bold ${s.c}`}>{s.v}</div>
            <div className="text-slate-400 text-xs">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewIA() {
  const messages = [
    { role: 'user', text: 'Quel est mon principal risque ESG ?' },
    { role: 'ai', text: 'Votre Scope 3 représente 89% de vos émissions totales. Recommandation : évaluer vos 5 fournisseurs critiques (>1M€ d\'achats).' },
    { role: 'user', text: 'Génère un plan d\'action CSRD' },
  ];
  return (
    <div className="p-5 space-y-3">
      <div className="text-white font-bold mb-1 flex items-center gap-2">
        <Brain className="h-4 w-4 text-pink-400" /> Assistant IA ESG
      </div>
      {messages.map((m, i) => (
        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`text-xs px-3 py-2 rounded-2xl max-w-[80%] leading-relaxed ${m.role === 'user' ? 'bg-pink-500 text-white' : 'bg-white/10 text-slate-200'}`}>
            {m.text}
          </div>
        </div>
      ))}
      <div className="flex gap-1.5 mt-2">
        {['Anomalies détectées', 'Rapport CSRD', 'Prédictions'].map(s => (
          <span key={s} className="text-xs bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-1 rounded-lg">{s}</span>
        ))}
      </div>
    </div>
  );
}

function PreviewSupply() {
  const suppliers = [
    { name: 'AcierPlus', country: '🇫🇷', score: 66, risk: 'Élevé', riskColor: 'text-orange-400' },
    { name: 'TextileCo', country: '🇧🇩', score: 34, risk: 'Critique', riskColor: 'text-red-400' },
    { name: 'GreenPack', country: '🇫🇷', score: 85, risk: 'Faible', riskColor: 'text-green-400' },
    { name: 'LogiTrans', country: '🇩🇪', score: 72, risk: 'Moyen', riskColor: 'text-amber-400' },
  ];
  return (
    <div className="p-5">
      <div className="text-white font-bold mb-3">Évaluation Fournisseurs ESG</div>
      <div className="space-y-2">
        {suppliers.map((s, i) => (
          <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5">
            <span className="text-base">{s.country}</span>
            <span className="text-sm text-white flex-1 font-medium">{s.name}</span>
            <div className="h-2 w-20 bg-white/10 rounded-full overflow-hidden">
              <div className="h-2 rounded-full" style={{ width: `${s.score}%`, backgroundColor: s.score >= 70 ? '#22c55e' : s.score >= 50 ? '#f59e0b' : '#ef4444' }} />
            </div>
            <span className="text-xs font-bold text-white w-7">{s.score}</span>
            <span className={`text-xs font-semibold ${s.riskColor}`}>{s.risk}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-blue-300 bg-blue-500/10 rounded-xl px-3 py-2">
        🔍 4 questionnaires en attente · 2 alertes devoir de vigilance
      </div>
    </div>
  );
}

function PreviewCompliance() {
  const regs = [
    { name: 'CSRD', status: 'Partiel', pct: 72, color: '#f59e0b' },
    { name: 'Loi Sapin II', status: 'Partiel', pct: 61, color: '#f59e0b' },
    { name: 'DPEF', status: 'Conforme', pct: 85, color: '#22c55e' },
    { name: 'Taxonomie UE', status: 'Partiel', pct: 58, color: '#f59e0b' },
    { name: 'ISO 14001', status: 'À faire', pct: 45, color: '#ef4444' },
  ];
  return (
    <div className="p-5">
      <div className="text-white font-bold mb-3">Conformité — 10 référentiels</div>
      <div className="space-y-2.5">
        {regs.map((r, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-slate-300 w-28 flex-shrink-0">{r.name}</span>
            <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-2.5 rounded-full transition-all" style={{ width: `${r.pct}%`, backgroundColor: r.color }} />
            </div>
            <span className="text-xs font-bold w-8 text-right" style={{ color: r.color }}>{r.pct}%</span>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-xs text-center">
        {[{ l: '1 Conforme', c: 'bg-green-500/20 text-green-300' }, { l: '3 Partiels', c: 'bg-amber-500/20 text-amber-300' }, { l: '1 Non conf.', c: 'bg-red-500/20 text-red-300' }].map((s, i) => (
          <div key={i} className={`${s.c} rounded-lg py-1.5 font-semibold`}>{s.l}</div>
        ))}
      </div>
    </div>
  );
}

function PreviewAudit() {
  const events = [
    { action: 'APPROVE', label: 'Approbation', color: 'bg-green-500', user: 'M. Dupont', time: '09:42', desc: 'GHG Scope 1 — T1 2026' },
    { action: 'UPDATE', label: 'Modification', color: 'bg-blue-500', user: 'S. Chen', time: '16:58', desc: 'Scope 3 achats: 4280 → 5120 tCO₂e' },
    { action: 'REJECT', label: 'Rejet', color: 'bg-red-500', user: 'J-B. Moreau', time: '17:45', desc: 'E2-1 — pièce manquante' },
    { action: 'IMPORT', label: 'Import CSV', color: 'bg-orange-500', user: 'T. Bernard', time: '14:30', desc: '847 lignes · indicateurs sociaux' },
  ];
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-white font-bold">Journal d'Audit</div>
        <div className="flex items-center gap-1 text-xs text-green-400"><Lock className="h-3 w-3" />Intégrité SHA-256</div>
      </div>
      <div className="space-y-2">
        {events.map((e, i) => (
          <div key={i} className="flex items-start gap-2.5 bg-white/5 rounded-xl px-3 py-2">
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${e.color}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${e.color} text-white`}>{e.label}</span>
                <span className="text-xs text-slate-400 truncate">{e.desc}</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{e.user} · {e.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewConnectors() {
  const sources = [
    { name: 'Import FEC', cat: 'Comptabilité', state: 'Disponible', tone: 'text-green-400', color: '#f97316' },
    { name: 'Exports RH', cat: 'Silae · Lucca · PayFit', state: 'Disponible', tone: 'text-green-400', color: '#0891b2' },
    { name: 'Climatiq', cat: 'Scope 2', state: 'Disponible', tone: 'text-green-400', color: '#16a34a' },
    { name: 'Pennylane', cat: 'Comptabilité', state: 'Bêta', tone: 'text-amber-400', color: '#7c3aed' },
    { name: 'Qonto', cat: 'Banque', state: 'Bêta', tone: 'text-amber-400', color: '#0f766e' },
    { name: 'ERP · SIRH', cat: 'SAP, Oracle, Workday', state: 'Sur demande', tone: 'text-slate-400', color: '#1e40af' },
  ];
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-bold text-sm">Connecteurs et imports</div>
        <span className="px-2 py-0.5 bg-white/10 text-slate-300 text-xs rounded-full">État réel</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {sources.map((c) => (
          <div key={c.name} className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: c.color }}>{c.name[0]}</div>
              <span className="text-white text-xs font-medium truncate">{c.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs truncate">{c.cat}</span>
              <span className={`${c.tone} text-xs flex-shrink-0 ml-1`}>{c.state}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-slate-400 text-[11px]">Chaque synchronisation est enregistrée dans un journal : date, statut, lignes importées.</p>
    </div>
  );
}

function PreviewINSEE() {
  const companies = [
    // Entreprises fictives : jamais de nom réel associé à un score ESG.
    { name: 'Exemple Industrie SA', siren: '000 000 001', naf: '7010Z', city: 'Ville exemple', size: 'GE', score: 91 },
    { name: 'Exemple Mobilité SAS', siren: '000 000 002', naf: '2910Z', city: 'Ville exemple', size: 'GE', score: 78 },
    { name: 'Exemple Alimentaire SA', siren: '000 000 003', naf: '1051A', city: 'Ville exemple', size: 'GE', score: 85 },
    { name: 'Exemple Services SARL', siren: '000 000 004', naf: '6201Z', city: 'Ville exemple', size: 'PME', score: 67 },
  ];
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-bold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-blue-400" /> INSEE Sirene
        </div>
        <div className="text-xs text-blue-300 font-semibold">API officielle</div>
      </div>
      <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 mb-3">
        <Search className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-300 text-xs">Rechercher par nom, SIREN ou SIRET...</span>
        <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-0.5 rounded-lg">Chercher</span>
      </div>
      <div className="space-y-2">
        {companies.map((c, i) => (
          <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
            <div className="w-8 h-8 rounded-lg bg-blue-600/40 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {c.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{c.name}</div>
              <div className="text-slate-400 text-xs">{c.siren} · {c.city}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-slate-400">{c.naf}</span>
              <div className="h-5 w-12 bg-white/10 rounded-full overflow-hidden">
                <div className="h-5 rounded-full" style={{ width: `${c.score}%`, backgroundColor: c.score >= 80 ? '#22c55e' : '#f59e0b' }} />
              </div>
              <span className="text-xs text-green-400 font-bold w-6">{c.score}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-xl">
        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
        Données officielles · Mis à jour en temps réel · Gratuit
      </div>
    </div>
  );
}

function PreviewWebhooks() {
  const events = [
    { type: 'data.uploaded', color: 'bg-blue-500', time: '14:32:01', status: 'success', target: 'Slack #esg-alerts' },
    { type: 'score.calculated', color: 'bg-green-500', time: '14:32:05', status: 'success', target: 'Zapier → Notion' },
    { type: 'threshold.exceeded', color: 'bg-red-500', time: '14:31:48', status: 'success', target: 'PagerDuty' },
    { type: 'indicator.created', color: 'bg-amber-500', time: '14:30:12', status: 'failed', target: 'Teams webhook' },
  ];
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-bold flex items-center gap-2">
          <Radio className="h-4 w-4 text-violet-400" /> Webhooks — Événements
        </div>
        <div className="flex gap-1.5">
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">3 actifs</span>
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">1 échec</span>
        </div>
      </div>
      <div className="space-y-2">
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${e.color}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${e.color} bg-opacity-20 text-white`}>{e.type}</span>
              </div>
              <div className="text-slate-400 text-xs mt-0.5 truncate">{e.target}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-slate-500 text-xs">{e.time}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${e.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {e.status === 'success' ? '200' : '500'}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-center mt-2">
        {[{ l: 'Signature', v: 'HMAC-SHA256', c: 'text-violet-300' }, { l: 'Historique', v: 'des envois', c: 'text-green-300' }, { l: 'Durée', v: 'mesurée', c: 'text-blue-300' }].map((s, i) => (
          <div key={i} className="bg-white/5 rounded-lg p-2">
            <div className={`font-bold ${s.c}`}>{s.v}</div>
            <div className="text-slate-400">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewScores() {
  const orgs = [
    { name: 'Siège France', e: 82, s: 74, g: 79, total: 78 },
    { name: 'Filiale Allemagne', e: 71, s: 68, g: 81, total: 73 },
    { name: 'Filiale Espagne', e: 65, s: 72, g: 77, total: 71 },
  ];
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-white font-bold">Scores ESG par entité</div>
        <div className="flex gap-1.5 text-xs">
          {[{ l: 'E', c: 'bg-green-500' }, { l: 'S', c: 'bg-blue-500' }, { l: 'G', c: 'bg-purple-500' }].map(p => (
            <span key={p.l} className={`${p.c} text-white px-1.5 py-0.5 rounded font-bold`}>{p.l}</span>
          ))}
        </div>
      </div>
      {orgs.map((o, i) => (
        <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white font-medium">{o.name}</span>
            <span className="text-2xl font-extrabold text-sky-400">{o.total}</span>
          </div>
          <div className="flex gap-2">
            {[{ l: 'E', v: o.e, c: '#22c55e' }, { l: 'S', v: o.s, c: '#3b82f6' }, { l: 'G', v: o.g, c: '#a855f7' }].map(p => (
              <div key={p.l} className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{p.l}</span>
                  <span className="text-white font-semibold">{p.v}</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full">
                  <div className="h-1.5 rounded-full" style={{ width: `${p.v}%`, backgroundColor: p.c }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="grid grid-cols-3 gap-2 text-xs text-center mt-1">
        {[{ l: 'Calculés auto', v: '3/3', c: 'text-sky-300' }, { l: 'Tendance', v: '+4 pts', c: 'text-green-300' }, { l: 'Secteur moy.', v: '65/100', c: 'text-amber-300' }].map((s, i) => (
          <div key={i} className="bg-white/5 rounded-lg p-2">
            <div className={`font-bold ${s.c}`}>{s.v}</div>
            <div className="text-slate-400">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewValidation() {
  const entries = [
    { id: '4857...', val: '4285 tCO₂e', date: '01/05/2025', status: 'pending_review', color: 'bg-blue-500', label: 'En révision' },
    { id: '9a3c...', val: '1 250 kWh', date: '15/04/2025', status: 'draft', color: 'bg-amber-500', label: 'Brouillon' },
    { id: 'f28b...', val: '12 ETP', date: '01/03/2025', status: 'approved', color: 'bg-green-500', label: 'Approuvé' },
    { id: '7d1e...', val: '890 km', date: '28/02/2025', status: 'rejected', color: 'bg-red-500', label: 'Rejeté' },
  ];
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-white font-bold">Workflow Validation</div>
        <div className="flex gap-1.5 text-xs">
          <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">6 958 brouillons</span>
          <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">1 en révision</span>
        </div>
      </div>
      <div className="space-y-2">
        {entries.map((e, i) => (
          <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${e.color}`} />
            <span className="text-xs font-mono text-slate-400">{e.id}</span>
            <span className="text-xs text-white flex-1">{e.val}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${e.color} bg-opacity-20 text-white`}>{e.label}</span>
            {e.status === 'draft' && (
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-lg font-medium">Soumettre</span>
            )}
            {e.status === 'pending_review' && (
              <div className="flex gap-1">
                <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded-lg">✓</span>
                <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded-lg">✕</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-xl">
        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
        Chaque action est tracée dans la Piste d'Audit
      </div>
    </div>
  );
}

function PreviewESRS() {
  const standards = [
    { code: 'ESRS E1', label: 'Changement climatique', pct: 78, status: 'partial' },
    { code: 'ESRS E2', label: 'Pollution', pct: 45, status: 'gap' },
    { code: 'ESRS S1', label: 'Effectifs propres', pct: 91, status: 'ok' },
    { code: 'ESRS G1', label: 'Gouvernance', pct: 62, status: 'partial' },
    { code: 'ESRS E5', label: 'Économie circulaire', pct: 30, status: 'gap' },
  ];
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-bold">Analyse ESRS / DMA</div>
        <div className="text-xs text-violet-300 font-semibold">80 points de données</div>
      </div>
      <div className="space-y-2.5">
        {standards.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs font-mono text-violet-300 w-16 flex-shrink-0">{s.code}</span>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 truncate">{s.label}</span>
                <span className="font-semibold" style={{ color: s.pct >= 80 ? '#22c55e' : s.pct >= 50 ? '#f59e0b' : '#ef4444' }}>{s.pct}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-2 rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.pct >= 80 ? '#22c55e' : s.pct >= 50 ? '#f59e0b' : '#ef4444' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5 mt-2 text-xs text-center">
        {[{ l: '1 Conforme', c: 'bg-green-500/20 text-green-300' }, { l: '2 Partiels', c: 'bg-amber-500/20 text-amber-300' }, { l: '2 Lacunes', c: 'bg-red-500/20 text-red-300' }].map((s, i) => (
          <div key={i} className={`${s.c} rounded-lg py-1.5 font-semibold`}>{s.l}</div>
        ))}
      </div>
    </div>
  );
}

function PreviewTaxonomy() {
  const objectives = [
    { code: 'CCM', label: 'Atténuation climat', eligible: 82, aligned: 61 },
    { code: 'CCA', label: 'Adaptation climat', eligible: 45, aligned: 30 },
    { code: 'WTR', label: 'Eau & ressources', eligible: 38, aligned: 22 },
    { code: 'CE', label: 'Économie circulaire', eligible: 54, aligned: 40 },
  ];
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-bold">Taxonomie UE — 6 objectifs</div>
        <div className="text-xs font-semibold text-blue-300">Alignement global : 48%</div>
      </div>
      <div className="space-y-2.5">
        {objectives.map((o, i) => (
          <div key={i} className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-blue-300">{o.code}</span>
              <span className="text-xs text-slate-300">{o.label}</span>
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-2 bg-blue-400/60 rounded-full" style={{ width: `${o.eligible}%` }} />
              </div>
              <span className="text-xs text-blue-300 w-12 text-right">Élig. {o.eligible}%</span>
            </div>
            <div className="flex gap-2 items-center mt-1">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-2 bg-green-400 rounded-full" style={{ width: `${o.aligned}%` }} />
              </div>
              <span className="text-xs text-green-300 w-12 text-right">Align. {o.aligned}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewBenchmarking() {
  const metrics = [
    { label: 'Score ESG global', vous: 78, secteur: 65, unit: '/100' },
    { label: 'CO₂e / M€ CA', vous: 42, secteur: 68, unit: 't' },
    { label: 'Parité F/H', vous: 49, secteur: 43, unit: '%' },
    { label: 'Énergie renouvelable', vous: 71, secteur: 55, unit: '%' },
  ];
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-bold">Benchmarking Sectoriel</div>
        <div className="text-xs text-amber-300 font-semibold bg-amber-500/20 px-2 py-0.5 rounded-full">Top 25%</div>
      </div>
      <div className="space-y-2.5">
        {metrics.map((m, i) => {
          const better = m.label.includes('CO₂') ? m.vous < m.secteur : m.vous > m.secteur;
          return (
            <div key={i} className="bg-white/5 rounded-xl p-2.5 border border-white/10">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-300">{m.label}</span>
                <div className="flex gap-2">
                  <span className={`font-bold ${better ? 'text-green-400' : 'text-red-400'}`}>{m.vous}{m.unit} {better ? '↑' : '↓'}</span>
                  <span className="text-slate-500">vs {m.secteur}{m.unit}</span>
                </div>
              </div>
              <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-2 bg-slate-400/40 rounded-full" style={{ width: `${m.secteur}%` }} />
                <div className={`absolute top-0 h-2 rounded-full ${better ? 'bg-green-400' : 'bg-red-400'}`} style={{ width: `${m.vous}%` }} />
              </div>
              <div className="flex justify-between text-xs mt-1 text-slate-500">
                <span className="text-green-400">■ Vous</span>
                <span>■ Secteur</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PreviewRisks() {
  const risks = [
    { label: 'Transition énergétique', prob: 'Élevée', impact: 'Critique', score: 9, color: 'bg-red-500' },
    { label: 'Réglementation CSRD', prob: 'Élevée', impact: 'Élevé', score: 7, color: 'bg-orange-500' },
    { label: 'Risque fournisseur', prob: 'Moyenne', impact: 'Élevé', score: 6, color: 'bg-amber-500' },
    { label: 'Eau & biodiversité', prob: 'Faible', impact: 'Moyen', score: 3, color: 'bg-yellow-500' },
  ];
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-bold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" /> Registre des Risques ESG
        </div>
        <div className="text-xs text-red-300 bg-red-500/20 px-2 py-0.5 rounded-full font-semibold">2 critiques</div>
      </div>
      <div className="space-y-2">
        {risks.map((r, i) => (
          <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
            <div className={`w-6 h-6 ${r.color} rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{r.score}</div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{r.label}</div>
              <div className="text-slate-400 text-xs">{r.prob} · {r.impact}</div>
            </div>
            <div className="text-xs bg-white/10 text-slate-300 px-1.5 py-0.5 rounded flex-shrink-0">Plan →</div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-xl">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
        Liés aux exigences ESRS obligatoires
      </div>
    </div>
  );
}

function PreviewCSRDBuilder() {
  const sections = [
    { name: 'E1 — Climat', completion: 87, status: 'ok' },
    { name: 'E2 — Pollution', completion: 54, status: 'partial' },
    { name: 'S1 — Effectifs', completion: 92, status: 'ok' },
    { name: 'G1 — Gouvernance', completion: 71, status: 'partial' },
    { name: 'E5 — Écon. circulaire', completion: 33, status: 'gap' },
  ];
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-bold">CSRD Report Builder</div>
        <div className="text-xs text-sky-300 font-semibold bg-sky-500/20 px-2 py-0.5 rounded-full">Score global : 72%</div>
      </div>
      <div className="space-y-2">
        {sections.map((s, i) => (
          <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">{s.name}</span>
                <span className="font-semibold" style={{ color: s.completion >= 80 ? '#22c55e' : s.completion >= 50 ? '#f59e0b' : '#ef4444' }}>{s.completion}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-1.5 rounded-full" style={{ width: `${s.completion}%`, backgroundColor: s.completion >= 80 ? '#22c55e' : s.completion >= 50 ? '#f59e0b' : '#ef4444' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        {['PDF', 'Word', 'Excel', 'JSON'].map(f => (
          <div key={f} className="flex-1 text-center py-1.5 bg-sky-500/20 text-sky-300 text-xs font-semibold rounded-lg border border-sky-500/30">{f}</div>
        ))}
      </div>
    </div>
  );
}

function PreviewMultiStandard() {
  const standards = [
    { name: 'CSRD/ESRS', indicators: 47, color: '#22c55e', pct: 94 },
    { name: 'GRI', indicators: 38, color: '#0ea5e9', pct: 76 },
    { name: 'CDP', indicators: 24, color: '#f59e0b', pct: 62 },
    { name: 'TCFD', indicators: 19, color: '#8b5cf6', pct: 84 },
    { name: 'SDG', indicators: 12, color: '#10b981', pct: 50 },
  ];
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-bold">Mapping Multi-Référentiels</div>
        <div className="flex items-center gap-1.5 text-xs text-teal-300">
          <Zap className="h-3.5 w-3.5" /> Saisie unique
        </div>
      </div>
      <div className="space-y-2.5">
        {standards.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs font-bold w-20 flex-shrink-0" style={{ color: s.color }}>{s.name}</span>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-2 rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
            </div>
            <span className="text-xs text-slate-400 w-12 text-right">{s.indicators} ind.</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-teal-400 bg-teal-500/10 px-3 py-2 rounded-xl border border-teal-500/20">
        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
        Aperçu illustratif : une saisie, plusieurs référentiels
      </div>
    </div>
  );
}

function PreviewSmartAlerts() {
  const alerts = [
    { label: 'CO₂ > 500 tCO₂e/mois', severity: 'critical', triggered: true, status: 'Déclenchée' },
    { label: 'Score ESG < 60/100', severity: 'warning', triggered: true, status: 'Déclenchée' },
    { label: 'Données manquantes ESRS E1', severity: 'info', triggered: false, status: 'Active' },
    { label: 'Déchets recyclés < 70%', severity: 'warning', triggered: false, status: 'Active' },
  ];
  const colors: Record<string, { bg: string; text: string; dot: string }> = {
    critical: { bg: 'bg-red-500/20', text: 'text-red-300', dot: 'bg-red-500' },
    warning: { bg: 'bg-amber-500/20', text: 'text-amber-300', dot: 'bg-amber-500' },
    info: { bg: 'bg-blue-500/20', text: 'text-blue-300', dot: 'bg-blue-400' },
  };
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-bold flex items-center gap-2">
          <Bell className="h-4 w-4 text-orange-400" /> Alertes Intelligentes
        </div>
        <div className="text-xs text-red-300 bg-red-500/20 px-2 py-0.5 rounded-full font-semibold">2 actives</div>
      </div>
      <div className="space-y-2">
        {alerts.map((a, i) => {
          const c = colors[a.severity];
          return (
            <div key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border border-white/10 ${a.triggered ? c.bg : 'bg-white/5'}`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.triggered ? c.dot + ' animate-pulse' : 'bg-white/20'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-medium truncate">{a.label}</div>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.triggered ? c.bg + ' ' + c.text : 'bg-white/10 text-slate-400'}`}>{a.status}</span>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-slate-500 text-center pt-1">Notifications email & webhook configurées</div>
    </div>
  );
}

function PreviewAPIPortal() {
  const endpoints = [
    { method: 'GET', path: '/api/v1/indicators', color: 'bg-green-500/20 text-green-300' },
    { method: 'POST', path: '/api/v1/indicator-data', color: 'bg-blue-500/20 text-blue-300' },
    { method: 'GET', path: '/api/v1/scores', color: 'bg-green-500/20 text-green-300' },
    { method: 'GET', path: '/api/v1/esrs/gap-analysis', color: 'bg-green-500/20 text-green-300' },
  ];
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-bold flex items-center gap-2">
          <Code2 className="h-4 w-4 text-indigo-400" /> API Developer Portal
        </div>
        <div className="text-xs text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full font-semibold">REST · OpenAPI</div>
      </div>
      <div className="bg-white/5 rounded-xl p-3 border border-white/10 font-mono text-xs">
        <div className="text-slate-400 mb-1">Authorization:</div>
        <div className="text-green-300">Bearer <span className="text-slate-500">esg_sk_live_••••••••••••••</span></div>
      </div>
      <div className="space-y-1.5">
        {endpoints.map((e, i) => (
          <div key={i} className="flex items-center gap-2 font-mono text-xs">
            <span className={`px-2 py-0.5 rounded font-bold ${e.color}`}>{e.method}</span>
            <span className="text-slate-300 truncate">{e.path}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        {['API Keys', 'OAuth2', 'SSO OpenID Connect', 'Swagger'].map(f => (
          <div key={f} className="flex-1 text-center py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-lg">{f}</div>
        ))}
      </div>
    </div>
  );
}

function PreviewDataQuality() {
  const pillars = [
    { name: 'Environnement', score: 82, missing: 3, color: '#22c55e' },
    { name: 'Social', score: 68, missing: 7, color: '#f59e0b' },
    { name: 'Gouvernance', score: 91, missing: 1, color: '#22c55e' },
  ];
  const anomalies = [
    { field: 'Consommation eau', message: 'Valeur +340% vs N-1', severity: 'high' },
    { field: 'Accidents travail', message: 'Données manquantes Q3', severity: 'medium' },
  ];
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-bold flex items-center gap-2">
          <Activity className="h-4 w-4 text-violet-400" /> Qualité des Données
        </div>
        <div className="text-xs text-violet-300 bg-violet-500/20 px-2 py-0.5 rounded-full font-semibold">Score : 80/100</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {pillars.map((p, i) => (
          <div key={i} className="bg-white/5 rounded-xl p-2.5 border border-white/10 text-center">
            <div className="text-xs text-slate-400 mb-1">{p.name}</div>
            <div className="text-lg font-bold" style={{ color: p.color }}>{p.score}%</div>
            <div className="text-xs text-red-400">{p.missing} manq.</div>
          </div>
        ))}
      </div>
      <div className="space-y-1.5 mt-1">
        {anomalies.map((a, i) => (
          <div key={i} className="flex items-center gap-2 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
            <AlertTriangle className={`h-3.5 w-3.5 flex-shrink-0 ${a.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`} />
            <div className="min-w-0">
              <span className="text-xs text-white font-medium">{a.field} — </span>
              <span className="text-xs text-slate-400">{a.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Les 22 modules rangés par besoin : l'explorateur n'affiche qu'une catégorie à la fois. */
const MODULE_CATEGORIES: { id: string; label: string; modules: string[] }[] = [
  { id: 'pilotage', label: 'Pilotage', modules: ['dashboard', 'scores', 'benchmarking', 'smartalerts', 'risks'] },
  { id: 'carbone', label: 'Carbone & chaîne de valeur', modules: ['scope3', 'decarb', 'supplychain', 'materiality'] },
  { id: 'conformite', label: 'Conformité & reporting', modules: ['esrs', 'taxonomy', 'multistandard', 'csrdbuilder', 'compliance', 'audit'] },
  { id: 'donnees', label: 'Collecte & qualité', modules: ['connectors', 'dataquality', 'validation', 'insee'] },
  { id: 'ia', label: 'IA & intégrations', modules: ['ia', 'apiportal', 'webhooks'] },
];

const PREVIEWS: Record<string, () => JSX.Element> = {
  dashboard: PreviewDashboard,
  scope3: PreviewScope3,
  materiality: PreviewMateriality,
  decarb: PreviewDecarb,
  ia: PreviewIA,
  supply: PreviewSupply,
  compliance: PreviewCompliance,
  audit: PreviewAudit,
  connectors: PreviewConnectors,
  insee: PreviewINSEE,
  webhooks: PreviewWebhooks,
  scores: PreviewScores,
  validation: PreviewValidation,
  esrs: PreviewESRS,
  taxonomy: PreviewTaxonomy,
  benchmarking: PreviewBenchmarking,
  risks: PreviewRisks,
  csrdbuilder: PreviewCSRDBuilder,
  multistandard: PreviewMultiStandard,
  smartalerts: PreviewSmartAlerts,
  apiportal: PreviewAPIPortal,
  dataquality: PreviewDataQuality,
};

// ─── Contenu de la page ───────────────────────────────────────────────────────
// Les trois piliers reprennent les couleurs du logo : vert = environnement, bleu = social, violet = gouvernance.
const ESRS_GROUPS = [
  {
    id: 'E', label: 'Environnement', rule: 'border-emerald-500', tone: 'text-emerald-800', code: 'bg-emerald-50 text-emerald-700',
    items: [
      ['E1', 'Changement climatique'],
      ['E2', 'Pollution'],
      ['E3', 'Ressources hydrauliques et marines'],
      ['E4', 'Biodiversité et écosystèmes'],
      ['E5', 'Utilisation des ressources et économie circulaire'],
    ],
  },
  {
    id: 'S', label: 'Social', rule: 'border-blue-500', tone: 'text-blue-800', code: 'bg-blue-50 text-blue-700',
    items: [
      ['S1', 'Personnel de l’entreprise'],
      ['S2', 'Travailleurs de la chaîne de valeur'],
      ['S3', 'Communautés affectées'],
      ['S4', 'Consommateurs et utilisateurs finaux'],
    ],
  },
  {
    id: 'G', label: 'Gouvernance', rule: 'border-violet-500', tone: 'text-violet-800', code: 'bg-violet-50 text-violet-700',
    items: [['G1', 'Conduite des affaires']],
  },
] as const;

// Les six événements réellement émis par le service de webhooks (backend/app/services/webhook_service.py).
const WEBHOOK_EVENTS = ['data.uploaded', 'score.calculated', 'indicator.created', 'indicator.updated', 'user.created', 'threshold.exceeded'];

const PLANS = [
  {
    name: 'PME', desc: 'PME soumises CSRD ou supply-chain',
    monthly: 249, annual: 212,
    badge: null,
    features: [
      '25 utilisateurs · 50 organisations',
      '100 000 appels API / mois',
      'CSRD / ESRS complet',
      'Bilan Carbone Scope 1/2/3',
      'Import FEC (Sage, Cegid, Pennylane)',
      'Taxonomie UE & DPEF',
      'Supply Chain ESG & due diligence',
      'Plan décarbonation SBTi',
      'Support email 5j/7',
    ],
    missing: ['IA narrative', 'Connecteurs avancés', 'SSO OpenID Connect'],
    cta: 'Essai gratuit 14 jours', primary: false,
  },
  {
    name: 'ETI', desc: 'ETI en transformation ESG',
    monthly: 599, annual: 509,
    badge: 'Recommandé',
    features: [
      '100 utilisateurs · 250 organisations',
      '1 000 000 appels API / mois',
      'Tout PME inclus',
      'IA narrative & recommandations',
      'Connecteurs avancés (Pennylane, Qonto, Enedis — bêta)',
      'SFDR & multi-réglementaire',
      'Benchmarking sectoriel',
      'Webhooks & intégrations',
      'Piste d\'audit détaillée + SHA-256',
      'Support prioritaire 7j/7',
    ],
    missing: ['SSO OpenID Connect', 'Marque blanche'],
    cta: 'Essai gratuit 14 jours', primary: true,
  },
  {
    name: 'Groupe', desc: 'Grands groupes & reporting consolidé',
    monthly: 1199, annual: 1019,
    badge: 'Multi-entités',
    features: [
      '500 utilisateurs · orgs illimitées',
      '5 000 000 appels API / mois',
      'Tout ETI inclus',
      'SSO OpenID Connect',
      'Marque blanche & branding',
      'Consolidation IFRS 10 multi-entités',
      'Onboarding dédié',
      'Account manager attitré',
      'Rétention données 84 mois',
    ],
    missing: ['On-premise'],
    cta: 'Démarrer maintenant', primary: false,
  },
];

const FAQS = [
  { q: 'Combien de temps pour déployer la plateforme ?', a: 'La plateforme est en self-service : vous créez votre compte, puis saisissez ou importez vos données (FEC, CSV, Excel) vous-même. Aucun délai de mise en service n’est promis à ce stade.' },
  { q: 'La plateforme est-elle vraiment conforme CSRD ?', a: 'ESGFlow couvre les standards ESRS principaux (E1-E5, S1-S4, G1) et propose un aperçu iXBRL (XHTML) à valider avec Arelle ; le dépôt ESEF reste à faire avec vos conseils. Notre journal d\'audit détaillé avec empreintes SHA-256 et export pour auditeurs facilite vos revues internes et externes.' },
  { q: 'Peut-on importer nos données depuis Excel ou ERP ?', a: 'Oui. La plateforme accepte les imports CSV, Excel et FEC (Sage, Cegid, Pennylane) ainsi que les exports RH de Silae, Lucca ou PayFit. Les connexions API Pennylane, Qonto et Enedis sont en bêta. Pour SAP, Oracle ou Workday, dites-nous votre besoin : ils ne sont pas disponibles en standard. Notre API REST permet des intégrations sur mesure.' },
  { q: 'Où sont hébergées les données ?', a: "La plateforme est hébergée chez un prestataire européen. Les fonctions d'IA (Gaïa, questionnaires clients) envoient le texte analysé à OpenAI, un prestataire américain : ce point est indiqué avant chaque envoi, et le fichier lui-même n'est pas conservé. Aucun engagement de certification n'est affiché tant qu'il n'est pas documenté." },
  { q: 'Que couvre le module Supply Chain ESG ?', a: 'Le module couvre l\'évaluation des fournisseurs sur 6 dimensions ESG, l\'envoi de questionnaires automatisés, la gestion de la due diligence et le suivi du plan de vigilance conformément à la Loi 2017-399.' },
  { q: 'Y a-t-il un engagement de durée ?', a: 'L\'abonnement mensuel se résilie à tout moment, avec effet à la fin du mois en cours. L\'abonnement annuel bénéficie de 15 % de réduction : l\'année entière est due, et la résiliation prend effet à l\'échéance, sans remboursement au prorata (article 8 des conditions générales). L\'essai de 14 jours est sans carte bancaire ni engagement.' },
  { q: 'Comment fonctionne l\'import FEC pour le Scope 3 ?', a: 'Exportez votre FEC depuis Sage, Cegid ou Pennylane et importez-le directement dans ESGFlow. La plateforme analyse automatiquement vos comptes 60x/61x/62x et calcule vos émissions Scope 3 par catégorie de dépenses en appliquant les facteurs d\'émission ADEME.' },
  { q: 'Comment fonctionne le Workflow de Validation ?', a: 'Chaque saisie ESG passe par 3 étapes : Brouillon → En révision → Approuvé. Les validateurs peuvent approuver ou rejeter avec un motif. Chaque action est automatiquement enregistrée dans la Piste d\'Audit avec date, utilisateur et contexte.' },
  { q: 'Qu\'est-ce que l\'analyse ESRS / Gap analysis ?', a: 'Ce module compare vos données et processus existants aux 80 points de données des normes ESRS (E1 à G1). Il génère automatiquement une analyse des écarts avec une roadmap priorisée pour atteindre la conformité CSRD.' },
];

// ─── Décor : les trois vagues du logo, agrandies ──────────────────────────────
function FlowWaves({ className = '', dark = false }: { className?: string; dark?: boolean }) {
  const o = dark ? 0.2 : 0.15;
  return (
    <svg aria-hidden="true" viewBox="0 0 900 640" preserveAspectRatio="xMaxYMid slice" fill="none" strokeLinecap="round" className={className}>
      <path d="M-40 210 C 120 90, 280 330, 470 210 S 780 110, 940 230" stroke="#10b981" strokeWidth="34" opacity={o} />
      <path d="M-40 340 C 120 220, 280 460, 470 340 S 780 240, 940 360" stroke="#3b82f6" strokeWidth="34" opacity={o - 0.01} />
      <path d="M-40 470 C 120 350, 280 590, 470 470 S 780 370, 940 490" stroke="#8b5cf6" strokeWidth="34" opacity={o - 0.01} />
    </svg>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function Nav({ onModule }: { onModule: (moduleId: string) => void }) {
  const { t, h } = useHome();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileFeatures, setMobileFeatures] = useState(false);
  const [raised, setRaised] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const openMenu = useCallback(() => setMenuOpen(true), []);

  useEffect(() => {
    const onScroll = () => setRaised(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const anchors: [string, string][] = [
    ['tarifs', t('landing.lp.nav.pricing', 'Tarifs') as string],
    ['qui-sommes-nous', t('landing.lp.nav.about', 'À propos') as string],
    ['faq', t('landing.lp.nav.faqLabel', 'FAQ') as string],
  ];
  const link = `rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-emerald-800 ${FOCUS}`;
  const go = (id: string) => (e: React.MouseEvent) => { e.preventDefault(); scrollToId(id); setMobileOpen(false); };
  const mobileLink = 'block rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50';

  return (
    <header className={`fixed inset-x-0 top-0 z-50 bg-white/90 backdrop-blur transition-shadow ${raised ? 'border-b border-gray-200 shadow-sm' : 'border-b border-transparent'}`}>
      <nav aria-label={h('nav.label', "Navigation principale")} className={`${WRAP} flex h-16 items-center justify-between`}>
        <Link to="/" aria-label={h('nav.home', "ESGFlow, accueil")} className={`flex items-center gap-2.5 rounded-lg ${FOCUS}`}>
          <LogoMark size={34} decorative />
          <Wordmark className="text-xl" tone="dark" />
        </Link>

        <div className="hidden items-center gap-0.5 lg:flex">
          <FeaturesMegaMenu open={menuOpen} scrolled onOpen={openMenu} onClose={closeMenu} onModule={onModule} onSeeAll={() => scrollToId('fonctionnalites')} />
          {anchors.slice(0, 1).map(([id, label]) => <a key={id} href={`#${id}`} onClick={go(id)} className={link}>{label}</a>)}
          <Link to="/resources" className={link}>{t('landing.lp.nav.resources', 'Ressources') as string}</Link>
          <Link to="/normes" className={link}>{t('landing.lp.nav.normes', 'Normes') as string}</Link>
          {anchors.slice(1).map(([id, label]) => <a key={id} href={`#${id}`} onClick={go(id)} className={link}>{label}</a>)}
          <Link to="/contact" className={link}>{t('landing.lp.nav.contact', 'Contact') as string}</Link>
          <span className="mx-2 h-5 w-px bg-gray-300" aria-hidden="true" />
          <Link to="/login" className={link}>{t('landing.lp.nav.login', 'Connexion') as string}</Link>
          <Link to="/demo" className={`ml-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 ${FOCUS}`}>{t('landing.lp.nav.demo', 'Voir la démo') as string}</Link>
          <Link to="/register" className={`ml-1 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 ${FOCUS}`}>{t('landing.lp.nav.trial', 'Essai gratuit') as string}</Link>
        </div>

        <button type="button" aria-expanded={mobileOpen} aria-controls="mobile-menu"
          aria-label={mobileOpen ? t('landing.lp.nav.closeMenu', 'Fermer le menu') as string : t('landing.lp.nav.openMenu', 'Ouvrir le menu') as string}
          onClick={() => setMobileOpen(v => !v)}
          className={`tap-target flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 lg:hidden ${FOCUS}`}>
          {mobileOpen ? <XIcon className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </nav>

      {mobileOpen && (
        <div id="mobile-menu" className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-gray-100 bg-white shadow-xl lg:hidden">
          <div className="space-y-1 px-4 py-4">
            <button type="button" aria-expanded={mobileFeatures} aria-controls="mobile-features" onClick={() => setMobileFeatures(v => !v)}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {t('landing.lp.nav.featuresLabel', 'Fonctionnalités') as string}
              <ChevronDown className={`h-4 w-4 transition-transform ${mobileFeatures ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {mobileFeatures && (
              <div id="mobile-features" className="space-y-3 px-2 pb-2">
                {FEATURE_GROUPS.map(g => (
                  <div key={g.id}>
                    <p className="px-2 pb-1 pt-2 text-xs font-semibold text-gray-500">{t(`landing.lp.featureGroups.${g.id}`, g.title) as string}</p>
                    {g.items.map(item => {
                      const label = t(`landing.lp.features.${item.id}.title`, item.title) as string;
                      const cls = 'flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50';
                      return item.to
                        ? <Link key={item.id} to={item.to} onClick={() => setMobileOpen(false)} className={cls}><item.icon className="h-4 w-4 flex-shrink-0 text-emerald-700" aria-hidden="true" />{label}</Link>
                        : <button key={item.id} type="button" onClick={() => { onModule(item.module || item.id); setMobileOpen(false); }} className={cls}><item.icon className="h-4 w-4 flex-shrink-0 text-emerald-700" aria-hidden="true" />{label}</button>;
                    })}
                  </div>
                ))}
                <Link to="/ressources/suis-je-concerne" onClick={() => setMobileOpen(false)} className="mx-2 block rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800">
                  {t('landing.lp.featuresPromo.title', 'Êtes-vous concerné par la CSRD ?') as string}
                </Link>
              </div>
            )}
            {anchors.map(([id, label]) => <a key={id} href={`#${id}`} onClick={go(id)} className={mobileLink}>{label}</a>)}
            <Link to="/resources" onClick={() => setMobileOpen(false)} className={mobileLink}>{t('landing.lp.nav.resources', 'Ressources') as string}</Link>
            <Link to="/normes" onClick={() => setMobileOpen(false)} className={mobileLink}>{t('landing.lp.nav.normes', 'Normes & Conformité') as string}</Link>
            <Link to="/contact" onClick={() => setMobileOpen(false)} className={mobileLink}>{t('landing.lp.nav.contact', 'Contact') as string}</Link>
            <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
              <Link to="/login" onClick={() => setMobileOpen(false)} className="block rounded-xl px-4 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">{t('landing.lp.nav.login', 'Connexion') as string}</Link>
              <Link to="/demo" onClick={() => setMobileOpen(false)} className="block rounded-xl border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">{t('landing.lp.nav.demo', 'Voir la démo') as string}</Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="block rounded-xl bg-emerald-700 px-4 py-3 text-center text-sm font-semibold text-white">{t('landing.lp.nav.trial14', 'Essai gratuit 14 jours') as string}</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
/** La structure d'un rapport de durabilité ESRS : ce que l'outil aide à remplir. Aucune donnée client, aucun chiffre. */
function ReportSheet() {
  const { h } = useHome();
  let row = 0;
  const delay = () => ({ animationDelay: `${150 + row++ * 55}ms` });
  return (
    <figure className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_28px_60px_-24px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div>
            <figcaption className="font-display text-xl font-medium text-gray-900">{h('sheet.title', "Rapport de durabilité")}</figcaption>
            <p className="mt-0.5 text-sm text-gray-500">{h('sheet.subtitle', "La structure ESRS suivie dans ESGFlow")}</p>
          </div>
        </div>
        <div className="flex items-baseline gap-3 border-b border-gray-100 bg-gray-50 px-6 py-3 lp-rise" style={delay()}>
          <span className="rounded-md bg-gray-200 px-1.5 py-0.5 text-xs font-bold tabular-nums text-gray-700">ESRS 2</span>
          <span className="text-sm text-gray-800">{h('sheet.general', "Informations générales")}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x sm:divide-gray-100">
          <GroupBlock group={ESRS_GROUPS[0]} delay={delay} />
          <div className="divide-y divide-gray-100 border-t border-gray-100 sm:border-t-0">
            <GroupBlock group={ESRS_GROUPS[1]} delay={delay} />
            <GroupBlock group={ESRS_GROUPS[2]} delay={delay} />
          </div>
        </div>
        <p className="border-t border-gray-100 bg-gray-50 px-6 py-3 text-xs text-gray-600">
          {h('sheet.footer', "80 points de données ESRS dans l’analyse d’écart.")}
        </p>
      </div>
    </figure>
  );
}

function GroupBlock({ group, delay }: { group: (typeof ESRS_GROUPS)[number]; delay: () => { animationDelay: string } }) {
  const { h } = useHome();
  return (
    <div className="px-6 py-5">
      <p className={`border-l-[3px] pl-3 text-sm font-semibold ${group.rule} ${group.tone}`}>{h(`esrsGroups.${group.id}`, group.label)}</p>
      <ul className="mt-3 space-y-2">
        {group.items.map(([code, title]) => (
          <li key={code} className="lp-rise flex items-baseline gap-3" style={delay()}>
            <span className={`w-8 flex-shrink-0 rounded-md px-1.5 py-0.5 text-center text-xs font-bold tabular-nums ${group.code}`}>{code}</span>
            <span className="text-[13px] leading-snug text-gray-800">{h(`esrs.${code}`, title)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Hero() {
  const { h } = useHome();
  const facts: { icon: typeof Layers; title: string; sub: string }[] = [
    { icon: Layers, title: h('facts.0.title', "22 modules"), sub: h('facts.0.sub', "dans un seul outil") },
    { icon: Upload, title: h('facts.1.title', "FEC, CSV, Excel"), sub: h('facts.1.sub', "imports et exports RH") },
    { icon: Code2, title: h('facts.2.title', "API REST et webhooks"), sub: h('facts.2.sub', "pour les intégrations sur mesure") },
    { icon: Server, title: h('facts.3.title', "Hébergeur européen"), sub: h('facts.3.sub', "données cloisonnées par client") },
  ];
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-white pb-16 pt-28 sm:pt-32 lg:pb-20 lg:pt-36">
      <FlowWaves className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[56%] [-webkit-mask-image:linear-gradient(to_right,transparent,#000_40%)] [mask-image:linear-gradient(to_right,transparent,#000_40%)] lg:block" />
      <div className={`${WRAP} relative`}>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <h1 id="hero-title" className="font-display text-[42px] font-medium leading-[1.04] tracking-[-0.02em] text-gray-900 sm:text-6xl lg:text-[64px]">
              {h('hero.title', "Votre reporting CSRD, de la donnée brute au rapport.")}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-600">
              {h('hero.subtitle', "ESGFlow réunit la collecte, le bilan carbone, les normes ESRS et la piste d’audit dans un seul outil. Importez un FEC, un CSV ou un fichier Excel, puis préparez votre rapport section par section.")}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/register" className={BTN_PRIMARY}>
                {h('hero.cta1', "Essai gratuit 14 jours")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/demo" className={BTN_SECONDARY}>{h('hero.cta2', "Voir la démo")}</Link>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <Check className="h-4 w-4 flex-shrink-0 text-emerald-700" aria-hidden="true" />
              {h('hero.note', "Aucune carte bancaire · Sans engagement")}
            </p>
          </div>
          <div className="lg:col-span-6"><ReportSheet /></div>
        </div>

        <ul className="mt-16 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-gray-200 pt-8 lg:mt-20 lg:grid-cols-4">
          {facts.map(({ icon: Icon, title, sub }) => (
            <li key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-700" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-sm text-gray-600">{sub}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── Parcours : de la donnée au dossier d'audit ───────────────────────────────
function Pipeline() {
  const { h } = useHome();
  const steps = [
    { icon: Upload, k: 'collect', title: "Collecter", desc: "Importez un FEC, un CSV ou un fichier Excel, ou saisissez à la main. Les exports RH de Silae, Lucca et PayFit sont acceptés ; les connexions Pennylane, Qonto et Enedis sont en bêta." },
    { icon: Flame, k: 'compute', title: "Calculer", desc: "Émissions des Scopes 1, 2 et 3 avec les facteurs ADEME (des estimations à relire), scores par pilier E, S et G, et analyse d’écart sur les points de données ESRS." },
    { icon: FileText, k: 'write', title: "Rédiger", desc: "Construisez le rapport section par section, de E1 à G1, suivez la complétion et exportez en PDF, Word, Excel ou JSON. L’IA propose, votre équipe valide." },
    { icon: ShieldCheck, k: 'trace', title: "Tracer", desc: "Chaque donnée passe de brouillon à approuvé, avec une empreinte SHA-256 par validation. L’aperçu iXBRL se vérifie avec Arelle ; le dépôt ESEF reste à faire avec vos conseils." },
  ];
  return (
    <section aria-labelledby="pipeline-title" className="scroll-mt-16 bg-gray-50 py-20 sm:py-24">
      <div className={WRAP}>
        <h2 id="pipeline-title" className={H2}>{h('pipeline.title', "Du fichier brut au dossier d’audit")}</h2>
        <p className={LEAD}>{h('pipeline.subtitle', "Quatre étapes qui réutilisent les mêmes données : rien à ressaisir d’un outil à l’autre.")}</p>
        <ol className="relative mt-14 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <span aria-hidden="true" className="absolute left-5 right-5 top-5 hidden h-[3px] rounded-full bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 lg:block" />
          {steps.map((s, i) => (
            <li key={s.k} className="relative">
              <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-900 bg-gray-50 text-sm font-bold text-gray-900">{i + 1}</span>
              <h3 className="mt-5 flex items-center gap-2 font-display text-2xl font-medium text-gray-900">
                <s.icon className="h-5 w-5 text-gray-500" aria-hidden="true" />
                {h(`pipeline.${s.k}.title`, s.title)}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{h(`pipeline.${s.k}.desc`, s.desc)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ─── Explorateur de modules ───────────────────────────────────────────────────
function ModuleExplorer({ active, onSelect }: { active: number; onSelect: (index: number) => void }) {
  const { t, h } = useHome();
  const mod = MODULES[active];
  const category = MODULE_CATEGORIES.find(c => c.modules.includes(mod.id)) ?? MODULE_CATEGORIES[0];
  const indexes = category.modules.map(id => MODULES.findIndex(x => x.id === id)).filter(i => i >= 0);
  const Preview = PREVIEWS[mod.preview];
  const tMod = (m: { id: string; name: string; tagline: string; desc: string }, field: 'name' | 'tagline' | 'desc') =>
    t(`landing.lp.modules.${m.id}.${field}`, m[field]) as string;

  return (
    <section id="modules" aria-labelledby="modules-title" className="scroll-mt-16 bg-gray-50 py-20 sm:py-24">
      <div className={WRAP}>
        <h2 id="modules-title" className={H2}>{t('landing.lp.modulesSection.title', '22 modules. Une seule plateforme.') as string}</h2>
        <p className={LEAD}>{t('landing.lp.modulesSection.subtitle', 'Chaque module est conçu pour répondre à un besoin précis — et ils fonctionnent tous ensemble.') as string}</p>

        <div role="tablist" aria-label={t('landing.lp.modulesSection.tabsLabel', 'Catégories de modules') as string}
          className="mb-8 mt-10 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MODULE_CATEGORIES.map(c => {
            const on = c.id === category.id;
            return (
              <button key={c.id} id={`module-tab-${c.id}`} role="tab" type="button" aria-selected={on} aria-controls="module-panel"
                onClick={() => { const first = MODULES.findIndex(m => m.id === c.modules[0]); if (first >= 0) onSelect(first); }}
                className={`inline-flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${FOCUS} ${on ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'}`}>
                {t(`landing.lp.modulesSection.cat.${c.id}`, c.label) as string}
                <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${on ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>{c.modules.length}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1">
            {indexes.map(i => {
              const m = MODULES[i];
              const on = i === active;
              return (
                <li key={m.id}>
                  <button type="button" aria-current={on ? 'true' : undefined} onClick={() => onSelect(i)}
                    className={`flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-colors ${FOCUS} ${on ? 'border-gray-900 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${m.color}1a`, color: m.color }}>
                      <m.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-900">{tMod(m, 'name')}</span>
                      <span className="mt-0.5 block truncate text-xs text-gray-600">{tMod(m, 'tagline')}</span>
                    </span>
                    <ChevronRight className={`h-4 w-4 flex-shrink-0 ${on ? 'text-gray-900' : 'text-gray-400'}`} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div id="module-panel" role="tabpanel" aria-labelledby={`module-tab-${category.id}`} className="lg:col-span-3">
            <div className="overflow-hidden rounded-2xl border border-gray-200 border-t-4 bg-white" style={{ borderTopColor: mod.color }}>
              <div className="mx-4 mt-4 overflow-hidden rounded-xl bg-slate-900">
                {Preview && <Preview />}
              </div>
              <p className="px-6 pb-2 pt-2 text-right text-xs text-gray-600">
                {t('landing.lp.modulesSection.illustrative', 'Aperçu illustratif · données fictives') as string}
              </p>
              <div className="px-6 pb-6">
                <h3 className="font-display text-2xl font-medium text-gray-900">{tMod(mod, 'name')}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{tMod(mod, 'desc')}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {mod.badges.map((b, i) => (
                    <li key={i} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
                      <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                      {t(`landing.lp.modules.${mod.id}.badges.${i}`, b) as string}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {mod.featurePath && (
                    <Link to={mod.featurePath} className={`${BTN_PRIMARY} !px-5 !py-2.5 !text-sm`}>
                      {t('landing.lp.modulesSection.learnMore', 'En savoir plus') as string} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}
                  <Link to="/register" className={mod.featurePath ? `${BTN_SECONDARY} !px-5 !py-2.5 !text-sm` : `${BTN_PRIMARY} !px-5 !py-2.5 !text-sm`}>
                    {t('landing.lp.nav.trial', 'Essai gratuit') as string}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="sr-only">{h('modules.hint', "Choisissez une catégorie, puis un module pour voir son aperçu.")}</p>
      </div>
    </section>
  );
}

// ─── Données et intégrations ──────────────────────────────────────────────────
function DataSources() {
  const { h } = useHome();
  const columns: { k: string; icon: typeof Upload; title: string; items: string[] }[] = [
    {
      k: 'import', icon: Upload, title: "Importer",
      items: ["FEC (Sage, Cegid, Pennylane)", "Fichiers CSV et Excel", "Exports RH de Silae, Lucca et PayFit", "Saisie guidée, indicateur par indicateur"],
    },
    {
      k: 'connect', icon: Plug, title: "Se connecter",
      items: ["Pennylane, Qonto et Enedis (en bêta)", "Google Sheets : import et export", "INSEE Sirene : données légales à partir d’un SIREN, interrogées à la demande"],
    },
    {
      k: 'automate', icon: Radio, title: "Automatiser",
      items: ["API REST avec clés d’API et documentation interactive", "Webhooks signés HMAC-SHA256, avec journal des livraisons"],
    },
  ];
  return (
    <section id="donnees" aria-labelledby="data-title" className="scroll-mt-16 bg-white py-20 sm:py-24">
      <div className={WRAP}>
        <h2 id="data-title" className={H2}>{h('data.title', "Vos données entrent par plusieurs portes")}</h2>
        <p className={LEAD}>{h('data.subtitle', "Importez vos fichiers, branchez vos outils ou laissez vos services recevoir les événements d’ESGFlow.")}</p>

        <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-gray-200">
          {columns.map(col => (
            <div key={col.k} className="md:px-8 md:first:pl-0 md:last:pr-0">
              <h3 className="flex items-center gap-2 font-display text-2xl font-medium text-gray-900">
                <col.icon className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                {h(`data.${col.k}.title`, col.title)}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[15px] leading-snug text-gray-700">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" aria-hidden="true" />
                    {h(`data.${col.k}.items.${i}`, item)}
                  </li>
                ))}
              </ul>
              {col.k === 'automate' && (
                <div className="mt-5">
                  <p className="text-sm font-medium text-gray-900">{h('data.events', "Six événements disponibles")}</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {WEBHOOK_EVENTS.map(ev => (
                      <li key={ev}><code className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs text-gray-800">{ev}</code></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="mt-10 max-w-3xl rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm leading-relaxed text-gray-700">
          {h('data.limits', "SAP, Oracle et Workday ne sont pas disponibles en standard : dites-nous votre besoin, l’API permet des intégrations sur mesure.")}{' '}
          <Link to="/contact" className="font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-900">{h('data.contact', "Nous écrire")}</Link>
        </p>
      </div>
    </section>
  );
}

// ─── Tarifs et simulateur ─────────────────────────────────────────────────────
function RangeField({ label, value, min, max, step, display, onChange, icon: Icon }:
  { label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void; icon: typeof Users }) {
  const id = useId();
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <label htmlFor={id} className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-800">
          <Icon className="h-4 w-4 text-gray-500" aria-hidden="true" />{label}
        </label>
        <output htmlFor={id} className="shrink-0 whitespace-nowrap rounded-lg bg-gray-100 px-3 py-1 text-lg font-semibold tabular-nums text-gray-900">{display}</output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)}
        className={`h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-emerald-700 ${FOCUS}`} />
    </div>
  );
}

function RoiCalculator({ billing }: { billing: 'monthly' | 'annual' }) {
  const { h, lang } = useHome();
  const [hours, setHours] = useState(120);
  const [rate, setRate] = useState(65);
  const [gain, setGain] = useState(50);
  const [planName, setPlanName] = useState('ETI');
  const plan = PLANS.find(p => p.name === planName) ?? PLANS[1];
  const planCost = billing === 'annual' ? plan.annual : plan.monthly;

  const hoursSaved = Math.round(hours * gain / 100);
  const yearlySavings = hoursSaved * rate * 12;
  const yearlyCost = planCost * 12;
  const net = yearlySavings - yearlyCost;
  const roi = Math.round(net / yearlyCost * 100);
  const loc = lang?.startsWith('en') ? 'en-GB' : 'fr-FR';
  const eur = (n: number) => `${n.toLocaleString(loc)} €`;

  return (
    <div id="roi-calculator" className="mt-20 rounded-2xl border border-gray-200 bg-white p-6 sm:p-10">
      <h3 className="font-display text-2xl font-medium text-gray-900 sm:text-3xl">{h('roi.title', "Estimez le temps que vous pourriez gagner")}</h3>
      <p className="mt-2 max-w-2xl text-gray-600">{h('roi.subtitle', "Une simulation à partir de vos propres chiffres. Le gain de temps est votre hypothèse : aucune valeur n’a été mesurée chez des clients.")}</p>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-5">
        <div className="space-y-7 lg:col-span-3">
          <RangeField icon={Calculator} label={h('roi.hours', "Heures par mois consacrées à l’ESG")} value={hours} min={10} max={500} step={5} display={`${hours} h`} onChange={setHours} />
          <RangeField icon={TrendingUp} label={h('roi.rate', "Coût horaire chargé")} value={rate} min={25} max={200} step={5} display={eur(rate)} onChange={setRate} />
          <RangeField icon={Zap} label={h('roi.gain', "Part du temps que vous pensez gagner")} value={gain} min={10} max={90} step={5} display={`${gain} %`} onChange={setGain} />
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-800">{h('roi.plan', "Plan comparé")}</legend>
            <div className="inline-flex rounded-xl border border-gray-300 bg-white p-1">
              {PLANS.map(p => (
                <button key={p.name} type="button" aria-pressed={p.name === planName} onClick={() => setPlanName(p.name)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${FOCUS} ${p.name === planName ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                  {p.name}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-gray-50 p-6" aria-live="polite">
            <dl className="space-y-4 text-sm">
              <div className="flex items-baseline justify-between gap-4 border-b border-gray-200 pb-4">
                <dt className="text-gray-600">{h('roi.hoursSaved', "Temps gagné")}</dt>
                <dd className="whitespace-nowrap text-xl font-semibold tabular-nums text-gray-900">{hoursSaved} h<span className="text-sm font-normal text-gray-500">{h('roi.perMonth', " / mois")}</span></dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-gray-200 pb-4">
                <dt className="text-gray-600">{h('roi.yearlySavings', "Valeur du temps gagné")}</dt>
                <dd className="whitespace-nowrap text-xl font-semibold tabular-nums text-gray-900">{eur(yearlySavings)}<span className="text-sm font-normal text-gray-500">{h('roi.perYear', " / an")}</span></dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-gray-200 pb-4">
                <dt className="text-gray-600">{h('roi.yearlyCost', "Abonnement")} {plan.name}</dt>
                <dd className="whitespace-nowrap text-xl font-semibold tabular-nums text-gray-900">{eur(yearlyCost)}<span className="text-sm font-normal text-gray-500">{h('roi.perYear', " / an")}</span></dd>
              </div>
              <div>
                <dt className="text-gray-600">{h('roi.net', "Gain net estimé")}</dt>
                <dd className={`mt-1 font-display text-4xl font-medium tabular-nums ${net >= 0 ? 'text-emerald-800' : 'text-gray-700'}`}>
                  {net >= 0 ? '+' : '−'}{eur(Math.abs(net))}<span className="font-sans text-sm font-normal text-gray-500">{h('roi.perYear', " / an")}</span>
                </dd>
                <p className="mt-2 text-xs text-gray-600">
                  {net >= 0
                    ? `${h('roi.roiLabel', "Retour sur investissement estimé :")} ${roi > 0 ? '+' : ''}${roi} %`
                    : h('roi.negative', "Avec ces hypothèses, l’abonnement coûte plus que le temps gagné : ajustez les curseurs à votre situation.")}
                </p>
              </div>
            </dl>
          </div>
          <Link to="/register" className={`${BTN_PRIMARY} mt-4 w-full`}>{h('roi.cta', "Essai gratuit 14 jours")}</Link>
        </div>
      </div>
    </div>
  );
}

function Pricing() {
  const { t, h } = useHome();
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const toggle = (on: boolean) =>
    `rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${FOCUS} ${on ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`;
  return (
    <section id="tarifs" aria-labelledby="pricing-title" className="scroll-mt-16 bg-gray-50 py-20 sm:py-24">
      <div className={WRAP}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="pricing-title" className={H2}>{t('landing.lp.pricing.title', 'Plans adaptés à votre taille') as string}</h2>
            <p className={LEAD}>{t('landing.lp.pricing.subtitle', 'Commencez gratuitement. Évoluez à votre rythme. Sans engagement.') as string}</p>
          </div>
          <div role="group" aria-label={h('pricing.billing', "Période de facturation")} className="inline-flex flex-shrink-0 items-center gap-1 self-start rounded-xl border border-gray-300 bg-white p-1 sm:self-auto">
            <button type="button" aria-pressed={billing === 'monthly'} onClick={() => setBilling('monthly')} className={toggle(billing === 'monthly')}>{t('landing.lp.pricing.monthly', 'Mensuel') as string}</button>
            <button type="button" aria-pressed={billing === 'annual'} onClick={() => setBilling('annual')} className={`${toggle(billing === 'annual')} flex items-center gap-2`}>
              {t('landing.lp.pricing.annual', 'Annuel') as string}
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${billing === 'annual' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>-15 %</span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
          {PLANS.map((plan, i) => {
            const price = billing === 'annual' ? plan.annual : plan.monthly;
            return (
              <div key={plan.name} className={`relative flex flex-col rounded-2xl bg-white p-7 ${plan.primary ? 'border-2 border-emerald-700' : 'border border-gray-200'}`}>
                {plan.badge && (
                  <span className={`absolute -top-3 left-7 rounded-full px-3 py-1 text-xs font-semibold ${plan.primary ? 'bg-emerald-700 text-white' : 'bg-gray-900 text-white'}`}>
                    {t(`landing.lp.pricing.plans.${i}.badge`, plan.badge) as string}
                  </span>
                )}
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-gray-600">{t(`landing.lp.pricing.plans.${i}.desc`, plan.desc) as string}</p>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="font-display text-5xl font-medium tabular-nums text-gray-900">{price} €</span>
                  <span className="text-sm text-gray-600">
                    {t('landing.lp.pricing.perMonth', '/mois') as string}
                    {billing === 'annual' && <span className="block text-xs font-semibold text-emerald-800">{t('landing.lp.pricing.billedAnnually', 'facturé annuellement') as string}</span>}
                  </span>
                </p>
                <Link to="/register" className={`${plan.primary ? BTN_PRIMARY : BTN_SECONDARY} mt-6 w-full`}>
                  {t(`landing.lp.pricing.plans.${i}.cta`, plan.cta) as string}
                </Link>
                <ul className="mt-7 flex-1 space-y-2.5">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-gray-800">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" aria-hidden="true" />
                      {t(`landing.lp.pricing.plans.${i}.features.${j}`, f) as string}
                    </li>
                  ))}
                  {plan.missing.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-gray-500">
                      <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
                      <span><span className="sr-only">{h('pricing.notIncluded', "Non inclus : ")}</span>{t(`landing.lp.pricing.plans.${i}.missing.${j}`, f) as string}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="mt-8 text-sm text-gray-600">
          {t('landing.lp.pricing.vatNote', 'Tous les prix sont HT · TVA applicable · ') as string}
          <a href="#faq" onClick={(e) => { e.preventDefault(); scrollToId('faq'); }} className="font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-900">{t('landing.lp.pricing.faqLink', 'Questions fréquentes') as string}</a>
        </p>

        <RoiCalculator billing={billing} />
      </div>
    </section>
  );
}

// ─── Sécurité et données ──────────────────────────────────────────────────────
function SecuritySection() {
  const { h } = useHome();
  const items = [
    { icon: Shield, k: 'isolation', title: "Isolation par client", desc: "Chaque organisation ne voit que ses propres données : le cloisonnement est appliqué dans la base (RLS PostgreSQL)." },
    { icon: Lock, k: 'secrets', title: "Secrets chiffrés", desc: "Les identifiants de vos connecteurs sont chiffrés avant d’être stockés." },
    { icon: ShieldCheck, k: 'audit', title: "Piste d’audit", desc: "Les validations sont datées et portent une empreinte SHA-256 : toute modification ultérieure est détectée." },
    { icon: Users, k: 'access', title: "Accès par rôles", desc: "Rôles à plusieurs niveaux et SSO OpenID Connect (plan Groupe). Aucun autre protocole SSO n’est proposé." },
  ];
  return (
    <section id="securite" aria-labelledby="security-title" className="scroll-mt-16 bg-white py-20 sm:py-24">
      <div className={WRAP}>
        <h2 id="security-title" className={H2}>{h('security.title', "Sécurité et données")}</h2>
        <p className={LEAD}>{h('security.subtitle', "Ce que la plateforme fait aujourd’hui pour protéger vos données, sans promesse que nous ne pourrions pas documenter.")}</p>
        <ul className="mt-12 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
          {items.map(({ icon: Icon, k, title, desc }) => (
            <li key={k} className="flex gap-4">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <h3 className="font-semibold text-gray-900">{h(`security.${k}.title`, title)}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-gray-600">{h(`security.${k}.desc`, desc)}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <Server className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-600" aria-hidden="true" />
            <p className="max-w-3xl text-[15px] leading-relaxed text-gray-700">
              {h('security.hosting', "Hébergement chez un prestataire européen. Les fonctions d’IA envoient le texte analysé à OpenAI, un prestataire américain : c’est indiqué avant chaque envoi. Aucune certification de sécurité n’est revendiquée à ce stade.")}
            </p>
          </div>
          <Link to="/security" className="flex-shrink-0 text-sm font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-900">{h('security.more', "Détails sur la page Sécurité")}</Link>
        </div>
      </div>
    </section>
  );
}

// ─── Ressources ───────────────────────────────────────────────────────────────
function Resources() {
  const { h } = useHome();
  const guides = [
    { k: 'csrdpme', href: '/guide/csrd-pme', category: "Guide", title: "CSRD pour les PME", desc: "Calendrier, seuils, normes ESRS et plan d’action concret." },
    { k: 'carbon', href: '/guide/bilan-carbone-entreprise', category: "Guide", title: "Bilan carbone d’entreprise", desc: "Scopes 1, 2 et 3, facteurs ADEME, obligations légales et méthode pas à pas." },
    { k: 'csddd', href: '/guide/csddd-supply-chain', category: "Guide", title: "CSDDD et chaîne d’approvisionnement", desc: "Qui est concerné, obligations, calendrier d’application et plan de mise en conformité." },
    { k: 'checklist', href: '/ressources/checklist-csrd', category: "Checklist", title: "Checklist CSRD", desc: "46 indicateurs ESRS prioritaires classés par criticité, en PDF envoyé par e-mail." },
  ];
  return (
    <section id="ressources" aria-labelledby="resources-title" className="scroll-mt-16 bg-gray-50 py-20 sm:py-24">
      <div className={WRAP}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="resources-title" className={H2}>{h('resources.title', "Guides et ressources gratuites")}</h2>
            <p className={LEAD}>{h('resources.subtitle', "Pour comprendre ce qui vous concerne avant de choisir un outil.")}</p>
          </div>
          <Link to="/resources" className={`inline-flex items-center gap-1.5 self-start rounded-lg text-sm font-semibold text-emerald-800 hover:text-emerald-900 sm:self-auto ${FOCUS}`}>
            {h('resources.all', "Toutes les ressources")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-5">
          <Link to="/ressources/suis-je-concerne" className={`group flex flex-col justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-7 transition-colors hover:bg-emerald-100/70 lg:col-span-2 ${FOCUS}`}>
            <div>
              <Landmark className="h-8 w-8 text-emerald-700" aria-hidden="true" />
              <h3 className="mt-5 font-display text-2xl font-medium text-gray-900">{h('resources.eligibility.title', "Êtes-vous concerné par la CSRD ?")}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-gray-700">{h('resources.eligibility.desc', "Répondez à quelques questions et sachez si votre entreprise entre dans le champ, avec les seuils en vigueur après l’omnibus.")}</p>
            </div>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-900">
              {h('resources.eligibility.cta', "Tester mon éligibilité")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>

          <ul className="divide-y divide-gray-200 border-y border-gray-200 lg:col-span-3">
            {guides.map(g => (
              <li key={g.k}>
                <Link to={g.href} className={`group flex items-start justify-between gap-4 py-5 ${FOCUS}`}>
                  <span>
                    <span className="text-xs font-semibold text-gray-600">{h(`resources.${g.k}.category`, g.category)}</span>
                    <span className="mt-0.5 block text-lg font-semibold text-gray-900 group-hover:text-emerald-800">{h(`resources.${g.k}.title`, g.title)}</span>
                    <span className="mt-1 block text-[15px] leading-relaxed text-gray-600">{h(`resources.${g.k}.desc`, g.desc)}</span>
                  </span>
                  <ArrowRight className="mt-6 h-4 w-4 flex-shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-800" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Link to="/normes" className={`group mt-8 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-gray-300 sm:flex-row sm:items-center sm:justify-between ${FOCUS}`}>
          <div className="flex items-start gap-4">
            <FileCheck className="mt-0.5 h-6 w-6 flex-shrink-0 text-emerald-700" aria-hidden="true" />
            <div>
              <p className="font-semibold text-gray-900">{h('resources.vsme.title', "Norme volontaire VSME (EFRAG) incluse")}</p>
              <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-gray-600">{h('resources.vsme.desc', "Un modèle couvre les 11 exigences du Module de Base (B1 à B11), pour répondre aux demandes ESG de vos banques et donneurs d’ordre sans produire un rapport CSRD complet.")}</p>
            </div>
          </div>
          <span className="inline-flex flex-shrink-0 items-center gap-1.5 text-sm font-semibold text-emerald-800">
            {h('resources.vsme.cta', "Voir les normes couvertes")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>
      </div>
    </section>
  );
}

// ─── À propos ─────────────────────────────────────────────────────────────────
function About() {
  const { h } = useHome();
  const principles = [
    { k: 'selfservice', title: "Un démarrage en autonomie", desc: "Vous créez votre compte et commencez seul : aucun projet d’intégration n’est nécessaire." },
    { k: 'estimates', title: "Des estimations présentées comme telles", desc: "Facteurs ADEME indicatifs, méthode monétaire sur le FEC : l’outil vous invite à relire ces résultats avant usage." },
    { k: 'review', title: "Une relecture humaine", desc: "L’IA propose des textes et des réponses ; votre équipe les valide avant qu’ils ne servent." },
  ];
  return (
    <section id="qui-sommes-nous" aria-labelledby="about-title" className="scroll-mt-16 bg-white py-20 sm:py-24">
      <div className={`${WRAP} grid gap-12 lg:grid-cols-2 lg:gap-16`}>
        <div>
          <h2 id="about-title" className={H2}>{h('about.title', "Une plateforme pour les équipes qui préparent leur premier rapport")}</h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-gray-600">
            {h('about.p1', "ESGFlow est une plateforme de reporting ESG récente, pensée pour les PME et ETI qui doivent préparer leur reporting CSRD ou répondre aux demandes ESG de leurs clients et de leurs banques.")}
          </p>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-gray-600">
            {h('about.p2', "Nous n’affichons ni références clients ni récompenses : vous jugerez sur pièces, pendant les 14 jours d’essai.")}
          </p>
          <Link to="/contact" className={`${BTN_SECONDARY} mt-7`}><Mail className="h-4 w-4" aria-hidden="true" />{h('about.cta', "Une question avant de vous lancer ?")}</Link>
        </div>
        <ul className="space-y-6 lg:pt-3">
          {principles.map(p => (
            <li key={p.k} className="border-l-[3px] border-emerald-600 pl-5">
              <h3 className="font-semibold text-gray-900">{h(`about.${p.k}.title`, p.title)}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-gray-600">{h(`about.${p.k}.desc`, p.desc)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="border-b border-gray-200">
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}
          className={`flex w-full items-center justify-between gap-4 py-5 text-left text-[17px] font-semibold text-gray-900 hover:text-emerald-800 ${FOCUS}`}>
          {q}
          {open ? <Minus className="h-5 w-5 flex-shrink-0 text-emerald-700" aria-hidden="true" /> : <Plus className="h-5 w-5 flex-shrink-0 text-gray-500" aria-hidden="true" />}
        </button>
      </h3>
      <div id={id} role="region" hidden={!open} className="pb-5 pr-9 text-[15px] leading-relaxed text-gray-600">{a}</div>
    </div>
  );
}

function Faq() {
  const { t } = useHome();
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-16 bg-gray-50 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 id="faq-title" className={H2}>{t('landing.lp.faq.title', 'Questions fréquentes') as string}</h2>
        <div className="mt-10 border-t border-gray-200">
          {FAQS.map((f, i) => <FaqItem key={i} q={t(`landing.lp.faq.items.${i}.q`, f.q) as string} a={t(`landing.lp.faq.items.${i}.a`, f.a) as string} />)}
        </div>
      </div>
    </section>
  );
}

// ─── Appel final et pied de page ──────────────────────────────────────────────
function FinalCta() {
  const { h } = useHome();
  return (
    <section aria-labelledby="cta-title" className="relative overflow-hidden bg-emerald-950 py-20 sm:py-24">
      <FlowWaves dark className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className={`${WRAP} relative`}>
        <h2 id="cta-title" className="max-w-3xl font-display text-4xl font-medium leading-[1.1] tracking-tight text-white sm:text-5xl">
          {h('cta.title', "Essayez ESGFlow avec vos propres données.")}
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-emerald-100">
          {h('cta.subtitle', "14 jours, sans carte bancaire. Importez un FEC ou saisissez un premier indicateur : vous verrez ce que l’outil fait de vos chiffres.")}
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link to="/register" className={`inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-[15px] font-semibold text-emerald-950 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950`}>
            {h('cta.primary', "Démarrer gratuitement")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link to="/demo" className="inline-flex items-center justify-center rounded-xl border border-white/40 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950">
            {h('cta.secondary', "Voir la démo")}
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { t, h } = useHome();
  const cols: { k: string; title: string; links: { label: string; href: string; anchor?: string }[] }[] = [
    { k: 'features', title: "Fonctionnalités", links: [
      { label: "Bilan carbone Scope 3", href: '/features/bilan-carbone' },
      { label: "Reporting CSRD / ESRS", href: '/features/csrd-reporting' },
      { label: "Plan de décarbonation SBTi", href: '/features/decarbonation' },
      { label: "Chaîne d’approvisionnement", href: '/features/supply-chain' },
      { label: "Double matérialité", href: '/features/double-materialite' },
      { label: "Taxonomie UE", href: '/features/taxonomie-ue' },
      { label: "IA et automatisation", href: '/features/ia-automatisation' },
      { label: "Piste d’audit", href: '/features/audit-trail' },
    ] },
    { k: 'resources', title: "Ressources", links: [
      { label: "Guide CSRD pour les PME", href: '/guide/csrd-pme' },
      { label: "Guide du bilan carbone", href: '/guide/bilan-carbone-entreprise' },
      { label: "Guide CSDDD", href: '/guide/csddd-supply-chain' },
      { label: "Checklist CSRD", href: '/ressources/checklist-csrd' },
      { label: "Normes couvertes", href: '/normes' },
      { label: "Centre d’aide", href: '/help' },
    ] },
    { k: 'company', title: "ESGFlow", links: [
      { label: "Tarifs", href: '#tarifs', anchor: 'tarifs' },
      { label: "À propos", href: '#qui-sommes-nous', anchor: 'qui-sommes-nous' },
      { label: "Sécurité", href: '/security' },
      { label: "Support", href: '/support' },
      { label: "Contact", href: '/contact' },
    ] },
  ];
  const linkCls = `rounded text-sm text-slate-400 transition-colors hover:text-white ${FOCUS} focus-visible:ring-offset-slate-950`;
  return (
    <footer className="bg-slate-950 py-16 text-white">
      <div className={WRAP}>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2.5">
              <LogoMark size={34} decorative />
              <Wordmark className="text-xl" tone="light" />
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-slate-400">{t('landing.lp.footer.tagline', 'La plateforme ESG pour préparer votre reporting CSRD : collecte, scores, rapports, IA.') as string}</p>
          </div>
          {cols.map(col => (
            <div key={col.k}>
              <h3 className="mb-4 text-sm font-semibold text-white">{h(`footer.${col.k}.title`, col.title)}</h3>
              <ul className="space-y-3">
                {col.links.map((l, i) => (
                  <li key={l.href}>
                    {l.anchor
                      ? <a href={l.href} onClick={(e) => { e.preventDefault(); scrollToId(l.anchor!); }} className={linkCls}>{h(`footer.${col.k}.links.${i}`, l.label)}</a>
                      : <Link to={l.href} className={linkCls}>{h(`footer.${col.k}.links.${i}`, l.label)}</Link>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-slate-800 pt-8 md:flex-row md:items-center">
          <p className="text-sm text-slate-400">{t('landing.lp.footer.copyright', '© 2026 ESGFlow. Tous droits réservés.') as string}</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
            <li><Link to="/legal-notice" className={linkCls}>{t('landing.lp.footer.legalNotice', 'Mentions légales') as string}</Link></li>
            <li><Link to="/privacy-policy" className={linkCls}>{t('landing.lp.footer.privacy', 'Confidentialité') as string}</Link></li>
            <li><Link to="/terms-of-service" className={linkCls}>{t('landing.lp.footer.terms', 'CGU') as string}</Link></li>
            <li><Link to="/privacy-policy#cookies" className={linkCls}>{t('landing.lp.footer.cookies', 'Cookies') as string}</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  useLightTheme();
  const [activeModule, setActiveModule] = useState(0);

  usePageSeo({
    id: 'landing',
    title: 'ESGFlow — Plateforme ESG tout-en-un pour la conformité CSRD, Taxonomie UE & Bilan Carbone',
    description: 'ESGFlow centralise votre conformité ESG en une seule plateforme : CSRD, Taxonomie UE, SFDR, SBTi, Bilan Carbone, Vigilance. 22 modules, hébergeur européen, RGPD. Essai gratuit 14 jours.',
    keywords: 'ESG, CSRD, Taxonomie UE, SFDR, SBTi, bilan carbone, RSE, conformité ESG, plateforme ESG, reporting durabilité, ESRS, GHG Protocol, ADEME, devoir de vigilance, CSDDD',
    url: 'https://greenconnect.cloud/',
    ogImage: 'https://greenconnect.cloud/og/landing.png',
    ogTitle: 'ESGFlow — Conformité ESG simplifiée',
    ogDescription: '22 modules ESG dans une seule plateforme. CSRD, Taxonomie UE, SFDR, Bilan Carbone, SBTi. Hébergeur européen. Essai gratuit.',
    faqJsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.slice(0, 5).map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  });

  // Ouvre un module dans l'explorateur de modules (menu Fonctionnalités, section Fonctionnalités).
  const openModule = (moduleId: string) => {
    const i = MODULES.findIndex(m => m.id === moduleId);
    scrollToId('modules');
    if (i >= 0) setActiveModule(i);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 antialiased">
      <style>{PAGE_CSS}</style>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg">
        Aller au contenu
      </a>
      <Nav onModule={openModule} />
      <main id="contenu">
        <Hero />
        <Pipeline />
        <FeaturesOverview onModule={openModule} />
        <LazySection id="modules" minHeight={720}><ModuleExplorer active={activeModule} onSelect={setActiveModule} /></LazySection>
        <LazySection id="donnees" minHeight={520}><DataSources /></LazySection>
        <LazySection id="tarifs" minHeight={900}><Pricing /></LazySection>
        <LazySection id="securite" minHeight={520}><SecuritySection /></LazySection>
        <LazySection id="ressources" minHeight={560}><Resources /></LazySection>
        <LazySection id="qui-sommes-nous" minHeight={420}><About /></LazySection>
        <LazySection id="faq" minHeight={640}><Faq /></LazySection>
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
