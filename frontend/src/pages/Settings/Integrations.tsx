import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle, XCircle, Plug, Search, RefreshCw,
  Settings, Trash2, ArrowUpRight, AlertCircle, Zap,
  BarChart3, Database, Building2, Globe, X, ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import PageHeader from '@/components/PageHeader';

type Category = 'all' | 'bi' | 'crm' | 'erp' | 'api';
type Status = 'connected' | 'disconnected' | 'error' | 'syncing';

interface Integration {
  id: number;
  name: string;
  description: string;
  category: Exclude<Category, 'all'>;
  status: Status;
  logo: string;
  lastSync?: string;
  error?: string;
  features: string[];
  premium?: boolean;
  docsUrl?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 1,
    name: 'Google Sheets',
    description: 'Import et export bidirectionnel de données ESG vers vos feuilles de calcul Google.',
    category: 'bi',
    status: 'connected',
    logo: '📊',
    lastSync: 'Il y a 12 min',
    features: ['Import CSV', 'Export temps réel', 'OAuth sécurisé', 'Mise à jour auto'],
  },
  {
    id: 2,
    name: 'Power BI',
    description: 'Connectez vos tableaux de bord Power BI aux données ESG pour des rapports dynamiques.',
    category: 'bi',
    status: 'connected',
    logo: '📈',
    lastSync: 'Il y a 1h',
    features: ['Connecteur natif', 'Refresh auto', 'Graphiques ESG', 'Partage équipes'],
  },
  {
    id: 3,
    name: 'Tableau',
    description: 'Visualisations avancées et analytics ESG avec Tableau Cloud.',
    category: 'bi',
    status: 'disconnected',
    logo: '📉',
    features: ['Tableau Cloud', 'Hyper API', 'Dashboards live'],
    premium: true,
  },
  {
    id: 4,
    name: 'Excel Online',
    description: 'Synchronisation avec Microsoft Excel Online via Microsoft 365.',
    category: 'bi',
    status: 'syncing',
    logo: '📑',
    lastSync: 'Synchronisation...',
    features: ['M365 Integration', 'Formules ESG', 'Partage OneDrive'],
  },
  {
    id: 5,
    name: 'Salesforce',
    description: 'Enrichissez votre CRM Salesforce avec les scores et données ESG de vos clients.',
    category: 'crm',
    status: 'disconnected',
    logo: '☁️',
    features: ['Score ESG client', 'Champs custom', 'Workflow automation'],
    premium: true,
  },
  {
    id: 6,
    name: 'HubSpot',
    description: 'Intégrez les indicateurs ESG dans vos pipelines HubSpot et campagnes.',
    category: 'crm',
    status: 'disconnected',
    logo: '🔶',
    features: ['Contacts enrichis', 'Score ESG', 'Reporting CRM'],
  },
  {
    id: 7,
    name: 'SAP',
    description: 'Connexion bidirectionnelle avec SAP ERP pour la gestion des données environnementales.',
    category: 'erp',
    status: 'error',
    logo: '🔵',
    error: 'Erreur d\'authentification — vérifiez les credentials SAP',
    features: ['SAP S/4HANA', 'RFC/BAPI', 'IDocs', 'SFTP sync'],
    premium: true,
  },
  {
    id: 8,
    name: 'Microsoft Dynamics',
    description: 'Synchronisation des données ESG avec Microsoft Dynamics 365.',
    category: 'erp',
    status: 'connected',
    logo: '🔷',
    lastSync: 'Il y a 4h',
    features: ['Dynamics 365', 'Power Platform', 'Azure AD SSO'],
  },
  {
    id: 9,
    name: 'API REST',
    description: 'API REST complète pour intégrer ESGFlow dans vos propres systèmes et outils.',
    category: 'api',
    status: 'connected',
    logo: '⚡',
    lastSync: 'Active',
    features: ['REST / JSON', 'WebSockets', 'Rate limiting', 'Sandbox'],
    docsUrl: '/app/api-docs',
  },
  {
    id: 10,
    name: 'Webhooks',
    description: 'Recevez des notifications temps réel sur vos endpoints lors de changements de données.',
    category: 'api',
    status: 'connected',
    logo: '🔔',
    lastSync: '3 webhooks actifs',
    features: ['HTTPS POST', 'Retry auto', 'Signature HMAC', 'Logs détaillés'],
  },
];

