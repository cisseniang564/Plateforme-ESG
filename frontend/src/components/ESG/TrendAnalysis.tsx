import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  ComposedChart,
} from 'recharts';

interface TrendData {
  has_trend?: boolean;
  direction: string;
  slope: number;
  pillar_trends: {
    environmental: string;
    social: string;
    governance: string;
  };
  historical_data: {
    dates: string[];
    overall: number[];
    environmental: number[];
    social: number[];
    governance: number[];
  };
}

interface Props {
  trendData: TrendData;
}

const SERIES = [
  { key: 'overall',       label: 'Score Global',  color: '#10b981' },
  { key: 'environmental', label: 'Environnement', color: '#3b82f6' },
  { key: 'social',        label: 'Social',        color: '#8b5cf6' },
  { key: 'governance',    label: 'Gouvernance',   color: '#f59e0b' },
] as const;

export const TrendAnalysis: React.FC<Props> = ({ trendData }) => {
  if (!trendData?.has_trend) {
    return <div className="text-gray-500 p-4 text-center">Données historiques insuffisantes</div>;
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      default:          return 'text-yellow-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '↑';
      case 'declining': return '↓';
      default:          return '→';
    }
  };

  // Convert {dates: [], overall: [], …} → [{ date, overall, environmental, … }]
  const data = trendData.historical_data.dates.map((d, i) => ({
    date: new Date(d).toLocaleDateString('fr-FR'),
    overall:       trendData.historical_data.overall[i],
    environmental: trendData.historical_data.environmental[i],
    social:        trendData.historical_data.social[i],
    governance:    trendData.historical_data.governance[i],
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Analyse de Tendance</h3>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Global</div>
          <div className={`text-xl font-bold ${getTrendColor(trendData.direction)}`}>
            {getTrendIcon(trendData.direction)} {trendData.direction}
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Environnement</div>
          <div className={`text-xl font-bold ${getTrendColor(trendData.pillar_trends.environmental)}`}>
            {getTrendIcon(trendData.pillar_trends.environmental)}
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Social</div>
          <div className={`text-xl font-bold ${getTrendColor(trendData.pillar_trends.social)}`}>
            {getTrendIcon(trendData.pillar_trends.social)}
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Gouvernance</div>
          <div className={`text-xl font-bold ${getTrendColor(trendData.pillar_trends.governance)}`}>
            {getTrendIcon(trendData.pillar_trends.governance)}
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {SERIES.map(s => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={s.color}
                fillOpacity={0.08}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
