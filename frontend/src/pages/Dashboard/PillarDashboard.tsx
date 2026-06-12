import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, Award, Leaf, Users, Shield } from 'lucide-react';
import ScoreCard from '@/components/widgets/ScoreCard';
import BarChart from '@/components/charts/BarChart';
import Spinner from '@/components/common/Spinner';
import BackButton from '@/components/common/BackButton';
import api from '@/services/api';

interface PillarScore {
  overall_score: number;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  grade: string;
  rating?: string;
  score_date: string;
}

interface Indicator {
  id: string;
  code: string;
  name: string;
  pillar: string;
  weight: number;
  target_value?: number;
  unit: string;
}

interface Upload {
  id: string;
  filename: string;
  status: string;
  created_at: string;
}

const PILLAR_TARGET = 85;

const PILLAR_COLORS: Record<string, string> = {
  environmental: 'green',
  social: 'blue',
  governance: 'purple',
};

const PILLAR_CHART_COLORS: Record<string, string> = {
  environmental: '#22c55e',
  social: '#3b82f6',
  governance: '#a855f7',
};

const PILLAR_GRADIENTS: Record<string, string> = {
  environmental: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
  social:        'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)',
  governance:    'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)',
};

const PILLAR_ICONS: Record<string, React.ElementType> = {
  environmental: Leaf,
  social:        Users,
  governance:    Shield,
};

const PILLAR_LABELS: Record<string, string> = {
  environmental: 'Environnement',
  social:        'Social',
  governance:    'Gouvernance',
};

export default function PillarDashboard() {
  const { pillar } = useParams<{ pillar: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [score, setScore] = useState<PillarScore | null>(null);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [recentUploads, setRecentUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [pillar]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [scoreRes, indicatorsRes, uploadsRes] = await Promise.all([
        api.get('/scores/latest').catch(() => null),
        api.get('/indicators/', { params: { pillar } }).catch(() => ({ data: { items: [] } })),
        api.get('/data/uploads', { params: { page_size: 3 } }).catch(() => ({ data: { items: [] } })),
      ]);

      if (scoreRes) setScore(scoreRes.data);
      setIndicators(indicatorsRes.data.items || []);
      setRecentUploads(uploadsRes.data.items || []);
    } catch (error) {
      console.error('Error loading pillar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const pillarKey = (pillar || 'environmental') as 'environmental' | 'social' | 'governance';
  const color = PILLAR_COLORS[pillarKey] || 'green';
  const chartColor = PILLAR_CHART_COLORS[pillarKey] || '#22c55e';

  const pillarScore = score
    ? pillarKey === 'environmental'
      ? score.environmental_score
      : pillarKey === 'social'
      ? score.social_score
      : score.governance_score
    : 0;

  const indicatorChartData = indicators.map(ind => ({
    name: ind.name.length > 22 ? ind.name.substring(0, 22) + '…' : ind.name,
    weight: ind.weight,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const PillarIcon = PILLAR_ICONS[pillarKey] ?? Leaf;

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-8 text-white shadow-xl"
        style={{ background: PILLAR_GRADIENTS[pillarKey] ?? PILLAR_GRADIENTS.environmental }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="relative">
          <BackButton to="/app" label={t('common.backToDashboard', 'Tableau de bord')} className="mb-4 text-white/70 hover:text-white" />
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <PillarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {PILLAR_LABELS[pillarKey] ?? pillarKey} — Tableau de bord
              </h1>
              <p className="text-sm text-white/70">
                {pillarKey === 'environmental'
                  ? t('pillars.environmentalDesc', 'Impact environnemental et métriques de durabilité')
                  : pillarKey === 'social'
                  ? t('pillars.socialDesc', 'Responsabilité sociale et impact communautaire')
                  : t('pillars.governanceDesc', 'Gouvernance d\'entreprise et éthique')}
              </p>
            </div>
          </div>
          {/* Score pill */}
          {pillarScore > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-sm font-semibold">
              <Award className="h-4 w-4" />
              Score actuel : {pillarScore.toFixed(1)} / 100
            </div>
          )}
        </div>
      </div>

      {score ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ScoreCard
            title={`${t(`pillars.${pillarKey}`, pillarKey)} Score`}
            score={pillarScore}
            trend={0}
            pillar={pillarKey}
          />

          {/* Performance vs Target */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm" title={t('scores.performanceVsTarget', 'Performance vs Target')}>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">{t('common.current', 'Current')}</span>
                  <span className="font-semibold text-gray-900">{pillarScore.toFixed(1)} / 100</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full bg-${color}-500 transition-all duration-500`}
                    style={{ width: `${Math.min(pillarScore, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">{t('common.target', 'Target')}</span>
                  <span className="font-semibold text-gray-900">{PILLAR_TARGET} / 100</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-gray-400"
                    style={{ width: `${PILLAR_TARGET}%` }}
                  />
                </div>
              </div>
              <p
                className={`text-sm font-semibold ${
                  pillarScore >= PILLAR_TARGET ? 'text-green-600' : 'text-orange-600'
                }`}
              >
                {pillarScore >= PILLAR_TARGET
                  ? `+${(pillarScore - PILLAR_TARGET).toFixed(1)} above target`
                  : `${(PILLAR_TARGET - pillarScore).toFixed(1)} below target`}
              </p>
            </div>
          </div>

          {/* Overview */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm" title={t('dashboard.overview', 'Overview')}>
            <div className="space-y-0">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">{t('scores.rating', 'Grade')}</span>
                <span className="font-bold text-xl text-primary-600">{score.rating ?? score.grade}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">{t('indicators.count', 'Indicators')}</span>
                <span className="font-semibold text-gray-900">{indicators.length}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-gray-600">{t('scores.lastUpdated', 'Last Updated')}</span>
                <span className="font-semibold text-sm text-gray-900">
                  {new Date(score.score_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-center py-10">
            <Award className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">{t('scores.noScores', 'No scores calculated yet')}</p>
            <button
              onClick={() => navigate('/app/scores/calculate')}
              className="mt-3 text-primary-600 hover:underline text-sm font-medium"
            >
              {t('scores.calculateScore', 'Calculate scores')} →
            </button>
          </div>
        </div>
      )}

      {/* Indicators Breakdown Chart */}
      {indicatorChartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm" title={t('indicators.breakdown', 'Indicators Breakdown (Weights)')}>
          <BarChart
            data={indicatorChartData}
            xKey="name"
            bars={[{ key: 'weight', name: t('indicators.weight', 'Weight'), color: chartColor }]}
            height={300}
          />
        </div>
      )}

      {/* Indicators Table */}
      {indicators.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm" title={t('indicators.title', 'Indicators')}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('indicators.name', 'Name')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('indicators.unit', 'Unit')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('indicators.weight', 'Weight')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {indicators.map(ind => (
                  <tr
                    key={ind.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-gray-500 bg-gray-50 rounded">
                      {ind.code}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <Link to={`/app/indicators/${ind.id}`} className="hover:text-primary-600 hover:underline transition-colors">
                        {ind.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ind.unit}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                      {ind.weight}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm" title={t('dashboard.recentActivity', 'Recent Activity')}>
        {recentUploads.length > 0 ? (
          <div className="space-y-3">
            {recentUploads.map(upload => (
              <div key={upload.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`p-2 bg-${color}-100 rounded-lg flex-shrink-0`}>
                  <Activity className={`h-4 w-4 text-${color}-600`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{upload.filename}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        upload.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : upload.status === 'processing'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {upload.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(upload.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">{t('common.noRecentActivity', 'No recent activity')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
