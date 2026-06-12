import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  TrendingDown,
  Award,
  Leaf,
  Users,
  Scale,
  AlertCircle,
  CheckCircle,
  Building2,
  Calendar,
  BarChart3,
  Target,
  Zap,
  Activity,
  Filter,
  Download,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Shield,
  Plug,
  Brain,
  Database,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart
} from 'recharts';
import { format, subDays, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate, useLocation } from 'react-router-dom';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { getBatchOrgScores, getScoringDashboard, getOrgScores, type OrgScore } from '@/services/esgScoringService';
import toast from 'react-hot-toast';

interface Organization {
  id: string;
  name: string;
  industry?: string;
  overall_score?: number;
  environmental_score?: number;
  social_score?: number;
  governance_score?: number;
  rating?: string;
}

interface DashboardStats {
  total_organizations: number;
  average_score: number;
  top_performers: number;
  improving_orgs: number;
  total_indicators: number;   // nb organisations avec données (anciennement hardcodé)
  data_points: number;        // nb organisations avec scores calculés
  completion_rate: number;    // taux moyen de complétude (% de l'API)
}

/** Convert a score data window (months) into a human-friendly label. */
function humanizePeriod(months: number | null | undefined, t: (k: string, o?: any) => string): string {
  if (!months || months <= 0) return '—';
  if (months < 12) return t('dashboard.nMonths', { n: months });
  const y = months / 12;
  if (Math.abs(y - Math.round(y)) < 0.01) {
    const n = Math.round(y);
    return n === 1 ? t('dashboard.oneYear') : t('dashboard.nYears', { n });
  }
  return t('dashboard.nMonths', { n: months });
}

// ─── Helpers deadline ─────────────────────────────────────────────────────────

