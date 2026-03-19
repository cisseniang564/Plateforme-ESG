import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Activity,
  Upload,
  Download,
  Calendar,
  Award,
  AlertCircle,
  CheckCircle,
  BarChart3,
  LineChart as LineChartIcon,
  RefreshCw,
  Leaf,
  Users,
  Scale,
  Plus,
  X,
  Send,
  Clock,
  XCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
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
  category: string;
  unit: string;
  data_type: string;
  description: string;
  weight: number;
  target_value: number;
  is_active: boolean;
  framework: string;
  calculation_method?: string;
}

interface IndicatorDataPoint {
  id: string;
  date: string;
  value: number;
  unit: string;
  notes: string;
  source: string;
  is_verified: boolean;
  is_estimated: boolean;
  validation_status: string;
}

interface Stats {
  count: number;
  min: number;
  max: number;
  avg: number;
  first_date: string;
  last_date: string;
}

export default function IndicatorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [indicator, setIndicator] = useState<Indicator | null>(null);
  const [data, setData] = useState<IndicatorDataPoint[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], value: '', notes: '', is_estimated: false });

  useEffect(() => {
    if (id) {
      loadAll();
    }
  }, [id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadIndicator(), loadData(), loadStats()]);
    } catch (error) {
      console.error('Error loading:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadIndicator = async () => {
    try {
      const response = await api.get(`/indicators/${id}`);
      setIndicator(response.data);
    } catch (error) {
      console.error('Error loading indicator:', error);
    }
  };

  const loadData = async () => {
    try {
      const response = await api.get(`/indicator-data/indicators/${id}/data`);
      setData(response.data?.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get(`/indicator-data/indicators/${id}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleAddData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.value) return;
    setSubmitting(true);
    try {
      await api.post(`/indicator-data/indicators/${id}/data`, {
        date: formData.date,
        value: parseFloat(formData.value),
        notes: formData.notes || null,
        source: 'manual',
        is_estimated: formData.is_estimated,
      });
      toast.success('Donnée ajoutée avec succès');
      setShowAddModal(false);
      setFormData({ date: new Date().toISOString().split('T')[0], value: '', notes: '', is_estimated: false });
      await loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de l\'ajout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForReview = async (entryId: string) => {
    try {
      await api.post('/validation/submit-for-review', { entry_ids: [entryId] });
      toast.success('Entrée soumise pour validation');
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la soumission');
    }
  };

  const getPillarConfig = (pillar: string) => {
    const configs = {
      environmental: {
        icon: Leaf,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        gradient: 'from-green-500 to-green-600',
        name: 'Environnemental'
      },
      social: {
        icon: Users,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        gradient: 'from-blue-500 to-blue-600',
        name: 'Social'
      },
      governance: {
        icon: Scale,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        gradient: 'from-purple-500 to-purple-600',
        name: 'Gouvernance'
      }
    };
    return configs[pillar as keyof typeof configs] || configs.environmental;
  };

  // Préparer les données pour les graphiques
  const chartData = data
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(d => ({
      date: format(new Date(d.date), 'dd MMM', { locale: fr }),
      value: d.value,
      verified: d.is_verified,
      estimated: d.is_estimated
    }));

  // Calculer les métriques
  const latestValue = data.length > 0 ? data[data.length - 1].value : null;
  const previousValue = data.length > 1 ? data[data.length - 2].value : null;
  const trend = latestValue && previousValue 
    ? ((latestValue - previousValue) / previousValue * 100) 
    : null;

  const targetProgress = indicator?.target_value && latestValue
    ? (latestValue / indicator.target_value) * 100
    : null;

  const verifiedCount = data.filter(d => d.is_verified).length;
  const verificationRate = data.length > 0 ? (verifiedCount / data.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!indicator) {
    return (
      <Card>
        <div className="text-center py-16">
          <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium text-lg mb-4">Indicateur introuvable</p>
          <Button onClick={() => navigate('/app/indicators')}>
            Retour aux indicateurs
          </Button>
        </div>
      </Card>
    );
  }

  const pillarConfig = getPillarConfig(indicator.pillar);
  const PillarIcon = pillarConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <button
            onClick={() => navigate('/app/indicators')}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 transition hover:text-gray-900 hover:shadow"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>

          <ChevronRight className="h-4 w-4 text-gray-300" />

          <button
            onClick={() => navigate('/app/indicators')}
            className="text-sm font-medium text-gray-500 transition hover:text-gray-900"
          >
            Indicateurs
          </button>

          <ChevronRight className="h-4 w-4 text-gray-300" />

          <span className="font-medium text-gray-900">{indicator.name}</span>
        </div>

        <div className={`bg-gradient-to-br ${pillarConfig.gradient} rounded-2xl p-8 text-white shadow-xl mb-6`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <PillarIcon className="h-8 w-8" />
                </div>
                <div>
                  <span className="text-sm bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full font-mono">
                    {indicator.code}
                  </span>
                  <h1 className="text-3xl font-bold mt-2">{indicator.name}</h1>
                </div>
              </div>
              
              {indicator.description && (
                <p className="text-white/90 text-lg max-w-3xl">
                  {indicator.description}
                </p>
              )}

              <div className="flex items-center gap-6 mt-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-white/90">Pilier: {pillarConfig.name}</span>
                </div>
                {indicator.framework && (
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    <span className="text-white/90">Référentiel: {indicator.framework}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={loadAll}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Saisir une valeur
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Valeur Actuelle */}
        <Card className="border-l-4 border-primary-500">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2 font-medium">Valeur Actuelle</p>
            <p className="text-4xl font-bold text-primary-600 mb-1">
              {latestValue !== null ? latestValue.toLocaleString() : '—'}
            </p>
            <p className="text-sm text-gray-500">{indicator.unit}</p>
            {trend !== null && (
              <div className={`flex items-center justify-center mt-3 text-sm font-medium ${
                trend >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(trend).toFixed(1)}% vs précédent
              </div>
            )}
          </div>
        </Card>

        {/* Moyenne */}
        <Card className="border-l-4 border-blue-500">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2 font-medium">Moyenne</p>
            <p className="text-4xl font-bold text-blue-600 mb-1">
              {stats?.avg ? stats.avg.toFixed(1) : '—'}
            </p>
            <p className="text-sm text-gray-500">{indicator.unit}</p>
            <p className="text-xs text-gray-400 mt-3">
              Sur {stats?.count || 0} points de données
            </p>
          </div>
        </Card>

        {/* Objectif */}
        <Card className="border-l-4 border-green-500">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2 font-medium">Objectif</p>
            <p className="text-4xl font-bold text-green-600 mb-1">
              {indicator.target_value || '—'}
            </p>
            <p className="text-sm text-gray-500">{indicator.unit}</p>
            {targetProgress !== null && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      targetProgress >= 100 ? 'bg-green-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${Math.min(targetProgress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {targetProgress.toFixed(0)}% atteint
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Vérification */}
        <Card className="border-l-4 border-purple-500">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2 font-medium">Vérification</p>
            <p className="text-4xl font-bold text-purple-600 mb-1">
              {verificationRate.toFixed(0)}%
            </p>
            <p className="text-sm text-gray-500">Données vérifiées</p>
            <div className="flex items-center justify-center gap-2 mt-3 text-xs">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-gray-600">
                {verifiedCount}/{data.length} points
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-primary-600" />
            Évolution Temporelle
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '11px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  name="Valeur"
                />
                {indicator.target_value && (
                  <Line 
                    type="monotone" 
                    dataKey={() => indicator.target_value} 
                    stroke="#10b981" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Objectif"
                    dot={false}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-2" />
                <p>Aucune donnée disponible</p>
              </div>
            </div>
          )}
        </Card>

        {/* Statistiques */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Statistiques Détaillées
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Plage de valeurs</span>
                <span className="font-semibold text-gray-900">
                  {stats?.min?.toFixed(1)} - {stats?.max?.toFixed(1)} {indicator.unit}
                </span>
              </div>
              <div className="relative h-3 bg-gray-200 rounded-full">
                {stats && latestValue && (
                  <div
                    className="absolute h-3 w-1 bg-primary-600 rounded-full"
                    style={{
                      left: `${((latestValue - stats.min) / (stats.max - stats.min)) * 100}%`
                    }}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Valeur Min</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.min?.toFixed(1)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Valeur Max</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.max?.toFixed(1)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-900">Poids dans le score</span>
                <span className="text-lg font-bold text-blue-600">{indicator.weight}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-purple-900">Catégorie</span>
                <span className="text-sm font-semibold text-purple-600 capitalize">
                  {indicator.category}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-900">Type de données</span>
                <span className="text-sm font-semibold text-green-600 capitalize">
                  {indicator.data_type}
                </span>
              </div>
            </div>

            {indicator.calculation_method && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-xs text-orange-800 font-medium mb-1">Méthode de calcul</p>
                <p className="text-sm text-orange-900">{indicator.calculation_method}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Tableau des données */}
      {data.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Points de Données ({data.length})
            </h3>
            <Button variant="secondary" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Valeur</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Source</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Notes</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Statut</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((point) => (
                  <tr key={point.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {format(new Date(point.date), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-lg font-bold text-primary-600">
                        {point.value.toLocaleString()} {point.unit}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700 capitalize">
                        {point.source}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600 max-w-xs truncate">
                      {point.notes || '—'}
                    </td>
                    <td className="py-4 px-6">
                      {point.validation_status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          <CheckCircle className="h-4 w-4" />
                          Approuvé
                        </span>
                      ) : point.validation_status === 'pending_review' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          <Send className="h-4 w-4" />
                          En révision
                        </span>
                      ) : point.validation_status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          <XCircle className="h-4 w-4" />
                          Rejeté
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                          <Clock className="h-4 w-4" />
                          Brouillon
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {point.validation_status === 'draft' && (
                        <button
                          onClick={() => handleSubmitForReview(point.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                          title="Soumettre pour validation"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Soumettre
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {data.length === 0 && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="text-center py-16">
            <Activity className="h-16 w-16 mx-auto text-blue-300 mb-4" />
            <p className="text-gray-900 font-semibold text-lg mb-2">
              Aucune donnée disponible
            </p>
            <p className="text-gray-600 mb-6">
              Saisissez votre première valeur pour commencer à suivre cet indicateur
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Saisir une valeur
            </Button>
          </div>
        </Card>
      )}

      {/* Modal saisie donnée */}
      {showAddModal && indicator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className={`flex items-center justify-between rounded-t-2xl bg-gradient-to-r ${getPillarConfig(indicator.pillar).gradient} p-6 text-white`}>
              <div>
                <p className="text-sm font-mono opacity-80">{indicator.code}</p>
                <h3 className="text-xl font-bold">Saisir une valeur</h3>
                <p className="text-sm opacity-80 mt-1">{indicator.name}</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="rounded-xl bg-white/20 p-2 hover:bg-white/30 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddData} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de mesure *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valeur * {indicator.unit && <span className="text-gray-400">({indicator.unit})</span>}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder={`ex: 42.5`}
                  value={formData.value}
                  onChange={e => setFormData(f => ({ ...f, value: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                <textarea
                  rows={3}
                  placeholder="Commentaires, source de données..."
                  value={formData.notes}
                  onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_estimated}
                  onChange={e => setFormData(f => ({ ...f, is_estimated: e.target.checked }))}
                  className="h-4 w-4 rounded text-teal-600"
                />
                <span className="text-sm text-gray-700">Valeur estimée / provisoire</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.value}
                  className="flex-1 rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition disabled:opacity-60"
                >
                  {submitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}