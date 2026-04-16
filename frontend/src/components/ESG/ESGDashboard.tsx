// frontend/src/components/esg/ESGDashboard.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCcw,
  AlertTriangle,
  ShieldCheck,
  Leaf,
  Users,
  Gavel,
} from 'lucide-react';

import { Line, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

// ✅ Robust api import: works whether you use default export or named export
import apiDefault, { api as apiNamed } from '@/services/api';
const api = apiNamed ?? apiDefault;

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend
);

type PillarKey = 'environmental' | 'social' | 'governance';

interface ScoreItem {
  id: string;
  date: string; // "2026-02-28"
  overall_score: number;
  rating: string;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  confidence_level?: string;
  data_completeness?: number;
}

interface OrgScoresResponse {
  organization_id: string;
  scores: ScoreItem[];
  count: number;
}

interface DataQualityResponse {
  overall_quality: number;
  completeness: number;
  consistency: number;
  accuracy: number;
  timeliness: number;
  recommendations: string[];
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatDateFR(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: '2-digit' });
}

function gradeColor(rating?: string) {
  if (!rating) return 'bg-gray-100 text-gray-700 ring-gray-200';
  if (rating.startsWith('A')) return 'bg-green-50 text-green-700 ring-green-200';
  if (rating.startsWith('B')) return 'bg-blue-50 text-blue-700 ring-blue-200';
  if (rating.startsWith('C')) return 'bg-yellow-50 text-yellow-800 ring-yellow-200';
  return 'bg-red-50 text-red-700 ring-red-200';
}

function confidenceBadge(conf?: string) {
  const c = (conf || '').toLowerCase();
  if (c === 'high')
    return { label: 'Confiance élevée', cls: 'bg-green-50 text-green-700 ring-green-200', Icon: ShieldCheck };
  if (c === 'medium')
    return { label: 'Confiance moyenne', cls: 'bg-blue-50 text-blue-700 ring-blue-200', Icon: ShieldCheck };
  if (c === 'low')
    return { label: 'Confiance faible', cls: 'bg-yellow-50 text-yellow-800 ring-yellow-200', Icon: AlertTriangle };
  if (c) return { label: `Confiance: ${conf}`, cls: 'bg-gray-50 text-gray-700 ring-gray-200', Icon: ShieldCheck };
  return { label: 'Confiance: N/A', cls: 'bg-gray-50 text-gray-700 ring-gray-200', Icon: ShieldCheck };
}

function PillarLabel(p: PillarKey) {
  if (p === 'environmental') return 'Environnement';
  if (p === 'social') return 'Social';
  return 'Gouvernance';
}

function PillarDotClass(p: PillarKey) {
  if (p === 'environmental') return 'bg-emerald-500';
  if (p === 'social') return 'bg-blue-500';
  return 'bg-violet-500';
}

function PillarIcon({ pillar }: { pillar: PillarKey }) {
  if (pillar === 'environmental') return <Leaf className="h-5 w-5" />;
  if (pillar === 'social') return <Users className="h-5 w-5" />;
  return <Gavel className="h-5 w-5" />;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="h-4 w-28 rounded bg-gray-100 animate-pulse" />
      <div className="mt-4 h-8 w-20 rounded bg-gray-100 animate-pulse" />
      <div className="mt-3 h-3 w-40 rounded bg-gray-100 animate-pulse" />
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  accentClass,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  accentClass: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="mt-2 text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className={`rounded-lg p-3 ${accentClass}`}>{icon}</div>
      </div>
    </div>
  );
}

