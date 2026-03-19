import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calculator, CheckCircle, TrendingUp, TrendingDown, Leaf, Users, Scale } from 'lucide-react';
import { format } from 'date-fns';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import PageHeader from '@/components/PageHeader';
import RadarChart from '@/components/charts/RadarChart';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface Organization {
  id: string;
  name: string;
}

interface ScoreResult {
  id?: string;
  score_date?: string;
  calculation_date?: string;
  overall_score: number;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  grade?: string;
  rating?: string;
  best_pillar: string;
  worst_pillar: string;
  indicators_count?: number;
  data_points_count: number;
}

const GRADE_COLORS: Record<string, string> = {
  A: 'text-green-700 bg-green-50 border-green-300',
  B: 'text-blue-700 bg-blue-50 border-blue-300',
  C: 'text-yellow-700 bg-yellow-50 border-yellow-300',
  D: 'text-orange-700 bg-orange-50 border-orange-300',
  F: 'text-red-700 bg-red-50 border-red-300',
};

export default function ScoreCalculation() {
  useTranslation();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [scoreDate, setScoreDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/organizations')
      .then(res => setOrganizations(res.data.items || []))
      .catch(() => {})
      .finally(() => setLoadingOrgs(false));
  }, []);

  const handleCalculate = async () => {
    if (!scoreDate) {
      setError('Veuillez sélectionner une date');
      return;
    }
    setCalculating(true);
    setError('');
    setResult(null);

    try {
      const response = await api.post('/esg-scoring/calculate', {
        score_date: scoreDate,
        ...(selectedOrg && { organization_id: selectedOrg }),
      });
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du calcul des scores');
    } finally {
      setCalculating(false);
    }
  };

  const radarData = result
    ? [
        { subject: 'Environnement', value: result.environmental_score },
        { subject: 'Social', value: result.social_score },
        { subject: 'Gouvernance', value: result.governance_score },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calcul de Score ESG"
        subtitle="Calculez votre score ESG à partir des données disponibles"
        showBack={true}
        backTo="/scores"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <Calculator className="h-6 w-6 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Paramètres de calcul</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organisation <span className="text-gray-400">(optionnel — toutes par défaut)</span>
              </label>
              {loadingOrgs ? (
                <div className="flex items-center gap-2 py-2"><Spinner size="sm" /><span className="text-sm text-gray-500">Chargement...</span></div>
              ) : (
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  title="Sélectionner une organisation"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Toutes les organisations</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date de calcul</label>
              <input
                type="date"
                value={scoreDate}
                onChange={(e) => setScoreDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                placeholder="Sélectionnez une date"
                title="Date de calcul du score ESG"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <Button onClick={handleCalculate} disabled={calculating || !scoreDate} className="w-full">
              {calculating ? (
                <><Spinner size="sm" /><span className="ml-2">Calcul en cours...</span></>
              ) : (
                <><Calculator className="h-5 w-5 mr-2" />Calculer le Score</>
              )}
            </Button>
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Info :</strong> Le score est calculé à partir de toutes les données disponibles
              jusqu'à la date sélectionnée, pondérées par secteur et par indicateur.
            </p>
          </div>
        </Card>

        {/* Results */}
        {calculating ? (
          <Card>
            <div className="flex flex-col items-center justify-center h-64">
              <Spinner size="lg" />
              <p className="text-gray-500 mt-4 font-medium">Calcul en cours...</p>
              <p className="text-sm text-gray-400 mt-1">Analyse des indicateurs ESG</p>
            </div>
          </Card>
        ) : result ? (
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h2 className="text-lg font-semibold text-green-700">Score calculé</h2>
            </div>

            <div className="flex items-center gap-6 mb-6">
              <div className={`text-5xl font-bold px-5 py-3 rounded-xl border-2 ${GRADE_COLORS[result.rating || result.grade || ''] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                {result.rating || result.grade || '-'}
              </div>
              <div>
                <p className="text-5xl font-bold text-gray-900">{result.overall_score.toFixed(1)}</p>
                <p className="text-gray-400 text-sm">/ 100 points</p>
                <p className="text-xs text-gray-400 mt-1">{result.data_points_count} points de données</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                <Leaf className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-green-700">{result.environmental_score.toFixed(1)}</p>
                <p className="text-xs text-green-600">Environnement</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-blue-700">{result.social_score.toFixed(1)}</p>
                <p className="text-xs text-blue-600">Social</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-100">
                <Scale className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-purple-700">{result.governance_score.toFixed(1)}</p>
                <p className="text-xs text-purple-600">Gouvernance</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm mb-6 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-gray-600">Meilleur :</span>
                <span className="font-medium capitalize text-green-700">{result.best_pillar}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-gray-600">À améliorer :</span>
                <span className="font-medium capitalize text-red-700">{result.worst_pillar}</span>
              </div>
            </div>

            <Button onClick={() => navigate('/scores')} className="w-full">
              Voir le Détail Complet →
            </Button>
          </Card>
        ) : (
          <Card>
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Calculator className="h-16 w-16 text-gray-200 mb-4" />
              <p className="text-gray-500 font-medium">Aucun résultat</p>
              <p className="text-sm text-gray-400 mt-1">Lancez un calcul pour voir vos scores</p>
            </div>
          </Card>
        )}
      </div>

      {/* Radar chart */}
      {result && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Pilier</h2>
          <RadarChart data={radarData} dataKey="value" height={300} />
        </Card>
      )}
    </div>
  );
}
