import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
  Filter,
  Download,
  Leaf,
  Users,
  Scale,
  BarChart3,
  Zap
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  Line
} from 'recharts';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface Indicator {
  id: string;
  code: string;
  name: string;
  pillar: string;
  unit: string;
  weight: number;
  target_value?: number;
}

interface IndicatorStats {
  count: number;
  avg: number | null;
  min: number | null;
  max: number | null;
}

interface ComparisonRow {
  id: string;
  code: string;
  name: string;
  pillar: string;
  current: number;
  target: number;
  gap: number;
  percentage: number;
  weight: number;
  unit: string;
}

export default function IndicatorComparison() {
  const navigate = useNavigate();
  const [comparisonData, setComparisonData] = useState<ComparisonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPillar, setSelectedPillar] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'gap' | 'percentage' | 'weight'>('gap');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const indicatorsRes = await api.get('/api/v1/indicators');
      const indicators: Indicator[] = indicatorsRes.data.items || [];

      if (indicators.length === 0) {
        setComparisonData([]);
        setLoading(false);
        return;
      }

      // Limiter à 20 indicateurs pour ne pas surcharger
      const limited = indicators.slice(0, 20);
      
      const statsResults = await Promise.allSettled(
        limited.map(ind =>
          api.get(`/indicator-data/indicators/${ind.id}/stats`).catch(() => null)
        )
      );

      const rows: ComparisonRow[] = limited
        .map((ind, idx) => {
          const statsResult = statsResults[idx];
          let currentAvg = 0;
          
          if (statsResult.status === 'fulfilled' && statsResult.value) {
            const stats: IndicatorStats = statsResult.value.data;
            currentAvg = stats.avg ?? 0;
          }

          const target = ind.target_value ?? 0;
          const gap = target > 0 ? currentAvg - target : 0;
          const percentage = target > 0 ? (currentAvg / target) * 100 : 0;

          return {
            id: ind.id,
            code: ind.code,
            name: ind.name.length > 30 ? ind.name.substring(0, 30) + '…' : ind.name,
            pillar: ind.pillar,
            current: Math.round(currentAvg * 10) / 10,
            target: target,
            gap: Math.round(gap * 10) / 10,
            percentage: Math.round(percentage),
            weight: ind.weight,
            unit: ind.unit
          };
        })
        .filter(r => r.current > 0 || r.target > 0);

      setComparisonData(rows);
      toast.success('Données de comparaison chargées');
    } catch (error) {
      console.error('Error loading comparison data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const pillars = [
    {
      id: 'environmental',
      name: 'Environnemental',
      icon: Leaf,
      color: '#10b981',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      id: 'social',
      name: 'Social',
      icon: Users,
      color: '#3b82f6',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      id: 'governance',
      name: 'Gouvernance',
      icon: Scale,
      color: '#8b5cf6',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    }
  ];

  const filtered = selectedPillar === 'all'
    ? comparisonData
    : comparisonData.filter(r => r.pillar === selectedPillar);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'gap') return Math.abs(b.gap) - Math.abs(a.gap);
    if (sortBy === 'percentage') return a.percentage - b.percentage;
    return b.weight - a.weight;
  });

  // Stats globales
  const stats = {
    total: filtered.length,
    onTrack: filtered.filter(r => r.current >= r.target).length,
    belowTarget: filtered.filter(r => r.current < r.target && r.target > 0).length,
    avgCompletion: filtered.length > 0
      ? filtered.reduce((sum, r) => sum + r.percentage, 0) / filtered.length
      : 0
  };

  // Données pour radar chart (top 6)
  const radarData = sorted.slice(0, 6).map(r => ({
    indicator: r.code,
    current: r.current,
    target: r.target,
    fullMark: Math.max(r.current, r.target) * 1.2
  }));

  // Données pour bar chart
  const barData = sorted.slice(0, 10);

  const getPillarColor = (pillar: string) => {
    const p = pillars.find(p => p.id === pillar);
    return p?.color || '#6b7280';
  };

  const exportToCSV = () => {
    const headers = ['Code', 'Nom', 'Pilier', 'Valeur Actuelle', 'Objectif', 'Écart', 'Progression (%)', 'Poids'];
    const rows = sorted.map(r => [
      r.code,
      r.name,
      r.pillar,
      r.current,
      r.target,
      r.gap,
      r.percentage,
      r.weight
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comparaison-indicateurs.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Fichier CSV téléchargé');
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
      <div>
        <button
          onClick={() => navigate('/api/v1/indicators')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux indicateurs
        </button>
        
        <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <BarChart3 className="h-10 w-10" />
                Comparaison des Indicateurs
              </h1>
              <p className="text-primary-100 text-lg">
                Analysez la performance de vos indicateurs par rapport aux objectifs définis
              </p>
            </div>
            <Button variant="secondary" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-primary-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Indicateurs</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-primary-50 rounded-xl">
              <Activity className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Objectifs Atteints</p>
              <p className="text-3xl font-bold text-green-600">{stats.onTrack}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">En-dessous Cible</p>
              <p className="text-3xl font-bold text-orange-600">{stats.belowTarget}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Complétion Moyenne</p>
              <p className="text-3xl font-bold text-blue-600">{stats.avgCompletion.toFixed(0)}%</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedPillar('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPillar === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tous ({comparisonData.length})
            </button>
            {pillars.map(pillar => {
              const Icon = pillar.icon;
              const count = comparisonData.filter(r => r.pillar === pillar.id).length;
              return (
                <button
                  key={pillar.id}
                  onClick={() => setSelectedPillar(pillar.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedPillar === pillar.id
                      ? `${pillar.bgColor} ${pillar.textColor} border-2`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {pillar.name} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="gap">Trier par écart</option>
              <option value="percentage">Trier par progression</option>
              <option value="weight">Trier par poids</option>
            </select>
          </div>
        </div>
      </Card>

      {filtered.length > 0 ? (
        <>
          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Top 10 - Performance vs Objectif
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="code" style={{ fontSize: '11px' }} />
                  <YAxis style={{ fontSize: '11px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="current" name="Valeur Actuelle" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getPillarColor(entry.pillar)} />
                    ))}
                  </Bar>
                  <Line 
                    type="monotone" 
                    dataKey="target" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="Objectif"
                    dot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>

            {/* Radar Chart */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Radar - Top 6 Indicateurs
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="indicator" style={{ fontSize: '11px' }} />
                  <PolarRadiusAxis style={{ fontSize: '10px' }} />
                  <Radar 
                    name="Valeur Actuelle" 
                    dataKey="current" 
                    stroke="#6366f1" 
                    fill="#6366f1" 
                    fillOpacity={0.5} 
                  />
                  <Radar 
                    name="Objectif" 
                    dataKey="target" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.3} 
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Tableau Comparatif */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Tableau Comparatif Détaillé
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Code</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Indicateur</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Pilier</th>
                    <th className="text-right py-4 px-6 font-semibold text-gray-700">Actuel</th>
                    <th className="text-right py-4 px-6 font-semibold text-gray-700">Objectif</th>
                    <th className="text-right py-4 px-6 font-semibold text-gray-700">Écart</th>
                    <th className="text-right py-4 px-6 font-semibold text-gray-700">Progression</th>
                    <th className="text-center py-4 px-6 font-semibold text-gray-700">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sorted.map((row) => {
                    const onTrack = row.target > 0 && row.current >= row.target;
                    const pillar = pillars.find(p => p.id === row.pillar);
                    const PillarIcon = pillar?.icon || Activity;

                    return (
                      <tr 
                        key={row.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/indicators/${row.id}`)}
                      >
                        <td className="py-4 px-6">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            {row.code}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-medium text-gray-900">{row.name}</p>
                        </td>
                        <td className="py-4 px-6">
                          {pillar && (
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${pillar.bgColor} ${pillar.textColor}`}>
                              <PillarIcon className="h-3 w-3" />
                              {pillar.name}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="font-bold text-gray-900">
                            {row.current > 0 ? row.current.toLocaleString() : '—'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right text-gray-600">
                          {row.target > 0 ? row.target.toLocaleString() : '—'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {row.target > 0 ? (
                            <span className={`font-semibold ${
                              row.gap >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {row.gap >= 0 ? '+' : ''}{row.gap.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {row.target > 0 ? (
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    row.percentage >= 100 ? 'bg-green-500' :
                                    row.percentage >= 75 ? 'bg-blue-500' :
                                    row.percentage >= 50 ? 'bg-orange-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(row.percentage, 100)}%` }}
                                />
                              </div>
                              <span className="font-medium text-gray-900 w-12 text-right">
                                {row.percentage}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {row.target === 0 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              Pas d'objectif
                            </span>
                          ) : onTrack ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3" />
                              Atteint
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              <TrendingUp className="h-3 w-3" />
                              En cours
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Insights */}
          {stats.belowTarget > 0 && (
            <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-orange-900 mb-2">
                    {stats.belowTarget} indicateur{stats.belowTarget > 1 ? 's' : ''} en-dessous de l'objectif
                  </h4>
                  <p className="text-sm text-orange-800 mb-4">
                    Ces indicateurs nécessitent une attention particulière pour atteindre les objectifs définis.
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      size="sm"
                      onClick={() => navigate('/api/v1/indicators')}
                    >
                      Voir les indicateurs
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => navigate('/data/upload')}
                    >
                      Importer données
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <div className="text-center py-16">
            <Activity className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium text-lg mb-2">
              Aucune donnée disponible pour la comparaison
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Importez des données et définissez des objectifs sur vos indicateurs
            </p>
            <Button onClick={() => navigate('/api/v1/indicators')}>
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour aux indicateurs
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}