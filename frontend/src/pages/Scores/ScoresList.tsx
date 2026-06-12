import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award, TrendingUp, Building2, Calculator, Search,
  Leaf, Users, Scale, ArrowRight, History, Sparkles,
  SortAsc, SortDesc, ChevronRight, RefreshCw,
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import BackButton from '@/components/common/BackButton';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

interface Organization {
  id: string;
  name: string;
  industry?: string;
  external_id?: string;
  country?: string;
}

interface OrgScore {
  overall_score: number;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  grade: string;
  calculated_at: string;
}

/* ── Grade metadata ───────────────────────────────────────────────────── */
const getGradeMetaMap = (t: TFunction): Record<string, { badge: string; ring: string; label: string }> => ({
  'A+': { badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', ring: '#10b981', label: t('slist.excellent', 'Excellent')    },
  A:   { badge: 'bg-green-50 text-green-800 border-green-200',        ring: '#22c55e', label: t('slist.veryGood', 'Très bien')   },
  'B+': { badge: 'bg-lime-50 text-lime-700 border-lime-200',          ring: '#84cc16', label: t('slist.good', 'Bien')        },
  B:   { badge: 'bg-yellow-50 text-yellow-800 border-yellow-200',     ring: '#eab308', label: t('slist.average', 'Moyen')       },
  C:   { badge: 'bg-orange-50 text-orange-800 border-orange-200',     ring: '#f97316', label: t('slist.insufficient', 'Insuffisant') },
  D:   { badge: 'bg-red-50 text-red-800 border-red-200',              ring: '#ef4444', label: t('slist.critical', 'Critique')    },
});

function getGradeMeta(g: string, t: TFunction) {
  return getGradeMetaMap(t)[g] ?? { badge: 'bg-gray-50 text-gray-600 border-gray-200', ring: '#9ca3af', label: '—' };
}

/* ── Mini score ring ──────────────────────────────────────────────────── */
function MiniRing({ score, color }: { score: number; color: string }) {
  const R = 22, circ = 2 * Math.PI * R;
  const dash = (Math.min(Math.max(score, 0), 100) / 100) * circ;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={R} fill="none" stroke="#f3f4f6" strokeWidth="5" />
      <circle
        cx="28" cy="28" r={R}
        fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        transform="rotate(-90 28 28)"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x="28" y="32" textAnchor="middle" fontSize="11" fontWeight="700" fill="#111827" fontFamily="system-ui">
        {Math.round(score)}
      </text>
    </svg>
  );
}

/* ── Hero avg ring ────────────────────────────────────────────────────── */
function HeroRing({ score }: { score: number }) {
  const R = 40, circ = 2 * Math.PI * R;
  const dash = (Math.min(Math.max(score, 0), 100) / 100) * circ;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="heroListGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#93c5fd" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
      <circle
        cx="50" cy="50" r={R}
        fill="none" stroke="url(#heroListGrad)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }}
      />
      <text x="50" y="46" textAnchor="middle" fontSize="22" fontWeight="700" fill="white" fontFamily="system-ui">
        {Math.round(score)}
      </text>
      <text x="50" y="61" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.55)" fontFamily="system-ui">
        /100
      </text>
    </svg>
  );
}

/* ── Pillar mini-bar ──────────────────────────────────────────────────── */
function PillarMini({ value, color, icon: Icon }: { value: number; color: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 shrink-0" style={{ color }} />
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-5 shrink-0 text-right text-xs font-semibold tabular-nums" style={{ color }}>
        {Math.round(value)}
      </span>
    </div>
  );
}

