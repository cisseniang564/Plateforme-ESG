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
  return (
    <div className="p-4 rounded-lg border bg-gray-50">
      <div className="text-sm font-medium mb-1">{title}</div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-lg">{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>
      </div>
    </div>
  );
};
