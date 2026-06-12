import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

type StatCard = {
  title: string; value: string; suffix?: string;
  icon: LucideIcon; iconBg: string; iconColor: string;
  gradFrom: string; gradTo: string; kpiVariant: string;
  onClick?: () => void;
};
import {
  RefreshCw,
  Award,
  TrendingUp,
  BarChart3,
  Download,
  AlertCircle,
  Building2,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  DatabaseZap,
  Info,
  Leaf,
  Users,
  Landmark,
  Clock,
  ChevronDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import Spinner from '@/components/common/Spinner';
import { useESGScoring } from '@/hooks/useESGScoring';
import toast from 'react-hot-toast';

/* ── Hero animated score ring ──────────────────────────────────────────── */
function HeroScoreRing({ score, label }: { score: number; label: string }) {
  const R = 54;
  const circ = 2 * Math.PI * R;
  const dash = (Math.min(Math.max(score, 0), 100) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <svg width="152" height="152" viewBox="0 0 152 152">
        <defs>
          <linearGradient id="hRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#93c5fd" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx="76" cy="76" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="14" />
        {/* Progress */}
        <circle
          cx="76" cy="76" r={R}
          fill="none"
          stroke="url(#hRingGrad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          transform="rotate(-90 76 76)"
          style={{ transition: 'stroke-dasharray 1.3s cubic-bezier(.4,0,.2,1)' }}
        />
        <text x="76" y="71" textAnchor="middle" fontSize="34" fontWeight="700" fill="white" fontFamily="system-ui,sans-serif">
          {Math.round(score)}
        </text>
        <text x="76" y="91" textAnchor="middle" fontSize="13" fill="rgba(255,255,255,0.5)" fontFamily="system-ui,sans-serif">
          / 100
        </text>
      </svg>
      <p className="text-xs font-medium tracking-widest text-white/50 uppercase">{label}</p>
    </div>
  );
}

/* ── Mini pillar progress bar ───────────────────────────────────────────── */
function MiniBar({ value, color, gradient }: { value: number; color: string; gradient?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500${gradient ? ` ${gradient}` : ''}`}
          style={{ width: `${Math.min(Math.max(value, 0), 100)}%`, ...(gradient ? {} : { backgroundColor: color }) }}
        />
      </div>
      <span className="text-xs font-semibold w-5 text-right tabular-nums" style={{ color }}>
        {Math.round(value)}
      </span>
    </div>
  );
}

/* ── Rating metadata ────────────────────────────────────────────────────── */
const RATING_META: Record<string, { barColor: string; badgeBg: string; badgeBorder: string; badgeText: string }> = {
  AAA: { barColor: '#10b981', badgeBg: '#ecfdf5', badgeBorder: '#a7f3d0', badgeText: '#065f46' },
  AA:  { barColor: '#22c55e', badgeBg: '#f0fdf4', badgeBorder: '#bbf7d0', badgeText: '#166534' },
  A:   { barColor: '#84cc16', badgeBg: '#f7fee7', badgeBorder: '#d9f99d', badgeText: '#3f6212' },
  BBB: { barColor: '#3b82f6', badgeBg: '#eff6ff', badgeBorder: '#bfdbfe', badgeText: '#1e40af' },
  BB:  { barColor: '#38bdf8', badgeBg: '#f0f9ff', badgeBorder: '#bae6fd', badgeText: '#0c4a6e' },
  B:   { barColor: '#818cf8', badgeBg: '#eef2ff', badgeBorder: '#c7d2fe', badgeText: '#3730a3' },
  CCC: { barColor: '#f59e0b', badgeBg: '#fffbeb', badgeBorder: '#fde68a', badgeText: '#92400e' },
  CC:  { barColor: '#f97316', badgeBg: '#fff7ed', badgeBorder: '#fed7aa', badgeText: '#9a3412' },
  C:   { barColor: '#ef4444', badgeBg: '#fef2f2', badgeBorder: '#fecaca', badgeText: '#991b1b' },
};
function getRatingMeta(r: string) {
  return RATING_META[r] ?? { barColor: '#9ca3af', badgeBg: '#f9fafb', badgeBorder: '#e5e7eb', badgeText: '#374151' };
}

/* ── Confirm Modal ──────────────────────────────────────────────────────── */
function ConfirmModal({
  open, message, onConfirm, onCancel,
}: { open: boolean; message: string; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-gray-900">{t('common.confirmation')}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function ScoresDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loading, getDashboard, recalculateAll, populateSampleData } = useESGScoring();

  const [dashboard, setDashboard] = useState<any>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [populating, setPopulating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const [sectorRank, setSectorRank] = useState<number | null>(null);
  const [sectorTotal, setSectorTotal] = useState<number | null>(null);
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
        if (!sector) return null;
        return api.get(`/benchmarks/sector/${encodeURIComponent(sector)}`);
      }).then((res: any) => {
        if (!res) return;
        const d = res.data;
        const rankStr = d?.rank ?? d?.your_rank ?? '';
        const parts = rankStr.toString().split('/').map((s: string) => parseInt(s.trim(), 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          setSectorRank(parts[0]);
          setSectorTotal(parts[1]);
        }
      }).catch(() => {});

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

  const handlePopulateSampleData = () => {
    setConfirmModal({
      open: true,
      message: `Générer des données de démonstration pour les ${skippedCount} organisations sans données ? Ces données sont simulées (is_estimated=true).`,
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }));
        try {
          setPopulating(true);
          const result = await populateSampleData();
          if (result) {
            toast.success(`✅ ${result.populated} organisations renseignées (${result.data_points_created} points de données)`);
            setSkippedCount(0);
          }
        } finally {
          setPopulating(false);
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
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
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

  const bestRating = useMemo(() => {
    const distribution = dashboard?.rating_distribution || [];
    const best = distribution.find((item: any) => item.count > 0);
    return best?.rating || '—';
  }, [dashboard]);

  const pillarData = [
    { name: t('scores.envLabel'), value: Math.round((statistics?.average_environmental || 0) * 10) / 10, fill: '#16a34a' },
    { name: t('scores.socialLabel'),  value: Math.round((statistics?.average_social || 0) * 10) / 10,        fill: '#2563eb' },
    { name: t('scores.govLabel'),     value: Math.round((statistics?.average_governance || 0) * 10) / 10,    fill: '#7c3aed' },
  ];

  const diagnosticPillars = [
    { label: t('scores.envLabel', 'Environnement'), value: statistics?.average_environmental || 0 },
    { label: t('scores.socialLabel', 'Social'),     value: statistics?.average_social || 0 },
    { label: t('scores.govLabel', 'Gouvernance'),   value: statistics?.average_governance || 0 },
  ];
  const strongestPillar = [...diagnosticPillars].sort((a, b) => b.value - a.value)[0]?.label || '—';

  const statCards: StatCard[] = [
    {
      title: t('scores.avgGlobalScore', 'Score global moyen'),
      value: statistics?.average_score?.toFixed(1) || '0',
      suffix: '/100',
      icon: Award,
      iconBg: '#f3e8ff', iconColor: '#9333ea',
      gradFrom: '#a78bfa', gradTo: '#a855f7',
      kpiVariant: 'kpi-card-purple',
    },
    {
      title: t('scores.environmentalAvg', 'Environnement moy.'),
      value: statistics?.average_environmental?.toFixed(1) || '0',
      suffix: '/100',
      icon: Leaf,
      iconBg: '#dcfce7', iconColor: '#16a34a',
      gradFrom: '#4ade80', gradTo: '#10b981',
      kpiVariant: 'kpi-card-green',
    },
    {
      title: t('scores.socialAvg', 'Social moyen'),
      value: statistics?.average_social?.toFixed(1) || '0',
      suffix: '/100',
      icon: Users,
      iconBg: '#dbeafe', iconColor: '#2563eb',
      gradFrom: '#60a5fa', gradTo: '#38bdf8',
      kpiVariant: 'kpi-card-blue',
    },
    {
      title: t('scores.governanceAvg', 'Gouvernance moy.'),
      value: statistics?.average_governance?.toFixed(1) || '0',
      suffix: '/100',
      icon: Landmark,
      iconBg: '#e0e7ff', iconColor: '#4f46e5',
      gradFrom: '#818cf8', gradTo: '#a78bfa',
      kpiVariant: 'kpi-card-purple',
    },
    {
      title: t('scores.analyzedOrgs', 'Organisations'),
      value: String(totalOrganizations),
      suffix: t('scores.analyzed'),
      icon: Building2,
      iconBg: '#ccfbf1', iconColor: '#0d9488',
      gradFrom: '#2dd4bf', gradTo: '#22d3ee',
      kpiVariant: 'kpi-card-blue',
      onClick: () => navigate('/app/organizations'),
    },
    {
      title: t('scores.avgCompleteness', 'Complétude moyenne'),
      value: statistics?.average_completeness?.toFixed(0) || '0',
      suffix: '%',
      icon: BarChart3,
      iconBg: '#fef3c7', iconColor: '#d97706',
      gradFrom: '#fbbf24', gradTo: '#f97316',
      kpiVariant: 'kpi-card-amber',
    },
  ];

  /* ── Empty state ──────────────────────────────────────────────────── */
  if (!dashboard && !loading) {
    return (
      <div className="space-y-6">
        <ConfirmModal
          open={confirmModal.open}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(m => ({ ...m, open: false }))}
        />

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-800 p-8 text-white shadow-2xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/5" />
          <div className="relative max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" />
              {t('scores.smartScoring')}
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">{t('scores.dashboardTitle')}</h1>
            <p className="mt-3 text-sm text-white/75">{t('scores.noScoresAvailable')}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50 px-8 py-16">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-purple-100 shadow-inner">
              <BarChart3 className="h-10 w-10 text-purple-500" />
            </div>
            <h3 className="mt-5 text-xl font-bold text-gray-900">{t('scores.onboardingTitle')}</h3>
            <p className="mt-2 max-w-md text-sm text-gray-500">{t('scores.noScoresHint')}</p>
            <button
              onClick={handleRecalculateAll}
              disabled={recalculating}
              className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: '#7c3aed' }}
            >
              {recalculating ? <Spinner size="sm" /> : <BarChart3 className="mr-2 h-4 w-4" />}
              {t('scores.calculateNow')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main render ──────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 animate-fade-in">
      <ConfirmModal
        open={confirmModal.open}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(m => ({ ...m, open: false }))}
      />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-800 p-8 text-white shadow-2xl">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 h-52 w-52 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          {/* Left */}
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
              <Award className="h-3.5 w-3.5 shrink-0" />
              {t('scores.smartScoring')}
            </div>

            <h1 className="mt-4 text-4xl font-bold tracking-tight">{t('scores.dashboardTitle')}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/70">{t('scores.dashboardSubtitle')}</p>

            <div className="mt-5 flex flex-wrap gap-2 text-sm text-white/80">
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                {t('scores.orgsAnalyzed', { count: totalOrganizations, defaultValue: `${totalOrganizations} org. analysées` })}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                {t('scores.bestRating', { rating: bestRating, defaultValue: `Meilleure note : ${bestRating}` })}
              </span>
              {lastLoadedAt && (
                <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10 text-white/50">
                  {t('scores.lastUpdate', {
                    time: lastLoadedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    defaultValue: `Actualisé à ${lastLoadedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
                  })}
                </span>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3 items-center">
              <button
                onClick={loadDashboard}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {t('scores.refresh')}
              </button>

              {/* Période + Recalculer groupés */}
              <div className="flex items-center rounded-xl overflow-hidden border border-white/20 bg-white/10">
                {/* Sélecteur de période */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPeriodMenuOpen(o => !o)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                  >
                    <Clock className="h-3.5 w-3.5 text-white/70" />
                    <span>
                      {recalcPeriod % 12 === 0
                        ? `${recalcPeriod / 12} ${t('scores.yearUnit')}${recalcPeriod / 12 > 1 ? 's' : ''}`
                        : `${recalcPeriod} ${t('scores.monthUnit')}`}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-white/60 transition-transform ${periodMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {periodMenuOpen && (
                    <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-44">
                      <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('scores.dataWindow')}</p>
                      {[
                        { label: `6 ${t('scores.monthUnit')}`,   value: 6  },
                        { label: `1 ${t('scores.yearUnit')}`,    value: 12 },
                        { label: `2 ${t('scores.yearUnit')}s`,   value: 24 },
                        { label: `3 ${t('scores.yearUnit')}s`,   value: 36 },
                        { label: `4 ${t('scores.yearUnit')}s`,   value: 48 },
                        { label: `5 ${t('scores.yearUnit')}s`,   value: 60 },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { setRecalcPeriod(opt.value); setPeriodMenuOpen(false); }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                            recalcPeriod === opt.value
                              ? 'bg-purple-50 text-purple-700 font-semibold'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {opt.label}
                          {recalcPeriod === opt.value && (
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                          )}
                        </button>
                      ))}
                      {/* Champ personnalisé */}
                      <div className="px-3 py-2 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 mb-1">{t('scores.customMonths')}</p>
                        <input
                          type="number"
                          min={1}
                          max={120}
                          placeholder={t('scores.customPlaceholder')}
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const v = parseInt((e.target as HTMLInputElement).value, 10);
                              if (!isNaN(v) && v >= 1 && v <= 120) {
                                setRecalcPeriod(v);
                                setPeriodMenuOpen(false);
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Séparateur */}
                <span className="w-px h-6 bg-white/20" />

                {/* Bouton Recalculer */}
                <button
                  onClick={handleRecalculateAll}
                  disabled={recalculating}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-purple-900 bg-white hover:bg-white/90 transition-colors disabled:opacity-60"
                >
                  {recalculating ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
                  {t('scores.recalculateAll')}
                </button>
              </div>
            </div>
          </div>

          {/* Right: animated ring */}
          <HeroScoreRing score={statistics?.average_score || 0} label={t('scores.avgGlobalScore')} />
        </div>
      </div>

      {/* ── Error banner ──────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-medium text-red-900">{t('scores.calcError')}</p>
            <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ── Skipped banner ────────────────────────────────────────────── */}
      {skippedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">
                {t('scores.skippedOrgs', { count: skippedCount })}
              </p>
              <p className="mt-1 text-sm text-amber-700">
                {t('scores.skippedOrgsHint')}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => navigate('/app/data-entry')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50"
            >
              <BarChart3 className="h-4 w-4" />
              {t('scores.enterData')}
            </button>
            <button
              onClick={handlePopulateSampleData}
              disabled={populating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {populating ? <Spinner size="sm" /> : <DatabaseZap className="h-4 w-4" />}
              {t('scores.demoData')}
            </button>
          </div>
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {/* Skeleton KPI row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="skeleton h-1.5 w-full" />
                <div className="p-4 space-y-3">
                  <div className="skeleton h-8 w-8 rounded-xl" />
                  <div className="skeleton h-6 w-3/4 rounded-lg" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                  <div className="skeleton h-3 w-5/6 rounded" />
                </div>
              </div>
            ))}
          </div>
          {/* Skeleton chart row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-4">
              <div className="skeleton h-4 w-48 rounded" />
              <div className="skeleton h-3 w-64 rounded" />
              <div className="skeleton h-40 w-full rounded-xl" />
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-4">
              <div className="skeleton h-4 w-40 rounded" />
              <div className="skeleton h-10 w-24 rounded-lg" />
              <div className="skeleton h-2.5 w-full rounded-full" />
            </div>
          </div>
          {/* Skeleton table */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-4">
            <div className="skeleton h-4 w-48 rounded" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <div className="skeleton h-7 w-7 rounded-full" />
                <div className="skeleton h-4 w-48 rounded" />
                <div className="skeleton h-4 w-16 rounded ml-auto" />
                <div className="skeleton h-6 w-12 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ── KPI cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 animate-slide-up">
            {statCards.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  onClick={item.onClick}
                  className={`kpi-card ${item.kpiVariant}${item.onClick ? ' cursor-pointer' : ''}`}
                >
                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="rounded-xl p-2" style={{ backgroundColor: item.iconBg }}>
                        <Icon className="h-4 w-4" style={{ color: item.iconColor }} />
                      </div>
                      {item.onClick && (
                        <ChevronRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5" />
                      )}
                    </div>
                    <p className="stat-value">{item.value}</p>
                    <p className="stat-label mt-0.5">{item.suffix || ' '}</p>
                    <p className="mt-2 text-xs leading-snug text-gray-500">{item.title}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pillar chart + Sector rank ─────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Horizontal pillar BarChart — 2/3 */}
            <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800">
                <BarChart3 className="h-4 w-4 text-indigo-500 shrink-0" />
                {t('scores.pillarPerformance')}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 mb-5">{t('scores.pillarPerformanceSub')}</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={pillarData}
                  layout="vertical"
                  margin={{ top: 0, right: 50, bottom: 0, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={115}
                    tick={{ fontSize: 12, fill: '#374151' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)} / 100`, t('scores.avgScore')]}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                      fontSize: '13px',
                    }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 8, 8, 0]}
                    barSize={34}
                    label={{ position: 'right', fontSize: 12, fontWeight: 600, fill: '#374151', formatter: (v: number) => v > 0 ? v : '' }}
                  >
                    {pillarData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} fillOpacity={0.9} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Sector rank — 1/3 */}
            <div
              className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigate('/app/benchmarking')}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800">
                  <Award className="h-4 w-4 text-green-600" />
                  {t('scores.sectorRankTitle', 'Classement sectoriel')}
                </h3>
                <ExternalLink className="h-4 w-4 text-gray-300" />
              </div>

              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-green-700">
                  {sectorRank !== null ? sectorRank : '—'}
                </span>
                <span className="text-sm text-gray-500">
                  {sectorTotal !== null ? `/ ${sectorTotal}` : t('scores.companies')}
                </span>
              </div>

              {sectorRank !== null && sectorTotal !== null ? (
                <>
                  <div className="relative mb-3 h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-700"
                      style={{
                        width: `${Math.max(
                          ((sectorTotal - sectorRank) / Math.max(sectorTotal - 1, 1)) * 100,
                          sectorRank > 0 ? 4 : 0,
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs font-semibold text-green-700">
                    {sectorRank <= Math.ceil(sectorTotal * 0.1)
                      ? '🏆 ' + t('scores.sectorTop10', 'Top 10% du secteur')
                      : sectorRank <= Math.ceil(sectorTotal * 0.25)
                        ? '🥈 ' + t('scores.sectorTop25', 'Top 25% du secteur')
                        : '📈 ' + t('scores.sectorAboveAvg', 'Au-dessus de la moyenne')}
                  </p>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="h-2.5 animate-pulse rounded-full bg-gray-100" />
                  <p className="text-xs text-gray-400">{t('scores.loadingSectorRank')}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Rating distribution + Quick diagnostic ────────────────── */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {/* Rating distribution — 2/3 */}
            <div className="xl:col-span-2 rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800">
                <Award className="h-4 w-4 text-amber-500 shrink-0" />
                {t('scores.ratingDistribution', 'Distribution des notes ESG')}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 mb-6">
                {t('scores.ratingDistributionSub', 'Répartition des organisations par rating')}
              </p>

              {dashboard?.rating_distribution?.length ? (
                <div className="space-y-3">
                  {dashboard.rating_distribution.map((item: any) => {
                    const pct = totalOrganizations > 0 ? (item.count / totalOrganizations) * 100 : 0;
                    const meta = getRatingMeta(item.rating);
                    return (
                      <div key={item.rating} className="flex items-center gap-3 rounded-xl px-2 py-1 hover:bg-gray-50/80 transition-colors">
                        <div className="w-14 shrink-0 text-left">
                          <span
                            className="inline-block rounded-full border-2 px-2.5 py-0.5 text-xs font-black tracking-wide"
                            style={{ backgroundColor: meta.badgeBg, borderColor: meta.badgeBorder, color: meta.badgeText }}
                          >
                            {item.rating}
                          </span>
                        </div>
                        <div className="flex-1 h-7 overflow-hidden rounded-full bg-gray-50 border border-gray-100">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct > 0 ? Math.max(pct, 3) : 0}%`, backgroundColor: meta.barColor }}
                          />
                        </div>
                        <div className="w-20 shrink-0 text-right">
                          <span className="text-sm font-semibold text-gray-800">{item.count}</span>
                          <span className="ml-1 text-xs text-gray-400">({pct.toFixed(0)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-sm text-gray-400">
                  {t('scores.noDistribution', 'Aucune distribution disponible')}
                </div>
              )}
            </div>

            {/* Quick Diagnostic — 1/3 */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-5">
                <ShieldCheck className="h-4 w-4 text-purple-500 shrink-0" />
                {t('scores.quickDiagnostic', 'Diagnostic rapide')}
              </h2>
              <div className="space-y-4">
                {/* Score global */}
                <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-purple-600">
                    {t('scores.avgGlobalScoreDiag', 'Score global moyen')}
                  </p>
                  <div className="flex items-end gap-2">
                    <p className="text-3xl font-black tabular-nums leading-none text-purple-900">{statistics?.average_score?.toFixed(1) || '0'}</p>
                    <p className="pb-1 text-sm text-purple-400">/100</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-purple-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 transition-all duration-700"
                      style={{ width: `${statistics?.average_score || 0}%` }}
                    />
                  </div>
                </div>

                {/* Strongest pillar */}
                <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-600">
                    {t('scores.strongestPillar', 'Pilier le plus fort')}
                  </p>
                  <p className="text-lg font-semibold text-green-900">{strongestPillar}</p>
                </div>

                {/* Watch point */}
                <div
                  className={`rounded-2xl border p-4 transition-colors${
                    statistics?.average_completeness < 60
                      ? ' cursor-pointer border-amber-100 bg-amber-50 hover:bg-amber-100'
                      : ' border-gray-100 bg-gray-50'
                  }`}
                  onClick={() => statistics?.average_completeness < 60 && navigate('/app/data-entry')}
                >
                  <p
                    className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide"
                    style={{ color: statistics?.average_completeness < 60 ? '#92400e' : '#6b7280' }}
                  >
                    {t('scores.watchPoint', "Point d'attention")}
                    {statistics?.average_completeness < 60 && <ChevronRight className="h-3.5 w-3.5" />}
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{ color: statistics?.average_completeness < 60 ? '#78350f' : '#374151' }}
                  >
                    {statistics?.average_completeness < 60
                      ? t('scores.lowCompletenessWarning', 'Complétude insuffisante — enrichissez vos données')
                      : t('scores.adequateCoverageHint', 'Couverture des données adéquate ✓')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Sparkline — évolution 12 mois ─────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  {t('scores.evolution12mTitle', 'Évolution sur 12 mois')}
                </h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  {t('scores.evolution12mSub', 'Score global moyen — historique des calculs')}
                </p>
              </div>
              {sparklinePoints.length >= 2 && (() => {
                const trend = sparklinePoints[sparklinePoints.length - 1] - sparklinePoints[0];
                return (
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${trend >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)} pts
                  </span>
                );
              })()}
            </div>
            {(() => {
              const points = sparklinePoints.length >= 2
                ? sparklinePoints
                : [58, 59, 60, 59, 61, 62, 63, 64, 64, 65, 67, 69];
              const w = 700, h = 90, pad = 14;
              const minV = Math.min(...points) - 3;
              const maxV = Math.max(...points) + 3;
              const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (w - pad * 2));
              const ys = points.map((v) => h - pad - ((v - minV) / (maxV - minV)) * (h - pad * 2));
              const line = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
              const area = `M${xs[0]},${h} ${xs.map((x, i) => `L${x},${ys[i]}`).join(' ')} L${xs[xs.length - 1]},${h} Z`;
              const last = points[points.length - 1];
              return (
                <div>
                  <p className="mb-2 text-2xl font-black tabular-nums text-gray-900">
                    {last}
                    <span className="ml-1 text-sm font-normal text-gray-400">/100</span>
                  </p>
                  <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
                    <defs>
                      <linearGradient id="dSparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={area} fill="url(#dSparkGrad)" />
                    <polyline
                      points={line}
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {xs.map((x, i) => (
                      <circle
                        key={i}
                        cx={x} cy={ys[i]}
                        r={i === 0 || i === xs.length - 1 ? 4.5 : 3}
                        fill={i === xs.length - 1 ? '#7c3aed' : '#a78bfa'}
                        stroke="white"
                        strokeWidth="1.5"
                      />
                    ))}
                    <text x={xs[0]} y={ys[0] - 9} textAnchor="middle" fontSize="11" fill="#9ca3af">
                      {points[0]}
                    </text>
                    <text x={xs[xs.length - 1]} y={ys[ys.length - 1] - 9} textAnchor="middle" fontSize="11" fontWeight="700" fill="#7c3aed">
                      {last}
                    </text>
                  </svg>
                </div>
              );
            })()}
          </div>

          {/* ── Top performers ────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800">
                  <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
                  {t('scores.top5Title', 'Top organisations ESG')}
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  {t('scores.top5Sub', 'Meilleures performances de la période')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  {t('scores.export', 'Exporter')}
                </button>
                <button
                  onClick={() => navigate('/app/organizations')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Voir tout
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {dashboard?.top_performers?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 w-10">#</th>
                      <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {t('scores.colOrganization', 'Organisation')}
                      </th>
                      <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {t('scores.colGlobalScore', 'Score')}
                      </th>
                      <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {t('scores.colRating', 'Rating')}
                      </th>
                      <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 min-w-[140px]">
                        <span className="text-green-600">E</span>
                        <span className="text-gray-300 mx-1">/</span>
                        <span className="text-blue-600">S</span>
                        <span className="text-gray-300 mx-1">/</span>
                        <span className="text-purple-600">G</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dashboard.top_performers.map((org: any, index: number) => {
                      const meta = getRatingMeta(org.rating);
                      const medals = ['🥇', '🥈', '🥉'];
                      return (
                        <tr
                          key={org.id}
                          className="group cursor-pointer transition-colors hover:bg-purple-50/60"
                          onClick={() => navigate(`/app/organizations/${org.id}`)}
                          title={`Voir ${org.name}`}
                        >
                          {/* Rank */}
                          <td className="py-4 pr-2">
                            {index < 3 ? (
                              <span className="text-xl leading-none">{medals[index]}</span>
                            ) : (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                                {index + 1}
                              </div>
                            )}
                          </td>

                          {/* Name */}
                          <td className="py-4 pr-4">
                            <p className="font-semibold text-gray-900 transition-colors group-hover:text-purple-700">
                              {org.name}
                            </p>
                          </td>

                          {/* Score */}
                          <td className="py-4 pr-4">
                            <div className="flex items-end gap-1">
                              <span className="text-xl font-bold text-gray-900 tabular-nums">
                                {org.score?.toFixed(1) || '0.0'}
                              </span>
                              <span className="pb-0.5 text-xs text-gray-400">/100</span>
                            </div>
                          </td>

                          {/* Rating badge */}
                          <td className="py-4 pr-4">
                            <span
                              className="inline-block rounded-full border-2 px-3 py-1 text-xs font-black tracking-wide"
                              style={{ backgroundColor: meta.badgeBg, borderColor: meta.badgeBorder, color: meta.badgeText }}
                            >
                              {org.rating}
                            </span>
                          </td>

                          {/* Pillar mini-bars */}
                          <td className="py-4">
                            <div className="space-y-1">
                              <MiniBar value={org.environmental || 0} color="#16a34a" gradient="bg-gradient-to-r from-emerald-400 to-green-500" />
                              <MiniBar value={org.social || 0}        color="#2563eb" gradient="bg-gradient-to-r from-blue-400 to-cyan-500" />
                              <MiniBar value={org.governance || 0}    color="#7c3aed" gradient="bg-gradient-to-r from-violet-400 to-purple-500" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-sm text-gray-400">
                {t('scores.noPerformers', 'Aucune donnée de performance disponible')}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
