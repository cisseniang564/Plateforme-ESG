import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calculator,
  RefreshCw,
  History,
  CheckCircle,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  Leaf,
  Users,
  Landmark,
  ChevronRight,
  Clock,
  BarChart2,
  ShieldCheck,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Spinner from '@/components/common/Spinner';
import BackButton from '@/components/common/BackButton';
import ESGScoreCard from '@/components/ESG/ESGScoreCard';
import api from '@/services/api';
import toast from 'react-hot-toast';

/* ── Period toggle ────────────────────────────────────────────────────── */
const PERIODS = [
  { value: '3',  label: '3 mois' },
  { value: '6',  label: '6 mois' },
  { value: '12', label: '12 mois' },
  { value: '24', label: '2 ans' },
  { value: '36', label: '3 ans' },
];

/* ── Quality ring ─────────────────────────────────────────────────────── */
function QualityRing({ value, label, color }: { value: number; label: string; color: string }) {
  const R = 22, circ = 2 * Math.PI * R;
  const dash = (Math.min(Math.max(value, 0), 100) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={R} fill="none" stroke="#f3f4f6" strokeWidth="5" />
        <circle
          cx="28" cy="28" r={R}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          transform="rotate(-90 28 28)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="28" y="32" textAnchor="middle" fontSize="11" fontWeight="700" fill="#374151" fontFamily="system-ui">
          {Math.round(value)}
        </text>
      </svg>
      <p className="text-xs text-gray-500 text-center leading-tight">{label}</p>
    </div>
  );
}

/* ── Historical score row ─────────────────────────────────────────────── */
function HistoryRow({ score, index }: { score: any; index: number }) {
  const RATING_COLOR: Record<string, string> = {
    AAA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    AA:  'bg-green-50 text-green-700 border-green-200',
    A:   'bg-lime-50 text-lime-700 border-lime-200',
    BBB: 'bg-blue-50 text-blue-700 border-blue-200',
    BB:  'bg-sky-50 text-sky-700 border-sky-200',
    B:   'bg-indigo-50 text-indigo-700 border-indigo-200',
    CCC: 'bg-amber-50 text-amber-700 border-amber-200',
    CC:  'bg-orange-50 text-orange-700 border-orange-200',
    C:   'bg-red-50 text-red-700 border-red-200',
  };
  const cls = RATING_COLOR[score.rating] ?? 'bg-gray-50 text-gray-600 border-gray-200';
  const date = score.calculation_date ?? score.score_date ?? score.created_at;
  const dateStr = date ? new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${index === 0 ? 'bg-indigo-50 border border-indigo-100' : 'bg-gray-50 hover:bg-gray-100'}`}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-500 shadow-sm border border-gray-100">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{dateStr}</p>
        <p className="text-base font-bold text-gray-900 tabular-nums">{Math.round(score.overall_score ?? 0)}<span className="text-xs font-normal text-gray-400"> /100</span></p>
      </div>
      <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-xs font-bold ${cls}`}>{score.rating}</span>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────── */
