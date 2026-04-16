import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plug,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Upload,
  Download,
  Activity,
  AlertCircle,
  ArrowLeft,
  Building2,
  Table2,
  BarChart2,
  PieChart,
  FileSpreadsheet,
  Search,
  Zap,
  Globe,
  ChevronRight,
  Link2,
  Clock,
  Shield,
  Star,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import GoogleSheetsConfigModal from '@/components/modals/GoogleSheetsConfigModal';
import GoogleSheetsImportModal from '@/components/modals/GoogleSheetsImportModal';
import api from '@/services/api';

interface Integration {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  last_sync_at: string | null;
  last_error: string | null;
  user_email: string | null;
  created_at: string;
}

interface IntegrationType {
  id: string;
  name: string;
  description: string;
  features: string[];
  requires_oauth: boolean;
}

interface Notification {
  id: string;
  type: 'success' | 'error';
  message: string;
}

const TYPE_CONFIG: Record<string, {
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  badge: string;
}> = {
  google_sheets: {
    icon: <Table2 className="h-6 w-6" />,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-700',
  },
  power_bi: {
    icon: <BarChart2 className="h-6 w-6" />,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  tableau: {
    icon: <PieChart className="h-6 w-6" />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
  },
  excel_online: {
    icon: <FileSpreadsheet className="h-6 w-6" />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  looker: {
    icon: <Search className="h-6 w-6" />,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-700',
  },
};

const DEFAULT_CONFIG = {
  icon: <Plug className="h-6 w-6" />,
  color: 'text-gray-600',
  bg: 'bg-gray-50',
  border: 'border-gray-200',
  badge: 'bg-gray-100 text-gray-700',
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Jamais';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'À l\'instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

export default function IntegrationManagement() {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [types, setTypes] = useState<IntegrationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGoogleSheetsConfig, setShowGoogleSheetsConfig] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const notify = (type: 'success' | 'error', message: string) => {
    const id = Math.random().toString(36).slice(2);
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

  const loadData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const [integrationsRes, typesRes] = await Promise.all([
        api.get('/integrations'),
        api.get('/integrations/types'),
      ]);
      setIntegrations(integrationsRes.data.items || []);
      setTypes(typesRes.data.types || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleTestConnection = async (integration: Integration) => {
    setTestingIntegration(integration.id);
    try {
      const response = await api.post(`/integrations/${integration.id}/test`);
      if (response.data.status === 'success') {
        notify('success', `Connexion réussie — ${response.data.user_email}`);
      } else {
        notify('error', response.data.message);
      }
    } catch (error: any) {
      notify('error', `Échec du test : ${error.response?.data?.detail || 'Erreur inconnue'}`);
    } finally {
      setTestingIntegration(null);
    }
  };

  const handleToggleActive = async (integration: Integration) => {
    try {
      await api.patch(`/integrations/${integration.id}`, {
        is_active: !integration.is_active,
      });
      notify('success', integration.is_active ? 'Intégration désactivée' : 'Intégration activée');
      loadData(true);
    } catch (error: any) {
      notify('error', error.response?.data?.detail || 'Échec de la mise à jour');
    }
  };

  const handleDelete = async (integration: Integration) => {
    if (!confirm(`Supprimer "${integration.name}" ?`)) return;
    try {
      await api.delete(`/integrations/${integration.id}`);
      notify('success', 'Intégration supprimée');
      loadData(true);
    } catch (error: any) {
      notify('error', error.response?.data?.detail || 'Échec de la suppression');
    }
  };

  const handleConfigureIntegration = (type: IntegrationType) => {
    if (type.id === 'google_sheets') {
      setShowGoogleSheetsConfig(true);
    } else {
      notify('error', `Configuration de ${type.name} bientôt disponible`);
    }
  };

  const handleImport = (integration: Integration) => {
    setSelectedIntegration(integration);
    setShowImportModal(true);
  };

  const cfg = (type: string) => TYPE_CONFIG[type] || DEFAULT_CONFIG;

  const activeCount = integrations.filter(i => i.is_active).length;
  const errorCount = integrations.filter(i => i.last_error).length;

  return (
    <div className="space-y-6">

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto transition-all ${
              n.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {n.type === 'success'
              ? <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              : <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />}
            {n.message}
          </div>
        ))}
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==')] opacity-30" />
        <div className="relative">
          {/* Back button */}
          <button
            onClick={() => navigate('/app/settings')}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Paramètres
          </button>

          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold tracking-wide uppercase">
                  Connecteurs Tiers
                </span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Link2 className="h-7 w-7" />
                </div>
                <h1 className="text-3xl font-bold">Intégrations</h1>
              </div>
              <p className="text-cyan-100 max-w-xl">
                Connectez ESGFlow à vos outils préférés et synchronisez vos données ESG en temps réel
              </p>
            </div>

            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-sm font-medium transition-colors flex-shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/20">
            {[
              { label: 'Types disponibles', value: types.length || '—', icon: <Globe className="h-4 w-4" /> },
              { label: 'Mes intégrations', value: integrations.length, icon: <Link2 className="h-4 w-4" /> },
              { label: 'Actives', value: activeCount, icon: <Zap className="h-4 w-4" /> },
              { label: 'Erreurs', value: errorCount, icon: <AlertCircle className="h-4 w-4" /> },
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                  {stat.icon}
                  {stat.label}
                </div>
                <div className="text-2xl font-bold">{loading ? '—' : stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* INSEE Card — Données françaises */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Données entreprises françaises</h2>
        </div>
        <div
          onClick={() => navigate('/app/settings/insee')}
          className="group flex items-center gap-5 p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all"
        >
          <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors flex-shrink-0">
            <Building2 className="h-7 w-7 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">API INSEE Sirene</h3>
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium">Gratuit</span>
              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">Temps réel</span>
            </div>
            <p className="text-sm text-gray-500">
              Accédez à la base officielle SIREN/SIRET — recherchez et enrichissez vos données ESG avec les informations officielles des entreprises françaises
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-gray-400 hidden sm:block">10M+ entreprises</span>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>

      {/* Available Integrations */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Intégrations disponibles</h2>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-48" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {types.map(type => {
              const existing = integrations.find(i => i.type === type.id);
              const c = cfg(type.id);
              return (
                <div
                  key={type.id}
                  className={`relative flex flex-col p-5 bg-white border rounded-xl shadow-sm hover:shadow-md transition-all ${c.border}`}
                >
                  {existing && (
                    <div className="absolute top-3 right-3">
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <CheckCircle className="h-3 w-3" />
                        Connecté
                      </span>
                    </div>
                  )}
                  <div className={`p-3 ${c.bg} rounded-xl w-fit mb-3 ${c.color}`}>
                    {c.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{type.name}</h3>
                  <p className="text-xs text-gray-500 mb-3 flex-1">{type.description}</p>
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {type.features.map(feature => (
                      <span key={feature} className={`px-2 py-0.5 text-xs rounded-full ${c.badge}`}>
                        {feature}
                      </span>
                    ))}
                  </div>
                  {existing ? (
                    <button
                      onClick={() => handleTestConnection(existing)}
                      disabled={testingIntegration === existing.id}
                      className={`flex items-center justify-center gap-2 w-full py-2 text-xs font-medium rounded-lg border ${c.border} ${c.color} hover:${c.bg} transition-colors`}
                    >
                      {testingIntegration === existing.id
                        ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        : <Activity className="h-3.5 w-3.5" />}
                      Tester la connexion
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConfigureIntegration(type)}
                      className="w-full py-2 text-xs font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors"
                    >
                      {type.requires_oauth ? 'Connecter' : 'Configurer'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My Integrations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Mes intégrations</h2>
          </div>
          {integrations.length > 0 && (
            <span className="text-xs text-gray-500">{integrations.length} intégration{integrations.length > 1 ? 's' : ''}</span>
          )}
        </div>

        {loading ? (
          <div className="animate-pulse bg-gray-100 rounded-xl h-32" />
        ) : integrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 bg-white border border-gray-200 rounded-xl text-center">
            <div className="p-4 bg-gray-50 rounded-2xl mb-4">
              <Plug className="h-10 w-10 text-gray-300" />
            </div>
            <p className="font-medium text-gray-700 mb-1">Aucune intégration configurée</p>
            <p className="text-sm text-gray-400 max-w-xs">
              Connectez votre première intégration ci-dessus pour synchroniser vos données
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {integrations.map(integration => {
              const c = cfg(integration.type);
              return (
                <div
                  key={integration.id}
                  className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  {/* Icon */}
                  <div className={`p-2.5 ${c.bg} rounded-lg ${c.color} flex-shrink-0`}>
                    {c.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-gray-900 truncate">{integration.name}</span>
                      {integration.user_email && (
                        <span className="text-xs text-gray-400 truncate hidden sm:block">({integration.user_email})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="capitalize">{integration.type.replace(/_/g, ' ')}</span>
                      {integration.last_sync_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Sync. {formatRelativeTime(integration.last_sync_at)}
                        </span>
                      )}
                    </div>
                    {integration.last_error && (
                      <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1 bg-red-50 rounded-lg w-fit">
                        <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                        <p className="text-xs text-red-600 truncate max-w-xs">{integration.last_error}</p>
                      </div>
                    )}
                  </div>

                  {/* Status toggle */}
                  <button
                    onClick={() => handleToggleActive(integration)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex-shrink-0 ${
                      integration.is_active
                        ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {integration.is_active
                      ? <><CheckCircle className="h-3.5 w-3.5" /> Actif</>
                      : <><XCircle className="h-3.5 w-3.5" /> Inactif</>}
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {integration.type === 'google_sheets' && integration.is_active && (
                      <>
                        <button
                          onClick={() => handleImport(integration)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Importer"
                        >
                          <Upload className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => notify('error', 'Export bientôt disponible')}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Exporter"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleTestConnection(integration)}
                      disabled={testingIntegration === integration.id}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Tester"
                    >
                      {testingIntegration === integration.id
                        ? <RefreshCw className="h-4 w-4 animate-spin" />
                        : <Activity className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(integration)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <GoogleSheetsConfigModal
        isOpen={showGoogleSheetsConfig}
        onClose={() => setShowGoogleSheetsConfig(false)}
        onSuccess={() => { loadData(true); notify('success', 'Google Sheets connecté avec succès'); }}
      />

      {selectedIntegration && (
        <GoogleSheetsImportModal
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false);
            setSelectedIntegration(null);
          }}
          integrationId={selectedIntegration.id}
          integrationName={selectedIntegration.name}
        />
      )}
    </div>
  );
}
