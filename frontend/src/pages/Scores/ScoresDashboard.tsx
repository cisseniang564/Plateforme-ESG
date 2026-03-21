import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import { useESGScoring } from '@/hooks/useESGScoring';
import toast from 'react-hot-toast';

export default function ScoresDashboard() {
  const { t } = useTranslation();
  const { loading, getDashboard, recalculateAll } = useESGScoring();
  const [dashboard, setDashboard] = useState<any>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    loadDashboard();
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

  const handleRecalculateAll = async () => {
    if (!confirm(t('scores.recalculateConfirm'))) {
      return;
    }

    try {
      setRecalculating(true);
      setErrorMessage('');

      const result = await recalculateAll(12);

      if (result) {
        toast.success(t('scores.recalcSuccess'));
        await loadDashboard();
      } else {
        setErrorMessage(t('scores.recalcFailed'));
        toast.error(t('scores.recalcFailed'));
      }
    } catch (error) {
      console.error('Erreur recalcul des scores :', error);
      setErrorMessage(t('scores.recalcFailed'));
      toast.error(t('scores.recalcError'));
    } finally {
      setRecalculating(false);
    }
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

        <Card className="border border-dashed border-gray-300 bg-white">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Award className="h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">{t('scores.noScoresAvailable')}</h3>
            <p className="mt-2 max-w-md text-gray-600">
              {t('scores.noScoresHint')}
            </p>
            <Button onClick={handleRecalculateAll} className="mt-6" disabled={recalculating}>
              {recalculating ? <Spinner size="sm" /> : <Award className="mr-2 h-4 w-4" />}
              {t('scores.calculateScores')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                <Card key={item.title} className={`border-l-4 ${item.border}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-600">{item.title}</p>
                      <div className="mt-2 flex items-end gap-2">
                        <p className="text-3xl font-bold text-gray-900">{item.value}</p>
                        {item.suffix && <p className="pb-1 text-sm text-gray-500">{item.suffix}</p>}
                      </div>
                      <p className="mt-2 text-xs text-gray-500">{item.helper}</p>
                    </div>
                    <div className={`rounded-2xl p-3 ${item.iconWrap}`}>
                      <Icon className={`h-6 w-6 ${item.iconColor}`} />
                    </div>
                  </div>
                </Card>
              );
            })}
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

                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="text-sm text-amber-700">{t('scores.watchPoint')}</p>
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
              <Button variant="secondary" size="sm">
                <Download className="mr-2 h-4 w-4" />
                {t('scores.export')}
              </Button>
            </div>

            {dashboard?.top_performers?.length ? (
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
                      <tr key={org.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                            {index + 1}
                          </div>
                        </td>
                        <td className="py-4">
                          <p className="font-medium text-gray-900">{org.name}</p>
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
