import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Award, Leaf, Users, Scale,
  TrendingUp, TrendingDown, Minus, Target, Brain,
  BarChart2, Radar as RadarIcon, AlignLeft, ChevronRight,
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ReferenceLine,
} from 'recharts';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

interface Score {
  overall_score: number;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  grade: string;
  calculated_at?: string;
}

interface Indicator {
  id: string;
  name: string;
  code?: string;
  pillar: string;
  weight: number;
}

/* ── Constants ────────────────────────────────────────────────────────── */
const PILLARS = [
  {
    key: 'environmental_score' as const,
    label: 'Environnemental', short: 'E', icon: Leaf,
    color: '#16a34a', bg: 'from-green-50 to-emerald-50',
    border: 'border-green-100', text: 'text-green-700', ringBg: '#16a34a',
  },
  {
    key: 'social_score' as const,
    label: 'Social', short: 'S', icon: Users,
    color: '#2563eb', bg: 'from-blue-50 to-sky-50',
    border: 'border-blue-100', text: 'text-blue-700', ringBg: '#2563eb',
  },
  {
    key: 'governance_score' as const,
    label: 'Gouvernance', short: 'G', icon: Scale,
    color: '#7c3aed', bg: 'from-purple-50 to-violet-50',
    border: 'border-purple-100', text: 'text-purple-700', ringBg: '#7c3aed',
  },
] as const;

const getGradeMetaMap = (t: TFunction): Record<string, { badge: string; glow: string; label: string }> => ({
  'A+': { badge: 'bg-emerald-500 text-white', glow: 'shadow-emerald-200', label: t('sbd.excellent', 'Excellent')    },
  A:   { badge: 'bg-green-500 text-white',    glow: 'shadow-green-200',   label: t('sbd.veryGood', 'Très bien')   },
  'B+': { badge: 'bg-lime-500 text-white',    glow: 'shadow-lime-200',    label: t('sbd.good', 'Bien')        },
  B:   { badge: 'bg-yellow-400 text-gray-900',glow: 'shadow-yellow-200',  label: t('sbd.average', 'Moyen')       },
  C:   { badge: 'bg-orange-400 text-white',   glow: 'shadow-orange-200',  label: t('sbd.insufficient', 'Insuffisant') },
  D:   { badge: 'bg-red-500 text-white',      glow: 'shadow-red-200',     label: t('sbd.critical', 'Critique')    },
});

function getGradeMeta(g: string, t: TFunction) {
  return getGradeMetaMap(t)[g] ?? { badge: 'bg-gray-400 text-white', glow: 'shadow-gray-200', label: '—' };
}

/* ── Hero score ring ──────────────────────────────────────────────────── */
function HeroRing({ score }: { score: number }) {
  const R = 48, circ = 2 * Math.PI * R;
  const dash = (Math.min(Math.max(score, 0), 100) / 100) * circ;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <defs>
        <linearGradient id="bdRingGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#93c5fd" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
      <circle
        cx="60" cy="60" r={R}
        fill="none" stroke="url(#bdRingGrad)" strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }}
      />
      <text x="60" y="55" textAnchor="middle" fontSize="28" fontWeight="700" fill="white" fontFamily="system-ui">
        {Math.round(score)}
      </text>
      <text x="60" y="74" textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.5)" fontFamily="system-ui">
        /100
      </text>
    </svg>
  );
}

/* ── Pillar ring (medium) ─────────────────────────────────────────────── */
function PillarRing({ score, color }: { score: number; color: string }) {
  const R = 30, circ = 2 * Math.PI * R;
  const dash = (Math.min(Math.max(score, 0), 100) / 100) * circ;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76">
      <circle cx="38" cy="38" r={R} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="8" />
      <circle
        cx="38" cy="38" r={R}
        fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        transform="rotate(-90 38 38)"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x="38" y="43" textAnchor="middle" fontSize="16" fontWeight="700" fill="#111827" fontFamily="system-ui">
        {Math.round(score)}
      </text>
    </svg>
  );
}

/* ── Score label ─────────────────────────────────────────────────────── */
function getScoreLabel(v: number, t: TFunction) {
  if (v >= 80) return { label: t('sbd.excellent', 'Excellent'),    Icon: TrendingUp,   cls: 'text-green-600 bg-green-50' };
  if (v >= 60) return { label: t('sbd.good', 'Bien'),              Icon: TrendingUp,   cls: 'text-blue-600 bg-blue-50'   };
  if (v >= 40) return { label: t('sbd.average', 'Moyen'),          Icon: Minus,        cls: 'text-amber-600 bg-amber-50'  };
  return              { label: t('sbd.toImprove', 'À améliorer'),  Icon: TrendingDown, cls: 'text-red-600 bg-red-50'     };
}

