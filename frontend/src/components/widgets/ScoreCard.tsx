import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getScoreColor } from '@/utils/formatting';

interface ScoreCardProps {
  title: string;
  score: number;
  maxScore?: number;
  trend?: number;
  pillar?: 'environmental' | 'social' | 'governance';
}

export default function ScoreCard({ 
  title, 
  score, 
  maxScore = 100, 
  trend,
  pillar 
}: ScoreCardProps) {
  const percentage = (score / maxScore) * 100;
  const scoreColor = getScoreColor(score);
  
  const pillarColors = {
    environmental: 'border-green-200 bg-green-50',
    social: 'border-blue-200 bg-blue-50',
    governance: 'border-purple-200 bg-purple-50',
  };

  const getTrendIcon = () => {
    if (!trend) return <Minus className="h-4 w-4" />;
    if (trend > 0) return <TrendingUp className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-500';
    if (trend > 0) return 'text-green-600';
    return 'text-red-600';
  };

  return (
    <div className={`card ${pillar ? pillarColors[pillar] : ''} ${pillar ? 'border-2' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-xs font-medium">
              {trend > 0 ? '+' : ''}{(trend ?? 0).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`text-4xl font-bold ${scoreColor}`}>
          {Math.round(score)}
        </span>
        <span className="text-lg text-gray-500">/ {maxScore}</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            percentage >= 75 ? 'bg-green-600' :
            percentage >= 50 ? 'bg-yellow-600' :
            'bg-red-600'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
