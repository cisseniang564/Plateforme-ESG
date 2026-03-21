import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plug,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  Activity,
  Zap,
  BarChart3,
  Search,
  Download,
  ChevronRight,
  Wifi,
  Clock,
  Database,
} from 'lucide-react'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'

// ── Types ────────────────────────────────────────────────────────────────────

type ConnectorStatus = 'connected' | 'available' | 'error'
type ConnectorCategory = 'ERP' | 'HR' | 'Energy' | 'Carbon'
type AuthType = 'oauth2' | 'apikey' | 'certificate'
type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly'

interface Connector {
  id: string
  name: string
  category: ConnectorCategory
  status: ConnectorStatus
  color: string
  authType: AuthType
  lastSync?: string
  records?: number
  errorMsg?: string
}

interface LogEntry {
  id: string
  connector: string
  timestamp: string
  status: 'success' | 'warning' | 'error'
  records: number
  duration: string
  message: string
}

// ── Static data ───────────────────────────────────────────────────────────────

const CONNECTORS: Connector[] = [
  { id: 'sap-s4', name: 'SAP S/4HANA', category: 'ERP', status: 'connected', color: '#1e40af', authType: 'oauth2', lastSync: '2024-01-15 08:30', records: 1250 },
  { id: 'oracle-fusion', name: 'Oracle Fusion', category: 'ERP', status: 'available', color: '#dc2626', authType: 'oauth2' },
  { id: 'netsuite', name: 'NetSuite', category: 'ERP', status: 'connected', color: '#7c3aed', authType: 'apikey', lastSync: '2024-01-15 06:00', records: 342 },
  { id: 'workday', name: 'Workday', category: 'HR', status: 'connected', color: '#0891b2', authType: 'oauth2', lastSync: '2024-01-15 09:00', records: 890 },
  { id: 'bamboohr', name: 'BambooHR', category: 'HR', status: 'available', color: '#16a34a', authType: 'apikey' },
  { id: 'sap-sf', name: 'SAP SuccessFactors', category: 'HR', status: 'error', color: '#9333ea', authType: 'oauth2', lastSync: '2024-01-14 23:00', errorMsg: 'Auth token expired' },
  { id: 'schneider', name: 'Schneider Electric', category: 'Energy', status: 'connected', color: '#059669', authType: 'oauth2', lastSync: '2024-01-15 09:15', records: 4200 },
  { id: 'enedis', name: 'Enedis', category: 'Energy', status: 'available', color: '#0284c7', authType: 'apikey' },
  { id: 'edf', name: 'EDF Data', category: 'Energy', status: 'available', color: '#dc2626', authType: 'certificate' },
  { id: 'climatiq', name: 'Climatiq API', category: 'Carbon', status: 'connected', color: '#16a34a', authType: 'apikey', lastSync: '2024-01-15 09:10', records: 156 },
  { id: 'carbon-interface', name: 'Carbon Interface', category: 'Carbon', status: 'available', color: '#0f766e', authType: 'apikey' },
]

const SYNC_CHART_DATA = [
  { day: 'Mon', syncs: 38 },
  { day: 'Tue', syncs: 52 },
  { day: 'Wed', syncs: 44 },
  { day: 'Thu', syncs: 61 },
  { day: 'Fri', syncs: 47 },
  { day: 'Sat', syncs: 29 },
  { day: 'Sun', syncs: 35 },
]

const ACTIVITY_FEED = [
  { id: '1', connector: 'SAP S/4HANA', action: 'Sync completed', time: '2 min ago', ok: true },
  { id: '2', connector: 'Workday', action: 'Sync completed', time: '8 min ago', ok: true },
  { id: '3', connector: 'SAP SuccessFactors', action: 'Auth error', time: '14 min ago', ok: false },
  { id: '4', connector: 'Schneider Electric', action: 'Sync completed', time: '20 min ago', ok: true },
  { id: '5', connector: 'Climatiq API', action: 'Sync completed', time: '25 min ago', ok: true },
  { id: '6', connector: 'NetSuite', action: 'Sync completed', time: '31 min ago', ok: true },
  { id: '7', connector: 'SAP S/4HANA', action: 'Sync started', time: '35 min ago', ok: true },
  { id: '8', connector: 'Workday', action: 'New records', time: '42 min ago', ok: true },
  { id: '9', connector: 'Schneider Electric', action: 'Sync completed', time: '50 min ago', ok: true },
  { id: '10', connector: 'Climatiq API', action: 'Rate limit warning', time: '1h ago', ok: false },
]

