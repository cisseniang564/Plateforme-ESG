import { TrendingUp, TrendingDown, Minus, Award, AlertCircle } from 'lucide-react';

interface ESGScoreCardProps {
  score: {
    overall_score: number;
    rating: string;
    pillar_scores: {
      environmental: number;
      social: number;
      governance: number;
    };
    confidence_level: string;
    data_completeness: number;
    percentile_rank?: number;
    sector_median?: number;
  };
  previousScore?: number;
}

export default function ESGScoreCard({ score, previousScore }: ESGScoreCardProps) {
  const getRatingColor = (rating: string) => {
    const colors: Record<string, string> = {
      'AAA': 'text-green-600 bg-green-50 border-green-200',
      'AA': 'text-green-600 bg-green-50 border-green-200',
      'A': 'text-green-600 bg-green-50 border-green-200',
      'BBB': 'text-blue-600 bg-blue-50 border-blue-200',
      'BB': 'text-yellow-600 bg-yellow-50 border-yellow-200',
      'B': 'text-yellow-600 bg-yellow-50 border-yellow-200',
      'CCC': 'text-orange-600 bg-orange-50 border-orange-200',
      'CC': 'text-red-600 bg-red-50 border-red-200',
      'C': 'text-red-600 bg-red-50 border-red-200',
    };
    return colors[rating] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getScoreColor = (scoreValue: number) => {
    if (scoreValue >= 75) return 'text-green-600';
    if (scoreValue >= 55) return 'text-blue-600';
    if (scoreValue >= 35) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrend = () => {
    if (!previousScore) return null;
    const diff = score.overall_score - previousScore;
    
    if (diff > 2) return { icon: TrendingUp, color: 'text-green-600', text: `+${diff.toFixed(1)}` };
    if (diff < -2) return { icon: TrendingDown, color: 'text-red-600', text: diff.toFixed(1) };
    return { icon: Minus, color: 'text-gray-600', text: '~0' };
  };

  const trend = getTrend();
  const ratingColorClass = getRatingColor(score.rating);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Score ESG Global</h3>
          <div className="flex items-baseline gap-3">
            <span className={`text-5xl font-bold ${getScoreColor(score.overall_score)}`}>
              {score.overall_score.toFixed(1)}
            </span>
            <span className="text-2xl text-gray-400">/100</span>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 ${trend.color}`}>
              <trend.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{trend.text} pts</span>
            </div>
          )}
        </div>
        
        <div className={`px-4 py-2 rounded-lg border-2 ${ratingColorClass}`}>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            <span className="text-2xl font-bold">{score.rating}</span>
          </div>
        </div>
      </div>

      {/* Scores par pilier */}
      <div className="space-y-3 mb-6">
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-medium text-gray-700">🌍 Environmental</span>
            <span className={`font-semibold ${getScoreColor(score.pillar_scores.environmental)}`}>
              {score.pillar_scores.environmental.toFixed(1)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${score.pillar_scores.environmental >= 75 ? 'bg-green-500' : score.pillar_scores.environmental >= 55 ? 'bg-blue-500' : 'bg-yellow-500'}`}
              style={{ width: `${score.pillar_scores.environmental}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-medium text-gray-700">👥 Social</span>
            <span className={`font-semibold ${getScoreColor(score.pillar_scores.social)}`}>
              {score.pillar_scores.social.toFixed(1)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${score.pillar_scores.social >= 75 ? 'bg-green-500' : score.pillar_scores.social >= 55 ? 'bg-blue-500' : 'bg-yellow-500'}`}
              style={{ width: `${score.pillar_scores.social}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-medium text-gray-700">⚖️ Governance</span>
            <span className={`font-semibold ${getScoreColor(score.pillar_scores.governance)}`}>
              {score.pillar_scores.governance.toFixed(1)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${score.pillar_scores.governance >= 75 ? 'bg-green-500' : score.pillar_scores.governance >= 55 ? 'bg-blue-500' : 'bg-yellow-500'}`}
              style={{ width: `${score.pillar_scores.governance}%` }}
            />
          </div>
        </div>
      </div>

      {/* Métriques de qualité */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
        <div>
          <p className="text-xs text-gray-500 mb-1">Complétude des données</p>
          <p className="text-lg font-semibold text-gray-900">{score.data_completeness.toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Niveau de confiance</p>
          <p className="text-lg font-semibold text-gray-900 capitalize">{score.confidence_level}</p>
        </div>
        {score.percentile_rank !== undefined && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Percentile sectoriel</p>
            <p className="text-lg font-semibold text-gray-900">{score.percentile_rank.toFixed(0)}%</p>
          </div>
        )}
        {score.sector_median !== undefined && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Médiane secteur</p>
            <p className="text-lg font-semibold text-gray-900">{score.sector_median.toFixed(1)}</p>
          </div>
        )}
      </div>

      {/* Warning si faible confiance */}
      {score.confidence_level === 'low' && (
        <div className="mt-4 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-900">Niveau de confiance faible</p>
            <p className="text-xs text-yellow-700 mt-1">
              Complétez vos données pour améliorer la fiabilité du score
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
