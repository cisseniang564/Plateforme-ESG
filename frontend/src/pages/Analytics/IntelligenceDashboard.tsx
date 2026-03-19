import { useState, useEffect } from 'react';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Activity,
  CheckCircle,
  ArrowRight,
  Zap,
  Target,
  Minus,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Card from '@/components/common/Card';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';

interface Anomaly {
  id: string;
  metric_name: string;
  value: number;
  expected_range: string;
  deviation: string;
  severity: 'high' | 'medium';
  period: string;
  category: string;
  pillar: string;
  message: string;
}

interface Suggestion {
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  impact: string;
  effort: string;
}

interface Prediction {
  indicator_id: string;
  indicator_name: string;
  indicator_code: string;
  unit: string;
  historical_points: number;
  r2_score: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  last_value: number;
  predicted_next_month: number | null;
  predicted_next_year: number | null;
  future_points: Array<{ date: string; predicted_value: number; confidence: number }>;
}

interface Insights {
  year: number;
  data_quality: {
    total_count: number;
    verified_count: number;
    completion_rate: number;
  };
  trends: {
    improving_metrics: number;
    declining_metrics: number;
    stable_metrics: number;
  };
  recommendations: Array<{ type: string; priority: string; message: string; action: string }>;
  achievements: Array<{ type: string; message: string }>;
}

const PRIORITY_CONFIG = {
  high: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', label: 'Haute' },
  medium: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', label: 'Moyenne' },
  low: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', label: 'Faible' },
};