const MOCK_LOGS: LogEntry[] = [
  { id: '1', connector: 'SAP S/4HANA', timestamp: '2024-01-15 09:30:02', status: 'success', records: 312, duration: '4.2s', message: 'Full sync completed' },
  { id: '2', connector: 'Workday', timestamp: '2024-01-15 09:15:44', status: 'success', records: 89, duration: '2.8s', message: 'Delta sync completed' },
  { id: '3', connector: 'SAP SuccessFactors', timestamp: '2024-01-15 09:00:11', status: 'error', records: 0, duration: '1.1s', message: 'OAuth2 token expired — please re-authorize' },
  { id: '4', connector: 'Schneider Electric', timestamp: '2024-01-15 08:45:33', status: 'success', records: 1047, duration: '8.5s', message: 'Energy data synced' },
  { id: '5', connector: 'Climatiq API', timestamp: '2024-01-15 08:30:22', status: 'success', records: 42, duration: '1.6s', message: 'Emission factors updated' },
  { id: '6', connector: 'NetSuite', timestamp: '2024-01-15 08:15:07', status: 'success', records: 128, duration: '3.3s', message: 'Financial data synced' },
  { id: '7', connector: 'SAP S/4HANA', timestamp: '2024-01-15 07:59:55', status: 'warning', records: 298, duration: '5.1s', message: '14 rows skipped (invalid format)' },
  { id: '8', connector: 'Workday', timestamp: '2024-01-15 07:45:18', status: 'success', records: 76, duration: '2.4s', message: 'HR data synced' },
  { id: '9', connector: 'Schneider Electric', timestamp: '2024-01-15 07:30:41', status: 'success', records: 1102, duration: '9.0s', message: 'Energy data synced' },
  { id: '10', connector: 'Climatiq API', timestamp: '2024-01-15 07:15:33', status: 'warning', records: 38, duration: '2.1s', message: 'Rate limit approaching (80%)' },
  { id: '11', connector: 'NetSuite', timestamp: '2024-01-15 07:00:05', status: 'success', records: 100, duration: '3.1s', message: 'Scheduled sync completed' },
  { id: '12', connector: 'SAP S/4HANA', timestamp: '2024-01-15 06:45:17', status: 'success', records: 301, duration: '4.4s', message: 'Full sync completed' },
  { id: '13', connector: 'Workday', timestamp: '2024-01-15 06:30:44', status: 'error', records: 0, duration: '0.8s', message: 'Connection timeout after 30s' },
  { id: '14', connector: 'Schneider Electric', timestamp: '2024-01-15 06:15:29', status: 'success', records: 987, duration: '7.7s', message: 'Energy data synced' },
  { id: '15', connector: 'Climatiq API', timestamp: '2024-01-15 06:00:13', status: 'success', records: 40, duration: '1.5s', message: 'Emission factors updated' },
  { id: '16', connector: 'NetSuite', timestamp: '2024-01-15 05:45:01', status: 'success', records: 115, duration: '2.9s', message: 'Delta sync completed' },
  { id: '17', connector: 'SAP S/4HANA', timestamp: '2024-01-15 05:30:55', status: 'success', records: 288, duration: '4.1s', message: 'Full sync completed' },
  { id: '18', connector: 'Workday', timestamp: '2024-01-15 05:15:37', status: 'success', records: 84, duration: '2.6s', message: 'HR data synced' },
  { id: '19', connector: 'Schneider Electric', timestamp: '2024-01-15 05:00:21', status: 'warning', records: 1008, duration: '8.2s', message: 'Partial sync — 3 meters unavailable' },
  { id: '20', connector: 'Climatiq API', timestamp: '2024-01-15 04:45:09', status: 'success', records: 39, duration: '1.4s', message: 'Scheduled sync completed' },
]

