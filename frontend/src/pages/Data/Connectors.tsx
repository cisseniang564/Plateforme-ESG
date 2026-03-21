import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Link2,
  Settings,
  RefreshCw,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Download,
  X,
  Key,
  Shield,
  BarChart3,
  Database,
  Zap,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';

// --- Types ---

type ConnectorStatus = 'connected' | 'disconnected' | 'error' | 'syncing';
type ConnectorCategory = 'erp' | 'hr' | 'energy' | 'carbon';
type AuthType = 'oauth2' | 'apikey' | 'certificate';
type TabId = 'overview' | 'connectors' | 'monitoring' | 'configuration';

interface Connector {
  id: string;
  name: string;
  category: ConnectorCategory;
  status: ConnectorStatus;
  lastSync: string;
  nextSync: string;
  syncsToday: number;
  dataPoints: number;
  authType: AuthType;
  description: string;
  logo: string;
}

interface LogEntry {
  id: string;
  connectorId: string;
  connectorName: string;
  timestamp: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  duration: number;
  rowsProcessed: number;
}

interface ActivityItem {
  connectorName: string;
  action: string;
  time: string;
  status: 'success' | 'error' | 'info';
}

// --- Mock data ---

const CONNECTORS: Connector[] = [
  {
    id: 'sap-erp',
    name: 'SAP ERP',
    category: 'erp',
    status: 'connected',
    lastSync: '2024-03-21T08:30:00Z',
    nextSync: '2024-03-21T09:30:00Z',
    syncsToday: 8,
    dataPoints: 1245,
    authType: 'oauth2',
    description: 'ERP principal - donnees financieres et operations',
    logo: 'S',
  },
  {
    id: 'oracle-finance',
    name: 'Oracle Finance',
    category: 'erp',
    status: 'connected',
    lastSync: '2024-03-21T07:45:00Z',
    nextSync: '2024-03-21T10:00:00Z',
    syncsToday: 6,
    dataPoints: 892,
    authType: 'apikey',
    description: 'Module finance Oracle - donnees comptables',
    logo: 'O',
  },
  {
    id: 'sage-x3',
    name: 'Sage X3',
    category: 'erp',
    status: 'disconnected',
    lastSync: '2024-03-19T14:00:00Z',
    nextSync: '-',
    syncsToday: 0,
    dataPoints: 0,
    authType: 'apikey',
    description: 'ERP Sage - PME et ETI',
    logo: 'SX',
  },
  {
    id: 'workday-hr',
    name: 'Workday HR',
    category: 'hr',
    status: 'connected',
    lastSync: '2024-03-21T06:00:00Z',
    nextSync: '2024-03-21T18:00:00Z',
    syncsToday: 2,
    dataPoints: 3870,
    authType: 'oauth2',
    description: 'SIRH Workday - donnees RH et paie',
    logo: 'W',
  },
  {
    id: 'successfactors',
    name: 'SAP SuccessFactors',
    category: 'hr',
    status: 'connected',
    lastSync: '2024-03-21T07:00:00Z',
    nextSync: '2024-03-21T19:00:00Z',
    syncsToday: 2,
    dataPoints: 2140,
    authType: 'oauth2',
    description: 'RH SAP - talent et performance',
    logo: 'SF',
  },
  {
    id: 'bamboohr',
    name: 'BambooHR',
    category: 'hr',
    status: 'error',
    lastSync: '2024-03-20T22:00:00Z',
    nextSync: '2024-03-21T22:00:00Z',
    syncsToday: 0,
    dataPoints: 0,
    authType: 'apikey',
    description: 'RH BambooHR - PME',
    logo: 'BH',
  },
  {
    id: 'schneider-em',
    name: 'Schneider EcoStruxure',
    category: 'energy',
    status: 'connected',
    lastSync: '2024-03-21T08:00:00Z',
    nextSync: '2024-03-21T09:00:00Z',
    syncsToday: 24,
    dataPoints: 18650,
    authType: 'certificate',
    description: 'Gestion energie intelligente Schneider',
    logo: 'SE',
  },
  {
    id: 'siemens-mindsphere',
    name: 'Siemens MindSphere',
    category: 'energy',
    status: 'connected',
    lastSync: '2024-03-21T08:15:00Z',
    nextSync: '2024-03-21T08:45:00Z',
    syncsToday: 48,
    dataPoints: 22410,
    authType: 'certificate',
    description: 'IoT industriel Siemens',
    logo: 'SM',
  },
  {
    id: 'carbon-track',
    name: 'CarbonTrack',
    category: 'carbon',
    status: 'connected',
    lastSync: '2024-03-21T04:00:00Z',
    nextSync: '2024-03-22T04:00:00Z',
    syncsToday: 1,
    dataPoints: 4320,
    authType: 'apikey',
    description: 'Suivi des emissions carbone Scope 1-3',
    logo: 'CT',
  },
  {
    id: 'climatiq',
    name: 'Climatiq',
    category: 'carbon',
    status: 'connected',
    lastSync: '2024-03-21T00:00:00Z',
    nextSync: '2024-03-22T00:00:00Z',
    syncsToday: 1,
    dataPoints: 980,
    authType: 'apikey',
    description: 'Facteurs emissions Climatiq API',
    logo: 'CL',
  },
  {
    id: 'persefoni',
    name: 'Persefoni',
    category: 'carbon',
    status: 'disconnected',
    lastSync: '2024-03-15T12:00:00Z',
    nextSync: '-',
    syncsToday: 0,
    dataPoints: 0,
    authType: 'oauth2',
    description: 'Plateforme carbone entreprise',
    logo: 'P',
  },
];

