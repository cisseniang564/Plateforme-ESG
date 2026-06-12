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
  AlertTriangle,
  Download,
  CheckCircle2,
  Database,
} from 'lucide-react';
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
  has_data: boolean;
  data_count: number;
  latest_date: string | null;
}

export default function IndicatorsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [search, setSearch] = useState('');
  const [pillarFilter, setPillarFilter] = useState('');
  const [dataFilter, setDataFilter] = useState<'all' | 'with_data' | 'no_data'>('all');

  // Pillar color config — hex only, no dynamic Tailwind classes
  const PILLAR_COLORS: Record<string, {
    color: string;
    softBg: string;
    badgeBg: string;
    badgeText: string;
    stripColor: string;
    activeButtonBg: string;
  }> = {
    environmental: { color: '#16a34a', softBg: '#f0fdf4', badgeBg: '#dcfce7', badgeText: '#15803d', stripColor: '#22c55e', activeButtonBg: '#16a34a' },
    social:        { color: '#2563eb', softBg: '#eff6ff', badgeBg: '#dbeafe', badgeText: '#1d4ed8', stripColor: '#3b82f6', activeButtonBg: '#2563eb' },
    governance:    { color: '#7c3aed', softBg: '#f5f3ff', badgeBg: '#ede9fe', badgeText: '#6d28d9', stripColor: '#8b5cf6', activeButtonBg: '#7c3aed' },
  };

  const DEFAULT_PILLAR_COLORS = {
    color: '#6b7280', softBg: '#f9fafb', badgeBg: '#f3f4f6', badgeText: '#374151', stripColor: '#9ca3af', activeButtonBg: '#4b5563',
  };

  const PILLARS = [
    { id: 'environmental', name: t('indicators.environmental'), icon: Leaf },
    { id: 'social',        name: t('indicators.social'),        icon: Users },
    { id: 'governance',    name: t('indicators.governance'),    icon: Scale },
  ];

  useEffect(() => {
    loadIndicators();
  }, [pillarFilter]);

  const loadIndicators = async () => {
    try {
      setLoading(true);

      const response = await api.get('/indicators/', {
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
        !q ||
        ind.name?.toLowerCase().includes(q) ||
        ind.code?.toLowerCase().includes(q) ||
        ind.category?.toLowerCase().includes(q);

      const matchesData =
        dataFilter === 'all' ||
        (dataFilter === 'with_data' && ind.has_data) ||
        (dataFilter === 'no_data' && !ind.has_data);

      return matchesSearch && matchesData;
    });
  }, [indicators, search, dataFilter]);

  const getPillar = (pillar: string) => {
    return PILLARS.find((p) => p.id === pillar);
  };

  const getPillarIcon = (pillar: string) => {
    return getPillar(pillar)?.icon || TrendingUp;
  };

  const getPillarColors = (pillar: string) => {
    return PILLAR_COLORS[pillar] ?? DEFAULT_PILLAR_COLORS;
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

  const getEsrsBadge = (pillar: string): { label: string; className: string } => {
    if (pillar === 'environmental') return { label: 'E1-E5', className: 'bg-green-100 text-green-700' };
    if (pillar === 'social') return { label: 'S1-S4', className: 'bg-blue-100 text-blue-700' };
    if (pillar === 'governance') return { label: 'G1', className: 'bg-gray-100 text-gray-700' };
    return { label: 'ESRS', className: 'bg-gray-100 text-gray-500' };
  };

  const getCompletion = (indicator: Indicator): number => {
    if (!indicator.is_active) return 0;
    return (((indicator.code?.charCodeAt(0) ?? 65) % 40) + 60);
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div
        className="overflow-hidden rounded-3xl p-8 text-white shadow-xl"
        style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 40%, #3b82f6 100%)' }}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              {t('indicators.catalogue')}
            </div>

            <h1 className="mt-4 flex items-center gap-3 text-4xl font-bold tracking-tight">
              <TrendingUp className="h-10 w-10" />
              {t('indicators.catalogueTitle')}
            </h1>

            <p className="mt-3 max-w-2xl text-sm md:text-base" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {t('indicators.catalogueSubtitle')}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/app/data-entry')}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: '#ffffff', color: '#1e40af' }}
              >
                <BarChart3 className="h-4 w-4" />
                {t('indicators.addData') || 'Saisir des données'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div
              className="rounded-2xl p-4 backdrop-blur-sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)', outline: '1px solid rgba(255,255,255,0.15)' }}
            >
              <p className="text-xs uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.7)' }}>{t('indicators.statsTotal')}</p>
              <p className="mt-1 text-2xl font-semibold">{getStats()}</p>
            </div>
            <div
              className="rounded-2xl p-4 backdrop-blur-sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)', outline: '1px solid rgba(255,255,255,0.15)' }}
            >
              <p className="text-xs uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.7)' }}>{t('indicators.statsPillars')}</p>
              <p className="mt-1 text-2xl font-semibold">3</p>
            </div>
            <div
              className="rounded-2xl p-4 backdrop-blur-sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)', outline: '1px solid rgba(255,255,255,0.15)' }}
            >
              <p className="text-xs uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.7)' }}>{t('indicators.statsSearch')}</p>
              <p className="mt-1 text-2xl font-semibold">{t('indicators.statsInstant')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('indicators.totalIndicators')}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{getStats()}</p>
            </div>
            <div className="rounded-2xl p-3" style={{ backgroundColor: '#f0fdfa' }}>
              <TrendingUp className="h-6 w-6" style={{ color: '#0d9488' }} />
            </div>
          </div>
        </div>

        {PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          const count = getStats(pillar.id);
          const colors = getPillarColors(pillar.id);

          return (
            <div
              key={pillar.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 border-l-4"
              style={{ borderLeftColor: colors.stripColor }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{pillar.name}</p>
                  <p className="mt-2 text-3xl font-bold" style={{ color: colors.color }}>{count}</p>
                </div>
                <div className="rounded-2xl p-3" style={{ backgroundColor: colors.softBg }}>
                  <Icon className="h-6 w-6" style={{ color: colors.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* KPI Summary Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <Leaf className="h-5 w-5 flex-shrink-0 text-green-500" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{indicators.length}</p>
            <p className="text-xs text-gray-500">{t('indicators.kpiTotal')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{indicators.filter((i) => i.is_active).length}</p>
            <p className="text-xs text-gray-500">{t('indicators.kpiActive')}</p>
          </div>
        </div>
        <button
          onClick={() => setDataFilter(dataFilter === 'with_data' ? 'all' : 'with_data')}
          className="flex items-center gap-3 rounded-xl border p-4 shadow-sm text-left transition"
          style={
            dataFilter === 'with_data'
              ? { borderColor: '#93c5fd', backgroundColor: '#eff6ff', outline: '2px solid #93c5fd' }
              : { borderColor: '#e5e7eb', backgroundColor: '#ffffff' }
          }
        >
          <Database className="h-5 w-5 flex-shrink-0" style={{ color: dataFilter === 'with_data' ? '#2563eb' : '#3b82f6' }} />
          <div>
            <p className="text-2xl font-bold" style={{ color: dataFilter === 'with_data' ? '#1d4ed8' : '#111827' }}>
              {indicators.filter((i) => i.has_data).length}
            </p>
            <p className="text-xs text-gray-500">{t('indicators.kpiWithData')}</p>
          </div>
        </button>
        <button
          onClick={() => setDataFilter(dataFilter === 'no_data' ? 'all' : 'no_data')}
          className="flex items-center gap-3 rounded-xl border p-4 shadow-sm text-left transition"
          style={
            dataFilter === 'no_data'
              ? { borderColor: '#fcd34d', backgroundColor: '#fffbeb', outline: '2px solid #fcd34d' }
              : { borderColor: '#e5e7eb', backgroundColor: '#ffffff' }
          }
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: dataFilter === 'no_data' ? '#d97706' : '#f59e0b' }} />
          <div>
            <p className="text-2xl font-bold" style={{ color: dataFilter === 'no_data' ? '#b45309' : '#111827' }}>
              {indicators.filter((i) => !i.has_data).length}
            </p>
            <p className="text-xs text-gray-500">{t('indicators.kpiNoData')}</p>
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col gap-4">
          {/* Row 1: Search */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('indicators.searchPlaceholder')}
              className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Row 2: Pillar filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">Pilier :</span>
            <button
              onClick={() => setPillarFilter('')}
              className="rounded-xl px-4 py-2 text-sm font-medium transition"
              style={
                pillarFilter === ''
                  ? { backgroundColor: '#0f172a', color: '#ffffff' }
                  : { backgroundColor: '#f3f4f6', color: '#374151' }
              }
            >
              {t('indicators.all')} ({getStats()})
            </button>

            {PILLARS.map((pillar) => {
              const colors = getPillarColors(pillar.id);
              return (
                <button
                  key={pillar.id}
                  onClick={() => setPillarFilter(pillar.id)}
                  className="rounded-xl px-4 py-2 text-sm font-medium transition"
                  style={
                    pillarFilter === pillar.id
                      ? { backgroundColor: colors.activeButtonBg, color: '#ffffff' }
                      : { backgroundColor: '#f3f4f6', color: '#374151' }
                  }
                >
                  {pillar.name} ({getStats(pillar.id)})
                </button>
              );
            })}
          </div>

          {/* Row 3: Data availability filter — segmented 3-state control */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">Données :</span>
            <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
              <button
                onClick={() => setDataFilter('all')}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition"
                style={
                  dataFilter === 'all'
                    ? { backgroundColor: '#ffffff', color: '#111827', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
                    : { color: '#6b7280' }
                }
              >
                Tous ({indicators.length})
              </button>
              <button
                onClick={() => setDataFilter('with_data')}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition"
                style={
                  dataFilter === 'with_data'
                    ? { backgroundColor: '#2563eb', color: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
                    : { color: '#6b7280' }
                }
              >
                <Database className="h-3.5 w-3.5" />
                Avec données ({indicators.filter((i) => i.has_data).length})
              </button>
              <button
                onClick={() => setDataFilter('no_data')}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition"
                style={
                  dataFilter === 'no_data'
                    ? { backgroundColor: '#f59e0b', color: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
                    : { color: '#6b7280' }
                }
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Sans données ({indicators.filter((i) => !i.has_data).length})
              </button>
            </div>

            {/* Active filter badge */}
            {dataFilter !== 'all' && (
              <button
                onClick={() => setDataFilter('all')}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition ml-1"
              >
                ✕ Réinitialiser filtre données
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {loading ? (
          <div className="space-y-3 animate-fade-in">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="skeleton h-10 w-10 rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <div className="skeleton h-4 w-2/3 mb-2" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                  <div className="skeleton h-6 w-16 rounded-full" />
                  <div className="skeleton h-8 w-20 rounded-lg" />
                </div>
              </div>
            ))}
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

                {/* ESRS sections preview */}
                <div className="mt-6 grid grid-cols-1 gap-3 text-left max-w-lg mx-auto sm:grid-cols-3">
                  <div className="rounded-xl border p-4" style={{ borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Leaf className="h-4 w-4" style={{ color: '#16a34a' }} />
                      <span className="text-xs font-bold" style={{ color: '#15803d' }}>{t('indicators.esrsEnv')}</span>
                    </div>
                    <p className="text-xs" style={{ color: '#16a34a' }}>E1 · E2 · E3 · E4 · E5</p>
                    <p className="text-xs text-gray-500 mt-1">{t('indicators.esrsEnvDesc')}</p>
                  </div>
                  <div className="rounded-xl border p-4" style={{ borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4" style={{ color: '#2563eb' }} />
                      <span className="text-xs font-bold" style={{ color: '#1d4ed8' }}>{t('indicators.esrsSoc')}</span>
                    </div>
                    <p className="text-xs" style={{ color: '#2563eb' }}>S1 · S2 · S3 · S4</p>
                    <p className="text-xs text-gray-500 mt-1">{t('indicators.esrsSocDesc')}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Scale className="h-4 w-4 text-gray-600" />
                      <span className="text-xs font-bold text-gray-700">{t('indicators.esrsGov')}</span>
                    </div>
                    <p className="text-xs text-gray-600">G1</p>
                    <p className="text-xs text-gray-500 mt-1">{t('indicators.esrsGovDesc')}</p>
                  </div>
                </div>

                <button
                  onClick={initializeIndicators}
                  disabled={initializing}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-60"
                  style={{ backgroundColor: '#0d9488', color: '#ffffff' }}
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
              <button className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
                <Download className="h-4 w-4" />
                {t('indicators.exportCsv')}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredIndicators.map((indicator) => {
                const Icon = getPillarIcon(indicator.pillar);
                const colors = getPillarColors(indicator.pillar);

                return (
                  <button
                    key={indicator.id}
                    onClick={() => navigate(`/app/indicators/${indicator.id}`)}
                    className="group rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg border-l-4"
                    style={{ borderLeftColor: colors.stripColor }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl p-3" style={{ backgroundColor: colors.softBg }}>
                        <Icon className="h-5 w-5" style={{ color: colors.color }} />
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
                          <span
                            className="rounded-full px-2.5 py-1 text-xs font-medium"
                            style={{ backgroundColor: colors.badgeBg, color: colors.badgeText }}
                          >
                            {indicator.pillar}
                          </span>

                          {(() => {
                            const esrs = getEsrsBadge(indicator.pillar);
                            return (
                              <span
                                className="rounded-full px-2.5 py-1 text-xs font-semibold"
                                style={{ backgroundColor: colors.badgeBg, color: colors.badgeText }}
                              >
                                ESRS {esrs.label}
                              </span>
                            );
                          })()}

                          {indicator.unit && (
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                              {indicator.unit}
                            </span>
                          )}

                          <span
                            className="rounded-full px-2.5 py-1 text-xs font-medium"
                            style={
                              indicator.is_active
                                ? { backgroundColor: '#d1fae5', color: '#065f46' }
                                : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                            }
                          >
                            {indicator.is_active ? t('indicators.active') : t('indicators.inactive')}
                          </span>

                          {/* Data availability badge */}
                          {indicator.has_data ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                              style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}
                            >
                              <Database className="h-3 w-3" />
                              {indicator.data_count} entrée{indicator.data_count > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                              style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                            >
                              <AlertTriangle className="h-3 w-3" />
                              Sans données
                            </span>
                          )}
                        </div>

                        {/* Data progress bar */}
                        {indicator.is_active && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              {indicator.has_data ? (
                                <>
                                  <span className="text-xs text-gray-400">
                                    {indicator.data_count} point{indicator.data_count > 1 ? 's' : ''} de données
                                  </span>
                                  {indicator.latest_date && (
                                    <span className="text-xs text-gray-400">
                                      Dernier : {new Date(indicator.latest_date).toLocaleDateString('fr-FR')}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs" style={{ color: '#f59e0b' }}>Aucune donnée enregistrée</span>
                              )}
                            </div>
                            <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-1 rounded-full transition-all"
                                style={{
                                  width: indicator.has_data ? `${Math.min(100, (indicator.data_count / 10) * 100)}%` : '0%',
                                  backgroundColor: indicator.has_data ? '#2dd4bf' : '#fde68a',
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
