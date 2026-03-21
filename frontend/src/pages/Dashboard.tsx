import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { SectorBenchmark } from '../components/esg/SectorBenchmark';
import { TrendAnalysis } from '../components/esg/TrendAnalysis';

interface ScoreData {
  score_id: string;
  organization_id: string;
  organization_name: string;
  overall_score: number;
  rating: string;
  pillar_scores: {
    environmental: number;
    social: number;
    governance: number;
  };
  sector: string;
  data_quality: {
    completeness: number;
    confidence_level: string;
  };
  benchmarks: {
    percentile_rank: number;
    sector_median: number;
    quartile: number;
  };
  trend: any;
}

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Remplacer par l'ID de l'organisation que vous voulez visualiser
  const organizationId = "votre-organization-id";

  useEffect(() => {
    fetchScoreData();
  }, []);

  const fetchScoreData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/esg/scoring/organization/${organizationId}`);
      setScoreData(response.data);
    } catch (err) {
      setError(t('dashboard.loadError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (level: string) => {
    switch(level) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-orange-100 text-orange-800';
      case 'very_low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!scoreData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('dashboard.noData')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec score global */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{scoreData.organization_name}</h1>
            <p className="text-blue-100">{t('dashboard.esgDashboard')}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{scoreData.overall_score}</div>
            <div className="text-xl">{scoreData.rating}</div>
          </div>
        </div>
      </div>

      {/* Scores par pilier */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-500">{t('dashboard.environment')}</h3>
          <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-semibold text-gray-900">
              {scoreData.pillar_scores.environmental}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-500">{t('dashboard.social')}</h3>
          <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-semibold text-gray-900">
              {scoreData.pillar_scores.social}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <h3 className="text-sm font-medium text-gray-500">{t('dashboard.governance')}</h3>
          <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-semibold text-gray-900">
              {scoreData.pillar_scores.governance}
            </p>
          </div>
        </div>
      </div>

      {/* Benchmark et Tendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectorBenchmark
          organizationId={organizationId}
          sector={scoreData.sector}
        />

        {scoreData.trend && (
          <TrendAnalysis trendData={scoreData.trend} />
        )}
      </div>

      {/* Qualite des donnees */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{t('dashboard.dataQuality')}</h3>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">{t('dashboard.completeness')}</span>
              <span className="text-sm font-medium text-gray-700">
                {scoreData.data_quality.completeness}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 rounded-full h-2"
                style={{ width: `${scoreData.data_quality.completeness}%` }}
              ></div>
            </div>
          </div>
          <div className="flex items-center">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(scoreData.data_quality.confidence_level)}`}>
              {t('dashboard.confidence')} {scoreData.data_quality.confidence_level}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
