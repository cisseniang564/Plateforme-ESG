import React from 'react';

interface TrendData {
  has_trend?: boolean;
  direction: string;
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

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Analyse de Tendance</h3>
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Global</div>
          <div className="text-xl font-bold">{trendData.direction}</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Environnement</div>
          <div className="text-xl font-bold">{trendData.pillar_trends.environmental}</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Social</div>
          <div className="text-xl font-bold">{trendData.pillar_trends.social}</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Gouvernance</div>
          <div className="text-xl font-bold">{trendData.pillar_trends.governance}</div>
        </div>
      </div>
    </div>
  );
};
