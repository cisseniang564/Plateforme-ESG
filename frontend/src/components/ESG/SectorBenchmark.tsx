import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';

interface BenchmarkData {
  percentile_rank: number;
  sector_median: number;
  sector_average: number;
  sector_min: number;
  sector_max: number;
  quartile: number;
  companies_count: number;
}

interface Props {
  organizationId: string;
  sector: string;
}

export const SectorBenchmark: React.FC<Props> = ({ organizationId, sector }) => {
  const { t } = useTranslation();
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBenchmark();
  }, [organizationId, sector]);

  const fetchBenchmark = async () => {
    try {
      // Récupérer d'abord le score pour avoir le secteur
      const scoreResponse = await api.get(`/esg-scoring/organization/${organizationId}`);
      const scoreData = scoreResponse.data;
      
      // Récupérer les benchmarks
      const response = await api.get(`/benchmarks/sector/${scoreData.sector}`);
      setBenchmark(response.data);
    } catch (error) {
      console.error('Erreur chargement benchmark:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="animate-pulse bg-gray-200 h-32 rounded"></div>;
  if (!benchmark) return <div>{t('sbench.noData', 'Aucune donnée benchmark disponible')}</div>;

  const getQuartileColor = (quartile: number) => {
    switch(quartile) {
      case 1: return 'text-green-600 bg-green-100';
      case 2: return 'text-blue-600 bg-blue-100';
      case 3: return 'text-yellow-600 bg-yellow-100';
      case 4: return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getQuartileLabel = (quartile: number) => {
    switch(quartile) {
      case 1: return t('sbench.q1', 'Top 25%');
      case 2: return t('sbench.q2', 'Au-dessus de la moyenne');
      case 3: return t('sbench.q3', 'En dessous de la moyenne');
      case 4: return t('sbench.q4', 'Bottom 25%');
      default: return t('sbench.unranked', 'Non classé');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">{t('sbench.title', 'Benchmark Sectoriel')}</h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">{t('sbench.yourPercentile', 'Votre percentile')}</div>
          <div className="text-2xl font-bold">{benchmark.percentile_rank}%</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">{t('sbench.sectorMedian', 'Médiane secteur')}</div>
          <div className="text-2xl font-bold">{benchmark.sector_median}</div>
        </div>
      </div>

      <div className={`p-4 rounded-lg text-center mb-4 ${getQuartileColor(benchmark.quartile)}`}>
        <div className="text-sm font-medium">{t('sbench.position', 'Position')}</div>
        <div className="text-xl font-bold">{getQuartileLabel(benchmark.quartile)}</div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{t('sbench.sectorAvg', 'Moyenne secteur:')}</span>
          <span className="font-medium">{benchmark.sector_average}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>{t('sbench.sectorMin', 'Minimum secteur:')}</span>
          <span className="font-medium">{benchmark.sector_min}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>{t('sbench.sectorMax', 'Maximum secteur:')}</span>
          <span className="font-medium">{benchmark.sector_max}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>{t('sbench.companiesCompared', 'Entreprises comparées:')}</span>
          <span className="font-medium">{benchmark.companies_count}</span>
        </div>
      </div>
    </div>
  );
};
