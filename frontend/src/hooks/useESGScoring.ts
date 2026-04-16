import { useState } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface ScoreResult {
  id: string;
  organization_id: string;
  organization_name?: string;
  calculation_date: string;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  overall_score: number;
  rating: string;
  data_completeness: number;
  confidence_level: string;
  data_points_used: number;
}

interface RecalculateAllResult {
  total: number;
  successful: number;
  skipped: number;   // pas de données — normal
  failed: number;    // erreurs techniques
  details: Array<{
    organization_id: string;
    organization_name: string;
    success: boolean;
    skipped?: boolean;
    overall_score?: number;
    rating?: string;
    error?: string;
  }>;
}

interface DashboardStats {
  statistics: {
    total_organizations: number;
    average_score: number;
    average_environmental: number;
    average_social: number;
    average_governance: number;
    average_completeness: number;
  };
  rating_distribution: Array<{ rating: string; count: number }>;
  top_performers: Array<{
    id: string;
    name: string;
    score: number;
    rating: string;
    environmental: number;
    social: number;
    governance: number;
  }>;
}

const normalizeScoreResult = (data: any): ScoreResult => {
  const pillarScores = data?.pillar_scores || {};
  const dataQuality = data?.data_quality || {};

  return {
    id: data?.id || data?.score_id || '',
    organization_id: data?.organization_id || '',
    organization_name: data?.organization_name,
    calculation_date: data?.calculation_date || data?.score_date || '',
    environmental_score:
      data?.environmental_score ?? pillarScores?.environmental ?? 0,
    social_score:
      data?.social_score ?? pillarScores?.social ?? 0,
    governance_score:
      data?.governance_score ?? pillarScores?.governance ?? 0,
    overall_score: data?.overall_score ?? 0,
    rating: data?.rating || data?.grade || '-',
    data_completeness:
      data?.data_completeness ?? dataQuality?.completeness ?? 0,
    confidence_level:
      data?.confidence_level ?? dataQuality?.confidence_level ?? 'unknown',
    data_points_used:
      data?.data_points_used ??
      dataQuality?.total_data_points ??
      data?.indicators_used ??
      0,
  };
};

export const useESGScoring = () => {
  const [loading, setLoading] = useState(false);

  const calculateScore = async (
    organizationId: string,
    periodMonths: number = 12
  ): Promise<ScoreResult | null> => {
    try {
      setLoading(true);
      const response = await api.post('/esg-scoring/calculate', {
        organization_id: organizationId,
        period_months: periodMonths,
      });

      const normalized = normalizeScoreResult(response.data);
      toast.success('Score ESG calculé avec succès !');
      return normalized;
    } catch (error: any) {
      console.error('Error calculating score:', error);
      const message = error.response?.data?.detail || 'Erreur lors du calcul du score';
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const calculateHistorical = async (
    organizationId: string
  ): Promise<ScoreResult[] | null> => {
    try {
      setLoading(true);
      const response = await api.post('/esg-scoring/calculate-historical', {
        organization_id: organizationId,
        period_months: 1,
      });

      const rawScores = response.data?.scores || response.data || [];
      const normalizedScores = Array.isArray(rawScores)
        ? rawScores.map(normalizeScoreResult)
        : [];

      toast.success('Historique calculé !');
      return normalizedScores;
    } catch (error: any) {
      console.error('Error calculating historical:', error);
      toast.error('Erreur lors du calcul historique');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const recalculateAll = async (
    periodMonths: number = 12
  ): Promise<RecalculateAllResult | null> => {
    try {
      setLoading(true);
      const response = await api.post('/esg-scoring/recalculate-all', null, {
        params: { period_months: periodMonths },
      });

      const { successful, failed, skipped = 0, total } = response.data;

      if (failed === 0 && skipped === 0) {
        toast.success(`✅ ${successful} scores calculés avec succès !`);
      } else if (failed === 0) {
        toast.success(
          `✅ ${successful} scores calculés — ${skipped} organisations sans données`
        );
      } else {
        toast.error(
          `⚠️ ${successful}/${total} scores calculés — ${skipped} sans données, ${failed} erreur(s)`
        );
      }

      return response.data;
    } catch (error: any) {
      console.error('Error recalculating all:', error);
      toast.error('Erreur lors du recalcul global');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getDashboard = async (): Promise<DashboardStats | null> => {
    try {
      const response = await api.get('/esg-scoring/dashboard');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching dashboard:', error);
      toast.error('Erreur lors du chargement du dashboard');
      return null;
    }
  };

  const getOrganizationScores = async (
    organizationId: string,
    limit: number = 12
  ) => {
    try {
      const response = await api.get(
        `/esg-scoring/organization/${organizationId}`,
        { params: { limit } }
      );
      const rawScores = response.data?.scores || [];
      return Array.isArray(rawScores) ? rawScores.map(normalizeScoreResult) : [];
    } catch (error: any) {
      console.error('Error fetching scores:', error);
      toast.error('Erreur lors de la récupération des scores');
      return [];
    }
  };

  const checkDataQuality = async (organizationId: string, months: number = 12) => {
    try {
      const response = await api.post('/esg-scoring/data-quality', {
        organization_id: organizationId,
        months,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error checking data quality:', error);
      toast.error('Erreur lors de la vérification de qualité');
      return null;
    }
  };

  const populateSampleData = async (): Promise<{
    populated: number;
    data_points_created: number;
    message: string;
  } | null> => {
    try {
      setLoading(true);
      const response = await api.post('/esg-scoring/populate-sample-data');
      return response.data;
    } catch (error: any) {
      console.error('Error populating sample data:', error);
      toast.error('Erreur lors de la génération des données de démo');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    calculateScore,
    calculateHistorical,
    recalculateAll,
    populateSampleData,
    getDashboard,
    getOrganizationScores,
    checkDataQuality,
  };
};
