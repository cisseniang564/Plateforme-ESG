import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Shield, Zap, Users, FileText, BarChart3,
  CheckCircle, ArrowRight, Sparkles, Award, ChevronDown,
  Brain, Building2, Database, Plus, Minus, Star, Check, X,
  Play, Leaf, Globe, ChevronRight, Truck, ClipboardList,
  FlameKindling, Scale, PackageSearch, ShieldCheck, TrendingDown,
  Flame, Lock, Hash, Target, Layers, Plug,
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
      features: ['Utilisateurs illimités', '100+ indicateurs ESRS', 'Tous les modules inclus', 'IA & Chatbot ESG', 'Supply Chain ESG', 'Piste d\'audit ISAE', 'Décarbonation + SBTi', 'Multi-réglementaire (10)', 'Support prioritaire 7j/7'],
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
                      <a key={i} href="#modules" onClick={() => { setActiveModule(i); setAutoPlay(false); }} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
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
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                          <s.icon className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{s.title}</div>
                          <div className="text-xs text-gray-500">{s.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <a href="#comparaison" className={`px-4 py-2 font-medium transition-colors rounded-lg text-sm ${scrolled ? 'text-gray-700 hover:text-green-600 hover:bg-gray-50' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>Comparatif</a>
            <a href="#tarifs" className={`px-4 py-2 font-medium transition-colors rounded-lg text-sm ${scrolled ? 'text-gray-700 hover:text-green-600 hover:bg-gray-50' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>Tarifs</a>
            <div className="h-5 w-px bg-gray-300 mx-2" />
            <Link to="/login" className={`px-4 py-2 font-medium transition-colors rounded-lg text-sm ${scrolled ? 'text-gray-700 hover:text-green-600' : 'text-white/90 hover:text-white'}`}>Connexion</Link>
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
              Plateforme ESG complète — 9 modules intégrés
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
              CSRD · Scope 3 · Décarbonation SBTi · Supply Chain · IA générative · Piste d'audit certifiable · 10 référentiels réglementaires — tout en une seule plateforme.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link to="/register">
                <button className="group flex items-center gap-2 px-7 py-4 bg-green-500 hover:bg-green-400 text-white font-bold rounded-2xl transition-all shadow-xl shadow-green-500/30 hover:-translate-y-0.5 text-base">
                  Essai gratuit 14 jours
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <a href="#modules">
                <button className="flex items-center gap-2 px-7 py-4 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold rounded-2xl transition-all text-base backdrop-blur-sm">
                  <Play className="h-4 w-4" /> Voir les modules
                </button>
              </a>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-400">
              <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
              Aucune carte bancaire · Sans engagement · Hébergé en France
            </div>

            {/* Stats */}
            <div ref={heroRef} className="grid grid-cols-4 gap-4 pt-8 border-t border-white/10">
              <StatCounter value={9} suffix="" label="Modules ESG" started={heroInView} />
              <StatCounter value={100} suffix="+" label="Indicateurs" started={heroInView} />
              <StatCounter value={24} suffix="" label="Actions décarb." started={heroInView} />
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
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">Ils nous font confiance</p>
          <div className="flex flex-wrap justify-center items-center gap-x-14 gap-y-4">
            {['TotalEnergies', 'LVMH', 'Carrefour', 'Renault Group', 'Schneider Electric', 'Danone'].map(c => (
              <div key={c} className="text-xl font-bold text-gray-200 hover:text-gray-400 transition-colors cursor-default">{c}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Global stats ─────────────────────────────────────────────────────── */}
      <section ref={statsRef} className="py-16 bg-gradient-to-r from-green-900 to-emerald-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
            <StatCounter value={9} suffix="" label="Modules intégrés" started={statsInView} />
            <StatCounter value={100} suffix="+" label="Indicateurs ESRS" started={statsInView} />
            <StatCounter value={15} suffix="" label="Catégories Scope 3" started={statsInView} />
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
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">9 modules. Une seule plateforme.</h2>
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
          <p className="text-center text-sm text-gray-400 mt-10">Tous les prix sont HT · TVA applicable · <a href="#faq" className="text-green-600 hover:underline">Questions fréquentes</a></p>
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
            9 modules · 14 jours d'essai · Sans carte bancaire
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
            Prêt à passer à la vitesse supérieure ?
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
            Rejoignez 500+ entreprises qui pilotent leur ESG, leur décarbonation et leur conformité réglementaire depuis une seule plateforme.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <button className="group flex items-center gap-2 px-8 py-4 bg-white text-green-900 font-bold rounded-2xl hover:bg-gray-50 transition-all shadow-2xl text-base hover:-translate-y-0.5">
                Démarrer gratuitement <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link to="/login">
              <button className="flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold rounded-2xl transition-all text-base backdrop-blur-sm">
                Se connecter
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
                La plateforme ESG la plus complète du marché — 9 modules, 100+ indicateurs, IA intégrée, conformité CSRD garantie.
              </p>
              <div className="flex gap-2.5">
                {['in', 'tw', 'yt'].map(s => (
                  <div key={s} className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center cursor-pointer transition-colors text-slate-400 hover:text-white text-xs font-bold uppercase">{s}</div>
                ))}
              </div>
            </div>
            {[
              { title: 'Modules', links: ['Bilan Carbone Scope 3', 'Plan Décarbonation', 'Supply Chain ESG', 'Multi-Réglementaire', 'Piste d\'Audit', 'IA & Automatisation'] },
              { title: 'Solutions', links: ['PME & ETI', 'Grands Groupes', 'Cabinets Conseil', 'Investisseurs'] },
              { title: 'Entreprise', links: ['À propos', 'Blog ESG', 'Carrières', 'Contact', 'Support'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="font-semibold text-sm mb-4 text-white">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map(l => <li key={l}><a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">{l}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">© 2026 ESGFlow. Tous droits réservés.</p>
            <div className="flex gap-6 text-sm text-slate-500">
              <Link to="/legal-notice" className="hover:text-white transition-colors">Mentions légales</Link>
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Confidentialité</Link>
              <Link to="/terms-of-service" className="hover:text-white transition-colors">CGV</Link>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
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
