import { useState } from 'react';
import { Calculator, TrendingUp } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import { useESGScoring } from '@/hooks/useESGScoring';

interface Props {
  organizationId: string;
  organizationName: string;
  onScoreCalculated?: () => void;
}

export default function OrganizationScoreCalculator({ 
  organizationId, 
  organizationName,
  onScoreCalculated 
}: Props) {
  const { loading, calculateScore } = useESGScoring();
  const [result, setResult] = useState<any>(null);

  const handleCalculate = async () => {
    const score = await calculateScore(organizationId, 12);
    if (score) {
      setResult(score);
      onScoreCalculated?.();
    }
  };

  const getRatingColor = (rating: string) => {
    if (rating.startsWith('A')) return 'bg-green-100 text-green-800';
    if (rating.startsWith('B')) return 'bg-blue-100 text-blue-800';
    if (rating.startsWith('C')) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Calculer Score ESG</h3>
          <p className="mt-1 text-sm text-gray-600">{organizationName}</p>
        </div>

        <Button
          onClick={handleCalculate}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <Spinner size="sm" />
          ) : (
            <>
              <Calculator className="h-4 w-4" />
              Calculer
            </>
          )}
        </Button>
      </div>

      {result && (
        <div className="space-y-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 p-6">
          {/* Score Global */}
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Score Global</p>
            <p className="mt-2 text-5xl font-bold text-gray-900">
              {result.overall_score.toFixed(1)}
            </p>
            <span className={`mt-3 inline-block rounded-xl px-4 py-2 text-lg font-bold ${getRatingColor(result.rating)}`}>
              {result.rating}
            </span>
          </div>

          {/* Scores Piliers */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-600">Environnement</p>
              <p className="mt-1 text-2xl font-bold text-green-700">
                {result.environmental_score.toFixed(0)}
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs font-medium text-gray-600">Social</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">
                {result.social_score.toFixed(0)}
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs font-medium text-gray-600">Gouvernance</p>
              <p className="mt-1 text-2xl font-bold text-indigo-700">
                {result.governance_score.toFixed(0)}
              </p>
            </div>
          </div>

          {/* Métriques */}
          <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4">
            <div>
              <p className="text-xs text-gray-600">Complétude</p>
              <p className="mt-1 font-semibold text-gray-900">
                {result.data_completeness.toFixed(0)}%
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-600">Confiance</p>
              <p className="mt-1 font-semibold text-gray-900 capitalize">
                {result.confidence_level}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-600">Points de données</p>
              <p className="mt-1 font-semibold text-gray-900">
                {result.data_points_used}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-600">Période</p>
              <p className="mt-1 font-semibold text-gray-900">
                12 mois
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
