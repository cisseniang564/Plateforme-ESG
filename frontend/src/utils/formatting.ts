export const formatNumber = (num: number, decimals = 2): string => {
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const formatPercentage = (num: number, decimals = 1): string => {
  return `${(num * 100).toFixed(decimals)}%`;
};

export const formatCurrency = (num: number, currency = 'EUR'): string => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(num);
};

export const formatScore = (score: number): string => {
  return `${score.toFixed(1)}/100`;
};

export const getScoreColor = (score: number): string => {
  if (score >= 75) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
};

export const getPillarColor = (pillar: string): string => {
  const colors = {
    environmental: 'text-green-600',
    social: 'text-blue-600',
    governance: 'text-purple-600',
  };
  return colors[pillar as keyof typeof colors] || 'text-gray-600';
};