const DATA_MAPPING_KEYS = [
  'mappingEmissions',
  'mappingEnergy',
  'mappingWorkforce',
  'mappingFinance',
  'mappingWaste',
  'mappingSocial',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusChip({ status, t }: { status: ConnectorStatus; t: (k: string) => string }) {
  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        {t('connectors.statusConnected')}
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
        {t('connectors.statusError')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
      {t('connectors.statusAvailable')}
    </span>
  )
}

function LogChip({ status }: { status: 'success' | 'warning' | 'error' }) {
  if (status === 'success') return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Success</span>
  if (status === 'warning') return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Warning</span>
  return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Error</span>
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────

function OverviewTab({ t }: { t: (k: string) => string }) {
  const connected = CONNECTORS.filter(c => c.status === 'connected').length
  const errors = CONNECTORS.filter(c => c.status === 'error').length
  const maxSyncs = Math.max(...SYNC_CHART_DATA.map(d => d.syncs))

  const kpis = [
    { label: t('connectors.kpiTotal'), value: CONNECTORS.length, icon: Plug, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
    { label: t('connectors.kpiConnected'), value: connected, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    { label: t('connectors.kpiErrors'), value: errors, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    { label: t('connectors.kpiSyncsToday'), value: 47, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label} className={`${kpi.bg} ${kpi.border}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{kpi.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                </div>
                <Icon className={`h-10 w-10 opacity-40 ${kpi.color}`} />
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sync Volume SVG bar chart */}
        <Card>
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            {t('connectors.syncVolumeChart')}
          </h3>
          <div className="flex items-end gap-2 h-40">
            {SYNC_CHART_DATA.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 font-medium">{d.syncs}</span>
                <div
                  className="w-full rounded-t-md bg-blue-500 hover:bg-blue-600 transition-colors cursor-default"
                  style={{ height: `${(d.syncs / maxSyncs) * 100}%`, minHeight: 8 }}
                />
                <span className="text-xs text-gray-400">{d.day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent activity */}
        <Card>
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-500" />
            {t('connectors.recentActivity')}
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {ACTIVITY_FEED.map(ev => (
              <div key={ev.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ev.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-medium text-sm text-gray-800 flex-1 truncate">{ev.connector}</span>
                <span className="text-xs text-gray-500 truncate">{ev.action}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{ev.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── Tab: Connectors ───────────────────────────────────────────────────────────

function ConnectorsTab({ t }: { t: (k: string) => string }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('All')

  const categories = ['All', 'ERP', 'HR', 'Energy', 'Carbon']

  const getCatLabel = (cat: string) => {
    if (cat === 'All') return t('connectors.categoryAll')
    if (cat === 'ERP') return t('connectors.categoryERP')
    if (cat === 'HR') return t('connectors.categoryHR')
    if (cat === 'Energy') return t('connectors.categoryEnergy')
    return t('connectors.categoryCarbon')
  }

  const filtered = CONNECTORS.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'All' || c.category === category
    return matchSearch && matchCat
  })

  return (
    <div className="space-y-4">
      {/* Search + category filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('connectors.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1.5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                category === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getCatLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(connector => (
          <Card key={connector.id} className="hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{ backgroundColor: connector.color }}
              >
                {connector.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{connector.name}</p>
                <span className="inline-block text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mt-0.5">
                  {getCatLabel(connector.category)}
                </span>
              </div>
              <StatusChip status={connector.status} t={t} />
            </div>

            {(connector.status === 'connected' || connector.status === 'error') && connector.lastSync && (
              <div className="flex items-center gap-3 mb-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t('connectors.lastSync')}: {connector.lastSync}
                </span>
                {connector.records !== undefined && (
                  <span className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    {connector.records.toLocaleString()} {t('connectors.records')}
                  </span>
                )}
              </div>
            )}

            {connector.status === 'error' && connector.errorMsg && (
              <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 mb-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {connector.errorMsg}
              </p>
            )}

            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
              <Button size="sm" variant="secondary" className="flex-1">
                <Settings className="h-3.5 w-3.5 mr-1" />
                {t('connectors.configure')}
              </Button>
              {connector.status === 'connected' && (
                <Button size="sm" className="flex-1">
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  {t('connectors.syncNow')}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── Tab: Monitoring ───────────────────────────────────────────────────────────

function MonitoringTab({ t }: { t: (k: string) => string }) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [connectorFilter, setConnectorFilter] = useState<string>('all')

  const connectedNames = CONNECTORS.filter(c => c.status !== 'available').map(c => c.name)

  const filtered = MOCK_LOGS.filter(log => {
    const matchStatus = statusFilter === 'all' || log.status === statusFilter
    const matchConnector = connectorFilter === 'all' || log.connector === connectorFilter
    return matchStatus && matchConnector
  })

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">{t('connectors.filterStatus')}</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('connectors.allStatuses')}</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">{t('connectors.filterConnector')}</label>
            <select
              value={connectorFilter}
              onChange={e => setConnectorFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('connectors.allCategories')}</option>
              {connectedNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <Button size="sm" variant="secondary" className="ml-auto">
            <Download className="h-4 w-4 mr-1.5" />
            {t('connectors.exportLogs')}
          </Button>
        </div>
      </Card>

      {/* Log table */}
      <Card>
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">{t('connectors.logConnector')}</th>
                  <th className="px-4 py-3 text-left">{t('connectors.logTimestamp')}</th>
                  <th className="px-4 py-3 text-center">{t('connectors.logStatus')}</th>
                  <th className="px-4 py-3 text-right">{t('connectors.logRows')}</th>
                  <th className="px-4 py-3 text-right">{t('connectors.logDuration')}</th>
                  <th className="px-4 py-3 text-left">{t('connectors.logMessage')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{log.connector}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{log.timestamp}</td>
                    <td className="px-4 py-3 text-center"><LogChip status={log.status} /></td>
                    <td className="px-4 py-3 text-right text-gray-700">{log.records > 0 ? log.records.toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">{log.duration}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('connectors.noLogs')}</p>
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Tab: Configuration ────────────────────────────────────────────────────────

function ConfigurationTab({ t }: { t: (k: string) => string }) {
  const [selectedId, setSelectedId] = useState<string>('sap-s4')
  const [frequency, setFrequency] = useState<SyncFrequency>('daily')
  const [mappings, setMappings] = useState<Record<string, boolean>>({
    mappingEmissions: true,
    mappingEnergy: true,
    mappingWorkforce: false,
    mappingFinance: false,
    mappingWaste: false,
    mappingSocial: false,
  })

  const selected = CONNECTORS.find(c => c.id === selectedId)

  const toggleMapping = (key: string) =>
    setMappings(prev => ({ ...prev, [key]: !prev[key] }))

  const freqOptions: { value: SyncFrequency; key: string }[] = [
    { value: 'realtime', key: 'connectors.freqRealtime' },
    { value: 'hourly', key: 'connectors.freqHourly' },
    { value: 'daily', key: 'connectors.freqDaily' },
    { value: 'weekly', key: 'connectors.freqWeekly' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: connector list */}
      <Card className="lg:col-span-1">
        <h3 className="font-semibold text-gray-800 mb-3 text-xs uppercase tracking-wide text-gray-500">
          {t('connectors.tabConnectors')}
        </h3>
        <div className="space-y-0.5">
          {CONNECTORS.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                selectedId === c.id
                  ? 'bg-blue-50 text-blue-800'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  c.status === 'connected'
                    ? 'bg-green-500'
                    : c.status === 'error'
                    ? 'bg-red-500'
                    : 'bg-blue-400'
                }`}
              />
              <span className="flex-1 text-sm font-medium truncate">{c.name}</span>
              {selectedId === c.id && <ChevronRight className="h-4 w-4 text-blue-500 flex-shrink-0" />}
            </button>
          ))}
        </div>
      </Card>

      {/* Right: config form */}
      <Card className="lg:col-span-2">
        {selected ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: selected.color }}
                >
                  {selected.name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{selected.name}</h3>
                  <div className="mt-0.5">
                    <StatusChip status={selected.status} t={t} />
                  </div>
                </div>
              </div>
              <Button size="sm" variant="secondary">
                <Wifi className="h-4 w-4 mr-1.5" />
                {t('connectors.testConnection')}
              </Button>
            </div>

            {/* Auth section */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {t('connectors.authTitle')}
              </h4>

              {selected.authType === 'oauth2' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">{t('connectors.clientId')}</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="client_id_xxx"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">{t('connectors.clientSecret')}</label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">{t('connectors.tokenUrl')}</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="https://auth.example.com/token"
                    />
                  </div>
                  <Button size="sm" variant="secondary">
                    {t('connectors.authorizeOAuth')}
                  </Button>
                </div>
              )}

              {selected.authType === 'apikey' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">{t('connectors.apiKey')}</label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="sk-••••••••••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">{t('connectors.baseUrl')}</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="https://api.example.com/v1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">{t('connectors.orgId')}</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="org_xxxxx"
                    />
                  </div>
                </div>
              )}

              {selected.authType === 'certificate' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">{t('connectors.certFile')}</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
                      <Database className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{t('connectors.uploadCert')}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">{t('connectors.certPassword')}</label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sync frequency */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {t('connectors.syncFrequency')}
              </h4>
              <div className="flex flex-wrap gap-4">
                {freqOptions.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="syncFreq"
                      value={opt.value}
                      checked={frequency === opt.value}
                      onChange={() => setFrequency(opt.value)}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{t(opt.key)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Data mapping */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {t('connectors.dataMapping')}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {DATA_MAPPING_KEYS.map(key => (
                  <label key={key} className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                    <input
                      type="checkbox"
                      checked={mappings[key] ?? false}
                      onChange={() => toggleMapping(key)}
                      className="rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{t(`connectors.${key}`)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Save */}
            <button className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors">
              {t('connectors.saveConfig')}
            </button>
          </div>
        ) : (
          <div className="text-center py-16">
            <Settings className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('connectors.configSelectPrompt')}</p>
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'connectors' | 'monitoring' | 'configuration'

interface TabConfig {
  id: Tab
  labelKey: string
  Icon: React.ElementType
}

export default function Connectors() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('overview')

  const tabs: TabConfig[] = [
    { id: 'overview', labelKey: 'connectors.tabOverview', Icon: BarChart3 },
    { id: 'connectors', labelKey: 'connectors.tabConnectors', Icon: Plug },
    { id: 'monitoring', labelKey: 'connectors.tabMonitoring', Icon: Activity },
    { id: 'configuration', labelKey: 'connectors.tabConfiguration', Icon: Settings },
  ]

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-8 text-white shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15 mb-3">
          <Plug className="h-3.5 w-3.5" />
          {t('connectors.badge')}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t('connectors.title')}</h1>
        <p className="mt-2 text-white/70 max-w-2xl text-sm">{t('connectors.subtitle')}</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit flex-wrap">
        {tabs.map(tb => {
          const Icon = tb.Icon
          return (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === tb.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(tb.labelKey)}
            </button>
          )
        })}
      </div>

      {/* Active tab content */}
      {tab === 'overview' && <OverviewTab t={t} />}
      {tab === 'connectors' && <ConnectorsTab t={t} />}
      {tab === 'monitoring' && <MonitoringTab t={t} />}
      {tab === 'configuration' && <ConfigurationTab t={t} />}
    </div>
  )
}