const MOCK_LOGS: LogEntry[] = [
  { id: '1', connectorId: 'sap-erp', connectorName: 'SAP ERP', timestamp: '2024-03-21T08:30:00Z', status: 'success', message: 'Sync completed - 156 records updated', duration: 2340, rowsProcessed: 156 },
  { id: '2', connectorId: 'siemens-mindsphere', connectorName: 'Siemens MindSphere', timestamp: '2024-03-21T08:15:00Z', status: 'success', message: 'Energy data synced - 892 data points', duration: 1820, rowsProcessed: 892 },
  { id: '3', connectorId: 'workday-hr', connectorName: 'Workday HR', timestamp: '2024-03-21T06:00:00Z', status: 'success', message: 'HR records synchronized - 2140 employees', duration: 4120, rowsProcessed: 2140 },
  { id: '4', connectorId: 'bamboohr', connectorName: 'BambooHR', timestamp: '2024-03-20T22:00:00Z', status: 'error', message: 'Authentication failed - API key expired', duration: 120, rowsProcessed: 0 },
  { id: '5', connectorId: 'oracle-finance', connectorName: 'Oracle Finance', timestamp: '2024-03-21T07:45:00Z', status: 'success', message: 'Financial data imported - Q1 2024', duration: 3890, rowsProcessed: 892 },
  { id: '6', connectorId: 'schneider-em', connectorName: 'Schneider EcoStruxure', timestamp: '2024-03-21T08:00:00Z', status: 'warning', message: 'Partial sync - 3 sensors offline', duration: 2100, rowsProcessed: 1450 },
  { id: '7', connectorId: 'carbon-track', connectorName: 'CarbonTrack', timestamp: '2024-03-21T04:00:00Z', status: 'success', message: 'Emission factors updated - Scope 1-3', duration: 5600, rowsProcessed: 320 },
  { id: '8', connectorId: 'sap-erp', connectorName: 'SAP ERP', timestamp: '2024-03-21T07:30:00Z', status: 'success', message: 'Sync completed - 134 records updated', duration: 2100, rowsProcessed: 134 },
  { id: '9', connectorId: 'successfactors', connectorName: 'SAP SuccessFactors', timestamp: '2024-03-21T07:00:00Z', status: 'success', message: 'Talent data synced - 2140 profiles', duration: 3200, rowsProcessed: 2140 },
  { id: '10', connectorId: 'climatiq', connectorName: 'Climatiq', timestamp: '2024-03-21T00:00:00Z', status: 'success', message: 'Emission factors refreshed', duration: 890, rowsProcessed: 980 },
  { id: '11', connectorId: 'sap-erp', connectorName: 'SAP ERP', timestamp: '2024-03-20T20:30:00Z', status: 'success', message: 'Sync completed - 198 records', duration: 2450, rowsProcessed: 198 },
  { id: '12', connectorId: 'siemens-mindsphere', connectorName: 'Siemens MindSphere', timestamp: '2024-03-20T20:15:00Z', status: 'success', message: 'IoT data synced', duration: 1650, rowsProcessed: 750 },
  { id: '13', connectorId: 'bamboohr', connectorName: 'BambooHR', timestamp: '2024-03-20T18:00:00Z', status: 'error', message: 'Rate limit exceeded - retry in 1h', duration: 80, rowsProcessed: 0 },
  { id: '14', connectorId: 'oracle-finance', connectorName: 'Oracle Finance', timestamp: '2024-03-20T15:45:00Z', status: 'success', message: 'Budget data imported', duration: 3100, rowsProcessed: 445 },
  { id: '15', connectorId: 'schneider-em', connectorName: 'Schneider EcoStruxure', timestamp: '2024-03-20T14:00:00Z', status: 'success', message: 'Energy monitoring synced', duration: 1980, rowsProcessed: 1820 },
  { id: '16', connectorId: 'workday-hr', connectorName: 'Workday HR', timestamp: '2024-03-20T06:00:00Z', status: 'success', message: 'HR sync completed', duration: 4080, rowsProcessed: 2140 },
  { id: '17', connectorId: 'carbon-track', connectorName: 'CarbonTrack', timestamp: '2024-03-20T04:00:00Z', status: 'success', message: 'Scope 3 data updated', duration: 5200, rowsProcessed: 284 },
  { id: '18', connectorId: 'sap-erp', connectorName: 'SAP ERP', timestamp: '2024-03-19T22:30:00Z', status: 'warning', message: 'Slow response - data may be incomplete', duration: 9800, rowsProcessed: 78 },
  { id: '19', connectorId: 'sage-x3', connectorName: 'Sage X3', timestamp: '2024-03-19T14:00:00Z', status: 'error', message: 'Connection timeout - server unreachable', duration: 30000, rowsProcessed: 0 },
  { id: '20', connectorId: 'persefoni', connectorName: 'Persefoni', timestamp: '2024-03-15T12:00:00Z', status: 'error', message: 'OAuth token expired - re-authentication required', duration: 200, rowsProcessed: 0 },
];

