import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Plug, 
  Plus,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Upload,
  Download,
  Activity,
  AlertCircle
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import PageHeader from '@/components/PageHeader';
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

export default function IntegrationManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [types, setTypes] = useState<IntegrationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGoogleSheetsConfig, setShowGoogleSheetsConfig] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
    }
  };

  const handleTestConnection = async (integration: Integration) => {
    setTestingIntegration(integration.id);
    
    try {
      const response = await api.post(`/integrations/${integration.id}/test`);
      
      if (response.data.status === 'success') {
        alert(`✅ Connection successful!\nUser: ${response.data.user_email}`);
      } else {
        alert(`❌ ${response.data.message}`);
      }
    } catch (error: any) {
      alert(`❌ Test failed: ${error.response?.data?.detail || 'Unknown error'}`);
    } finally {
      setTestingIntegration(null);
    }
  };

  const handleToggleActive = async (integration: Integration) => {
    try {
      await api.patch(`/integrations/${integration.id}`, {
        is_active: !integration.is_active,
      });
      
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update integration');
    }
  };

  const handleDelete = async (integration: Integration) => {
    if (!confirm(`Are you sure you want to delete "${integration.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/integrations/${integration.id}`);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete integration');
    }
  };

  const handleConfigureIntegration = (type: IntegrationType) => {
    if (type.id === 'google_sheets') {
      setShowGoogleSheetsConfig(true);
    } else {
      alert(`Configuration for ${type.name} coming soon!`);
    }
  };

  const handleImport = (integration: Integration) => {
    setSelectedIntegration(integration);
    setShowImportModal(true);
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      google_sheets: '📊',
      power_bi: '📈',
      tableau: '📉',
      excel_online: '📑',
      looker: '🔍',
    };
    return icons[type] || '🔌';
  };

  const getStatusColor = (integration: Integration) => {
    if (!integration.is_active) return 'text-gray-400';
    if (integration.last_error) return 'text-red-600';
    return 'text-green-600';
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
        title="Integrations"
        subtitle="Connect ESGFlow with your favorite tools and services"
        showBack={true}
        backTo="/settings"
      />

      {/* Available Integration Types */}
      <div>

      {/* Carte INSEE spéciale */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🇫🇷 Données Entreprises Françaises</h2>
        <Card 
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate('/settings/insee')}
        >
          <div className="text-center space-y-3">
            <div className="text-4xl">🏢</div>
            <h3 className="font-semibold text-gray-900">API INSEE Sirene</h3>
            <p className="text-sm text-gray-600 h-10">Accès à la base officielle des entreprises françaises</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                SIREN/SIRET
              </span>
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                Gratuit
              </span>
              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                Temps réel
              </span>
            </div>
            <div className="pt-2">
              <p className="text-xs text-gray-500 mb-3">
                Recherchez et enrichissez vos données ESG avec les informations officielles
              </p>
              <Button size="sm" variant="primary" className="w-full">
                Accéder à la recherche →
              </Button>
            </div>
          </div>
        </Card>
      </div>

        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {types.map(type => {
            const existing = integrations.find(i => i.type === type.id);
            return (
              <Card key={type.id} className="hover:shadow-lg transition-shadow">
                <div className="text-center space-y-3">
                  <div className="text-4xl">{getTypeIcon(type.id)}</div>
                  <h3 className="font-semibold text-gray-900">{type.name}</h3>
                  <p className="text-sm text-gray-600 h-10">{type.description}</p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    {type.features.map(feature => (
                      <span key={feature} className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded">
                        {feature}
                      </span>
                    ))}
                  </div>
                  {existing ? (
                    <div className="pt-2">
                      <span className="text-xs text-green-600 flex items-center justify-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Connected
                      </span>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="w-full"
                      onClick={() => handleConfigureIntegration(type)}
                    >
                      {type.requires_oauth ? 'Connect' : 'Configure'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Active Integrations */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Integrations</h2>
        <Card>
          {integrations.length === 0 ? (
            <div className="text-center py-12">
              <Plug className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 font-medium mb-2">No integrations configured</p>
              <p className="text-sm text-gray-400 mb-6">Connect your first integration to sync data</p>
            </div>
          ) : (
            <div className="space-y-4">
              {integrations.map(integration => (
                <div key={integration.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-3xl">{getTypeIcon(integration.type)}</div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{integration.name}</h4>
                        {integration.user_email && (
                          <span className="text-xs text-gray-500">({integration.user_email})</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 capitalize">{integration.type.replace('_', ' ')}</p>
                      
                      {integration.last_sync_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Last synced: {new Date(integration.last_sync_at).toLocaleString()}
                        </p>
                      )}
                      
                      {integration.last_error && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3 w-3 text-red-500" />
                          <p className="text-xs text-red-600">{integration.last_error}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Status Toggle */}
                    <button
                      onClick={() => handleToggleActive(integration)}
                      className={`flex items-center gap-2 ${getStatusColor(integration)}`}
                    >
                      {integration.is_active ? (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-sm font-medium">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5" />
                          <span className="text-sm font-medium">Inactive</span>
                        </>
                      )}
                    </button>
                    
                    {/* Actions */}
                    {integration.type === 'google_sheets' && integration.is_active && (
                      <>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => handleImport(integration)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Import
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => alert('Export feature coming soon!')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => handleTestConnection(integration)}
                      disabled={testingIntegration === integration.id}
                    >
                      {testingIntegration === integration.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Activity className="h-4 w-4 mr-2" />
                          Test
                        </>
                      )}
                    </Button>
                    
                    <button 
                      onClick={() => handleDelete(integration)}
                      className="text-red-600 hover:text-red-900 p-2"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      <GoogleSheetsConfigModal
        isOpen={showGoogleSheetsConfig}
        onClose={() => setShowGoogleSheetsConfig(false)}
        onSuccess={loadData}
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
