import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Shield, Zap, Users, FileText, BarChart3,
  CheckCircle, ArrowRight, Sparkles, Award, ChevronDown,
  Brain, Building2, Database, Plus, Minus, Star, Check, X,
  Play, Leaf, Globe, ChevronRight, Truck, ClipboardList,
  FlameKindling, Scale, PackageSearch, ShieldCheck, TrendingDown,
  Flame, Lock, Hash, Target, Layers, Plug, Radio, Link2,
  Table2, PieChart, FileSpreadsheet, Activity, Search, Bell,
  GitMerge, BarChart2, AlertTriangle, BookOpen, Upload, RefreshCw,
  CheckSquare, TrendingUp as Trending, Cpu, MapPin, Code2,
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

// ─── Stat counter ─────────────────────────────────────────────────────────────
function StatCounter({ value, suffix, label, started }: { value: number; suffix: string; label: string; started: boolean }) {
  const count = useCounter(value, 2000, started);
  return (
    <div className="text-center">
      <div className="text-4xl lg:text-5xl font-extrabold text-white tabular-nums">{count}{suffix}</div>
      <div className="text-sm text-green-300 mt-1 font-medium">{label}</div>
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
  },
  {
    id: 'supplychain',
    icon: Truck,
    color: '#2563eb',
    bg: 'bg-blue-500',
    lightBg: 'bg-blue-50',
    lightText: 'text-blue-700',
    name: 'Supply Chain ESG',
    tagline: 'Fournisseurs · Due diligence · Vigilance',
    desc: 'Évaluez vos fournisseurs sur 6 dimensions ESG, envoyez des questionnaires, gérez la due diligence et assurez votre conformité Loi Devoir de Vigilance.',
    badges: ['Scoring 6 dimensions', 'Questionnaires auto', 'Due diligence', 'Loi 2017-399'],
    preview: 'supply',
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
    desc: 'Suivi centralisé de vos obligations : CSRD, Taxonomie UE, DPEF, Loi Sapin II, Devoir de vigilance, SFDR, ISO 14001, ISO 26000, LkSG et Article 29 LEC.',
    badges: ['CSRD & ESRS', 'Loi Sapin II', 'SFDR & ISO', 'Roadmap échéances'],
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
    tagline: 'Traçabilité · SHA-256 · Certifiable',
    desc: 'Journal d\'audit complet et infalsifiable : qui / quand / quoi / où. Versionning avant/après, pièces justificatives, empreintes SHA-256 et export pour auditeurs.',
    badges: ['Journal complet', 'Versionning données', 'Intégrité SHA-256', 'Export ISAE 3000'],
    preview: 'audit',
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
    desc: 'Ingestion automatisee depuis vos systemes : 11 connecteurs natifs ERP, RH, Energie et Carbone. OAuth2, API keys, certificats. Fini la saisie manuelle Excel.',
    badges: ['11 connecteurs natifs', 'OAuth2 & API keys', 'Sync temps reel', 'Monitoring flux'],
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

// ─── Competitive comparison data ──────────────────────────────────────────────
const COMPETITORS = ['ESGFlow', 'Greenly', 'Sweep', 'Tennaxia'];
const COMP_ROWS = [
  { label: 'Dashboard ESG temps réel', values: [true, true, true, true] },
  { label: 'Scope 3 — 15 catégories GHG', values: [true, true, true, false] },
  { label: 'Plan décarbonation + ROI', values: [true, true, false, false] },
  { label: 'Matrice matérialité drag & drop', values: [true, false, true, true] },
  { label: 'Supply Chain ESG & due diligence', values: [true, false, true, true] },
  { label: 'Conformité multi-réglementaire (10)', values: [true, false, false, true] },
  { label: 'Piste d\'audit certifiable ISAE', values: [true, false, true, true] },
  { label: 'Chatbot IA ESG expert', values: [true, true, true, false] },
  { label: 'OCR factures fournisseurs', values: [true, true, false, false] },
  { label: 'Scores ESG automatiques /100', values: [true, true, false, true] },
  { label: 'Workflow validation données', values: [true, false, true, true] },
  { label: 'Analyse ESRS / Gap analysis CSRD', values: [true, false, true, true] },
  { label: 'Taxonomie UE (6 objectifs)', values: [true, false, false, true] },
  { label: 'Benchmarking sectoriel', values: [true, true, true, false] },
  { label: 'Import FEC / Scope 3 comptable', values: [true, false, false, false] },
  { label: 'CSRD Report Builder multi-format', values: [true, false, true, false] },
  { label: 'Mapping GRI / CDP / TCFD / SDG', values: [true, false, true, false] },
  { label: 'Alertes intelligentes personnalisées', values: [true, false, false, false] },
  { label: 'API REST + SSO SAML + Clés API', values: [true, false, true, false] },
  { label: 'Hébergement France + RGPD', values: [true, true, false, false] },
  { label: 'Prix accessible PME (< 500€/mois)', values: [true, true, false, false] },
  { label: 'Connecteurs natifs ERP/RH/Energie (11)', values: [true, false, true, false] },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [scrolled, setScrolled] = useState(false);
  const [activeModule, setActiveModule] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [compVisible, setCompVisible] = useState(false);

  const { ref: heroRef, inView: heroInView } = useInView(0.3);
  const { ref: statsRef, inView: statsInView } = useInView(0.3);
  const { ref: compRef, inView: compInView } = useInView(0.2);

  useEffect(() => { if (compInView) setCompVisible(true); }, [compInView]);
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
      name: 'Starter', desc: 'PME qui débutent leur démarche ESG',
      monthly: 199, annual: 159,
      color: 'border-gray-200', badge: null, badgeStyle: '',
      features: ['5 utilisateurs', '50 indicateurs ESG', 'Dashboard & rapports PDF', 'Import CSV', 'Support email 5j/7'],
      missing: ['IA & Chatbot', 'Supply Chain', 'Piste d\'audit', 'Multi-réglementaire'],
      cta: 'Commencer gratuitement', primary: false,
    },
    {
      name: 'Business', desc: 'ETI et entreprises en croissance',
      monthly: 499, annual: 399,
      color: 'border-green-500', badge: 'Le plus populaire', badgeStyle: 'bg-green-500 text-white',
      features: ['Utilisateurs illimités', '100+ indicateurs ESRS', 'Tous les 22 modules inclus', 'IA & Chatbot ESG', 'Import FEC / Scope 3 comptable', 'Scores ESG automatiques', 'Workflow validation données', 'Analyse ESRS & Gap analysis', 'Taxonomie UE & Benchmarking', 'Supply Chain ESG & due diligence', 'Piste d\'audit ISAE', 'Décarbonation + SBTi', 'Multi-réglementaire (10)', 'Support prioritaire 7j/7'],
      missing: ['White-label', 'SLA 99.9%'],
      cta: 'Essai gratuit 14 jours', primary: true,
    },
    {
      name: 'Enterprise', desc: 'Grands groupes, besoins sur mesure',
      monthly: null, annual: null,
      color: 'border-slate-700', badge: 'Sur mesure', badgeStyle: 'bg-slate-800 text-white',
      features: ['Tout Business inclus', 'White-label & branding', 'SLA garanti 99.9%', 'Intégrations ERP/API', 'Onboarding & formation', 'Account manager dédié', 'Audit conformité annuel', 'Hébergement privé option'],
      missing: [],
      cta: 'Contacter les ventes', primary: false,
    },
  ];

  const faqs = [
    { q: 'Combien de temps pour déployer la plateforme ?', a: 'La mise en service prend 2 à 3 jours ouvrés. Nos équipes assurent l\'onboarding, la configuration des indicateurs et la formation de vos équipes.' },
    { q: 'La plateforme est-elle vraiment conforme CSRD ?', a: 'Oui. ESGFlow intègre l\'ensemble des indicateurs ESRS requis par la CSRD. Nos rapports sont audités par des cabinets spécialisés et notre piste d\'audit est certifiable ISAE 3000.' },
    { q: 'Peut-on importer nos données depuis Excel ou ERP ?', a: 'Absolument. La plateforme accepte les imports CSV/Excel et propose des connecteurs vers les principaux ERP (SAP, Oracle, Sage). Notre API RESTful permet des intégrations sur mesure.' },
    { q: 'Où sont hébergées les données ?', a: 'Toutes les données sont hébergées en France, dans des datacenters certifiés ISO 27001. Nous n\'utilisons aucun cloud américain. La conformité RGPD est garantie contractuellement.' },
    { q: 'Que couvre le module Supply Chain ESG ?', a: 'Le module couvre l\'évaluation des fournisseurs sur 6 dimensions ESG, l\'envoi de questionnaires automatisés, la gestion de la due diligence et le suivi du plan de vigilance conformément à la Loi 2017-399.' },
    { q: 'Y a-t-il un engagement de durée ?', a: 'Non. Les plans Starter et Business sont sans engagement, résiliables à tout moment. Les contrats annuels bénéficient de 20% de réduction.' },
    { q: 'Comment fonctionne l\'import FEC pour le Scope 3 ?', a: 'Exportez votre FEC depuis Sage, Cegid ou Pennylane et importez-le directement dans ESGFlow. La plateforme analyse automatiquement vos comptes 60x/61x/62x et calcule vos émissions Scope 3 par catégorie de dépenses en appliquant les facteurs d\'émission ADEME.' },
    { q: 'Comment fonctionne le Workflow de Validation ?', a: 'Chaque saisie ESG passe par 3 étapes : Brouillon → En révision → Approuvé. Les validateurs peuvent approuver ou rejeter avec un motif. Chaque action est automatiquement enregistrée dans la Piste d\'Audit avec date, utilisateur et contexte.' },
    { q: 'Qu\'est-ce que l\'analyse ESRS / Gap analysis ?', a: 'Ce module compare vos données et processus existants aux 82 exigences des normes ESRS (E1 à G1). Il génère automatiquement une analyse des écarts avec une roadmap priorisée pour atteindre la conformité CSRD.' },
  ];

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
            {[{ key: 'modules', label: 'Modules' }, { key: 'solutions', label: 'Solutions' }].map(({ key, label }) => (
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
                          <div className="text-sm font-semibold text-gray-900">{m.name}</div>
                          <div className="text-xs text-gray-500">{m.tagline}</div>
                        </div>
                      </a>
                    )) : [
                      { icon: Building2, title: 'PME & ETI', desc: 'Solution complète accessible' },
                      { icon: Layers, title: 'Grands Groupes', desc: 'CAC40, SBF120, Enterprise' },
                      { icon: Globe, title: 'Cabinets Conseil', desc: 'Multi-clients, white-label' },
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
            <button onClick={() => scrollTo('comparaison')} className={`px-4 py-2 font-medium transition-colors rounded-lg text-sm ${scrolled ? 'text-gray-700 hover:text-green-600 hover:bg-gray-50' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>Comparatif</button>
            <button onClick={() => scrollTo('tarifs')} className={`px-4 py-2 font-medium transition-colors rounded-lg text-sm ${scrolled ? 'text-gray-700 hover:text-green-600 hover:bg-gray-50' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>Tarifs</button>
            <div className="h-5 w-px bg-gray-300 mx-2" />
            <Link to="/login" className={`px-4 py-2 font-medium transition-colors rounded-lg text-sm ${scrolled ? 'text-gray-700 hover:text-green-600' : 'text-white/90 hover:text-white'}`}>Connexion</Link>
            <Link to="/demo">
              <button className={`ml-1 px-4 py-2 font-semibold rounded-xl transition-all text-sm border ${scrolled ? 'border-green-600 text-green-600 hover:bg-green-50' : 'border-white/40 text-white hover:bg-white/10'}`}>
                Voir la démo
              </button>
            </Link>
            <Link to="/register">
              <button className="ml-1 px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-600/25 text-sm hover:-translate-y-0.5">
                Essai gratuit
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-green-950 to-emerald-900">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-green-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/15 border border-green-500/30 rounded-full text-green-300 text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Plateforme ESG complète — 22 modules intégrés
              <span className="bg-green-500/20 px-2 py-0.5 rounded-full text-xs text-green-400">2026</span>
            </div>

            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white leading-[1.05] tracking-tight">
              Le reporting ESG
              <br />
              <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
                le plus complet
              </span>
            </h1>

            <p className="text-lg text-slate-300 leading-relaxed max-w-lg">
              CSRD · Scope 3 · Import FEC · Scores ESG · CSRD Report Builder · Mapping GRI/CDP/TCFD · Alertes intelligentes · Workflow Validation · Analyse ESRS · Taxonomie UE · Benchmarking · Supply Chain · IA générative · API Developer Portal · Piste d'audit certifiable — tout en une seule plateforme.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link to="/register">
                <button className="group flex items-center gap-2 px-7 py-4 bg-green-500 hover:bg-green-400 text-white font-bold rounded-2xl transition-all shadow-xl shadow-green-500/30 hover:-translate-y-0.5 text-base">
                  Essai gratuit 14 jours
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link to="/demo">
                <button className="flex items-center gap-2 px-7 py-4 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold rounded-2xl transition-all text-base backdrop-blur-sm">
                  <Play className="h-4 w-4 fill-white" /> Démo interactive
                </button>
              </Link>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-400">
              <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
              Aucune carte bancaire · Sans engagement · Hébergé en France
            </div>

            {/* Stats */}
            <div ref={heroRef} className="grid grid-cols-4 gap-4 pt-8 border-t border-white/10">
              <StatCounter value={22} suffix="" label="Modules ESG" started={heroInView} />
              <StatCounter value={100} suffix="+" label="Indicateurs" started={heroInView} />
              <StatCounter value={10} suffix="M+" label="Entreprises INSEE" started={heroInView} />
              <StatCounter value={10} suffix="" label="Référentiels" started={heroInView} />
            </div>
          </div>

          {/* Hero rotating preview */}
          <div className="relative hidden lg:block">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
              {/* Tabs */}
              <div className="flex overflow-x-auto gap-1 p-3 bg-white/5 border-b border-white/10">
                {MODULES.slice(0, 5).map((m, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveModule(i); setAutoPlay(false); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${activeModule === i ? `${m.bg} text-white shadow-sm` : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                  >
                    <m.icon className="h-3.5 w-3.5" />
                    {m.name.split(' ')[0]}
                  </button>
                ))}
              </div>
              {/* Preview */}
              <div className="min-h-[300px] transition-all duration-300">
                {PreviewComp && <PreviewComp />}
              </div>
              {/* Bottom bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border-t border-white/10">
                <div className="flex gap-1 flex-1">
                  {MODULES.map((_, i) => (
                    <div key={i} onClick={() => { setActiveModule(i); setAutoPlay(false); }} className={`h-1 rounded-full flex-1 cursor-pointer transition-all ${i === activeModule ? 'bg-green-400' : 'bg-white/20'}`} />
                  ))}
                </div>
                <button onClick={() => setAutoPlay(a => !a)} className="text-xs text-slate-400 hover:text-white transition-colors ml-2">
                  {autoPlay ? '⏸' : '▶'}
                </button>
              </div>
            </div>
            {/* Floating badges */}
            <div className="absolute -top-5 -right-5 bg-white rounded-2xl p-3 shadow-2xl border border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">CSRD Conforme</div>
                  <div className="text-xs text-gray-500">ESRS 2024</div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 bg-white rounded-2xl p-3 shadow-2xl border border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Lock className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">SHA-256 · ISAE 3000</div>
                  <div className="text-xs text-gray-500">Audit certifiable</div>
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
      <section className="py-14 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-10">Plus de 500 entreprises nous font confiance</p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 mb-12">
            {[
              { name: 'TotalEnergies', color: '#e2001a' },
              { name: 'LVMH', color: '#b5965b' },
              { name: 'Carrefour', color: '#004f9f' },
              { name: 'Renault Group', color: '#efdf00' },
              { name: 'Schneider', color: '#3dcd58' },
              { name: 'Danone', color: '#009fe3' },
              { name: 'Michelin', color: '#003189' },
              { name: 'Veolia', color: '#00aec7' },
            ].map(c => (
              <div key={c.name} className="text-xl font-extrabold transition-all cursor-default select-none" style={{ color: c.color, opacity: 0.22, filter: 'grayscale(1)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0.6'; (e.currentTarget as HTMLDivElement).style.filter = 'grayscale(0)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0.22'; (e.currentTarget as HTMLDivElement).style.filter = 'grayscale(1)'; }}
              >{c.name}</div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { icon: Shield, label: 'RGPD Conforme', sub: 'Hébergé en France' },
              { icon: Award, label: 'CSRD / ESRS 2024', sub: 'Mis à jour en continu' },
              { icon: Lock, label: 'ISO 27001', sub: 'Sécurité certifiée' },
              { icon: Star, label: '4,9 / 5', sub: '200+ avis clients' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-gray-200 bg-gray-50">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4.5 w-4.5 text-green-600" style={{ width: '1.125rem', height: '1.125rem' }} />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{label}</div>
                  <div className="text-xs text-gray-500">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Global stats ─────────────────────────────────────────────────────── */}
      <section ref={statsRef} className="py-16 bg-gradient-to-r from-green-900 to-emerald-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
            <StatCounter value={22} suffix="" label="Modules intégrés" started={statsInView} />
            <StatCounter value={100} suffix="+" label="Indicateurs ESRS" started={statsInView} />
            <StatCounter value={10} suffix="M+" label="Entreprises INSEE" started={statsInView} />
            <StatCounter value={24} suffix="" label="Actions décarbonation" started={statsInView} />
            <StatCounter value={10} suffix="" label="Référentiels réglementaires" started={statsInView} />
            <StatCounter value={500} suffix="+" label="Entreprises clientes" started={statsInView} />
          </div>
        </div>
      </section>

      {/* ── Module explorer ───────────────────────────────────────────────────── */}
      <section id="modules" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-green-600 uppercase tracking-widest">Modules</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">22 modules. Une seule plateforme.</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">Chaque module est conçu pour répondre à un besoin précis — et ils fonctionnent tous ensemble.</p>
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
                    <div className={`text-sm font-bold ${activeModule === i ? 'text-gray-900' : 'text-gray-700'}`}>{m.name}</div>
                    <div className="text-xs text-gray-400 truncate mt-0.5">{m.tagline}</div>
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
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{MODULES[activeModule].name}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{MODULES[activeModule].desc}</p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {MODULES[activeModule].badges.map((b, i) => (
                      <span key={i} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${MODULES[activeModule].lightBg} ${MODULES[activeModule].lightText} border`} style={{ borderColor: MODULES[activeModule].color + '30' }}>
                        ✓ {b}
                      </span>
                    ))}
                  </div>
                  <Link to="/register">
                    <button className={`flex items-center gap-2 px-5 py-2.5 ${MODULES[activeModule].bg} text-white font-semibold rounded-xl text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg`}>
                      Découvrir ce module <ArrowRight className="h-4 w-4" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Competitive comparison ────────────────────────────────────────────── */}
      <section id="comparaison" className="py-24 bg-gray-50" ref={compRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-green-600 uppercase tracking-widest">Comparatif</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">ESGFlow vs la concurrence</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">Une comparaison transparente des fonctionnalités clés avec les principaux acteurs du marché.</p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-5 border-b border-gray-200">
              <div className="col-span-1 p-5 text-sm font-semibold text-gray-500">Fonctionnalité</div>
              {COMPETITORS.map((c, i) => (
                <div key={i} className={`p-5 text-center ${i === 0 ? 'bg-green-50' : ''}`}>
                  <div className={`font-bold text-sm ${i === 0 ? 'text-green-700' : 'text-gray-700'}`}>{c}</div>
                  {i === 0 && <div className="text-xs text-green-500 font-medium mt-0.5">Vous</div>}
                </div>
              ))}
            </div>
            {/* Rows */}
            {COMP_ROWS.map((row, ri) => (
              <div key={ri} className={`grid grid-cols-5 border-b border-gray-100 last:border-0 ${ri % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                <div className="col-span-1 px-5 py-4 text-sm text-gray-700 font-medium flex items-center">{row.label}</div>
                {row.values.map((v, ci) => (
                  <div key={ci} className={`px-5 py-4 flex items-center justify-center transition-all ${ci === 0 ? 'bg-green-50/50' : ''}`}>
                    {compVisible ? (
                      v ? (
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${ci === 0 ? 'bg-green-500' : 'bg-gray-200'}`} style={{ animation: `fadeIn 0.3s ease ${ri * 60}ms both` }}>
                          <Check className={`h-4 w-4 ${ci === 0 ? 'text-white' : 'text-gray-500'}`} />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center" style={{ animation: `fadeIn 0.3s ease ${ri * 60}ms both` }}>
                          <X className="h-4 w-4 text-gray-300" />
                        </div>
                      )
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gray-100 animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Données basées sur les fonctionnalités publiquement documentées au T1 2026. ESGFlow se réserve le droit de mise à jour.
          </p>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-green-600 uppercase tracking-widest">Comment ça marche</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">Opérationnel en 3 étapes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { num: '01', title: 'Connectez vos données', desc: 'Import CSV, API ERP ou saisie manuelle. 100+ indicateurs pré-configurés ESRS vous guident dès le premier jour.', icon: Database, color: 'from-green-500 to-emerald-600' },
              { num: '02', title: 'L\'IA analyse & calcule', desc: 'Notre moteur IA détecte les anomalies, calcule les Scopes 1/2/3, génère vos KPIs et vous alerte en temps réel.', icon: Brain, color: 'from-purple-500 to-pink-500' },
              { num: '03', title: 'Publiez & certifiez', desc: 'Rapports CSRD/GRI/TCFD en 1 clic, piste d\'audit certifiable ISAE 3000, partage sécurisé avec auditeurs.', icon: FileText, color: 'from-blue-500 to-cyan-500' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={`w-14 h-14 bg-gradient-to-br ${s.color} rounded-2xl flex items-center justify-center mb-5 shadow-lg`}>
                  <s.icon className="h-7 w-7 text-white" />
                </div>
                <div className="text-xs font-bold text-green-500 uppercase tracking-widest mb-2">{s.num}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Nouveautés ──────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-sm font-semibold mb-4">
              <Sparkles className="h-4 w-4" /> Nouvelles fonctionnalités 2026
            </span>
            <h2 className="text-4xl font-bold text-white mt-2 mb-4">5 nouveaux modules ajoutés</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">ESGFlow évolue constamment pour vous offrir la couverture ESG la plus complète du marché — désormais 22 modules intégrés.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: FileText, color: 'from-sky-600 to-blue-700', title: 'CSRD Report Builder', desc: 'Construisez votre rapport CSRD section par section (E1→G1), suivez la complétion et exportez en PDF, Word, Excel ou JSON en 1 clic.', badge: 'Nouveau' },
              { icon: GitMerge, color: 'from-teal-500 to-teal-700', title: 'Mapping Multi-Référentiels', desc: 'Saisissez une seule fois et mappez automatiquement vers GRI, CDP, TCFD et SDG. Identifiez les lacunes par référentiel.', badge: 'Nouveau' },
              { icon: Bell, color: 'from-orange-500 to-red-600', title: 'Alertes Intelligentes', desc: 'Créez des alertes personnalisées sur seuils, KPIs et échéances réglementaires avec notifications email et webhook temps réel.', badge: 'Nouveau' },
              { icon: Code2, color: 'from-indigo-500 to-violet-600', title: 'API & Portail Développeur', desc: 'API REST complète avec gestion des clés API, documentation Swagger interactive, OAuth2 et SSO SAML pour les intégrations sur mesure.', badge: 'Nouveau' },
              { icon: Activity, color: 'from-violet-500 to-purple-700', title: 'Qualité des Données', desc: 'Score de complétude par pilier E/S/G, détection d\'anomalies automatique, données manquantes ESRS et recommandations IA.', badge: 'Nouveau' },
              { icon: Upload, color: 'from-cyan-500 to-teal-600', title: 'Import FEC Scope 3', desc: 'Calculez vos émissions Scope 3 directement depuis votre fichier comptable FEC (Sage, Cegid, Pennylane).', badge: 'Populaire' },
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
                Accéder à tous les modules <ArrowRight className="h-5 w-5" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Data Ecosystem ───────────────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-widest">Données & Intégrations</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">Un écosystème de données complet</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Connectez-vous à vos outils, enrichissez vos données avec les sources officielles et automatisez vos flux via webhooks.
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
                    <div className="text-blue-200 text-xs">Base officielle française</div>
                  </div>
                </div>
                <div className="text-3xl font-extrabold mb-1">10M+</div>
                <div className="text-blue-200 text-sm mb-6">entreprises françaises indexées</div>
                <div className="space-y-2.5">
                  {['Recherche par SIREN / SIRET', 'Données légales officielles', 'Activité NAF/APE · Effectifs', 'Enrichissement ESG automatique', 'Gratuit · Temps réel'].map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-blue-100">
                      <CheckCircle className="h-4 w-4 text-blue-300 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-white/20">
                  <div className="flex items-center gap-2 text-xs text-blue-200">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    API officielle · Pas de clé requise
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
                    <h3 className="font-bold text-gray-900">Intégrations disponibles</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Synchronisez vos données avec vos outils BI</p>
                  </div>
                  <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">4 connecteurs</span>
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
                          {int.features.map(f => (
                            <span key={f} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{f}</span>
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
                      Webhooks & Automatisation
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">Notifications temps réel vers vos services</p>
                  </div>
                  <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full border border-violet-200">6 événements</span>
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
                      {f.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────────── */}
      <section id="tarifs" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-green-600 uppercase tracking-widest">Tarifs</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">Plans adaptés à votre taille</h2>
            <p className="text-lg text-gray-500 mb-8">Commencez gratuitement. Évoluez à votre rythme. Sans engagement.</p>
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
              <button onClick={() => setBilling('monthly')} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${billing === 'monthly' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500'}`}>Mensuel</button>
              <button onClick={() => setBilling('annual')} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${billing === 'annual' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500'}`}>
                Annuel <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">-20%</span>
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
                      {plan.badge}
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                    <p className="text-sm text-gray-500">{plan.desc}</p>
                  </div>
                  <div className="mb-8">
                    {price !== null ? (
                      <div className="flex items-end gap-2">
                        <span className="text-5xl font-extrabold text-gray-900">{price}€</span>
                        <span className="text-gray-400 mb-2 text-sm">/mois{billing === 'annual' && <span className="block text-xs text-green-600 font-semibold">facturé annuellement</span>}</span>
                      </div>
                    ) : <div className="text-4xl font-extrabold text-gray-900">Sur devis</div>}
                  </div>
                  <Link to={plan.name === 'Enterprise' ? '/contact' : '/register'} className="block mb-8">
                    <button className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${highlight ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30 hover:-translate-y-0.5' : 'bg-gray-900 hover:bg-gray-800 text-white'}`}>
                      {plan.cta}
                    </button>
                  </Link>
                  <div className="space-y-2.5 flex-1">
                    {plan.features.map((f, j) => (
                      <div key={j} className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{f}</span>
                      </div>
                    ))}
                    {plan.missing.map((f, j) => (
                      <div key={j} className="flex items-start gap-2.5 opacity-35">
                        <X className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-500">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-center text-sm text-gray-400 mt-10">Tous les prix sont HT · TVA applicable · <button onClick={() => scrollTo('faq')} className="text-green-600 hover:underline">Questions fréquentes</button></p>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-green-600 uppercase tracking-widest">Témoignages</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3">Ce que disent nos clients</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Sophie Martineau', role: 'RSE Director, Nexans', text: 'La piste d\'audit certifiable ISAE et le module multi-réglementaire nous ont transformé notre préparation aux audits CSRD. Un gain de temps considérable.', stars: 5, avatar: 'SM', color: 'bg-violet-500' },
              { name: 'Thomas Durand', role: 'CFO, Biocoop', text: 'Le plan de décarbonation avec les scénarios SBTi et les 24 actions ROI nous a permis de construire notre trajectoire Net Zero en quelques jours, contre plusieurs semaines auparavant.', stars: 5, avatar: 'TD', color: 'bg-blue-500' },
              { name: 'Amélie Chen', role: 'Partner ESG, Deloitte France', text: 'Le module Supply Chain ESG avec due diligence est exactement ce que nos clients attendaient pour se mettre en conformité avec la loi Devoir de Vigilance. Excellent.', stars: 5, avatar: 'AC', color: 'bg-emerald-500' },
            ].map((t, i) => (
              <div key={i} className="flex flex-col p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex gap-1 mb-5">{Array.from({ length: t.stars }).map((_, j) => <Star key={j} className="h-4 w-4 text-yellow-400 fill-yellow-400" />)}</div>
                <p className="text-gray-700 text-sm leading-relaxed flex-1 mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-5 border-t border-gray-200">
                  <div className={`w-10 h-10 ${t.color} rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>{t.avatar}</div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-green-600 uppercase tracking-widest">FAQ</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3">Questions fréquentes</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-green-900 via-emerald-800 to-green-950 relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-400/10 rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-green-300 text-sm font-medium mb-8">
            <Sparkles className="h-4 w-4" />
            17 modules · 14 jours d'essai · Sans carte bancaire
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
            Prêt à passer à la vitesse supérieure ?
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
            Rejoignez 500+ entreprises qui pilotent leur ESG, enrichissent leurs données INSEE, automatisent leurs intégrations et leur conformité réglementaire depuis une seule plateforme.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <button className="group flex items-center gap-2 px-8 py-4 bg-white text-green-900 font-bold rounded-2xl hover:bg-gray-50 transition-all shadow-2xl text-base hover:-translate-y-0.5">
                Démarrer gratuitement <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link to="/demo">
              <button className="flex items-center gap-2 px-8 py-4 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 text-white font-semibold rounded-2xl transition-all text-base backdrop-blur-sm">
                <Play className="h-4 w-4 fill-white" /> Voir la démo
              </button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-8 mt-12 pt-8 border-t border-white/10">
            {[{ icon: Shield, label: 'RGPD conforme' }, { icon: Globe, label: 'Hébergé en France' }, { icon: Award, label: 'ISO 27001' }, { icon: Hash, label: 'ISAE 3000' }].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-400 text-sm">
                <item.icon className="h-4 w-4 text-green-400" />{item.label}
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
                La plateforme ESG la plus complète du marché — 17 modules, 100+ indicateurs ESRS, IA intégrée, conformité CSRD garantie.
              </p>
              <div className="flex gap-2.5">
                {[
                  { key: 'in', href: 'https://www.linkedin.com/company/esgflow' },
                  { key: 'tw', href: 'https://twitter.com/esgflow' },
                  { key: 'yt', href: 'https://www.youtube.com/@esgflow' },
                ].map(s => (
                  <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center cursor-pointer transition-colors text-slate-400 hover:text-white text-xs font-bold uppercase">{s.key}</a>
                ))}
              </div>
            </div>
            {[
              { title: 'Modules', links: [
                  { label: 'Bilan Carbone Scope 3', href: '#modules', scroll: 'modules' },
                  { label: 'Plan Décarbonation SBTi', href: '#modules', scroll: 'modules' },
                  { label: 'Scores ESG automatiques', href: '#modules', scroll: 'modules' },
                  { label: 'Workflow Validation', href: '#modules', scroll: 'modules' },
                  { label: 'Analyse ESRS / Gap CSRD', href: '#modules', scroll: 'modules' },
                  { label: 'Taxonomie UE', href: '#modules', scroll: 'modules' },
                  { label: 'Benchmarking Sectoriel', href: '#modules', scroll: 'modules' },
                  { label: 'Supply Chain ESG', href: '#modules', scroll: 'modules' },
                  { label: 'Registre des Risques', href: '#modules', scroll: 'modules' },
                  { label: 'Piste d\'Audit ISAE', href: '#modules', scroll: 'modules' },
              ]},
              { title: 'Solutions', links: [
                  { label: 'PME & ETI', href: '/register' },
                  { label: 'Grands Groupes', href: '/register' },
                  { label: 'Cabinets Conseil', href: '/register' },
                  { label: 'Investisseurs', href: '/register' },
              ]},
              { title: 'Ressources', links: [
                  { label: 'Centre d\'aide', href: '/help' },
                  { label: 'Documentation API', href: '/app/api-docs' },
                  { label: 'Voir la démo', href: '/demo' },
                  { label: 'Support', href: '/support' },
                  { label: 'Tarifs', href: '#tarifs', scroll: 'tarifs' },
              ]},
            ].map(col => (
              <div key={col.title}>
                <h4 className="font-semibold text-sm mb-4 text-white">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((l: any) => (
                    <li key={l.label}>
                      {l.scroll
                        ? <button onClick={() => scrollTo(l.scroll)} className="text-slate-400 hover:text-white transition-colors text-sm">{l.label}</button>
                        : l.href.startsWith('/') && !l.href.startsWith('/app')
                          ? <Link to={l.href} className="text-slate-400 hover:text-white transition-colors text-sm">{l.label}</Link>
                          : <a href={l.href} className="text-slate-400 hover:text-white transition-colors text-sm">{l.label}</a>
                      }
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">© 2026 ESGFlow. Tous droits réservés.</p>
            <div className="flex gap-6 text-sm text-slate-500">
              <Link to="/legal-notice" className="hover:text-white transition-colors">Mentions légales</Link>
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Confidentialité</Link>
              <Link to="/terms-of-service" className="hover:text-white transition-colors">CGU</Link>
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Cookies</Link>
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
