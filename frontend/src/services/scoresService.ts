// ============================================================================
// Scores Service
// ============================================================================

import api from './api';
import type { Score } from '@/types/esg';

export const scoresService = {
  getScores: async (params?: any) => {
    const response = await api.get('/scores', { params });
    return response.data;
  },

  getScoreById: async (id: string): Promise<Score> => {
    const response = await api.get<Score>(`/scores/${id}`);
    return response.data;
  },

  calculateScore: async (data: any) => {
    const response = await api.post('/esg-scoring/calculate', data);
    return response.data;
  },

  // Historique sur les N derniers jours (endpoint: GET /scores/history)
  getScoreHistory: async (params?: { start_date?: string; end_date?: string; organization_id?: string }) => {
    const response = await api.get('/scores/history', { params });
    return response.data;
  },
};

export default scoresService;
