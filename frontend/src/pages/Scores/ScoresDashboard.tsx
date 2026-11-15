import { Badge, Button, ConfirmDialog, EmptyState } from '@/components/common';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  Award,
  BarChart3,
  Download,
  AlertCircle,
  ChevronRight,
  Info,
  Leaf,
  Users,
  Scale,
  Clock,
  ChevronDown,
  Target,
  TrendingUp,
} from 'lucide-react';
import ScoreMethodology from '@/components/ESG/ScoreMethodology';
import { useESGScoring } from '@/hooks/useESGScoring';
import toast from 'react-hot-toast';

/** Objectif de score affiché comme repère sur les barres. */
const TARGET = 75;

const PILLAR_STYLE = {
  env: { fill: '#10b981', text: '#047857', route: 'environmental', icon: Leaf },
  soc: { fill: '#3b82f6', text: '#1d4ed8', route: 'social', icon: Users },
  gov: { fill: '#8b5cf6', text: '#6d28d9', route: 'governance', icon: Scale },
} as const;

/* ── Barre fine animée une fois (rien si l'utilisateur réduit les mouvements) ── */
function Meter({ pct, color, label, target }: { pct: number; color: string; label: string; target?: number }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); }, []);
  return (
    <div className="relative h-2 rounded-full bg-gray-100" role="img" aria-label={label}>
      <div className="h-2 rounded-full motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
        style={{ width: shown ? `${Math.max(0, Math.min(pct, 100))}%` : '0%', background: color }} />
      {target !== undefined && (
        <span className="absolute -top-1 h-4 w-0.5 rounded-full bg-gray-400" style={{ left: `calc(${target}% - 1px)` }} aria-hidden="true" />
      )}
    </div>
  );
}

/* ── Couleur des notes : du vert (AAA) au rouge (C) ───────────────────── */
const RATING_COLOR: Record<string, string> = {
  AAA: '#047857', AA: '#10b981', A: '#6ee7b7',
  BBB: '#3b82f6', BB: '#60a5fa', B: '#93c5fd',
  CCC: '#f59e0b', CC: '#f97316', C: '#ef4444',
};
const ratingColor = (r: string) => RATING_COLOR[r] ?? '#9ca3af';
const ratingTone = (r: string) =>
  (r?.startsWith('A') ? 'success' : r?.startsWith('B') ? 'info' : r?.startsWith('C') ? 'warning' : 'neutral') as 'success' | 'info' | 'warning' | 'neutral';