/* ── Tab button ──────────────────────────────────────────────────────── */
function Tab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
        active
          ? 'bg-white text-violet-800 shadow-sm border border-gray-100'
          : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

/* ── Main component ───────────────────────────────────────────────────── */
export default function ScoreBreakdown() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [score, setScore] = useState<Score | null>(null);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'radar' | 'bars'>('overview');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [scoreRes, indRes] = await Promise.all([
        api.get('/scores/latest').catch(() => null),
        api.get('/indicators/').catch(() => ({ data: { items: [] } })),
      ]);
      if (scoreRes) setScore(scoreRes.data);
      setIndicators(indRes.data.items || []);
    } finally {
      setLoading(false);
    }
  };

  /* ── Loading ──────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Spinner size="lg" />
        <p className="text-sm text-gray-400">Chargement du score…</p>
      </div>
    );
  }

  const radarData = PILLARS.map(p => ({
    pillar: p.short,
    fullLabel: p.label,
    value: score ? Math.round(score[p.key]) : 0,
    fullMark: 100,
  }));

  const barData = PILLARS.map(p => ({
    name: p.label,
    score: score ? Math.round(score[p.key]) : 0,
    color: p.color,
  }));

  const gradeMeta = score ? getGradeMeta(score.grade, t) : getGradeMeta('C', t);

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-purple-900 to-violet-800 p-8 text-white shadow-2xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 left-1/4 h-48 w-48 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
              <Award className="h-3.5 w-3.5" />
              {t('sbd.detailedAnalysis', 'Analyse détaillée')}
            </div>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">{t('sbd.title', 'Décomposition du Score ESG')}</h1>
            <p className="mt-1 text-sm text-white/70">{t('sbd.subtitle', 'Analyse pilier par pilier · Pondérations & indicateurs')}</p>
            {score?.calculated_at && (
              <p className="mt-3 text-xs text-white/40">
                Calculé le {new Date(score.calculated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          {score && (
            <div className="flex items-center gap-6 shrink-0">
              {/* Ring */}
              <div className="flex flex-col items-center gap-1">
                <HeroRing score={score.overall_score} />
                <p className="text-xs text-white/50">Score global</p>
              </div>
              {/* Grade badge */}
              <div className="flex flex-col items-center gap-2">
                <div className={`flex flex-col items-center gap-1 rounded-2xl px-6 py-3 shadow-xl ${gradeMeta.badge} ${gradeMeta.glow}`}>
                  <span className="text-3xl font-bold tracking-tight">{score.grade}</span>
                  <span className="text-xs font-medium opacity-80">{gradeMeta.label}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {score ? (
        <>
          {/* ── Pillar KPI cards ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PILLARS.map(p => {
              const val = Math.round(score[p.key]);
              const { label, Icon: SIcon, cls } = getScoreLabel(val, t);
              const Icon = p.icon;
              return (
                <div key={p.key} className={`overflow-hidden rounded-2xl border ${p.border} bg-gradient-to-br ${p.bg}`}>
                  {/* Top strip */}
                  <div className="h-1 w-full" style={{ backgroundColor: p.color }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="rounded-xl bg-white/70 p-2">
                            <Icon className={`h-4 w-4 ${p.text}`} />
                          </div>
                          <p className={`font-semibold ${p.text}`}>{p.label}</p>
                        </div>
                        <div className="mt-3 flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-gray-900">{val}</span>
                          <span className="text-sm text-gray-400">/100</span>
                        </div>
                        <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
                          <SIcon className="h-3 w-3" />
                          {label}
                        </span>
                      </div>
                      <PillarRing score={val} color={p.color} />
                    </div>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/60">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${val}%`, backgroundColor: p.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Tabs ──────────────────────────────────────────────────── */}
          <div className="flex gap-1 rounded-2xl bg-gray-100/80 p-1.5 w-fit">
            <Tab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={AlignLeft}  label="Progression" />
            <Tab active={activeTab === 'radar'}    onClick={() => setActiveTab('radar')}    icon={RadarIcon}  label="Radar" />
            <Tab active={activeTab === 'bars'}     onClick={() => setActiveTab('bars')}     icon={BarChart2}  label="Histogramme" />
          </div>

          {/* ── Overview tab ──────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Progress bars */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-5 font-semibold text-gray-900">Score global & piliers</h3>
                <div className="space-y-5">
                  {[
                    { label: 'Score global', value: score.overall_score, color: '#6366f1' },
                    ...PILLARS.map(p => ({ label: p.label, value: score[p.key] as number, color: p.color })),
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          {i > 0 && (() => {
                            const Icon = PILLARS[i - 1].icon;
                            return <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />;
                          })()}
                          {item.label}
                        </span>
                        <span className="text-sm font-bold text-gray-900">{item.value.toFixed(1)} / 100</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${item.value}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Indicators per pillar */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-5 font-semibold text-gray-900">Indicateurs par pilier</h3>
                <div className="space-y-5">
                  {PILLARS.map(p => {
                    const pillarInds = indicators.filter(i =>
                      i.pillar === p.key.replace('_score', '')
                    );
                    const Icon = p.icon;
                    return (
                      <div key={p.key}>
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-3.5 w-3.5 ${p.text}`} />
                            <p className={`text-xs font-bold uppercase tracking-wide ${p.text}`}>{p.label}</p>
                          </div>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                            {pillarInds.length} indicateur{pillarInds.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {pillarInds.slice(0, 5).map(ind => (
                            <span
                              key={ind.id}
                              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium`}
                              style={{
                                backgroundColor: `${p.color}15`,
                                borderColor: `${p.color}30`,
                                color: p.color,
                              }}
                            >
                              {ind.name.length > 22 ? ind.name.slice(0, 22) + '…' : ind.name}
                            </span>
                          ))}
                          {pillarInds.length > 5 && (
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
                              +{pillarInds.length - 5}
                            </span>
                          )}
                          {pillarInds.length === 0 && (
                            <span className="text-xs italic text-gray-400">{t('sbd.noIndicator', 'Aucun indicateur configuré')}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Radar tab ─────────────────────────────────────────────── */}
          {activeTab === 'radar' && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-1 font-semibold text-gray-900">Profil ESG — vue radar</h3>
              <p className="mb-6 text-sm text-gray-500">{t('sbd.chartDesc', 'Représentation graphique des 3 piliers')}</p>
              <ResponsiveContainer width="100%" height={380}>
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="#f3f4f6" />
                  <PolarAngleAxis
                    dataKey="pillar"
                    tick={{ fontSize: 14, fontWeight: 700 }}
                  />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Radar
                    name="Score" dataKey="value"
                    stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2}
                    strokeWidth={2.5}
                    dot={{ fill: '#7c3aed', r: 5 }}
                  />
                  <Tooltip
                    formatter={(v: number, _: any, props: any) => [`${v} / 100`, props.payload.fullLabel]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="mt-4 flex flex-wrap justify-center gap-6 text-xs">
                {PILLARS.map(p => (
                  <span key={p.key} className="flex items-center gap-2">
                    <p.icon className={`h-3.5 w-3.5 ${p.text}`} />
                    <span className="font-medium text-gray-700">{p.label}</span>
                    <span className="font-bold" style={{ color: p.color }}>
                      {Math.round(score[p.key])} / 100
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Bars tab ──────────────────────────────────────────────── */}
          {activeTab === 'bars' && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-1 font-semibold text-gray-900">Scores par pilier</h3>
              <p className="mb-6 text-sm text-gray-500">Comparaison visuelle des piliers E, S, G</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} barSize={60}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#374151' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    formatter={(v: number) => [`${v} / 100`, 'Score pilier']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  />
                  <ReferenceLine y={50} stroke="#e5e7eb" strokeDasharray="4 4" label={{ value: 'Moy. 50', position: 'right', fontSize: 11, fill: '#9ca3af' }} />
                  <Bar dataKey="score" radius={[10, 10, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.9} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── CTAs ──────────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/app/scores/calculate')}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 active:scale-95"
            >
              <Target className="h-4 w-4" />
              Recalculer le score
            </button>
            <button
              onClick={() => navigate('/app/ai-insights')}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
            >
              <Brain className="h-4 w-4" />
              Insights IA
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        /* ── Empty state ──────────────────────────────────────────────── */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-sm">
            <Award className="h-10 w-10 text-gray-300" />
          </div>
          <p className="mt-5 text-xl font-bold text-gray-900">Aucun score disponible</p>
          <p className="mt-2 text-sm text-gray-500">
            {t('sbd.emptyState', "Calculez votre premier score ESG pour voir l'analyse détaillée.")}
          </p>
          <button
            onClick={() => navigate('/app/scores/calculate')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700"
          >
            <Target className="h-4 w-4" />
            Calculer maintenant
          </button>
        </div>
      )}
    </div>
  );
}