export default function OrganizationScoring() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [organization, setOrganization] = useState<any>(null);
  const [currentScore, setCurrentScore] = useState<any>(null);
  const [historicalScores, setHistoricalScores] = useState<any[]>([]);
  const [dataQuality, setDataQuality] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('12');

  useEffect(() => {
    if (id) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadData = async () => {
    try {
      const [orgRes, scoresRes, qualityRes] = await Promise.all([
        api.get(`/organizations/${id}`),
        api.get(`/esg-scoring/organization/${id}`).catch(() => ({ data: { scores: [] } })),
        api.post('/esg-scoring/data-quality', { organization_id: id }).catch(() => ({ data: null })),
      ]);
      setOrganization(orgRes.data);
      setHistoricalScores(scoresRes.data.scores || []);
      setCurrentScore(scoresRes.data.scores?.[0] || null);
      setDataQuality(qualityRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateScore = async () => {
    setCalculating(true);
    try {
      const response = await api.post('/esg-scoring/calculate', {
        organization_id: id,
        period_months: parseInt(selectedPeriod, 10),
      });
      setCurrentScore(response.data);
      await loadData();
      toast.success(t('scores.calcSuccess', 'Score ESG calculé avec succès ✓'));
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('scores.calcScoreError', 'Erreur lors du calcul du score'));
    } finally {
      setCalculating(false);
    }
  };

  const handleExportCSV = () => {
    if (!currentScore) return;
    const rows = [
      ['Organisation', organization?.name ?? ''],
      ['Score global', Math.round(currentScore.overall_score)],
      ['Rating', currentScore.rating],
      ['Environnement', Math.round(currentScore.pillar_scores?.environmental ?? 0)],
      ['Social', Math.round(currentScore.pillar_scores?.social ?? 0)],
      ['Gouvernance', Math.round(currentScore.pillar_scores?.governance ?? 0)],
      ['Complétude données', `${Math.round(currentScore.data_completeness ?? 0)}%`],
      ['Confiance', currentScore.confidence_level],
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `score-esg-${organization?.name ?? 'org'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  /* ── Chart data ─────────────────────────────────────────────────────── */
  const chartData = [...historicalScores]
    .reverse()
    .slice(-8)
    .map((s: any) => {
      const date = s.calculation_date ?? s.score_date ?? s.created_at;
      return {
        date: date ? new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—',
        score: Math.round(s.overall_score ?? 0),
        env:   Math.round(s.pillar_scores?.environmental ?? 0),
        soc:   Math.round(s.pillar_scores?.social ?? 0),
        gov:   Math.round(s.pillar_scores?.governance ?? 0),
      };
    });

  /* ── Trend vs previous ───────────────────────────────────────────────── */
  const prevScore = historicalScores[1]?.overall_score;
  const trendDiff = currentScore && prevScore ? currentScore.overall_score - prevScore : null;

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Spinner size="lg" />
        <p className="text-sm text-gray-400">Chargement des données…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton to="/app/scores" label="Scores ESG" />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-blue-700 to-violet-700 p-8 text-white shadow-2xl">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 left-1/4 h-48 w-48 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left */}
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
              <Zap className="h-3.5 w-3.5" />
              Calcul automatique ESG
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              {organization?.name ?? t('scores.defaultOrg', 'Organisation')}
            </h1>
            {organization?.sector && (
              <p className="mt-1 text-sm text-white/70">{organization.sector}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {currentScore && (
                <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10 font-semibold">
                  Score actuel : {Math.round(currentScore.overall_score)} / 100
                </span>
              )}
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10 text-white/70">
                {historicalScores.length} calcul{historicalScores.length !== 1 ? 's' : ''} effectué{historicalScores.length !== 1 ? 's' : ''}
              </span>
              {trendDiff !== null && (
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ring-1 ring-white/10 font-semibold ${trendDiff >= 0 ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}>
                  {trendDiff >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {trendDiff >= 0 ? '+' : ''}{trendDiff.toFixed(1)} pts
                </span>
              )}
            </div>
          </div>

          {/* Right: action panel */}
          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            {/* Period selector */}
            <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1 ring-1 ring-white/20">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setSelectedPeriod(p.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedPeriod === p.value
                      ? 'bg-white text-indigo-800 shadow'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleCalculateScore}
                disabled={calculating}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-800 shadow-lg transition-all hover:bg-white/90 active:scale-95 disabled:opacity-60"
              >
                {calculating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Calcul en cours…
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4" />
                    {t('scores.calculateScore2', 'Calculer le score')}
                  </>
                )}
              </button>

              {historicalScores.length > 0 && (
                <button
                  onClick={() => navigate('/app/scores/history')}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
                >
                  <History className="h-4 w-4" />
                  Historique
                </button>
              )}

              {currentScore && (
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Calculating overlay animation ──────────────────────────────── */}
      {calculating && (
        <div className="flex items-center gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100">
            <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-indigo-900">Calcul ESG en cours…</p>
            <p className="text-sm text-indigo-600">
              Analyse des données des {selectedPeriod} derniers mois · Cela peut prendre quelques secondes
            </p>
          </div>
          <div className="ml-auto flex gap-1">
            {[0, 150, 300].map((delay) => (
              <div
                key={delay}
                className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Score + Quality ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ESG Score card — 2/3 */}
        <div className="lg:col-span-2">
          {currentScore ? (
            <ESGScoreCard score={currentScore} previousScore={historicalScores[1]?.overall_score} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-200 bg-indigo-50 px-8 py-16 text-center">
              <div className="relative mb-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-100">
                  <Calculator className="h-10 w-10 text-indigo-400" />
                </div>
                <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 ring-2 ring-white">
                  <span className="text-xs font-bold text-amber-600">?</span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('scores.noScoreCalculated', 'Aucun score calculé')}</h3>
              <p className="mt-2 max-w-xs text-sm text-gray-500">
                {t('scores.noScoreHint', 'Lancez le calcul pour obtenir votre score ESG basé sur les données disponibles.')}
              </p>
              <button
                onClick={handleCalculateScore}
                disabled={calculating}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-60"
              >
                {calculating ? <Spinner size="sm" /> : <Calculator className="h-4 w-4" />}
                {t('scores.calculateNow', 'Calculer maintenant')}
              </button>
              <p className="mt-3 text-xs text-gray-400">{t('scores.calcDurationHint', 'Durée estimée : 2-5 secondes')}</p>
            </div>
          )}
        </div>

        {/* Data quality panel — 1/3 */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              {t('scores.dataQuality', 'Qualité des données')}
            </h3>
          </div>

          {dataQuality ? (
            <div className="p-5 space-y-5">
              {/* Overall quality bar */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">{t('scores.globalScore', 'Score global')}</span>
                  <span className="text-sm font-bold text-gray-900">{dataQuality.overall_quality.toFixed(0)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${dataQuality.overall_quality}%`,
                      backgroundColor:
                        dataQuality.overall_quality >= 80 ? '#22c55e'
                        : dataQuality.overall_quality >= 60 ? '#3b82f6'
                        : '#f59e0b',
                    }}
                  />
                </div>
              </div>

              {/* Quality rings */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <QualityRing value={dataQuality.completeness}  label={t('scores.completeness', 'Complétude')}  color="#16a34a" />
                <QualityRing value={dataQuality.consistency}   label={t('scores.consistency', 'Cohérence')}    color="#2563eb" />
                <QualityRing value={dataQuality.accuracy}      label={t('scores.precision', 'Précision')}      color="#7c3aed" />
                <QualityRing value={dataQuality.timeliness}    label={t('scores.freshness', 'Fraîcheur')}      color="#0891b2" />
              </div>

              {/* Recommendations */}
              {dataQuality.recommendations?.length > 0 && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t('scores.recommendations', 'Recommandations')}
                  </p>
                  <ul className="space-y-1">
                    {dataQuality.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                        <span className="mt-0.5 text-amber-500">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action link */}
              <button
                onClick={() => navigate('/app/data-entry')}
                className="flex w-full items-center justify-between rounded-xl border border-gray-100 px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              >
                <span className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-indigo-400" />
                  Enrichir les données
                </span>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <ShieldCheck className="h-8 w-8 text-gray-200" />
              <p className="text-sm text-gray-400">{t('common.loading', 'Chargement…')}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Historical trend chart ─────────────────────────────────────── */}
      {chartData.length >= 2 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Évolution historique
              </h3>
              <p className="mt-0.5 text-sm text-gray-500">Score global E/S/G — {chartData.length} derniers calculs</p>
            </div>
            {trendDiff !== null && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${trendDiff >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {trendDiff >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {trendDiff >= 0 ? '+' : ''}{trendDiff.toFixed(1)} pts vs calcul précédent
              </span>
            )}
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradEnv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: '12px' }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = { score: 'Global', env: 'Env.', soc: 'Social', gov: 'Gouv.' };
                  return [`${value} / 100`, labels[name] ?? name];
                }}
              />
              <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradScore)" dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="env"   stroke="#16a34a" strokeWidth={1.5} fill="url(#gradEnv)"   dot={false} strokeDasharray="4 2" />
              <Area type="monotone" dataKey="soc"   stroke="#2563eb" strokeWidth={1.5} fill="none"            dot={false} strokeDasharray="4 2" />
              <Area type="monotone" dataKey="gov"   stroke="#7c3aed" strokeWidth={1.5} fill="none"            dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
            {[
              { color: '#6366f1', label: 'Score global', dashed: false },
              { color: '#16a34a', label: 'Environnement', dashed: true },
              { color: '#2563eb', label: 'Social',         dashed: true },
              { color: '#7c3aed', label: 'Gouvernance',   dashed: true },
            ].map((l) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <svg width="18" height="6" viewBox="0 0 18 6">
                  <line x1="0" y1="3" x2="18" y2="3" stroke={l.color} strokeWidth="2.5"
                    strokeDasharray={l.dashed ? '4 2' : 'none'} strokeLinecap="round" />
                </svg>
                {l.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Historical scores list ─────────────────────────────────────── */}
      {historicalScores.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Clock className="h-4 w-4 text-indigo-500" />
              Calculs récents
            </h3>
            <button
              onClick={() => navigate('/app/scores/history')}
              className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Voir tout <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4 space-y-2">
            {historicalScores.slice(0, 5).map((s: any, i: number) => (
              <HistoryRow key={s.id ?? i} score={s} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
