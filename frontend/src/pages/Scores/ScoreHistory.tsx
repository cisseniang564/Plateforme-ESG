import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/common/Card';
import LineChart from '@/components/charts/LineChart';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';

interface ScoreEntry {
  id: string;
  score_date: string;
  overall_score: number;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  grade?: string;
  rating?: string;
}

export default function ScoreHistory() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await api.get('/esg-scoring/history');
      setHistory(response.data.scores || []);
    } catch (error) {
      console.error('Error loading score history:', error);
    } finally {
      setLoading(false);
    }
  };

  const latest = history[0] || null;
  const previous = history[1] || null;

  const getPillarTrend = (current: number, prev: number) => {
    if (!prev) return null;
    const change = ((current - prev) / prev) * 100;
    return change;
  };

  const chartData = [...history].reverse().map(s => ({
    date: new Date(s.score_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    overall: s.overall_score,
    environmental: s.environmental_score,
    social: s.social_score,
    governance: s.governance_score,
  }));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('scores.history', 'Score History')}</h1>
        <p className="mt-2 text-gray-600">{t('scores.historySubtitle', 'Track your ESG scores over time')}</p>
      </div>

      {latest ? (
        <>
          {/* Current Pillar Scores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title={t('pillars.environmental', 'Environmental')}>
              <p className="text-4xl font-bold text-green-600">
                {latest.environmental_score.toFixed(0)}
              </p>
              {previous && (() => {
                const trend = getPillarTrend(latest.environmental_score, previous.environmental_score);
                return trend !== null ? (
                  <p className={`text-sm mt-2 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% {t('scores.vsPreviousPeriod', 'vs previous period')}
                  </p>
                ) : null;
              })()}
            </Card>
            <Card title={t('pillars.social', 'Social')}>
              <p className="text-4xl font-bold text-blue-600">
                {latest.social_score.toFixed(0)}
              </p>
              {previous && (() => {
                const trend = getPillarTrend(latest.social_score, previous.social_score);
                return trend !== null ? (
                  <p className={`text-sm mt-2 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% {t('scores.vsPreviousPeriod', 'vs previous period')}
                  </p>
                ) : null;
              })()}
            </Card>
            <Card title={t('pillars.governance', 'Governance')}>
              <p className="text-4xl font-bold text-purple-600">
                {latest.governance_score.toFixed(0)}
              </p>
              {previous && (() => {
                const trend = getPillarTrend(latest.governance_score, previous.governance_score);
                return trend !== null ? (
                  <p className={`text-sm mt-2 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% {t('scores.vsPreviousPeriod', 'vs previous period')}
                  </p>
                ) : null;
              })()}
            </Card>
          </div>

          {/* Score Trends Chart */}
          {chartData.length > 0 && (
            <Card title={t('scores.scoreTrends', 'Score Trends')}>
              <LineChart
                data={chartData}
                xKey="date"
                lines={[
                  { key: 'overall', name: t('scores.overallScore', 'Overall'), color: '#6366f1' },
                  { key: 'environmental', name: t('pillars.environmental', 'Environmental'), color: '#22c55e' },
                  { key: 'social', name: t('pillars.social', 'Social'), color: '#3b82f6' },
                  { key: 'governance', name: t('pillars.governance', 'Governance'), color: '#a855f7' },
                ]}
                height={400}
              />
            </Card>
          )}

          {/* History Table */}
          <Card title={t('scores.scoreHistory', 'Score History')}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date', 'Date')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('scores.overallScore', 'Overall')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('pillars.environmental', 'Environmental')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('pillars.social', 'Social')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('pillars.governance', 'Governance')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('scores.rating', 'Grade')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(s.score_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-bold text-primary-600">
                        {s.overall_score.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-green-600">
                        {s.environmental_score.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-blue-600">
                        {s.social_score.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-purple-600">
                        {s.governance_score.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                          {s.rating || s.grade || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <div className="text-center py-16">
            <p className="text-gray-500 font-medium">{t('scores.noScores', 'No scores calculated yet')}</p>
            <p className="text-sm text-gray-400 mt-2">
              {t('scores.calculateFirst', 'Calculate your first ESG score to see historical trends')}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