/* ── Loading skeleton ─────────────────────────────────────────────────── */
function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-gray-100" />
          <div className="h-3 w-20 rounded bg-gray-100" />
        </div>
        <div className="h-14 w-14 rounded-full bg-gray-100" />
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map(i => <div key={i} className="h-2 rounded-full bg-gray-100" />)}
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────── */
export default function ScoresList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [scores, setScores] = useState<Record<string, OrgScore>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const orgRes = await api.get('/organizations');
      const list: Organization[] = orgRes.data.items || [];
      setOrgs(list);
      const scoreResults = await Promise.allSettled(
        list.map(o =>
          api.get(`/scores/latest?organization_id=${o.id}`).then(r => ({ id: o.id, data: r.data }))
        )
      );
      const map: Record<string, OrgScore> = {};
      scoreResults.forEach(r => { if (r.status === 'fulfilled') map[r.value.id] = r.value.data; });
      setScores(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  /* ── Derived data ──────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orgs.filter(o =>
      o.name.toLowerCase().includes(q) || (o.industry ?? '').toLowerCase().includes(q)
    );
  }, [orgs, search]);

  const scored = useMemo(() =>
    [...filtered.filter(o => scores[o.id])].sort((a, b) => {
      const diff = scores[b.id].overall_score - scores[a.id].overall_score;
      return sortDir === 'desc' ? diff : -diff;
    }),
    [filtered, scores, sortDir]
  );
  const unscored = useMemo(() => filtered.filter(o => !scores[o.id]), [filtered, scores]);

  const avgScore = scored.length > 0
    ? scored.reduce((acc, o) => acc + scores[o.id].overall_score, 0) / scored.length
    : null;

  /* ── Loading ─────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 animate-pulse rounded-3xl bg-gradient-to-br from-slate-800 to-violet-900" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map(i => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton to="/app/scores" label="Scores ESG" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-violet-900 to-purple-800 p-8 text-white shadow-2xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-48 w-48 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
              <Award className="h-3.5 w-3.5" />
              {t('slist.badge', 'Scores ESG')}
            </div>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">{t('slist.title', 'Tableau des Scores')}</h1>
            <p className="mt-1 text-sm text-white/70">{t('slist.subtitle', 'Évaluations ESG par organisation · Piliers E, S, G')}</p>

            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                {t('slist.orgCount', '{{n}} organisation{{s}}', { n: orgs.length, s: orgs.length !== 1 ? 's' : '' })}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                {t('slist.scoredCount', '{{n}} scorée{{s}}', { n: scored.length, s: scored.length !== 1 ? 's' : '' })}
              </span>
              {unscored.length > 0 && (
                <span className="rounded-full bg-amber-500/30 px-3 py-1 ring-1 ring-amber-400/30 text-amber-200">
                  {unscored.length} en attente
                </span>
              )}
            </div>
          </div>

          {/* Right: avg ring + KPIs */}
          <div className="flex items-center gap-6 shrink-0">
            {avgScore !== null && (
              <div className="flex flex-col items-center gap-1">
                <HeroRing score={avgScore} />
                <p className="text-xs text-white/50 tracking-wide">Score moyen</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button
                onClick={loadData}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Actualiser
              </button>
              <button
                onClick={() => navigate('/app/scores/calculate')}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-violet-900 transition-colors hover:bg-white/90"
              >
                <Calculator className="h-3.5 w-3.5" />
                Calculer un score
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search + sort bar ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une organisation…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>

        {scored.length > 1 && (
          <button
            onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
          >
            {sortDir === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
            {sortDir === 'desc' ? 'Score ↓' : 'Score ↑'}
          </button>
        )}
      </div>

      {/* ── Empty state ──────────────────────────────────────────────── */}
      {orgs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 text-center shadow-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-50">
            <Building2 className="h-10 w-10 text-gray-300" />
          </div>
          <p className="mt-5 text-xl font-bold text-gray-900">Aucune organisation</p>
          <p className="mt-2 text-sm text-gray-500">Ajoutez des organisations pour calculer leurs scores ESG.</p>
          <button
            onClick={() => navigate('/app/organizations')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
          >
            <Building2 className="h-4 w-4" />
            {t('slist.manageOrgs', 'Gérer les organisations')}
          </button>
        </div>
      ) : (
        <>
          {/* ── Scored orgs grid ─────────────────────────────────────── */}
          {scored.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  {t('slist.calculatedScores', 'Scores calculés ({{n}})', { n: scored.length })}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {scored.map((org, rank) => {
                  const s = scores[org.id];
                  const meta = getGradeMeta(s.grade, t);
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div
                      key={org.id}
                      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:border-violet-200 hover:shadow-md cursor-pointer"
                      onClick={() => navigate('/app/scores/breakdown')}
                    >
                      {/* Top gradient strip */}
                      <div className="h-1 w-full" style={{ backgroundColor: meta.ring }} />

                      <div className="p-5">
                        {/* Header: name + ring */}
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {rank < 3 && (
                                <span className="text-base leading-none">{medals[rank]}</span>
                              )}
                              <h3 className="truncate font-bold text-gray-900 group-hover:text-violet-700 transition-colors">
                                {org.name}
                              </h3>
                            </div>
                            {org.industry && (
                              <p className="mt-0.5 truncate text-xs capitalize text-gray-500">{org.industry}</p>
                            )}
                            {org.external_id && (
                              <p className="text-xs text-gray-400">SIREN : {org.external_id}</p>
                            )}
                          </div>

                          {/* Mini score ring + grade */}
                          <div className="flex shrink-0 flex-col items-center gap-1">
                            <MiniRing score={s.overall_score} color={meta.ring} />
                            <span className={`rounded-lg border px-2 py-0.5 text-xs font-bold ${meta.badge}`}>
                              {s.grade}
                            </span>
                          </div>
                        </div>

                        {/* Pillar bars */}
                        <div className="space-y-2">
                          <PillarMini value={s.environmental_score} color="#16a34a" icon={Leaf} />
                          <PillarMini value={s.social_score}        color="#2563eb" icon={Users} />
                          <PillarMini value={s.governance_score}    color="#7c3aed" icon={Scale} />
                        </div>

                        {/* Footer */}
                        <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3">
                          <p className="text-xs text-gray-400">
                            {new Date(s.calculated_at).toLocaleDateString('fr-FR', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                          </p>
                          <div className="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={e => { e.stopPropagation(); navigate('/app/scores/history'); }}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                            >
                              <History className="h-3 w-3" />
                              Historique
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); navigate('/app/scores/breakdown'); }}
                              className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100"
                            >
                              {t('slist.detail', 'Détail')}
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Unscored orgs ────────────────────────────────────────── */}
          {unscored.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                En attente de calcul ({unscored.length})
              </h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {unscored.map(org => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-5 py-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100">
                        <Building2 className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-800">{org.name}</p>
                        {org.industry && (
                          <p className="truncate text-xs capitalize text-gray-500">{org.industry}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/app/scores/calculate')}
                      className="ml-3 shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
                    >
                      <Calculator className="h-3.5 w-3.5" />
                      Calculer
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── AI insights CTA ──────────────────────────────────────── */}
          <div className="flex items-center gap-4 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100">
              <Sparkles className="h-5 w-5 text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-violet-900">Obtenez des recommandations IA</p>
              <p className="mt-0.5 text-sm text-violet-700">
                Analysez vos scores et recevez des actions prioritaires pour progresser.
              </p>
            </div>
            <button
              onClick={() => navigate('/app/ai-insights')}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
            >
              <TrendingUp className="h-4 w-4" />
              Insights IA
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
