import React from 'react';

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
  // Version simplifiée pour le moment
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Benchmark Sectoriel</h3>
      <p className="text-gray-500">Chargement des données...</p>
    </div>
  );
};
