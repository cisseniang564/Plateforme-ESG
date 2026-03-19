import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { setScores, setLoading } from '@/store/slices/scoresSlice';
import { scoresService } from '@/services/scoresService';

export const useScores = (autoLoad = true) => {
  const dispatch = useDispatch();
  const { data: scores, loading } = useSelector((state: RootState) => state.scores);
  const [error, setError] = useState<string | null>(null);

  const loadScores = async (params?: any) => {
    dispatch(setLoading(true));
    try {
      const data = await scoresService.getScores(params);
      dispatch(setScores(data.items || []));
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      dispatch(setLoading(false));
    }
  };

  useEffect(() => {
    if (autoLoad) {
      loadScores();
    }
  }, [autoLoad]);

  return { scores, loading, error, refetch: loadScores };
};
