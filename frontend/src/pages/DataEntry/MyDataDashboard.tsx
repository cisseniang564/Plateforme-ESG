import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import BackButton from '@/components/common/BackButton';
import {
  Database,
  Search,
  Filter,
  Download,
  RefreshCw,
  Edit,
  Trash2,
  Calendar,
  TrendingUp,
  FileText,
  Leaf,
  Users,
  Scale,
  Upload as UploadIcon,
  CheckCircle,
  Clock,
  XCircle,
  Zap,
  Bot,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DataEntry {
  id: string;
  metric_name: string;
  value_numeric: number | null;
  value_text: string | null;
  unit: string;
  pillar: string;
  category: string;
  period_start: string;
  period_end: string;
  collection_method: string;
  verification_status: string;
  data_source: string;
  notes: string;
  created_at: string;
}

interface Stats {
  total: number;
  by_pillar: Record<string, number>;
  by_collection_method: Record<string, number>;
  by_verification_status: Record<string, number>;
  date_range: {
    min: string;
    max: string;
  };
}

const PILLARS = [
  { id: 'environmental', name: 'Environnemental', icon: Leaf, color: 'green' },
  { id: 'social', name: 'Social', icon: Users, color: 'blue' },
  { id: 'governance', name: 'Gouvernance', icon: Scale, color: 'purple' },
];

export default function MyDataDashboard() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<DataEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Pré-filtre depuis URL (ex: /app/my-data?source=fec_import après import FEC)
  const [filters, setFilters] = useState({
    pillar: '',
    search: '',
    verification_status: '',
    collection_method: searchParams.get('source') ?? '',
  });

  useEffect(() => {
    loadData();
    loadStats();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.pillar) params.append('pillar', filters.pillar);
      if (filters.search) params.append('search', filters.search);
      if (filters.verification_status) params.append('verification_status', filters.verification_status);
      if (filters.collection_method) params.append('collection_method', filters.collection_method);
      
      const res = await api.get(`/data-entry/?${params.toString()}`);
      setData(res.data || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/data-entry/stats');
      setStats(res.data);
    } catch (error: any) {
      console.error('Error loading stats:', error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer "${name}" ?`)) return;
    
    setDeleting(id);
    try {
      await api.delete(`/data-entry/${id}`);
      toast.success('🗑️ Donnée supprimée');
      await loadData();
      await loadStats();
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(null);
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    const headers = ['Métrique', 'Valeur', 'Unité', 'Pilier', 'Catégorie', 'Début', 'Fin', 'Source', 'Méthode'];
    const rows = data.map(d => [
      d.metric_name,
      d.value_numeric || d.value_text,
      d.unit || '',
      d.pillar,
      d.category,
      d.period_start,
      d.period_end,
      d.data_source || '',
      d.collection_method || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `donnees_esg_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('✅ Export réussi');
  };

  const getPillarIcon = (pillar: string) => {
    const p = PILLARS.find(p => p.id === pillar);
    return p ? p.icon : Database;
  };

  const getPillarColor = (pillar: string) => {
    const p = PILLARS.find(p => p.id === pillar);
    return p ? p.color : 'gray';
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      verified: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Vérifié' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'En attente' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejeté' },
      flagged: { color: 'bg-orange-100 text-orange-800', icon: Clock, label: 'Marqué' },
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton to="/app/data" label="Données" />
      {/* Header */}
      <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Database className="h-10 w-10" />
              Mes Données ESG
            </h1>
            <p className="text-cyan-100 text-lg">
              Toutes vos données ESG en un seul endroit
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="secondary" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
          <Card className="border-l-4 border-cyan-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Données</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-cyan-50 rounded-xl">
                <Database className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </Card>

          <Card className="border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Environnemental</p>
                <p className="text-3xl font-bold text-green-600">{stats.by_pillar.environmental || 0}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <Leaf className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Social</p>
                <p className="text-3xl font-bold text-blue-600">{stats.by_pillar.social || 0}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Gouvernance</p>
                <p className="text-3xl font-bold text-purple-600">{stats.by_pillar.governance || 0}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <Scale className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* FEC import notice */}
      {stats && (stats.by_collection_method['fec_import'] ?? 0) > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-300 rounded-xl animate-fade-in">
          <Zap className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-semibold text-amber-900">
              {stats.by_collection_method['fec_import']} entrée{stats.by_collection_method['fec_import'] > 1 ? 's' : ''} importée{stats.by_collection_method['fec_import'] > 1 ? 's' : ''} via FEC
            </span>
            <span className="text-sm text-amber-700 ml-2">
              — catégorisées et agrégées automatiquement depuis votre Fichier des Écritures Comptables.
            </span>
          </div>
          <button
            onClick={() => setFilters({ ...filters, collection_method: 'fec_import' })}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline whitespace-nowrap"
          >
            Voir uniquement
          </button>
        </div>
      )}

      {/* Pillar distribution + verification summary */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Distribution par pilier */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-600" />
              Distribution par pilier
            </h3>
            <div className="space-y-3">
              {[
                { id: 'environmental', label: 'Environnemental', color: 'bg-emerald-500', textColor: 'text-emerald-700', count: stats.by_pillar.environmental || 0 },
                { id: 'social', label: 'Social', color: 'bg-blue-500', textColor: 'text-blue-700', count: stats.by_pillar.social || 0 },
                { id: 'governance', label: 'Gouvernance', color: 'bg-purple-500', textColor: 'text-purple-700', count: stats.by_pillar.governance || 0 },
              ].map(p => {
                const pct = stats.total > 0 ? Math.round((p.count / stats.total) * 100) : 0;
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{p.label}</span>
                      <span className={`font-bold ${p.textColor}`}>{p.count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${p.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Statut de vérification */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Statut de vérification
            </h3>
            <div className="space-y-2">
              {[
                { key: 'verified', label: 'Vérifiés', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
                { key: 'pending', label: 'En attente', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock },
                { key: 'rejected', label: 'Rejetés', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
              ].map(s => {
                const count = stats.by_verification_status?.[s.key] || 0;
                const Icon = s.icon;
                return (
                  <div key={s.key} className={`flex items-center justify-between px-3 py-2 rounded-lg ${s.bg}`}>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${s.color}`} />
                      <span className={`text-sm font-medium ${s.color}`}>{s.label}</span>
                    </div>
                    <span className={`text-lg font-bold ${s.color}`}>{count}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Filtres */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="h-4 w-4 inline mr-1" />
              Recherche
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Nom de métrique..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="h-4 w-4 inline mr-1" />
              Pilier
            </label>
            <select
              value={filters.pillar}
              onChange={(e) => setFilters({ ...filters, pillar: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Tous</option>
              <option value="environmental">Environnemental</option>
              <option value="social">Social</option>
              <option value="governance">Gouvernance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="h-4 w-4 inline mr-1" />
              Source
            </label>
            <select
              value={filters.collection_method}
              onChange={(e) => setFilters({ ...filters, collection_method: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Toutes</option>
              <option value="manual">Saisie manuelle</option>
              <option value="manual_scope3">Saisie Scope 3</option>
              <option value="csv_import">Import CSV</option>
              <option value="fec_import">Import FEC</option>
              <option value="automatic">Automatique (IA)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CheckCircle className="h-4 w-4 inline mr-1" />
              Statut
            </label>
            <select
              value={filters.verification_status}
              onChange={(e) => setFilters({ ...filters, verification_status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Tous</option>
              <option value="verified">Vérifié</option>
              <option value="pending">En attente</option>
              <option value="rejected">Rejeté</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {data.length} donnée{data.length > 1 ? 's' : ''}
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-16">
            <Database className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-xl text-gray-900 font-semibold mb-2">
              Aucune donnée trouvée
            </p>
            <p className="text-gray-600 mb-6">
              Commencez par saisir ou importer des données
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => window.location.href = '/data-entry'}>
                Saisie manuelle
              </Button>
              <Button variant="secondary" onClick={() => window.location.href = '/import-csv'}>
                Import CSV
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Métrique</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Valeur</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Pilier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Période</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map((entry) => {
                  const Icon = getPillarIcon(entry.pillar);
                  const color = getPillarColor(entry.pillar);
                  const statusBadge = getStatusBadge(entry.verification_status);
                  const StatusIcon = statusBadge.icon;
                  
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 bg-${color}-50 rounded`}>
                            <Icon className={`h-4 w-4 text-${color}-600`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{entry.metric_name}</p>
                            <p className="text-xs text-gray-400">
                              {entry.category || '—'}
                              {entry.data_source && (
                                <span className="ml-2 text-gray-300">· {entry.data_source}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">
                          {entry.value_numeric !== null ? entry.value_numeric.toLocaleString() : entry.value_text}
                        </p>
                        {entry.unit && (
                          <p className="text-xs text-gray-500">{entry.unit}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded bg-${color}-100 text-${color}-800`}>
                          {entry.pillar}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(entry.period_start), 'dd/MM/yy', { locale: fr })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const cm = entry.collection_method;
                          if (cm === 'fec_import') return (
                            <div className="flex items-center gap-1">
                              <Zap className="h-3 w-3 text-amber-600" />
                              <span className="text-xs font-medium text-amber-700">FEC</span>
                            </div>
                          );
                          if (cm === 'csv_import') return (
                            <div className="flex items-center gap-1">
                              <UploadIcon className="h-3 w-3 text-purple-600" />
                              <span className="text-xs text-purple-700">CSV</span>
                            </div>
                          );
                          if (cm === 'automatic') return (
                            <div className="flex items-center gap-1">
                              <Bot className="h-3 w-3 text-cyan-600" />
                              <span className="text-xs text-cyan-700">Auto IA</span>
                            </div>
                          );
                          if (cm === 'manual_scope3') return (
                            <div className="flex items-center gap-1">
                              <Edit className="h-3 w-3 text-green-600" />
                              <span className="text-xs text-green-700">Scope 3</span>
                            </div>
                          );
                          return (
                            <div className="flex items-center gap-1">
                              <Edit className="h-3 w-3 text-blue-600" />
                              <span className="text-xs text-blue-700">Manuel</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded inline-flex items-center gap-1 ${statusBadge.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(entry.id, entry.metric_name)}
                          disabled={deleting === entry.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Supprimer"
                        >
                          {deleting === entry.id ? (
                            <Spinner size="sm" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
