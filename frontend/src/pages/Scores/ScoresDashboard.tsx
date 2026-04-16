import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import { useESGScoring } from '@/hooks/useESGScoring';
import toast from 'react-hot-toast';

export default function ScoresDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loading, getDashboard, recalculateAll, populateSampleData } = useESGScoring();
  const [dashboard, setDashboard] = useState<any>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [populating, setPopulating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  // Rang sectoriel dynamique
  const [sectorRank, setSectorRank] = useState<number | null>(null);
  const [sectorTotal, setSectorTotal] = useState<number | null>(null);
  // Sparkline réelle (12 derniers scores)
  const [sparklinePoints, setSparklinePoints] = useState<number[]>([]);
  // Modal de confirmation (remplace confirm() natif)
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; message: string; onConfirm: () => void }>({
    open: false, message: '', onConfirm: () => {},
  });

  useEffect(() => {
    loadDashboard();
    // Rang sectoriel
    import('@/services/api').then(({ default: api }) => {
      api.get('/benchmarks/sector').then(res => {
        const d = res.data;
        const rankStr: string = d?.rank ?? d?.your_rank ?? '';
        const parts = rankStr.toString().split('/').map((s: string) => parseInt(s.trim(), 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          setSectorRank(parts[0]);
          setSectorTotal(parts[1]);
        }
      }).catch(() => {});
      // Sparkline : historique des scores
      api.get('/scores/history').then(res => {
        const scores: any[] = res.data?.scores ?? res.data ?? [];
        const pts = [...scores]
          .reverse()
          .slice(-12)
          .map((s: any) => Math.round(s.overall_score ?? s.global_score ?? 0))
          .filter((v: number) => v > 0);
        if (pts.length >= 2) setSparklinePoints(pts);
      }).catch(() => {});
    });
  }, []);

  const loadDashboard = async () => {
    try {
      setErrorMessage('');
      const data = await getDashboard();

      if (data) {
        setDashboard(data);
        setLastLoadedAt(new Date());
      } else {
        setDashboard(null);
      }
    } catch (error) {
      console.error('Erreur chargement dashboard ESG :', error);
      setErrorMessage(t('scores.calcError'));
      toast.error(t('scores.loadError'));
    }
  };

  const handleRecalculateAll = () => {
    setConfirmModal({
      open: true,
      message: t('scores.recalculateConfirm', 'Recalculer tous les scores ESG ? Cette opération peut prendre quelques secondes.'),
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }));
        try {
          setRecalculating(true);
          setErrorMessage('');
          const result = await recalculateAll(12);
          if (result) {
            if (result.successful > 0) await loadDashboard();
            setSkippedCount(result.skipped ?? 0);
            if (result.failed > 0) setErrorMessage(`${result.failed} organisation(s) en erreur technique. Vérifiez les logs.`);
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
    const headers = ['Rang', 'Organisation', 'Score Global', 'Rating', 'Environnement', 'Social', 'Gouvernance'];
    const rows = performers.map((org: any, i: number) => [
      i + 1,
      org.name,
      org.score?.toFixed(1) || '0',
      org.rating,
      org.environmental?.toFixed(0) || '0',
      org.social?.toFixed(0) || '0',
      org.governance?.toFixed(0) || '0',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scores-esg-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  const getRatingColor = (rating: string) => {
    if (rating?.startsWith('A')) return 'text-green-700 bg-green-100 border-green-200';
    if (rating?.startsWith('B')) return 'text-blue-700 bg-blue-100 border-blue-200';
    if (rating?.startsWith('C')) return 'text-orange-700 bg-orange-100 border-orange-200';
    return 'text-red-700 bg-red-100 border-red-200';
  };

  const statistics = dashboard?.statistics || {};
  const totalOrganizations = statistics?.total_organizations || 0;

  const bestRating = useMemo(() => {
    const distribution = dashboard?.rating_distribution || [];
    if (!distribution.length) return '—';
    const best = distribution.find((item: any) => item.count > 0);
    return best?.rating || '—';
  }, [dashboard]);

  const statCards = [
    {
      title: t('scores.avgGlobalScore'),
      value: statistics?.average_score?.toFixed(1) || '0',
      suffix: '/100',
      icon: Award,
      iconWrap: 'bg-purple-100',
      iconColor: 'text-purple-600',
      border: 'border-purple-500',
      helper: t('scores.avgGlobalScoreHelper'),
    },
    {
      title: t('scores.environmentalAvg'),
      value: statistics?.average_environmental?.toFixed(1) || '0',
      suffix: '/100',
      icon: TrendingUp,
      iconWrap: 'bg-green-100',
      iconColor: 'text-green-600',
      border: 'border-green-500',
      helper: t('scores.environmentalAvgHelper'),
    },
    {
      title: t('scores.socialAvg'),
      value: statistics?.average_social?.toFixed(1) || '0',
      suffix: '/100',
      icon: TrendingUp,
      iconWrap: 'bg-blue-100',
      iconColor: 'text-blue-600',
      border: 'border-blue-500',
      helper: t('scores.socialAvgHelper'),
    },
    {
      title: t('scores.governanceAvg'),
      value: statistics?.average_governance?.toFixed(1) || '0',
      suffix: '/100',
      icon: ShieldCheck,
      iconWrap: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      border: 'border-indigo-500',
      helper: t('scores.governanceAvgHelper'),
    },
    {
      title: t('scores.analyzedOrgs'),
      value: String(totalOrganizations),
      suffix: '',
      icon: Building2,
      iconWrap: 'bg-teal-100',
      iconColor: 'text-teal-600',
      border: 'border-teal-500',
      helper: t('scores.analyzedOrgsHelper'),
      onClick: () => navigate('/app/organizations'),
    },
    {
      title: t('scores.avgCompleteness'),
      value: statistics?.average_completeness?.toFixed(0) || '0',
      suffix: '%',
      icon: BarChart3,
      iconWrap: 'bg-amber-100',
      iconColor: 'text-amber-600',
      border: 'border-amber-500',
      helper: t('scores.avgCompletenessHelper'),
    },
  ];

  const diagnosticPillars = [
    { label: t('scores.envLabel'), value: statistics?.average_environmental || 0 },
    { label: t('scores.socialLabel'), value: statistics?.average_social || 0 },
    { label: t('scores.govLabel'), value: statistics?.average_governance || 0 },
  ];

  if (!dashboard && !loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-800 p-8 text-white shadow-xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" />
              {t('scores.smartScoring')}
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">{t('scores.dashboardTitle')}</h1>
            <p className="mt-3 text-sm text-white/80 md:text-base">
              {t('scores.noScoresAvailable')}
            </p>
          </div>
        </div>

        <Card className="border border-dashed border-purple-200 bg-purple-50">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {/* Simple onboarding illustration */}
            <svg width="80" height="80" viewBox="0 0 80 80" className="mb-4">
              <circle cx="40" cy="40" r="36" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="2" />
              <rect x="24" y="44" width="8" height="16" rx="2" fill="#8b5cf6" opacity="0.4" />
              <rect x="36" y="34" width="8" height="26" rx="2" fill="#8b5cf6" opacity="0.7" />
              <rect x="48" y="26" width="8" height="34" rx="2" fill="#8b5cf6" />
            </svg>
            <h3 className="mt-2 text-xl font-bold text-gray-900">{t('scores.onboardingTitle')}</h3>
            <p className="mt-2 max-w-md text-gray-600">
              {t('scores.noScoresHint')}
            </p>
            <Button onClick={handleRecalculateAll} className="mt-6" disabled={recalculating}>
              {recalculating ? <Spinner size="sm" /> : <BarChart3 className="mr-2 h-4 w-4" />}
              {t('scores.calculateNow')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modal de confirmation (remplace confirm() natif) */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-gray-900">Confirmation</h3>
            <p className="mt-2 text-sm text-gray-600">{confirmModal.message}</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(m => ({ ...m, open: false }))}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-800 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
              <Award className="h-3.5 w-3.5" />
              {t('scores.smartScoring')}
            </div>

            <h1 className="mt-4 flex items-center gap-3 text-4xl font-bold tracking-tight">
              <BarChart3 className="h-10 w-10" />
              {t('scores.dashboardTitle')}
            </h1>

            <p className="mt-3 max-w-2xl text-sm text-white/80 md:text-base">
              {t('scores.dashboardSubtitle')}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                {t('scores.orgsAnalyzed', { count: totalOrganizations })}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                {t('scores.bestRating', { rating: bestRating })}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                {lastLoadedAt
                  ? t('scores.lastUpdate', { time: lastLoadedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) })
                  : t('scores.notLoaded')}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={loadDashboard}
              disabled={loading}
              className="bg-white/10 text-white hover:bg-white/20"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              onClick={handleRecalculateAll}
              disabled={recalculating}
              className="bg-white text-purple-900 hover:bg-white/90"
            >
              {recalculating ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('scores.recalculateAll')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <Card className="border border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-900">{t('scores.calcError')}</p>
              <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
            </div>
          </div>
        </Card>
      )}

      {skippedCount > 0 && (
        <Card className="border border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-medium text-amber-900">
                  {skippedCount} organisation{skippedCount > 1 ? 's' : ''} sans données ESG
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  Ces organisations n'ont aucune donnée d'indicateur dans les 12 derniers mois.
                  Importez des données ou générez des données de démonstration pour les scorer.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/app/data-entry')}
                className="border-amber-300 text-amber-800 hover:bg-amber-100"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Saisir des données
              </Button>
              <Button
                size="sm"
                onClick={handlePopulateSampleData}
                disabled={populating}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                {populating ? <Spinner size="sm" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
                Générer données de démo
              </Button>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {statCards.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.title}
                  className={`border-l-4 ${item.border}${(item as any).onClick ? ' cursor-pointer transition-shadow hover:shadow-md' : ''}`}
                  onClick={(item as any).onClick}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-600">{item.title}</p>
                      <div className="mt-2 flex items-end gap-2">
                        <p className="text-3xl font-bold text-gray-900">{item.value}</p>
                        {item.suffix && <p className="pb-1 text-sm text-gray-500">{item.suffix}</p>}
                      </div>
                      <p className="mt-2 text-xs text-gray-500">{item.helper}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className={`rounded-2xl p-3 ${item.iconWrap}`}>
                        <Icon className={`h-6 w-6 ${item.iconColor}`} />
                      </div>
                      {(item as any).onClick && <ChevronRight className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Classement sectoriel + Sparkline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Classement sectoriel */}
            <Card
              className="border-l-4 border-green-500 cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigate('/app/benchmarking')}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-600" />
                  {t('scores.sectorRankTitle')}
                </h3>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl font-bold text-green-700">
                  {sectorRank !== null ? `${sectorRank}e` : '—'}
                </span>
                <span className="text-sm text-gray-600">
                  {sectorTotal !== null
                    ? t('scores.sectorRankOf', { total: sectorTotal, defaultValue: `sur ${sectorTotal} entreprises` })
                    : t('scores.sectorRankOf47')}
                </span>
              </div>
              {sectorRank !== null && sectorTotal !== null ? (
                <div className="relative h-3 bg-gray-200 rounded-full mb-2">
                  <div className="absolute h-3 bg-green-100 rounded-full" style={{ width: '100%' }} />
                  <div
                    className="absolute w-4 h-4 bg-green-600 rounded-full border-2 border-white shadow"
                    style={{ left: `calc(${((sectorRank - 1) / Math.max(sectorTotal - 1, 1)) * 100}% - 8px)`, top: '-2px' }}
                  />
                </div>
              ) : (
                <div className="h-3 bg-gray-100 rounded-full mb-2 animate-pulse" />
              )}
              <p className="text-xs text-green-700 font-medium">
                {sectorRank !== null && sectorTotal !== null
                  ? sectorRank <= Math.ceil(sectorTotal * 0.1)
                    ? t('scores.sectorTop10')
                    : sectorRank <= Math.ceil(sectorTotal * 0.25)
                      ? t('scores.sectorTop25', { defaultValue: 'Top 25% du secteur' })
                      : t('scores.sectorAboveAvg', { defaultValue: 'Au-dessus de la moyenne' })
                  : t('scores.sectorTop10')}
              </p>
            </Card>

            {/* Evolution 12 mois sparkline */}
            <Card>
              <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                {t('scores.evolution12mTitle')}
              </h3>
              {(() => {
                const points = sparklinePoints.length >= 2
                  ? sparklinePoints
                  : [58, 59, 60, 59, 61, 62, 63, 64, 64, 65, 67, 69];
                const w = 260, h = 60, pad = 8;
                const minV = Math.min(...points) - 2;
                const maxV = Math.max(...points) + 2;
                const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (w - pad * 2));
                const ys = points.map((v) => h - pad - ((v - minV) / (maxV - minV)) * (h - pad * 2));
                const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
                const areaPath = `M${xs[0]},${h} ${xs.map((x, i) => `L${x},${ys[i]}`).join(' ')} L${xs[xs.length - 1]},${h} Z`;
                return (
                  <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
                    <defs>
                      <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={areaPath} fill="url(#sparkGrad)" />
                    <polyline points={polyline} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" />
                    {xs.map((x, i) => (
                      <circle key={i} cx={x} cy={ys[i]} r="3" fill="#8b5cf6" />
                    ))}
                    <text x={xs[0]} y={ys[0] - 6} textAnchor="middle" fontSize="10" fill="#6b7280">{points[0]}</text>
                    <text x={xs[xs.length - 1]} y={ys[ys.length - 1] - 6} textAnchor="middle" fontSize="10" fill="#7c3aed" fontWeight="bold">{points[points.length - 1]}</text>
                  </svg>
                );
              })()}
              <p className="text-xs text-gray-500 mt-1">{t('scores.evolution12mSub')}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{t('scores.ratingDistribution')}</h2>
                  <p className="mt-1 text-sm text-gray-500">{t('scores.ratingDistributionSub')}</p>
                </div>
              </div>

              {dashboard?.rating_distribution?.length ? (
                <div className="space-y-4">
                  {dashboard.rating_distribution.map((item: any) => {
                    const percentage = totalOrganizations > 0 ? (item.count / totalOrganizations) * 100 : 0;

                    return (
                      <div key={item.rating} className="flex items-center gap-4">
                        <div className="w-16">
                          <span className={`rounded-lg border px-3 py-1 text-sm font-bold ${getRatingColor(item.rating)}`}>
                            {item.rating}
                          </span>
                        </div>

                        <div className="flex-1">
                          <div className="h-9 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>

                        <div className="w-24 text-right">
                          <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                          <span className="ml-1 text-xs text-gray-500">({percentage.toFixed(0)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
                  {t('scores.noDistribution')}
                </div>
              )}
            </Card>

            <Card>
              <h2 className="text-xl font-semibold text-gray-900">{t('scores.quickDiagnostic')}</h2>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-purple-50 p-4">
                  <p className="text-sm text-purple-700">{t('scores.avgGlobalScoreDiag')}</p>
                  <p className="mt-2 text-2xl font-bold text-purple-900">{statistics?.average_score?.toFixed(1) || '0'}</p>
                </div>

                <div className="rounded-2xl bg-green-50 p-4">
                  <p className="text-sm text-green-700">{t('scores.strongestPillar')}</p>
                  <p className="mt-2 text-lg font-semibold text-green-900">
                    {diagnosticPillars.sort((a, b) => b.value - a.value)[0]?.label || '—'}
                  </p>
                </div>

                <div
                  className={`rounded-2xl bg-amber-50 p-4${statistics?.average_completeness < 60 ? ' cursor-pointer hover:bg-amber-100 transition-colors' : ''}`}
                  onClick={() => statistics?.average_completeness < 60 && navigate('/app/data-entry')}
                >
                  <p className="text-sm text-amber-700 flex items-center justify-between">
                    {t('scores.watchPoint')}
                    {statistics?.average_completeness < 60 && <ChevronRight className="h-4 w-4" />}
                  </p>
                  <p className="mt-2 text-sm font-medium text-amber-900">
                    {statistics?.average_completeness < 60
                      ? t('scores.lowCompletenessWarning')
                      : t('scores.adequateCoverageHint')}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('scores.top5Title')}</h2>
                <p className="mt-1 text-sm text-gray-500">{t('scores.top5Sub')}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                {t('scores.export')}
              </Button>
            </div>

            {dashboard?.top_performers?.length ? (
              <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
                      <th className="pb-3">{t('scores.colRank')}</th>
                      <th className="pb-3">{t('scores.colOrganization')}</th>
                      <th className="pb-3">{t('scores.colGlobalScore')}</th>
                      <th className="pb-3">{t('scores.colRating')}</th>
                      <th className="pb-3">E</th>
                      <th className="pb-3">S</th>
                      <th className="pb-3">G</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.top_performers.map((org: any, index: number) => (
                      <tr
                        key={org.id}
                        className="border-b border-gray-100 hover:bg-purple-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/app/organizations/${org.id}`)}
                        title={`Voir ${org.name}`}
                      >
                        <td className="py-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                            {index + 1}
                          </div>
                        </td>
                        <td className="py-4">
                          <p className="font-medium text-gray-900 flex items-center gap-1">
                            {org.name}
                            <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                          </p>
                        </td>
                        <td className="py-4">
                          <p className="text-lg font-bold text-gray-900">{org.score?.toFixed(1) || '0.0'}</p>
                        </td>
                        <td className="py-4">
                          <span className={`rounded-lg border px-3 py-1 text-sm font-bold ${getRatingColor(org.rating)}`}>
                            {org.rating}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className="text-sm font-semibold text-green-700">
                            {org.environmental?.toFixed(0) || '0'}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className="text-sm font-semibold text-blue-700">
                            {org.social?.toFixed(0) || '0'}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className="text-sm font-semibold text-indigo-700">
                            {org.governance?.toFixed(0) || '0'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium"
                  onClick={() => navigate('/app/organizations')}
                >
                  Voir toutes les organisations
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
                {t('scores.noPerformers')}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
