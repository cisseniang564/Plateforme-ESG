export const formatNumber = (num: number | null | undefined, decimals = 2): string => {
  const n = num ?? 0;
  return n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const formatPercentage = (num: number | null | undefined, decimals = 1): string => {
  const n = num ?? 0;
  return `${(n * 100).toFixed(decimals)}%`;
};

export const formatCurrency = (num: number | null | undefined, currency = 'EUR'): string => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(num ?? 0);
};

export const formatScore = (score: number | null | undefined): string => {
  return `${Math.round(score ?? 0)}/100`;
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
