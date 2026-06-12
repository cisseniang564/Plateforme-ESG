import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Shield, Eye, Target, BarChart3, ChevronDown, ChevronUp,
  CheckCircle, AlertTriangle, Clock, Download, Info, Leaf,
  TrendingDown, Zap, Save, RefreshCw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import BackButton from '@/components/common/BackButton';
import api from '@/services/api';
import toast from 'react-hot-toast';

const LS_KEY = 'esgflow_tcfd_responses_v1';

// ─── Types ─────────────────────────────────────────────────────────────────────
type PillarId = 'governance' | 'strategy' | 'risk' | 'metrics';
type Status = 'done' | 'partial' | 'missing';

interface Disclosure {
  id: string;
  code: string;         // e.g. "1a", "2c"
  label: string;
  description: string;
  issb_s1?: string;     // ISSB S1 ref
  issb_s2?: string;     // ISSB S2 ref
  ifrs?: string;        // IFRS S2 ref
  response: string;
  status: Status;
}

interface Pillar {
  id: PillarId;
  label: string;
  icon: any;
  color: string;
  softColor: string;
  borderColor: string;
  description: string;
  disclosures: Disclosure[];
}

// ─── Initial data (factory) ───────────────────────────────────────────────────
const getInitialPillars = (t: TFunction): Pillar[] => [
  {
    id: 'governance',
    label: t('compliance.tcfd.pillar.governance.label', 'Gouvernance'),
    icon: Shield,
    color: '#7c3aed',
    softColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    description: t('compliance.tcfd.pillar.governance.description', "Surveillance et responsabilités du conseil d'administration et de la direction sur les risques et opportunités climatiques."),
    disclosures: [
      {
        id: 'gov-1a', code: '1a',
        label: t('compliance.tcfd.disc.gov-1a.label', "Rôle du conseil d'administration"),
        description: t('compliance.tcfd.disc.gov-1a.description', "Décrire la surveillance exercée par le conseil d'administration sur les risques et opportunités liés au climat, y compris les processus et la fréquence d'information."),
        issb_s1: 'ISSB S1 §14(a)', issb_s2: 'ISSB S2 §6(a)', ifrs: 'IFRS S2 §6',
        response: '', status: 'missing',
      },
      {
        id: 'gov-1b', code: '1b',
        label: t('compliance.tcfd.disc.gov-1b.label', 'Rôle de la direction'),
        description: t('compliance.tcfd.disc.gov-1b.description', "Décrire le rôle de la direction dans l'évaluation et la gestion des risques et opportunités climatiques, y compris les comités dédiés et les mécanismes de remontée d'informations."),
        issb_s1: 'ISSB S1 §14(b)', issb_s2: 'ISSB S2 §6(b)', ifrs: 'IFRS S2 §6',
        response: '', status: 'missing',
      },
    ],
  },
  {
    id: 'strategy',
    label: t('compliance.tcfd.pillar.strategy.label', 'Stratégie'),
    icon: Target,
    color: '#0891b2',
    softColor: '#ecfeff',
    borderColor: '#a5f3fc',
    description: t('compliance.tcfd.pillar.strategy.description', "Impacts effectifs et potentiels des risques et opportunités climatiques sur l'activité, la stratégie et la planification financière de l'entreprise."),
    disclosures: [
      {
        id: 'str-2a', code: '2a',
        label: t('compliance.tcfd.disc.str-2a.label', 'Risques & opportunités identifiés'),
        description: t('compliance.tcfd.disc.str-2a.description', 'Décrire les risques et opportunités climatiques identifiés à court, moyen et long terme. Distinguer risques physiques (aigus, chroniques) et risques de transition (politique, technologique, marché, réputation).'),
        issb_s2: 'ISSB S2 §10', ifrs: 'IFRS S2 §10',
        response: '', status: 'missing',
      },
      {
        id: 'str-2b', code: '2b',
        label: t('compliance.tcfd.disc.str-2b.label', "Impact sur l'activité & la stratégie"),
        description: t('compliance.tcfd.disc.str-2b.description', "Décrire l'impact des risques et opportunités climatiques sur l'activité, le modèle économique et la chaîne de valeur de l'organisation, ainsi que sur sa stratégie et sa planification financière."),
        issb_s2: 'ISSB S2 §13', ifrs: 'IFRS S2 §13',
        response: '', status: 'missing',
      },
      {
        id: 'str-2c', code: '2c',
        label: t('compliance.tcfd.disc.str-2c.label', 'Résilience de la stratégie'),
        description: t('compliance.tcfd.disc.str-2c.description', 'Décrire la résilience de la stratégie en prenant en compte les différents scénarios climatiques (≤2°C, 4°C+). Inclure la période et le(s) scénario(s) utilisé(s).'),
        issb_s1: 'ISSB S1 §22(d)', issb_s2: 'ISSB S2 §22', ifrs: 'IFRS S2 §22',
        response: '', status: 'missing',
      },
    ],
  },
  {
    id: 'risk',
    label: t('compliance.tcfd.pillar.risk.label', 'Gestion des risques'),
    icon: Eye,
    color: '#dc2626',
    softColor: '#fef2f2',
    borderColor: '#fecaca',
    description: t('compliance.tcfd.pillar.risk.description', "Processus utilisés par l'organisation pour identifier, évaluer et gérer les risques climatiques."),
    disclosures: [
      {
        id: 'rsk-3a', code: '3a',
        label: t('compliance.tcfd.disc.rsk-3a.label', 'Identification & évaluation des risques'),
        description: t('compliance.tcfd.disc.rsk-3a.description', "Décrire les processus d'identification et d'évaluation des risques climatiques, y compris les paramètres utilisés pour prioriser ces risques (ex. probabilité, magnitude, horizon temporel)."),
        issb_s1: 'ISSB S1 §25', issb_s2: 'ISSB S2 §25', ifrs: 'IFRS S2 §25',
        response: '', status: 'missing',
      },
      {
        id: 'rsk-3b', code: '3b',
        label: t('compliance.tcfd.disc.rsk-3b.label', 'Gestion des risques climatiques'),
        description: t('compliance.tcfd.disc.rsk-3b.description', "Décrire les processus de gestion des risques climatiques, y compris les décisions sur la mitigation, le transfert, l'acceptation ou le contrôle de ces risques."),
        issb_s1: 'ISSB S1 §25', issb_s2: 'ISSB S2 §25', ifrs: 'IFRS S2 §25',
        response: '', status: 'missing',
      },
      {
        id: 'rsk-3c', code: '3c',
        label: t('compliance.tcfd.disc.rsk-3c.label', 'Intégration dans la gestion globale des risques'),
        description: t('compliance.tcfd.disc.rsk-3c.description', "Décrire comment les processus d'identification, d'évaluation et de gestion des risques climatiques sont intégrés dans la gestion globale des risques de l'entreprise."),
        issb_s2: 'ISSB S2 §25(c)', ifrs: 'IFRS S2 §25',
        response: '', status: 'missing',
      },
    ],
  },
  {
    id: 'metrics',
    label: t('compliance.tcfd.pillar.metrics.label', 'Indicateurs & cibles'),
    icon: BarChart3,
    color: '#059669',
    softColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    description: t('compliance.tcfd.pillar.metrics.description', 'Indicateurs et cibles utilisés pour évaluer et gérer les risques et opportunités climatiques pertinents.'),
    disclosures: [
      {
        id: 'met-4a', code: '4a',
        label: t('compliance.tcfd.disc.met-4a.label', 'Indicateurs climatiques utilisés'),
        description: t('compliance.tcfd.disc.met-4a.description', 'Indiquer les métriques utilisées pour évaluer les risques et opportunités climatiques conformément à la stratégie et au processus de gestion des risques.'),
        issb_s1: 'ISSB S1 §29', issb_s2: 'ISSB S2 §29', ifrs: 'IFRS S2 §29',
        response: '', status: 'missing',
      },
      {
        id: 'met-4b', code: '4b',
        label: t('compliance.tcfd.disc.met-4b.label', 'Émissions GES Scope 1, 2 & 3'),
        description: t('compliance.tcfd.disc.met-4b.description', 'Indiquer les émissions de GES Scope 1, Scope 2 (market-based & location-based) et Scope 3, exprimées en tCO₂e, calculées conformément au GHG Protocol.'),
        issb_s2: 'ISSB S2 §29(a)', ifrs: 'IFRS S2 §29',
        response: '', status: 'missing',
      },
      {
        id: 'met-4c', code: '4c',
        label: t('compliance.tcfd.disc.met-4c.label', 'Cibles climatiques & suivi'),
        description: t('compliance.tcfd.disc.met-4c.description', 'Indiquer les cibles utilisées pour gérer les risques et opportunités climatiques et les performances par rapport à ces cibles, notamment les objectifs de réduction GES.'),
        issb_s1: 'ISSB S1 §33', issb_s2: 'ISSB S2 §33', ifrs: 'IFRS S2 §33',
        response: '', status: 'missing',
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getStatusCfg = (t: TFunction): Record<Status, { label: string; icon: any; color: string; bg: string; border: string }> => ({
  done:    { label: t('compliance.tcfd.status.done', 'Complété'),   icon: CheckCircle,   color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  partial: { label: t('compliance.tcfd.status.partial', 'Partiel'),    icon: AlertTriangle, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  missing: { label: t('compliance.tcfd.status.missing', 'Manquant'),   icon: Clock,         color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
});

function statusOf(response: string): Status {
  const len = response.trim().length;
  if (len === 0) return 'missing';
  if (len < 80) return 'partial';
  return 'done';
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TCFDBuilder() {
  const { t } = useTranslation();

  const INITIAL_PILLARS = getInitialPillars(t);
  const STATUS_CFG = getStatusCfg(t);

  const [pillars, setPillars] = useState<Pillar[]>(() => {
    // Restore from localStorage on mount
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const responses: Record<string, string> = JSON.parse(saved);
        return INITIAL_PILLARS.map(p => ({
          ...p,
          disclosures: p.disclosures.map(d =>
            responses[d.id] !== undefined
              ? { ...d, response: responses[d.id], status: statusOf(responses[d.id]) }
              : d
          ),
        }));
      }
    } catch {/* ignore */}
    return INITIAL_PILLARS;
  });
  const [expandedPillar, setExpandedPillar] = useState<PillarId | null>('governance');
  const [expandedDisc, setExpandedDisc] = useState<string | null>(null);
  const [activeFramework, setActiveFramework] = useState<'tcfd' | 'issb' | 'ifrs'>('tcfd');
  const [saving, setSaving] = useState(false);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const allDisclosures = useMemo(() => pillars.flatMap(p => p.disclosures), [pillars]);
  const totalCount = allDisclosures.length;
  const doneCount = allDisclosures.filter(d => d.status === 'done').length;
  const partialCount = allDisclosures.filter(d => d.status === 'partial').length;
  const missingCount = allDisclosures.filter(d => d.status === 'missing').length;
  const completionPct = totalCount > 0 ? Math.round((doneCount + partialCount * 0.5) / totalCount * 100) : 0;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const updateResponse = (pillarId: PillarId, discId: string, text: string) => {
    setPillars(prev => {
      const next = prev.map(p =>
        p.id === pillarId
          ? {
              ...p,
              disclosures: p.disclosures.map(d =>
                d.id === discId ? { ...d, response: text, status: statusOf(text) } : d
              ),
            }
          : p
      );
      // Auto-save to localStorage on each keystroke
      try {
        const responses: Record<string, string> = {};
        next.forEach(p => p.disclosures.forEach(d => { responses[d.id] = d.response; }));
        localStorage.setItem(LS_KEY, JSON.stringify(responses));
      } catch {/* ignore */}
      return next;
    });
  };

  const saveToAPI = useCallback(async () => {
    setSaving(true);
    try {
      const responses: Record<string, string> = {};
      pillars.forEach(p => p.disclosures.forEach(d => { responses[d.id] = d.response; }));
      await api.post('/compliance/tcfd', {
        framework: activeFramework,
        year: new Date().getFullYear(),
        responses,
      });
      toast.success(t('compliance.tcfd.toastSaved', 'Divulgations TCFD sauvegardées'));
    } catch {
      // Backend endpoint may not exist yet — silently fall back to localStorage
      toast.success(t('compliance.tcfd.toastSavedLocal', 'Sauvegardé localement (synchronisation cloud bientôt disponible)'));
    } finally {
      setSaving(false);
    }
  }, [pillars, activeFramework]);

  const exportMarkdown = () => {
    const fw = activeFramework.toUpperCase();
    let md = `# ${fw} Climate Disclosure Report\n\nGenerated: ${new Date().toLocaleDateString('fr-FR')}\n\n`;
    pillars.forEach(p => {
      md += `## ${p.label}\n\n`;
      p.disclosures.forEach(d => {
        md += `### ${d.code.toUpperCase()}. ${d.label}\n`;
        if (activeFramework === 'issb' && d.issb_s2) md += `*${d.issb_s2}*\n\n`;
        if (activeFramework === 'ifrs' && d.ifrs) md += `*${d.ifrs}*\n\n`;
        md += d.response || t('compliance.tcfd.notFilled', '*Non renseigné*');
        md += '\n\n';
      });
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fw}-disclosure-${new Date().getFullYear()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-2xl p-6 max-w-6xl mx-auto space-y-6 shadow-xl"
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #0b1220 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl shadow-xl"
        style={{ background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 40%, #0284c7 70%, #0ea5e9 100%)' }}>
        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 80% 10%, rgba(255,255,255,0.12) 0%, transparent 55%)' }} />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="tcfddots" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="14" cy="14" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tcfddots)" />
          </svg>
        </div>

        <div className="relative px-8 py-7">
          <BackButton to="/app/compliance" label={t('compliance.tcfd.backLabel', 'Conformité')} className="mb-4 text-white/70 hover:text-white" />

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Left */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">TCFD / ISSB / IFRS S2 Builder</h1>
              </div>
              <p className="text-sky-200 text-sm ml-1 mb-5">
                {t('compliance.tcfd.heroSubtitle', 'Construisez votre rapport climatique aligné TCFD · ISSB S1&S2 · IFRS S2')}
              </p>

              {/* Stat pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: t('compliance.tcfd.pillCompleted', '{{done}}/{{total}} complétés', { done: doneCount, total: totalCount }), bg: doneCount > 0 ? '#bae6fd' : 'rgba(255,255,255,0.15)', text: doneCount > 0 ? '#0c4a6e' : 'white' },
                  { label: t('compliance.tcfd.pillProgress', '{{pct}}% avancement', { pct: completionPct }), bg: 'rgba(255,255,255,0.15)', text: 'white' },
                  { label: 'TCFD 2017 · ISSB 2023 · IFRS S2', bg: 'rgba(255,255,255,0.12)', text: 'white' },
                ].map(p => (
                  <div key={p.label} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: p.bg, color: p.text }}>
                    {p.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right */}
            <div className="flex flex-col gap-3 shrink-0">
              {/* Framework selector */}
              <div className="flex gap-1 bg-white/10 border border-white/20 rounded-xl p-1">
                {(['tcfd', 'issb', 'ifrs'] as const).map(fw => (
                  <button key={fw} onClick={() => setActiveFramework(fw)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all uppercase tracking-wide ${
                      activeFramework === fw ? 'bg-white text-sky-900 shadow' : 'text-white/80 hover:bg-white/10'
                    }`}>
                    {fw === 'issb' ? 'ISSB S1/S2' : fw.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={saveToAPI} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60"
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.35)' }}>
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t('compliance.tcfd.save', 'Sauvegarder')}
                </button>
                <button onClick={exportMarkdown}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <Download className="h-4 w-4" />
                  {t('compliance.tcfd.export', 'Exporter')}
                </button>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-sky-200 mb-1.5">
              <span>{t('compliance.tcfd.globalProgress', 'Avancement global du rapport')}</span>
              <span className="font-bold text-white">{completionPct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/20">
              <div className="h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${completionPct}%`, background: 'linear-gradient(90deg, #38bdf8, #7dd3fc)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Framework banner ──────────────────────────────────────────────── */}
      <div className="rounded-xl p-4 flex flex-wrap items-center gap-4"
        style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
        <Info className="h-5 w-5 flex-shrink-0" style={{ color: '#0284c7' }} />
        <div className="text-sm" style={{ color: '#0c4a6e' }}>
          {activeFramework === 'tcfd' && (
            <><strong>TCFD (2017) :</strong> {t('compliance.tcfd.bannerTcfd', "Cadre volontaire recommandé par le G20. 11 divulgations réparties en 4 piliers. Intégré dans ISSB S2 et IFRS S2.")}</>
          )}
          {activeFramework === 'issb' && (
            <><strong>ISSB S1 &amp; S2 (2023) :</strong> {t('compliance.tcfd.bannerIssb', "Standards IFRS Foundation pour les informations financières liées à la durabilité (S1) et au climat (S2). Obligatoires dans plusieurs juridictions dès 2025.")}</>
          )}
          {activeFramework === 'ifrs' && (
            <><strong>IFRS S2 (2023) :</strong> {t('compliance.tcfd.bannerIfrs', "Standard IFRS dédié aux divulgations climatiques, aligné TCFD. Exige l'analyse de scénarios, les émissions GES Scope 1+2+3, et les cibles climatiques.")}</>
          )}
        </div>
        <div className="ml-auto flex gap-3 text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-full" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            ✓ {t('compliance.tcfd.badgeDone', '{{n}} complétés', { n: doneCount })}
          </span>
          <span className="px-2.5 py-1 rounded-full" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            ~ {t('compliance.tcfd.badgePartial', '{{n}} partiels', { n: partialCount })}
          </span>
          <span className="px-2.5 py-1 rounded-full" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
            ✗ {t('compliance.tcfd.badgeMissing', '{{n}} manquants', { n: missingCount })}
          </span>
        </div>
      </div>

      {/* ── ISSB/IFRS cross-reference note ────────────────────────────────── */}
      {activeFramework !== 'tcfd' && (
        <div className="rounded-xl p-4 flex items-start gap-3"
          style={{ backgroundColor: '#faf5ff', border: '1px solid #e9d5ff' }}>
          <Zap className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#7c3aed' }} />
          <p className="text-sm" style={{ color: '#5b21b6' }}>
            {activeFramework === 'issb'
              ? t('compliance.tcfd.crossRefIssb', 'Les exigences ISSB S2 sont intégralement reprises ci-dessous. Chaque divulgation indique la référence de paragraphe ISSB correspondante.')
              : t('compliance.tcfd.crossRefIfrs', "Les paragraphes IFRS S2 sont indiqués pour chaque divulgation. L'IFRS S2 est substantiellement aligné avec ISSB S2 et couvre les mêmes 4 piliers TCFD.")}
          </p>
        </div>
      )}

      {/* ── Pillars ───────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {pillars.map(pillar => {
          const Icon = pillar.icon;
          const isOpen = expandedPillar === pillar.id;
          const pillarDone = pillar.disclosures.filter(d => d.status === 'done').length;
          const pillarTotal = pillar.disclosures.length;
          const pillarPct = Math.round(pillarDone / pillarTotal * 100);

          return (
            <div key={pillar.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden"
              style={{ borderColor: isOpen ? pillar.borderColor : '#f3f4f6' }}>

              {/* Pillar header */}
              <button
                className="w-full flex items-center gap-4 p-5 text-left transition-colors hover:bg-gray-50/50"
                onClick={() => setExpandedPillar(isOpen ? null : pillar.id)}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: pillar.softColor }}>
                  <Icon className="h-6 w-6" style={{ color: pillar.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-gray-900">{pillar.label}</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: pillar.softColor, color: pillar.color }}>
                      {pillarDone}/{pillarTotal}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{pillar.description}</p>
                  {/* mini bar */}
                  <div className="mt-2 h-1.5 rounded-full max-w-[200px]" style={{ backgroundColor: '#f3f4f6' }}>
                    <div className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${pillarPct}%`, backgroundColor: pillar.color }} />
                  </div>
                </div>
                <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: pillar.color }}>
                  {pillarPct}%
                </span>
                {isOpen
                  ? <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  : <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />}
              </button>

              {/* Disclosures */}
              {isOpen && (
                <div className="border-t space-y-0" style={{ borderColor: pillar.borderColor }}>
                  {pillar.disclosures.map(disc => {
                    const isDiscOpen = expandedDisc === disc.id;
                    const StatusIcon = STATUS_CFG[disc.status].icon;
                    const sCfg = STATUS_CFG[disc.status];
                    const ref = activeFramework === 'issb'
                      ? (disc.issb_s2 || disc.issb_s1 || '—')
                      : activeFramework === 'ifrs'
                        ? (disc.ifrs || '—')
                        : `TCFD ${disc.code.toUpperCase()}`;

                    return (
                      <div key={disc.id}
                        className="border-b last:border-b-0"
                        style={{ borderColor: '#f9fafb' }}>
                        {/* Disclosure header */}
                        <button
                          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
                          onClick={() => setExpandedDisc(isDiscOpen ? null : disc.id)}>
                          <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: sCfg.bg, color: sCfg.color }}>
                            {disc.code}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-900">{disc.label}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: sCfg.bg, color: sCfg.color }}>
                                {sCfg.label}
                              </span>
                              {ref !== '—' && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                  style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                                  {ref}
                                </span>
                              )}
                            </div>
                          </div>
                          <StatusIcon className="h-4 w-4 flex-shrink-0" style={{ color: sCfg.color }} />
                          {isDiscOpen
                            ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                        </button>

                        {/* Disclosure editor */}
                        {isDiscOpen && (
                          <div className="px-5 pb-5 space-y-4"
                            style={{ backgroundColor: '#fafafa', borderTop: `1px solid ${pillar.borderColor}` }}>
                            <p className="text-sm text-gray-600 leading-relaxed pt-4">
                              {disc.description}
                            </p>

                            {/* Cross-refs */}
                            <div className="flex flex-wrap gap-2">
                              {disc.issb_s1 && (
                                <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                                  style={{ backgroundColor: '#faf5ff', color: '#7c3aed', border: '1px solid #e9d5ff' }}>
                                  {disc.issb_s1}
                                </span>
                              )}
                              {disc.issb_s2 && (
                                <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                                  style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                                  {disc.issb_s2}
                                </span>
                              )}
                              {disc.ifrs && (
                                <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                                  style={{ backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                                  {disc.ifrs}
                                </span>
                              )}
                            </div>

                            {/* Response textarea */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {t('compliance.tcfd.responseLabel', 'Réponse de divulgation')}
                              </label>
                              <textarea
                                rows={6}
                                placeholder={t('compliance.tcfd.responsePlaceholder', 'Rédigez votre divulgation ici (min. 80 caractères pour valider)…')}
                                value={disc.response}
                                onChange={e => updateResponse(pillar.id, disc.id, e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                                style={{ '--tw-ring-color': pillar.color } as any}
                              />
                              <div className="flex justify-between mt-1">
                                <span className="text-xs text-gray-400">
                                  {t('compliance.tcfd.charCount', '{{n}} caractères', { n: disc.response.length })}
                                  {disc.response.length > 0 && disc.response.length < 80 && (
                                    <span style={{ color: '#d97706' }}>{t('compliance.tcfd.charPartial', ' — partiel (<80 car.)')}</span>
                                  )}
                                  {disc.response.length >= 80 && (
                                    <span style={{ color: '#059669' }}>{t('compliance.tcfd.charComplete', ' — complet ✓')}</span>
                                  )}
                                </span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: sCfg.bg, color: sCfg.color }}>
                                  {sCfg.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer: completion summary ─────────────────────────────────────── */}
      <div className="rounded-2xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #0c4a6e, #0284c7)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Leaf className="h-5 w-5 text-sky-300" />
              <p className="text-sky-300 text-sm font-medium">{t('compliance.tcfd.footerReport', 'Rapport {{fw}} — Exercice {{year}}', { fw: activeFramework.toUpperCase(), year: new Date().getFullYear() })}</p>
            </div>
            <p className="text-4xl font-bold tabular-nums">
              {completionPct}% <span className="text-xl text-sky-300">{t('compliance.tcfd.footerCompleted', 'complété')}</span>
            </p>
            <p className="text-sky-400 text-sm mt-1">
              {t('compliance.tcfd.footerValidated', '{{n}} divulgation(s) validée(s)', { n: doneCount })}
              {partialCount > 0 && ` · ${t('compliance.tcfd.footerPartial', '{{n}} partielle(s)', { n: partialCount })}`}
              {missingCount > 0 && ` · ${t('compliance.tcfd.footerMissing', '{{n}} manquante(s)', { n: missingCount })}`}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2">
              <button onClick={saveToAPI} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
                style={{ backgroundColor: '#0ea5e9', color: 'white' }}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? t('compliance.tcfd.saving', 'Sauvegarde…') : t('compliance.tcfd.save', 'Sauvegarder')}
              </button>
              <button onClick={exportMarkdown}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.25)' }}>
                <Download className="h-4 w-4" />
                {t('compliance.tcfd.exportMarkdown', 'Exporter Markdown')}
              </button>
            </div>
            {missingCount > 0 && (
              <p className="text-xs text-sky-300 text-center">
                {t('compliance.tcfd.toComplete', '{{n}} divulgation(s) à compléter', { n: missingCount })}
              </p>
            )}
          </div>
        </div>

        {/* overall progress bar */}
        <div className="mt-5">
          <div className="h-2 rounded-full bg-white/20">
            <div className="h-2 rounded-full transition-all duration-700"
              style={{ width: `${completionPct}%`, background: 'linear-gradient(90deg, #38bdf8, #7dd3fc)' }} />
          </div>
          <div className="flex justify-between text-xs text-sky-400 mt-1.5">
            <span>0%</span>
            <span>{t('compliance.tcfd.goal', 'Objectif : 100%')}</span>
          </div>
        </div>

        {/* TCFD/IFRS alignment notes */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { fw: 'TCFD', note: t('compliance.tcfd.noteTcfd', '11 divulgations — G20 · FSB · Banque de France'), color: '#7dd3fc' },
            { fw: 'ISSB S1/S2', note: t('compliance.tcfd.noteIssb', 'Standard IFRS Foundation — Obligatoire 2025+'), color: '#86efac' },
            { fw: 'IFRS S2', note: t('compliance.tcfd.noteIfrs', 'Paragraphes §6–§33 — 4 piliers TCFD intégrés'), color: '#c4b5fd' },
          ].map(item => (
            <div key={item.fw} className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <p className="text-xs font-bold" style={{ color: item.color }}>{item.fw}</p>
              <p className="text-xs text-sky-300 mt-0.5">{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
