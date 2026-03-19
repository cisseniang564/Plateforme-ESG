import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calculator, RefreshCw, History, CheckCircle } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import PageHeader from '@/components/PageHeader';
import ESGScoreCard from '@/components/ESG/ESGScoreCard';
import api from '@/services/api';

export default function OrganizationScoring() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<any>(null);
  const [currentScore, setCurrentScore] = useState<any>(null);
  const [historicalScores, setHistoricalScores] = useState<any[]>([]);
  const [dataQuality, setDataQuality] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const [orgRes, scoresRes, qualityRes] = await Promise.all([
        api.get(`/organizations/${id}`),
        api.get(`/esg-scoring/organization/${id}`).catch(() => ({ data: { scores: [] } })),
        api.post('/esg-scoring/data-quality', { organization_id: id }).catch(() => ({ data: null })),
      ]);

      setOrganization(orgRes.data);
      setHistoricalScores(scoresRes.data.scores || []);
      setCurrentScore(scoresRes.data.scores?.[0] || null);
      setDataQuality(qualityRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateScore = async () => {
    setCalculating(true);

    try {
      const response = await api.post('/esg-scoring/calculate', {
        organization_id: id,
        period_months: 12,
      });

      setCurrentScore(response.data);
      await loadData();
      
      alert('✅ Score ESG calculé avec succès !');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Erreur lors du calcul');
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Score ESG - ${organization?.name || 'Organisation'}`}
        subtitle="Évaluation ESG complète avec pondération sectorielle"
        showBack={true}
        backTo="/scores"
      />

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleCalculateScore} disabled={calculating}>
          {calculating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Calcul en cours...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4 mr-2" />
              Calculer le Score
            </>
          )}
        </Button>
        
        {historicalScores.length > 0 && (
          <Button variant="secondary" onClick={() => navigate(`/scores/${id}/history`)}>
            <History className="h-4 w-4 mr-2" />
            Historique
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score principal */}
        <div className="lg:col-span-2">
          {currentScore ? (
            <ESGScoreCard 
              score={currentScore}
              previousScore={historicalScores[1]?.overall_score}
            />
          ) : (
            <Card>
              <div className="text-center py-12">
                <Calculator className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 font-medium mb-2">Aucun score calculé</p>
                <p className="text-sm text-gray-400 mb-6">
                  Cliquez sur "Calculer le Score" pour générer l'évaluation ESG
                </p>
                <Button onClick={handleCalculateScore} disabled={calculating}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculer maintenant
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Qualité des données */}
        <div>
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary-600" />
              Qualité des Données
            </h3>
            
            {dataQuality ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Score Global</span>
                    <span className="font-semibold text-gray-900">
                      {dataQuality.overall_quality.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${dataQuality.overall_quality >= 80 ? 'bg-green-500' : dataQuality.overall_quality >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${dataQuality.overall_quality}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Complétude</span>
                    <span className="font-medium">{dataQuality.completeness.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Cohérence</span>
                    <span className="font-medium">{dataQuality.consistency.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Précision</span>
                    <span className="font-medium">{dataQuality.accuracy.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Fraîcheur</span>
                    <span className="font-medium">{dataQuality.timeliness.toFixed(0)}%</span>
                  </div>
                </div>

                {dataQuality.recommendations && dataQuality.recommendations.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-2">Recommandations:</p>
                    <ul className="space-y-1">
                      {dataQuality.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="text-xs text-gray-600">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Chargement...</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
