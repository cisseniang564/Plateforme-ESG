import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Leaf, Users, Scale, RefreshCw, Sparkles, ArrowUpRight, ChevronRight, CheckCircle2,
  Target, CalendarClock, Bell, FileText, Info, AlertTriangle, AlertOctagon,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
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
  type: 'success' | 'info' | 'warning' | 'error';
}

/** Objectif de score par pilier, utilisé par les barres et la courbe. */
const TARGET = 75;

const PILLAR_STYLE = {
  env: { text: '#047857', fill: '#10b981', route: 'environmental' },
  soc: { text: '#1d4ed8', fill: '#3b82f6', route: 'social' },
  gov: { text: '#6d28d9', fill: '#8b5cf6', route: 'governance' },
} as const;

/** Familles ESRS pour regrouper la couverture (ordre de lecture d'un rapport CSRD). */
const ESRS_FAMILIES = [
  { key: 'general', label: 'Informations générales', match: (c: string) => /^ESRS\s*\d/i.test(c) },
  { key: 'env', label: 'Environnement', match: (c: string) => /^E\d/i.test(c) },
  { key: 'soc', label: 'Social', match: (c: string) => /^S\d/i.test(c) },
  { key: 'gov', label: 'Gouvernance', match: (c: string) => /^G\d/i.test(c) },
] as const;

const LEVEL_STYLE = {
  covered: { bar: '#047857', label: 'couverte' },
  partial: { bar: '#d97706', label: 'partielle' },
  missing: { bar: '#94a3b8', label: 'non couverte' },
} as const;

