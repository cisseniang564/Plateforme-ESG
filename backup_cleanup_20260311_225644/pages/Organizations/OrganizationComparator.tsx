import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Download,
  Share2,
  TrendingUp,
  Award,
  CheckCircle,
  XCircle,
  Search,
  Plus,
  X,
  BarChart3,
  Activity
} from 'lucide-react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { generateConsistentScores } from '@/utils/mockScores';

interface Organization {
  id: string;
  name: string;
  external_id?: string;
  industry?: string;
  type?: string;
}

interface OrgWithScores extends Organization {
  scores: {
    overall: number;
    environmental: number;
    social: number;
    governance: number;
    rating: string;
    trend: number;
  };
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function OrganizationComparator() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [selectedOrgs, setSelectedOrgs] = useState<OrgWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    // Charger les organisations pré-sélectionnées depuis l'URL
    const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];
    if (ids.length > 0 && allOrganizations.length > 0) {
      const orgsToSelect = allOrganizations
        .filter(org => ids.includes(org.id))
        .slice(0, 5)
        .map(org => ({
          ...org,
          scores: generateConsistentScores(org.id)
        }));
      setSelectedOrgs(orgsToSelect);
    }
  }, [searchParams, allOrganizations]);

  const loadOrganizations = async () => {
    try {
      const res = await api.get('/organizations');
      const orgs = res.data?.organizations || res.data?.items || [];
      setAllOrganizations(orgs);
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrganization = (org: Organization) => {
    const isSelected = selectedOrgs.find(o => o.id === org.id);
    
    if (isSelected) {
      const newSelected = selectedOrgs.filter(o => o.id !== org.id);
      setSelectedOrgs(newSelected);
      updateUrl(newSelected);
    } else {
      if (selectedOrgs.length >= 5) {
        alert('Maximum 5 organisations pour la comparaison');
        return;
      }
      const newSelected = [...selectedOrgs, { ...org, scores: generateConsistentScores(org.id) }];
      setSelectedOrgs(newSelected);
      updateUrl(newSelected);
    }
  };

  const updateUrl = (orgs: OrgWithScores[]) => {
    if (orgs.length > 0) {
      setSearchParams({ ids: orgs.map(o => o.id).join(',') });
    } else {
      setSearchParams({});
    }
  };

  const filteredOrgs = useMemo(() => {
    return allOrganizations.filter(org =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allOrganizations, searchQuery]);

  // Données pour le radar chart
  const radarData = useMemo(() => {
    if (selectedOrgs.length === 0) return [];
    
    return [
      { subject: 'Score Global', ...Object.fromEntries(selectedOrgs.map(org => [org.name, org.scores.overall])) },
      { subject: 'Environnemental', ...Object.fromEntries(selectedOrgs.map(org => [org.name, org.scores.environmental])) },
      { subject: 'Social', ...Object.fromEntries(selectedOrgs.map(org => [org.name, org.scores.social])) },
      { subject: 'Gouvernance', ...Object.fromEntries(selectedOrgs.map(org => [org.name, org.scores.governance])) }
    ];
  }, [selectedOrgs]);

  // Données pour le bar chart
  const barData = useMemo(() => {
    return selectedOrgs.map(org => ({
      name: org.name.length > 15 ? org.name.substring(0, 15) + '...' : org.name,
      Environmental: org.scores.environmental,
      Social: org.scores.social,
      Governance: org.scores.governance
    }));
  }, [selectedOrgs]);

  // Insights
  const insights = useMemo(() => {
    if (selectedOrgs.length === 0) return null;

    const bestOverall = selectedOrgs.reduce((best, org) => 
      org.scores.overall > best.scores.overall ? org : best
    );

    const worstOverall = selectedOrgs.reduce((worst, org) =>
      org.scores.overall < worst.scores.overall ? org : worst
    );

    const avgScore = selectedOrgs.reduce((sum, org) => sum + org.scores.overall, 0) / selectedOrgs.length;

    const bestEnv = selectedOrgs.reduce((best, org) =>
      org.scores.environmental > best.scores.environmental ? org : best
    );

    return {
      bestOverall,
      worstOverall,
      avgScore: Math.round(avgScore),
      bestEnv,
      gap: bestOverall.scores.overall - worstOverall.scores.overall
    };
  }, [selectedOrgs]);

  const getRatingColor = (rating: string) => {
    if (rating?.startsWith('A')) return 'bg-green-100 text-green-800 border-green-200';
    if (rating?.startsWith('B')) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-orange-100 text-orange-800 border-orange-200';
  };

  const exportCSV = () => {
    if (selectedOrgs.length === 0) return;

    const headers = ['Organisation', 'Score Global', 'E', 'S', 'G', 'Rating', 'Tendance'];
    const rows = selectedOrgs.map(org => [
      org.name,
      org.scores.overall,
      org.scores.environmental,
      org.scores.social,
      org.scores.governance,
      org.scores.rating,
      org.scores.trend.toFixed(1) + '%'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comparaison-organisations.csv';
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            onClick={() => navigate('/organizations')}
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary-600" />
              Comparateur d'Organisations
            </h1>
            <p className="text-gray-600 mt-1">
              Comparez jusqu'à 5 organisations côte à côte
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigator.clipboard.writeText(window.location.href)}>
            <Share2 className="h-4 w-4 mr-2" />
            Partager
          </Button>
          <Button variant="secondary" onClick={exportCSV} disabled={selectedOrgs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Sélection des Organisations */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Sélection des Organisations ({selectedOrgs.length}/5)
        </h2>

        {/* Organisations sélectionnées */}
        {selectedOrgs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 p-4 bg-gray-50 rounded-lg">
            {selectedOrgs.map(org => (
              <span
                key={org.id}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-800 rounded-full text-sm font-medium"
              >
                {org.name}
                <button
                  onClick={() => toggleOrganization(org)}
                  className="hover:text-primary-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Recherche */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une organisation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Liste des organisations */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 max-h-64 overflow-y-auto">
          {filteredOrgs.map(org => {
            const isSelected = selectedOrgs.find(o => o.id === org.id);
            return (
              <button
                key={org.id}
                onClick={() => toggleOrganization(org)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {org.name}
                  </p>
                  {isSelected ? (
                    <CheckCircle className="h-5 w-5 text-primary-600 flex-shrink-0" />
                  ) : (
                    <Plus className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {selectedOrgs.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            <Building2 className="h-20 w-20 text-gray-300 mx-auto mb-4" />
            <p className="text-xl font-medium text-gray-900 mb-2">
              Aucune organisation sélectionnée
            </p>
            <p className="text-gray-600">
              Sélectionnez au moins 2 organisations pour commencer la comparaison
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Insights */}
          {insights && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Meilleur score</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">{insights.bestOverall.scores.overall}</p>
                    <p className="text-xs text-green-600 mt-1">{insights.bestOverall.name}</p>
                  </div>
                  <Award className="h-8 w-8 text-green-600 opacity-50" />
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Score moyen</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{insights.avgScore}</p>
                    <p className="text-xs text-blue-600 mt-1">{selectedOrgs.length} organisations</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600 opacity-50" />
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-orange-700 font-medium">Écart max</p>
                    <p className="text-2xl font-bold text-orange-900 mt-1">{Math.round(insights.gap)} pts</p>
                    <p className="text-xs text-orange-600 mt-1">Entre min et max</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600 opacity-50" />
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-purple-700 font-medium">Leader Environnemental</p>
                    <p className="text-2xl font-bold text-purple-900 mt-1">{insights.bestEnv.scores.environmental}</p>
                    <p className="text-xs text-purple-600 mt-1">{insights.bestEnv.name}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-purple-600 opacity-50" />
                </div>
              </Card>
            </div>
          )}

          {/* Tableau de comparaison */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Comparaison Détaillée
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Métrique</th>
                    {selectedOrgs.map((org, index) => (
                      <th key={org.id} className="text-center py-3 px-4 font-semibold text-gray-700">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                          {org.name.length > 20 ? org.name.substring(0, 20) + '...' : org.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">Score Global</td>
                    {selectedOrgs.map(org => {
                      const isMax = org.scores.overall === Math.max(...selectedOrgs.map(o => o.scores.overall));
                      return (
                        <td key={org.id} className="py-3 px-4 text-center">
                          <span className={`text-2xl font-bold ${isMax ? 'text-green-600' : 'text-gray-900'}`}>
                            {org.scores.overall}
                            {isMax && <Award className="inline-block ml-2 h-5 w-5 text-green-600" />}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">Rating</td>
                    {selectedOrgs.map(org => (
                      <td key={org.id} className="py-3 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold border-2 ${getRatingColor(org.scores.rating)}`}>
                          {org.scores.rating}
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr className="hover:bg-gray-50 bg-green-50">
                    <td className="py-3 px-4 font-medium text-gray-900">🌿 Environnemental</td>
                    {selectedOrgs.map(org => {
                      const isMax = org.scores.environmental === Math.max(...selectedOrgs.map(o => o.scores.environmental));
                      return (
                        <td key={org.id} className="py-3 px-4 text-center">
                          <span className={`text-xl font-bold ${isMax ? 'text-green-600' : 'text-gray-900'}`}>
                            {org.scores.environmental}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  <tr className="hover:bg-gray-50 bg-blue-50">
                    <td className="py-3 px-4 font-medium text-gray-900">👥 Social</td>
                    {selectedOrgs.map(org => {
                      const isMax = org.scores.social === Math.max(...selectedOrgs.map(o => o.scores.social));
                      return (
                        <td key={org.id} className="py-3 px-4 text-center">
                          <span className={`text-xl font-bold ${isMax ? 'text-blue-600' : 'text-gray-900'}`}>
                            {org.scores.social}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  <tr className="hover:bg-gray-50 bg-purple-50">
                    <td className="py-3 px-4 font-medium text-gray-900">⚖️ Gouvernance</td>
                    {selectedOrgs.map(org => {
                      const isMax = org.scores.governance === Math.max(...selectedOrgs.map(o => o.scores.governance));
                      return (
                        <td key={org.id} className="py-3 px-4 text-center">
                          <span className={`text-xl font-bold ${isMax ? 'text-purple-600' : 'text-gray-900'}`}>
                            {org.scores.governance}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">Tendance</td>
                    {selectedOrgs.map(org => (
                      <td key={org.id} className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {org.scores.trend > 0 ? (
                            <>
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span className="text-green-600 font-semibold">+{org.scores.trend.toFixed(1)}%</span>
                            </>
                          ) : (
                            <>
                              <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                              <span className="text-red-600 font-semibold">{org.scores.trend.toFixed(1)}%</span>
                            </>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">Secteur</td>
                    {selectedOrgs.map(org => (
                      <td key={org.id} className="py-3 px-4 text-center text-sm text-gray-600">
                        {org.industry || '—'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Vue d'ensemble Multi-dimensionnelle
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" style={{ fontSize: '12px' }} />
                  <PolarRadiusAxis domain={[0, 100]} style={{ fontSize: '10px' }} />
                  {selectedOrgs.map((org, index) => (
                    <Radar
                      key={org.id}
                      name={org.name}
                      dataKey={org.name}
                      stroke={COLORS[index]}
                      fill={COLORS[index]}
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            {/* Bar Chart */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Comparaison par Pilier
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" style={{ fontSize: '11px' }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Environmental" fill="#10b981" name="Environnemental" />
                  <Bar dataKey="Social" fill="#3b82f6" name="Social" />
                  <Bar dataKey="Governance" fill="#8b5cf6" name="Gouvernance" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}