/* ── Confirm Modal ──────────────────────────────────────────────────────── */
function ConfirmModal({
  open, message, onConfirm, onCancel,
}: { open: boolean; message: string; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      isOpen={open}
      title={t('common.confirmation')}
      message={message}
      confirmLabel={t('common.confirm')}
      cancelLabel={t('common.cancel')}
      variant="primary"
      onConfirm={onConfirm}
      onClose={onCancel}
    />
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function ScoresDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loading, getDashboard, recalculateAll } = useESGScoring();

  const [dashboard, setDashboard] = useState<any>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const [sectorRank, setSectorRank] = useState<number | null>(null);
  const [sectorTotal, setSectorTotal] = useState<number | null>(null);
  // loading | ready | no-sector (organisation sans secteur) | unavailable (pas de classement calculable)
  const [sectorState, setSectorState] = useState<'loading' | 'ready' | 'no-sector' | 'unavailable'>('loading');
  const [sparklinePoints, setSparklinePoints] = useState<number[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean; message: string; onConfirm: () => void;
  }>({ open: false, message: '', onConfirm: () => {} });
  const [recalcPeriod, setRecalcPeriod] = useState(36);
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);

  useEffect(() => {
    loadDashboard();
    import('@/services/api').then(({ default: api }) => {
      api.get('/organizations?limit=1').then((orgRes: any) => {
        const orgs: any[] = orgRes.data?.items ?? orgRes.data ?? [];
        const sector: string = orgs[0]?.sector ?? orgs[0]?.industry ?? '';
        if (!sector) { setSectorState('no-sector'); return null; }
        return api.get(`/benchmarks/sector/${encodeURIComponent(sector)}`);
      }).then((res: any) => {
        if (!res) return;
        const d = res.data;
        const rankStr = d?.rank ?? d?.your_rank ?? '';
        const parts = rankStr.toString().split('/').map((s: string) => parseInt(s.trim(), 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          setSectorRank(parts[0]);
          setSectorTotal(parts[1]);
          setSectorState('ready');
        } else {
          setSectorState('unavailable');
        }
      }).catch(() => setSectorState('unavailable'));

      api.get('/scores/history').then((res: any) => {
        const scores: any[] = res.data?.scores ?? res.data ?? [];
        const pts = [...scores]
          .reverse()
          .slice(-12)
          .map((s: any) => Math.round(s.overall_score ?? s.global_score ?? 0))
          .filter((v: number) => v > 0);
        if (pts.length >= 2) setSparklinePoints(pts);
      }).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboard = async () => {
    try {
      setErrorMessage('');
      const data = await getDashboard();
      if (data) { setDashboard(data); setLastLoadedAt(new Date()); }
      else setDashboard(null);
    } catch {
      setErrorMessage(t('scores.calcError'));
      toast.error(t('scores.loadError'));
    }
  };

  const handleRecalculateAll = () => {
    setConfirmModal({
      open: true,
      message: t('scores.recalculateConfirm', `Recalculer tous les scores ESG sur les ${recalcPeriod} derniers mois ? Cette opération peut prendre quelques secondes.`),
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }));
        try {
          setRecalculating(true);
          setErrorMessage('');
          const result = await recalculateAll(recalcPeriod);
          if (result) {
            // Toujours recharger le dashboard après recalcul (même si 0 succès)
            await loadDashboard();
            setSkippedCount(result.skipped ?? 0);
            if (result.failed > 0)
              setErrorMessage(`${result.failed} organisation(s) en erreur technique. Vérifiez les logs.`);
          } else {
            setErrorMessage(t('scores.recalcFailed'));
          }
        } catch {
          setErrorMessage(t('scores.recalcFailed'));
          toast.error(t('scores.recalcError'));
        } finally {
          setRecalculating(false);
        }
      },
    });
  };

  const handleExportCSV = () => {
    const performers = dashboard?.top_performers || [];
    if (!performers.length) return;
    const headers = [t('scores.csvRank'), t('scores.csvOrg'), t('scores.csvGlobalScore'), 'Rating', t('scores.envLabel'), t('scores.socialLabel'), t('scores.govLabel')];
    const rows = performers.map((org: any, i: number) => [
      i + 1, org.name,
      org.score?.toFixed(1) || '0', org.rating,
      org.environmental?.toFixed(0) || '0',
      org.social?.toFixed(0) || '0',
      org.governance?.toFixed(0) || '0',
    ]);
    const esc = (v: unknown) => {
      let x = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(x)) x = `'${x}`;
      return `"${x.replace(/"/g, '""')}"`;
    };
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(esc).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scores-esg-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('scores.csvExported'));
  };

  /* ── Computed values ──────────────────────────────────────────────── */
  const statistics = dashboard?.statistics || {};
  const totalOrganizations = statistics?.total_organizations || 0;
  const distribution: any[] = dashboard?.rating_distribution || [];
  const bestRating = distribution.find((item: any) => item.count > 0)?.rating || '—';
  const avgScore = statistics?.average_score || 0;
  const completeness = Math.round(statistics?.average_completeness ?? 0);

  const pillars = [
    { key: 'env' as const, label: t('scores.envLabel', 'Environnement'), value: statistics?.average_environmental || 0 },
    { key: 'soc' as const, label: t('scores.socialLabel', 'Social'),      value: statistics?.average_social || 0 },
    { key: 'gov' as const, label: t('scores.govLabel', 'Gouvernance'),    value: statistics?.average_governance || 0 },
  ];
  const strongestPillar = [...pillars].sort((a, b) => b.value - a.value)[0]?.label || '—';
  const weakestPillar = [...pillars].sort((a, b) => a.value - b.value)[0]?.label || '—';
  const lowCompleteness = (statistics?.average_completeness ?? 0) < 60;

  const periodLabel = recalcPeriod % 12 === 0
    ? `${recalcPeriod / 12} ${t('scores.yearUnit')}${recalcPeriod / 12 > 1 ? 's' : ''}`
    : `${recalcPeriod} ${t('scores.monthUnit')}`;

  // Ferme le menu de période au clic extérieur ou avec Échap
  const periodRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!periodMenuOpen) return;
    const onDown = (e: MouseEvent) => { if (!periodRef.current?.contains(e.target as Node)) setPeriodMenuOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPeriodMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [periodMenuOpen]);

  const card = 'rounded-2xl border border-gray-200 bg-white';
  const sectionTitle = 'text-[15px] font-semibold text-gray-900';
  const sectionHint = 'mt-0.5 text-[13px] text-gray-500';
  const link = 'inline-flex items-center gap-1 rounded text-[13px] font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300';
  const ringR = 54;
  const ringC = 2 * Math.PI * ringR;
  const ringColor = avgScore >= 60 ? '#047857' : avgScore >= 45 ? '#d97706' : '#dc2626';

  const confirm = (
    <ConfirmModal
      open={confirmModal.open}
      message={confirmModal.message}
      onConfirm={confirmModal.onConfirm}
      onCancel={() => setConfirmModal(m => ({ ...m, open: false }))}
    />
  );

  /* Période + recalcul : même contrôle dans l'en-tête et l'écran vide */
  const recalcControl = (
    <div ref={periodRef} className="relative flex items-stretch overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button type="button" aria-haspopup="menu" aria-expanded={periodMenuOpen}
        onClick={() => setPeriodMenuOpen(o => !o)}
        title={t('scores.dataWindow')}
        className="flex items-center gap-1.5 px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
        <Clock className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
        {periodLabel}
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 motion-safe:transition-transform ${periodMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <button type="button" onClick={handleRecalculateAll} disabled={recalculating}
        className="inline-flex items-center gap-2 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60">
        <RefreshCw className={`h-4 w-4 ${recalculating ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
        {t('scores.recalculateAll')}
      </button>
      {periodMenuOpen && (
        <div role="menu" className="absolute left-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <p className="px-3 pb-1 pt-2.5 text-xs font-medium text-gray-500">{t('scores.dataWindow')}</p>
          {[
            { label: `6 ${t('scores.monthUnit')}`, value: 6 },
            { label: `1 ${t('scores.yearUnit')}`,  value: 12 },
            { label: `2 ${t('scores.yearUnit')}s`, value: 24 },
            { label: `3 ${t('scores.yearUnit')}s`, value: 36 },
            { label: `4 ${t('scores.yearUnit')}s`, value: 48 },
            { label: `5 ${t('scores.yearUnit')}s`, value: 60 },
          ].map(opt => (
            <button key={opt.value} role="menuitemradio" aria-checked={recalcPeriod === opt.value}
              onClick={() => { setRecalcPeriod(opt.value); setPeriodMenuOpen(false); }}
              className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors ${
                recalcPeriod === opt.value ? 'bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' : 'text-gray-700 hover:bg-gray-50'}`}>
              {opt.label}
              {recalcPeriod === opt.value && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />}
            </button>
          ))}
          <div className="border-t border-gray-100 px-3 py-2">
            <label htmlFor="custom-months" className="mb-1 block text-xs text-gray-500">{t('scores.customMonths')}</label>
            <input id="custom-months" type="number" min={1} max={120} placeholder={t('scores.customPlaceholder')}
              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const v = parseInt((e.target as HTMLInputElement).value, 10);
                  if (!isNaN(v) && v >= 1 && v <= 120) { setRecalcPeriod(v); setPeriodMenuOpen(false); }
                }
              }} />
          </div>
        </div>
      )}
    </div>
  );

  /* ── Empty state ──────────────────────────────────────────────────── */
  if (!dashboard && !loading) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6">
        {confirm}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-gray-900 sm:text-[28px]">{t('scores.dashboardTitle')}</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">{t('scores.noScoresAvailable')}</p>
          </div>
          {recalcControl}
        </header>
        {errorMessage && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />{errorMessage}
          </div>
        )}
        <div className={card}>
          <EmptyState icon={BarChart3} title={t('scores.onboardingTitle')} description={t('scores.noScoresHint')}
            action={<Button loading={recalculating} disabled={recalculating} icon={<BarChart3 className="h-4 w-4" />} onClick={handleRecalculateAll}>{t('scores.calculateNow')}</Button>} />
        </div>
      </div>
    );
  }

  /* ── Main render ──────────────────────────────────────────────────── */
  const trend = sparklinePoints.length >= 2 ? sparklinePoints[sparklinePoints.length - 1] - sparklinePoints[0] : null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 animate-fade-in">
      {confirm}

      {/* ── En-tête ── */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-gray-900 sm:text-[28px]">{t('scores.dashboardTitle')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">{t('scores.dashboardSubtitle')}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gray-500">
            {lastLoadedAt && (
              <span>{t('scores.lastUpdate', {
                time: lastLoadedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                defaultValue: `Actualisé à ${lastLoadedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
              })}</span>
            )}
            <ScoreMethodology />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={<RefreshCw className={`h-4 w-4 ${loading ? 'motion-safe:animate-spin' : ''}`} />} onClick={loadDashboard} disabled={loading}>
            {t('scores.refresh')}
          </Button>
          {recalcControl}
        </div>
      </header>

      {errorMessage && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-red-600 dark:text-red-400" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium text-red-900 dark:text-red-200">{t('scores.calcError')}</p>
            <p className="mt-0.5 text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
        </div>
      )}

      {skippedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex items-start gap-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 flex-none text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-200">{t('scores.skippedOrgs', { count: skippedCount })}</p>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300">{t('scores.skippedOrgsHint')}</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" icon={<BarChart3 className="h-4 w-4" />} onClick={() => navigate('/app/data-entry')}>
            {t('scores.enterData')}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-6" role="status" aria-label={t('common.loading', 'Chargement')}>
          <div className={`${card} grid grid-cols-1 gap-6 p-6 lg:grid-cols-[300px_minmax(0,1fr)]`}>
            <div className="skeleton mx-auto h-[132px] w-[132px] rounded-full" />
            <div className="space-y-5">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-8 w-full rounded-lg" />)}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className={`${card} space-y-3 p-6`}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-5 w-full rounded" />)}</div>
            <div className={`${card} space-y-3 p-6`}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-5 w-full rounded" />)}</div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Score moyen + piliers + chiffres clés ── */}
          <section className={`${card} overflow-hidden`} aria-label={t('scores.avgGlobalScore', 'Score global moyen')}>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
              <div className="flex items-center gap-5 border-b border-gray-200 p-6 lg:border-b-0 lg:border-r">
                <div className="relative h-[132px] w-[132px] flex-none" role="img" aria-label={`${t('scores.avgGlobalScore')} : ${avgScore.toFixed(1)} / 100`}>
                  <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90" aria-hidden="true">
                    <circle cx="66" cy="66" r={ringR} fill="none" stroke="currentColor" className="text-gray-100 dark:text-white/10" strokeWidth="10" />
                    <circle cx="66" cy="66" r={ringR} fill="none" stroke={ringColor} strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={`${(ringC * Math.min(avgScore, 100)) / 100} ${ringC}`}
                      className="motion-safe:transition-[stroke-dasharray] motion-safe:duration-700" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[32px] font-semibold leading-none tracking-tight tabular-nums text-gray-900">{avgScore.toFixed(1)}</span>
                    <span className="mt-1 text-xs text-gray-500">/ 100</span>
                  </div>
                </div>
                <dl className="min-w-0 space-y-2.5 text-[13px]">
                  <div>
                    <dt className="text-gray-500">{t('scores.analyzedOrgs', 'Organisations')}</dt>
                    <dd className="mt-0.5">
                      <button type="button" onClick={() => navigate('/app/organizations')} className="font-medium tabular-nums text-gray-900 hover:underline">
                        {totalOrganizations}
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">{t('scores.bestRatingLabel', 'Meilleure note')}</dt>
                    <dd className="mt-0.5">{bestRating !== '—' ? <Badge tone={ratingTone(bestRating)}>{bestRating}</Badge> : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">{t('scores.avgCompleteness', 'Complétude moyenne')}</dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-gray-900">{completeness} %</dd>
                  </div>
                </dl>
              </div>

              <div className="p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className={sectionTitle}>{t('scores.pillarPerformance')}</h2>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="inline-block h-3 w-0.5 rounded-full bg-gray-400" aria-hidden="true" />
                    {t('dashboard.targetLegend', { n: TARGET, defaultValue: 'objectif {{n}}' })}
                  </span>
                </div>
                <p className={sectionHint}>{t('scores.pillarPerformanceSub')}</p>
                <ul className="mt-4 space-y-1">
                  {pillars.map(p => {
                    const st = PILLAR_STYLE[p.key];
                    const Icon = st.icon;
                    const gap = Math.round(p.value - TARGET);
                    return (
                      <li key={p.key}>
                        <button type="button" onClick={() => navigate(`/app/dashboard/pillar/${st.route}`)}
                          className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-xl px-2 py-3 text-left transition-colors hover:bg-gray-50 sm:grid-cols-[minmax(0,170px)_minmax(0,1fr)_auto]">
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg" style={{ background: `${st.fill}1a`, color: st.text }}>
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="truncate text-sm font-medium text-gray-800">{p.label}</span>
                          </span>
                          <span className="order-last col-span-2 min-w-0 sm:order-none sm:col-span-1">
                            <Meter pct={p.value} color={st.fill} target={TARGET} label={`${p.label} : ${p.value.toFixed(1)} sur 100, objectif ${TARGET}`} />
                            <span className="mt-1.5 block text-xs text-gray-500">
                              {gap >= 0
                                ? t('dashboard.aboveTarget', { n: gap, defaultValue: 'Objectif atteint (+{{n}} pts)' })
                                : t('dashboard.belowTarget', { n: Math.abs(gap), defaultValue: '{{n}} pts sous l’objectif' })}
                            </span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-11 text-right text-xl font-semibold tabular-nums text-gray-900">{p.value.toFixed(1)}</span>
                            <ChevronRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" aria-hidden="true" />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </section>

          {/* ── Distribution des notes + repères ── */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <section className={`${card} p-6`}>
              <h2 className={sectionTitle}>{t('scores.ratingDistribution', 'Distribution des notes ESG')}</h2>
              <p className={sectionHint}>{t('scores.ratingDistributionSub', 'Répartition des organisations par rating')}</p>
              {distribution.length ? (
                <ul className="mt-5 space-y-2.5">
                  {distribution.map((item: any) => {
                    const pct = totalOrganizations > 0 ? (item.count / totalOrganizations) * 100 : 0;
                    return (
                      <li key={item.rating} className="grid grid-cols-[44px_minmax(0,1fr)_72px] items-center gap-3">
                        <span className="text-[13px] font-semibold text-gray-800">{item.rating}</span>
                        <Meter pct={pct} color={ratingColor(item.rating)} label={`${item.rating} : ${item.count} organisation(s)`} />
                        <span className="text-right text-[13px] tabular-nums text-gray-700">
                          {item.count} <span className="text-xs text-gray-500">({pct.toFixed(0)} %)</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-5 text-sm text-gray-500">{t('scores.noDistribution', 'Aucune distribution disponible')}</p>
              )}
            </section>

            <section className={`${card} p-6`}>
              <h2 className={sectionTitle}>{t('scores.quickDiagnostic', 'Diagnostic rapide')}</h2>
              <dl className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
                {/* Classement sectoriel */}
                <div className="py-3 first:pt-0">
                  <dt className="text-xs text-gray-500">{t('scores.sectorRankTitle', 'Classement sectoriel')}</dt>
                  <dd className="mt-1">
                    {sectorRank !== null && sectorTotal !== null ? (
                      <button type="button" onClick={() => navigate('/app/benchmarking')} className="group w-full text-left">
                        <span className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-semibold tabular-nums text-gray-900">{sectorRank}</span>
                          <span className="text-[13px] text-gray-500">/ {sectorTotal} {t('scores.companies')}</span>
                          <ChevronRight className="ml-auto h-4 w-4 self-center text-gray-300 group-hover:text-gray-500" aria-hidden="true" />
                        </span>
                        <span className="mt-2 block">
                          <Meter pct={Math.max(((sectorTotal - sectorRank) / Math.max(sectorTotal - 1, 1)) * 100, sectorRank > 0 ? 4 : 0)}
                            color="#047857" label={`${sectorRank} / ${sectorTotal}`} />
                        </span>
                        <span className="mt-1.5 block text-xs text-gray-600">
                          {sectorRank <= Math.ceil(sectorTotal * 0.1)
                            ? t('scores.sectorTop10', 'Top 10% du secteur')
                            : sectorRank <= Math.ceil(sectorTotal * 0.25)
                              ? t('scores.sectorTop25', 'Top 25% du secteur')
                              : sectorRank <= Math.ceil(sectorTotal * 0.5)
                                ? t('scores.sectorUpperHalf', 'Dans la première moitié du secteur')
                                : t('scores.sectorLowerHalf', 'Dans la seconde moitié du secteur : des marges de progrès')}
                        </span>
                      </button>
                    ) : sectorState === 'no-sector' ? (
                      <p className="text-sm text-gray-600">
                        {t('scores.sectorMissing', 'Renseignez le secteur de votre organisation pour voir votre rang.')}{' '}
                        <button type="button" onClick={() => navigate('/app/organizations')} className={link}>{t('scores.sectorMissingCta', 'Compléter')}</button>
                      </p>
                    ) : sectorState === 'unavailable' ? (
                      <p className="text-sm text-gray-600">{t('scores.sectorUnavailable', 'Classement indisponible : pas assez d’entreprises comparables dans ce secteur pour le moment.')}</p>
                    ) : (
                      <p className="text-xs text-gray-500">{t('scores.loadingSectorRank')}</p>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-3">
                  <dt className="text-xs text-gray-500">{t('scores.strongestPillar', 'Pilier le plus fort')}</dt>
                  <dd className="text-sm font-medium text-gray-900">{strongestPillar}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-3">
                  <dt className="text-xs text-gray-500">{t('scores.weakestPillar', 'Pilier à renforcer')}</dt>
                  <dd className="text-sm font-medium text-gray-900">{weakestPillar}</dd>
                </div>
                <div className="py-3 last:pb-0">
                  <dt className="text-xs text-gray-500">{t('scores.watchPoint', "Point d'attention")}</dt>
                  <dd className="mt-1">
                    {lowCompleteness ? (
                      <button type="button" onClick={() => navigate('/app/data-entry')}
                        className="flex w-full items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-left text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-200">
                        <AlertCircle className="h-4 w-4 flex-none" aria-hidden="true" />
                        <span className="flex-1">{t('scores.lowCompletenessWarning', 'Complétude insuffisante — enrichissez vos données')}</span>
                        <ChevronRight className="h-4 w-4 flex-none" aria-hidden="true" />
                      </button>
                    ) : (
                      <p className="text-sm text-gray-700">{t('scores.adequateCoveragePlain', 'Couverture des données adéquate')}</p>
                    )}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          {/* ── Évolution ── */}
          <section className={`${card} p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className={`${sectionTitle} flex items-center gap-2`}><TrendingUp className="h-4 w-4 text-gray-400" aria-hidden="true" />{t('scores.evolution12mTitle', 'Évolution sur 12 mois')}</h2>
                <p className={sectionHint}>{t('scores.evolution12mSubtitle', 'Score global moyen : un point par calcul de score')}</p>
              </div>
              {trend !== null && (
                <Badge tone={trend >= 0 ? 'success' : 'danger'}>{trend >= 0 ? '+' : '−'}{Math.abs(trend)} pts</Badge>
              )}
            </div>
            {sparklinePoints.length < 2 ? (
              <EmptyState icon={Target} title={t('scores.evolutionEmptyTitle', 'Pas encore d’évolution à montrer')}
                description={t('scores.evolutionEmptyBody', 'La courbe apparaît dès que vous avez calculé votre score à au moins deux dates. Relancez un calcul après avoir mis à jour vos données.')} />
            ) : (() => {
              const points = sparklinePoints;
              const w = 700, h = 110, pad = 16;
              const minV = Math.max(0, Math.min(...points, TARGET) - 5);
              const maxV = Math.min(100, Math.max(...points, TARGET) + 5);
              const y = (v: number) => h - pad - ((v - minV) / (maxV - minV)) * (h - pad * 2);
              const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (w - pad * 2));
              const ys = points.map(y);
              const line = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
              const area = `M${xs[0]},${h} ${xs.map((x, i) => `L${x},${ys[i]}`).join(' ')} L${xs[xs.length - 1]},${h} Z`;
              const last = points[points.length - 1];
              return (
                <div className="mt-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="text-2xl font-semibold tabular-nums text-gray-900">{last}<span className="ml-1 text-sm font-normal text-gray-500">/ 100</span></p>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="inline-block w-4 border-t border-dashed border-gray-400" aria-hidden="true" />
                      {t('dashboard.targetLegend', { n: TARGET, defaultValue: 'objectif {{n}}' })}
                    </span>
                  </div>
                  <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="mt-2 overflow-visible text-gray-400" role="img"
                    aria-label={`De ${points[0]} à ${last} sur ${points.length} calculs`}>
                    <defs>
                      <linearGradient id="dSparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#047857" stopOpacity="0.16" />
                        <stop offset="100%" stopColor="#047857" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1={pad} x2={w - pad} y1={y(TARGET)} y2={y(TARGET)} stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" />
                    <path d={area} fill="url(#dSparkGrad)" />
                    <polyline points={line} fill="none" stroke="#047857" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
                    {xs.map((x, i) => (
                      <circle key={i} cx={x} cy={ys[i]} r={i === xs.length - 1 ? 4.5 : 3} fill="#047857" />
                    ))}
                  </svg>
                </div>
              );
            })()}
          </section>

          {/* ── Meilleures organisations ── */}
          <section className={`${card} overflow-hidden`}>
            <div className="flex flex-wrap items-start justify-between gap-3 px-6 pb-3 pt-6">
              <div>
                <h2 className={sectionTitle}>{t('scores.top5Title', 'Top organisations ESG')}</h2>
                <p className={sectionHint}>{t('scores.top5Sub', 'Meilleures performances de la période')}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} onClick={handleExportCSV}
                  disabled={!dashboard?.top_performers?.length}>
                  {t('scores.export', 'Exporter')}
                </Button>
                <button type="button" onClick={() => navigate('/app/organizations')} className={link}>
                  {t('scores.seeAll', 'Voir tout')} <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
            {dashboard?.top_performers?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 dark:border-gray-800">
                      <th scope="col" className="w-12 py-2 pl-6 font-medium">#</th>
                      <th scope="col" className="py-2 font-medium">{t('scores.colOrganization', 'Organisation')}</th>
                      <th scope="col" className="hidden w-14 py-2 text-right font-medium sm:table-cell">E</th>
                      <th scope="col" className="hidden w-14 py-2 text-right font-medium sm:table-cell">S</th>
                      <th scope="col" className="hidden w-14 py-2 text-right font-medium sm:table-cell">G</th>
                      <th scope="col" className="w-20 py-2 text-right font-medium">{t('scores.colGlobalScore', 'Score')}</th>
                      <th scope="col" className="w-24 py-2 pr-6 text-right font-medium">{t('scores.colRating', 'Rating')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {dashboard.top_performers.map((org: any, index: number) => (
                      <tr key={org.id} className="cursor-pointer transition-colors hover:bg-gray-50" onClick={() => navigate(`/app/organizations/${org.id}`)}>
                        <td className="py-3 pl-6 tabular-nums text-gray-500">{index + 1}</td>
                        <td className="py-3">
                          <button type="button" onClick={e => { e.stopPropagation(); navigate(`/app/organizations/${org.id}`); }}
                            className="text-left font-medium text-gray-900 hover:underline">{org.name}</button>
                        </td>
                        <td className="hidden py-3 text-right tabular-nums text-gray-600 sm:table-cell">{org.environmental != null ? Math.round(org.environmental) : '—'}</td>
                        <td className="hidden py-3 text-right tabular-nums text-gray-600 sm:table-cell">{org.social != null ? Math.round(org.social) : '—'}</td>
                        <td className="hidden py-3 text-right tabular-nums text-gray-600 sm:table-cell">{org.governance != null ? Math.round(org.governance) : '—'}</td>
                        <td className="py-3 text-right font-semibold tabular-nums text-gray-900">{org.score?.toFixed(1) || '0.0'}</td>
                        <td className="py-3 pr-6 text-right">{org.rating ? <Badge tone={ratingTone(org.rating)}>{org.rating}</Badge> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-6 pb-6 text-sm text-gray-500">{t('scores.noPerformers', 'Aucune donnée de performance disponible')}</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
