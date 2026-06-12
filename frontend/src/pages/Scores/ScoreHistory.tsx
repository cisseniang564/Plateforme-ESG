/**
 * ScoreHistory — Historique des scores ESG
 * Design professionnel avec : sélecteur d'org, graphiques multi-vues,
 * analyse de tendance, tableau enrichi, export CSV.
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, TrendingUp, TrendingDown, Minus, RefreshCw, Award,
  Leaf, Users, Scale, Target, Calendar, ArrowUpRight,
  Sparkles, ChevronDown, Download, Building2, Filter, Activity,
  CheckCircle, AlertCircle, Info, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import BackButton from '@/components/common/BackButton';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n/config';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoreEntry {
  id: string;
  calculation_date: string;
  overall_score: number;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  grade?: string;
  rating?: string;
  data_completeness?: number;
}

interface Organization { id: string; name: string; industry?: string; }

type Period    = '3m' | '6m' | '1y' | 'all';
type ChartView = 'area' | 'line' | 'bar';
type PillarFilter = 'all' | 'env' | 'soc' | 'gov';

// ─── Constants ────────────────────────────────────────────────────────────────

const PILLAR_COLORS = {
  global: '#6366f1',
  env:    '#16a34a',
  soc:    '#2563eb',
  gov:    '#7c3aed',
};

const GRADE_META: Record<string, { bg: string; text: string; border: string; label: string }> = {
  AAA: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', label: 'AAA' },
  AA:  { bg: 'bg-green-100',   text: 'text-green-700',   border: 'border-green-300',   label: 'AA'  },
  A:   { bg: 'bg-lime-100',    text: 'text-lime-700',    border: 'border-lime-300',    label: 'A'   },
  BBB: { bg: 'bg-yellow-100',  text: 'text-yellow-700',  border: 'border-yellow-300',  label: 'BBB' },
  BB:  { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-300',   label: 'BB'  },
  B:   { bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-300',  label: 'B'   },
  CCC: { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-300',     label: 'CCC' },
  CC:  { bg: 'bg-red-100',     text: 'text-red-800',     border: 'border-red-400',     label: 'CC'  },
  C:   { bg: 'bg-rose-100',    text: 'text-rose-800',    border: 'border-rose-400',    label: 'C'   },
  // Legacy A-F
  A_OLD: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', label: 'A' },
  B_OLD: { bg: 'bg-blue-100',  text: 'text-blue-700',  border: 'border-blue-300',  label: 'B' },
  D:     { bg: 'bg-orange-100',text: 'text-orange-700',border: 'border-orange-300',label: 'D' },
  E:     { bg: 'bg-red-100',   text: 'text-red-700',   border: 'border-red-300',   label: 'E' },
};

function getGradeMeta(g?: string) {
  if (!g) return { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', label: '—' };
  return GRADE_META[g] ?? { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', label: g };
}

function scoreColor(s: number) {
  if (s >= 75) return 'text-emerald-600';
  if (s >= 55) return 'text-lime-600';
  if (s >= 40) return 'text-amber-500';
  return 'text-red-500';
}

function scoreBg(s: number) {
  if (s >= 75) return 'bg-emerald-500';
  if (s >= 55) return 'bg-lime-500';
  if (s >= 40) return 'bg-amber-400';
  return 'bg-red-500';
}

function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
  return new Date(iso + 'T00:00:00').toLocaleDateString(locale,
    opts ?? { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtShort(iso: string) {
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
  return new Date(iso + 'T00:00:00').toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ score, color, size = 80 }: { score: number; color: string; size?: number }) {
  const sw = 7;
  const r  = (size - sw) / 2;
  const c  = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(Math.max(score, 0), 100) / 100);
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  );
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className="h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold w-7 text-right tabular-nums" style={{ color }}>
        {Math.round(value)}
      </span>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-4 text-xs min-w-[160px]">
      <p className="font-semibold text-gray-700 mb-3 text-sm">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1.5">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-bold text-gray-900">{Math.round(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScoreHistory() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Map a logic pillar label → localized display name
  const pillarName = (lbl: string) =>
    lbl === 'Environnement' ? t('sch.env', 'Environnement')
    : lbl === 'Social' ? t('sch.soc', 'Social')
    : t('sch.gov', 'Gouvernance');

  // Data
  const [history,  setHistory]  = useState<ScoreEntry[]>([]);
  const [orgs,     setOrgs]     = useState<Organization[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);

  // Filters
  const [selectedOrg, setSelectedOrg] = useState('');
  const [period,      setPeriod]      = useState<Period>('all');
  const [chartView,   setChartView]   = useState<ChartView>('area');
  const [pillarFilter, setPillarFilter] = useState<PillarFilter>('all');
  const [showAll,     setShowAll]     = useState(false);
  const [showOrgDD,   setShowOrgDD]   = useState(false);

  // Load orgs once
  useEffect(() => {
    api.get('/organizations?limit=200')
      .then(r => setOrgs(r.data?.items ?? r.data?.organizations ?? []))
      .catch(() => {});
  }, []);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (selectedOrg) params.set('organization_id', selectedOrg);
      const r = await api.get(`/scores/history?${params}`);
      const raw: ScoreEntry[] = r.data?.scores ?? [];
      // Sort descending by date
      raw.sort((a, b) => b.calculation_date.localeCompare(a.calculation_date));
      setHistory(raw);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedOrg]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (period === 'all') return history;
    const now = new Date();
    const cutoff = new Date(now);
    if (period === '3m') cutoff.setMonth(now.getMonth() - 3);
    else if (period === '6m') cutoff.setMonth(now.getMonth() - 6);
    else cutoff.setFullYear(now.getFullYear() - 1);
    return history.filter(s => new Date(s.calculation_date) >= cutoff);
  }, [history, period]);

  const latest   = filtered[0]  ?? null;
  const previous = filtered[1]  ?? null;
  const oldest   = filtered[filtered.length - 1] ?? null;

  const totalDelta = (latest && oldest && latest !== oldest)
    ? latest.overall_score - oldest.overall_score : null;
  const avgScore = filtered.length
    ? filtered.reduce((a, s) => a + s.overall_score, 0) / filtered.length : 0;
  const bestEntry  = filtered.reduce<ScoreEntry | null>(
    (b, e) => (!b || e.overall_score > b.overall_score) ? e : b, null);
  const worstEntry = filtered.reduce<ScoreEntry | null>(
    (b, e) => (!b || e.overall_score < b.overall_score) ? e : b, null);

  const deltaLatest = (f: (s: ScoreEntry) => number) =>
    latest && previous ? f(latest) - f(previous) : null;

  const pillars = latest ? [
    { key: 'env', label: t('sch.env', 'Environnement'), value: latest.environmental_score,
      color: PILLAR_COLORS.env,  Icon: Leaf,  delta: deltaLatest(s => s.environmental_score) },
    { key: 'soc', label: t('sch.soc', 'Social'),        value: latest.social_score,
      color: PILLAR_COLORS.soc,  Icon: Users, delta: deltaLatest(s => s.social_score) },
    { key: 'gov', label: t('sch.gov', 'Gouvernance'),   value: latest.governance_score,
      color: PILLAR_COLORS.gov,  Icon: Scale, delta: deltaLatest(s => s.governance_score) },
  ] : [];

  // Chart data — chronological order
  const chartData = [...filtered].reverse().map(s => ({
    date:          fmtShort(s.calculation_date),
    Global:        Math.round(s.overall_score),
    Environnement: Math.round(s.environmental_score),
    Social:        Math.round(s.social_score),
    Gouvernance:   Math.round(s.governance_score),
  }));

  // Pillar bar chart data (latest vs previous)
  const pillarBarData = latest ? [
    { name: 'Env.',                   Actuel: Math.round(latest.environmental_score), Précédent: previous ? Math.round(previous.environmental_score) : null },
    { name: 'Social',                 Actuel: Math.round(latest.social_score),        Précédent: previous ? Math.round(previous.social_score)        : null },
    { name: t('sch.fGov', 'Gouv.'),   Actuel: Math.round(latest.governance_score),    Précédent: previous ? Math.round(previous.governance_score)    : null },
  ] : [];

  // Trend insights
  const trendInsights = useMemo(() => {
    if (!latest || !previous) return [];
    const deltas = [
      { label: 'Environnement', delta: latest.environmental_score - previous.environmental_score, color: PILLAR_COLORS.env },
      { label: 'Social',        delta: latest.social_score        - previous.social_score,        color: PILLAR_COLORS.soc },
      { label: 'Gouvernance',   delta: latest.governance_score    - previous.governance_score,    color: PILLAR_COLORS.gov },
    ];
    return deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [latest, previous]);

  // Visible chart series based on filter
  const activeSeries = useMemo(() => {
    if (pillarFilter === 'all') return ['Global', 'Environnement', 'Social', 'Gouvernance'];
    const map: Record<PillarFilter, string[]> = {
      all: [], env: ['Environnement'], soc: ['Social'], gov: ['Gouvernance'],
    };
    return map[pillarFilter];
  }, [pillarFilter]);

  // ── Export CSV ──────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const header = t('sch.csvHeader', 'Date,Global,Environnement,Social,Gouvernance,Note');
    const rows = filtered.map(s =>
      [fmtDate(s.calculation_date), s.overall_score, s.environmental_score,
       s.social_score, s.governance_score, s.grade ?? s.rating ?? ''].join(',')
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `historique-scores-esg-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Org name helper ─────────────────────────────────────────────────────────
  const orgName = selectedOrg
    ? (orgs.find(o => o.id === selectedOrg)?.name ?? t('sch.organisation', 'Organisation'))
    : t('sch.allOrgs', 'Toutes les organisations');

  const selectedOrgObj = orgs.find(o => o.id === selectedOrg);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading && history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 animate-spin" />
          <BarChart3 className="absolute inset-0 m-auto h-5 w-5 text-indigo-400" />
        </div>
        <p className="text-sm text-gray-400 font-medium">{t('sch.loading', "Chargement de l'historique…")}</p>
      </div>
    );
  }

  const gradeMeta = getGradeMeta(latest?.rating ?? latest?.grade);
  const tableRows = showAll ? filtered : filtered.slice(0, 10);

  return (
    <div className="space-y-5">

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900 p-7 text-white shadow-2xl">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full -translate-y-1/3 translate-x-1/4 blur-3xl" />

        <div className="relative">
          {/* Top row */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <BackButton className="mb-4 text-white/70 hover:text-white" />
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/20 px-3 py-1 text-xs font-semibold text-indigo-300">
                  <Activity size={12} /> {t('sch.badge', 'Historique ESG')}
                </span>
                {latest && (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${gradeMeta.bg} ${gradeMeta.text} ${gradeMeta.border}`}>
                    {gradeMeta.label}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-1 flex items-center gap-2">
                <Award className="h-7 w-7 text-indigo-400" />
                {t('sch.title', 'Évolution des scores ESG')}
              </h1>
              <p className="text-sm text-white/50">
                {orgName} · {t('sch.calcSummary', '{{count}} calcul{{s}} sur la période', { count: filtered.length, s: filtered.length > 1 ? 's' : '' })}
              </p>
            </div>

            {/* Hero stats */}
            {latest && (
              <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                <div className="text-center px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">{t('sch.scoreNow', 'Score actuel')}</p>
                  <p className={`text-3xl font-black ${scoreColor(latest.overall_score)}`}>
                    {Math.round(latest.overall_score)}
                    <span className="text-sm font-normal text-white/40">/100</span>
                  </p>
                </div>
                {totalDelta !== null && (
                  <div className="text-center px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                    <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Progression</p>
                    <p className={`text-3xl font-black ${totalDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {totalDelta >= 0 ? '+' : ''}{Math.round(totalDelta)}
                      <span className="text-sm font-normal text-white/40"> pts</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ══ TOOLBAR — hors du hero pour éviter le clipping overflow-hidden ══ */}
      <div className="flex flex-wrap items-center gap-2 px-1">

        {/* Org selector */}
        <div className="relative">
          <button onClick={() => setShowOrgDD(v => !v)}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-indigo-300 text-gray-700 text-sm font-medium px-3.5 py-2 rounded-xl shadow-sm transition-all hover:shadow">
            <Building2 size={14} className="text-indigo-400" />
            <span className="max-w-[180px] truncate">{orgName}</span>
            <ChevronDown size={13} className={`text-gray-400 transition-transform ${showOrgDD ? 'rotate-180' : ''}`} />
          </button>
          {showOrgDD && (
            <div className="absolute top-full mt-2 left-0 z-[100] w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/60">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('sch.organisation', 'Organisation')}</p>
              </div>
              <button
                onClick={() => { setSelectedOrg(''); setShowOrgDD(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-3 text-sm hover:bg-gray-50 transition-colors ${!selectedOrg ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'}`}>
                <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Building2 size={13} className="text-gray-500" />
                </span>
                {t('sch.allOrgs', 'Toutes les organisations')}
                {!selectedOrg && <CheckCircle size={14} className="ml-auto text-indigo-500 flex-shrink-0" />}
              </button>
              <div className="max-h-56 overflow-y-auto border-t border-gray-100">
                {orgs.map(o => (
                  <button key={o.id}
                    onClick={() => { setSelectedOrg(o.id); setShowOrgDD(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors ${selectedOrg === o.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'}`}>
                    <span className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <Building2 size={13} className="text-indigo-400" />
                    </span>
                    <span className="truncate">{o.name}</span>
                    {selectedOrg === o.id && <CheckCircle size={14} className="ml-auto text-indigo-500 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Period filter */}
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
          {(['3m', '6m', '1y', 'all'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
              {p === 'all' ? t('sch.periodAll', 'Tout') : p === '1y' ? t('sch.period1y', '1 an') : p === '6m' ? t('sch.period6m', '6 mois') : t('sch.period3m', '3 mois')}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button onClick={loadHistory} disabled={loading}
          className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-600 text-sm font-medium px-3.5 py-2 rounded-xl shadow-sm transition-all">
          <RefreshCw size={13} className={loading ? 'animate-spin text-indigo-500' : ''} />
          {t('sch.refresh', 'Actualiser')}
        </button>

        {/* Export — poussé à droite */}
        {filtered.length > 0 && (
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-indigo-300 text-gray-600 hover:text-indigo-600 text-sm font-medium px-3.5 py-2 rounded-xl shadow-sm transition-all ml-auto">
            <Download size={13} />
            Export CSV
          </button>
        )}
      </div>

      {/* Click outside to close org dropdown */}
      {showOrgDD && (
        <div className="fixed inset-0 z-[90]" onClick={() => setShowOrgDD(false)} />
      )}

      {/* ══ CONTENT ═══════════════════════════════════════════════════════════ */}

      {error ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-center py-16">
            <AlertCircle className="h-14 w-14 mx-auto text-red-300 mb-4" />
            <p className="text-lg font-semibold text-gray-900">{t('sch.loadError', 'Erreur de chargement')}</p>
            <p className="text-sm text-gray-500 mt-2">{t('sch.loadErrorDesc', "Impossible de charger l'historique des scores.")}</p>
            <button onClick={loadHistory}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
              <RefreshCw size={14} /> {t('sch.retry', 'Réessayer')}
            </button>
          </div>
        </div>
      ) : !latest ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-5">
              <BarChart3 className="h-10 w-10 text-indigo-400" />
            </div>
            <p className="text-lg font-semibold text-gray-900">{t('sch.noScore', 'Aucun score calculé')}</p>
            <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
              {t('sch.noScoreDesc', "Calculez votre premier score ESG pour voir l'évolution dans le temps.")}
            </p>
            <button onClick={() => navigate('/app/scores/calculate')}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
              <Sparkles size={14} /> {t('sch.calcFirst', 'Calculer mon premier score')}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Pillar cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pillars.map(({ key, label, value, color, Icon, delta }) => (
              <div key={key}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="relative flex-shrink-0">
                  <ScoreRing score={value} color={color} size={80} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black tabular-nums" style={{ color }}>{Math.round(value)}</span>
                    <span className="text-[9px] text-gray-400 font-medium">/100</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon size={13} style={{ color }} />
                    <p className="text-sm font-semibold text-gray-800">{label}</p>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                    <div className="h-1.5 rounded-full transition-all duration-1000"
                      style={{ width: `${value}%`, backgroundColor: color }} />
                  </div>
                  {delta !== null ? (
                    <div className={`flex items-center gap-1 text-xs font-semibold ${
                      delta > 0.5 ? 'text-emerald-600' : delta < -0.5 ? 'text-red-500' : 'text-gray-400'}`}>
                      {delta > 0.5 ? <TrendingUp size={12} /> : delta < -0.5 ? <TrendingDown size={12} /> : <Minus size={12} />}
                      {delta >= 0 ? '+' : ''}{Math.round(delta)} pts
                      <span className="text-gray-400 font-normal">{t('sch.vsPrev', 'vs précédent')}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">{t('sch.firstCalc', 'Premier calcul enregistré')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── KPI summary ──────────────────────────────────────────────── */}
          {filtered.length >= 2 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  label: t('sch.avgScore', 'Score moyen'),
                  value: Math.round(avgScore),
                  sub: t('sch.overCalcs', 'sur {{count}} calculs', { count: filtered.length }),
                  color: 'text-indigo-600', bg: 'from-indigo-50 to-indigo-100/50',
                  border: 'border-indigo-100', Icon: Target,
                  iconBg: 'bg-indigo-100', iconColor: 'text-indigo-500',
                },
                {
                  label: t('sch.bestScore', 'Meilleur score'),
                  value: Math.round(bestEntry?.overall_score ?? 0),
                  sub: bestEntry ? fmtDate(bestEntry.calculation_date, { month: 'short', year: '2-digit' }) : '—',
                  color: 'text-emerald-600', bg: 'from-emerald-50 to-emerald-100/50',
                  border: 'border-emerald-100', Icon: TrendingUp,
                  iconBg: 'bg-emerald-100', iconColor: 'text-emerald-500',
                },
                {
                  label: t('sch.lowestScore', 'Score le plus bas'),
                  value: Math.round(worstEntry?.overall_score ?? 0),
                  sub: worstEntry ? fmtDate(worstEntry.calculation_date, { month: 'short', year: '2-digit' }) : '—',
                  color: 'text-orange-500', bg: 'from-orange-50 to-orange-100/50',
                  border: 'border-orange-100', Icon: TrendingDown,
                  iconBg: 'bg-orange-100', iconColor: 'text-orange-400',
                },
                {
                  label: t('sch.totalProgress', 'Progression totale'),
                  value: totalDelta !== null ? `${totalDelta >= 0 ? '+' : ''}${Math.round(totalDelta)}` : '—',
                  sub: oldest ? t('sch.since', 'depuis {{date}}', { date: fmtDate(oldest.calculation_date, { month: 'short', year: '2-digit' }) }) : '',
                  color: totalDelta !== null && totalDelta >= 0 ? 'text-emerald-600' : 'text-red-500',
                  bg:    totalDelta !== null && totalDelta >= 0 ? 'from-emerald-50 to-emerald-100/50' : 'from-red-50 to-red-100/50',
                  border: totalDelta !== null && totalDelta >= 0 ? 'border-emerald-100' : 'border-red-100',
                  Icon: Sparkles,
                  iconBg: totalDelta !== null && totalDelta >= 0 ? 'bg-emerald-100' : 'bg-red-100',
                  iconColor: totalDelta !== null && totalDelta >= 0 ? 'text-emerald-500' : 'text-red-400',
                },
              ].map(({ label, value, sub, color, bg, border, Icon: Ico, iconBg, iconColor }) => (
                <div key={label}
                  className={`bg-gradient-to-br ${bg} rounded-2xl border ${border} p-4 relative overflow-hidden`}>
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-xs font-medium text-gray-500">{label}</p>
                    <span className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                      <Ico size={13} className={iconColor} />
                    </span>
                  </div>
                  <p className={`text-3xl font-black ${color} tabular-nums`}>{value}</p>
                  <p className="text-xs text-gray-400 mt-1">{sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Main chart ───────────────────────────────────────────────── */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Chart header */}
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-50">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 size={17} className="text-indigo-500" />
                  {t('sch.trendTime', 'Évolution temporelle')}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Pillar filter */}
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {([
                      { id: 'all', label: t('sch.fAll', 'Tous') },
                      { id: 'env', label: 'Env.' },
                      { id: 'soc', label: 'Social' },
                      { id: 'gov', label: t('sch.fGov', 'Gouv.') },
                    ] as { id: PillarFilter; label: string }[]).map(f => (
                      <button key={f.id} onClick={() => setPillarFilter(f.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                          pillarFilter === f.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  {/* Chart type */}
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {([
                      { id: 'area',  icon: '▲' },
                      { id: 'line',  icon: '—' },
                      { id: 'bar',   icon: '▐' },
                    ] as { id: ChartView; icon: string }[]).map(v => (
                      <button key={v.id} onClick={() => setChartView(v.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                          chartView === v.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                        {v.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart body */}
              <div className="px-4 py-4">
                <ResponsiveContainer width="100%" height={320}>
                  {chartView === 'bar' ? (
                    <BarChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                      <ReferenceLine y={50} stroke="#e5e7eb" strokeDasharray="4 4" />
                      {activeSeries.includes('Global')        && <Bar dataKey="Global"        fill={PILLAR_COLORS.global} radius={[4,4,0,0]} maxBarSize={32} />}
                      {activeSeries.includes('Environnement') && <Bar dataKey="Environnement" name={t('sch.env', 'Environnement')} fill={PILLAR_COLORS.env}    radius={[4,4,0,0]} maxBarSize={32} />}
                      {activeSeries.includes('Social')        && <Bar dataKey="Social"        fill={PILLAR_COLORS.soc}    radius={[4,4,0,0]} maxBarSize={32} />}
                      {activeSeries.includes('Gouvernance')   && <Bar dataKey="Gouvernance"   name={t('sch.gov', 'Gouvernance')} fill={PILLAR_COLORS.gov}    radius={[4,4,0,0]} maxBarSize={32} />}
                    </BarChart>
                  ) : chartView === 'line' ? (
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                      <ReferenceLine y={50} stroke="#e5e7eb" strokeDasharray="4 4" label={{ value: '50', position: 'right', fontSize: 10, fill: '#9ca3af' }} />
                      {activeSeries.includes('Global')        && <Line type="monotone" dataKey="Global"        stroke={PILLAR_COLORS.global} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />}
                      {activeSeries.includes('Environnement') && <Line type="monotone" dataKey="Environnement" name={t('sch.env', 'Environnement')} stroke={PILLAR_COLORS.env}    strokeWidth={2}   dot={false} activeDot={{ r: 5 }} />}
                      {activeSeries.includes('Social')        && <Line type="monotone" dataKey="Social"        stroke={PILLAR_COLORS.soc}    strokeWidth={2}   dot={false} activeDot={{ r: 5 }} />}
                      {activeSeries.includes('Gouvernance')   && <Line type="monotone" dataKey="Gouvernance"   name={t('sch.gov', 'Gouvernance')} stroke={PILLAR_COLORS.gov}    strokeWidth={2}   dot={false} activeDot={{ r: 5 }} />}
                    </LineChart>
                  ) : (
                    <AreaChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                      <defs>
                        {Object.entries({ Global: PILLAR_COLORS.global, Environnement: PILLAR_COLORS.env, Social: PILLAR_COLORS.soc, Gouvernance: PILLAR_COLORS.gov })
                          .map(([k, c]) => (
                            <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor={c} stopOpacity={0.18} />
                              <stop offset="95%" stopColor={c} stopOpacity={0.02} />
                            </linearGradient>
                          ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                      <ReferenceLine y={50} stroke="#e5e7eb" strokeDasharray="4 4" label={{ value: '50', position: 'right', fontSize: 10, fill: '#9ca3af' }} />
                      {activeSeries.includes('Global')        && <Area type="monotone" dataKey="Global"        stroke={PILLAR_COLORS.global} fill="url(#g-Global)"        strokeWidth={2.5} dot={chartData.length<=6} activeDot={{ r: 5 }} />}
                      {activeSeries.includes('Environnement') && <Area type="monotone" dataKey="Environnement" name={t('sch.env', 'Environnement')} stroke={PILLAR_COLORS.env}    fill="url(#g-Environnement)" strokeWidth={2}   dot={false}            activeDot={{ r: 4 }} />}
                      {activeSeries.includes('Social')        && <Area type="monotone" dataKey="Social"        stroke={PILLAR_COLORS.soc}    fill="url(#g-Social)"        strokeWidth={2}   dot={false}            activeDot={{ r: 4 }} />}
                      {activeSeries.includes('Gouvernance')   && <Area type="monotone" dataKey="Gouvernance"   name={t('sch.gov', 'Gouvernance')} stroke={PILLAR_COLORS.gov}    fill="url(#g-Gouvernance)"   strokeWidth={2}   dot={false}            activeDot={{ r: 4 }} />}
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Bottom grid : Pillar comparison + Trend ──────────────────── */}
          {previous && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Pillar bar comparison */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Filter size={14} className="text-gray-400" />
                    {t('sch.pillarCompare', 'Comparaison piliers — Actuel vs Précédent')}
                  </h3>
                </div>
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={pillarBarData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 500 }} axisLine={false} tickLine={false} width={44} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Actuel"    name={t('sch.current', 'Actuel')}     fill="#6366f1" radius={[0,4,4,0]} maxBarSize={20} />
                      <Bar dataKey="Précédent" name={t('sch.previous', 'Précédent')} fill="#e5e7eb" radius={[0,4,4,0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Trend analysis */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-400" />
                    {t('sch.trendAnalysis', 'Analyse de tendance')}
                    <span className="text-xs text-gray-400 font-normal">{t('sch.vsPrevCalc', 'vs calcul précédent')}</span>
                  </h3>
                </div>
                <div className="p-5 space-y-3">
                  {trendInsights.map(({ label, delta, color }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-600 w-24 flex-shrink-0">{pillarName(label)}</span>
                      <MiniBar value={latest ? (label === 'Environnement' ? latest.environmental_score : label === 'Social' ? latest.social_score : latest.governance_score) : 0} color={color} />
                      <span className={`text-xs font-bold flex items-center gap-0.5 w-14 flex-shrink-0 ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {delta > 0.5 ? <TrendingUp size={11} /> : delta < -0.5 ? <TrendingDown size={11} /> : <Minus size={11} />}
                        {delta >= 0 ? '+' : ''}{Math.round(delta)}
                      </span>
                    </div>
                  ))}

                  {/* Summary insight */}
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    {(() => {
                      const best = trendInsights[0];
                      if (!best) return null;
                      if (Math.abs(best.delta) < 1) {
                        return (
                          <div className="flex items-start gap-2 text-xs text-gray-500">
                            <Info size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
                            {t('sch.stable', 'Scores stables — aucune variation significative depuis le dernier calcul.')}
                          </div>
                        );
                      }
                      return (
                        <div className={`flex items-start gap-2 text-xs ${best.delta > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {best.delta > 0
                            ? <TrendingUp size={13} className="flex-shrink-0 mt-0.5" />
                            : <TrendingDown size={13} className="flex-shrink-0 mt-0.5" />}
                          <span>
                            <strong>{pillarName(best.label)}</strong>{t('sch.isPillar', ' est le pilier')}
                            {best.delta > 0 ? t('sch.improved', ' le plus en progrès :') : t('sch.declined', ' qui a le plus reculé :')}
                            <strong> {best.delta >= 0 ? '+' : ''}{Math.round(best.delta)} pts</strong>.
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── History table ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Calendar size={15} className="text-gray-400" />
                {t('sch.historyTable', "Tableau de l'historique")}
              </h2>
              <span className="text-xs text-gray-400">{filtered.length} {filtered.length > 1 ? t('sch.entriesWord', 'entrées') : t('sch.entryWord', 'entrée')}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-indigo-500 uppercase tracking-wide">Global</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: PILLAR_COLORS.env }}>Env.</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: PILLAR_COLORS.soc }}>Social</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: PILLAR_COLORS.gov }}>{t('sch.fGov', 'Gouv.')}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Note</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Δ Global</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Progression</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tableRows.map((s, idx) => {
                    const isLatest = idx === 0;
                    const next  = filtered[idx + 1];
                    const delta = next ? s.overall_score - next.overall_score : null;
                    const gMeta = getGradeMeta(s.rating ?? s.grade);
                    return (
                      <tr key={s.id}
                        className={`hover:bg-indigo-50/20 transition-colors ${isLatest ? 'bg-indigo-50/10' : ''}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">{fmtDate(s.calculation_date)}</span>
                            {isLatest && (
                              <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                {t('sch.current', 'Actuel')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`text-xl font-black tabular-nums ${scoreColor(s.overall_score)}`}>
                            {Math.round(s.overall_score)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="font-semibold tabular-nums" style={{ color: PILLAR_COLORS.env }}>
                            {Math.round(s.environmental_score)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="font-semibold tabular-nums" style={{ color: PILLAR_COLORS.soc }}>
                            {Math.round(s.social_score)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="font-semibold tabular-nums" style={{ color: PILLAR_COLORS.gov }}>
                            {Math.round(s.governance_score)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {(s.rating || s.grade) ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${gMeta.bg} ${gMeta.text} ${gMeta.border}`}>
                              {gMeta.label}
                            </span>
                          ) : <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {delta !== null ? (
                            <span className={`inline-flex items-center gap-0.5 text-xs font-bold tabular-nums ${
                              delta > 0.5 ? 'text-emerald-600' : delta < -0.5 ? 'text-red-500' : 'text-gray-400'}`}>
                              {delta > 0.5 ? <TrendingUp size={11} /> : delta < -0.5 ? <TrendingDown size={11} /> : <Minus size={11} />}
                              {delta >= 0 ? '+' : ''}{Math.round(delta)}
                            </span>
                          ) : <span className="text-gray-200 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 min-w-[90px]">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div className="h-1.5 rounded-full transition-all duration-700"
                                style={{ width: `${s.overall_score}%`, backgroundColor: s.overall_score >= 55 ? '#16a34a' : s.overall_score >= 35 ? '#f59e0b' : '#ef4444' }} />
                            </div>
                            <span className="text-[10px] text-gray-400 tabular-nums">{Math.round(s.overall_score)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length > 10 && (
              <div className="px-6 py-3 border-t border-gray-50">
                <button onClick={() => setShowAll(v => !v)}
                  className="w-full text-center text-xs text-gray-400 hover:text-indigo-600 font-medium flex items-center justify-center gap-1 transition-colors py-1">
                  {showAll ? t('sch.collapse', 'Réduire') : t('sch.showNext', 'Voir les {{count}} entrées suivantes', { count: filtered.length - 10 })}
                  <ChevronRight size={12} className={`transition-transform ${showAll ? 'rotate-90' : ''}`} />
                </button>
              </div>
            )}
          </div>

          {/* ── CTA footer ───────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 justify-end">
            <button onClick={exportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-600 text-sm font-semibold rounded-xl transition-all hover:shadow-sm">
              <Download size={14} /> Export CSV
            </button>
            <button onClick={() => navigate('/app/ai-insights')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-indigo-200 text-gray-700 text-sm font-semibold rounded-xl transition-all hover:shadow-sm">
              {t('sch.aiInsights', 'Insights IA')} <ArrowUpRight size={14} />
            </button>
            <button onClick={() => navigate('/app/scores/calculate')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-200 active:scale-[.98]">
              <Sparkles size={14} /> {t('sch.newCalc', 'Nouveau calcul')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
