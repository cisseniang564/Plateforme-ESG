import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { usePageSeo } from '@/hooks/usePageSeo';
import {
  TrendingUp, Shield, Zap, Users, FileText, BarChart3,
  CheckCircle, ArrowRight, Sparkles, Award, ChevronDown,
  Brain, Building2, Database, Plus, Minus, Star, Check, X,
  Play, Leaf, Globe, ChevronRight, Truck, ClipboardList,
  FlameKindling, Scale, PackageSearch, ShieldCheck, TrendingDown,
  Flame, Lock, Hash, Target, Layers, Plug, Radio, Link2, Server, Eye,
  Table2, PieChart, FileSpreadsheet, Activity, Search, Bell,
  GitMerge, BarChart2, AlertTriangle, BookOpen, Upload, RefreshCw,
  CheckSquare, TrendingUp as Trending, Cpu, MapPin, Code2,
  Menu, X as XIcon, Clock, Calculator, FileCheck, ArrowUpRight,
  Newspaper, GraduationCap, ChevronLeft, Mail, ShieldAlert,
} from 'lucide-react';

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useCounter(end: number, duration = 2000, started = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let t: number | null = null;
    const step = (ts: number) => {
      if (!t) t = ts;
      const p = Math.min((ts - t) / duration, 1);
      setCount(Math.floor(p * end));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, started]);
  return count;
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useInterval(cb: () => void, delay: number | null) {
  const saved = useRef(cb);
  useEffect(() => { saved.current = cb; }, [cb]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// ─── Rotating text ───────────────────────────────────────────────────────────
const ROTATING_WORDS = [
  { key: 'carbon', text: 'votre carbone', color: 'from-orange-400 to-amber-300' },
  { key: 'csrd', text: 'votre CSRD', color: 'from-blue-400 to-cyan-300' },
  { key: 'suppliers', text: 'vos fournisseurs', color: 'from-violet-400 to-purple-300' },
  { key: 'compliance', text: 'votre conformité', color: 'from-emerald-400 to-green-300' },
  { key: 'risks', text: 'vos risques ESG', color: 'from-red-400 to-rose-300' },
];

function useRotatingText(interval = 2800) {
  const [index, setIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setIndex(i => (i + 1) % ROTATING_WORDS.length);
        setIsAnimating(false);
      }, 300);
    }, interval);
    return () => clearInterval(id);
  }, [interval]);
  return { word: ROTATING_WORDS[index], isAnimating };
}

// ─── Count-up (inline span) ──────────────────────────────────────────────────
function CountUp({ end, duration = 2000, started = true }: { end: number; duration?: number; started?: boolean }) {
  const count = useCounter(end, duration, started);
  return <>{count}</>;
}

