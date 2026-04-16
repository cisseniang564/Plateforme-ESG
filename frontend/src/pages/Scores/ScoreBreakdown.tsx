import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Award, Leaf, Users, Scale,
  TrendingUp, TrendingDown, Minus, Target, Brain,
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ReferenceLine,
} from 'recharts';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';

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

const PILLARS = [
  { key: 'environmental_score', label: 'Environnemental', short: 'E', icon: Leaf,  color: '#22c55e', bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200'  },
  { key: 'social_score',        label: 'Social',           short: 'S', icon: Users, color: '#3b82f6', bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
  { key: 'governance_score',    label: 'Gouvernance',      short: 'G', icon: Scale, color: '#a855f7', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
] as const;

const GRADE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  'A+': { bg: 'bg-emerald-500', text: 'text-white', ring: 'ring-emerald-300' },
  A:   { bg: 'bg-green-500',   text: 'text-white', ring: 'ring-green-300'   },
  'B+': { bg: 'bg-lime-500',   text: 'text-white', ring: 'ring-lime-300'    },
  B:   { bg: 'bg-yellow-400',  text: 'text-gray-900', ring: 'ring-yellow-300' },
  C:   { bg: 'bg-orange-400',  text: 'text-white', ring: 'ring-orange-300'  },
  D:   { bg: 'bg-red-500',     text: 'text-white', ring: 'ring-red-300'     },
};

function ScoreRing({ value, color, size = 120 }: { value: number; color: string; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={10} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={10}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  );
}

function getScoreLabel(v: number) {
  if (v >= 80) return { label: 'Excellent', icon: TrendingUp, color: 'text-green-600' };
  if (v >= 60) return { label: 'Bien', icon: TrendingUp, color: 'text-blue-600' };
  if (v >= 40) return { label: 'Moyen', icon: Minus, color: 'text-amber-600' };
  return { label: 'À améliorer', icon: TrendingDown, color: 'text-red-600' };
}

export default function ScoreBreakdown() {
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

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center"><Spinner size="lg" /><p className="mt-4 text-gray-500">Chargement du score…</p></div>
    </div>
  );

  const radarData = PILLARS.map(p => ({
    pillar: p.short,
    fullLabel: p.label,
    value: score ? Math.round((score as any)[p.key]) : 0,
    fullMark: 100,
  }));

  const barData = PILLARS.map(p => ({
    name: p.label,
    score: score ? Math.round((score as any)[p.key]) : 0,
    color: p.color,
  }));

  const gradeStyle = score ? (GRADE_COLORS[score.grade] ?? GRADE_COLORS['C']) : GRADE_COLORS['C'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={16} /> Retour
        </button>
      </div>

      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-purple-900 to-violet-800 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
              <Award className="h-3.5 w-3.5" /> Analyse détaillée
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">Décomposition du Score ESG</h1>
            <p className="mt-2 text-sm text-white/80">Analyse pilier par pilier · Pondérations & indicateurs</p>
          </div>
          {score && (
            <div className="flex items-center gap-6">
              <div className="relative flex items-center justify-center">
                <ScoreRing value={score.overall_score} color="#a78bfa" size={110} />
                <div className="absolute text-center">
                  <p className="text-2xl font-bold">{score.overall_score.toFixed(0)}</p>
                  <p className="text-xs text-white/70">/100</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-white/70 mb-2">Note globale</p>
                <span className={`inline-block rounded-2xl px-5 py-2 text-2xl font-bold ring-2 ${gradeStyle.bg} ${gradeStyle.text} ${gradeStyle.ring}`}>
                  {score.grade}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {score ? (
        <>
          {/* Pillar KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PILLARS.map((p) => {
              const val = Math.round((score as any)[p.key]);
              const { label, icon: SIcon, color: sColor } = getScoreLabel(val);
              const Icon = p.icon;
              return (
                <div key={p.key} className={`rounded-2xl border ${p.border} ${p.bg} p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl p-2 bg-white/60">
                        <Icon className={`h-5 w-5 ${p.text}`} />
                      </div>
                      <p className={`font-semibold ${p.text}`}>{p.label}</p>
                    </div>
                    <span className="text-3xl font-bold text-gray-900">{val}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/60">
                    <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${val}%`, backgroundColor: p.color }} />
                  </div>
                  <div className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${sColor}`}>
                    <SIcon size={12} />
                    {label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {([
              { key: 'overview' as const, label: 'Barres de progression' },
              { key: 'radar' as const,    label: 'Radar' },
              { key: 'bars' as const,     label: 'Histogramme' },
            ]).map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <span className="pointer-events-none">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-5">Score global & piliers</h3>
                <div className="space-y-5">
                  {[
                    { label: 'Score global', value: score.overall_score, color: 'bg-violet-500' },
                    ...PILLARS.map(p => ({ label: p.label, value: (score as any)[p.key], color: `bg-[${p.color}]`, style: { backgroundColor: p.color } })),
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-700">{item.label}</span>
                        <span className="text-sm font-bold text-gray-900">{item.value.toFixed(1)} / 100</span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full">
                        <div
                          className={`h-3 rounded-full transition-all duration-700 ${i === 0 ? 'bg-violet-500' : ''}`}
                          style={{ width: `${item.value}%`, ...(i > 0 ? { backgroundColor: PILLARS[i - 1].color } : {}) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-5">Indicateurs par pilier</h3>
                {PILLARS.map(p => {
                  const pillarInds = indicators.filter(i => i.pillar === p.key.replace('_score', ''));
                  return (
                    <div key={p.key} className="mb-4 last:mb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p.icon size={14} className={p.text} />
                        <p className={`text-xs font-semibold uppercase tracking-wide ${p.text}`}>{p.label}</p>
                        <span className="ml-auto text-xs text-gray-400">{pillarInds.length} indicateur{pillarInds.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {pillarInds.slice(0, 5).map(ind => (
                          <span key={ind.id} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.bg} ${p.text}`}>
                            {ind.name.length > 20 ? ind.name.slice(0, 20) + '…' : ind.name}
                          </span>
                        ))}
                        {pillarInds.length > 5 && (
                          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
                            +{pillarInds.length - 5}
                          </span>
                        )}
                        {pillarInds.length === 0 && (
                          <span className="text-xs text-gray-400 italic">Aucun indicateur configuré</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Radar tab */}
          {activeTab === 'radar' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-6">Profil ESG — vue radar</h3>
              <ResponsiveContainer width="100%" height={360}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 13, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Score" dataKey="value"
                    stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25}
                    strokeWidth={2.5}
                  />
                  <Tooltip
                    formatter={(v: number, _: any, props: any) => [`${v}/100`, props.payload.fullLabel]}
                    contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bars tab */}
          {activeTab === 'bars' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-6">Scores par pilier</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(v: number) => [`${v} / 100`, 'Score']}
                    contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12 }}
                  />
                  <ReferenceLine y={50} stroke="#e5e7eb" strokeDasharray="4 4" />
                  <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/app/scores/calculate')}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
            >
              <Target size={16} /> Recalculer le score
            </button>
            <button
              onClick={() => navigate('/app/ai-insights')}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-100 transition-colors"
            >
              <Brain size={16} /> Insights IA
            </button>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <Award className="mx-auto mb-4 h-16 w-16 text-gray-200" />
          <p className="text-xl font-semibold text-gray-900">Aucun score disponible</p>
          <p className="mt-2 text-gray-500">Calculez votre premier score ESG pour voir l'analyse détaillée.</p>
          <button
            onClick={() => navigate('/app/scores/calculate')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
          >
            <Target size={16} /> Calculer maintenant
          </button>
        </div>
      )}
    </div>
  );
}
