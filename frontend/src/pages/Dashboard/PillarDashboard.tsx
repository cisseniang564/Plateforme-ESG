import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Activity, Award } from 'lucide-react';
import Card from '@/components/common/Card';
import ScoreCard from '@/components/widgets/ScoreCard';
import BarChart from '@/components/charts/BarChart';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';

interface PillarScore {
  overall_score: number;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  grade: string;
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
        api.get('/esg-scoring/latest').catch(() => null),
        api.get('/indicators', { params: { pillar } }).catch(() => ({ data: { items: [] } })),
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
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/app')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.backToDashboard', 'Back to Dashboard')}
        </button>
        <h1 className="text-3xl font-bold text-gray-900 capitalize">
          {t(`pillars.${pillarKey}`, pillarKey)} Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          {pillarKey === 'environmental'
            ? t('pillars.environmentalDesc', 'Environmental impact and sustainability metrics')
            : pillarKey === 'social'
            ? t('pillars.socialDesc', 'Social responsibility and community impact')
            : t('pillars.governanceDesc', 'Corporate governance and ethics')}
        </p>
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
          <Card title={t('scores.performanceVsTarget', 'Performance vs Target')}>
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
          </Card>

          {/* Overview */}
          <Card title={t('dashboard.overview', 'Overview')}>
            <div className="space-y-0">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">{t('scores.rating', 'Grade')}</span>
                <span className="font-bold text-xl text-primary-600">{score.rating}</span>
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
          </Card>
        </div>
      ) : (
        <Card>
          <div className="text-center py-10">
            <Award className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">{t('scores.noScores', 'No scores calculated yet')}</p>
            <button
              onClick={() => navigate('/scores')}
              className="mt-3 text-primary-600 hover:underline text-sm font-medium"
            >
              {t('scores.calculateScore', 'Calculate scores')} →
            </button>
          </div>
        </Card>
      )}

      {/* Indicators Breakdown Chart */}
      {indicatorChartData.length > 0 && (
        <Card title={t('indicators.breakdown', 'Indicators Breakdown (Weights)')}>
          <BarChart
            data={indicatorChartData}
            xKey="name"
            bars={[{ key: 'weight', name: t('indicators.weight', 'Weight'), color: chartColor }]}
            height={300}
          />
        </Card>
      )}

      {/* Indicators Table */}
      {indicators.length > 0 && (
        <Card title={t('indicators.title', 'Indicators')}>
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
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => toast.info("Détails disponibles prochainement")}
                  >
                    <td className="px-4 py-3 text-sm font-mono text-gray-500 bg-gray-50 rounded">
                      {ind.code}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{ind.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ind.unit}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                      {ind.weight}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      <Card title={t('dashboard.recentActivity', 'Recent Activity')}>
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
      </Card>
    </div>
  );
}
