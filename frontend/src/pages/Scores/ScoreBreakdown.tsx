import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/common/Card';
import PieChart from '@/components/charts/PieChart';
import RadarChart from '@/components/charts/RadarChart';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';

interface Score {
  overall_score: number;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  grade: string;
}

interface Indicator {
  id: string;
  name: string;
  pillar: string;
  weight: number;
}

export default function ScoreBreakdown() {
  const { t } = useTranslation();
  const [score, setScore] = useState<Score | null>(null);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [scoreRes, indicatorsRes] = await Promise.all([
        api.get('/esg-scoring/latest').catch(() => null),
        api.get('/indicators').catch(() => ({ data: { items: [] } })),
      ]);
      if (scoreRes) setScore(scoreRes.data);
      setIndicators(indicatorsRes.data.items || []);
    } catch (error) {
      console.error('Error loading breakdown:', error);
    } finally {
      setLoading(false);
    }
  };

  const pillarData = score
    ? [
        { name: t('pillars.environmental', 'Environmental'), value: Math.round(score.environmental_score) },
        { name: t('pillars.social', 'Social'), value: Math.round(score.social_score) },
        { name: t('pillars.governance', 'Governance'), value: Math.round(score.governance_score) },
      ]
    : [];

  const environmentalIndicators = indicators.filter(i => i.pillar === 'environmental');
  const radarData = environmentalIndicators.slice(0, 8).map(ind => ({
    subject: ind.name.length > 16 ? ind.name.substring(0, 16) + '…' : ind.name,
    value: ind.weight,
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {t('scores.breakdown', 'Score Breakdown')}
        </h1>
        <p className="mt-2 text-gray-600">
          {t('scores.breakdownSubtitle', 'Detailed analysis of your ESG scores by pillar')}
        </p>
      </div>

      {score ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title={t('scores.pillarDistribution', 'Pillar Distribution')}>
            <PieChart data={pillarData} colors={['#22c55e', '#3b82f6', '#a855f7']} />
          </Card>

          {radarData.length > 0 ? (
            <Card title={t('pillars.environmental', 'Environmental') + ' — ' + t('indicators.weights', 'Indicator Weights')}>
              <RadarChart
                data={radarData}
                dataKey="value"
              />
            </Card>
          ) : (
            <Card title={t('scores.summary', 'Score Summary')}>
              <div className="space-y-4 pt-2">
                {[
                  { label: t('scores.overallScore', 'Overall'), value: score.overall_score, color: 'bg-primary-500' },
                  { label: t('pillars.environmental', 'Environmental'), value: score.environmental_score, color: 'bg-green-500' },
                  { label: t('pillars.social', 'Social'), value: score.social_score, color: 'bg-blue-500' },
                  { label: t('pillars.governance', 'Governance'), value: score.governance_score, color: 'bg-purple-500' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                      <span className="text-sm font-bold text-gray-900">{item.value.toFixed(1)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${item.color}`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500">{t('scores.noScores', 'No scores available yet')}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