const TREND_CONFIG = {
  increasing: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', label: 'Hausse' },
  decreasing: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50', label: 'Baisse' },
  stable: { icon: Minus, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Stable' },
};

const CURRENT_YEAR = new Date().getFullYear();

export default function IntelligenceDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'predictions' | 'anomalies' | 'insights' | 'suggestions'>('predictions');
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [horizon, setHorizon] = useState(12);
  const [totalPredictions, setTotalPredictions] = useState(0);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadPredictions(); }, [horizon]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadAnomalies(), loadInsights(), loadSuggestions(), loadPredictions()]);
    setLoading(false);
  };

  const loadAnomalies = async () => {
    try {
      const r = await api.get('/analytics/anomalies');
      setAnomalies(r.data?.anomalies || []);
    } catch { setAnomalies([]); }
  };

  const loadInsights = async () => {
    try {
      const r = await api.get(`/analytics/insights?year=${CURRENT_YEAR}`);
      setInsights(r.data);
    } catch { setInsights(null); }
  };

  const loadSuggestions = async () => {
    try {
      const r = await api.get(`/analytics/suggestions?year=${CURRENT_YEAR}`);
      setSuggestions(r.data?.suggestions || []);
    } catch { setSuggestions([]); }
  };

  const loadPredictions = async () => {
    try {
      const r = await api.get(`/analytics/predictions?horizon=${horizon}`);
      const preds = r.data?.predictions || [];
      setPredictions(preds);
      setTotalPredictions(r.data?.total_indicators || 0);
      if (preds.length > 0) setSelectedPrediction(preds[0]);
    } catch { setPredictions([]); }
  };

  const buildChartData = (pred: Prediction) =>
    pred.future_points.slice(0, horizon).map((p) => ({
      date: format(new Date(p.date), 'MMM yy', { locale: fr }),
      Prévision: p.predicted_value,
      'Borne haute': p.predicted_value * (1 + (1 - p.confidence) * 0.12),
      'Borne basse': p.predicted_value * (1 - (1 - p.confidence) * 0.12),
    }));

  const TABS = [
    { id: 'predictions' as const, label: 'IA Prédictive', icon: Brain, count: totalPredictions },
    { id: 'anomalies' as const, label: 'Anomalies', icon: AlertTriangle, count: anomalies.length },
    { id: 'insights' as const, label: 'Insights', icon: Lightbulb, count: insights?.recommendations?.length ?? 0 },
    { id: 'suggestions' as const, label: 'Suggestions', icon: Sparkles, count: suggestions.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-500">Analyse IA en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-violet-900 to-indigo-800 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15">
              <Brain className="h-3.5 w-3.5" />
              Intelligence Artificielle
            </div>
            <h1 className="mt-4 flex items-center gap-3 text-4xl font-bold tracking-tight">
              <Zap className="h-10 w-10 text-violet-300" />
              IA Prédictive ESG
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/80 md:text-base">
              Détectez les anomalies, anticipez les tendances et recevez des recommandations
              intelligentes basées sur vos données ESG réelles.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Prédictions', value: totalPredictions },
              { label: 'Anomalies', value: anomalies.length },
              { label: 'Insights', value: insights?.recommendations?.length ?? 0 },
              { label: 'Suggestions', value: suggestions.length },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/70">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      {insights && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-600">Complétude données</p>
              <span className="text-2xl font-bold text-teal-600">{insights.data_quality.completion_rate.toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full">
              <div className="h-2 bg-teal-500 rounded-full" style={{ width: `${insights.data_quality.completion_rate}%` }} />
            </div>
          </Card>
          <Card className="border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Indicateurs en hausse</p>
              <span className="text-2xl font-bold text-green-600">{insights.trends.improving_metrics}</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">↑ {insights.trends.improving_metrics} améliorés</span>
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">↓ {insights.trends.declining_metrics} en déclin</span>
            </div>
          </Card>
          <Card className="border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Données vérifiées</p>
              <span className="text-2xl font-bold text-purple-600">{insights.data_quality.verified_count}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">sur {insights.data_quality.total_count} points</p>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  active ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${active ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── PREDICTIONS ── */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Prévisions IA</h2>
              <p className="text-sm text-gray-500">Régression linéaire OLS · {totalPredictions} indicateur{totalPredictions !== 1 ? 's' : ''} analysé{totalPredictions !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value={3}>3 mois</option>
                <option value={6}>6 mois</option>
                <option value={12}>12 mois</option>
                <option value={24}>24 mois</option>
              </select>
              <button
                onClick={loadPredictions}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition"
              >
                <Brain className="h-4 w-4" /> Recalculer
              </button>
            </div>
          </div>

          {predictions.length === 0 ? (
            <Card className="border border-gray-200">
              <div className="py-16 text-center">
                <Brain className="mx-auto mb-4 h-16 w-16 text-gray-200" />
                <p className="text-xl font-semibold text-gray-900">Aucune prédiction disponible</p>
                <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                  Saisissez des valeurs sur au moins 3 dates différentes pour un indicateur
                  afin que l'IA puisse calculer des tendances.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                {predictions.map((pred) => {
                  const T = TREND_CONFIG[pred.trend];
                  const TIcon = T.icon;
                  const active = selectedPrediction?.indicator_id === pred.indicator_id;
                  return (
                    <button
                      key={pred.indicator_id}
                      onClick={() => setSelectedPrediction(pred)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active ? 'border-violet-300 bg-violet-50 shadow-sm' : 'border-gray-200 bg-white hover:border-violet-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-mono text-gray-400">{pred.indicator_code}</p>
                          <p className="mt-0.5 text-sm font-semibold text-gray-900 truncate">{pred.indicator_name}</p>
                          <p className="mt-1 text-xs text-gray-500">R² = {pred.r2_score.toFixed(2)} · {pred.historical_points} pts</p>
                        </div>
                        <div className={`rounded-xl p-1.5 ${T.bg}`}>
                          <TIcon className={`h-4 w-4 ${T.color}`} />
                        </div>
                      </div>
                      {pred.predicted_next_month !== null && (
                        <p className="mt-2 text-xs text-gray-500">
                          Dans 1 mois : <span className="font-bold text-violet-700">{pred.predicted_next_month.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} {pred.unit}</span>
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="lg:col-span-2">
                {selectedPrediction && (
                  <Card className="border border-gray-200 shadow-sm">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <p className="text-xs font-mono text-gray-400">{selectedPrediction.indicator_code}</p>
                        <h3 className="text-lg font-semibold text-gray-900">{selectedPrediction.indicator_name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Tendance : <span className={`font-medium ${TREND_CONFIG[selectedPrediction.trend].color}`}>{TREND_CONFIG[selectedPrediction.trend].label}</span>
                          {' · '} R² = {selectedPrediction.r2_score.toFixed(3)}
                        </p>
                      </div>
                      {selectedPrediction.predicted_next_year !== null && (
                        <div className="rounded-2xl bg-violet-50 p-4 text-right">
                          <p className="text-xs text-violet-600">Dans 12 mois</p>
                          <p className="text-2xl font-bold text-violet-700">
                            {selectedPrediction.predicted_next_year.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
                          </p>
                          <p className="text-xs text-violet-500">{selectedPrediction.unit}</p>
                        </div>
                      )}
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={buildChartData(selectedPrediction)}>
                        <defs>
                          <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '11px' }} />
                        <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                        <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px' }} />
                        <Legend />
                        <Area type="monotone" dataKey="Borne haute" stroke="none" fill="#ede9fe" fillOpacity={0.4} />
                        <Area type="monotone" dataKey="Prévision" stroke="#7c3aed" strokeWidth={2.5} strokeDasharray="6 3" fill="url(#predGrad)" dot={false} />
                        <Area type="monotone" dataKey="Borne basse" stroke="none" fill="white" fillOpacity={1} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-violet-50 p-3 text-xs text-violet-700">
                      <Brain className="h-4 w-4 flex-shrink-0" />
                      Basé sur {selectedPrediction.historical_points} points historiques. Zone colorée = intervalle de confiance.
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ANOMALIES ── */}
      {activeTab === 'anomalies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Anomalies détectées</h2>
              <p className="text-sm text-gray-500">Valeurs dépassant 2σ de la moyenne historique</p>
            </div>
            <button onClick={loadAnomalies} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
              <RefreshCw className="h-4 w-4" /> Actualiser
            </button>
          </div>
          {anomalies.length === 0 ? (
            <Card className="border border-gray-200">
              <div className="py-16 text-center">
                <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-300" />
                <p className="text-xl font-semibold text-gray-900">Aucune anomalie détectée</p>
                <p className="mt-2 text-gray-500">Vos données sont cohérentes avec les tendances historiques.</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {anomalies.map((a) => (
                <div key={a.id} className={`rounded-2xl border p-5 ${a.severity === 'high' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`rounded-xl p-2 ${a.severity === 'high' ? 'bg-red-100' : 'bg-amber-100'}`}>
                      <AlertTriangle className={`h-5 w-5 ${a.severity === 'high' ? 'text-red-600' : 'text-amber-600'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{a.metric_name}</p>
                          <p className="text-sm text-gray-600 mt-1">{a.message}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${a.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {a.severity === 'high' ? 'Critique' : 'Modéré'}
                          </span>
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{a.deviation}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>Valeur : <strong className="text-gray-900">{a.value}</strong></span>
                        <span>Plage normale : <strong className="text-gray-900">{a.expected_range}</strong></span>
                        <span>Pilier : <strong className="text-gray-900 capitalize">{a.pillar}</strong></span>
                        {a.period && <span>Période : {new Date(a.period).toLocaleDateString('fr-FR')}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INSIGHTS ── */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Insights {CURRENT_YEAR}</h2>
          {!insights ? (
            <Card className="border border-gray-200"><div className="py-12 text-center text-gray-500">Données insuffisantes pour générer des insights.</div></Card>
          ) : (
            <>
              {insights.recommendations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Recommandations</h3>
                  {insights.recommendations.map((rec, i) => {
                    const p = PRIORITY_CONFIG[rec.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.low;
                    return (
                      <div key={i} className={`rounded-2xl border p-5 ${p.bg} ${p.border}`}>
                        <div className="flex items-start gap-3">
                          <Lightbulb className={`h-5 w-5 flex-shrink-0 mt-0.5 ${p.color}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{rec.message}</p>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.badge}`}>{p.label}</span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{rec.action}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {insights.achievements.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Accomplissements</h3>
                  {insights.achievements.map((a, i) => (
                    <div key={i} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                        <p className="font-medium text-emerald-900">{a.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {insights.recommendations.length === 0 && insights.achievements.length === 0 && (
                <Card className="border border-gray-200"><div className="py-12 text-center text-gray-500">Ajoutez des données pour obtenir des insights personnalisés.</div></Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ── SUGGESTIONS ── */}
      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Suggestions d'amélioration</h2>
          {suggestions.length === 0 ? (
            <Card className="border border-gray-200">
              <div className="py-16 text-center">
                <Sparkles className="mx-auto mb-4 h-16 w-16 text-gray-200" />
                <p className="text-xl font-semibold text-gray-900">Aucune suggestion pour l'instant</p>
                <p className="mt-2 text-gray-500">Saisissez des données ESG pour obtenir des recommandations.</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {suggestions.map((sug, i) => {
                const p = PRIORITY_CONFIG[sug.priority] || PRIORITY_CONFIG.low;
                return (
                  <div key={i} className={`rounded-2xl border p-6 ${p.bg} ${p.border}`}>
                    <div className="flex items-start justify-between mb-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.badge}`}>Priorité {p.label}</span>
                      <Sparkles className={`h-5 w-5 ${p.color}`} />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{sug.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{sug.description}</p>
                    <div className="flex flex-col gap-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-gray-600">Action : <strong>{sug.action}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-gray-600">Impact : <strong>{sug.impact}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-gray-600">Effort : <strong>{sug.effort}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
