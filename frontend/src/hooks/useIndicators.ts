import { useState, useEffect } from 'react';
import api from '@/services/api';
import type { Indicator } from '@/types/esg';

export const useIndicators = (pillar?: string) => {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIndicators = async () => {
      try {
        const params = pillar ? { pillar } : {};
        const response = await api.get('/indicators/', { params });
        setIndicators(response.data.items || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchIndicators();
  }, [pillar]);

  return { indicators, loading, error };
};
