import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Award, Building2, Database, Shield, Plug, Brain, Leaf, Users, Scale,
  RefreshCw, Sparkles, ArrowUpRight, ChevronRight, AlertTriangle, CheckCircle2, Target, CalendarClock, Bell,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell,
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, SegmentedControl, StatCard, Badge, EmptyState } from '@/components/common';
import Spinner from '@/components/common/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { PILLAR_COLORS } from '@/styles/tokens';
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
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
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
    const inWindow = scoreHistory.filter(p => new Date(p.date + '-01') >= cutoff);
    // Les scores sont mensuels : une fenêtre de 7 ou 30 jours contient au plus 1 point.
    // On retombe alors sur les 6 derniers mois pour toujours montrer une tendance.
    return (inWindow.length >= 2 ? inWindow : scoreHistory.slice(-6))
      .map(p => ({
        // Keys used by the recharts ComposedChart below
        month:         p.label,
        overall:       p.global,
        environmental: p.env,
        social:        p.soc,
        governance:    p.gov,
      }));
  }, [scoreHistory, selectedPeriod]);

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

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case '7d': return t('dashboard.last7days');
      case '30d': return t('dashboard.last30days');
      case '90d': return t('dashboard.last90days');
      case '1y': return t('dashboard.last12months');
    }
  };

  // ── Valeurs dérivées (toutes calculées à partir des vraies données) ──────────
  const avg = Math.round(stats?.average_score || 0);
  const scored = organizations.filter(o => o.overall_score != null);
  const needAttention = scored.filter(o => (o.overall_score || 0) < 45);
  const unscored = organizations.filter(o => o.overall_score == null);
  const esrsAvg = esrsSections && esrsSections.length
    ? Math.round(esrsSections.reduce((a, s) => a + s.pct, 0) / esrsSections.length)
    : null;
  const lowEsrs = (esrsSections ?? []).filter(s => s.pct < 50);

  // Évolution du score moyen : dernier point vs. point précédent de l'historique réel
  const trendPts = scoreHistory.length >= 2
    ? scoreHistory[scoreHistory.length - 1].global - scoreHistory[scoreHistory.length - 2].global
    : null;

  const scoreTone = (n: number) => (n >= 75 ? 'success' : n >= 60 ? 'info' : n >= 45 ? 'warning' : 'danger') as 'success' | 'info' | 'warning' | 'danger';
  const greeting = () => {
    const h = new Date().getHours();
    return h < 6 ? t('dashboard.greetNight', 'Bonsoir') : h < 18 ? t('dashboard.greetDay', 'Bonjour') : t('dashboard.greetEvening', 'Bonsoir');
  };
  const firstName = (user as any)?.first_name || '';
  const deadlines = buildDeadlines(t);

  const attention: { tone: 'danger' | 'warning' | 'info'; text: string; to: string }[] = [];
  if (unscored.length > 0) attention.push({ tone: 'info', text: t('dashboard.attnUnscored', { n: unscored.length, defaultValue: '{{n}} organisation(s) sans score calculé' }), to: '/app/data-entry' });
  if (needAttention.length > 0) attention.push({ tone: 'danger', text: t('dashboard.attnLow', { n: needAttention.length, defaultValue: '{{n}} organisation(s) sous le seuil de 45/100' }), to: '/app/organizations' });
  lowEsrs.slice(0, 3).forEach(s => attention.push({ tone: 'warning', text: t('dashboard.attnEsrs', { code: s.code, pct: s.pct, defaultValue: 'ESRS {{code}} : couverture à {{pct}} %' }), to: '/app/esrs-gap' }));

  const pillars = [
    { key: 'env', name: t('dashboard.environmental'), icon: Leaf,  color: PILLAR_COLORS.environmental.main, value: pillarAverages[0].score },
    { key: 'soc', name: t('dashboard.social'),        icon: Users, color: PILLAR_COLORS.social.main,        value: pillarAverages[1].score },
    { key: 'gov', name: t('dashboard.governance'),    icon: Scale, color: PILLAR_COLORS.governance.main,    value: pillarAverages[2].score },
  ];

  const quick = [
    { label: t('dashboard.quickAccessEntry'),      route: '/app/data-entry',           icon: Database, tint: 'bg-emerald-50 text-emerald-700' },
    { label: t('dashboard.quickAccessCsrd'),       route: '/app/reports/csrd-builder', icon: Shield,   tint: 'bg-violet-50 text-violet-700' },
    { label: t('dashboard.quickAccessConnectors'), route: '/app/data/connectors',      icon: Plug,     tint: 'bg-cyan-50 text-cyan-700' },
    { label: t('dashboard.quickAccessGaia', 'Analyser un rapport avec Gaïa'), route: '/app/gaia', icon: Sparkles, tint: 'bg-teal-50 text-teal-700' },
    { label: t('dashboard.quickAccessAI'),         route: '/app/intelligence',         icon: Brain,    tint: 'bg-rose-50 text-rose-700' },
  ];

  const card = 'rounded-2xl border border-gray-200 bg-white shadow-kpi';
  const ringR = 52;
  const ringC = 2 * Math.PI * ringR;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" role="status" aria-live="polite">
        <Spinner />
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className={card}>
        <EmptyState
          icon={Building2}
          title={t('dashboard.emptyTitle', 'Bienvenue sur ESGFlow')}
          description={t('dashboard.emptyDesc', 'Ajoutez votre première organisation pour voir apparaître vos scores, vos tendances et vos priorités.')}
          action={<Button onClick={() => navigate('/app/organizations')}>{t('dashboard.emptyCta', 'Ajouter une organisation')}</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── En-tête ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-gray-500 capitalize">{format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}</p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            {greeting()}{firstName ? `, ${firstName}` : ''}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {t('dashboard.subtitleNew', 'Voici où en est votre performance ESG.')}
            {latestPeriodMonths ? <span className="ml-1 text-gray-400">· {t('dashboard.dataWindow', 'Données sur')} {humanizePeriod(latestPeriodMonths, t)}</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SegmentedControl
            aria-label={t('dashboard.period', 'Période')}
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            options={[
              { value: '7d', label: '7 j' }, { value: '30d', label: '30 j' },
              { value: '90d', label: '90 j' }, { value: '1y', label: '1 an' },
            ]}
          />
          <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={() => { loadDashboard(); loadActivity(); loadEsrsCoverage(); }}>
            {t('dashboard.refresh', 'Actualiser')}
          </Button>
        </div>
      </header>

      {/* ── Score + indicateurs clés ── */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12" aria-label={t('dashboard.keyFigures', 'Chiffres clés')}>
        <div className={`${card} p-6 lg:col-span-5`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500">{t('dashboard.avgScore')}</h2>
            <Badge tone={scoreTone(avg)} dot>{avg >= 75 ? t('dashboard.scoreExcellent') : avg >= 60 ? t('dashboard.scoreGood') : avg >= 45 ? t('dashboard.scoreAverage') : t('dashboard.scoreLow')}</Badge>
          </div>
          <div className="mt-4 flex items-center gap-6">
            <div className="relative h-32 w-32 flex-none" role="img" aria-label={`${avg} / 100`}>
              <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
                <circle cx="64" cy="64" r={ringR} fill="none" stroke="#e5e7eb" strokeWidth="11" />
                <circle cx="64" cy="64" r={ringR} fill="none" stroke={PILLAR_COLORS.environmental.main} strokeWidth="11" strokeLinecap="round"
                  strokeDasharray={`${(ringC * Math.min(avg, 100)) / 100} ${ringC}`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-semibold tracking-tight text-gray-900 tabular-nums">{avg}</span>
                <span className="text-xs text-gray-400">/ 100</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              {pillars.map(p => (
                <div key={p.key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-600"><p.icon className="h-3.5 w-3.5" style={{ color: p.color }} aria-hidden="true" />{p.name}</span>
                    <span className="font-semibold tabular-nums text-gray-900">{p.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-gray-100"><div className="h-1.5 rounded-full" style={{ width: `${Math.min(p.value, 100)}%`, background: p.color }} /></div>
                </div>
              ))}
            </div>
          </div>
          {trendPts !== null && (
            <p className={`mt-5 text-sm font-medium ${trendPts >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {trendPts >= 0 ? '▲ +' : '▼ '}{trendPts.toFixed(1)} {t('dashboard.ptsVsPrev', 'pts vs. période précédente')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-5 lg:col-span-7">
          <StatCard label={t('dashboard.organizations')} value={stats?.total_organizations ?? 0} hint={t('dashboard.totalActive')} icon={<Building2 className="h-5 w-5" />} />
          <StatCard label={t('dashboard.esrsCoverageLabel', 'Couverture ESRS')} value={esrsAvg !== null ? `${esrsAvg} %` : '—'} hint={esrsAvg !== null ? t('dashboard.esrsCoverageHint', 'Moyenne des normes analysées') : t('dashboard.noEsrs', 'Analyse non disponible')} icon={<Shield className="h-5 w-5" />} />
          <StatCard label={t('dashboard.leaders')} value={stats?.top_performers ?? 0} hint={t('dashboard.excellentPerformances')} icon={<Award className="h-5 w-5" />} />
          <StatCard label={t('dashboard.attnLabel', 'À renforcer')} value={needAttention.length} hint={t('dashboard.attnHint', 'Score inférieur à 45')} icon={<Target className="h-5 w-5" />} />
        </div>
      </section>

      {/* ── Évolution + points d'attention ── */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className={`${card} p-6 lg:col-span-8`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">{t('dashboard.evolutionTitle', 'Évolution du score ESG')}</h2>
            <span className="text-xs text-gray-400">{getPeriodLabel()}</span>
          </div>
          {evolutionData.length > 1 ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolutionData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gOverall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PILLAR_COLORS.environmental.main} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={PILLAR_COLORS.environmental.main} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.2)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis domain={[(m: number) => Math.max(0, Math.floor(m - 8)), (m: number) => Math.min(100, Math.ceil(m + 8))]} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 8px 24px rgba(15,23,42,.08)', fontSize: 12 }} />
                  <Area type="monotone" dataKey="overall" name={t('dashboard.overall', 'Global')} stroke={PILLAR_COLORS.environmental.main} strokeWidth={2.5} fill="url(#gOverall)" />
                  <Area type="monotone" dataKey="social" name={t('dashboard.social')} stroke={PILLAR_COLORS.social.main} strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="governance" name={t('dashboard.governance')} stroke={PILLAR_COLORS.governance.main} strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={Target} title={t('dashboard.noHistoryTitle', 'Pas encore assez d\'historique')} description={t('dashboard.noHistoryDesc', 'La courbe apparaît dès que deux périodes de score sont calculées.')} />
          )}
        </div>

        <div className={`${card} p-6 lg:col-span-4`}>
          <h2 className="text-base font-semibold text-gray-900">{t('dashboard.attentionTitle', 'Points d\'attention')}</h2>
          {attention.length === 0 ? (
            <p className="mt-4 flex items-start gap-2 text-sm text-gray-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" aria-hidden="true" />
              {t('dashboard.attentionNone', 'Rien d\'urgent : toutes vos organisations sont au-dessus des seuils.')}
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {attention.map((a, i) => (
                <li key={i}>
                  <button type="button" onClick={() => navigate(a.to)} className="group flex w-full items-start gap-3 rounded-xl border border-gray-100 p-3 text-left transition hover:border-gray-200 hover:bg-gray-50">
                    <AlertTriangle className={`mt-0.5 h-4 w-4 flex-none ${a.tone === 'danger' ? 'text-red-500' : a.tone === 'warning' ? 'text-amber-500' : 'text-blue-500'}`} aria-hidden="true" />
                    <span className="flex-1 text-sm text-gray-700">{a.text}</span>
                    <ChevronRight className="mt-0.5 h-4 w-4 flex-none text-gray-300 transition group-hover:text-gray-500" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Organisations + échéances / activité ── */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className={`${card} overflow-hidden lg:col-span-7`}>
          <div className="flex items-center justify-between p-6 pb-3">
            <h2 className="text-base font-semibold text-gray-900">{t('dashboard.orgsTitle', 'Vos organisations')}</h2>
            <button type="button" onClick={() => navigate('/app/organizations')} className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline">
              {t('dashboard.seeAll', 'Tout voir')} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {[...organizations].sort((a, b) => (b.overall_score ?? -1) - (a.overall_score ?? -1)).slice(0, 6).map(o => (
              <li key={o.id}>
                <button type="button" onClick={() => navigate(`/app/organizations/${o.id}`)} className="flex w-full items-center gap-4 px-6 py-3.5 text-left transition hover:bg-gray-50">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-primary-50 text-sm font-semibold text-primary-700">{(o.name || '?').slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">{o.name}</span>
                    <span className="mt-1.5 block h-1.5 rounded-full bg-gray-100">
                      <span className="block h-1.5 rounded-full" style={{ width: `${Math.min(o.overall_score ?? 0, 100)}%`, background: PILLAR_COLORS.environmental.main }} />
                    </span>
                  </span>
                  <span className="w-10 text-right text-sm font-semibold tabular-nums text-gray-900">{o.overall_score != null ? Math.round(o.overall_score) : '—'}</span>
                  {o.rating ? <Badge tone={scoreTone(o.overall_score ?? 0)}>{o.rating}</Badge> : <span className="w-12" />}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-5 lg:col-span-5">
          <div className={`${card} p-6`}>
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900"><CalendarClock className="h-4 w-4 text-gray-400" aria-hidden="true" />{t('dashboard.deadlinesTitle', 'Prochaines échéances')}</h2>
            <ul className="mt-4 space-y-3">
              {deadlines.map(d => (
                <li key={d.label} className="flex items-center justify-between gap-3">
                  <span className="min-w-0"><span className="block truncate text-sm font-medium text-gray-800">{d.label}</span><span className="text-xs text-gray-400">{d.dateStr}</span></span>
                  <Badge tone={d.urgent ? 'danger' : 'neutral'}>{t('dashboard.daysLeft', { n: d.daysLeft, defaultValue: 'J-{{n}}' })}</Badge>
                </li>
              ))}
            </ul>
          </div>
          {recentActivity.length > 0 && (
            <div className={`${card} p-6`}>
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900"><Bell className="h-4 w-4 text-gray-400" aria-hidden="true" />{t('dashboard.activityTitle', 'Activité récente')}</h2>
              <ul className="mt-4 space-y-3">
                {recentActivity.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm"><span aria-hidden="true">{a.icon}</span><span className="flex-1 text-gray-700">{a.label}</span><span className="flex-none text-xs text-gray-400">{a.time}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ── Répartition par note + couverture ESRS ── */}
      {(ratingDistribution.length > 0 || (esrsSections && esrsSections.length > 0)) && (
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {ratingDistribution.length > 0 && (
            <div className={`${card} p-6 lg:col-span-5`}>
              <h2 className="text-base font-semibold text-gray-900">{t('dashboard.ratingDistTitle', 'Répartition par note')}</h2>
              <div className="mt-2 flex items-center gap-6">
                <div className="h-40 w-40 flex-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ratingDistribution} dataKey="value" nameKey="name" innerRadius={44} outerRadius={70} paddingAngle={2} stroke="none">
                        {ratingDistribution.map(r => <Cell key={r.name} fill={r.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex-1 space-y-2 text-sm">
                  {ratingDistribution.map(r => (
                    <li key={r.name} className="flex items-center justify-between"><span className="flex items-center gap-2 text-gray-700"><span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />{r.name}</span><span className="font-semibold tabular-nums text-gray-900">{r.value}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {esrsSections && esrsSections.length > 0 && (
            <div className={`${card} p-6 ${ratingDistribution.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">{t('dashboard.esrsTitle', 'Couverture des normes ESRS')}</h2>
                <button type="button" onClick={() => navigate('/app/esrs-gap')} className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline">{t('dashboard.esrsLink', 'Analyse détaillée')} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
              </div>
              <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                {esrsSections.map(s => (
                  <li key={s.code}>
                    <div className="flex items-center justify-between text-sm"><span className="truncate text-gray-700"><span className="font-semibold text-gray-900">{s.code}</span> · {s.label}</span><span className="tabular-nums text-gray-500">{s.pct} %</span></div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-gray-100"><div className="h-1.5 rounded-full" style={{ width: `${Math.min(s.pct, 100)}%`, background: s.pct >= 70 ? '#16a34a' : s.pct >= 50 ? '#d97706' : '#dc2626' }} /></div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ── Accès rapide ── */}
      <section aria-label={t('dashboard.quickAccessTitle')}>
        <h2 className="mb-3 text-sm font-medium text-gray-500">{t('dashboard.quickAccessTitle')}</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {quick.map(q => (
            <button key={q.route} type="button" onClick={() => navigate(q.route)} className={`${card} group flex items-center gap-3 p-4 text-left transition hover:border-gray-300 hover:shadow-md`}>
              <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${q.tint}`}><q.icon className="h-5 w-5" aria-hidden="true" /></span>
              <span className="flex-1 text-sm font-medium text-gray-900">{q.label}</span>
              <ArrowUpRight className="h-4 w-4 text-gray-300 transition group-hover:text-gray-500" aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