/** Barre qui se remplit une fois au chargement (désactivé si l'utilisateur réduit les animations). */
function Bar({ pct, color, target, label }: { pct: number; color: string; target?: number; label: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); }, []);
  const w = Math.max(0, Math.min(pct, 100));
  return (
    <div className="relative h-2 rounded-full bg-gray-100" role="img" aria-label={label}>
      <div className="h-2 rounded-full motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
        style={{ width: shown ? `${w}%` : '0%', background: color }} />
      {target !== undefined && (
        <span className="absolute -top-1 h-4 w-0.5 rounded-full bg-gray-400" style={{ left: `calc(${target}% - 1px)` }} aria-hidden="true" />
      )}
    </div>
  );
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
          type: (['success', 'info', 'warning', 'error'].includes(n.type) ? n.type : 'info') as ActivityItem['type'],
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

  // Moyenne de chaque pilier sur les organisations qui ont un score (une organisation non notée ne compte pas pour 0).
  const avgOf = (k: 'environmental_score' | 'social_score' | 'governance_score') => {
    const vals = organizations.map(o => o[k]).filter((v): v is number => typeof v === 'number');
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };
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
  const ringColor = avg >= 60 ? '#047857' : avg >= 45 ? '#d97706' : '#dc2626';
  const greeting = () => {
    const h = new Date().getHours();
    return h < 6 ? t('dashboard.greetNight', 'Bonsoir') : h < 18 ? t('dashboard.greetDay', 'Bonjour') : t('dashboard.greetEvening', 'Bonsoir');
  };
  const firstName = (user as any)?.first_name || '';
  const scoredCount = organizations.filter(o => o.overall_score != null).length;

  const card = 'rounded-2xl border border-gray-200 bg-white';
  const sectionTitle = 'text-[15px] font-semibold text-gray-900';
  const sectionHint = 'mt-0.5 text-[13px] text-gray-500';
  const link = 'inline-flex items-center gap-1 rounded text-[13px] font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300';
  const ringR = 54;
  const ringC = 2 * Math.PI * ringR;
  const ACTION_ICON = { danger: AlertOctagon, warning: AlertTriangle, info: Info } as const;
  const ACTION_TONE = { danger: 'text-red-600 bg-red-50 dark:bg-red-500/15 dark:text-red-400', warning: 'text-amber-700 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-400', info: 'text-blue-700 bg-blue-50 dark:bg-blue-500/15 dark:text-blue-400' } as const;
  const ACTIVITY_ICON = { success: CheckCircle2, info: Info, warning: AlertTriangle, error: AlertOctagon } as const;
  const ACTIVITY_TONE = { success: 'text-emerald-600', info: 'text-blue-600', warning: 'text-amber-600', error: 'text-red-600' } as const;

  const esrsGroups = (esrsSections ?? []).length
    ? ESRS_FAMILIES.map(f => ({ ...f, items: (esrsSections ?? []).filter(s => f.match(shortCode(s.code))) })).filter(g => g.items.length)
    : [];
  const levelCounts = (esrsSections ?? []).reduce((acc, s) => { acc[esrsLevel(s.pct)] += 1; return acc; }, { covered: 0, partial: 0, missing: 0 });

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
    <div className="mx-auto max-w-[1400px] space-y-6 animate-fade-in">
      {/* ── En-tête ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-gray-500 first-letter:uppercase">{format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}</p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-gray-900 sm:text-[28px]">
            {greeting()}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {t('dashboard.subtitleNew2', { count: organizations.length, defaultValue: '{{count}} organisation(s) suivie(s)' })}
            {latestPeriodMonths ? `, ${t('dashboard.dataWindowLower', 'données sur')} ${humanizePeriod(latestPeriodMonths, t)}` : ''}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={() => { loadDashboard(); loadActivity(); loadEsrsCoverage(); }}>
            {t('dashboard.refresh', 'Actualiser')}
          </Button>
          <Button icon={<FileText className="h-4 w-4" />} onClick={() => navigate('/app/reports')}>
            {t('dashboard.generateReport', 'Générer un rapport')}
          </Button>
        </div>
      </header>

      {/* ── Performance : score global, trois piliers face à l'objectif, tendance ── */}
      <section className={`${card} overflow-hidden`} aria-label={t('dashboard.keyFigures', 'Chiffres clés')}>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <div className="flex items-center gap-5 border-b border-gray-200 p-6 lg:border-b-0 lg:border-r">
            <div className="relative h-[132px] w-[132px] flex-none" role="img" aria-label={`${t('dashboard.avgScore')} : ${avg} / 100`}>
              <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="66" cy="66" r={ringR} fill="none" stroke="currentColor" className="text-gray-100 dark:text-white/10" strokeWidth="10" />
                <circle cx="66" cy="66" r={ringR} fill="none" stroke={ringColor} strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${(ringC * Math.min(avg, 100)) / 100} ${ringC}`}
                  className="motion-safe:transition-[stroke-dasharray] motion-safe:duration-700" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[40px] font-semibold leading-none tracking-tight text-gray-900 tabular-nums">{avg}</span>
                <span className="mt-1 text-xs text-gray-500">/ 100</span>
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-gray-600">{t('dashboard.avgScore')}</h2>
              <div className="mt-2"><Badge tone={scoreTone(avg)} dot>{scoreLabel}</Badge></div>
              {trendPts !== null && (
                <p className={`mt-2 text-[13px] font-medium tabular-nums ${trendPts >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                  {trendPts >= 0 ? '+' : ''}{trendPts.toFixed(1)} {t('dashboard.ptsVsPrevShort', 'pts depuis le calcul précédent')}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {t('dashboard.scoredOf', { scored: scoredCount, total: organizations.length, defaultValue: '{{scored}} organisation(s) notée(s) sur {{total}}' })}
              </p>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={sectionTitle}>{t('dashboard.pillarsTitle', 'Piliers face à l’objectif')}</h2>
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="inline-block h-3 w-0.5 rounded-full bg-gray-400" aria-hidden="true" />
                {t('dashboard.targetLegend', { n: TARGET, defaultValue: 'objectif {{n}}' })}
              </span>
            </div>
            <ul className="mt-4 space-y-1">
              {pillars.map(p => {
                const st = PILLAR_STYLE[p.key];
                const gap = p.value == null ? null : gapToTarget(p.value, TARGET);
                return (
                  <li key={p.key}>
                    <button type="button" onClick={() => navigate(`/app/dashboard/pillar/${st.route}`)}
                      className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-xl px-2 py-3 text-left transition-colors hover:bg-gray-50 sm:grid-cols-[minmax(0,170px)_minmax(0,1fr)_auto]">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg" style={{ background: `${st.fill}1a`, color: st.text }}>
                          <p.icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="truncate text-sm font-medium text-gray-800">{p.name}</span>
                      </span>
                      <span className="order-last col-span-2 min-w-0 sm:order-none sm:col-span-1">
                        <Bar pct={p.value ?? 0} color={st.fill} target={TARGET} label={`${p.name} : ${p.value ?? '—'} sur 100, objectif ${TARGET}`} />
                        <span className="mt-1.5 block text-xs text-gray-500">
                          {gap == null ? t('dashboard.noScoreYet', 'Pas encore de score')
                            : gap >= 0 ? t('dashboard.aboveTarget', { n: gap, defaultValue: 'Objectif atteint (+{{n}} pts)' })
                            : t('dashboard.belowTarget', { n: Math.abs(gap), defaultValue: '{{n}} pts sous l’objectif' })}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-9 text-right text-xl font-semibold tabular-nums text-gray-900">{p.value ?? '—'}</span>
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

      {/* ── Couverture CSRD + prochaines actions ── */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className={`${card} p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className={sectionTitle}>{t('dashboard.csrdReady', 'Prêt pour la CSRD ?')}</h2>
              <p className={sectionHint}>{t('dashboard.csrdReadyHint', 'Couverture de vos données par norme ESRS')}</p>
            </div>
            {esrsAvg !== null && (
              <div className="sm:text-right">
                <div className="text-[32px] font-semibold leading-none tabular-nums text-gray-900">{esrsAvg} %</div>
                <div className="mt-1 text-xs text-gray-500">{t('dashboard.esrsOverall', 'couverture globale')}</div>
              </div>
            )}
          </div>

          {esrsGroups.length > 0 ? (
            <>
              {/* Répartition des normes par niveau */}
              <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-gray-100" role="img"
                aria-label={`${levelCounts.covered} couvertes, ${levelCounts.partial} partielles, ${levelCounts.missing} non couvertes`}>
                {(['covered', 'partial', 'missing'] as const).map(k => levelCounts[k] > 0 && (
                  <span key={k} style={{ flexGrow: levelCounts[k], background: LEVEL_STYLE[k].bar }} />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                {(['covered', 'partial', 'missing'] as const).map(k => (
                  <span key={k} className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: LEVEL_STYLE[k].bar }} aria-hidden="true" />
                    {levelCounts[k]} {LEVEL_STYLE[k].label}{levelCounts[k] > 1 ? 's' : ''}
                  </span>
                ))}
                <span className="text-gray-400">{t('dashboard.coveredRule', 'couverte = 70 % et plus')}</span>
              </div>

              <div className="mt-5 gap-x-8 md:columns-2">
                {esrsGroups.map(g => (
                  <div key={g.key} className="mb-5 break-inside-avoid">
                    <h3 className="text-xs font-medium text-gray-500">{g.label}</h3>
                    <ul className="mt-2 space-y-2.5">
                      {g.items.map(s => {
                        const lv = esrsLevel(s.pct);
                        return (
                          <li key={s.code} className="grid grid-cols-[52px_minmax(0,1fr)_44px] items-center gap-3" title={`${s.label} : ${s.pct} % (${LEVEL_STYLE[lv].label})`}>
                            <span className="text-[13px] font-semibold text-gray-800">{shortCode(s.code)}</span>
                            <Bar pct={s.pct} color={LEVEL_STYLE[lv].bar} label={`${shortCode(s.code)} ${s.label} : ${s.pct} %`} />
                            <span className="text-right text-[13px] tabular-nums text-gray-700">{s.pct} %</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-end">
                <button type="button" onClick={() => navigate('/app/esrs-gap')} className={link}>
                  {t('dashboard.esrsLink', 'Analyse détaillée')} <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </>
          ) : (
            <EmptyState icon={Target} title={t('dashboard.noEsrs', 'Analyse non disponible')} description={t('dashboard.noEsrsDesc', 'Lancez l’analyse ESRS pour voir votre couverture norme par norme.')} />
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className={`${card} p-6`}>
            <h2 className={sectionTitle}>{t('dashboard.nextActions', 'Prochaines actions')}</h2>
            <p className={sectionHint}>{t('dashboard.nextActionsHint', 'Classées par urgence, à partir de vos données')}</p>
            {actions.length === 0 ? (
              <p className="mt-4 flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                {t('dashboard.attentionNone', 'Rien d\'urgent : toutes vos organisations sont au-dessus des seuils.')}
              </p>
            ) : (
              <ol className="mt-3 -mx-2">
                {actions.map(a => {
                  const Icon = ACTION_ICON[a.tone];
                  return (
                    <li key={a.id}>
                      <button type="button" onClick={() => navigate(a.to)} className="group flex w-full items-start gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-gray-50">
                        <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${ACTION_TONE[a.tone]}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-gray-900">{a.title}</span>
                          <span className="block text-[13px] text-gray-500">{a.why}</span>
                        </span>
                        <ChevronRight className="mt-2 h-4 w-4 flex-none text-gray-300 transition-colors group-hover:text-gray-500" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <button type="button" onClick={() => navigate('/app/gaia')}
            className={`${card} group flex w-full items-center gap-4 p-5 text-left transition-colors hover:border-gray-300`}>
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" aria-hidden="true"><Sparkles className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-900">{t('dashboard.gaiaTitleNew', 'Analysez le rapport d’une entreprise avec Gaïa')}</span>
              <span className="block text-[13px] text-gray-500">{t('dashboard.gaiaPitch', 'Déposez le rapport d\'une entreprise : Gaïa le résume, relève les chiffres et repère ce qui manque.')}</span>
            </span>
            <ArrowUpRight className="h-5 w-5 flex-none text-gray-300 transition-colors group-hover:text-gray-600" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* ── Évolution + échéances / activité ── */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className={`${card} p-6`}>
          <h2 className={sectionTitle}>{t('dashboard.evolutionTitle', 'Évolution du score ESG')}</h2>
          <p className={sectionHint}>{t('dashboard.evolutionHint', 'Score moyen de vos organisations, par mois')}</p>
          {evolutionData.length > 1 ? (
            <div className="mt-4 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolutionData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gOverall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#047857" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#047857" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#9ca3af" strokeOpacity={0.3} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <ReferenceLine y={TARGET} stroke="#9ca3af" strokeDasharray="4 4"
                    label={{ value: t('dashboard.targetLegend', { n: TARGET, defaultValue: 'objectif {{n}}' }), position: 'insideTopRight', fill: '#6b7280', fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.08)' }} />
                  <Area type="monotone" dataKey="overall" name={t('dashboard.overall', 'Global')} stroke="#047857" strokeWidth={2.25}
                    fill="url(#gOverall)" dot={{ r: 3, fill: '#047857', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={Target} title={t('dashboard.noHistoryTitle', 'Pas encore assez d\'historique')} description={t('dashboard.noHistoryDesc', 'La courbe apparaît dès que deux périodes de score sont calculées.')}
              action={<Button variant="secondary" onClick={() => navigate('/app/scores/calculate')}>{t('dashboard.calcScore', 'Calculer un score')}</Button>} />
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className={`${card} p-6`}>
            <h2 className={`${sectionTitle} flex items-center gap-2`}><CalendarClock className="h-4 w-4 text-gray-400" aria-hidden="true" />{t('dashboard.deadlinesTitle', 'Prochaines échéances')}</h2>
            {deadlines.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">{t('dashboard.noDeadline', 'Aucune échéance à venir.')}</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
                {deadlines.map(d => (
                  <li key={d.label} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium text-gray-800">{d.label}</span><span className="text-xs text-gray-500">{d.dateStr}</span></span>
                    <Badge tone={d.urgent ? 'danger' : 'neutral'}>{t('dashboard.daysLeft', { n: d.daysLeft, defaultValue: 'J-{{n}}' })}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {recentActivity.length > 0 && (
            <div className={`${card} p-6`}>
              <h2 className={`${sectionTitle} flex items-center gap-2`}><Bell className="h-4 w-4 text-gray-400" aria-hidden="true" />{t('dashboard.activityTitle', 'Activité récente')}</h2>
              <ul className="mt-3 space-y-3">
                {recentActivity.map((a, i) => {
                  const Icon = ACTIVITY_ICON[a.type];
                  return (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Icon className={`mt-0.5 h-4 w-4 flex-none ${ACTIVITY_TONE[a.type]}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1 text-gray-700">{a.label}</span>
                      <span className="flex-none text-xs text-gray-500">{a.time}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ── Organisations ── */}
      <section className={`${card} overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-3">
          <div>
            <h2 className={sectionTitle}>{t('dashboard.orgsTitle', 'Vos organisations')}</h2>
            <p className={sectionHint}>{t('dashboard.orgsHint', 'Classées par score global')}</p>
          </div>
          <button type="button" onClick={() => navigate('/app/organizations')} className={link}>
            {t('dashboard.seeAll', 'Tout voir')} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden grid-cols-[minmax(0,1fr)_repeat(3,56px)_64px_72px] gap-4 border-b border-gray-100 dark:border-gray-800 px-6 pb-2 text-xs font-medium text-gray-500 md:grid">
          <span>{t('dashboard.colOrg', 'Organisation')}</span>
          <span className="text-right">E</span><span className="text-right">S</span><span className="text-right">G</span>
          <span className="text-right">{t('dashboard.colGlobal', 'Global')}</span>
          <span className="text-right">{t('dashboard.colRating', 'Note')}</span>
        </div>
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {[...organizations].sort((a, b) => (b.overall_score ?? -1) - (a.overall_score ?? -1)).slice(0, 6).map(o => {
            const n = (v?: number | null) => (v != null ? Math.round(v) : '—');
            return (
              <li key={o.id}>
                <button type="button" onClick={() => navigate(`/app/organizations/${o.id}`)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_36px_44px] items-center gap-3 px-5 sm:px-6 md:gap-4 py-3 text-left transition-colors hover:bg-gray-50 md:grid-cols-[minmax(0,1fr)_repeat(3,56px)_64px_72px]">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">{(o.name || '?').slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-900">{o.name}</span>
                      {o.industry && <span className="block truncate text-xs text-gray-500">{o.industry}</span>}
                    </span>
                  </span>
                  <span className="hidden text-right text-sm tabular-nums text-gray-600 md:block">{n(o.environmental_score)}</span>
                  <span className="hidden text-right text-sm tabular-nums text-gray-600 md:block">{n(o.social_score)}</span>
                  <span className="hidden text-right text-sm tabular-nums text-gray-600 md:block">{n(o.governance_score)}</span>
                  <span className="text-right text-sm font-semibold tabular-nums text-gray-900">{n(o.overall_score)}</span>
                  <span className="flex justify-end">{o.rating ? <Badge tone={scoreTone(o.overall_score ?? 0)}>{o.rating}</Badge> : <span className="text-xs text-gray-400">—</span>}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