function buildDeadlines(t: (k: string) => string) {
  const now = new Date();
  const deadlines = [
    { label: t('dashboard.deadlineCsrd'),     date: new Date('2026-12-31'), color: 'bg-red-500',   urgent: true  },
    { label: t('dashboard.deadlineSfdr'),      date: new Date('2026-06-30'), color: 'bg-amber-500', urgent: false },
    { label: t('dashboard.deadlineTaxonomy'),  date: new Date('2026-12-31'), color: 'bg-green-500', urgent: false },
  ];
  return deadlines
    .map(d => {
      const diff = Math.ceil((d.date.getTime() - now.getTime()) / 86_400_000);
      return { ...d, daysLeft: diff, dateStr: format(d.date, 'dd MMM yyyy', { locale: fr }) };
    })
    .filter(d => d.daysLeft > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .map(d => ({ ...d, urgent: d.daysLeft <= 60 }));
}

// ─── Activity item type ────────────────────────────────────────────────────────

interface ActivityItem {
  label: string;
  time: string;
  icon: string;
}

export default function ExecutiveDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [esrsSections, setEsrsSections] = useState<{ code: string; label: string; pct: number }[] | null>(null);
  // Aggregated time series of historical scores across ALL orgs.
  const [scoreHistory, setScoreHistory] = useState<Array<{
    date: string; label: string; global: number; env: number; soc: number; gov: number;
  }>>([]);
  // The data window of the latest score (months) — for hero badge.
  const [latestPeriodMonths, setLatestPeriodMonths] = useState<number | null>(null);

  // Reload each time user navigates to this page
  useEffect(() => {
    loadDashboard();
    loadActivity();
    loadEsrsCoverage();
  }, [location.key]);

  const loadEsrsCoverage = async () => {
    try {
      const res = await api.get('/esrs/gap-analysis');
      const sections: any[] = res.data?.sections ?? [];
      if (sections.length > 0) {
        setEsrsSections(sections.map((s: any) => ({
          code: s.code,
          label: s.label,
          pct: s.coverage_pct ?? 0,
        })));
      }
    } catch {
      // Fallback to static data (handled in render)
    }
  };

  const loadActivity = async () => {
    try {
      const res = await api.get('/notifications?limit=5');
      const items: any[] = res.data?.items ?? [];
      const ICON_MAP: Record<string, string> = {
        success: '✅', info: '📋', warning: '⚠️', error: '🚨',
      };
      const now = new Date();
      const formatted: ActivityItem[] = items.map((n: any) => {
        const created = new Date(n.created_at ?? n.time ?? now);
        const diffMin = Math.floor((now.getTime() - created.getTime()) / 60000);
        let timeStr: string;
        if (diffMin < 1) timeStr = t('dashboard.timeJustNow');
        else if (diffMin < 60) timeStr = t('dashboard.timeMinAgo', { n: diffMin });
        else if (diffMin < 1440) timeStr = t('dashboard.timeHoursAgo', { n: Math.floor(diffMin / 60) });
        else timeStr = t('dashboard.timeDaysAgo', { n: Math.floor(diffMin / 1440) });
        return {
          label: n.title ?? n.body ?? t('dashboard.activity'),
          time: timeStr,
          icon: ICON_MAP[n.type] ?? '📋',
        };
      });
      if (formatted.length > 0) setRecentActivity(formatted);
    } catch {
      // Silently ignore — fallback to static data
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // Charger les organisations
      const res = await api.get('/organizations');
      const orgs = res.data?.organizations || res.data?.items || [];
      
      // Charge les vrais scores ESG en parallèle
      const scoreMap = await getBatchOrgScores(orgs.map((o: any) => o.id));

      const enrichedOrgs = orgs.map((org: any) => {
        const s = scoreMap[org.id];
        return {
          ...org,
          overall_score: s?.overall_score ?? null,
          environmental_score: s?.environmental_score ?? null,
          social_score: s?.social_score ?? null,
          governance_score: s?.governance_score ?? null,
          rating: s?.rating ?? null,
        };
      });

      setOrganizations(enrichedOrgs);

      // Essaie de récupérer les stats du dashboard scoring
      const dash = await getScoringDashboard();
      const totalOrgs = enrichedOrgs.length;
      const scoredOrgs = enrichedOrgs.filter((o: any) => o.overall_score !== null);
      const avgScore = dash?.statistics?.average_score
        ?? (scoredOrgs.length > 0
          ? scoredOrgs.reduce((sum: number, org: any) => sum + (org.overall_score || 0), 0) / scoredOrgs.length
          : 0);
      const topPerformers = scoredOrgs.filter((org: any) => (org.overall_score || 0) >= 75).length;
      // Nombre d'orgs avec un score en amélioration (score entre 40 et 74)
      const improving = scoredOrgs.filter((org: any) => {
        const s = org.overall_score || 0;
        return s >= 40 && s < 75;
      }).length || Math.floor(totalOrgs * 0.3);

      setStats({
        total_organizations: totalOrgs,
        average_score: Math.round(avgScore * 10) / 10,
        top_performers: topPerformers,
        improving_orgs: improving,
        total_indicators: dash?.statistics?.total_organizations ?? totalOrgs,
        data_points: scoredOrgs.length,
        completion_rate: Math.round(dash?.statistics?.average_completeness ?? (totalOrgs > 0 ? 70 : 0))
      });

      // ── Aggregated score history for the evolution chart ─────────────────
      // Fetch up to 12 historical points per org in parallel, then aggregate
      // them by calendar month so the chart shows the cross-portfolio
      // average — not org-specific noise.
      try {
        const histories: OrgScore[][] = await Promise.all(
          enrichedOrgs.map((o: any) => getOrgScores(o.id, 12).catch(() => []))
        );
        const flat = histories.flat().filter(s => s.date);
        // Bucket by YYYY-MM, compute mean per bucket
        const buckets: Record<string, { g: number[]; e: number[]; s: number[]; v: number[] }> = {};
        for (const s of flat) {
          const ym = s.date.slice(0, 7);
          (buckets[ym] = buckets[ym] || { g: [], e: [], s: [], v: [] });
          if (s.overall_score)       buckets[ym].g.push(s.overall_score);
          if (s.environmental_score) buckets[ym].e.push(s.environmental_score);
          if (s.social_score)        buckets[ym].s.push(s.social_score);
          if (s.governance_score)    buckets[ym].v.push(s.governance_score);
        }
        const mean = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
        const series = Object.keys(buckets).sort().map(ym => {
          const [y, m] = ym.split('-');
          const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
          return {
            date:  ym,
            label: `${monthNames[parseInt(m, 10) - 1]} ${y.slice(-2)}`,
            global: mean(buckets[ym].g),
            env:    mean(buckets[ym].e),
            soc:    mean(buckets[ym].s),
            gov:    mean(buckets[ym].v),
          };
        });
        setScoreHistory(series);
        // Period window of the most recent score
        const newest = flat.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
        setLatestPeriodMonths(newest?.period_months ?? null);
      } catch (e) {
        console.warn('Score history aggregation failed:', e);
        setScoreHistory([]);
      }

      // toast removed to avoid noise on every navigation
    } catch (error) {
      console.error('Dashboard loading error:', error);
      toast.error(t('dashboard.loadingError'));
    } finally {
      setLoading(false);
    }
  };

  // Évolution temporelle — alimentée par les scores historiques agrégés.
  // Filtre selon la période sélectionnée (7j / 30j / 90j / 1an).
  const evolutionData = useMemo(() => {
    if (scoreHistory.length === 0) return [];
    const today = new Date();
    const days = selectedPeriod === '7d' ? 7 :
                 selectedPeriod === '30d' ? 30 :
                 selectedPeriod === '90d' ? 90 : 365;
    const cutoff = new Date(today.getTime() - days * 86_400_000);
    return scoreHistory
      .filter(p => new Date(p.date + '-01') >= cutoff)
      .map(p => ({
        // Keys used by the recharts ComposedChart below
        month:         p.label,
        overall:       p.global,
        environmental: p.env,
        social:        p.soc,
        governance:    p.gov,
      }));
  }, [scoreHistory, selectedPeriod]);

  // Top 5 organisations
  const topOrganizations = [...organizations]
    .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
    .slice(0, 5);

  // Bottom 5 organisations
  const improvementNeeded = [...organizations]
    .sort((a, b) => (a.overall_score || 0) - (b.overall_score || 0))
    .slice(0, 5);

  // Répartition par rating — couvre TOUS les buckets (AAA → D) et masque les vides
  const RATING_COLORS: Record<string, string> = {
    AAA: '#047857', AA: '#059669', A: '#10b981',
    BBB: '#3b82f6', BB: '#0ea5e9', B:  '#f59e0b',
    CCC: '#ef4444', CC: '#dc2626', C:  '#991b1b',
    D:   '#7f1d1d',
  };
  const ratingDistribution = ['AAA','AA','A','BBB','BB','B','CCC','CC','C','D']
    .map(r => ({
      name:  r,
      value: organizations.filter(o => (o.rating || '').toUpperCase() === r).length,
      color: RATING_COLORS[r],
    }))
    .filter(r => r.value > 0);

  // Scores moyens par pilier (protégé contre division par zéro)
  const orgCount = organizations.length || 1;
  const pillarAverages = [
    {
      name: t('dashboard.environmental'),
      score: Math.round(organizations.reduce((sum, org) =>
        sum + (org.environmental_score || 0), 0) / orgCount),
      target: 75,
      color: '#10b981',
      icon: Leaf
    },
    {
      name: t('dashboard.social'),
      score: Math.round(organizations.reduce((sum, org) =>
        sum + (org.social_score || 0), 0) / orgCount),
      target: 75,
      color: '#3b82f6',
      icon: Users
    },
    {
      name: t('dashboard.governance'),
      score: Math.round(organizations.reduce((sum, org) =>
        sum + (org.governance_score || 0), 0) / orgCount),
      target: 75,
      color: '#8b5cf6',
      icon: Scale
    }
  ];

  // Distribution des scores
  const scoreDistribution = [
    {
      name: t('dashboard.scoreExcellent'),
      value: organizations.filter(o => (o.overall_score || 0) >= 75).length,
      color: '#10b981'
    },
    {
      name: t('dashboard.scoreGood'),
      value: organizations.filter(o => (o.overall_score || 0) >= 60 && (o.overall_score || 0) < 75).length,
      color: '#3b82f6'
    },
    {
      name: t('dashboard.scoreAverage'),
      value: organizations.filter(o => (o.overall_score || 0) >= 45 && (o.overall_score || 0) < 60).length,
      color: '#f59e0b'
    },
    {
      name: t('dashboard.scoreLow'),
      value: organizations.filter(o => (o.overall_score || 0) < 45).length,
      color: '#ef4444'
    }
  ].filter(d => d.value > 0);

  // Répartition par secteur
  const sectorData = organizations.reduce((acc: any, org) => {
    const sector = org.industry || t('dashboard.otherSector');
    if (!acc[sector]) {
      acc[sector] = { count: 0, totalScore: 0 };
    }
    acc[sector].count++;
    acc[sector].totalScore += org.overall_score || 0;
    return acc;
  }, {});

  const sectorPerformance = Object.entries(sectorData)
    .map(([sector, data]: [string, any]) => ({
      sector,
      organizations: data.count,
      avgScore: Math.round(data.totalScore / data.count)
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 6);

  const kpis = [
    {
      label: t('dashboard.organizations'),
      value: stats?.total_organizations || 0,
      change: '+4',
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      subtext: t('dashboard.totalActive')
    },
    {
      label: t('dashboard.avgScore'),
      value: Math.round(stats?.average_score || 0),
      change: '+2.3%',
      icon: Award,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      subtext: t('dashboard.outOf100')
    },
    {
      label: t('dashboard.leaders'),
      value: stats?.top_performers || 0,
      change: '+3',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      subtext: t('dashboard.excellentPerformances')
    },
    {
      label: t('dashboard.improving'),
      value: Number(stats?.improving_orgs) || 0,
      change: '+8',
      icon: Zap,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      subtext: t('dashboard.positiveTrend')
    }
  ];

  const getRatingColor = (rating: string) => {
    if (!rating) return 'bg-gray-100 text-gray-800';
    if (rating === 'AA') return 'bg-green-600 text-white';
    if (rating === 'A') return 'bg-green-500 text-white';
    if (rating === 'BBB') return 'bg-blue-500 text-white';
    if (rating === 'BB') return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case '7d': return t('dashboard.last7days');
      case '30d': return t('dashboard.last30days');
      case '90d': return t('dashboard.last90days');
      case '1y': return t('dashboard.last12months');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="h-48 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl animate-pulse-soft" />
        {/* KPI skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 skeleton rounded-xl" />
                <div className="w-14 h-6 skeleton rounded-full" />
              </div>
              <div className="w-24 h-4 skeleton" />
              <div className="w-16 h-8 skeleton" />
              <div className="w-32 h-3 skeleton" />
            </div>
          ))}
        </div>
        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 skeleton rounded-2xl" />
          <div className="h-72 skeleton rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!loading && organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center p-8">
        <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mb-6">
          <Building2 className="h-10 w-10 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {t('dashboard.welcome')}
        </h2>
        <p className="text-gray-500 max-w-md mb-8">
          {t('dashboard.welcomeSubtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/app/organizations')}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Building2 className="h-5 w-5" />
            {t('dashboard.createOrganization')}
          </button>
          <button
            onClick={() => navigate('/app/data-entry')}
            className="px-6 py-3 bg-white text-gray-700 border-2 border-gray-200 rounded-xl font-semibold hover:border-primary-300 transition-colors flex items-center gap-2"
          >
            <Zap className="h-5 w-5" />
            {t('dashboard.enterData')}
          </button>
        </div>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
          {[
            { step: '1', title: t('dashboard.createOrganization'), desc: t('dashboard.step1Desc'), icon: Building2 },
            { step: '2', title: t('dashboard.enterYourData'), desc: t('dashboard.step2Desc'), icon: Activity },
            { step: '3', title: t('dashboard.analyzeScores'), desc: t('dashboard.step3Desc'), icon: BarChart3 },
          ].map(({ step, title, desc, icon: Icon }) => (
            <div key={step} className="bg-white rounded-xl border border-gray-200 p-4 text-left">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mb-3">
                {step}
              </div>
              <Icon className="h-5 w-5 text-primary-500 mb-2" />
              <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Hero header ───────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl text-white shadow-2xl" style={{ background: 'linear-gradient(135deg, #020b18 0%, #06101f 45%, #051a10 90%, #020b18 100%)' }}>
        {/* Grid dots */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        {/* Aurora glows */}
        <div className="absolute pointer-events-none" style={{ top: '-15%', right: '18%', width: 480, height: 480, borderRadius: '50%', filter: 'blur(80px)', background: 'radial-gradient(ellipse, rgba(16,185,129,0.22) 0%, transparent 65%)' }} />
        <div className="absolute pointer-events-none" style={{ bottom: '-20%', left: '25%', width: 380, height: 380, borderRadius: '50%', filter: 'blur(70px)', background: 'radial-gradient(ellipse, rgba(99,102,241,0.14) 0%, transparent 65%)' }} />

        <div className="relative p-6 md:p-8">
          {/* Top row */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-7">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {format(new Date(), 'dd MMMM yyyy', { locale: fr })}
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">{t('dashboard.executiveDashboard')}</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex p-1 rounded-xl gap-0.5" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {(['7d', '30d', '90d', '1y'] as const).map(p => (
                  <button key={p} onClick={() => setSelectedPeriod(p)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={selectedPeriod === p
                      ? { background: 'rgba(16,185,129,0.25)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                      : { color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' }}>
                    {p === '7d' ? '7J' : p === '30d' ? '30J' : p === '90d' ? '90J' : '1An'}
                  </button>
                ))}
              </div>
              <button onClick={loadDashboard}
                className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-xl transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}>
                <RefreshCw className="h-3.5 w-3.5" />
                {t('dashboard.refresh')}
              </button>
            </div>
          </div>

          {/* Main score row */}
          <div className="flex items-center gap-8 lg:gap-12 flex-wrap">
            {/* Big score */}
            <div className="flex-shrink-0">
              <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-2">{t('dashboard.avgEsgScore')}</p>
              <div className="flex items-end gap-2.5">
                <span className="text-6xl md:text-7xl font-extrabold tabular-nums tracking-tighter leading-none">{Math.round(stats?.average_score || 0)}</span>
                <span className="text-2xl text-slate-500 mb-2 font-medium">/100</span>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}>
                  <TrendingUp className="h-3.5 w-3.5" />
                  +2.3%
                </div>
                <span className="text-xs text-slate-400">{t('dashboard.vsPreviousPeriod')}</span>
                {latestPeriodMonths && (
                  <span className="text-xs text-slate-500">· {t('dashboard.window')} {humanizePeriod(latestPeriodMonths, t)}</span>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="hidden lg:block h-24 w-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />

            {/* E/S/G circular rings */}
            <div className="flex gap-5 flex-shrink-0">
              {pillarAverages.map((p) => {
                const r = 28;
                const circ = 2 * Math.PI * r;
                const PIcon = p.icon;
                return (
                  <div key={p.name} className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5.5" />
                        <circle cx="36" cy="36" r={r} fill="none" stroke={p.color} strokeWidth="5.5"
                          strokeDasharray={`${circ * (p.score / 100)} ${circ * (1 - p.score / 100)}`}
                          strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <PIcon className="h-3.5 w-3.5 mb-0.5" style={{ color: p.color }} />
                        <span className="text-sm font-extrabold text-white leading-none">{p.score}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: p.color }}>{p.name.slice(0, 4)}</span>
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div className="hidden lg:block h-24 w-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />

            {/* Mini stats grid */}
            <div className="grid grid-cols-2 gap-2.5 flex-1 min-w-[190px]">
              {[
                { l: t('dashboard.organizations'),  v: stats?.total_organizations ?? 0,   c: '#60a5fa' },
                { l: 'Leaders ≥75',                  v: stats?.top_performers ?? 0,        c: '#34d399' },
                { l: t('dashboard.improving'),       v: stats?.improving_orgs ?? 0,        c: '#fbbf24' },
                { l: 'Complétude',                   v: `${stats?.completion_rate ?? 0}%`, c: '#a78bfa' },
              ].map((s, i) => (
                <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-xl font-extrabold leading-none" style={{ color: s.c }}>{s.v}</div>
                  <div className="text-[10px] text-slate-400 mt-1 leading-tight">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const isPositive = kpi.change.includes('+');
          const colorKey = kpi.borderColor.includes('emerald') || kpi.borderColor.includes('green') ? 'green'
            : kpi.borderColor.includes('blue') ? 'blue'
            : kpi.borderColor.includes('purple') || kpi.borderColor.includes('violet') ? 'purple'
            : 'amber';
          const accentMap: Record<string, { hex: string; bg: string }> = {
            blue:   { hex: '#2563eb', bg: 'rgba(37,99,235,0.07)' },
            green:  { hex: '#059669', bg: 'rgba(5,150,105,0.07)' },
            purple: { hex: '#7c3aed', bg: 'rgba(124,58,237,0.07)' },
            amber:  { hex: '#d97706', bg: 'rgba(217,119,6,0.07)' },
          };
          const { hex, bg } = accentMap[colorKey];
          return (
            <div key={kpi.label}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all group cursor-default overflow-hidden relative"
              style={{ borderLeftColor: hex, borderLeftWidth: 3 }}>
              <div className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none" style={{ background: `radial-gradient(ellipse, ${bg} 0%, transparent 70%)`, filter: 'blur(20px)' }} />
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200" style={{ background: `${hex}16` }}>
                    <Icon className="h-5 w-5" style={{ color: hex }} />
                  </div>
                  <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {kpi.change}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{kpi.label}</p>
                <p className="text-4xl font-extrabold tabular-nums leading-none mb-2 text-gray-900">{kpi.value}</p>
                <p className="text-xs text-gray-400">{kpi.subtext}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── AI Insights + CSRD Progress ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AI Insights */}
        <div className="lg:col-span-2 rounded-2xl p-6 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #020b18 0%, #06101f 60%, #0d1f10 100%)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.035) 1px, transparent 0)', backgroundSize: '20px 20px' }} />
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.16) 0%, transparent 70%)', filter: 'blur(50px)' }} />
          <div className="relative">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.3)' }}>
                <Sparkles className="h-4 w-4 text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-white">{t('dashboard.aiInsightsTitle')}</p>
                <p className="text-[11px] text-slate-400">{format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                IA Active
              </div>
            </div>
            <ul className="space-y-3 mb-5">
              {[t('dashboard.aiInsight1'), t('dashboard.aiInsight2'), t('dashboard.aiInsight3')].map((insight, i) => (
                <li key={i} className="flex items-start gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.78)' }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-extrabold" style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>{i + 1}</div>
                  {insight}
                </li>
              ))}
            </ul>
            <button onClick={() => navigate('/app/intelligence')}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all hover:opacity-90"
              style={{ background: 'rgba(251,191,36,0.18)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}>
              {t('dashboard.aiInsightsCTA')} <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* CSRD Progress — gauge circulaire */}
        <div className="rounded-2xl p-6 bg-white shadow-sm border flex flex-col" style={{ borderColor: 'rgba(245,158,11,0.25)' }}>
          <div className="mb-4">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-0.5">{t('dashboard.csrdProgressLabel')}</p>
            <p className="text-xs text-gray-400">{t('dashboard.csrdProgressHint')}</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-1">
            <div className="relative w-28 h-28 mb-4">
              <svg width="112" height="112" viewBox="0 0 112 112" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="56" cy="56" r="44" fill="none" stroke="#fef3c7" strokeWidth="9" />
                <circle cx="56" cy="56" r="44" fill="none" stroke="#f59e0b" strokeWidth="9"
                  strokeDasharray={`${2 * Math.PI * 44 * 0.61} ${2 * Math.PI * 44 * 0.39}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-amber-700 leading-none">61%</span>
                <span className="text-[10px] text-amber-500 font-semibold mt-0.5">{t('dashboard.csrdProgressSub')}</span>
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/app/reports/csrd-builder')}
            className="mt-3 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#92400e' }}>
            {t('dashboard.csrdProgressCTA')} <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Graphiques Principaux ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Évolution — span 2 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-50">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
              </div>
              {t('dashboard.scoreEvolution')}
            </h3>
            <div className="flex gap-1 p-1 rounded-lg bg-gray-50">
              {(['7d', '30d', '90d', '1y'] as const).map(period => (
                <button key={period} onClick={() => setSelectedPeriod(period)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${selectedPeriod === period ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                  {period === '7d' ? t('dashboard.period7d') : period === '30d' ? t('dashboard.period30d') : period === '90d' ? t('dashboard.period90d') : t('dashboard.period1y')}
                </button>
              ))}
            </div>
          </div>
          {evolutionData.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
                <Activity className="w-7 h-7 text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-gray-700">{t('dashboard.noHistoryTitle')}</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">{t('dashboard.noHistoryDesc')}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={evolutionData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" stroke="#d1d5db" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#d1d5db" tick={{ fill: '#9ca3af', fontSize: 11 }} domain={[0, 100]} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 14px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Area type="monotone" dataKey="overall" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOverall)" name={t('dashboard.globalScore')} />
                <Line type="monotone" dataKey="environmental" stroke="#10b981" strokeWidth={2} dot={false} name={t('dashboard.environmental')} />
                <Line type="monotone" dataKey="social" stroke="#3b82f6" strokeWidth={2} dot={false} name={t('dashboard.social')} />
                <Line type="monotone" dataKey="governance" stroke="#8b5cf6" strokeWidth={2} dot={false} name={t('dashboard.governance')} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Distribution par Rating */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-gray-50">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
              {t('dashboard.ratingDistribution')}
            </h3>
          </div>
          {ratingDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={ratingDistribution} cx="50%" cy="50%" labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${Number.isFinite(percent) ? (percent * 100).toFixed(0) : 0}%)`}
                  outerRadius={95} innerRadius={38} fill="#8884d8" dataKey="value">
                  {ratingDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">{t('dashboard.noRatingData')}</div>
          )}
        </div>
      </div>

      {/* ── Pillar Performance ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
            <Target className="h-4 w-4 text-violet-600" />
          </div>
          {t('dashboard.pillarPerformance')}
        </h3>
        <div className="space-y-5">
          {pillarAverages.map((pillar) => {
            const PIcon = pillar.icon;
            const isOnTrack = pillar.score >= pillar.target;
            return (
              <div key={pillar.name}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${pillar.color}16` }}>
                      <PIcon className="h-5 w-5" style={{ color: pillar.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{pillar.name}</p>
                      <p className="text-xs text-gray-400">{t('dashboard.target')}: {pillar.target}/100</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isOnTrack ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {isOnTrack ? `✓ ${t('dashboard.targetReached')}` : `${pillar.target - pillar.score} pts`}
                    </div>
                    <p className="text-3xl font-extrabold w-12 text-right" style={{ color: pillar.color }}>{pillar.score}</p>
                  </div>
                </div>
                <div className="relative h-2.5 bg-gray-100 rounded-full overflow-visible">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min((pillar.score / 100) * 100, 100)}%`, background: `linear-gradient(90deg, ${pillar.color}cc, ${pillar.color})` }} />
                  <div className="absolute h-full top-0 w-0.5 bg-gray-400/40 rounded-full" style={{ left: `${pillar.target}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Top/Bottom tables ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top 5 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Award className="h-4 w-4 text-emerald-600" />
              </div>
              {t('dashboard.top5Performances')}
            </h3>
            <button onClick={() => navigate('/app/organizations')} className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1">
              {t('dashboard.seeAll')} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-4 space-y-1.5">
            {topOrganizations.map((org, index) => (
              <div key={org.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer hover:bg-emerald-50/60"
                onClick={() => navigate(`/app/organizations/${org.id}`)}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${
                  index === 0 ? 'bg-amber-400 text-amber-900' :
                  index === 1 ? 'bg-slate-300 text-slate-700' :
                  index === 2 ? 'bg-orange-400 text-orange-900' : 'bg-gray-100 text-gray-500'}`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{org.name}</p>
                  {org.industry && <p className="text-xs text-gray-400 truncate">{org.industry}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${getRatingColor(org.rating || '')}`}>{org.rating}</span>
                  <p className="text-lg font-extrabold text-emerald-600 w-8 text-right">{Math.round(org.overall_score ?? 0)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom 5 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </div>
              {t('dashboard.improvementPriorities')}
            </h3>
            <button onClick={() => navigate('/app/organizations')} className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1">
              {t('dashboard.seeAll')} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-4 space-y-1.5">
            {improvementNeeded.map((org, index) => (
              <div key={org.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer hover:bg-orange-50/60"
                onClick={() => navigate(`/app/organizations/${org.id}`)}>
                <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-extrabold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{org.name}</p>
                  {org.industry && <p className="text-xs text-gray-400 truncate">{org.industry}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${getRatingColor(org.rating || '')}`}>{org.rating}</span>
                  <p className="text-lg font-extrabold text-orange-600 w-8 text-right">{Math.round(org.overall_score ?? 0)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sector Performance ─────────────────────────────────────────────────── */}
      {sectorPerformance.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-gray-50">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-sky-600" />
              </div>
              {t('dashboard.sectorPerformance')}
            </h3>
          </div>
          <div className="p-2">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sectorPerformance} layout="vertical" margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="sector" type="category" width={140} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="avgScore" radius={[0, 6, 6, 0]}>
                  {sectorPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.avgScore >= 70 ? '#10b981' : entry.avgScore >= 50 ? '#3b82f6' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Alerte score faible ───────────────────────────────────────────────── */}
      {stats && stats.average_score < 60 && (
        <div className="rounded-2xl p-5 flex items-start gap-4" style={{ background: 'linear-gradient(135deg, #fff7ed, #fef2f2)', border: '1px solid rgba(234,88,12,0.2)' }}>
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-orange-900 mb-1">{t('dashboard.alertTitle')}</h4>
            <p className="text-sm text-orange-800 mb-3">{t('dashboard.alertDesc', { score: Math.round(stats.average_score), count: improvementNeeded.length })}</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => navigate('/app/organizations')}
                className="text-xs font-bold px-4 py-2 rounded-xl transition-all hover:opacity-90"
                style={{ background: 'rgba(234,88,12,0.15)', color: '#c2410c', border: '1px solid rgba(234,88,12,0.25)' }}>
                {t('dashboard.seeOrganizations')}
              </button>
              <button onClick={() => navigate('/app/reports/generate')}
                className="text-xs font-bold px-4 py-2 rounded-xl transition-all hover:opacity-90"
                style={{ background: 'rgba(234,88,12,0.08)', color: '#c2410c', border: '1px solid rgba(234,88,12,0.15)' }}>
                {t('dashboard.generateReport')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Accès rapide ──────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">{t('dashboard.quickAccessTitle')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: t('dashboard.quickAccessEntry'),      route: '/app/data-entry',           icon: Database, grad: 'linear-gradient(135deg, #064e3b, #059669)', glow: 'rgba(5,150,105,0.28)' },
            { label: t('dashboard.quickAccessCsrd'),       route: '/app/reports/csrd-builder', icon: Shield,   grad: 'linear-gradient(135deg, #2e1065, #7c3aed)', glow: 'rgba(124,58,237,0.28)' },
            { label: t('dashboard.quickAccessConnectors'), route: '/app/data/connectors',      icon: Plug,     grad: 'linear-gradient(135deg, #083344, #0891b2)', glow: 'rgba(8,145,178,0.28)' },
            { label: t('dashboard.quickAccessAI'),         route: '/app/intelligence',          icon: Brain,    grad: 'linear-gradient(135deg, #500724, #db2777)', glow: 'rgba(219,39,119,0.28)' },
          ].map(({ label, route, icon: QIcon, grad, glow }) => (
            <button key={route} onClick={() => navigate(route)}
              className="relative overflow-hidden rounded-2xl p-4 text-left group transition-all hover:-translate-y-0.5"
              style={{ background: grad, boxShadow: `0 4px 18px ${glow}` }}>
              <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '18px 18px' }} />
              <div className="relative">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <QIcon className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm font-bold text-white leading-tight">{label}</p>
                <div className="mt-2 flex items-center gap-1 text-white/50 text-xs font-medium group-hover:text-white/85 transition-colors">
                  {t('dashboard.goTo')} <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Deadlines + Activity ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Deadlines */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-amber-500" />
              </div>
              {t('dashboard.upcomingDeadlines')}
            </h3>
            <span className="text-[10px] text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded-full">{t('dashboard.euOfficialCalendar')}</span>
          </div>
          <div className="p-5 space-y-2.5">
            {buildDeadlines(t).map(d => (
              <div key={d.label} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: d.urgent ? 'rgba(239,68,68,0.05)' : '#f9fafb' }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.color}`} />
                  <span className="text-sm text-gray-700 font-medium truncate">{d.label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">{d.dateStr}</span>
                  <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${d.urgent ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                    J-{d.daysLeft}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </div>
              {t('dashboard.recentActivity')}
            </h3>
            <button onClick={() => navigate('/app/notifications')} className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1">
              {t('dashboard.viewAll')} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-5 space-y-2">
            {(recentActivity.length > 0 ? recentActivity : [
              { label: t('dashboard.activityCsrd'), time: t('dashboard.activityTimeToday'), icon: '📄' },
              { label: t('dashboard.activityScope1'), time: t('dashboard.activityTimeYesterday'), icon: '🌿' },
              { label: t('dashboard.activityAudit'), time: t('dashboard.activityTime2days'), icon: '✅' },
            ]).map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-base flex-shrink-0">{a.icon}</div>
                <span className="flex-1 text-sm text-gray-700 truncate">{a.label}</span>
                <span className="text-xs text-gray-400 flex-shrink-0 bg-gray-50 px-2 py-1 rounded-full">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ESRS Coverage ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-50">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
              <Target className="h-4 w-4 text-violet-600" />
            </div>
            {t('dashboard.esrsCoverageTitle')}
          </h3>
          <button onClick={() => navigate('/app/esrs-gap')} className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1">
            {t('dashboard.detailedAnalysis')} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
            {(esrsSections ?? [
              { code: 'E1', label: t('dashboard.esrsE1'), pct: 0 },
              { code: 'E2', label: t('dashboard.esrsE2'), pct: 0 },
              { code: 'E3', label: t('dashboard.esrsE3'), pct: 0 },
              { code: 'E4', label: t('dashboard.esrsE4'), pct: 0 },
              { code: 'E5', label: t('dashboard.esrsE5'), pct: 0 },
              { code: 'S1', label: t('dashboard.esrsS1'), pct: 0 },
              { code: 'S2', label: t('dashboard.esrsS2'), pct: 0 },
              { code: 'S3', label: t('dashboard.esrsS3'), pct: 0 },
              { code: 'S4', label: t('dashboard.esrsS4'), pct: 0 },
              { code: 'G1', label: t('dashboard.esrsG1'), pct: 0 },
            ]).map(({ code, label, pct }) => {
              const isEnv = code.startsWith('E');
              const isSoc = code.startsWith('S');
              const accent = isEnv ? '#059669' : isSoc ? '#2563eb' : '#7c3aed';
              const trackBg = isEnv ? 'rgba(5,150,105,0.06)' : isSoc ? 'rgba(37,99,235,0.06)' : 'rgba(124,58,237,0.06)';
              const statusColor = pct >= 70 ? '#059669' : pct >= 40 ? '#d97706' : '#dc2626';
              return (
                <div key={code} className="p-3 rounded-xl" style={{ background: trackBg, border: `1px solid ${accent}18` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold" style={{ color: accent }}>{code}</span>
                    <span className="text-xs font-bold" style={{ color: statusColor }}>{pct}%</span>
                  </div>
                  <div className="w-full bg-white rounded-full h-1.5 mb-1.5">
                    <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}99, ${accent})` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 leading-tight truncate" title={label}>{label}</p>
                </div>
              );
            })}
          </div>
          {esrsSections && (
            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
              <span>{esrsSections.filter(s => s.pct >= 70).length}/{esrsSections.length} {t('dashboard.sectionsCovered')}</span>
              <span className="font-bold text-violet-600">{t('dashboard.globalCoverage')} : {Math.round(esrsSections.reduce((s, x) => s + x.pct, 0) / esrsSections.length)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Climate & Compliance quick-access */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Shield,
            label: t('dashboard.cardTcfd'),
            sub: t('dashboard.cardTcfdSub'),
            href: '/app/tcfd',
            grad: 'linear-gradient(135deg, #0c4a6e, #0284c7)',
            badge: t('dashboard.badgeNew'),
          },
          {
            icon: Leaf,
            label: t('dashboard.cardDecarb'),
            sub: t('dashboard.cardDecarbSub'),
            href: '/app/decarbonation',
            grad: 'linear-gradient(135deg, #064e3b, #059669)',
            badge: null,
          },
          {
            icon: BarChart3,
            label: t('dashboard.cardCarbon'),
            sub: t('dashboard.cardCarbonSub'),
            href: '/app/carbon',
            grad: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
            badge: null,
          },
          {
            icon: Target,
            label: t('dashboard.cardMateriality'),
            sub: t('dashboard.cardMaterialitySub'),
            href: '/app/materiality',
            grad: 'linear-gradient(135deg, #4a1d96, #7c3aed)',
            badge: null,
          },
        ].map(card => {
          const Icon = card.icon;
          return (
            <button key={card.href}
              onClick={() => navigate(card.href)}
              className="relative overflow-hidden rounded-2xl p-5 text-left group hover:shadow-lg transition-all duration-200"
              style={{ background: card.grad }}>
              <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
                <svg width="100%" height="100%">
                  <defs>
                    <pattern id={`dot-${card.href}`} width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="10" cy="10" r="1.2" fill="white" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill={`url(#dot-${card.href})`} />
                </svg>
              </div>
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  {card.badge && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.25)', color: 'white' }}>
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-white leading-tight">{card.label}</p>
                <p className="text-xs text-white/70 mt-0.5 leading-relaxed">{card.sub}</p>
                <div className="mt-3 flex items-center gap-1 text-white/60 text-xs font-medium group-hover:text-white/90 transition-colors">
                  {t('dashboard.goTo')} <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