// ─── Stat counter ─────────────────────────────────────────────────────────────
function StatCounter({ value, suffix, label, started }: { value: number; suffix: string; label: string; started: boolean }) {
  const count = useCounter(value, 2000, started);
  return (
    <div className="text-center">
      <div className="text-4xl lg:text-5xl font-extrabold text-white tabular-nums">{count}{suffix}</div>
      {label && <div className="text-sm text-green-300 mt-1 font-medium">{label}</div>}
    </div>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors">
        <span className="font-semibold text-gray-900">{q}</span>
        {open ? <Minus className="h-5 w-5 text-green-600 flex-shrink-0" /> : <Plus className="h-5 w-5 text-gray-400 flex-shrink-0" />}
      </button>
      {open && <div className="px-6 pb-5 text-gray-600 leading-relaxed border-t border-gray-100 pt-4 text-sm">{a}</div>}
    </div>
  );
}

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
    badges: ['Score global /100', 'Tendances temps réel', 'Alertes intelligentes', 'Benchmarking secteur'],
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
    badges: ['15 catégories Scope 3', 'Facteurs ADEME', 'Calcul automatique', 'Benchmarks sectoriels'],
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
    desc: 'Outil interactif de double matérialité : questionnaire parties prenantes, matrice drag & drop, suggestions IA sectorielles et export PDF certifiable.',
    badges: ['Drag & drop', 'Questionnaire parties prenantes', 'Suggestions IA', 'Export rapport'],
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
    tagline: 'SBTi · Net Zero 2050 · 24 actions ROI',
    desc: 'Construisez votre trajectoire de décarbonation alignée SBTi 1.5°C. 24 actions pré-configurées avec ROI, scénarios what-if et graphique 2024–2050.',
    badges: ['Trajectoire SBTi 1.5°C', '24 actions + ROI', 'Scénarios What-if', 'Net Zero 2050'],
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
    tagline: 'Chatbot ESG · OCR · Anomalies · Prédictions',
    desc: 'Intelligence artificielle générative pour votre ESG : chatbot expert, OCR factures fournisseurs, détection anomalies en temps réel et prédictions tendances.',
    badges: ['Chatbot ESG expert', 'OCR factures', 'Détection anomalies', 'Prédictions IA'],
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
    name: 'Connecteurs Data',
    tagline: 'SAP · Oracle · Workday · Schneider · Climatiq',
    desc: 'Ingestion automatisée depuis vos systèmes : 25 connecteurs natifs ERP, RH, Énergie, CRM, Comptabilité et Carbone. OAuth2, API keys, certificats. Fini la saisie manuelle Excel.',
    badges: ['25 connecteurs natifs', 'OAuth2 & API keys', 'Sync temps reel', 'Monitoring flux'],
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
    tagline: '10M+ entreprises · SIREN · Temps réel',
    desc: 'Enrichissez automatiquement vos données ESG avec la base officielle Sirene : recherche par SIREN/SIRET, données légales, activité NAF, effectifs et géolocalisation en temps réel.',
    badges: ['10M+ entreprises', 'Recherche SIREN/SIRET', 'Données officielles', 'Gratuit & temps réel'],
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
    badges: ['6 types d\'événements', 'Signature HMAC-SHA256', 'Retry automatique', 'Logs & monitoring'],
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
    tagline: 'Gap analysis CSRD · 82 exigences · Roadmap',
    desc: 'Analysez vos écarts de conformité face aux 82 exigences ESRS. Identifiez les points manquants, priorisez les actions et suivez votre progression vers la conformité CSRD.',
    badges: ['82 exigences ESRS', 'Gap analysis automatique', 'Roadmap priorisée', 'Export rapport PDF'],
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
    badges: ['API REST complète', 'Clés API par scope', 'Documentation Swagger', 'OAuth2 & SSO'],
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
  const connectors = [
    { name: 'SAP S/4HANA', cat: 'ERP', status: 'connected', color: '#1e40af', records: '1 250' },
    { name: 'Workday', cat: 'RH', status: 'connected', color: '#0891b2', records: '890' },
    { name: 'Schneider Electric', cat: 'Energie', status: 'connected', color: '#059669', records: '4 200' },
    { name: 'SAP SuccessFactors', cat: 'RH', status: 'error', color: '#9333ea', records: '-' },
    { name: 'Climatiq API', cat: 'Carbone', status: 'connected', color: '#16a34a', records: '156' },
    { name: 'Enedis', cat: 'Energie', status: 'available', color: '#0284c7', records: '-' },
  ];
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-bold text-sm">Hub Connecteurs Data</div>
        <div className="flex gap-1.5">
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">5 actifs</span>
          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">1 erreur</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {connectors.map((c) => (
          <div key={c.name} className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: c.color }}>
                  {c.name[0]}
                </div>
                <span className="text-white text-xs font-medium truncate max-w-[70px]">{c.name}</span>
              </div>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.status === 'connected' ? 'bg-green-400' : c.status === 'error' ? 'bg-red-400' : 'bg-slate-400'}`} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs">{c.cat}</span>
              {c.status === 'connected' && <span className="text-cyan-400 text-xs">{c.records} entrees</span>}
              {c.status === 'error' && <span className="text-red-400 text-xs">Erreur auth</span>}
              {c.status === 'available' && <span className="text-slate-400 text-xs">Disponible</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 bg-white/5 rounded-xl p-2.5 border border-white/10">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Syncs aujourd'hui</span>
          <span className="text-cyan-400 font-bold">47 syncs · 8.4 GB</span>
        </div>
        <div className="mt-1.5 flex gap-1">
          {[40, 55, 35, 60, 45, 70, 47].map((v, i) => (
            <div key={i} className="flex-1 bg-white/10 rounded-sm" style={{ height: `${v * 0.4}px`, alignSelf: 'flex-end', backgroundColor: `rgba(6,182,212,${v/100})` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewINSEE() {
  const companies = [
    { name: 'LVMH Moët Hennessy', siren: '775 670 417', naf: '7010Z', city: 'Paris 8e', size: 'GE', score: 91 },
    { name: 'Renault Group', siren: '780 129 987', naf: '2910Z', city: 'Boulogne-Bill.', size: 'GE', score: 78 },
    { name: 'Danone', siren: '552 032 534', naf: '1051A', city: 'Paris 9e', size: 'GE', score: 85 },
    { name: 'Invivoo', siren: '529 518 792', naf: '6201Z', city: 'Levallois-Perret', size: 'PME', score: 67 },
  ];
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-bold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-blue-400" /> INSEE Sirene
        </div>
        <div className="text-xs text-blue-300 font-semibold">10M+ entreprises</div>
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
    { type: 'indicator.created', color: 'bg-amber-500', time: '14:30:12', status: 'retry', target: 'Teams webhook' },
  ];
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-bold flex items-center gap-2">
          <Radio className="h-4 w-4 text-violet-400" /> Webhooks — Événements
        </div>
        <div className="flex gap-1.5">
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">3 actifs</span>
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">1 retry</span>
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
                {e.status === 'success' ? '200' : 'retry'}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-center mt-2">
        {[{ l: 'Appels 24h', v: '1 248', c: 'text-violet-300' }, { l: 'Taux succès', v: '99.2%', c: 'text-green-300' }, { l: 'Latence', v: '< 200ms', c: 'text-blue-300' }].map((s, i) => (
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
        <div className="text-xs text-violet-300 font-semibold">82 exigences</div>
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
        47 indicateurs mappés automatiquement vers 5 référentiels
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
        {['API Keys', 'OAuth2', 'SSO SAML', 'Swagger'].map(f => (
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

// ─── Why ESGFlow pillars ───────────────────────────────────────────────────────
const WHY_PILLARS = [
  {
    icon: Shield,
    color: 'from-emerald-500 to-green-600',
    lightBg: 'bg-emerald-50',
    lightText: 'text-emerald-700',
    border: 'border-emerald-100',
    title: 'Conformité totale, zéro angle mort',
    desc: 'CSRD/ESRS, Taxonomie UE, BEGES ADEME, CSDDD, Devoir de vigilance (Loi 2017-399), Sapin 2, SBTi, SFDR, GRI, TCFD — 10 référentiels ESG/climat/anti-corruption couverts. Un seul outil, aucun oubli.',
    points: ['82 exigences ESRS mappées', 'Gap analysis automatique', 'Roadmap priorisée', 'Export iXBRL/ESEF audit-ready'],
  },
  {
    icon: Lock,
    color: 'from-blue-500 to-indigo-600',
    lightBg: 'bg-blue-50',
    lightText: 'text-blue-700',
    border: 'border-blue-100',
    title: 'Données fiables, auditables, sécurisées',
    desc: 'Journal d\'audit détaillé avec empreintes SHA-256 par entrée, workflow de validation en 3 étapes, hébergement 100 % en France ISO 27001. Vos données restent vos données.',
    points: ['Empreintes SHA-256', 'Hébergement France · RGPD', 'Workflow Brouillon → Approuvé', 'Export complet pour auditeurs'],
  },
  {
    icon: Brain,
    color: 'from-violet-500 to-purple-600',
    lightBg: 'bg-violet-50',
    lightText: 'text-violet-700',
    border: 'border-violet-100',
    title: 'Intelligence artificielle de bout en bout',
    desc: 'Chatbot ESG expert, détection d\'anomalies en temps réel, prédictions de tendances, suggestions sectorielles et OCR factures fournisseurs — l\'IA travaille pour vous.',
    points: ['Chatbot ESG générative', 'Anomalies temps réel', 'Prédictions ML', 'OCR & automatisation'],
  },
  {
    icon: Plug,
    color: 'from-cyan-500 to-teal-600',
    lightBg: 'bg-cyan-50',
    lightText: 'text-cyan-700',
    border: 'border-cyan-100',
    title: 'Intégré à votre écosystème dès le J+1',
    desc: '25 connecteurs natifs (SAP, Oracle, Workday, Salesforce, Qonto, Microsoft 365, Enedis…), API REST complète, webhooks temps réel et import FEC/CSV. Fini la double saisie.',
    points: ['25 connecteurs ERP/CRM/Compta', 'API REST + OAuth2', 'Webhooks HMAC-SHA256', 'Import FEC · Scope 3 comptable'],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { t } = useTranslation();
  const tMod = (m: { id: string; name: string; tagline: string; desc: string }, field: 'name' | 'tagline' | 'desc') =>
    t(`landing.lp.modules.${m.id}.${field}`, m[field]) as string;
  const tBadge = (m: { id: string }, i: number, b: string) =>
    t(`landing.lp.modules.${m.id}.badges.${i}`, b) as string;
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [scrolled, setScrolled] = useState(false);
  const [activeModule, setActiveModule] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [roiEmployees, setRoiEmployees] = useState(150);
  const [roiHoursMonth, setRoiHoursMonth] = useState(120);
  const [roiHourlyRate, setRoiHourlyRate] = useState(65);

  const { word: rotatingWord, isAnimating: wordAnimating } = useRotatingText();
  const { ref: heroRef, inView: heroInView } = useInView(0.3);
  const { ref: statsRef, inView: statsInView } = useInView(0.3);
  const { ref: proofRef, inView: proofInView } = useInView(0.2);
  const { ref: roiRef, inView: roiInView } = useInView(0.2);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  useInterval(() => {
    if (autoPlay) setActiveModule(m => (m + 1) % MODULES.length);
  }, autoPlay ? 3500 : null);

  const mod = MODULES[activeModule];
  const PreviewComp = PREVIEWS[mod.preview];

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const plans = [
    {
      name: 'PME', desc: 'PME soumises CSRD ou supply-chain',
      monthly: 249, annual: 212,
      color: 'border-gray-200', badge: null, badgeStyle: '',
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
      missing: ['IA narrative', 'Connecteurs avancés', 'SSO/SAML'],
      cta: 'Essai gratuit 14 jours', primary: false,
    },
    {
      name: 'ETI', desc: 'ETI en transformation ESG',
      monthly: 599, annual: 509,
      color: 'border-green-500', badge: 'Le plus populaire', badgeStyle: 'bg-green-500 text-white',
      features: [
        '100 utilisateurs · 250 organisations',
        '1 000 000 appels API / mois',
        'Tout PME inclus',
        'IA narrative & recommandations',
        'Connecteurs ERP avancés',
        'SFDR & multi-réglementaire',
        'Benchmarking sectoriel',
        'Webhooks & intégrations',
        'Piste d\'audit détaillée + SHA-256',
        'Support prioritaire 7j/7',
      ],
      missing: ['SSO/SAML', 'Marque blanche'],
      cta: 'Essai gratuit 14 jours', primary: true,
    },
    {
      name: 'Groupe', desc: 'Grands groupes & reporting consolidé',
      monthly: 1199, annual: 1019,
      color: 'border-slate-700', badge: 'Multi-entités', badgeStyle: 'bg-slate-800 text-white',
      features: [
        '500 utilisateurs · orgs illimitées',
        '5 000 000 appels API / mois',
        'Tout ETI inclus',
        'SSO / SAML (Azure AD, Okta)',
        'Marque blanche & branding',
        'Consolidation IFRS 10 multi-entités',
        'Onboarding dédié',
        'Account manager attitré',
        'Rétention données 84 mois',
      ],
      missing: ['SLA 99,9% garanti', 'On-premise'],
      cta: 'Démarrer maintenant', primary: false,
    },
  ];

  const faqs = [
    { q: 'Combien de temps pour déployer la plateforme ?', a: 'La mise en service prend 2 à 3 jours ouvrés. Nos équipes assurent l\'onboarding, la configuration des indicateurs et la formation de vos équipes.' },
    { q: 'La plateforme est-elle vraiment conforme CSRD ?', a: 'ESGFlow couvre les standards ESRS principaux (E1-E5, S1-S4, G1) et génère le format iXBRL/ESEF exigé par l\'ESMA. Notre journal d\'audit détaillé avec empreintes SHA-256 et export pour auditeurs facilite vos revues internes et externes.' },
    { q: 'Peut-on importer nos données depuis Excel ou ERP ?', a: 'Absolument. La plateforme accepte les imports CSV/Excel et propose des connecteurs vers les principaux ERP (SAP, Oracle, Sage). Notre API RESTful permet des intégrations sur mesure.' },
    { q: 'Où sont hébergées les données ?', a: 'Toutes les données sont hébergées en France, dans des datacenters certifiés ISO 27001. Nous n\'utilisons aucun cloud américain. La conformité RGPD est garantie contractuellement.' },
    { q: 'Que couvre le module Supply Chain ESG ?', a: 'Le module couvre l\'évaluation des fournisseurs sur 6 dimensions ESG, l\'envoi de questionnaires automatisés, la gestion de la due diligence et le suivi du plan de vigilance conformément à la Loi 2017-399.' },
    { q: 'Y a-t-il un engagement de durée ?', a: 'Non. Les plans PME, ETI et Groupe sont sans engagement, résiliables à tout moment. Les contrats annuels bénéficient de 15% de réduction.' },
    { q: 'Comment fonctionne l\'import FEC pour le Scope 3 ?', a: 'Exportez votre FEC depuis Sage, Cegid ou Pennylane et importez-le directement dans ESGFlow. La plateforme analyse automatiquement vos comptes 60x/61x/62x et calcule vos émissions Scope 3 par catégorie de dépenses en appliquant les facteurs d\'émission ADEME.' },
    { q: 'Comment fonctionne le Workflow de Validation ?', a: 'Chaque saisie ESG passe par 3 étapes : Brouillon → En révision → Approuvé. Les validateurs peuvent approuver ou rejeter avec un motif. Chaque action est automatiquement enregistrée dans la Piste d\'Audit avec date, utilisateur et contexte.' },
    { q: 'Qu\'est-ce que l\'analyse ESRS / Gap analysis ?', a: 'Ce module compare vos données et processus existants aux 82 exigences des normes ESRS (E1 à G1). Il génère automatiquement une analyse des écarts avec une roadmap priorisée pour atteindre la conformité CSRD.' },
  ];

  usePageSeo({
    id: 'landing',
    title: 'ESG Flow — Plateforme ESG tout-en-un pour la conformité CSRD, Taxonomie UE & Bilan Carbone',
    description: 'ESG Flow centralise votre conformité ESG en une seule plateforme : CSRD, Taxonomie UE, SFDR, SBTi, Bilan Carbone, Vigilance. 22 modules, hébergé en France, RGPD. Essai gratuit 14 jours.',
    keywords: 'ESG, CSRD, Taxonomie UE, SFDR, SBTi, bilan carbone, RSE, conformité ESG, plateforme ESG, reporting durabilité, ESRS, GHG Protocol, ADEME, devoir de vigilance, CSDDD',
    url: 'https://greenconnect.cloud/',
    ogImage: 'https://greenconnect.cloud/og/landing.png',
    ogTitle: 'ESG Flow — Conformité ESG simplifiée',
    ogDescription: '22 modules ESG dans une seule plateforme. CSRD, Taxonomie UE, SFDR, Bilan Carbone, SBTi. Hébergé en France. Essai gratuit.',
    faqJsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.slice(0, 5).map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  });

  return (
    <div className="min-h-screen bg-white antialiased font-sans">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-lg shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <span className={`text-xl font-bold transition-colors ${scrolled ? 'text-gray-900' : 'text-white'}`}>ESGFlow</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {[{ key: 'modules', label: t('landing.lp.nav.modulesLabel', 'Modules') }, { key: 'solutions', label: t('landing.lp.nav.solutionsLabel', 'Solutions') }].map(({ key, label }) => (
              <div key={key} className="relative" onMouseEnter={() => setOpenMenu(key)} onMouseLeave={() => setOpenMenu(null)}>
                <button className={`px-4 py-2 font-medium transition-colors flex items-center gap-1 rounded-lg text-sm ${scrolled ? 'text-gray-700 hover:text-green-600 hover:bg-gray-50' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>
                  {label} <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {openMenu === key && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3">
                    {key === 'modules' ? MODULES.slice(0, 6).map((m, i) => (
                      <a key={i} href="#modules" onClick={(e) => { e.preventDefault(); scrollTo('modules'); setActiveModule(i); setAutoPlay(false); }} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className={`w-8 h-8 ${m.lightBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <m.icon className={`h-4 w-4 ${m.lightText}`} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{tMod(m, 'name')}</div>
                          <div className="text-xs text-gray-500">{tMod(m, 'tagline')}</div>
                        </div>
                      </a>
                    )) : [
                      { icon: Building2, title: t('landing.lp.nav.sol1Title', 'PME & ETI'), desc: t('landing.lp.nav.sol1Desc', 'Solution complète accessible') },
                      { icon: Layers, title: t('landing.lp.nav.sol2Title', 'Grands Groupes'), desc: t('landing.lp.nav.sol2Desc', 'CAC40, SBF120, Enterprise') },
                      { icon: Globe, title: t('landing.lp.nav.sol3Title', 'Cabinets Conseil'), desc: t('landing.lp.nav.sol3Desc', 'Multi-clients, white-label') },
                    ].map((s, i) => (
                      <Link key={i} to="/register" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                          <s.icon className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{s.title}</div>
                          <div className="text-xs text-gray-500">{s.desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button onClick={() => scrollTo('tarifs')} className={`px-4 py-2 font-medium transition-colors rounded-lg text-sm ${scrolled ? 'text-gray-700 hover:text-green-600 hover:bg-gray-50' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>{t('landing.lp.nav.pricing', 'Tarifs')}</button>
            <button onClick={() => scrollTo('qui-sommes-nous')} className={`px-4 py-2 font-medium transition-colors rounded-lg text-sm ${scrolled ? 'text-gray-700 hover:text-green-600 hover:bg-gray-50' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>{t('landing.lp.nav.about', 'À propos')}</button>
            <button onClick={() => scrollTo('faq')} className={`px-4 py-2 font-medium transition-colors rounded-lg text-sm ${scrolled ? 'text-gray-700 hover:text-green-600 hover:bg-gray-50' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>{t('landing.lp.nav.faqLabel', 'FAQ')}</button>
            <Link to="/normes" className={`px-4 py-2 font-medium transition-colors rounded-lg text-sm ${scrolled ? 'text-gray-700 hover:text-green-600 hover:bg-gray-50' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>
              {t('landing.lp.nav.normes', 'Normes')}
            </Link>
            <Link to="/contact" className={`px-4 py-2 font-medium transition-colors rounded-lg text-sm flex items-center gap-1.5 ${scrolled ? 'text-gray-700 hover:text-green-600 hover:bg-gray-50' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>
              <Mail className="h-3.5 w-3.5" />
              {t('landing.lp.nav.contact', 'Contact')}
            </Link>
            <div className="h-5 w-px bg-gray-300 mx-2" />
            <Link to="/login" className={`px-4 py-2 font-medium transition-colors rounded-lg text-sm ${scrolled ? 'text-gray-700 hover:text-green-600' : 'text-white/90 hover:text-white'}`}>{t('landing.lp.nav.login', 'Connexion')}</Link>
            <Link to="/demo">
              <button className={`ml-1 px-4 py-2 font-semibold rounded-xl transition-all text-sm border ${scrolled ? 'border-green-600 text-green-600 hover:bg-green-50' : 'border-white/40 text-white hover:bg-white/10'}`}>
                {t('landing.lp.nav.demo', 'Voir la démo')}
              </button>
            </Link>
            <Link to="/register">
              <button className="ml-1 px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-600/25 text-sm hover:-translate-y-0.5">
                {t('landing.lp.nav.trial', 'Essai gratuit')}
              </button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button aria-label={mobileMenuOpen ? t('landing.lp.nav.closeMenu', 'Fermer le menu') : t('landing.lp.nav.openMenu', 'Ouvrir le menu')} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={`md:hidden tap-target flex items-center justify-center rounded-lg transition-colors ${scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}>
            {mobileMenuOpen ? <XIcon className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-xl animate-in slide-in-from-top-2">
            <div className="px-4 py-4 space-y-1">
              <button onClick={() => { scrollTo('modules'); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl">{t('landing.lp.nav.modulesLabel', 'Modules')}</button>
              <button onClick={() => { scrollTo('tarifs'); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl">{t('landing.lp.nav.pricing', 'Tarifs')}</button>
              <button onClick={() => { scrollTo('qui-sommes-nous'); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl">{t('landing.lp.nav.about', 'À propos')}</button>
              <button onClick={() => { scrollTo('faq'); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl">{t('landing.lp.nav.faqLabel', 'FAQ')}</button>
              <Link to="/resources" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl">{t('landing.lp.nav.resources', 'Ressources')}</Link>
              <Link to="/normes" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl">{t('landing.lp.nav.normes', 'Normes & Conformité')}</Link>
              <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl">
                <Mail className="h-4 w-4 text-green-600" />
                {t('landing.lp.nav.contact', 'Contact')}
              </Link>
              <div className="border-t border-gray-100 pt-3 mt-3 space-y-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl text-center">{t('landing.lp.nav.login', 'Connexion')}</Link>
                <Link to="/demo" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-green-700 border border-green-200 bg-green-50 rounded-xl text-center">{t('landing.lp.nav.demo', 'Voir la démo')}</Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-white bg-green-600 rounded-xl text-center shadow-lg">{t('landing.lp.nav.trial14', 'Essai gratuit 14 jours')}</Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #020b18 0%, #06101f 45%, #051a10 85%, #020b18 100%)' }}>
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.038) 1px, transparent 0)', backgroundSize: '36px 36px' }} />
        {/* Aurora blobs — animés via keyframes */}
        <div className="absolute pointer-events-none" style={{ top: '-8%', left: '16%', width: 740, height: 740, borderRadius: '50%', filter: 'blur(130px)', background: 'radial-gradient(ellipse, rgba(16,185,129,0.22) 0%, transparent 65%)', animation: 'aurora1 9s ease-in-out infinite' }} />
        <div className="absolute pointer-events-none" style={{ bottom: '-5%', right: '8%', width: 630, height: 630, borderRadius: '50%', filter: 'blur(110px)', background: 'radial-gradient(ellipse, rgba(5,150,105,0.16) 0%, transparent 65%)', animation: 'aurora2 11s ease-in-out infinite' }} />
        <div className="absolute pointer-events-none" style={{ top: '42%', left: '-5%', width: 460, height: 460, borderRadius: '50%', filter: 'blur(90px)', background: 'radial-gradient(ellipse, rgba(14,165,233,0.08) 0%, transparent 65%)', animation: 'aurora3 13s ease-in-out infinite' }} />
        <div className="absolute pointer-events-none" style={{ top: '5%', right: '4%', width: 340, height: 340, borderRadius: '50%', filter: 'blur(80px)', background: 'radial-gradient(ellipse, rgba(52,211,153,0.1) 0%, transparent 65%)', animation: 'aurora2 7s ease-in-out infinite reverse' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-sm font-medium" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.32)', color: '#6ee7b7' }}>
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              {t('landing.lp.hero.badge', '22 modules · CSRD · Scope 3 · IA générative')}
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: 'rgba(16,185,129,0.25)', color: '#34d399' }}>2026</span>
            </div>

            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white leading-[1.05] tracking-tight">
              {t('landing.lp.hero.titleTop', 'Maîtrisez')}
              <br />
              <span className={`inline-block bg-gradient-to-r ${rotatingWord.color} bg-clip-text text-transparent transition-all duration-300 ${wordAnimating ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'}`}>
                {t(`landing.lp.hero.rotating.${rotatingWord.key}`, rotatingWord.text)}
              </span>
              <br />
              <span className="text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-300">
                {t('landing.lp.hero.titleBottom', 'en toute simplicité')}
              </span>
            </h1>

            <p className="text-xl text-slate-300 leading-relaxed max-w-lg">
              {t('landing.lp.hero.subtitle', "De la collecte de données à la publication de votre rapport CSRD, ESGFlow couvre l'intégralité de votre démarche — avec l'IA, les connecteurs et la piste d'audit certifiable qu'il vous faut.")}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link to="/register">
                <button className="group flex items-center gap-2 px-7 py-4 text-white font-bold rounded-2xl transition-all text-base hover:-translate-y-0.5 active:translate-y-0" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', boxShadow: '0 0 0 1px rgba(16,185,129,0.5), 0 8px 32px rgba(5,150,105,0.45), 0 2px 6px rgba(0,0,0,0.3)' }}>
                  {t('landing.lp.hero.cta1', 'Essai gratuit 14 jours')}
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link to="/demo">
                <button className="flex items-center gap-2 px-7 py-4 font-semibold rounded-2xl transition-all text-base text-white hover:bg-white/[0.13]" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)' }}>
                  <Play className="h-4 w-4 fill-white" /> {t('landing.lp.hero.cta2', 'Démo interactive')}
                </button>
              </Link>
            </div>

            <div className="space-y-3">
              {/* Avatar social proof */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['#059669','#2563eb','#7c3aed','#dc2626','#d97706'].map((bg, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: bg, borderColor: '#020b18' }}>
                      {['A','M','L','R','S'][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-0.5 mb-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 text-amber-400 fill-amber-400" />)}
                    <span className="text-xs text-slate-400 ml-1.5">4,9/5</span>
                  </div>
                  <span className="text-xs text-slate-400">500+ équipes ESG · Hébergé en France 🇫🇷</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                {t('landing.lp.hero.noCard', 'Aucune carte bancaire · Sans engagement · Hébergé en France')}
              </div>
            </div>

            {/* Stats */}
            <div ref={heroRef} className="grid grid-cols-4 gap-4 pt-8 border-t border-white/10">
              <StatCounter value={22} suffix="" label={t('landing.lp.hero.stat1', 'Modules ESG')} started={heroInView} />
              <StatCounter value={100} suffix="+" label={t('landing.lp.hero.stat2', 'Indicateurs')} started={heroInView} />
              <StatCounter value={10} suffix="M+" label={t('landing.lp.hero.stat3', 'Entreprises INSEE')} started={heroInView} />
              <StatCounter value={10} suffix="" label={t('landing.lp.hero.stat4', 'Référentiels')} started={heroInView} />
            </div>
          </div>

          {/* Hero — Browser mockup avec preview rotatif */}
          <div className="relative hidden lg:block">
            {/* Multi-layer glow */}
            <div className="absolute rounded-3xl pointer-events-none" style={{ inset: '-28px', background: 'radial-gradient(ellipse at 50% 40%, rgba(16,185,129,0.28) 0%, rgba(5,150,105,0.12) 40%, transparent 65%)', filter: 'blur(40px)' }} />
            <div className="absolute rounded-3xl pointer-events-none" style={{ inset: '-16px', background: 'radial-gradient(ellipse at 70% 60%, rgba(14,165,233,0.1) 0%, transparent 60%)', filter: 'blur(25px)' }} />

            {/* Browser chrome frame */}
            <div className="relative rounded-2xl overflow-hidden" style={{ boxShadow: '0 40px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
              {/* Barre de titre navigateur */}
              <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ background: '#111927', borderColor: 'rgba(255,255,255,0.06)' }}>
                {/* Boutons macOS */}
                <div className="flex gap-1.5 flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#28ca41]" />
                </div>
                {/* Barre d'adresse */}
                <div className="flex-1 flex items-center gap-2 bg-white/[0.06] rounded-lg px-3 py-1.5 mx-2">
                  <div className="flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <circle cx="5" cy="5" r="4.5" stroke="#10b981" strokeWidth="1" />
                      <path d="M3.5 5L4.5 6L6.5 4" stroke="#10b981" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono tracking-tight">app.greenconnect.cloud</span>
                </div>
                {/* Action icons */}
                <div className="flex gap-2 flex-shrink-0">
                  <div className="w-3.5 h-3.5 rounded bg-white/[0.06]" />
                  <div className="w-3.5 h-3.5 rounded bg-white/[0.06]" />
                </div>
              </div>

              {/* Contenu app — mini sidebar + preview */}
              <div className="flex bg-[#0f1117]" style={{ minHeight: 340 }}>
                {/* Mini sidebar */}
                <div className="w-[52px] flex-shrink-0 bg-[#0f1117] border-r border-white/[0.05] flex flex-col items-center py-3 gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-white/90" />
                  </div>
                  {['#10b981','#6b7280','#6b7280','#6b7280','#6b7280'].map((c, i) => (
                    <div key={i} className="w-8 h-7 rounded-lg flex flex-col items-center justify-center gap-0.5" style={{ background: i === 0 ? c + '18' : 'transparent' }}>
                      <div className="w-3.5 h-0.5 rounded-full" style={{ background: i === 0 ? c : '#374151' }} />
                      <div className="w-2.5 h-0.5 rounded-full" style={{ background: i === 0 ? c : '#374151' }} />
                    </div>
                  ))}
                </div>

                {/* Module preview */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Tabs */}
                  <div className="flex gap-1 px-3 pt-2.5 pb-0 bg-[#141720] border-b border-white/[0.05]">
                    {MODULES.slice(0, 5).map((m, i) => (
                      <button
                        key={i}
                        onClick={() => { setActiveModule(i); setAutoPlay(false); }}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-lg text-[11px] font-semibold whitespace-nowrap transition-colors flex-shrink-0 -mb-px ${
                          activeModule === i
                            ? 'bg-[#0f1117] text-white border border-b-[#0f1117] border-white/[0.08]'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <m.icon className="h-3 w-3" style={{ color: activeModule === i ? m.color : undefined }} />
                        {tMod(m, 'name').split(' ')[0]}
                      </button>
                    ))}
                  </div>
                  {/* Preview — fond sombre identique à l'app */}
                  <div className="flex-1 overflow-hidden" style={{ background: '#1a1f2e' }}>
                    <div className="scale-[0.82] origin-top-left" style={{ width: '122%', height: '122%' }}>
                      {PreviewComp && <PreviewComp />}
                    </div>
                  </div>
                  {/* Progress bar en bas */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#141720] border-t border-white/[0.05]">
                    <div className="flex gap-0.5 flex-1">
                      {MODULES.map((_, i) => (
                        <div key={i} onClick={() => { setActiveModule(i); setAutoPlay(false); }}
                          className="h-0.5 rounded-full flex-1 cursor-pointer transition-all"
                          style={{ background: i === activeModule ? '#10b981' : 'rgba(255,255,255,0.12)' }}
                        />
                      ))}
                    </div>
                    <button onClick={() => setAutoPlay(a => !a)} className="text-[10px] text-slate-500 hover:text-white transition-colors ml-1">
                      {autoPlay ? '⏸' : '▶'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating card — CSRD, top right */}
            <div className="absolute -top-5 -right-5 rounded-2xl px-3.5 py-3" style={{ background: 'white', border: '1px solid #ecfdf5', boxShadow: '0 20px 50px rgba(0,0,0,0.22), 0 4px 12px rgba(5,150,105,0.12)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-green-50">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-[12px] font-bold text-gray-900">CSRD Conforme</div>
                  <div className="text-[10px] text-gray-400">ESRS 2024 · iXBRL ready</div>
                </div>
              </div>
            </div>

            {/* Floating card — Score ESG, bottom left */}
            <div className="absolute -bottom-5 -left-5 rounded-2xl px-3.5 py-3" style={{ background: 'white', border: '1px solid #f0f9ff', boxShadow: '0 20px 50px rgba(0,0,0,0.22), 0 4px 12px rgba(16,185,129,0.1)' }}>
              <div className="flex items-center gap-2.5">
                <div className="relative flex-shrink-0 w-10 h-10">
                  <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="20" cy="20" r="16" fill="none" stroke="#e5e7eb" strokeWidth="4.5" />
                    <circle cx="20" cy="20" r="16" fill="none" stroke="#10b981" strokeWidth="4.5"
                      strokeDasharray={`${2 * Math.PI * 16 * 0.78} ${2 * Math.PI * 16 * 0.22}`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-gray-800">78</span>
                </div>
                <div>
                  <div className="text-[12px] font-bold text-gray-900">Score ESG /100</div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] text-emerald-600 font-semibold">+4 pts ce mois</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating card — Live sync, right */}
            <div className="absolute top-[38%] -right-10 rounded-xl px-3 py-2.5" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <div>
                  <div className="text-[11px] font-bold text-white whitespace-nowrap">47 sources</div>
                  <div className="text-[10px] text-slate-400">Live · Temps réel</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 30C1200 60 960 0 720 15C480 30 240 60 0 30L0 60Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── Social proof ─────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .marquee-track { animation: marquee 45s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
        @keyframes aurora1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(-55px, 35px) scale(1.07); }
          66%  { transform: translate(40px, -25px) scale(0.94); }
        }
        @keyframes aurora2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(50px, -40px) scale(1.1); }
          66%  { transform: translate(-35px, 28px) scale(0.92); }
        }
        @keyframes aurora3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(28px, -50px) scale(1.09); }
        }
      `}</style>
      <section ref={proofRef} className="pt-16 pb-8 bg-white border-b border-gray-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Header ── */}
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
              <span className="w-8 h-px bg-gray-300 inline-block" />
              {t('landing.lp.proof.trustedBy', 'Ils nous font confiance')}
              <span className="w-8 h-px bg-gray-300 inline-block" />
            </span>
          </div>

          {/* ── Infinite-scroll logo marquee ── */}
          <div className="relative mb-14">
            <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
            <div className="overflow-hidden">
              <div className="marquee-track flex w-max gap-6">
                {[...Array(2)].flatMap((_, dup) =>
                  [
                    { init: 'TE', name: 'TotalEnergies', sector: 'Énergie', grad: 'from-red-600 to-red-500' },
                    { init: 'LV', name: 'LVMH', sector: 'Luxe', grad: 'from-amber-700 to-yellow-600' },
                    { init: 'CA', name: 'Carrefour', sector: 'Distribution', grad: 'from-blue-700 to-blue-500' },
                    { init: 'RE', name: 'Renault', sector: 'Automobile', grad: 'from-yellow-500 to-amber-400' },
                    { init: 'SE', name: 'Schneider Electric', sector: 'Industrie', grad: 'from-green-600 to-emerald-500' },
                    { init: 'DA', name: 'Danone', sector: 'Agroalimentaire', grad: 'from-sky-500 to-cyan-400' },
                    { init: 'MI', name: 'Michelin', sector: 'Industrie', grad: 'from-blue-800 to-indigo-600' },
                    { init: 'VE', name: 'Veolia', sector: 'Environnement', grad: 'from-teal-500 to-cyan-500' },
                    { init: 'BN', name: 'BNP Paribas', sector: 'Finance', grad: 'from-green-700 to-green-500' },
                    { init: 'LO', name: "L'Oréal", sector: 'Cosmétiques', grad: 'from-purple-600 to-violet-500' },
                    { init: 'EN', name: 'Engie', sector: 'Énergie', grad: 'from-cyan-600 to-blue-400' },
                    { init: 'VI', name: 'Vinci', sector: 'Construction', grad: 'from-slate-700 to-slate-500' },
                    { init: 'AB', name: 'Airbus', sector: 'Aéronautique', grad: 'from-indigo-600 to-blue-500' },
                    { init: 'SA', name: 'Sanofi', sector: 'Santé', grad: 'from-violet-600 to-purple-400' },
                    { init: 'EF', name: 'EDF', sector: 'Énergie', grad: 'from-orange-500 to-amber-500' },
                    { init: 'BO', name: 'Bouygues', sector: 'Télécom & BTP', grad: 'from-sky-600 to-blue-500' },
                  ].map((c, i) => (
                    <div key={`${dup}-${i}`} className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all duration-300 flex-shrink-0 cursor-default select-none group">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
                        <span className="text-white text-xs font-black tracking-tight">{c.init}</span>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-800 whitespace-nowrap">{c.name}</div>
                        <div className="text-[11px] text-gray-400 font-medium">{c.sector}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── Key metrics counters ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-14">
            {[
              { value: 22,  suffix: '',    label: 'Modules ESG couverts',       icon: BarChart3,  color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100', accent: '#059669' },
              { value: 100, suffix: '+',   label: 'Indicateurs ESRS trackés',   icon: Database,   color: 'text-blue-600',    bg: 'bg-blue-50',    ring: 'ring-blue-100',    accent: '#2563eb' },
              { value: 10,  suffix: '',    label: 'Référentiels intégrés',      icon: Globe,      color: 'text-violet-600',  bg: 'bg-violet-50',  ring: 'ring-violet-100',  accent: '#7c3aed' },
              { value: 99,  suffix: ',9%', label: 'Disponibilité SLA garanti',  icon: Activity,   color: 'text-amber-600',   bg: 'bg-amber-50',   ring: 'ring-amber-100',   accent: '#d97706' },
            ].map(({ value, suffix, label, icon: Icon, color, bg, ring, accent }) => (
              <div key={label} className={`relative text-center p-6 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-all duration-200 group ring-1 ${ring}`}>
                <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <div className="text-3xl lg:text-4xl font-extrabold tabular-nums" style={{ color: accent }}>
                  <CountUp end={value} started={proofInView} />{suffix}
                </div>
                <div className="text-sm text-gray-500 mt-1 font-medium">{label}</div>
              </div>
            ))}
          </div>

          {/* ── Trust badges ── */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {[
              { icon: Shield, label: t('landing.lp.proof.badges.0.label', 'RGPD'), sub: t('landing.lp.proof.badges.0.sub', 'Données souveraines FR'), bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100' },
              { icon: Award, label: t('landing.lp.proof.badges.1.label', 'CSRD / ESRS 2025'), sub: t('landing.lp.proof.badges.1.sub', 'Conforme & à jour'), bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
              { icon: Lock, label: t('landing.lp.proof.badges.2.label', 'ISO 27001'), sub: t('landing.lp.proof.badges.2.sub', 'Infra certifiée'), bg: 'bg-slate-50', text: 'text-slate-700', ring: 'ring-slate-100' },
              { icon: ShieldCheck, label: t('landing.lp.proof.badges.3.label', 'iXBRL / ESEF'), sub: t('landing.lp.proof.badges.3.sub', 'EFRAG conforme'), bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-100' },
              { icon: Star, label: t('landing.lp.proof.badges.4.label', '4,9 / 5'), sub: t('landing.lp.proof.badges.4.sub', '200+ avis vérifiés'), bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
            ].map(({ icon: Icon, label, sub, bg, text, ring }) => (
              <div key={label} className={`flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-gray-200 ring-1 ${ring} shadow-sm hover:shadow-md transition-all duration-200`}>
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${text}`} />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{label}</div>
                  <div className="text-xs text-gray-500">{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Analyst & review platform recognition ── */}
          <div className="pt-8 border-t border-gray-100">
            <p className="text-center text-xs font-medium text-gray-400 uppercase tracking-widest mb-6">{t('landing.lp.proof.analystsTitle', "Reconnu par les analystes & plateformes d'évaluation")}</p>
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { badge: 'G2', title: 'High Performer 2025', score: '4.9/5', cat: 'ESG Reporting Software', grad: 'from-orange-500 to-red-500', hoverBorder: 'hover:border-orange-200', bgTint: 'to-orange-50/30', starColor: 'text-orange-400 fill-orange-400' },
                { badge: '✓', title: 'Capterra Shortlist 2025', score: '4.8/5', cat: 'Sustainability Software', grad: 'from-teal-500 to-cyan-600', hoverBorder: 'hover:border-teal-200', bgTint: 'to-teal-50/30', starColor: 'text-teal-500 fill-teal-500' },
                { badge: '🌿', title: 'Verdantix Green Quadrant', score: null, cat: 'Challenger innovant', grad: 'from-emerald-600 to-green-700', hoverBorder: 'hover:border-emerald-200', bgTint: 'to-emerald-50/30', starColor: '' },
                { badge: '🌐', title: 'IDC MarketScape', score: null, cat: 'Major Player', grad: 'from-blue-600 to-indigo-700', hoverBorder: 'hover:border-blue-200', bgTint: 'to-blue-50/30', starColor: '' },
                { badge: '🇫🇷', title: 'France 2030', score: null, cat: 'Lauréat innovation', grad: 'from-indigo-600 to-blue-800', hoverBorder: 'hover:border-indigo-200', bgTint: 'to-indigo-50/30', starColor: '' },
              ].map((a, i) => (
                <div key={a.title} className={`group flex items-center gap-3 px-5 py-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-white ${a.bgTint} shadow-sm hover:shadow-lg ${a.hoverBorder} transition-all duration-300 cursor-default`}>
                  <div className={`w-11 h-11 bg-gradient-to-br ${a.grad} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                    <span className="text-white font-black text-base">{a.badge}</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{t(`landing.lp.proof.analysts.${i}.title`, a.title)}</div>
                    {a.score ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        {[...Array(5)].map((_, i) => <Star key={i} className={`h-3 w-3 ${a.starColor}`} />)}
                        <span className="text-xs text-gray-500 ml-1">{a.score}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-emerald-600 font-semibold mt-0.5">{t(`landing.lp.proof.analysts.${i}.cat`, a.cat)}</div>
                    )}
                    {a.score && <div className="text-[11px] text-gray-400 mt-0.5">{t(`landing.lp.proof.analysts.${i}.cat`, a.cat)}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Press mentions ── */}
          <div className="mt-10 pt-8 border-t border-gray-100">
            <p className="text-center text-xs font-medium text-gray-400 uppercase tracking-widest mb-6">{t('landing.lp.proof.pressTitle', 'Dans la presse')}</p>
            <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4">
              {[
                { name: 'Les Echos', weight: 'font-serif font-bold', size: 'text-lg' },
                { name: 'BFM Business', weight: 'font-extrabold', size: 'text-base' },
                { name: 'Forbes France', weight: 'font-bold italic', size: 'text-lg' },
                { name: 'Maddyness', weight: 'font-black', size: 'text-base' },
                { name: 'FrenchWeb', weight: 'font-extrabold', size: 'text-base' },
                { name: 'L\'Usine Digitale', weight: 'font-bold', size: 'text-sm' },
              ].map(p => (
                <span key={p.name} className={`${p.weight} ${p.size} text-gray-300 hover:text-gray-500 transition-colors cursor-default select-none`}>{p.name}</span>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Global stats ─────────────────────────────────────────────────────── */}
      <section ref={statsRef} className="relative py-16 overflow-hidden" style={{ background: 'linear-gradient(135deg, #020b18 0%, #06101f 50%, #051a10 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.032) 1px, transparent 0)', backgroundSize: '36px 36px' }} />
        <div className="absolute pointer-events-none" style={{ top: '50%', left: '20%', transform: 'translateY(-50%)', width: 600, height: 300, borderRadius: '50%', filter: 'blur(80px)', background: 'radial-gradient(ellipse, rgba(16,185,129,0.18) 0%, transparent 65%)' }} />
        <div className="absolute pointer-events-none" style={{ top: '50%', right: '15%', transform: 'translateY(-50%)', width: 400, height: 300, borderRadius: '50%', filter: 'blur(70px)', background: 'radial-gradient(ellipse, rgba(5,150,105,0.12) 0%, transparent 65%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-8">
            {[
              { value: 22, suffix: '', label: t('landing.lp.stats.modules', 'Modules intégrés'), icon: Layers },
              { value: 100, suffix: '+', label: t('landing.lp.stats.indicators', 'Indicateurs ESRS'), icon: FileCheck },
              { value: 10, suffix: 'M+', label: t('landing.lp.stats.companies', 'Entreprises INSEE'), icon: Database },
              { value: 24, suffix: '', label: t('landing.lp.stats.actions', 'Actions décarbonation'), icon: Flame },
              { value: 10, suffix: '', label: t('landing.lp.stats.frameworks', 'Référentiels couverts'), icon: BookOpen },
              { value: 500, suffix: '+', label: t('landing.lp.stats.clients', 'Entreprises clientes'), icon: Building2 },
            ].map(({ value, suffix, label, icon: Icon }) => (
              <div key={label} className="text-center group cursor-default">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110" style={{ background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 0 20px rgba(16,185,129,0.08)' }}>
                  <Icon className="h-5 w-5 text-emerald-400" />
                </div>
                <StatCounter value={value} suffix={suffix} label={label} started={statsInView} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Module explorer ───────────────────────────────────────────────────── */}
      <section id="modules" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-green-600 uppercase tracking-widest">{t('landing.lp.modulesSection.eyebrow', 'Modules')}</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">{t('landing.lp.modulesSection.title', '22 modules. Une seule plateforme.')}</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">{t('landing.lp.modulesSection.subtitle', 'Chaque module est conçu pour répondre à un besoin précis — et ils fonctionnent tous ensemble.')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            {/* Module list */}
            <div className="lg:col-span-2 space-y-2">
              {MODULES.map((m, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveModule(i); setAutoPlay(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all border-2 ${activeModule === i ? `border-transparent ${m.lightBg} shadow-md` : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                >
                  <div className={`w-10 h-10 ${activeModule === i ? m.bg : 'bg-gray-100'} rounded-xl flex items-center justify-center flex-shrink-0 transition-colors`}>
                    <m.icon className={`h-5 w-5 ${activeModule === i ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-bold ${activeModule === i ? 'text-gray-900' : 'text-gray-700'}`}>{tMod(m, 'name')}</div>
                    <div className="text-xs text-gray-400 truncate mt-0.5">{tMod(m, 'tagline')}</div>
                  </div>
                  <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-colors ${activeModule === i ? m.lightText : 'text-gray-300'}`} />
                </button>
              ))}
            </div>

            {/* Detail panel */}
            <div className="lg:col-span-3">
              <div className={`rounded-3xl border-2 ${MODULES[activeModule].lightBg} overflow-hidden`} style={{ borderColor: MODULES[activeModule].color + '30' }}>
                {/* Dark preview */}
                <div className="bg-slate-900 rounded-2xl m-4 overflow-hidden">
                  {PREVIEWS[MODULES[activeModule].preview] && (() => { const P = PREVIEWS[MODULES[activeModule].preview]; return <P />; })()}
                </div>

                {/* Info */}
                <div className="px-6 pb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{tMod(MODULES[activeModule], 'name')}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{tMod(MODULES[activeModule], 'desc')}</p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {MODULES[activeModule].badges.map((b, i) => (
                      <span key={i} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${MODULES[activeModule].lightBg} ${MODULES[activeModule].lightText} border`} style={{ borderColor: MODULES[activeModule].color + '30' }}>
                        ✓ {tBadge(MODULES[activeModule], i, b)}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    {MODULES[activeModule].featurePath && (
                      <Link to={MODULES[activeModule].featurePath!}>
                        <button className={`flex items-center gap-2 px-5 py-2.5 ${MODULES[activeModule].bg} text-white font-semibold rounded-xl text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg`}>
                          {t('landing.lp.modulesSection.learnMore', 'En savoir plus')} <ArrowRight className="h-4 w-4" />
                        </button>
                      </Link>
                    )}
                    <Link to="/register">
                      <button className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 ${MODULES[activeModule].featurePath ? 'border-2 text-gray-700 hover:bg-gray-50' : `${MODULES[activeModule].bg} text-white hover:shadow-lg`}`} style={MODULES[activeModule].featurePath ? { borderColor: MODULES[activeModule].color + '40' } : undefined}>
                        {t('landing.lp.nav.trial', 'Essai gratuit')} <ArrowRight className="h-4 w-4" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pourquoi ESGFlow ─────────────────────────────────────────────────── */}
      <section className="py-28 bg-white relative overflow-hidden">
        {/* Subtle background texture */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(16,185,129,0.05) 0%, transparent 60%), radial-gradient(circle at 10% 80%, rgba(99,102,241,0.04) 0%, transparent 60%)' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-4">
              <span className="w-8 h-px bg-emerald-400 inline-block" />
              {t('landing.lp.why.eyebrow', 'Pourquoi ESGFlow')}
              <span className="w-8 h-px bg-emerald-400 inline-block" />
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
              {t('landing.lp.why.titleLine1', 'Tout ce dont vous avez besoin,')}
              <br />
              <span className="text-emerald-600">{t('landing.lp.why.titleLine2', "rien de ce que vous n'utilisez pas")}</span>
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              {t('landing.lp.why.subtitle', 'Une plateforme pensée par des experts ESG, pour que votre équipe soit opérationnelle en 3 jours — pas en 3 mois.')}
            </p>
          </div>

          {/* 4 piliers en grille */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {WHY_PILLARS.map((p, i) => (
              <div key={i} className={`group relative bg-white rounded-3xl border ${p.border} p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden`}>
                {/* Gradient accent top */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${p.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                <div className="flex items-start gap-5">
                  <div className={`w-14 h-14 bg-gradient-to-br ${p.color} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <p.icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{t(`landing.lp.why.pillars.${i}.title`, p.title)}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-5">{t(`landing.lp.why.pillars.${i}.desc`, p.desc)}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {p.points.map((pt, j) => (
                        <div key={j} className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl ${p.lightBg} ${p.lightText}`}>
                          <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                          {t(`landing.lp.why.pillars.${i}.points.${j}`, pt)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bande de réassurance */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: t('landing.lp.reassure.0.value', '3 jours'), label: t('landing.lp.reassure.0.label', 'Mise en service'), sub: t('landing.lp.reassure.0.sub', 'onboarding inclus') },
              { value: t('landing.lp.reassure.1.value', '22'), label: t('landing.lp.reassure.1.label', 'Modules intégrés'), sub: t('landing.lp.reassure.1.sub', 'dans un seul outil') },
              { value: t('landing.lp.reassure.2.value', '100%'), label: t('landing.lp.reassure.2.label', 'Hébergement France'), sub: t('landing.lp.reassure.2.sub', 'ISO 27001 · RGPD') },
              { value: t('landing.lp.reassure.3.value', 'Sans CB'), label: t('landing.lp.reassure.3.label', 'Essai 14 jours'), sub: t('landing.lp.reassure.3.sub', 'aucun engagement') },
            ].map((s, i) => (
              <div key={i} className="text-center p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="text-3xl font-extrabold text-gray-900 mb-1">{s.value}</div>
                <div className="text-sm font-semibold text-gray-700">{s.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3 différenciateurs uniques (pépites cachées amplifiées) ──────────── */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 80% 20%, rgba(16,185,129,0.07) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(99,102,241,0.05) 0%, transparent 60%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-4">
              <span className="w-8 h-px bg-emerald-400 inline-block" />
              {t('landing.lp.diff.eyebrow', '3 différenciateurs uniques')}
              <span className="w-8 h-px bg-emerald-400 inline-block" />
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
              {t('landing.lp.diff.title', 'Ce que Greenly et Sweep ne savent pas faire')}
            </h2>
            <p className="text-lg text-gray-500">
              {t('landing.lp.diff.subtitle', 'Trois capacités techniques que nos concurrents promettent mais ne livrent pas vraiment. Vérifiables, démontrables, mesurables.')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Pépite 1 : iXBRL/ESEF réel */}
            <div className="group relative p-8 bg-white rounded-3xl border-2 border-emerald-100 hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 flex flex-col">
              <div className="absolute -top-3 left-6 px-3 py-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[10px] font-extrabold tracking-widest rounded-full shadow-md">{t('landing.lp.diff.cards.0.badge', 'EXIGENCE ESMA 2026')}</div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-2">{t('landing.lp.diff.cards.0.title', 'Vrai iXBRL / ESEF')}</h3>
              <div className="text-xs font-bold text-emerald-700 mb-4">{t('landing.lp.diff.cards.0.subtitle', 'Namespace EFRAG 2024-12-31 · 35 concepts ESRS')}</div>
              <p className="text-sm text-gray-600 leading-relaxed mb-5 flex-1">
                <Trans i18nKey="landing.lp.diff.cards.0.body">
                  Nous produisons un <strong>XHTML balisé certifiable</strong> conforme au format imposé par l'ESMA aux sociétés cotées dès 2026. 90 % des plateformes concurrentes génèrent un PDF "déguisé" non conforme.
                </Trans>
              </p>
              <div className="space-y-2 mb-6">
                {['XHTML EFRAG 2024-12-31', '35 concepts ESRS balisés', 'Validation namespace stricte', 'Compatible Arelle / SEC EDGAR'].map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    {t(`landing.lp.diff.cards.0.points.${i}`, p)}
                  </div>
                ))}
              </div>
              <div className="pt-5 border-t border-gray-100 text-xs text-gray-500">
                <strong className="text-gray-900">{t('landing.lp.diff.cards.0.footerLabel', 'Démontrable :')}</strong> {t('landing.lp.diff.cards.0.footerText', 'export en 1 clic depuis CSRD Builder, ouvrable dans Arelle.')}
              </div>
            </div>

            {/* Pépite 2 : FEC → Scope 3 */}
            <div className="group relative p-8 bg-white rounded-3xl border-2 border-blue-100 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col">
              <div className="absolute -top-3 left-6 px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[10px] font-extrabold tracking-widest rounded-full shadow-md">{t('landing.lp.diff.cards.1.badge', 'GAIN 200-400 h/an')}</div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                <Database className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-2">{t('landing.lp.diff.cards.1.title', 'Import FEC → Scope 3 auto')}</h3>
              <div className="text-xs font-bold text-blue-700 mb-4">{t('landing.lp.diff.cards.1.subtitle', 'Parser 18 colonnes · Mapping PCG → ADEME')}</div>
              <p className="text-sm text-gray-600 leading-relaxed mb-5 flex-1">
                <Trans i18nKey="landing.lp.diff.cards.1.body">
                  Téléversez votre <strong>FEC (Sage, Cegid, Pennylane…)</strong>, nous calculons votre Scope 3 en <strong>5 minutes au lieu de 3 mois</strong> de saisie manuelle. Mapping automatique des classes 60, 61, 62 aux 47 facteurs ADEME.
                </Trans>
              </p>
              <div className="space-y-2 mb-6">
                {['Parser FEC 18 colonnes officiel', '47 facteurs ADEME embarqués', 'Mapping PCG automatique', 'Compatible Sage/Cegid/Pennylane'].map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    {t(`landing.lp.diff.cards.1.points.${i}`, p)}
                  </div>
                ))}
              </div>
              <div className="pt-5 border-t border-gray-100 text-xs text-gray-500">
                <strong className="text-gray-900">{t('landing.lp.diff.cards.1.footerLabel', 'Argument DAF :')}</strong> {t('landing.lp.diff.cards.1.footerText', 'retour sur investissement immédiat la 1ère semaine.')}
              </div>
            </div>

            {/* Pépite 3 : Préflight SBTi */}
            <div className="group relative p-8 bg-white rounded-3xl border-2 border-violet-100 hover:border-violet-300 hover:shadow-2xl hover:shadow-violet-500/10 transition-all duration-300 flex flex-col">
              <div className="absolute -top-3 left-6 px-3 py-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[10px] font-extrabold tracking-widest rounded-full shadow-md">{t('landing.lp.diff.cards.2.badge', 'ÉCONOMISE 9 500 $')}</div>
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-2">{t('landing.lp.diff.cards.2.title', 'Préflight SBTi v5.2')}</h3>
              <div className="text-xs font-bold text-violet-700 mb-4">{t('landing.lp.diff.cards.2.subtitle', 'Validation avant paiement du fee 9 500 $')}</div>
              <p className="text-sm text-gray-600 leading-relaxed mb-5 flex-1">
                <Trans i18nKey="landing.lp.diff.cards.2.body">
                  Avant de soumettre vos objectifs au Science-Based Targets initiative (et de payer 9 500 $ de frais), nous validons les critères v5.2 et vous évitons les <strong>30 % de rejets</strong> à la première revue.
                </Trans>
              </p>
              <div className="space-y-2 mb-6">
                {['Critères v5.2 vérifiés', 'Trajectoire 1.5°C : 4.2%/an', 'Scope 3 ≥ 40 % requis', 'Net-zero ≤ 2050'].map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-violet-500 flex-shrink-0" />
                    {t(`landing.lp.diff.cards.2.points.${i}`, p)}
                  </div>
                ))}
              </div>
              <div className="pt-5 border-t border-gray-100 text-xs text-gray-500">
                <strong className="text-gray-900">{t('landing.lp.diff.cards.2.footerLabel', 'Unique sur le marché :')}</strong> {t('landing.lp.diff.cards.2.footerText', 'aucun concurrent direct ne propose ce préflight.')}
              </div>
            </div>

          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 mb-4">{t('landing.lp.diff.bottomNote', 'Ces 3 capacités sont déjà en production, vérifiables sur démo.')}</p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/30 hover:-translate-y-0.5 transition-all"
            >
              {t('landing.lp.diff.bottomCta', 'Tester gratuitement — 14 jours')}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 70%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-4">
              <span className="w-8 h-px bg-emerald-400 inline-block" />
              {t('landing.lp.how.eyebrow', 'Comment ça marche')}
              <span className="w-8 h-px bg-emerald-400 inline-block" />
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mt-2 mb-4">{t('landing.lp.how.title', 'Opérationnel en 3 étapes')}</h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">{t('landing.lp.how.subtitle', 'Pas de mois de déploiement, pas de consultant externe. Votre équipe prend en main la plateforme dès le premier jour.')}</p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-16 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />

            {[
              {
                num: '01', title: 'Connectez vos sources',
                desc: 'Branchez vos ERP, importez vos CSV ou FEC, ou saisissez manuellement. 100+ indicateurs ESRS pré-configurés vous guident dès le premier jour.',
                icon: Database, color: 'from-emerald-500 to-green-600',
                detail: ['25 connecteurs natifs', 'Import CSV · FEC · Excel', '100+ indicateurs ESRS'],
              },
              {
                num: '02', title: "L'IA analyse et calcule",
                desc: "Le moteur IA détecte les anomalies, calcule vos Scopes 1/2/3, génère vos KPIs et vous alerte en temps réel avant que les problèmes deviennent critiques.",
                icon: Brain, color: 'from-violet-500 to-purple-600',
                detail: ['Scopes 1/2/3 automatiques', 'Anomalies temps réel', 'Chatbot ESG expert'],
              },
              {
                num: '03', title: 'Publiez et certifiez',
                desc: "Générez votre rapport CSRD (iXBRL/ESEF), GRI ou TCFD en 1 clic. Le journal d'audit avec empreintes SHA-256 et le workflow de validation facilitent vos revues auditeurs.",
                icon: FileText, color: 'from-blue-500 to-indigo-600',
                detail: ['Rapport PDF/Word/Excel/JSON', 'iXBRL/ESEF EFRAG 2024', 'Partage sécurisé auditeurs'],
              },
            ].map((s, i) => (
              <div key={i} className="relative flex flex-col bg-white rounded-3xl border border-gray-200 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                {/* Step badge */}
                <div className="absolute -top-4 left-8">
                  <span className={`inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br ${s.color} text-white text-xs font-black rounded-full shadow-lg`}>{s.num}</span>
                </div>
                <div className={`w-14 h-14 bg-gradient-to-br ${s.color} rounded-2xl flex items-center justify-center mb-5 shadow-lg mt-2`}>
                  <s.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t(`landing.lp.how.steps.${i}.title`, s.title)}</h3>
                <p className="text-gray-500 text-sm leading-relaxed flex-1 mb-5">{t(`landing.lp.how.steps.${i}.desc`, s.desc)}</p>
                <div className="space-y-2 pt-5 border-t border-gray-100">
                  {s.detail.map((d, j) => (
                    <div key={j} className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      {t(`landing.lp.how.steps.${i}.detail.${j}`, d)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROI / Impact ────────────────────────────────────────────────────── */}
      <section ref={roiRef} className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16,185,129,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(99,102,241,0.04) 0%, transparent 50%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-4">
              <span className="w-8 h-px bg-emerald-400 inline-block" />
              {t('landing.lp.impact.eyebrow', 'Impact mesurable')}
              <span className="w-8 h-px bg-emerald-400 inline-block" />
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
              {t('landing.lp.impact.titleLine1', 'Le ROI de vos équipes RSE,')}
              <br />
              <span className="text-emerald-600">{t('landing.lp.impact.titleLine2', 'avant et après ESGFlow')}</span>
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">{t('landing.lp.impact.subtitle', "Nos clients constatent des gains significatifs dès le premier trimestre d'utilisation.")}</p>
          </div>

          {/* Before / After cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* AVANT */}
            <div className="relative bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl p-8 border border-red-100 overflow-hidden">
              <div className="absolute top-4 right-4 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">{t('landing.lp.impact.beforeBadge', 'AVANT')}</div>
              <h3 className="text-xl font-bold text-red-900 mb-6 flex items-center gap-2"><XIcon className="h-6 w-6 text-red-500" /> {t('landing.lp.impact.beforeTitle', 'Sans ESGFlow')}</h3>
              <div className="space-y-4">
                {[
                  { icon: Clock, label: t('landing.lp.impact.before.0.label', '6 à 12 mois'), desc: t('landing.lp.impact.before.0.desc', 'pour produire un rapport CSRD'), color: 'text-red-600' },
                  { icon: FileSpreadsheet, label: t('landing.lp.impact.before.1.label', '15+ tableurs Excel'), desc: t('landing.lp.impact.before.1.desc', "non connectés, sources d'erreurs"), color: 'text-red-600' },
                  { icon: Users, label: t('landing.lp.impact.before.2.label', '3 à 5 ETP mobilisés'), desc: t('landing.lp.impact.before.2.desc', 'collecte manuelle des données'), color: 'text-red-600' },
                  { icon: AlertTriangle, label: t('landing.lp.impact.before.3.label', 'Risques de non-conformité'), desc: t('landing.lp.impact.before.3.desc', "données non traçables, pas de piste d'audit"), color: 'text-red-600' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white/70 rounded-xl p-4">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* APRÈS */}
            <div className="relative bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl p-8 border border-emerald-200 overflow-hidden shadow-lg shadow-emerald-100/50">
              <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">{t('landing.lp.impact.afterBadge', 'APRÈS')}</div>
              <h3 className="text-xl font-bold text-emerald-900 mb-6 flex items-center gap-2"><CheckCircle className="h-6 w-6 text-emerald-500" /> {t('landing.lp.impact.afterTitle', 'Avec ESGFlow')}</h3>
              <div className="space-y-4">
                {[
                  { icon: Zap, label: t('landing.lp.impact.after.0.label', '3 semaines'), desc: t('landing.lp.impact.after.0.desc', 'pour un rapport CSRD complet et auditable'), color: 'text-emerald-600' },
                  { icon: Database, label: t('landing.lp.impact.after.1.label', '1 plateforme unique'), desc: t('landing.lp.impact.after.1.desc', '22 modules intégrés, données centralisées'), color: 'text-emerald-600' },
                  { icon: Brain, label: t('landing.lp.impact.after.2.label', '1 ETP + IA'), desc: t('landing.lp.impact.after.2.desc', 'automatisation intelligente des tâches répétitives'), color: 'text-emerald-600' },
                  { icon: Shield, label: t('landing.lp.impact.after.3.label', 'Audit-ready'), desc: t('landing.lp.impact.after.3.desc', 'journal détaillé, empreintes SHA-256, export auditeurs'), color: 'text-emerald-600' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white/70 rounded-xl p-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Impact KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: 80, suffix: '%', label: t('landing.lp.impact.kpis.0.label', 'Temps gagné'), sub: t('landing.lp.impact.kpis.0.sub', 'sur la collecte de données'), color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { value: 3, suffix: 'x', label: t('landing.lp.impact.kpis.1.label', 'Plus rapide'), sub: t('landing.lp.impact.kpis.1.sub', 'pour le reporting CSRD'), color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
              { value: 100, suffix: '%', label: t('landing.lp.impact.kpis.2.label', 'Traçabilité'), sub: t('landing.lp.impact.kpis.2.sub', "piste d'audit certifiable"), color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
              { value: 40, suffix: '%', label: t('landing.lp.impact.kpis.3.label', 'Coûts réduits'), sub: t('landing.lp.impact.kpis.3.sub', 'vs prestation externe'), color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
            ].map((kpi, i) => {
              const animValue = useCounter(kpi.value, 1800, roiInView);
              return (
                <div key={i} className={`text-center p-6 ${kpi.bg} rounded-2xl border ${kpi.border}`}>
                  <div className={`text-4xl font-extrabold ${kpi.color} tabular-nums`}>{animValue}{kpi.suffix}</div>
                  <div className="text-sm font-bold text-gray-900 mt-1">{kpi.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{kpi.sub}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Nouveautés ──────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-sm font-semibold mb-4">
              <Sparkles className="h-4 w-4" /> {t('landing.lp.news.eyebrow', 'Nouvelles fonctionnalités 2026')}
            </span>
            <h2 className="text-4xl font-bold text-white mt-2 mb-4">{t('landing.lp.news.title', '5 nouveaux modules ajoutés')}</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">{t('landing.lp.news.subtitle', 'ESGFlow évolue constamment pour vous offrir la couverture ESG la plus complète du marché — désormais 22 modules intégrés.')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: FileText, color: 'from-sky-600 to-blue-700', title: t('landing.lp.news.cards.0.title', 'CSRD Report Builder'), desc: t('landing.lp.news.cards.0.desc', 'Construisez votre rapport CSRD section par section (E1→G1), suivez la complétion et exportez en PDF, Word, Excel ou JSON en 1 clic.'), badge: t('landing.lp.news.cards.0.badge', 'Nouveau') },
              { icon: GitMerge, color: 'from-teal-500 to-teal-700', title: t('landing.lp.news.cards.1.title', 'Mapping Multi-Référentiels'), desc: t('landing.lp.news.cards.1.desc', 'Saisissez une seule fois et mappez automatiquement vers GRI, CDP, TCFD et SDG. Identifiez les lacunes par référentiel.'), badge: t('landing.lp.news.cards.1.badge', 'Nouveau') },
              { icon: Bell, color: 'from-orange-500 to-red-600', title: t('landing.lp.news.cards.2.title', 'Alertes Intelligentes'), desc: t('landing.lp.news.cards.2.desc', 'Créez des alertes personnalisées sur seuils, KPIs et échéances réglementaires avec notifications email et webhook temps réel.'), badge: t('landing.lp.news.cards.2.badge', 'Nouveau') },
              { icon: Code2, color: 'from-indigo-500 to-violet-600', title: t('landing.lp.news.cards.3.title', 'API & Portail Développeur'), desc: t('landing.lp.news.cards.3.desc', 'API REST complète avec gestion des clés API, documentation Swagger interactive, OAuth2 et SSO SAML pour les intégrations sur mesure.'), badge: t('landing.lp.news.cards.3.badge', 'Nouveau') },
              { icon: Activity, color: 'from-violet-500 to-purple-700', title: t('landing.lp.news.cards.4.title', 'Qualité des Données'), desc: t('landing.lp.news.cards.4.desc', "Score de complétude par pilier E/S/G, détection d'anomalies automatique, données manquantes ESRS et recommandations IA."), badge: t('landing.lp.news.cards.4.badge', 'Nouveau') },
              { icon: Upload, color: 'from-cyan-500 to-teal-600', title: t('landing.lp.news.cards.5.title', 'Import FEC Scope 3'), desc: t('landing.lp.news.cards.5.desc', 'Calculez vos émissions Scope 3 directement depuis votre fichier comptable FEC (Sage, Cegid, Pennylane).'), badge: t('landing.lp.news.cards.5.badge', 'Populaire') },
            ].map((f, i) => (
              <div key={i} className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 hover:border-white/20 transition-all duration-300 hover:-translate-y-1">
                <div className={`w-12 h-12 bg-gradient-to-br ${f.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-bold text-base">{f.title}</h3>
                  <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30 flex-shrink-0">{f.badge}</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/register">
              <button className="inline-flex items-center gap-2 px-8 py-3.5 bg-green-500 hover:bg-green-400 text-white font-bold rounded-2xl transition-all shadow-xl shadow-green-500/25 hover:-translate-y-0.5">
                {t('landing.lp.news.cta', 'Accéder à tous les modules')} <ArrowRight className="h-5 w-5" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Data Ecosystem ───────────────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-widest">{t('landing.lp.eco.eyebrow', 'Données & Intégrations')}</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">{t('landing.lp.eco.title', 'Un écosystème de données complet')}</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              {t('landing.lp.eco.subtitle', 'Connectez-vous à vos outils, enrichissez vos données avec les sources officielles et automatisez vos flux via webhooks.')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* INSEE Card */}
            <div className="lg:col-span-1 bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDYiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==')] opacity-40" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-white/20 rounded-xl">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">INSEE Sirene</div>
                    <div className="text-blue-200 text-xs">{t('landing.lp.eco.insee.subtitle', 'Base officielle française')}</div>
                  </div>
                </div>
                <div className="text-3xl font-extrabold mb-1">10M+</div>
                <div className="text-blue-200 text-sm mb-6">{t('landing.lp.eco.insee.indexed', 'entreprises françaises indexées')}</div>
                <div className="space-y-2.5">
                  {['Recherche par SIREN / SIRET', 'Données légales officielles', 'Activité NAF/APE · Effectifs', 'Enrichissement ESG automatique', 'Gratuit · Temps réel'].map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-blue-100">
                      <CheckCircle className="h-4 w-4 text-blue-300 flex-shrink-0" />
                      {t(`landing.lp.eco.insee.features.${i}`, f)}
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-white/20">
                  <div className="flex items-center gap-2 text-xs text-blue-200">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    {t('landing.lp.eco.insee.api', 'API officielle · Pas de clé requise')}
                  </div>
                </div>
              </div>
            </div>

            {/* Integrations + Webhooks */}
            <div className="lg:col-span-2 space-y-6">

              {/* Integrations */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-gray-900">{t('landing.lp.eco.integrations.title', 'Intégrations disponibles')}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{t('landing.lp.eco.integrations.subtitle', 'Synchronisez vos données avec vos outils BI')}</p>
                  </div>
                  <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">{t('landing.lp.eco.integrations.count', '4 connecteurs')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Table2, name: 'Google Sheets', features: ['import', 'export', 'sync temps réel'], color: 'text-green-600', bg: 'bg-green-50' },
                    { icon: BarChart3, name: 'Microsoft Power BI', features: ['export', 'dashboard embedding'], color: 'text-yellow-600', bg: 'bg-yellow-50' },
                    { icon: PieChart, name: 'Tableau', features: ['export', 'live connection'], color: 'text-blue-600', bg: 'bg-blue-50' },
                    { icon: FileSpreadsheet, name: 'Excel Online', features: ['import', 'export'], color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  ].map((int, i) => (
                    <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                      <div className={`p-2 ${int.bg} rounded-lg flex-shrink-0 ${int.color}`}>
                        <int.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{int.name}</div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {int.features.map((f, j) => (
                            <span key={j} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t(`landing.lp.eco.integrations.items.${i}.features.${j}`, f)}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Webhooks */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Radio className="h-4 w-4 text-violet-500" />
                      {t('landing.lp.eco.webhooks.title', 'Webhooks & Automatisation')}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">{t('landing.lp.eco.webhooks.subtitle', 'Notifications temps réel vers vos services')}</p>
                  </div>
                  <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full border border-violet-200">{t('landing.lp.eco.webhooks.count', '6 événements')}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'data.uploaded', color: 'bg-blue-100 text-blue-700' },
                    { type: 'score.calculated', color: 'bg-green-100 text-green-700' },
                    { type: 'indicator.created', color: 'bg-amber-100 text-amber-700' },
                    { type: 'indicator.updated', color: 'bg-orange-100 text-orange-700' },
                    { type: 'user.created', color: 'bg-pink-100 text-pink-700' },
                    { type: 'threshold.exceeded', color: 'bg-red-100 text-red-700' },
                  ].map((ev, i) => (
                    <div key={i} className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium ${ev.color}`}>
                      {ev.type}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    { label: 'Signature HMAC', icon: Shield, color: 'text-gray-600' },
                    { label: 'Retry automatique', icon: Activity, color: 'text-violet-600' },
                    { label: 'Logs complets', icon: FileText, color: 'text-blue-600' },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-xl p-3">
                      <f.icon className={`h-4 w-4 ${f.color} flex-shrink-0`} />
                      {t(`landing.lp.eco.webhooks.features.${i}`, f.label)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparatif concurrents ──────────────────────────────────────────── */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 100%, rgba(16,185,129,0.05) 0%, transparent 60%)' }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-4">
              <span className="w-8 h-px bg-emerald-400 inline-block" />
              {t('landing.lp.comparison.eyebrow', 'Comparatif')}
              <span className="w-8 h-px bg-emerald-400 inline-block" />
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
              {t('landing.lp.comparison.title', 'Pourquoi choisir ESGFlow ?')}
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">{t('landing.lp.comparison.subtitle', "Comparez en un coup d'oeil ce que chaque solution propose réellement.")}</p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-5 text-center text-sm font-bold border-b border-gray-200">
              <div className="p-4 text-left text-gray-500 text-xs uppercase tracking-wider">{t('landing.lp.comparison.colFeature', 'Fonctionnalité')}</div>
              <div className="p-4 bg-emerald-50 border-x border-emerald-100">
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center"><Leaf className="h-3.5 w-3.5 text-white" /></div>
                  <span className="text-emerald-700">ESGFlow</span>
                </div>
              </div>
              <div className="p-4 text-gray-600">{t('landing.lp.comparison.colExcel', 'Tableurs Excel')}</div>
              <div className="p-4 text-gray-600">Greenly</div>
              <div className="p-4 text-gray-600">Sweep</div>
            </div>
            {/* Rows */}
            {[
              { feature: 'Bilan Carbone Scope 1/2/3', esg: true, excel: 'partial', greenly: true, sweep: true },
              { feature: '15 catégories Scope 3', esg: true, excel: false, greenly: 'partial', sweep: true },
              { feature: 'Rapport CSRD / ESRS complet', esg: true, excel: false, greenly: false, sweep: 'partial' },
              { feature: 'Double matérialité interactive', esg: true, excel: false, greenly: false, sweep: 'partial' },
              { feature: 'Supply Chain / Due Diligence', esg: true, excel: false, greenly: false, sweep: 'partial' },
              { feature: 'Plan décarbonation SBTi', esg: true, excel: false, greenly: 'partial', sweep: true },
              { feature: 'IA générative & Chatbot ESG', esg: true, excel: false, greenly: false, sweep: false },
              { feature: 'Piste d\'audit SHA-256', esg: true, excel: false, greenly: false, sweep: false },
              { feature: 'Multi-réglementaire (10 ref.)', esg: true, excel: false, greenly: false, sweep: false },
              { feature: 'Taxonomie UE', esg: true, excel: false, greenly: false, sweep: 'partial' },
              { feature: 'Hébergement 100% France', esg: true, excel: 'na', greenly: false, sweep: false },
              { feature: 'À partir de', esg: '249€', excel: '0€', greenly: '500€+', sweep: t('landing.lp.comparison.customQuote', 'Sur devis') },
            ].map((row, i) => {
              const renderCell = (val: boolean | string) => {
                if (val === true) return <Check className="h-5 w-5 text-emerald-500 mx-auto" />;
                if (val === false) return <X className="h-5 w-5 text-gray-300 mx-auto" />;
                if (val === 'partial') return <div className="w-5 h-5 mx-auto rounded-full border-2 border-amber-400 flex items-center justify-center"><div className="w-2 h-2 bg-amber-400 rounded-full" /></div>;
                if (val === 'na') return <span className="text-xs text-gray-400">—</span>;
                return <span className="text-sm font-bold text-gray-900">{val}</span>;
              };
              return (
                <div key={i} className={`grid grid-cols-5 text-center items-center ${i % 2 === 0 ? 'bg-gray-50/50' : ''} ${i === 11 ? 'border-t-2 border-gray-200 bg-gray-50 font-semibold' : ''}`}>
                  <div className="p-3.5 text-left text-sm text-gray-700">{t(`landing.lp.comparison.rows.${i}`, row.feature)}</div>
                  <div className="p-3.5 bg-emerald-50/50 border-x border-emerald-100/50">{renderCell(row.esg)}</div>
                  <div className="p-3.5">{renderCell(row.excel)}</div>
                  <div className="p-3.5">{renderCell(row.greenly)}</div>
                  <div className="p-3.5">{renderCell(row.sweep)}</div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> {t('landing.lp.comparison.legendIncluded', 'Inclus')}</span>
            <span className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full border-2 border-amber-400 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-amber-400 rounded-full" /></div> {t('landing.lp.comparison.legendPartial', 'Partiel')}</span>
            <span className="flex items-center gap-1.5"><X className="h-4 w-4 text-gray-300" /> {t('landing.lp.comparison.legendUnavailable', 'Non disponible')}</span>
          </div>

          <div className="text-center mt-10">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm text-gray-500">{t('landing.lp.comparison.detailedCompare', 'Voir les comparatifs détaillés :')}</span>
              {[
                { slug: 'greenly', name: 'Greenly' },
                { slug: 'sweep', name: 'Sweep' },
                { slug: 'persefoni', name: 'Persefoni' },
                { slug: 'workiva', name: 'Workiva' },
              ].map(c => (
                <Link
                  key={c.slug}
                  to={`/compare/${c.slug}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-full text-sm font-semibold transition-colors"
                >
                  vs {c.name} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────────── */}
      <section id="tarifs" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-green-600 uppercase tracking-widest">{t('landing.lp.pricing.eyebrow', 'Tarifs')}</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">{t('landing.lp.pricing.title', 'Plans adaptés à votre taille')}</h2>
            <p className="text-lg text-gray-500 mb-8">{t('landing.lp.pricing.subtitle', 'Commencez gratuitement. Évoluez à votre rythme. Sans engagement.')}</p>
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
              <button onClick={() => setBilling('monthly')} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${billing === 'monthly' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500'}`}>{t('landing.lp.pricing.monthly', 'Mensuel')}</button>
              <button onClick={() => setBilling('annual')} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${billing === 'annual' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500'}`}>
                {t('landing.lp.pricing.annual', 'Annuel')} <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">-15%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan, i) => {
              const price = billing === 'annual' ? plan.annual : plan.monthly;
              const highlight = plan.primary;
              return (
                <div key={i} className={`relative flex flex-col rounded-3xl border-2 ${plan.color} bg-white p-8 transition-all duration-300 ${highlight ? 'shadow-2xl shadow-green-500/15 scale-105' : 'hover:shadow-xl hover:-translate-y-1'}`}>
                  {plan.badge && (
                    <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${plan.badgeStyle} shadow-lg`}>
                      {t(`landing.lp.pricing.plans.${i}.badge`, plan.badge)}
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                    <p className="text-sm text-gray-500">{t(`landing.lp.pricing.plans.${i}.desc`, plan.desc)}</p>
                  </div>
                  <div className="mb-8">
                    {price !== null ? (
                      <div className="flex items-end gap-2">
                        <span className="text-5xl font-extrabold text-gray-900">{price}€</span>
                        <span className="text-gray-400 mb-2 text-sm">{t('landing.lp.pricing.perMonth', '/mois')}{billing === 'annual' && <span className="block text-xs text-green-600 font-semibold">{t('landing.lp.pricing.billedAnnually', 'facturé annuellement')}</span>}</span>
                      </div>
                    ) : <div className="text-4xl font-extrabold text-gray-900">{t('landing.lp.pricing.custom', 'Sur devis')}</div>}
                  </div>
                  <Link to={plan.cta?.toLowerCase().includes('contact') ? '/contact' : '/register'} className="block mb-8">
                    <button className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${highlight ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30 hover:-translate-y-0.5' : 'bg-gray-900 hover:bg-gray-800 text-white'}`}>
                      {t(`landing.lp.pricing.plans.${i}.cta`, plan.cta)}
                    </button>
                  </Link>
                  <div className="space-y-2.5 flex-1">
                    {plan.features.map((f, j) => (
                      <div key={j} className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{t(`landing.lp.pricing.plans.${i}.features.${j}`, f)}</span>
                      </div>
                    ))}
                    {plan.missing.map((f, j) => (
                      <div key={j} className="flex items-start gap-2.5 opacity-35">
                        <X className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-500">{t(`landing.lp.pricing.plans.${i}.missing.${j}`, f)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-center text-sm text-gray-400 mt-10">{t('landing.lp.pricing.vatNote', 'Tous les prix sont HT · TVA applicable · ')}<button onClick={() => scrollTo('faq')} className="text-green-600 hover:underline">{t('landing.lp.pricing.faqLink', 'Questions fréquentes')}</button></p>

          {/* ── ROI Calculator ──────────────────────────────────────────────── */}
          {(() => {
            const timeSaved = Math.round(roiHoursMonth * 0.80);
            const monthlySavings = timeSaved * roiHourlyRate;
            const annualSavings = monthlySavings * 12;
            const recommendedPlan = roiEmployees <= 80 ? 'PME' : roiEmployees <= 350 ? 'ETI' : 'Groupe';
            const planCost = roiEmployees <= 80
              ? (billing === 'annual' ? 212 : 249)
              : roiEmployees <= 350
                ? (billing === 'annual' ? 509 : 599)
                : (billing === 'annual' ? 1019 : 1199);
            const planAnnualCost = planCost * 12;
            const netSavings = annualSavings - planAnnualCost;
            const roiPercent = Math.round((netSavings / planAnnualCost) * 100);
            const paybackMonths = monthlySavings > 0 ? Math.max(1, Math.ceil(planAnnualCost / monthlySavings / 12)) : 0;

            return (
              <div id="roi-calculator" className="mt-20 bg-white rounded-3xl border-2 border-emerald-100 shadow-xl shadow-emerald-100/30 p-8 md:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-emerald-50 to-transparent rounded-bl-full pointer-events-none" />
                <div className="relative">
                  <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-sm font-semibold mb-4">
                      <Calculator className="h-4 w-4" />
                      {t('landing.lp.roi.badge', 'Simulateur ROI')}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900">{t('landing.lp.roi.title', 'Calculez vos économies avec ESGFlow')}</h3>
                    <p className="text-gray-500 mt-2 max-w-xl mx-auto">{t('landing.lp.roi.subtitle', 'Ajustez les curseurs selon votre organisation pour estimer le retour sur investissement.')}</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                    {/* ── Inputs (3 cols) ── */}
                    <div className="lg:col-span-3 space-y-8">
                      {/* Slider: Employees */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Users className="h-4 w-4 text-gray-400" />{t('landing.lp.roi.employees', 'Nombre de collaborateurs')}</label>
                          <span className="text-xl font-extrabold text-gray-900 tabular-nums bg-gray-50 px-3 py-1 rounded-lg">{roiEmployees}</span>
                        </div>
                        <input type="range" min={10} max={2000} step={10} value={roiEmployees}
                          onChange={e => setRoiEmployees(+e.target.value)}
                          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-emerald-500"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1"><span>10</span><span>500</span><span>1 000</span><span>2 000</span></div>
                      </div>

                      {/* Slider: Hours/month */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Clock className="h-4 w-4 text-gray-400" />{t('landing.lp.roi.hours', "Heures / mois consacrées à l'ESG")}</label>
                          <span className="text-xl font-extrabold text-gray-900 tabular-nums bg-gray-50 px-3 py-1 rounded-lg">{roiHoursMonth}h</span>
                        </div>
                        <input type="range" min={10} max={500} step={5} value={roiHoursMonth}
                          onChange={e => setRoiHoursMonth(+e.target.value)}
                          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1"><span>10h</span><span>150h</span><span>300h</span><span>500h</span></div>
                      </div>

                      {/* Slider: Hourly rate */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-gray-400" />{t('landing.lp.roi.rate', 'Coût horaire moyen (chargé)')}</label>
                          <span className="text-xl font-extrabold text-gray-900 tabular-nums bg-gray-50 px-3 py-1 rounded-lg">{roiHourlyRate}€</span>
                        </div>
                        <input type="range" min={25} max={200} step={5} value={roiHourlyRate}
                          onChange={e => setRoiHourlyRate(+e.target.value)}
                          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-violet-500"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1"><span>25€</span><span>75€</span><span>125€</span><span>200€</span></div>
                      </div>

                      {/* Assumptions */}
                      <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
                        <BookOpen className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>{t('landing.lp.roi.assumption', "Estimation basée sur une réduction de 80 % du temps de collecte et de reporting, constatée en moyenne par nos clients après 3 mois d'utilisation.")}</span>
                      </div>
                    </div>

                    {/* ── Results (2 cols) ── */}
                    <div className="lg:col-span-2 flex flex-col">
                      <div className="bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl p-6 text-white flex-1 flex flex-col justify-between shadow-lg shadow-emerald-500/20">
                        <div className="space-y-5">
                          <div className="flex items-center justify-between pb-4 border-b border-white/20">
                            <span className="text-sm text-emerald-100 font-medium">{t('landing.lp.roi.timeSaved', 'Temps économisé')}</span>
                            <span className="text-2xl font-extrabold tabular-nums">{timeSaved}h<span className="text-sm font-medium text-emerald-200">{t('landing.lp.roi.perMonth', ' / mois')}</span></span>
                          </div>
                          <div className="flex items-center justify-between pb-4 border-b border-white/20">
                            <span className="text-sm text-emerald-100 font-medium">{t('landing.lp.roi.monthlySavings', 'Économie mensuelle')}</span>
                            <span className="text-2xl font-extrabold tabular-nums">{monthlySavings.toLocaleString('fr-FR')}€</span>
                          </div>
                          <div className="flex items-center justify-between pb-4 border-b border-white/20">
                            <span className="text-sm text-emerald-100 font-medium">{t('landing.lp.roi.annualSavings', 'Économie annuelle')}</span>
                            <span className="text-3xl font-extrabold tabular-nums">{annualSavings.toLocaleString('fr-FR')}€</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-emerald-100 font-medium">{t('landing.lp.roi.netRoi', 'ROI net')}</span>
                            <span className={`text-2xl font-extrabold tabular-nums ${roiPercent > 0 ? 'text-green-200' : 'text-red-300'}`}>{roiPercent > 0 ? '+' : ''}{roiPercent}%</span>
                          </div>
                        </div>

                        <div className="mt-6 pt-5 border-t border-white/20">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-emerald-100">{t('landing.lp.roi.recommendedPlan', 'Plan recommandé')}</span>
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold">{recommendedPlan}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-emerald-100">{t('landing.lp.roi.planCost', 'Coût plan')}</span>
                            <span className="font-semibold">{planCost}€{t('landing.lp.roi.perMonthShort', '/mois')}</span>
                          </div>
                          {netSavings > 0 && (
                            <div className="mt-3 bg-white/10 rounded-xl p-3 text-center">
                              <div className="text-xs text-emerald-200">{t('landing.lp.roi.netGain', 'Gain net après abonnement')}</div>
                              <div className="text-2xl font-extrabold mt-1">{netSavings.toLocaleString('fr-FR')}€<span className="text-sm font-medium text-emerald-200">{t('landing.lp.roi.perYear', ' / an')}</span></div>
                            </div>
                          )}
                        </div>
                      </div>
                      <Link to="/register" className="mt-4">
                        <button className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2">
                          {t('landing.lp.roi.cta', 'Essai gratuit 14 jours')} <ArrowRight className="h-4 w-4" />
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-4">
              <span className="w-8 h-px bg-emerald-400 inline-block" />
              {t('landing.lp.testimonials.eyebrow', 'Témoignages')}
              <span className="w-8 h-px bg-emerald-400 inline-block" />
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mt-2">{t('landing.lp.testimonials.title', 'Ce que disent nos clients')}</h2>
          </div>

          {/* Featured testimonial */}
          <div className="mb-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="relative flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg">SM</div>
              </div>
              <div className="flex-1">
                <div className="flex gap-1 mb-4">{Array.from({ length: 5 }).map((_, j) => <Star key={j} className="h-4 w-4 text-yellow-400 fill-yellow-400" />)}</div>
                <blockquote className="text-white text-lg md:text-xl leading-relaxed font-medium mb-6">
                  "{t('landing.lp.testimonials.featured.text', "Le journal d'audit détaillé et le module multi-réglementaire ont transformé notre préparation aux revues CSRD. Ce qui prenait plusieurs semaines se fait maintenant en quelques heures.")}"
                </blockquote>
                <div>
                  <div className="text-white font-bold">Sophie Martineau</div>
                  <div className="text-slate-400 text-sm">{t('landing.lp.testimonials.featured.role', 'Directrice RSE · Nexans')}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { name: 'Thomas Durand', role: 'CFO · Biocoop', text: 'Le plan de décarbonation avec les scénarios SBTi et les 24 actions ROI nous a permis de construire notre trajectoire Net Zero en quelques jours, contre plusieurs semaines auparavant.', stars: 5, avatar: 'TD', color: 'from-blue-500 to-indigo-600' },
              { name: 'Amélie Chen', role: 'Partner ESG · Deloitte France', text: 'Le module Supply Chain ESG avec scoring fournisseurs et questionnaires automatisés est exactement ce que nos clients attendaient pour structurer leur démarche CSDDD. Excellent outil.', stars: 5, avatar: 'AC', color: 'from-emerald-500 to-teal-600' },
            ].map((tst, i) => (
              <div key={i} className="flex flex-col p-8 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex gap-1 mb-5">{Array.from({ length: tst.stars }).map((_, j) => <Star key={j} className="h-4 w-4 text-yellow-400 fill-yellow-400" />)}</div>
                <blockquote className="text-gray-700 text-sm leading-relaxed flex-1 mb-6 italic">"{t(`landing.lp.testimonials.items.${i}.text`, tst.text)}"</blockquote>
                <div className="flex items-center gap-3 pt-5 border-t border-gray-100">
                  <div className={`w-10 h-10 bg-gradient-to-br ${tst.color} rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>{tst.avatar}</div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{tst.name}</div>
                    <div className="text-xs text-gray-500">{t(`landing.lp.testimonials.items.${i}.role`, tst.role)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sécurité & Conformité ──────────────────────────────────────────── */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 70% 50%, rgba(99,102,241,0.04) 0%, transparent 60%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 uppercase tracking-widest mb-4">
              <span className="w-8 h-px bg-slate-300 inline-block" />
              {t('landing.lp.security.eyebrow', 'Sécurité & Conformité')}
              <span className="w-8 h-px bg-slate-300 inline-block" />
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mt-2 mb-4">{t('landing.lp.security.title', 'Vos données méritent le meilleur')}</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">{t('landing.lp.security.subtitle', "Infrastructure souveraine, chiffrement de bout en bout, audit certifiable — la confiance n'est pas une option.")}</p>
          </div>

          {/* Certifications row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-14">
            {[
              { icon: Shield, label: 'RGPD', sub: 'Données hébergées en France', desc: 'Aucun transfert hors UE. DPA inclus.', color: 'from-blue-500 to-indigo-600', ring: 'ring-blue-100' },
              { icon: Lock, label: 'ISO 27001', sub: 'Datacenter certifié', desc: 'Sécurité physique & logique auditée.', color: 'from-slate-600 to-slate-800', ring: 'ring-slate-100' },
              { icon: ShieldCheck, label: 'iXBRL/ESEF', sub: 'EFRAG 2024-12-31', desc: 'XHTML certifiable conforme ESMA.', color: 'from-violet-500 to-purple-600', ring: 'ring-violet-100' },
              { icon: Award, label: 'CSRD / ESRS 2025', sub: 'Conforme & mis à jour', desc: '82 exigences ESRS mappées.', color: 'from-emerald-500 to-green-600', ring: 'ring-emerald-100' },
            ].map(({ icon: Icon, label, sub, desc, color, ring }, i) => (
              <div key={label} className={`relative group p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 ring-1 ${ring}`}>
                <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="text-lg font-extrabold text-gray-900 mb-1">{label}</div>
                <div className="text-sm font-semibold text-gray-600 mb-2">{t(`landing.lp.security.certs.${i}.sub`, sub)}</div>
                <div className="text-xs text-gray-400 leading-relaxed">{t(`landing.lp.security.certs.${i}.desc`, desc)}</div>
              </div>
            ))}
          </div>

          {/* Security features grid */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-10 relative overflow-hidden">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-white font-bold text-lg">{t('landing.lp.security.infraTitle', 'Infrastructure de confiance')}</div>
                  <div className="text-slate-400 text-sm">{t('landing.lp.security.infraSubtitle', 'Chaque couche est protégée')}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: Lock, title: 'Chiffrement AES-256', items: ['Données au repos chiffrées', 'TLS 1.3 en transit', 'Clés rotées automatiquement'] },
                  { icon: Hash, title: 'Empreintes SHA-256', items: ['Empreinte par enregistrement', 'Horodatage UTC précis', 'Détection des modifications'] },
                  { icon: Server, title: 'Hébergement souverain', items: ['Datacenter France tier III+', 'Backup quotidien géo-répliqué', 'Aucun cloud US / Aucun GAFAM'] },
                  { icon: Eye, title: 'Traçabilité complète', items: ['Journal d\'audit détaillé', 'Qui, quoi, quand — traçable', 'Export auditeurs 1 clic'] },
                  { icon: Users, title: 'Contrôle d\'accès', items: ['RBAC multi-niveaux', 'SSO SAML / OAuth2', 'Isolation tenant (RLS)'] },
                  { icon: RefreshCw, title: 'Continuité & SLA', items: ['Disponibilité 99.9%', 'Monitoring 24/7', 'PRA & PCA documentés'] },
                ].map(({ icon: Icon, title, items }, i) => (
                  <div key={title} className="p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/8 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <Icon className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                      <div className="text-white font-semibold text-sm">{t(`landing.lp.security.features.${i}.title`, title)}</div>
                    </div>
                    <div className="space-y-2">
                      {items.map((item, j) => (
                        <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                          <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                          {t(`landing.lp.security.features.${i}.items.${j}`, item)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> {t('landing.lp.security.strip.0', 'Multi-tenant RLS PostgreSQL')}</span>
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> {t('landing.lp.security.strip.1', 'E-signatures SHA-256 par entrée')}</span>
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> {t('landing.lp.security.strip.2', 'Conforme CSRD Art. 29a')}</span>
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> {t('landing.lp.security.strip.3', 'Zéro dépendance cloud US')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Ressources & Guides ─────────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
            <div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-4">
                <span className="w-8 h-px bg-emerald-400 inline-block" />
                {t('landing.lp.resources.eyebrow', 'Ressources gratuites')}
              </span>
              <h2 className="text-4xl font-extrabold text-gray-900 mt-2">{t('landing.lp.resources.title', 'Guides & expertises ESG')}</h2>
              <p className="text-gray-500 mt-2 max-w-lg">{t('landing.lp.resources.subtitle', 'Approfondissez vos connaissances avec nos guides pratiques rédigés par des experts ESG.')}</p>
            </div>
            <Link to="/resources" className="mt-4 md:mt-0 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
              {t('landing.lp.resources.allLink', 'Toutes les ressources')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                category: 'Guide',
                catColor: 'bg-blue-100 text-blue-700',
                title: 'CSRD pour les PME',
                desc: 'Tout ce que les PME doivent savoir sur la CSRD : calendrier, seuils, normes ESRS et plan d\'action concret.',
                icon: GraduationCap,
                color: 'from-blue-500 to-indigo-600',
                href: '/guide/csrd-pme',
                readTime: '12 min',
              },
              {
                category: 'Guide',
                catColor: 'bg-orange-100 text-orange-700',
                title: 'Bilan Carbone entreprise',
                desc: 'Guide complet du bilan carbone : Scopes 1/2/3, facteurs ADEME, obligations légales et méthodologie pas à pas.',
                icon: Flame,
                color: 'from-orange-500 to-red-600',
                href: '/guide/bilan-carbone-entreprise',
                readTime: '15 min',
              },
              {
                category: 'Guide',
                catColor: 'bg-violet-100 text-violet-700',
                title: 'CSDDD & Supply Chain',
                desc: 'Due diligence européenne : qui est concerné, obligations, calendrier d\'application et plan de mise en conformité.',
                icon: Truck,
                color: 'from-violet-500 to-purple-600',
                href: '/guide/csddd-supply-chain',
                readTime: '10 min',
              },
              {
                category: 'Checklist',
                catColor: 'bg-emerald-100 text-emerald-700',
                title: 'Checklist CSRD 2025',
                desc: 'Les 50 points de contrôle essentiels pour préparer votre premier reporting CSRD. Téléchargeable en PDF.',
                icon: FileCheck,
                color: 'from-emerald-500 to-green-600',
                href: '/ressources/checklist-csrd',
                readTime: '8 min',
              },
            ].map((resource, i) => (
              <Link key={i} to={resource.href} className="group flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                {/* Top gradient bar */}
                <div className={`h-2 bg-gradient-to-r ${resource.color}`} />
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${resource.catColor}`}>{t(`landing.lp.resources.items.${i}.category`, resource.category)}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="h-3 w-3" />{resource.readTime}</span>
                  </div>
                  <div className={`w-11 h-11 bg-gradient-to-br ${resource.color} rounded-xl flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform`}>
                    <resource.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">{t(`landing.lp.resources.items.${i}.title`, resource.title)}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed flex-1">{t(`landing.lp.resources.items.${i}.desc`, resource.desc)}</p>
                  <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-emerald-600 group-hover:gap-2 transition-all">
                    {t('landing.lp.resources.readGuide', 'Lire le guide')} <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Qui sommes-nous ──────────────────────────────────────────────────── */}
      <section id="qui-sommes-nous" className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Header ── */}
          <div className="text-center mb-20">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-sm font-semibold uppercase tracking-widest mb-5">
              <Users className="h-4 w-4" /> {t('landing.lp.about.eyebrow', 'Notre histoire')}
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
              {t('landing.lp.about.title', 'Qui sommes-nous ?')}
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              {t('landing.lp.about.intro', "ESGFlow est né d'un constat simple : les équipes RSE européennes méritent une plateforme pensée pour elles — pas un tableur, pas un outil américain, pas 6 logiciels différents.")}
            </p>
          </div>

          {/* ── Mission block ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
            {/* Left: texte */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-slate-600 text-xs font-semibold uppercase tracking-wide mb-6">
                <Target className="h-3.5 w-3.5" /> {t('landing.lp.about.missionEyebrow', 'Notre mission')}
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6 leading-tight">
                {t('landing.lp.about.missionTitle', 'Démocratiser la conformité ESG pour toutes les entreprises européennes')}
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6 text-lg">
                <Trans i18nKey="landing.lp.about.missionP1">
                  Nous construisons la première plateforme ESG <strong className="text-gray-900">nativement européenne</strong> : conçue dès le départ pour la CSRD, la Taxonomie UE, SFDR, les SBTi et le devoir de vigilance — pas adaptée après coup.
                </Trans>
              </p>
              <p className="text-gray-600 leading-relaxed mb-8">
                {t('landing.lp.about.missionP2', 'Notre conviction : la transition durable ne doit pas être réservée aux grands groupes avec des équipes de 20 consultants. Une PME de 250 personnes doit pouvoir produire un rapport CSRD certifiable, en quelques semaines, sans expertise préalable.')}
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: '22', label: 'modules ESG', color: 'text-emerald-600' },
                  { value: '8', label: 'réglementations couvertes', color: 'text-blue-600' },
                  { value: '100%', label: 'hébergement France', color: 'text-violet-600' },
                  { value: '14j', label: "d'essai gratuit", color: 'text-amber-600' },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className={`text-2xl font-extrabold ${s.color} mb-1`}>{s.value}</div>
                    <div className="text-sm text-gray-600 font-medium">{t(`landing.lp.about.stats.${i}.label`, s.label)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: visual timeline */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl" />
              <div className="relative p-8 space-y-6">
                {[
                  {
                    year: '2022', icon: Leaf, color: 'bg-emerald-500',
                    title: 'Naissance du projet',
                    desc: 'Face à la complexité de la directive CSRD en cours de finalisation, une équipe de consultants RSE décide de construire l\'outil qu\'ils auraient voulu avoir.',
                  },
                  {
                    year: '2023', icon: Code2, color: 'bg-blue-500',
                    title: 'Premier prototype',
                    desc: 'Lancement du module Bilan Carbone et du générateur de rapport CSRD. Premiers bêta-testeurs en France et en Belgique.',
                  },
                  {
                    year: '2024', icon: Globe, color: 'bg-violet-500',
                    title: 'Plateforme complète',
                    desc: 'Ajout de la Taxonomie UE, SFDR, SBTi, Vigilance, circuit d\'approbation ISAE 3000. Certification iXBRL/ESEF pour les rapports de durabilité.',
                  },
                  {
                    year: '2025+', icon: Sparkles, color: 'bg-amber-500',
                    title: 'Intelligence augmentée',
                    desc: 'IA générative intégrée : extraction automatique des données FEC, analyse de gap CSRD, calcul de matérialité, génération de politiques RSE.',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 ${item.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <item.icon className="h-4 w-4 text-white" />
                      </div>
                      {i < 3 && <div className="w-0.5 h-6 bg-gray-200 mt-2" />}
                    </div>
                    <div className="pb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{item.year}</span>
                        <span className="text-sm font-bold text-gray-900">{t(`landing.lp.about.timeline.${i}.title`, item.title)}</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{t(`landing.lp.about.timeline.${i}.desc`, item.desc)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Problèmes & Solutions ── */}
          <div className="mb-24">
            <div className="text-center mb-14">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-100 rounded-full text-red-600 text-xs font-semibold uppercase tracking-wide mb-4">
                <AlertTriangle className="h-3.5 w-3.5" /> {t('landing.lp.about.problemsEyebrow', 'Les problèmes du marché')}
              </span>
              <h3 className="text-3xl font-bold text-gray-900">{t('landing.lp.about.problemsTitle', 'Ce que nous résolvons')}</h3>
              <p className="text-gray-500 mt-3 max-w-xl mx-auto">{t('landing.lp.about.problemsSubtitle', 'Nous avons rencontré ces mêmes obstacles en tant que consultants RSE. ESGFlow est notre réponse directe.')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  problem: 'Données ESG fragmentées dans des tableurs',
                  problemDesc: 'Les équipes RSE passent 60% de leur temps à consolider des fichiers Excel épars, sans traçabilité ni contrôle des versions.',
                  solution: 'Plateforme centralisée avec 22 modules connectés',
                  solutionDesc: 'Un seul endroit pour saisir, valider, approuver et exporter toutes vos données ESG — avec circuit d\'approbation et signature SHA-256.',
                  problemIcon: AlertTriangle,
                  solutionIcon: CheckCircle,
                  problemColor: 'text-red-500',
                  solutionColor: 'text-emerald-600',
                  problemBg: 'bg-red-50',
                  solutionBg: 'bg-emerald-50',
                },
                {
                  problem: 'Réglementations incompréhensibles & évolutives',
                  problemDesc: 'CSRD, Taxonomie UE, SFDR, SBTi, CSDDD : chaque directive a ses propres indicateurs, seuils et calendriers. Impossible à suivre sans expert dédié.',
                  solution: 'Guides intégrés + mises à jour réglementaires automatiques',
                  solutionDesc: 'Checklists ESRS interactives, assistant IA réglementaire, alertes sur les changements de texte — vous restez conformes sans veille permanente.',
                  problemIcon: AlertTriangle,
                  solutionIcon: CheckCircle,
                  problemColor: 'text-orange-500',
                  solutionColor: 'text-emerald-600',
                  problemBg: 'bg-orange-50',
                  solutionBg: 'bg-emerald-50',
                },
                {
                  problem: 'Auditabilité impossible à garantir',
                  problemDesc: 'Lors d\'un audit ISAE 3000, prouver la traçabilité des données ESG avec un tableur est un exercice périlleux — qui peut coûter la certification.',
                  solution: 'Journal d\'audit horodaté + e-signature SHA-256',
                  solutionDesc: 'Chaque saisie, validation et approbation génère une empreinte cryptographique immuable. Preuve légale recalculable lors de tout audit externe.',
                  problemIcon: AlertTriangle,
                  solutionIcon: CheckCircle,
                  problemColor: 'text-red-500',
                  solutionColor: 'text-emerald-600',
                  problemBg: 'bg-red-50',
                  solutionBg: 'bg-emerald-50',
                },
                {
                  problem: 'Coût prohibitif des solutions enterprise',
                  problemDesc: 'Les plateformes ESG historiques (Workiva, Enablon) commencent à 50 000 €/an. Hors de portée pour les PME et ETI qui représentent 99% du tissu économique européen.',
                  solution: 'Pricing accessible dès 0 € — sans engagement',
                  solutionDesc: 'Plan gratuit fonctionnel, plan PME à partir de 249 €/mois. La conformité ESG ne doit pas être réservée aux grands groupes.',
                  problemIcon: AlertTriangle,
                  solutionIcon: CheckCircle,
                  problemColor: 'text-orange-500',
                  solutionColor: 'text-emerald-600',
                  problemBg: 'bg-orange-50',
                  solutionBg: 'bg-emerald-50',
                },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Problem */}
                  <div className={`${item.problemBg} p-5 border-b border-gray-100`}>
                    <div className="flex items-start gap-3">
                      <item.problemIcon className={`h-5 w-5 ${item.problemColor} flex-shrink-0 mt-0.5`} />
                      <div>
                        <p className={`text-sm font-bold ${item.problemColor} mb-1`}>{t('landing.lp.about.problemLabel', 'Le problème')}</p>
                        <p className="text-sm font-semibold text-gray-800 mb-1">{t(`landing.lp.about.problems.${i}.problem`, item.problem)}</p>
                        <p className="text-xs text-gray-500 leading-relaxed">{t(`landing.lp.about.problems.${i}.problemDesc`, item.problemDesc)}</p>
                      </div>
                    </div>
                  </div>
                  {/* Solution */}
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <item.solutionIcon className={`h-5 w-5 ${item.solutionColor} flex-shrink-0 mt-0.5`} />
                      <div>
                        <p className="text-sm font-bold text-emerald-600 mb-1">{t('landing.lp.about.solutionLabel', 'Notre solution')}</p>
                        <p className="text-sm font-semibold text-gray-800 mb-1">{t(`landing.lp.about.problems.${i}.solution`, item.solution)}</p>
                        <p className="text-xs text-gray-500 leading-relaxed">{t(`landing.lp.about.problems.${i}.solutionDesc`, item.solutionDesc)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Ce qui nous différencie ── */}
          <div>
            <div className="text-center mb-14">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-xs font-semibold uppercase tracking-wide mb-4">
                <Award className="h-3.5 w-3.5" /> {t('landing.lp.about.posEyebrow', 'Notre positionnement')}
              </span>
              <h3 className="text-3xl font-bold text-gray-900">{t('landing.lp.about.posTitle', "Pourquoi ESGFlow plutôt qu'une autre plateforme ?")}</h3>
              <p className="text-gray-500 mt-3 max-w-xl mx-auto">{t('landing.lp.about.posSubtitle', 'Nous ne prétendons pas être les meilleurs sur tout — mais sur ce qui compte pour les équipes RSE européennes, oui.')}</p>
            </div>

            {/* Differentiator cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {[
                {
                  icon: Globe,
                  iconBg: 'bg-blue-600',
                  title: '100% conçu pour l\'Europe',
                  desc: 'Greenly, Sweep et Persefoni sont des outils anglophones adaptés après coup à la réglementation européenne. ESGFlow a été conçu dès le départ pour la CSRD, la Taxonomie UE et SFDR — les textes réglementaires sont intégrés nativement, pas collés en surcouche.',
                  badge: 'vs Greenly / Sweep / Persefoni',
                  badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
                },
                {
                  icon: Layers,
                  iconBg: 'bg-violet-600',
                  title: '22 modules dans une seule plateforme',
                  desc: 'La plupart des concurrents sont mono-fonctionnels : bilan carbone uniquement (Greenly), reporting uniquement (Workiva), risques uniquement (Enablon). ESGFlow couvre le spectre complet : carbone, reporting CSRD, matérialité, SBTi, SFDR, taxonomie, vigilance, bilan d\'audit — sans jongler entre outils.',
                  badge: 'vs Workiva / Enablon',
                  badgeBg: 'bg-violet-50 text-violet-700 border-violet-200',
                },
                {
                  icon: Calculator,
                  iconBg: 'bg-emerald-600',
                  title: 'Accessible aux PME dès 249 €/mois',
                  desc: 'Workiva commence à 50 000 €/an. IBM Envizi demande une implémentation de 6 mois. ESGFlow est opérationnel en 48h, avec un plan gratuit fonctionnel et des tarifs pensés pour les PME et ETI — celles qui ont le plus besoin de se conformer et le moins de ressources pour le faire.',
                  badge: 'vs IBM Envizi / Workiva',
                  badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                },
              ].map((d, i) => (
                <div key={i} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-7 hover:shadow-md transition-shadow flex flex-col">
                  <div className={`w-11 h-11 ${d.iconBg} rounded-2xl flex items-center justify-center mb-5 shadow-sm`}>
                    <d.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className={`inline-flex items-center self-start px-2.5 py-0.5 rounded-full text-[11px] font-semibold border mb-4 ${d.badgeBg}`}>
                    {d.badge}
                  </span>
                  <h4 className="text-lg font-bold text-gray-900 mb-3">{t(`landing.lp.about.diffCards.${i}.title`, d.title)}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed flex-1">{t(`landing.lp.about.diffCards.${i}.desc`, d.desc)}</p>
                </div>
              ))}
            </div>

            {/* Quick comparison strip */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white overflow-x-auto">
              <h4 className="text-lg font-bold text-white mb-6 text-center">{t('landing.lp.about.quickCompareTitle', 'Comparaison rapide')}</h4>
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-slate-400 font-medium pb-3 pr-6">{t('landing.lp.about.criterion', 'Critère')}</th>
                    <th className="text-center pb-3 px-4">
                      <span className="text-emerald-400 font-bold">ESGFlow</span>
                    </th>
                    <th className="text-center pb-3 px-4 text-slate-400 font-medium">Greenly / Sweep</th>
                    <th className="text-center pb-3 px-4 text-slate-400 font-medium">Workiva</th>
                    <th className="text-center pb-3 px-4 text-slate-400 font-medium">Persefoni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    ['Bilan carbone complet', true, true, false, true],
                    ['Reporting CSRD natif', true, false, true, false],
                    ['Taxonomie UE 2020/852', true, false, false, false],
                    ['SFDR (fonds d\'investissement)', true, false, false, false],
                    ['SBTi pre-flight & validation', true, false, false, true],
                    ['Devoir de vigilance (CSDDD)', true, false, false, false],
                    ['Circuit approbation ISAE 3000', true, false, true, false],
                    ['iXBRL / ESEF export', true, false, true, false],
                    ['Hébergement France / RGPD', true, false, false, false],
                    ['Plan gratuit disponible', true, false, false, false],
                    ['Tarif PME < 500 €/mois', true, true, false, false],
                  ].map(([label, ...values], i) => (
                    <tr key={i} className="hover:bg-white/3 transition-colors">
                      <td className="py-3 pr-6 text-slate-300">{t(`landing.lp.about.compareRows.${i}`, label as string)}</td>
                      {(values as boolean[]).map((v, j) => (
                        <td key={j} className="py-3 px-4 text-center">
                          {v
                            ? <span className={j === 0 ? 'text-emerald-400 font-bold' : 'text-emerald-400'}>✓</span>
                            : <span className="text-slate-600">✗</span>
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-green-600 uppercase tracking-widest">{t('landing.lp.faq.eyebrow', 'FAQ')}</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3">{t('landing.lp.faq.title', 'Questions fréquentes')}</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => <FaqItem key={i} q={t(`landing.lp.faq.items.${i}.q`, f.q)} a={t(`landing.lp.faq.items.${i}.a`, f.a)} />)}
          </div>
        </div>
      </section>

      {/* ── Différenciateurs ────────────────────────────────────────────────── */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(16,185,129,0.05) 0%, transparent 60%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-4">
              <span className="w-8 h-px bg-emerald-400 inline-block" />
              {t('landing.lp.differentiators.eyebrow', 'Ce qui nous différencie')}
              <span className="w-8 h-px bg-emerald-400 inline-block" />
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mt-2 mb-4">{t('landing.lp.differentiators.title', "Des fonctionnalités que peu d'outils ESG proposent")}</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">{t('landing.lp.differentiators.subtitle', 'Au-delà du calcul de score, ESGFlow embarque nativement des modules avancés, déjà disponibles dans votre espace.')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: ClipboardList, title: "Piste d'audit SHA-256", desc: "Chaque donnée et chaque modification est chaînée cryptographiquement (SHA-256), pour une assurance ISAE 3000 facilitée.", path: '/features/audit-trail', color: '#374151', light: '#f9fafb' },
              { icon: ShieldAlert, title: 'Plan de vigilance & alerte éthique', desc: "Cartographie des risques, plan d'actions et canal de signalement public conforme à la directive lanceurs d'alerte.", path: '/features/vigilance', color: '#dc2626', light: '#fef2f2' },
              { icon: Building2, title: 'Mode Cabinet multi-clients', desc: 'Pilotez tous vos clients depuis un espace unique, avec isolation stricte des données et comparateur intégré.', path: '/features/cabinet', color: '#4f46e5', light: '#eef2ff' },
              { icon: Code2, title: 'Reporting iXBRL & validation Arelle', desc: 'Générez et validez votre rapport CSRD au format numérique ESEF, prêt pour le dépôt réglementaire.', path: '/features/ixbrl', color: '#0891b2', light: '#ecfeff' },
            ].map(({ icon: Icon, title, desc, path, color, light }, i) => (
              <Link key={path} to={path} className="group p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: light }}>
                  <Icon className="h-6 w-6" style={{ color }} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{t(`landing.lp.differentiators.items.${i}.title`, title)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed flex-1 mb-4">{t(`landing.lp.differentiators.items.${i}.desc`, desc)}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color }}>
                  {t('landing.lp.differentiators.cta', 'Découvrir')}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            ))}
          </div>

          {/* Bandeau VSME */}
          <Link
            to="/normes"
            className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6 rounded-2xl border border-lime-200 bg-lime-50/60 hover:bg-lime-50 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-lime-600 flex items-center justify-center flex-shrink-0">
              <FileCheck className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 mb-1">
                {t('landing.lp.differentiators.vsme.title', 'Nouveau : norme volontaire VSME (EFRAG) incluse')}
                <span className="ml-2 align-middle text-[10px] font-extrabold uppercase tracking-wide bg-lime-600 text-white px-2 py-0.5 rounded-full">{t('landing.lp.differentiators.vsme.badge', 'PME')}</span>
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                {t('landing.lp.differentiators.vsme.desc', "Template prêt à l'emploi couvrant les 11 exigences du Module de Base (B1–B11) : répondez aux demandes ESG de vos banques et donneurs d'ordre sans subir le coût d'un rapport CSRD complet. Et vos données s'exportent vers GRI, CDP et TCFD — 46 indicateurs mappés, 24 séries GRI.")}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-lime-700 flex-shrink-0">
              {t('landing.lp.differentiators.vsme.cta', 'Voir les normes couvertes')}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-28 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-emerald-300 text-sm font-semibold mb-10">
            <Sparkles className="h-4 w-4" />
            {t('landing.lp.cta.badge', '22 modules · 14 jours gratuits · Sans carte bancaire')}
          </div>

          <h2 className="text-4xl lg:text-6xl font-extrabold text-white mb-6 leading-[1.05] tracking-tight">
            {t('landing.lp.cta.titleLine1', 'Votre ESG, enfin')}
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-green-300 to-teal-400 bg-clip-text text-transparent">
              {t('landing.lp.cta.titleLine2', 'sous contrôle total')}
            </span>
          </h2>

          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            {t('landing.lp.cta.subtitle', 'Rejoignez les équipes RSE qui ont remplacé leurs tableurs et leurs silos par une plateforme unique, intelligente et certifiable.')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to="/register">
              <button className="group flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl transition-all shadow-2xl shadow-emerald-500/30 text-base hover:-translate-y-0.5">
                {t('landing.lp.cta.primaryBtn', 'Démarrer gratuitement')}
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link to="/demo">
              <button className="flex items-center gap-2 px-8 py-4 bg-white/8 hover:bg-white/15 border border-white/20 text-white font-semibold rounded-2xl transition-all text-base backdrop-blur-sm">
                <Play className="h-4 w-4 fill-white" /> {t('landing.lp.cta.secondaryBtn', 'Voir la démo interactive')}
              </button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {[
              { icon: Shield, label: 'RGPD conforme', sub: 'Données souveraines' },
              { icon: Globe, label: 'Hébergé en France', sub: 'ISO 27001' },
              { icon: Award, label: 'iXBRL/ESEF', sub: 'EFRAG 2024-12-31' },
              { icon: Lock, label: 'SHA-256', sub: 'Empreintes par entrée' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <item.icon className="h-5 w-5 text-emerald-400" />
                <div className="text-white text-xs font-semibold">{t(`landing.lp.cta.badges.${i}.label`, item.label)}</div>
                <div className="text-slate-400 text-xs">{t(`landing.lp.cta.badges.${i}.sub`, item.sub)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Leaf className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">ESGFlow</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-6">
                {t('landing.lp.footer.tagline', 'La plateforme ESG complète — 22 modules, 100+ indicateurs ESRS, IA intégrée, conformité CSRD certifiable.')}
              </p>
              <div className="flex gap-2.5">
                {[
                  { key: 'in', label: 'LinkedIn', href: 'https://www.linkedin.com/company/esgflow' },
                  { key: 'tw', label: 'Twitter / X', href: 'https://twitter.com/esgflow' },
                  { key: 'yt', label: 'YouTube', href: 'https://www.youtube.com/@esgflow' },
                ].map(s => (
                  <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="w-11 h-11 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center cursor-pointer transition-colors text-slate-400 hover:text-white text-xs font-bold uppercase">{s.key}</a>
                ))}
              </div>
            </div>
            {[
              { title: 'Fonctionnalités', links: [
                  { label: 'Bilan Carbone Scope 3', href: '/features/bilan-carbone' },
                  { label: 'Reporting CSRD / ESRS', href: '/features/csrd-reporting' },
                  { label: 'Plan Décarbonation SBTi', href: '/features/decarbonation' },
                  { label: 'Supply Chain ESG', href: '/features/supply-chain' },
                  { label: 'Double Matérialité', href: '/features/double-materialite' },
                  { label: 'Taxonomie UE', href: '/features/taxonomie-ue' },
                  { label: 'IA & Automatisation', href: '/features/ia-automatisation' },
                  { label: 'Piste d\'Audit', href: '/features/audit-trail' },
              ]},
              { title: 'Solutions', links: [
                  { label: 'PME & ETI', href: '/register' },
                  { label: 'Grands Groupes', href: '/register' },
                  { label: 'Cabinets Conseil', href: '/register' },
                  { label: 'Investisseurs', href: '/register' },
                  { label: 'Voir la démo', href: '/demo' },
              ]},
              { title: 'Ressources', links: [
                  { label: 'Guide CSRD PME', href: '/guide/csrd-pme' },
                  { label: 'Guide Bilan Carbone', href: '/guide/bilan-carbone-entreprise' },
                  { label: 'Guide CSDDD', href: '/guide/csddd-supply-chain' },
                  { label: 'Checklist CSRD', href: '/ressources/checklist-csrd' },
                  { label: 'Centre d\'aide', href: '/help' },
                  { label: 'Support', href: '/support' },
                  { label: 'Tarifs', href: '#tarifs', scroll: 'tarifs' },
              ]},
            ].map((col, ci) => (
              <div key={col.title}>
                <h4 className="font-semibold text-sm mb-4 text-white">{t(`landing.lp.footer.cols.${ci}.title`, col.title)}</h4>
                <ul className="space-y-3 tap-list">
                  {col.links.map((l: any, li: number) => (
                    <li key={l.label}>
                      {l.scroll
                        ? <button onClick={() => scrollTo(l.scroll)} className="text-slate-400 hover:text-white transition-colors text-sm">{t(`landing.lp.footer.cols.${ci}.links.${li}`, l.label as string)}</button>
                        : l.href.startsWith('/') && !l.href.startsWith('/app')
                          ? <Link to={l.href} className="text-slate-400 hover:text-white transition-colors text-sm">{t(`landing.lp.footer.cols.${ci}.links.${li}`, l.label as string)}</Link>
                          : <a href={l.href} className="text-slate-400 hover:text-white transition-colors text-sm">{t(`landing.lp.footer.cols.${ci}.links.${li}`, l.label as string)}</a>
                      }
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">{t('landing.lp.footer.copyright', '© 2026 ESGFlow. Tous droits réservés.')}</p>
            <div className="flex gap-6 text-sm text-slate-500 tap-list">
              <Link to="/legal-notice" className="hover:text-white transition-colors">{t('landing.lp.footer.legalNotice', 'Mentions légales')}</Link>
              <Link to="/privacy-policy" className="hover:text-white transition-colors">{t('landing.lp.footer.privacy', 'Confidentialité')}</Link>
              <Link to="/terms-of-service" className="hover:text-white transition-colors">{t('landing.lp.footer.terms', 'CGU')}</Link>
              <Link to="/privacy-policy" className="hover:text-white transition-colors">{t('landing.lp.footer.cookies', 'Cookies')}</Link>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
