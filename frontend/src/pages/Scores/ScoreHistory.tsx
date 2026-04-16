import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart3, TrendingUp, TrendingDown, Minus, RefreshCw, Award,
  ArrowLeft, Leaf, Users, Scale, Target, Calendar, ArrowUpRight,
  Sparkles, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import Card from '@/components/common/Card';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { useNavigate as _useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoreEntry {
  id: string;
  calculation_date: string;
  overall_score: number;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  grade?: string;
  rating?: string;
  data_completeness?: number;
}

type Period = '3m' | '6m' | '1y' | 'all';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ScoreRing({ score, color, size = 72 }: { score: number; color: string; size?: number }) {
  const sw = 7;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(score, 100) / 100);
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-700" />
    </svg>
  );
}

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-100 text-green-700 border-green-200',
  B: 'bg-blue-100 text-blue-700 border-blue-200',
  C: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  D: 'bg-orange-100 text-orange-700 border-orange-200',
  F: 'bg-red-100 text-red-700 border-red-200',
};

function gradeColor(r?: string) {
  return GRADE_COLORS[r?.charAt(0) ?? ''] ?? 'bg-gray-100 text-gray-500 border-gray-200';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-500">{p.name}</span>
          <span className="font-bold text-gray-900 ml-auto">{Math.round(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScoreHistory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [history, setHistory] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState<Period>('all');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await api.get('/scores/history');
      setHistory(response.data.scores || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Filter by period
  const filteredHistory = useMemo(() => {
    if (period === 'all') return history;
    const now = new Date();
    const cutoff = new Date(now);
    if (period === '3m') cutoff.setMonth(now.getMonth() - 3);
    else if (period === '6m') cutoff.setMonth(now.getMonth() - 6);
    else if (period === '1y') cutoff.setFullYear(now.getFullYear() - 1);
    return history.filter(s => new Date(s.calculation_date) >= cutoff);
  }, [history, period]);

  const latest  = filteredHistory[0] ?? null;
  const previous = filteredHistory[1] ?? null;
  const oldest  = filteredHistory[filteredHistory.length - 1] ?? null;

  // Stats
  const totalDelta   = latest && oldest && latest !== oldest
    ? latest.overall_score - oldest.overall_score : null;
  const avgScore     = filteredHistory.length
    ? filteredHistory.reduce((s, e) => s + e.overall_score, 0) / filteredHistory.length : 0;
  const bestEntry    = filteredHistory.reduce<ScoreEntry | null>((b, e) => !b || e.overall_score > b.overall_score ? e : b, null);
  const worstEntry   = filteredHistory.reduce<ScoreEntry | null>((b, e) => !b || e.overall_score < b.overall_score ? e : b, null);

  const getDelta = (curr: number, prev: number) => curr - prev;

  const pillars = latest ? [
    { label: 'Environnement', value: latest.environmental_score, color: '#16a34a', icon: Leaf,
      delta: previous ? getDelta(latest.environmental_score, previous.environmental_score) : null },
    { label: 'Social',        value: latest.social_score,        color: '#2563eb', icon: Users,
      delta: previous ? getDelta(latest.social_score, previous.social_score) : null },
    { label: 'Gouvernance',   value: latest.governance_score,    color: '#7c3aed', icon: Scale,
      delta: previous ? getDelta(latest.governance_score, previous.governance_score) : null },
  ] : [];

  const chartData = [...filteredHistory].reverse().map(s => ({
    date: new Date(s.calculation_date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
    Global: Math.round(s.overall_score),
    Environnement: Math.round(s.environmental_score),
    Social: Math.round(s.social_score),
    Gouvernance: Math.round(s.governance_score),
  }));

  const tableRows = showAll ? filteredHistory : filteredHistory.slice(0, 8);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-700 p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%"><defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="1.2" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/></svg>
        </div>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="mb-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft size={14} /> Retour
            </button>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15 mb-3">
              <BarChart3 size={13} /> Historique des scores
            </div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <Award className="h-8 w-8 opacity-80" />
              Évolution des scores ESG
            </h1>
            <p className="text-sm text-white/70">Suivez la progression de votre performance ESG dans le temps</p>
            {latest && (
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-3 py-1 bg-white/15 rounded-full text-sm font-medium ring-1 ring-white/10">
                  Score actuel : <strong>{Math.round(latest.overall_score)}/100</strong>
                </span>
                {(latest.rating || latest.grade) && (
                  <span className="px-3 py-1 bg-white/15 rounded-full text-sm font-medium ring-1 ring-white/10">
                    Note : <strong>{latest.rating || latest.grade}</strong>
                  </span>
                )}
                {totalDelta !== null && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ring-1 ring-white/10 ${totalDelta >= 0 ? 'bg-emerald-500/30' : 'bg-red-500/30'}`}>
                    {totalDelta >= 0 ? '+' : ''}{Math.round(totalDelta)} pts sur la période
                  </span>
                )}
                <span className="px-3 py-1 bg-white/15 rounded-full text-sm font-medium ring-1 ring-white/10">
                  {history.length} calcul{history.length > 1 ? 's' : ''} enregistré{history.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 self-start">
            {/* Period filter */}
            <div className="flex gap-1 bg-white/10 p-1 rounded-xl">
              {(['3m', '6m', '1y', 'all'] as Period[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${period === p ? 'bg-white text-gray-900' : 'text-white/70 hover:text-white'}`}
                >
                  {p === 'all' ? 'Tout' : p === '1y' ? '1 an' : p === '6m' ? '6 mois' : '3 mois'}
                </button>
              ))}
            </div>
            <button onClick={loadHistory} disabled={loading}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {latest ? (
        <>
          {/* ── Pillar rings + delta ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pillars.map(p => {
              const Icon = p.icon;
              return (
                <Card key={p.label} className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <ScoreRing score={p.value} color={p.color} size={72} />
                    <span className="absolute inset-0 flex items-center justify-center text-base font-bold" style={{ color: p.color }}>
                      {Math.round(p.value)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon size={14} style={{ color: p.color }} />
                      <p className="text-sm font-semibold text-gray-700">{p.label}</p>
                    </div>
                    {p.delta !== null ? (
                      <div className={`flex items-center gap-1 text-sm font-medium ${p.delta > 0 ? 'text-emerald-600' : p.delta < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {p.delta > 0.5 ? <TrendingUp size={14} /> : p.delta < -0.5 ? <TrendingDown size={14} /> : <Minus size={14} />}
                        {p.delta >= 0 ? '+' : ''}{Math.round(p.delta)} pts
                        <span className="text-gray-400 font-normal text-xs">vs précédent</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Premier calcul</span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* ── Performance summary ── */}
          {filteredHistory.length >= 2 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Score moyen', value: `${Math.round(avgScore)}`, sub: 'sur la période', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Target },
                { label: 'Meilleur score', value: `${Math.round(bestEntry?.overall_score ?? 0)}`, sub: bestEntry ? new Date(bestEntry.calculation_date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) : '—', color: 'text-green-600', bg: 'bg-green-50', icon: TrendingUp },
                { label: 'Score le plus bas', value: `${Math.round(worstEntry?.overall_score ?? 0)}`, sub: worstEntry ? new Date(worstEntry.calculation_date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) : '—', color: 'text-orange-500', bg: 'bg-orange-50', icon: TrendingDown },
                { label: 'Progression totale', value: totalDelta !== null ? `${totalDelta >= 0 ? '+' : ''}${Math.round(totalDelta)} pts` : '—', sub: `${filteredHistory.length} périodes`, color: totalDelta !== null && totalDelta >= 0 ? 'text-emerald-600' : 'text-red-500', bg: totalDelta !== null && totalDelta >= 0 ? 'bg-emerald-50' : 'bg-red-50', icon: Sparkles },
              ].map(({ label, value, sub, color, bg, icon: Icon }) => (
                <Card key={label} className={`${bg} border-0`}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">{label}</span>
                    <Icon size={15} className={`${color} opacity-60`} />
                  </div>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </Card>
              ))}
            </div>
          )}

          {/* ── Area chart ── */}
          {chartData.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-600" />
                  Évolution des scores E / S / G / Global
                </h2>
                {latest.rating && (
                  <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${gradeColor(latest.rating)}`}>
                    {latest.rating}
                  </span>
                )}
              </div>
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                  <defs>
                    {[
                      { key: 'Global',       color: '#6366f1' },
                      { key: 'Environnement', color: '#16a34a' },
                      { key: 'Social',        color: '#2563eb' },
                      { key: 'Gouvernance',   color: '#7c3aed' },
                    ].map(({ key, color }) => (
                      <linearGradient key={key} id={`g-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.01} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                  <ReferenceLine y={50} stroke="#e5e7eb" strokeDasharray="4 4" label={{ value: 'Seuil 50', position: 'right', fontSize: 10, fill: '#9ca3af' }} />
                  <Area type="monotone" dataKey="Global"        name="Global"       stroke="#6366f1" fill="url(#g-Global)"        strokeWidth={2.5} dot={chartData.length <= 6} activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="Environnement" name="Environnement" stroke="#16a34a" fill="url(#g-Environnement)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Area type="monotone" dataKey="Social"        name="Social"       stroke="#2563eb" fill="url(#g-Social)"        strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Area type="monotone" dataKey="Gouvernance"   name="Gouvernance"  stroke="#7c3aed" fill="url(#g-Gouvernance)"   strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* ── History table ── */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar size={18} className="text-gray-400" />
                Tableau de l'historique
              </h2>
              <span className="text-xs text-gray-400">{filteredHistory.length} entrée{filteredHistory.length > 1 ? 's' : ''}</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Global</th>
                    <th className="px-4 py-3 text-xs font-semibold text-emerald-600 uppercase tracking-wide text-center">E</th>
                    <th className="px-4 py-3 text-xs font-semibold text-blue-600 uppercase tracking-wide text-center">S</th>
                    <th className="px-4 py-3 text-xs font-semibold text-purple-600 uppercase tracking-wide text-center">G</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Note</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Δ Global</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tableRows.map((s, idx) => {
                    const isLatest = idx === 0;
                    const next = filteredHistory[idx + 1];
                    const delta = next ? s.overall_score - next.overall_score : null;
                    return (
                      <tr key={s.id} className={`hover:bg-gray-50/50 transition-colors ${isLatest ? 'bg-indigo-50/20' : ''}`}>
                        <td className="px-4 py-3 text-gray-700 font-medium">
                          {new Date(s.calculation_date).toLocaleDateString('fr-FR')}
                          {isLatest && (
                            <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">Actuel</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-lg font-bold text-indigo-600">{Math.round(s.overall_score)}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-emerald-600">{Math.round(s.environmental_score)}</td>
                        <td className="px-4 py-3 text-center font-semibold text-blue-600">{Math.round(s.social_score)}</td>
                        <td className="px-4 py-3 text-center font-semibold text-purple-600">{Math.round(s.governance_score)}</td>
                        <td className="px-4 py-3 text-center">
                          {(s.rating || s.grade) ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${gradeColor(s.rating || s.grade)}`}>
                              {s.rating || s.grade}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {delta !== null ? (
                            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                              {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                              {delta >= 0 ? '+' : ''}{Math.round(delta)}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredHistory.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAll(v => !v)}
                className="mt-3 w-full text-center text-xs text-gray-400 hover:text-indigo-600 font-medium flex items-center justify-center gap-1 transition-colors"
              >
                {showAll ? 'Voir moins' : `Voir les ${filteredHistory.length - 8} entrées suivantes`}
                <ChevronRight size={12} className={showAll ? 'rotate-90' : ''} />
              </button>
            )}
          </Card>

          {/* ── CTA ── */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => navigate('/app/scores/calculate')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Sparkles size={15} /> Nouveau calcul
            </button>
            <button
              onClick={() => navigate('/app/ai-insights')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-indigo-300 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
            >
              Insights IA <ArrowUpRight size={14} />
            </button>
          </div>
        </>
      ) : error ? (
        <Card>
          <div className="text-center py-16">
            <BarChart3 className="h-14 w-14 mx-auto text-red-200 mb-4" />
            <p className="text-lg font-semibold text-gray-900">Erreur de chargement</p>
            <p className="text-sm text-gray-500 mt-2">Impossible de charger l'historique des scores.</p>
            <button onClick={loadHistory} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
              <RefreshCw size={14} /> Réessayer
            </button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="text-center py-16">
            <BarChart3 className="h-14 w-14 mx-auto text-gray-200 mb-4" />
            <p className="text-lg font-semibold text-gray-900">Aucun score calculé</p>
            <p className="text-sm text-gray-500 mt-2">Calculez votre premier score ESG pour voir l'évolution dans le temps.</p>
            <button
              onClick={() => navigate('/app/scores/calculate')}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              <Sparkles size={14} /> Calculer mon premier score
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
