import React from 'react';

interface KeyIndicatorCardProps {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  color: 'green' | 'blue' | 'purple' | 'yellow' | 'red';
}

export const KeyIndicatorCard: React.FC<KeyIndicatorCardProps> = ({
  title,
  value,
  trend,
  color
}) => {
  const getColorClasses = () => {
    switch(color) {
      case 'green': return 'bg-green-50 border-green-200 text-green-700';
      case 'blue': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'purple': return 'bg-purple-50 border-purple-200 text-purple-700';
      case 'yellow': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'red': return 'bg-red-50 border-red-200 text-red-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getTrendIcon = () => {
    switch(trend) {
      case 'up': return '↑';
      case 'down': return '↓';
      default: return '→';
    }
  };

  const getTrendColor = () => {
    switch(trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getColorClasses()}`}>
      <div className="text-sm font-medium mb-1">{title}</div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold">{value}</span>
        <span className={`text-lg ${getTrendColor()}`}>{getTrendIcon()}</span>
      </div>
    </div>
  );
};