const CATEGORIES_DEF: { id: Category; labelKey: string; icon: React.ElementType }[] = [
  { id: 'all', labelKey: 'integrations.all', icon: Plug },
  { id: 'bi', labelKey: 'integrations.bi', icon: BarChart3 },
  { id: 'crm', labelKey: 'integrations.crm', icon: Building2 },
  { id: 'erp', labelKey: 'integrations.erp', icon: Database },
  { id: 'api', labelKey: 'integrations.apiWebhooks', icon: Zap },
];

export default function Integrations() {
  const { t } = useTranslation();

  const STATUS_CONFIG = {
    connected: { label: t('integrations.connected'), color: 'bg-green-100 text-green-700', dot: 'bg-green-500', icon: CheckCircle },
    disconnected: { label: t('integrations.disconnected'), color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400', icon: XCircle },
    error: { label: t('integrations.error'), color: 'bg-red-100 text-red-700', dot: 'bg-red-500', icon: AlertCircle },
    syncing: { label: t('integrations.syncing'), color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500 animate-pulse', icon: RefreshCw },
  };

  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [configModal, setConfigModal] = useState<Integration | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const filtered = integrations.filter((i) => {
    const matchCat = category === 'all' || i.category === category;
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const stats = {
    connected: integrations.filter((i) => i.status === 'connected').length,
    error: integrations.filter((i) => i.status === 'error').length,
    total: integrations.length,
  };

  const handleToggle = async (integration: Integration) => {
    setLoadingId(integration.id);
    await new Promise((r) => setTimeout(r, 1200));
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === integration.id
          ? { ...i, status: i.status === 'connected' ? 'disconnected' : 'connected', lastSync: i.status !== 'connected' ? 'Maintenant' : undefined }
          : i
      )
    );
    toast.success(
      integration.status === 'connected'
        ? t('integrations.disconnectedMsg', { name: integration.name })
        : t('integrations.connectedMsg', { name: integration.name })
    );
    setLoadingId(null);
  };

  const handleSync = async (integration: Integration) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === integration.id ? { ...i, status: 'syncing' } : i))
    );
    await new Promise((r) => setTimeout(r, 2000));
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === integration.id ? { ...i, status: 'connected', lastSync: t('integrations.justNow') } : i
      )
    );
    toast.success(t('integrations.syncedMsg', { name: integration.name }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('integrations.title')}
        subtitle={t('integrations.subtitle')}
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border-2 border-green-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-50 rounded-xl">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-2xl font-black text-gray-900">{stats.connected}</span>
          </div>
          <p className="text-sm font-semibold text-gray-600">{t('integrations.connected')}</p>
        </div>
        <div className="bg-white border-2 border-red-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-red-50 rounded-xl">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-2xl font-black text-gray-900">{stats.error}</span>
          </div>
          <p className="text-sm font-semibold text-gray-600">{t('integrations.inError')}</p>
        </div>
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gray-50 rounded-xl">
              <Globe className="h-5 w-5 text-gray-600" />
            </div>
            <span className="text-2xl font-black text-gray-900">{stats.total}</span>
          </div>
          <p className="text-sm font-semibold text-gray-600">{t('integrations.available')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('integrations.searchPlaceholder')}
            className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES_DEF.map((cat) => {
            const Icon = cat.icon;
            const isActive = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(cat.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Integration Cards */}
      {filtered.length === 0 ? (
        <Card className="border-2 text-center py-12">
          <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{t('integrations.noResults')} "{search}"</p>
          <button type="button" onClick={() => setSearch('')} className="mt-2 text-primary-600 text-sm font-semibold hover:underline">
            {t('integrations.clearSearch')}
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((integration) => {
            const statusConf = STATUS_CONFIG[integration.status];
            const StatusIcon = statusConf.icon;
            const isLoading = loadingId === integration.id;

            return (
              <div
                key={integration.id}
                className={`bg-white border-2 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  integration.status === 'error'
                    ? 'border-red-200 hover:border-red-300'
                    : integration.status === 'connected'
                    ? 'border-green-100 hover:border-green-300'
                    : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                {/* Top bar */}
                {integration.status === 'error' && (
                  <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                    <p className="text-xs text-red-700 font-medium truncate">{integration.error}</p>
                  </div>
                )}

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-2xl border border-gray-100">
                        {integration.logo}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">{integration.name}</h3>
                          {integration.premium && (
                            <span className="text-xs font-bold px-1.5 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full">
                              PRO
                            </span>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${statusConf.color}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`} />
                          {statusConf.label}
                        </span>
                      </div>
                    </div>
                    {integration.docsUrl && (
                      <a
                        href={integration.docsUrl}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Documentation"
                      >
                        <ArrowUpRight className="h-4 w-4 text-gray-400" />
                      </a>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{integration.description}</p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {integration.features.map((f) => (
                      <span key={f} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                        {f}
                      </span>
                    ))}
                  </div>

                  {/* Last sync */}
                  {integration.lastSync && (
                    <p className="text-xs text-gray-400 mb-4 flex items-center gap-1.5">
                      <RefreshCw className="h-3 w-3" />
                      {t('integrations.lastSync')}: {integration.lastSync}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <Button
                      size="sm"
                      variant={integration.status === 'connected' ? 'secondary' : 'primary'}
                      className="flex-1"
                      disabled={isLoading}
                      onClick={() => handleToggle(integration)}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-1.5">
                          <div className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                          {integration.status === 'connected' ? t('integrations.disconnecting') : t('integrations.connecting')}
                        </div>
                      ) : integration.status === 'connected' ? (
                        <><XCircle className="h-3.5 w-3.5 mr-1.5" />{t('integrations.disconnect')}</>
                      ) : (
                        <><Plug className="h-3.5 w-3.5 mr-1.5" />{t('integrations.connect')}</>
                      )}
                    </Button>

                    {integration.status === 'connected' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSync(integration)}
                          className="p-2 border-2 border-gray-200 rounded-xl hover:border-primary-300 hover:text-primary-600 transition-colors"
                          title="Synchroniser"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfigModal(integration)}
                          className="p-2 border-2 border-gray-200 rounded-xl hover:border-gray-400 transition-colors"
                          title="Configurer"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                      </>
                    )}

                    {integration.status === 'error' && (
                      <button
                        type="button"
                        onClick={() => handleToggle(integration)}
                        className="p-2 border-2 border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors"
                        title="Réessayer"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Config Modal */}
      {configModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl border border-gray-100">
                  {configModal.logo}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{configModal.name}</h3>
                  <p className="text-xs text-gray-500">{t('integrations.configuration')}</p>
                </div>
              </div>
              <button type="button" onClick={() => setConfigModal(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('integrations.syncFrequency')}</label>
                <div className="relative">
                  <select
                    aria-label="Fréquence de synchronisation"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
                  >
                    <option>{t('integrations.every15min')}</option>
                    <option>{t('integrations.everyHour')}</option>
                    <option>{t('integrations.everyDay')}</option>
                    <option>{t('integrations.manually')}</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('integrations.notifWebhook')}</label>
                <input
                  type="url"
                  placeholder="https://votre-endpoint.com/hook"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm font-semibold text-gray-700">{t('integrations.enableErrorNotifs')}</span>
                <div className="w-11 h-6 bg-primary-600 rounded-full relative cursor-pointer">
                  <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setConfigModal(null)}>
                  {t('integrations.cancel')}
                </Button>
                <Button className="flex-1" onClick={() => { toast.success(t('integrations.configSaved')); setConfigModal(null); }}>
                  <Settings className="h-4 w-4 mr-2" />
                  {t('integrations.save')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
