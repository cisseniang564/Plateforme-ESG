import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Leaf, Users, Scale, RefreshCw, Sparkles, ArrowUpRight, ChevronRight, AlertTriangle, CheckCircle2,
  Target, CalendarClock, Bell, FileText,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Badge, EmptyState } from '@/components/common';
import Spinner from '@/components/common/Spinner';
import GettingStarted from './GettingStarted';
import { useAuth } from '@/hooks/useAuth';
import { buildNextActions, esrsAverage, esrsLevel, gapToTarget, shortCode, trend as trendOf } from './dashboardHelpers';
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
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [esrsSections, setEsrsSections] = useState<{ code: string; label: string; pct: number }[] | null>(null);
  // Couverture globale calculée par le serveur (exigences couvertes / mesurables) : le même chiffre que sur la page Rapports.
  const [esrsOverall, setEsrsOverall] = useState<number | null>(null);
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
      if (typeof res.data?.overall_coverage_pct === 'number') setEsrsOverall(res.data.overall_coverage_pct);
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
      setStats({
        total_organizations: totalOrgs,
        average_score: Math.round(avgScore * 10) / 10,
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

  // Évolution : tout l'historique disponible (scores mensuels, 12 points au plus).
  const evolutionData = useMemo(
    () => scoreHistory.map(p => ({ month: p.label, overall: p.global })),
    [scoreHistory],
  );

  const PILLAR_STYLE = {
    env: { text: '#047857', fill: '#10b981', soft: '#ecfdf5', route: 'environmental' },
    soc: { text: '#1d4ed8', fill: '#3b82f6', soft: '#eff6ff', route: 'social' },
    gov: { text: '#6d28d9', fill: '#8b5cf6', soft: '#f5f3ff', route: 'governance' },
  } as const;

  const orgCount = organizations.length || 1;
  const avgOf = (k: 'environmental_score' | 'social_score' | 'governance_score') =>
    Math.round(organizations.reduce((sum, org) => sum + (org[k] || 0), 0) / orgCount);
  const pillars = [
    { key: 'env' as const, name: t('dashboard.environmental'), icon: Leaf,  value: avgOf('environmental_score') },
    { key: 'soc' as const, name: t('dashboard.social'),        icon: Users, value: avgOf('social_score') },
    { key: 'gov' as const, name: t('dashboard.governance'),    icon: Scale, value: avgOf('governance_score') },
  ];

  const avg = Math.round(stats?.average_score || 0);
  const esrsAvg = esrsOverall ?? esrsAverage(esrsSections);
  const actions = buildNextActions(organizations, esrsSections);
  const trendPts = trendOf(scoreHistory);
  const deadlines = buildDeadlines(t);
  const scoreTone = (n: number) => (n >= 75 ? 'success' : n >= 60 ? 'info' : n >= 45 ? 'warning' : 'danger') as 'success' | 'info' | 'warning' | 'danger';
  const scoreLabel = avg >= 75 ? t('dashboard.scoreExcellent') : avg >= 60 ? t('dashboard.scoreGood') : avg >= 45 ? t('dashboard.scoreAverage') : t('dashboard.scoreLow');
  const greeting = () => {
    const h = new Date().getHours();
    return h < 6 ? t('dashboard.greetNight', 'Bonsoir') : h < 18 ? t('dashboard.greetDay', 'Bonjour') : t('dashboard.greetEvening', 'Bonsoir');
  };
  const firstName = (user as any)?.first_name || '';

  const card = 'rounded-xl border border-gray-200 bg-white';
  const ringR = 52;
  const ringC = 2 * Math.PI * ringR;
  const LEVEL = {
    covered: { bg: '#047857', fg: '#ffffff', label: 'couverte' },
    partial: { bg: '#fbbf24', fg: '#1f2937', label: 'partielle' },
    missing: { bg: '#e2e8f0', fg: '#1f2937', label: 'non couverte' },
  } as const;
  const TONE_ICON = { danger: 'text-red-600', warning: 'text-amber-600', info: 'text-blue-600' } as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" role="status" aria-live="polite">
        <Spinner />
      </div>
    );
  }

  if (organizations.length === 0) {
    return <GettingStarted />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── En-tête : un titre, une action principale ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-gray-600 capitalize">
            {greeting()}{firstName ? `, ${firstName}` : ''} · {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{t('dashboard.titleNew', 'Votre performance ESG')}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {t('dashboard.subtitleNew', 'Voici où en est votre performance ESG.')}
            {latestPeriodMonths ? <span className="ml-1">· {t('dashboard.dataWindow', 'Données sur')} {humanizePeriod(latestPeriodMonths, t)}</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={() => { loadDashboard(); loadActivity(); loadEsrsCoverage(); }}>
            {t('dashboard.refresh', 'Actualiser')}
          </Button>
          <Button icon={<FileText className="h-4 w-4" />} onClick={() => navigate('/app/reports')}>
            {t('dashboard.generateReport', 'Générer un rapport')}
          </Button>
        </div>
      </header>

      {/* ── Score global + trois piliers ── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]" aria-label={t('dashboard.keyFigures', 'Chiffres clés')}>
        <div className={`${card} flex items-center gap-5 p-5`}>
          <div className="relative h-[124px] w-[124px] flex-none" role="img" aria-label={`${avg} / 100`}>
            <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="64" cy="64" r={ringR} fill="none" stroke="#e2e8f0" strokeWidth="12" />
              <circle cx="64" cy="64" r={ringR} fill="none" stroke="#047857" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${(ringC * Math.min(avg, 100)) / 100} ${ringC}`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold tracking-tight text-gray-900 tabular-nums">{avg}</span>
              <span className="text-xs text-gray-600">/ 100</span>
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-gray-900">{t('dashboard.avgScore')}</h2>
            <div className="mt-2"><Badge tone={scoreTone(avg)} dot>{scoreLabel}</Badge></div>
            {trendPts !== null && (
              <p className={`mt-2 text-sm font-medium ${trendPts >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {trendPts >= 0 ? '▲ +' : '▼ '}{trendPts.toFixed(1)} {t('dashboard.ptsVsPrev', 'pts vs. période précédente')}
              </p>
            )}
          </div>
        </div>

        {pillars.map(p => {
          const st = PILLAR_STYLE[p.key];
          const gap = gapToTarget(p.value);
          return (
            <div key={p.key} className={`${card} flex flex-col gap-3 p-5`}>
              <div className="flex items-center gap-2">
                <p.icon className="h-[18px] w-[18px]" style={{ color: st.text }} aria-hidden="true" />
                <h3 className="text-sm font-semibold" style={{ color: st.text }}>{p.name}</h3>
                <span className="ml-auto text-3xl font-bold leading-none tabular-nums text-gray-900">{p.value}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200" role="img" aria-label={`${p.name} : ${p.value} sur 100`}>
                <div className="h-2 rounded-full" style={{ width: `${Math.min(p.value, 100)}%`, background: st.fill }} />
              </div>
              <p className="text-[13px] text-gray-600">
                {gap >= 0 ? `Objectif de 75 atteint (+${gap} pts)` : `${Math.abs(gap)} pts sous l’objectif de 75`}
              </p>
              <button type="button" onClick={() => navigate(`/app/dashboard/pillar/${st.route}`)} className="mt-auto inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700 hover:underline">
                {t('dashboard.seePillar', 'Voir les indicateurs')} <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </section>

      {/* ── Prêt pour la CSRD ? + prochaines actions ── */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className={`${card} p-5`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900">{t('dashboard.csrdReady', 'Prêt pour la CSRD ?')}</h2>
              <p className="mt-1 text-[13px] text-gray-600">{t('dashboard.csrdReadyHint', 'Couverture de vos données par norme ESRS')}</p>
            </div>
            {esrsAvg !== null && (
              <div className="text-right">
                <div className="text-3xl font-bold leading-none tabular-nums text-gray-900">{esrsAvg} %</div>
                <div className="mt-1.5"><Badge tone={esrsAvg >= 70 ? 'success' : 'warning'}>{esrsAvg >= 70 ? 'Couverte' : 'À renforcer'}</Badge></div>
              </div>
            )}
          </div>
          {esrsSections && esrsSections.length > 0 ? (
            <>
              <ul className="mt-4 grid grid-cols-5 gap-2">
                {esrsSections.map(s => {
                  const lv = LEVEL[esrsLevel(s.pct)];
                  return (
                    <li key={s.code} title={`${s.label} : ${s.pct} % (${lv.label})`}
                      className="flex h-14 flex-col items-center justify-center rounded-lg text-xs font-bold" style={{ background: lv.bg, color: lv.fg }}>
                      <span>{shortCode(s.code)}</span>
                      <span className="font-medium">{s.pct} %</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                <span><b style={{ color: '#047857' }}>■</b> couverte (70 % et plus)</span>
                <span><b style={{ color: '#d97706' }}>■</b> partielle</span>
                <span><b style={{ color: '#94a3b8' }}>■</b> non couverte</span>
                <button type="button" onClick={() => navigate('/app/esrs-gap')} className="ml-auto font-semibold text-emerald-700 hover:underline">{t('dashboard.esrsLink', 'Analyse détaillée')}</button>
              </div>
            </>
          ) : (
            <EmptyState icon={Target} title={t('dashboard.noEsrs', 'Analyse non disponible')} description={t('dashboard.noEsrsDesc', 'Lancez l’analyse ESRS pour voir votre couverture norme par norme.')} />
          )}
        </div>

        <div className={`${card} p-5`}>
          <h2 className="text-[15px] font-semibold text-gray-900">{t('dashboard.nextActions', 'Prochaines actions')}</h2>
          <p className="mt-1 text-[13px] text-gray-600">{t('dashboard.nextActionsHint', 'Classées par urgence, à partir de vos données')}</p>
          {actions.length === 0 ? (
            <p className="mt-4 flex items-start gap-2 text-sm text-gray-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-700" aria-hidden="true" />
              {t('dashboard.attentionNone', 'Rien d\'urgent : toutes vos organisations sont au-dessus des seuils.')}
            </p>
          ) : (
            <ol className="mt-3">
              {actions.map((a, i) => (
                <li key={a.id} className="border-t border-gray-100 first:border-t-0">
                  <button type="button" onClick={() => navigate(a.to)} className="group flex w-full items-start gap-3 py-3 text-left">
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-gray-100 text-[13px] font-bold text-gray-700">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-900">{a.title}</span>
                      <span className="block text-[13px] text-gray-600">{a.why}</span>
                    </span>
                    <AlertTriangle className={`mt-0.5 h-4 w-4 flex-none ${TONE_ICON[a.tone]}`} aria-hidden="true" />
                    <ChevronRight className="mt-0.5 h-4 w-4 flex-none text-gray-400 transition group-hover:text-gray-600" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* ── Gaïa : une ligne, pas un bandeau ── */}
      <button type="button" onClick={() => navigate('/app/gaia')}
        className={`${card} group flex w-full items-center gap-4 p-4 text-left transition hover:border-gray-300`}>
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-violet-50 text-violet-700" aria-hidden="true"><Sparkles className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-gray-900">{t('dashboard.gaiaTitleNew', 'Analysez le rapport d’une entreprise avec Gaïa')}</span>
          <span className="block text-[13px] text-gray-600">{t('dashboard.gaiaPitch', 'Déposez le rapport d\'une entreprise : Gaïa le résume, relève les chiffres et repère ce qui manque.')}</span>
        </span>
        <ArrowUpRight className="h-5 w-5 flex-none text-gray-400 transition group-hover:text-gray-700" aria-hidden="true" />
      </button>

      {/* ── Évolution + échéances / activité ── */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className={`${card} p-5`}>
          <h2 className="text-[15px] font-semibold text-gray-900">{t('dashboard.evolutionTitle', 'Évolution du score ESG')}</h2>
          <p className="mt-1 text-[13px] text-gray-600">{t('dashboard.evolutionHint', 'Score moyen de vos organisations, par mois')}</p>
          {evolutionData.length > 1 ? (
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolutionData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gOverall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#047857" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#047857" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#556274' }} />
                  <YAxis domain={[(m: number) => Math.max(0, Math.floor(m - 8)), (m: number) => Math.min(100, Math.ceil(m + 8))]} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#556274' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Area type="monotone" dataKey="overall" name={t('dashboard.overall', 'Global')} stroke="#047857" strokeWidth={2.5} fill="url(#gOverall)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={Target} title={t('dashboard.noHistoryTitle', 'Pas encore assez d\'historique')} description={t('dashboard.noHistoryDesc', 'La courbe apparaît dès que deux périodes de score sont calculées.')}
              action={<Button variant="secondary" onClick={() => navigate('/app/scores/calculate')}>{t('dashboard.calcScore', 'Calculer un score')}</Button>} />
          )}
        </div>

        <div className="space-y-4">
          <div className={`${card} p-5`}>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-gray-900"><CalendarClock className="h-4 w-4 text-gray-500" aria-hidden="true" />{t('dashboard.deadlinesTitle', 'Prochaines échéances')}</h2>
            <ul className="mt-3 space-y-3">
              {deadlines.map(d => (
                <li key={d.label} className="flex items-center justify-between gap-3">
                  <span className="min-w-0"><span className="block truncate text-sm font-medium text-gray-800">{d.label}</span><span className="text-xs text-gray-600">{d.dateStr}</span></span>
                  <Badge tone={d.urgent ? 'danger' : 'neutral'}>{t('dashboard.daysLeft', { n: d.daysLeft, defaultValue: 'J-{{n}}' })}</Badge>
                </li>
              ))}
            </ul>
          </div>
          {recentActivity.length > 0 && (
            <div className={`${card} p-5`}>
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-gray-900"><Bell className="h-4 w-4 text-gray-500" aria-hidden="true" />{t('dashboard.activityTitle', 'Activité récente')}</h2>
              <ul className="mt-3 space-y-3">
                {recentActivity.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm"><span aria-hidden="true">{a.icon}</span><span className="flex-1 text-gray-700">{a.label}</span><span className="flex-none text-xs text-gray-600">{a.time}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ── Organisations ── */}
      <section className={`${card} overflow-hidden`}>
        <div className="flex items-center justify-between p-5 pb-2">
          <h2 className="text-[15px] font-semibold text-gray-900">{t('dashboard.orgsTitle', 'Vos organisations')}</h2>
          <button type="button" onClick={() => navigate('/app/organizations')} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline">
            {t('dashboard.seeAll', 'Tout voir')} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        <ul className="divide-y divide-gray-100">
          {[...organizations].sort((a, b) => (b.overall_score ?? -1) - (a.overall_score ?? -1)).slice(0, 6).map(o => (
            <li key={o.id}>
              <button type="button" onClick={() => navigate(`/app/organizations/${o.id}`)} className="flex w-full items-center gap-4 px-5 py-3 text-left transition hover:bg-gray-50">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-emerald-50 text-sm font-semibold text-emerald-800">{(o.name || '?').slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">{o.name}</span>
                  <span className="mt-1.5 block h-1.5 rounded-full bg-gray-200">
                    <span className="block h-1.5 rounded-full bg-emerald-600" style={{ width: `${Math.min(o.overall_score ?? 0, 100)}%` }} />
                  </span>
                </span>
                <span className="w-10 text-right text-sm font-semibold tabular-nums text-gray-900">{o.overall_score != null ? Math.round(o.overall_score) : '—'}</span>
                {o.rating ? <Badge tone={scoreTone(o.overall_score ?? 0)}>{o.rating}</Badge> : <span className="w-12" />}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
