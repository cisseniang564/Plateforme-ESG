import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  TrendingUp,
  Leaf,
  Users,
  Scale,
  ChevronRight,
  BarChart3,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface Indicator {
  id: string;
  code: string;
  name: string;
  pillar: string;
  category: string;
  unit: string;
  description: string;
  is_active: boolean;
}

export default function IndicatorsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [search, setSearch] = useState('');
  const [pillarFilter, setPillarFilter] = useState('');

  const PILLARS = [
    {
      id: 'environmental',
      name: t('indicators.environmental'),
      icon: Leaf,
      tone: {
        badge: 'bg-green-100 text-green-800',
        soft: 'bg-green-50',
        text: 'text-green-600',
        border: 'border-green-500',
        buttonActive: 'bg-green-600 text-white',
      },
    },
    {
      id: 'social',
      name: t('indicators.social'),
      icon: Users,
      tone: {
        badge: 'bg-blue-100 text-blue-800',
        soft: 'bg-blue-50',
        text: 'text-blue-600',
        border: 'border-blue-500',
        buttonActive: 'bg-blue-600 text-white',
      },
    },
    {
      id: 'governance',
      name: t('indicators.governance'),
      icon: Scale,
      tone: {
        badge: 'bg-purple-100 text-purple-800',
        soft: 'bg-purple-50',
        text: 'text-purple-600',
        border: 'border-purple-500',
        buttonActive: 'bg-purple-600 text-white',
      },
    },
  ];

  useEffect(() => {
    loadIndicators();
  }, [pillarFilter]);

  const loadIndicators = async () => {
    try {
      setLoading(true);

      const response = await api.get('/indicators', {
        params: pillarFilter ? { pillar: pillarFilter } : {},
      });

      const data = response.data;
      const items =
        Array.isArray(data) ? data :
        Array.isArray(data?.items) ? data.items :
        [];

      setIndicators(items);
    } catch (error: any) {
      console.error('Error loading indicators:', error);
      toast.error(t('indicators.errorLoading'));
      setIndicators([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredIndicators = useMemo(() => {
    const q = search.toLowerCase().trim();

    return indicators.filter((ind) => {
      const matchesSearch =
        ind.name?.toLowerCase().includes(q) ||
        ind.code?.toLowerCase().includes(q) ||
        ind.category?.toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [indicators, search]);

  const getPillar = (pillar: string) => {
    return PILLARS.find((p) => p.id === pillar);
  };

  const getPillarIcon = (pillar: string) => {
    return getPillar(pillar)?.icon || TrendingUp;
  };

  const getPillarTone = (pillar: string) => {
    return (
      getPillar(pillar)?.tone || {
        badge: 'bg-gray-100 text-gray-800',
        soft: 'bg-gray-50',
        text: 'text-gray-600',
        border: 'border-gray-300',
        buttonActive: 'bg-gray-600 text-white',
      }
    );
  };

  const initializeIndicators = async () => {
    setInitializing(true);
    try {
      await api.post('/onboarding/setup', { org_name: 'Mon Organisation', sector: 'general' });
      toast.success(t('indicators.initSuccess'));
      await loadIndicators();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('indicators.initError'));
    } finally {
      setInitializing(false);
    }
  };

  const getStats = (pillar?: string) => {
    if (pillar) {
      return indicators.filter((i) => i.pillar === pillar).length;
    }
    return indicators.length;
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-900 to-emerald-700 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15">
              <BarChart3 className="h-3.5 w-3.5" />
              {t('indicators.catalogue')}
            </div>

            <h1 className="mt-4 flex items-center gap-3 text-4xl font-bold tracking-tight">
              <TrendingUp className="h-10 w-10" />
              {t('indicators.catalogueTitle')}
            </h1>

            <p className="mt-3 max-w-2xl text-sm text-white/80 md:text-base">
              {t('indicators.catalogueSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">{t('indicators.statsTotal')}</p>
              <p className="mt-1 text-2xl font-semibold">{getStats()}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">{t('indicators.statsPillars')}</p>
              <p className="mt-1 text-2xl font-semibold">3</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">{t('indicators.statsSearch')}</p>
              <p className="mt-1 text-2xl font-semibold">{t('indicators.statsInstant')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('indicators.totalIndicators')}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{getStats()}</p>
            </div>
            <div className="rounded-2xl bg-teal-50 p-3">
              <TrendingUp className="h-6 w-6 text-teal-600" />
            </div>
          </div>
        </Card>

        {PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          const count = getStats(pillar.id);

          return (
            <Card
              key={pillar.id}
              className={`border border-gray-200 shadow-sm border-l-4 ${pillar.tone.border}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{pillar.name}</p>
                  <p className={`mt-2 text-3xl font-bold ${pillar.tone.text}`}>{count}</p>
                </div>
                <div className={`rounded-2xl p-3 ${pillar.tone.soft}`}>
                  <Icon className={`h-6 w-6 ${pillar.tone.text}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="border border-gray-200 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('indicators.searchPlaceholder')}
                className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPillarFilter('')}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                pillarFilter === ''
                  ? 'bg-slate-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('indicators.all')} ({getStats()})
            </button>

            {PILLARS.map((pillar) => (
              <button
                key={pillar.id}
                onClick={() => setPillarFilter(pillar.id)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  pillarFilter === pillar.id
                    ? pillar.tone.buttonActive
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {pillar.name} ({getStats(pillar.id)})
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* List */}
      <Card className="border border-gray-200 shadow-sm">
        {loading ? (
          <div className="flex justify-center py-14">
            <Spinner size="lg" />
          </div>
        ) : filteredIndicators.length === 0 ? (
          <div className="py-16 text-center">
            <TrendingUp className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <p className="text-xl font-semibold text-gray-900">{t('indicators.noResults')}</p>
            {search ? (
              <p className="mt-2 text-gray-600">{t('indicators.noResultsHint')}</p>
            ) : (
              <>
                <p className="mt-2 text-gray-500 max-w-md mx-auto">
                  {t('indicators.emptyCatalogue')}
                </p>
                <button
                  onClick={initializeIndicators}
                  disabled={initializing}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors disabled:opacity-60"
                >
                  {initializing
                    ? <><RefreshCw className="h-4 w-4 animate-spin" />{t('indicators.initializing')}</>
                    : <><Sparkles className="h-4 w-4" />{t('indicators.initCatalogue')}</>
                  }
                </button>
                <p className="mt-3 text-xs text-gray-400">
                  {t('indicators.initNote')}
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('indicators.listTitle')}</h2>
                <p className="text-sm text-gray-500">
                  {t('indicators.resultsCount', { count: filteredIndicators.length })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredIndicators.map((indicator) => {
                const Icon = getPillarIcon(indicator.pillar);
                const tone = getPillarTone(indicator.pillar);

                return (
                  <button
                    key={indicator.id}
                    onClick={() => navigate(`/app/indicators/${indicator.id}`)}
                    className={`group rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${tone.border} border-l-4`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`rounded-2xl p-3 ${tone.soft}`}>
                        <Icon className={`h-5 w-5 ${tone.text}`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-mono uppercase tracking-wide text-gray-500">
                              {indicator.code}
                            </p>
                            <h3 className="mt-1 truncate text-base font-semibold text-gray-900">
                              {indicator.name}
                            </h3>
                          </div>

                          <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300 transition group-hover:text-gray-500" />
                        </div>

                        {indicator.category && (
                          <p className="mt-2 text-sm text-gray-600">{indicator.category}</p>
                        )}

                        {indicator.description && (
                          <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                            {indicator.description}
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone.badge}`}>
                            {indicator.pillar}
                          </span>

                          {indicator.unit && (
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                              {indicator.unit}
                            </span>
                          )}

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              indicator.is_active
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {indicator.is_active ? t('indicators.active') : t('indicators.inactive')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