function DeltaBadge({ label, delta }: { label: string; delta: number | null }) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-600 ring-1 ring-gray-200">
        <span className="h-2 w-2 rounded-full bg-gray-300" />
        {label}: N/A
      </span>
    );
  }
  const up = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1 ${
        up
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-rose-50 text-rose-700 ring-rose-200'
      }`}
      title="Variation vs période précédente"
    >
      {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {label}: {up ? '+' : ''}
      {(delta ?? 0).toFixed(1)}
    </span>
  );
}

function QualityMini({ label, value }: { label: string; value: number }) {
  const v = Number.isFinite(value) ? value : 0;
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{v.toFixed(0)}</p>
      <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
        <div className="h-2 rounded-full bg-gray-900" style={{ width: `${clamp(v, 0, 100)}%` }} />
      </div>
    </div>
  );
}

function ActivityIcon() {
  return (
    <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 14l4-6 4 10 4-7 4 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const ESGDashboard: React.FC<{ companyId: string }> = ({ companyId }) => {
  const [orgScores, setOrgScores] = useState<OrgScoresResponse | null>(null);
  const [dataQuality, setDataQuality] = useState<DataQualityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingQuality, setLoadingQuality] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showRadar, setShowRadar] = useState(true);
  const [periodMonths, setPeriodMonths] = useState<number>(12);

  const scores = orgScores?.scores || [];
  const latest = scores[0] ?? null;
  const previous = scores[1] ?? null;

  const deltas = useMemo(() => {
    if (!latest || !previous) {
      return { overall: null, environmental: null, social: null, governance: null };
    }
    return {
      overall: latest.overall_score - previous.overall_score,
      environmental: latest.environmental_score - previous.environmental_score,
      social: latest.social_score - previous.social_score,
      governance: latest.governance_score - previous.governance_score,
    };
  }, [latest, previous]);

  const fetchScores = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<OrgScoresResponse>(`/esg-scoring/organization/${companyId}`);

      const sorted = [...(res.data.scores || [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setOrgScores({
        ...res.data,
        scores: sorted,
        count: sorted.length,
      });
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.detail || "Impossible de charger les scores ESG.");
      setOrgScores(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchDataQuality = async () => {
    setLoadingQuality(true);
    try {
      const res = await api.post<DataQualityResponse>(`/esg-scoring/data-quality`, {
        organization_id: companyId,
        period_months: periodMonths,
      });
      setDataQuality(res.data);
    } catch (e: any) {
      console.error(e);
      setDataQuality(null);
    } finally {
      setLoadingQuality(false);
    }
  };

  useEffect(() => {
    if (!companyId) return;
    fetchScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    fetchDataQuality();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, periodMonths]);

  const chartData = useMemo(() => {
    const asc = [...scores].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      labels: asc.map((s) => formatDateFR(s.date)),
      datasets: [
        {
          label: 'Global',
          data: asc.map((s) => s.overall_score),
          borderColor: '#111827',
          backgroundColor: 'rgba(17, 24, 39, 0.08)',
          tension: 0.35,
          pointRadius: 2,
          fill: true,
        },
        {
          label: 'Environnement',
          data: asc.map((s) => s.environmental_score),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          tension: 0.35,
          pointRadius: 2,
          fill: false,
        },
        {
          label: 'Social',
          data: asc.map((s) => s.social_score),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          tension: 0.35,
          pointRadius: 2,
          fill: false,
        },
        {
          label: 'Gouvernance',
          data: asc.map((s) => s.governance_score),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.08)',
          tension: 0.35,
          pointRadius: 2,
          fill: false,
        },
      ],
    };
  }, [scores]);

  // ✅ Radar: only show company dataset (no null benchmark => no crash)
  const radarData = useMemo(() => {
    const env = latest ? latest.environmental_score : 0;
    const soc = latest ? latest.social_score : 0;
    const gov = latest ? latest.governance_score : 0;

    return {
      labels: ['Environnement', 'Social', 'Gouvernance'],
      datasets: [
        {
          label: 'Votre entreprise',
          data: [env, soc, gov],
          backgroundColor: 'rgba(17, 24, 39, 0.12)',
          borderColor: '#111827',
          pointBackgroundColor: '#111827',
        },
      ],
    };
  }, [latest]);

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' as const },
        tooltip: { mode: 'index' as const, intersect: false },
      },
      interaction: { mode: 'index' as const, intersect: false },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20 },
          grid: { color: 'rgba(17, 24, 39, 0.06)' },
        },
        x: { grid: { display: false } },
      },
    }),
    []
  );

  const radarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' as const },
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20 },
          grid: { color: 'rgba(17, 24, 39, 0.06)' },
          angleLines: { color: 'rgba(17, 24, 39, 0.06)' },
        },
      },
    }),
    []
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="h-7 w-56 rounded bg-gray-100 animate-pulse" />
            <div className="mt-2 h-4 w-72 rounded bg-gray-100 animate-pulse" />
          </div>
          <div className="h-10 w-32 rounded bg-gray-100 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
            <div className="mt-4 h-64 w-full rounded bg-gray-100 animate-pulse" />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
            <div className="mt-4 h-64 w-full rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-semibold">Erreur</p>
            <p className="mt-1 text-sm">{error}</p>
            <button
              onClick={fetchScores}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              <RefreshCcw className="h-4 w-4" />
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-gray-900">Aucun score disponible</p>
        <p className="mt-2 text-sm text-gray-600">
          Calcule un score ESG pour commencer (ou vérifie que des données d’indicateurs existent).
        </p>
        <button
          onClick={() => {
            fetchScores();
            fetchDataQuality();
          }}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          <RefreshCcw className="h-4 w-4" />
          Rafraîchir
        </button>
      </div>
    );
  }

  const conf = confidenceBadge(latest.confidence_level);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Tableau de bord ESG</h2>
          <p className="mt-1 text-sm text-gray-600">
            Dernière mise à jour : <span className="font-medium">{formatDateFR(latest.date)}</span>
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1 ${gradeColor(latest.rating)}`}>
              <span className="font-semibold">{latest.rating}</span>
              <span className="text-gray-500">— Rating</span>
            </span>

            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1 ${conf.cls}`}>
              <conf.Icon className="h-3.5 w-3.5" />
              {conf.label}
            </span>

            {typeof latest.data_completeness === 'number' && (
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-700 ring-1 ring-gray-200">
                Complétude : <span className="font-semibold">{latest.data_completeness.toFixed(0)}%</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <label htmlFor="period-select" className="text-xs text-gray-600">Période</label>
            <select
              id="period-select"
              aria-label="Sélectionner la période"
              value={periodMonths}
              onChange={(e) => setPeriodMonths(Number(e.target.value))}
              className="text-sm font-medium text-gray-900 outline-none"
            >
              <option value={3}>3 mois</option>
              <option value={6}>6 mois</option>
              <option value={12}>12 mois</option>
              <option value={24}>24 mois</option>
            </select>
          </div>

          <button
            onClick={() => {
              fetchScores();
              fetchDataQuality();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            <RefreshCcw className="h-4 w-4" />
            Actualiser
          </button>

          <button
            onClick={() => setShowRadar((v) => !v)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            {showRadar ? 'Masquer radar' : 'Afficher radar'}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Score global"
          value={Math.round(latest.overall_score ?? 0).toString()}
          subtitle="Sur 100"
          icon={<ActivityIcon />}
          accentClass="bg-gray-900 text-white"
        />
        <StatCard
          title="Environnement"
          value={Math.round(latest.environmental_score ?? 0).toString()}
          subtitle="Pilier E"
          icon={<Leaf className="h-6 w-6 text-emerald-700" />}
          accentClass="bg-emerald-50"
        />
        <StatCard
          title="Social"
          value={Math.round(latest.social_score ?? 0).toString()}
          subtitle="Pilier S"
          icon={<Users className="h-6 w-6 text-blue-700" />}
          accentClass="bg-blue-50"
        />
        <StatCard
          title="Gouvernance"
          value={Math.round(latest.governance_score ?? 0).toString()}
          subtitle="Pilier G"
          icon={<Gavel className="h-6 w-6 text-violet-700" />}
          accentClass="bg-violet-50"
        />
      </div>

      {/* Delta row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-600">Variation vs score précédent :</span>
        <DeltaBadge label="Global" delta={deltas.overall} />
        <DeltaBadge label="E" delta={deltas.environmental} />
        <DeltaBadge label="S" delta={deltas.social} />
        <DeltaBadge label="G" delta={deltas.governance} />
      </div>

      {/* Charts */}
      <div className={`grid grid-cols-1 ${showRadar ? 'md:grid-cols-2' : ''} gap-6`}>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Évolution des scores</p>
              <p className="mt-1 text-xs text-gray-600">Global & piliers (0–100)</p>
            </div>
            <div className="text-xs text-gray-500">{scores.length} point(s)</div>
          </div>
          <div className="mt-4 h-72">
            <Line data={chartData as any} options={lineOptions as any} />
          </div>
        </div>

        {showRadar && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Profil ESG</p>
                <p className="mt-1 text-xs text-gray-600">Dernier score (benchmark à connecter)</p>
              </div>
              <span className="text-xs text-gray-500">Radar</span>
            </div>
            <div className="mt-4 h-72">
              <Radar data={radarData as any} options={radarOptions as any} />
            </div>
          </div>
        )}
      </div>

      {/* Data quality */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Qualité des données</p>
            <p className="mt-1 text-xs text-gray-600">
              Calculée sur la période sélectionnée ({periodMonths} mois)
            </p>
          </div>
          <button
            onClick={fetchDataQuality}
            disabled={loadingQuality}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${loadingQuality ? 'animate-spin' : ''}`} />
            Recalculer
          </button>
        </div>

        {dataQuality ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <QualityMini label="Qualité globale" value={dataQuality.overall_quality} />
            <QualityMini label="Complétude" value={dataQuality.completeness} />
            <QualityMini label="Cohérence" value={dataQuality.consistency} />
            <QualityMini label="Exactitude" value={dataQuality.accuracy} />
            <QualityMini label="Fraîcheur" value={dataQuality.timeliness} />

            {dataQuality.recommendations?.length > 0 && (
              <div className="md:col-span-5 mt-2 rounded-lg bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Recommandations
                </p>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {dataQuality.recommendations.slice(0, 5).map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-600">
            Aucune donnée de qualité disponible (endpoint non appelé ou données insuffisantes).
          </p>
        )}
      </div>

      {/* Pillar breakdown quick view */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-900">Lecture rapide</p>
        <p className="mt-1 text-xs text-gray-600">Dernière mesure</p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['environmental', 'social', 'governance'] as PillarKey[]).map((p) => {
            const score =
              p === 'environmental'
                ? latest.environmental_score
                : p === 'social'
                ? latest.social_score
                : latest.governance_score;

            return (
              <div key={p} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${PillarDotClass(p)}`} />
                    <span className="text-sm font-semibold text-gray-900">{PillarLabel(p)}</span>
                  </div>
                  <PillarIcon pillar={p} />
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <div className="text-3xl font-semibold text-gray-900">{Math.round(score ?? 0)}</div>
                  <div className="text-sm text-gray-500">/100</div>
                </div>

                <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
                  <div
                    className={`h-2 rounded-full ${PillarDotClass(p)}`}
                    style={{ width: `${clamp(score, 0, 100)}%` }}
                  />
                </div>

                <div className="mt-3 text-xs text-gray-600">
                  {score >= 70 ? 'Très bon niveau' : score >= 50 ? 'Niveau correct' : score >= 30 ? 'À améliorer' : 'Critique'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};