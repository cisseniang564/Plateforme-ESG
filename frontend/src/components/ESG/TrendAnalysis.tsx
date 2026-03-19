import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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

export const TrendAnalysis: React.FC<Props> = ({ trendData }) => {
  if (!trendData?.has_trend) {
    return <div className="text-gray-500 p-4 text-center">Données historiques insuffisantes</div>;
  }

  const getTrendColor = (trend: string) => {
    switch(trend) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch(trend) {
      case 'improving': return '↑';
      case 'declining': return '↓';
      default: return '→';
    }
  };

  const chartData = {
    labels: trendData.historical_data.dates.map(d => new Date(d).toLocaleDateString('fr-FR')),
    datasets: [
      {
        label: 'Score Global',
        data: trendData.historical_data.overall,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Environnement',
        data: trendData.historical_data.environmental,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Social',
        data: trendData.historical_data.social,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Gouvernance',
        data: trendData.historical_data.governance,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Score'
        }
      }
    }
  };

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
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};