const RECENT_ACTIVITY: ActivityItem[] = [
  { connectorName: 'SAP ERP', action: 'Sync completed', time: '2 min ago', status: 'success' },
  { connectorName: 'Siemens MindSphere', action: 'Energy data updated', time: '15 min ago', status: 'success' },
  { connectorName: 'BambooHR', action: 'Authentication failed', time: '1h ago', status: 'error' },
  { connectorName: 'Workday HR', action: 'HR records synced', time: '2h ago', status: 'success' },
  { connectorName: 'Schneider EcoStruxure', action: 'Partial sync - sensors offline', time: '1h 8min ago', status: 'info' },
];

// --- Helper components ---

function StatusBadge({ status }: { status: ConnectorStatus }) {
  const { t } = useTranslation();
  const config = {
    connected: { color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500', label: t('connectors.statusConnected') },
    disconnected: { color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400', label: t('connectors.statusDisconnected') },
    error: { color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500', label: t('connectors.statusError') },
    syncing: { color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: t('connectors.statusSyncing') },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: ConnectorCategory }) {
  const { t } = useTranslation();
  const config = {
    erp: { color: 'bg-purple-100 text-purple-700', label: t('connectors.categoryERP') },
    hr: { color: 'bg-blue-100 text-blue-700', label: t('connectors.categoryHR') },
    energy: { color: 'bg-amber-100 text-amber-700', label: t('connectors.categoryEnergy') },
    carbon: { color: 'bg-green-100 text-green-700', label: t('connectors.categoryCarbon') },
  }[category];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

function LogStatusBadge({ status }: { status: 'success' | 'error' | 'warning' }) {
  const config = {
    success: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3.5 w-3.5" /> },
    error: { color: 'bg-red-100 text-red-700', icon: <AlertCircle className="h-3.5 w-3.5" /> },
    warning: { color: 'bg-amber-100 text-amber-700', icon: <AlertCircle className="h-3.5 w-3.5" /> },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.icon}
      {status}
    </span>
  );
}

// Inline SVG mini bar chart
function MiniBarChart({ data, color = '#6366f1' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const width = 80;
  const height = 32;
  const barW = Math.floor(width / data.length) - 2;
  return (
    <svg width={width} height={height} className="overflow-visible">
      {data.map((v, i) => {
        const barH = Math.max(2, (v / max) * (height - 4));
        return (
          <rect
            key={i}
            x={i * (barW + 2)}
            y={height - barH}
            width={barW}
            height={barH}
            fill={color}
            rx={2}
            opacity={0.8}
          />
        );
      })}
    </svg>
  );
}

// Inline SVG sparkline
function Sparkline({ data, color = '#6366f1' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 80;
  const height = 32;
  const step = width / (data.length - 1);
  const pts = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`)
    .join(' ');
  return (
    <svg width={width} height={height}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// --- Configuration Panel ---

function ConfigPanel({ connector, onClose }: { connector: Connector; onClose: () => void }) {
  const { t } = useTranslation();
  const [frequency, setFrequency] = useState('hourly');
  const [dataMapping, setDataMapping] = useState({
    emissions: true,
    energy: true,
    workforce: false,
    finance: false,
    waste: true,
  });

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center font-bold text-primary-700 text-sm">
            {connector.logo}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('connectors.configFor', { name: connector.name })}</h2>
            <CategoryBadge category={connector.category} />
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auth section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Key className="h-4 w-4 text-primary-600" />
            {t('connectors.authTitle')}
          </h3>

          {connector.authType === 'oauth2' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('connectors.clientId')}</label>
                <input
                  type="text"
                  placeholder="client_id"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('connectors.clientSecret')}</label>
                <input
                  type="password"
                  placeholder="client_secret"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('connectors.tokenUrl')}</label>
                <input
                  type="url"
                  placeholder="https://auth.example.com/token"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <Button className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                {t('connectors.authorizeOAuth')}
              </Button>
            </div>
          )}

          {connector.authType === 'apikey' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('connectors.apiKey')}</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('connectors.baseUrl')}</label>
                <input
                  type="url"
                  placeholder="https://api.example.com/v1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {connector.authType === 'certificate' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('connectors.certFile')}</label>
                <div className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 text-center cursor-pointer hover:border-primary-400">
                  {t('connectors.uploadCert')}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('connectors.certPassword')}</label>
                <input
                  type="password"
                  placeholder="Certificate password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Sync frequency */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary-600" />
              {t('connectors.syncFrequency')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {['realtime', 'hourly', 'daily', 'weekly'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    frequency === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t(`connectors.freq${f.charAt(0).toUpperCase() + f.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Data mapping */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Database className="h-4 w-4 text-primary-600" />
              {t('connectors.dataMapping')}
            </h3>
            <div className="space-y-2">
              {Object.entries(dataMapping).map(([key, value]) => (
                <label key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setDataMapping({ ...dataMapping, [key]: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="text-sm text-gray-700">{t(`connectors.mapping${key.charAt(0).toUpperCase() + key.slice(1)}`)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6 pt-6 border-t">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button className="flex-1">
          {t('connectors.saveConfig')}
        </Button>
      </div>
    </Card>
  );
}

// --- Main component ---

export default function Connectors() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<string>('all');
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);

  const kpis = useMemo(() => ({
    total: CONNECTORS.length,
    connected: CONNECTORS.filter(c => c.status === 'connected').length,
    error: CONNECTORS.filter(c => c.status === 'error').length,
    syncsToday: CONNECTORS.reduce((sum, c) => sum + c.syncsToday, 0),
  }), []);

  const filteredConnectors = useMemo(() => {
    return CONNECTORS.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === 'all' || c.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [searchQuery, categoryFilter, statusFilter]);

  const filteredLogs = useMemo(() => {
    return MOCK_LOGS.filter(l => {
      const matchSearch = l.connectorName.toLowerCase().includes(logSearch.toLowerCase()) ||
        l.message.toLowerCase().includes(logSearch.toLowerCase());
      const matchStatus = logStatusFilter === 'all' || l.status === logStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [logSearch, logStatusFilter]);

  const exportLogs = () => {
    const csv = [
      'Timestamp,Connector,Status,Message,Duration(ms),Rows',
      ...filteredLogs.map(l =>
        `${l.timestamp},${l.connectorName},${l.status},"${l.message}",${l.duration},${l.rowsProcessed}`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'connector_logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const TABS: { id: TabId; labelKey: string; icon: React.ReactNode }[] = [
    { id: 'overview', labelKey: 'connectors.tabOverview', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'connectors', labelKey: 'connectors.tabConnectors', icon: <Link2 className="h-4 w-4" /> },
    { id: 'monitoring', labelKey: 'connectors.tabMonitoring', icon: <Activity className="h-4 w-4" /> },
    { id: 'configuration', labelKey: 'connectors.tabConfiguration', icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Link2 className="h-8 w-8 text-primary-600" />
            {t('connectors.title')}
          </h1>
          <p className="mt-1 text-gray-600">{t('connectors.subtitle')}</p>
        </div>
        <Button>
          <Zap className="h-4 w-4 mr-2" />
          {t('connectors.addConnector')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {t(tab.labelKey)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-primary-700 font-medium">{t('connectors.kpiTotal')}</p>
                  <p className="text-4xl font-bold text-primary-900 mt-1">{kpis.total}</p>
                </div>
                <Database className="h-10 w-10 text-primary-600 opacity-40" />
              </div>
              <div className="mt-2">
                <MiniBarChart data={[8, 9, 10, 11, 11, 11]} color="#6366f1" />
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">{t('connectors.kpiConnected')}</p>
                  <p className="text-4xl font-bold text-green-900 mt-1">{kpis.connected}</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-600 opacity-40" />
              </div>
              <div className="mt-2">
                <Sparkline data={[3, 4, 4, 5, 5, 5]} color="#16a34a" />
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 font-medium">{t('connectors.kpiErrors')}</p>
                  <p className="text-4xl font-bold text-red-900 mt-1">{kpis.error}</p>
                </div>
                <AlertCircle className="h-10 w-10 text-red-600 opacity-40" />
              </div>
              <div className="mt-2">
                <Sparkline data={[0, 1, 0, 2, 1, 1]} color="#dc2626" />
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">{t('connectors.kpiSyncsToday')}</p>
                  <p className="text-4xl font-bold text-blue-900 mt-1">{kpis.syncsToday}</p>
                </div>
                <RefreshCw className="h-10 w-10 text-blue-600 opacity-40" />
              </div>
              <div className="mt-2">
                <MiniBarChart data={[32, 38, 41, 45, 47, 47]} color="#2563eb" />
              </div>
            </Card>
          </div>

          {/* Category breakdown + Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('connectors.byCategory')}</h2>
              <div className="space-y-3">
                {(['erp', 'hr', 'energy', 'carbon'] as ConnectorCategory[]).map(cat => {
                  const count = CONNECTORS.filter(c => c.category === cat).length;
                  const connectedCount = CONNECTORS.filter(c => c.category === cat && c.status === 'connected').length;
                  const pct = Math.round((connectedCount / count) * 100);
                  const colors: Record<ConnectorCategory, string> = {
                    erp: 'bg-purple-500',
                    hr: 'bg-blue-500',
                    energy: 'bg-amber-500',
                    carbon: 'bg-green-500',
                  };
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{t(`connectors.category${cat.toUpperCase()}`)}</span>
                        <span className="text-gray-500">{connectedCount}/{count} {t('connectors.connected')}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${colors[cat]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('connectors.recentActivity')}</h2>
              <div className="space-y-3">
                {RECENT_ACTIVITY.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                      item.status === 'success' ? 'bg-green-500' :
                      item.status === 'error' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.connectorName}</p>
                      <p className="text-xs text-gray-500">{item.action}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Connectors */}
      {activeTab === 'connectors' && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('connectors.searchPlaceholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-3">
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">{t('connectors.allCategories')}</option>
                  <option value="erp">{t('connectors.categoryERP')}</option>
                  <option value="hr">{t('connectors.categoryHR')}</option>
                  <option value="energy">{t('connectors.categoryEnergy')}</option>
                  <option value="carbon">{t('connectors.categoryCarbon')}</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">{t('connectors.allStatuses')}</option>
                  <option value="connected">{t('connectors.statusConnected')}</option>
                  <option value="disconnected">{t('connectors.statusDisconnected')}</option>
                  <option value="error">{t('connectors.statusError')}</option>
                </select>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConnectors.map(connector => (
              <Card key={connector.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-700 text-sm">
                      {connector.logo}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{connector.name}</h3>
                      <CategoryBadge category={connector.category} />
                    </div>
                  </div>
                  <StatusBadge status={connector.status} />
                </div>

                <p className="text-xs text-gray-500 mb-3">{connector.description}</p>

                {connector.status === 'connected' && (
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-500">{t('connectors.dataPoints')}</p>
                      <p className="font-bold text-gray-900">{connector.dataPoints.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-gray-500">{t('connectors.syncsToday')}</p>
                      <p className="font-bold text-gray-900">{connector.syncsToday}</p>
                    </div>
                  </div>
                )}

                {connector.status === 'error' && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700">{t('connectors.errorCheckConfig')}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  {connector.status === 'connected' && (
                    <Button size="sm" variant="secondary" className="flex-1">
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      {t('connectors.sync')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => { setSelectedConnector(connector); setActiveTab('configuration'); }}
                  >
                    <Settings className="h-3.5 w-3.5 mr-1.5" />
                    {t('connectors.configure')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Monitoring */}
      {activeTab === 'monitoring' && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('connectors.logSearchPlaceholder')}
                    value={logSearch}
                    onChange={e => setLogSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <select
                  value={logStatusFilter}
                  onChange={e => setLogStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">{t('connectors.allStatuses')}</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                  <option value="warning">Warning</option>
                </select>
              </div>
              <Button variant="secondary" onClick={exportLogs}>
                <Download className="h-4 w-4 mr-2" />
                {t('connectors.exportLogs')}
              </Button>
            </div>
          </Card>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">{t('connectors.logTimestamp')}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">{t('connectors.logConnector')}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">{t('connectors.logStatus')}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">{t('connectors.logMessage')}</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">{t('connectors.logDuration')}</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">{t('connectors.logRows')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{log.connectorName}</td>
                      <td className="px-4 py-3">
                        <LogStatusBadge status={log.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{log.message}</td>
                      <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                        {log.duration >= 1000 ? `${(log.duration / 1000).toFixed(1)}s` : `${log.duration}ms`}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">{log.rowsProcessed.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLogs.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>{t('connectors.noLogs')}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Configuration */}
      {activeTab === 'configuration' && (
        <div className="space-y-4">
          {!selectedConnector && (
            <>
              <p className="text-gray-600 text-sm">{t('connectors.configSelectPrompt')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CONNECTORS.map(connector => (
                  <button
                    key={connector.id}
                    onClick={() => setSelectedConnector(connector)}
                    className="p-4 border-2 border-gray-200 rounded-xl text-left transition-all hover:border-primary-300 hover:bg-primary-50"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-700 text-xs">
                        {connector.logo}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{connector.name}</p>
                        <CategoryBadge category={connector.category} />
                      </div>
                    </div>
                    <StatusBadge status={connector.status} />
                  </button>
                ))}
              </div>
            </>
          )}

          {selectedConnector && (
            <ConfigPanel
              connector={selectedConnector}
              onClose={() => setSelectedConnector(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
