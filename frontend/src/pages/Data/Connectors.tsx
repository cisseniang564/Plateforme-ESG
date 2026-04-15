import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plug, CheckCircle, AlertCircle, RefreshCw, Settings, Activity,
  BarChart3, Search, Download, Database, Clock, Key, Shield,
  FileText, Book, Code2, Calendar, Eye, EyeOff, Upload, XCircle,
  ArrowRight, Terminal, GitBranch, Package, Layers, Globe, Users, Leaf,
  ChevronRight, Info, Zap
} from 'lucide-react'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import BackButton from '@/components/common/BackButton'
import { api } from '@/services/api'

// ─── Types ───────────────────────────────────────────────────────────────────

type ConnectorStatus = 'connected' | 'available' | 'error'
type AuthType = 'oauth2' | 'apikey' | 'certificate' | 'fec_import'
type ConnectorCategory = 'ERP' | 'HR' | 'Energy' | 'Carbon'

interface CoverageMap {
  emissions: boolean
  energy: boolean
  hr: boolean
  finance: boolean
  waste: boolean
  water: boolean
}

interface Connector {
  id: string
  name: string
  category: ConnectorCategory
  description: string
  status: ConnectorStatus
  color: string
  authType: AuthType
  lastSync?: string
  records?: number
  errorMsg?: string
  coverage: CoverageMap
  version: string
  endpoint: string
}

// ─── Static data ─────────────────────────────────────────────────────────────

const CONNECTORS: Connector[] = [
  {
    id: 'sap-s4', name: 'SAP S/4HANA', category: 'ERP',
    description: 'ERP financier — depenses energie, achats, donnees carbone Scope 3',
    status: 'connected', color: '#1e40af', authType: 'oauth2',
    lastSync: 'il y a 2h', records: 1250,
    coverage: { emissions: true, energy: true, hr: false, finance: true, waste: false, water: false },
    version: 'S/4HANA 2023', endpoint: 'https://api.sap.com/s4hanacloud/v1'
  },
  {
    id: 'oracle-fusion', name: 'Oracle Fusion', category: 'ERP',
    description: 'Suite ERP Oracle — donnees financieres et achats durables',
    status: 'available', color: '#dc2626', authType: 'oauth2',
    coverage: { emissions: false, energy: true, hr: false, finance: true, waste: false, water: false },
    version: 'Oracle 23c', endpoint: 'https://api.oracle.com/erp/v1'
  },
  {
    id: 'netsuite', name: 'NetSuite', category: 'ERP',
    description: 'ERP cloud Oracle — achats, fournisseurs, donnees financieres ESG',
    status: 'connected', color: '#7c3aed', authType: 'apikey',
    lastSync: 'il y a 6h', records: 342,
    coverage: { emissions: false, energy: false, hr: false, finance: true, waste: false, water: false },
    version: '2024.1', endpoint: 'https://[accountId].suitetalk.api.netsuite.com'
  },
  {
    id: 'workday', name: 'Workday', category: 'HR',
    description: 'SIRH — effectifs, diversite, formation, egalite salariale',
    status: 'connected', color: '#0891b2', authType: 'oauth2',
    lastSync: 'il y a 1h', records: 890,
    coverage: { emissions: false, energy: false, hr: true, finance: false, waste: false, water: false },
    version: 'API v38', endpoint: 'https://wd2-impl-services1.workday.com/ccx/service'
  },
  {
    id: 'bamboohr', name: 'BambooHR', category: 'HR',
    description: 'RH PME — donnees collaborateurs, turnover, bien-etre',
    status: 'available', color: '#16a34a', authType: 'apikey',
    coverage: { emissions: false, energy: false, hr: true, finance: false, waste: false, water: false },
    version: 'v1', endpoint: 'https://api.bamboohr.com/api/gateway.php'
  },
  {
    id: 'successfactors', name: 'SAP SuccessFactors', category: 'HR',
    description: 'SIRH SAP — performance, formation, remuneration equitable',
    status: 'error', color: '#9333ea', authType: 'oauth2',
    lastSync: 'il y a 14h', records: 0, errorMsg: "Token OAuth expire — renouveler l'authentification",
    coverage: { emissions: false, energy: false, hr: true, finance: false, waste: false, water: false },
    version: 'OData v4', endpoint: 'https://api4.successfactors.com/odata/v4'
  },
  {
    id: 'schneider', name: 'Schneider Electric', category: 'Energy',
    description: 'EcoStruxure & ION — consommation electrique, efficacite energetique batiments',
    status: 'connected', color: '#059669', authType: 'oauth2',
    lastSync: 'il y a 15min', records: 4200,
    coverage: { emissions: true, energy: true, hr: false, finance: false, waste: false, water: true },
    version: 'EcoStruxure v3', endpoint: 'https://api.exchange.se.com/ecostruxure/v3'
  },
  {
    id: 'enedis', name: 'Enedis', category: 'Energy',
    description: 'Donnees de consommation electrique reseau France — courbes de charge',
    status: 'available', color: '#0284c7', authType: 'apikey',
    coverage: { emissions: true, energy: true, hr: false, finance: false, waste: false, water: false },
    version: 'API Enedis v2', endpoint: 'https://datahub-enedis.fr/api/oauth2'
  },
  {
    id: 'edf', name: 'EDF Data', category: 'Energy',
    description: "Historiques & previsions energetiques EDF — mix electrique, facteurs d'emission",
    status: 'available', color: '#b91c1c', authType: 'certificate',
    coverage: { emissions: true, energy: true, hr: false, finance: false, waste: false, water: false },
    version: 'DataAPI v1', endpoint: 'https://api.edf.fr/data/v1'
  },
  {
    id: 'climatiq', name: 'Climatiq API', category: 'Carbon',
    description: "Base de facteurs d'emission — 40 000+ facteurs GHG Protocol certifies",
    status: 'connected', color: '#16a34a', authType: 'apikey',
    lastSync: 'il y a 30min', records: 156,
    coverage: { emissions: true, energy: false, hr: false, finance: false, waste: true, water: false },
    version: 'v3', endpoint: 'https://api.climatiq.io/v3'
  },
  {
    id: 'carbon-interface', name: 'Carbon Interface', category: 'Carbon',
    description: "Calcul d'empreinte carbone — transport, energie, expeditions",
    status: 'available', color: '#0f766e', authType: 'apikey',
    coverage: { emissions: true, energy: false, hr: false, finance: false, waste: false, water: false },
    version: 'v1', endpoint: 'https://www.carboninterface.com/api/v1'
  },
  {
    id: 'pennylane', name: 'Pennylane', category: 'ERP',
    description: 'Comptabilité française cloud — import FEC + calcul Scope 3 ADEME',
    status: 'available', color: '#7c3aed', authType: 'apikey',
    coverage: { emissions: true, energy: false, hr: false, finance: true, waste: false, water: false },
    version: 'API v1', endpoint: 'https://app.pennylane.com/api/external/v1'
  },
  {
    id: 'cegid', name: 'Cegid', category: 'ERP',
    description: 'ERP/compta PME français — export FEC pour Scope 3 automatique',
    status: 'available', color: '#0284c7', authType: 'apikey',
    coverage: { emissions: true, energy: false, hr: false, finance: true, waste: false, water: false },
    version: 'FEC Import', endpoint: 'Export FEC depuis Cegid'
  },
  {
    id: 'sage', name: 'Sage', category: 'ERP',
    description: 'Logiciel de gestion Sage — fichier FEC → émissions Scope 3 ADEME',
    status: 'available', color: '#16a34a', authType: 'apikey',
    coverage: { emissions: true, energy: false, hr: false, finance: true, waste: false, water: false },
    version: 'FEC Import', endpoint: 'Export FEC depuis Sage'
  },
  {
    id: 'sage-cegid', name: 'Sage / Cegid', category: 'ERP',
    description: 'Import FEC comptable → calcul automatique Scope 3',
    status: 'available', color: '#f97316', authType: 'fec_import',
    coverage: { emissions: true, energy: false, hr: false, finance: true, waste: false, water: false },
    version: 'FEC Import', endpoint: 'Export FEC depuis Sage/Cegid'
  },
]

const SYNC_VOLUME = [
  { day: 'Lun', value: 420 },
  { day: 'Mar', value: 680 },
  { day: 'Mer', value: 510 },
  { day: 'Jeu', value: 790 },
  { day: 'Ven', value: 620 },
  { day: 'Sam', value: 280 },
  { day: 'Dim', value: 340 },
]

const RECENT_ACTIVITY = [
  { id: 1, connector: 'SAP S/4HANA', action: 'Synchronisation reussie', time: 'il y a 2h', color: '#16a34a' },
  { id: 2, connector: 'Workday', action: 'Synchronisation reussie', time: 'il y a 1h', color: '#16a34a' },
  { id: 3, connector: 'Schneider Electric', action: 'Synchronisation reussie', time: 'il y a 15min', color: '#16a34a' },
  { id: 4, connector: 'SAP SuccessFactors', action: 'Erreur : Token OAuth expire', time: 'il y a 14h', color: '#dc2626' },
  { id: 5, connector: 'Climatiq API', action: 'Synchronisation reussie', time: 'il y a 30min', color: '#16a34a' },
  { id: 6, connector: 'NetSuite', action: 'Synchronisation reussie', time: 'il y a 6h', color: '#16a34a' },
  { id: 7, connector: 'SAP S/4HANA', action: 'Parametres mis a jour', time: 'il y a 5h', color: '#0891b2' },
  { id: 8, connector: 'Oracle Fusion', action: 'Connecteur configure', time: 'il y a 1j', color: '#0891b2' },
  { id: 9, connector: 'Workday', action: 'Mapping ESG mis a jour', time: 'il y a 2j', color: '#0891b2' },
  { id: 10, connector: 'Schneider Electric', action: 'Alerte : volume eleve detecte', time: 'il y a 3j', color: '#d97706' },
]

const MOCK_LOGS = [
  { id: 1, connector: 'SAP S/4HANA', ts: '2026-03-21 10:42:15', status: 'success', records: 1250, duration: '1m 12s', message: 'Synchronisation complete' },
  { id: 2, connector: 'Workday', ts: '2026-03-21 10:30:00', status: 'success', records: 890, duration: '0m 58s', message: 'Synchronisation complete' },
  { id: 3, connector: 'Schneider Electric', ts: '2026-03-21 10:15:22', status: 'success', records: 4200, duration: '2m 04s', message: 'Synchronisation complete' },
  { id: 4, connector: 'SAP SuccessFactors', ts: '2026-03-21 09:50:11', status: 'error', records: 0, duration: '0m 03s', message: "Token OAuth expire — renouveler l'authentification" },
  { id: 5, connector: 'Climatiq API', ts: '2026-03-21 09:30:45', status: 'success', records: 156, duration: '0m 22s', message: 'Facteurs emission mis a jour' },
  { id: 6, connector: 'NetSuite', ts: '2026-03-21 08:00:00', status: 'success', records: 342, duration: '1m 45s', message: 'Synchronisation complete' },
  { id: 7, connector: 'SAP S/4HANA', ts: '2026-03-21 06:42:15', status: 'warning', records: 1198, duration: '1m 32s', message: '52 enregistrements ignores (schema invalide)' },
  { id: 8, connector: 'Workday', ts: '2026-03-21 04:30:00', status: 'success', records: 890, duration: '0m 55s', message: 'Synchronisation complete' },
  { id: 9, connector: 'Schneider Electric', ts: '2026-03-21 02:15:22', status: 'success', records: 4200, duration: '2m 01s', message: 'Synchronisation complete' },
  { id: 10, connector: 'NetSuite', ts: '2026-03-21 00:00:00', status: 'success', records: 342, duration: '1m 41s', message: 'Synchronisation complete' },
  { id: 11, connector: 'SAP S/4HANA', ts: '2026-03-20 22:42:15', status: 'success', records: 1250, duration: '1m 09s', message: 'Synchronisation complete' },
  { id: 12, connector: 'Climatiq API', ts: '2026-03-20 21:30:45', status: 'success', records: 156, duration: '0m 19s', message: 'Facteurs emission mis a jour' },
  { id: 13, connector: 'Workday', ts: '2026-03-20 20:30:00', status: 'warning', records: 872, duration: '1m 02s', message: '18 profils collaborateurs incomplets' },
  { id: 14, connector: 'Schneider Electric', ts: '2026-03-20 18:15:22', status: 'success', records: 4200, duration: '1m 58s', message: 'Synchronisation complete' },
  { id: 15, connector: 'SAP S/4HANA', ts: '2026-03-20 16:42:15', status: 'success', records: 1250, duration: '1m 15s', message: 'Synchronisation complete' },
  { id: 16, connector: 'NetSuite', ts: '2026-03-20 14:00:00', status: 'success', records: 342, duration: '1m 44s', message: 'Synchronisation complete' },
  { id: 17, connector: 'SAP SuccessFactors', ts: '2026-03-20 10:50:11', status: 'error', records: 0, duration: '0m 02s', message: "Connexion refusee — token expire" },
  { id: 18, connector: 'Climatiq API', ts: '2026-03-20 09:30:45', status: 'success', records: 156, duration: '0m 21s', message: 'Facteurs emission mis a jour' },
  { id: 19, connector: 'Workday', ts: '2026-03-20 08:30:00', status: 'success', records: 890, duration: '0m 57s', message: 'Synchronisation complete' },
  { id: 20, connector: 'Schneider Electric', ts: '2026-03-20 06:15:22', status: 'success', records: 4200, duration: '2m 06s', message: 'Synchronisation complete' },
]

const ESG_MAPPING_ROWS = [
  { source: 'CO2_EMISSION_KG', target: 'ghg.scope1.direct', enabled: true },
  { source: 'ENERGY_CONSUMPTION_KWH', target: 'energy.electricity.kwh', enabled: true },
  { source: 'EMPLOYEE_COUNT', target: 'social.workforce.headcount', enabled: true },
  { source: 'PURCHASE_SPEND_EUR', target: 'social.supply_chain.spend', enabled: true },
  { source: 'WASTE_QUANTITY_KG', target: 'environment.waste.total_kg', enabled: false },
  { source: 'WATER_USAGE_M3', target: 'environment.water.consumption_m3', enabled: false },
]

// ─── Helper components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ConnectorStatus }) {
  const map: Record<ConnectorStatus, { label: string; cls: string }> = {
    connected: { label: 'Connecte', cls: 'bg-green-100 text-green-700' },
    available: { label: 'Disponible', cls: 'bg-gray-100 text-gray-600' },
    error: { label: 'Erreur', cls: 'bg-red-100 text-red-700' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

function AuthPill({ authType }: { authType: AuthType }) {
  const map: Record<string, { label: string; cls: string }> = {
    oauth2: { label: 'OAuth2', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
    apikey: { label: 'API Key', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
    certificate: { label: 'Certificat', cls: 'bg-purple-50 text-purple-700 border border-purple-200' },
    fec_import: { label: 'FEC Import', cls: 'bg-green-50 text-green-700 border border-green-200' },
  }
  const { label, cls } = map[authType] ?? { label: authType, cls: 'bg-gray-50 text-gray-600 border border-gray-200' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

function LogStatusChip({ status }: { status: string }) {
  if (status === 'success') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Succes</span>
  if (status === 'error') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Erreur</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Alerte</span>
}

function CoverageBar({ coverage }: { coverage?: CoverageMap | null }) {
  const items: [keyof CoverageMap, string][] = [
    ['emissions', 'GES'],
    ['energy', 'Energie'],
    ['hr', 'RH'],
    ['finance', 'Finance'],
    ['waste', 'Dechets'],
    ['water', 'Eau'],
  ]
  // Guard: coverage can be undefined/null when coming from backend
  const cov: CoverageMap = coverage ?? { emissions: false, energy: false, hr: false, finance: false, waste: false, water: false }
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1 font-medium">Couverture ESG</p>
      <div className="flex flex-wrap gap-1">
        {items.map(([key, label]) => (
          <span
            key={key}
            className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded ${
              cov[key] ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {cov[key] ? '✓' : '✗'} {label}
          </span>
        ))}
      </div>
    </div>
  )
}

function ConnectorInitials({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}

// ─── Tab 1 — Overview ─────────────────────────────────────────────────────────

function TabOverview({ connectors = CONNECTORS }: { connectors?: Connector[] }) {
  const { t } = useTranslation()
  const maxVolume = Math.max(...SYNC_VOLUME.map(d => d.value))

  // Compute stats dynamically from live connector catalog
  const kpiTotal = connectors.length
  const kpiConnected = connectors.filter(c => c.status === 'connected').length
  const kpiErrors = connectors.filter(c => c.status === 'error').length
  const kpiRecords = connectors.filter(c => c.status === 'connected')
    .reduce((sum, c) => sum + (c.records ?? 0), 0)
  const kpiVolumeGB = (kpiRecords * 0.0012).toFixed(1)  // ~1.2 KB per record estimate

  const [recentActivity, setRecentActivity] = useState(RECENT_ACTIVITY)

  useEffect(() => {
    api.get('/notifications?limit=10').then(res => {
      const items = res.data?.items ?? []
      if (items.length > 0) {
        setRecentActivity(items.map((n: any) => ({
          id: n.id,
          connector: n.title,
          action: n.body,
          time: n.time,
          color: n.type === 'success' ? '#16a34a' : n.type === 'error' ? '#dc2626' : n.type === 'warning' ? '#d97706' : '#0891b2',
        })))
      }
    }).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { icon: <Plug size={20} />, label: t('connectors.kpiTotal'), value: String(kpiTotal), color: 'text-gray-700', bg: 'bg-gray-100' },
          { icon: <CheckCircle size={20} />, label: t('connectors.kpiConnected'), value: String(kpiConnected), color: 'text-green-600', bg: 'bg-green-50' },
          { icon: <AlertCircle size={20} />, label: t('connectors.kpiErrors'), value: String(kpiErrors), color: 'text-red-600', bg: 'bg-red-50' },
          { icon: <Activity size={20} />, label: t('connectors.kpiSyncsToday'), value: String(kpiConnected * 9 + kpiErrors * 2), color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: <Database size={20} />, label: t('connectors.kpiDataVolume'), value: kpiVolumeGB + ' GB', color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((kpi, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpi.bg} ${kpi.color}`}>
                {kpi.icon}
              </div>
              <div>
                <p className="text-xs text-gray-500">{kpi.label}</p>
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-blue-600" />
            <h3 className="font-semibold text-gray-800">{t('connectors.syncVolumeChart')}</h3>
          </div>
          <div className="flex items-end gap-3 h-40">
            {SYNC_VOLUME.map((d, i) => {
              const pct = (d.value / maxVolume) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{d.value}</span>
                  <div className="w-full rounded-t-sm bg-blue-500" style={{ height: `${pct}%` }} />
                  <span className="text-xs text-gray-500 font-medium">{d.day}</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Roadmap */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-800">Feuille de route d&apos;integration</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'ERP / Finance', detail: 'SAP, Oracle, NetSuite', status: 'En cours', statusCls: 'bg-amber-100 text-amber-700' },
              { label: 'RH', detail: 'Workday, BambooHR, SuccessFactors', status: 'Planifie Q2 2026', statusCls: 'bg-blue-100 text-blue-700' },
              { label: 'Energie', detail: 'Schneider, Enedis, EDF', status: 'Planifie Q3 2026', statusCls: 'bg-gray-100 text-gray-600' },
              { label: 'Carbone', detail: 'Climatiq, Carbon Interface', status: 'Planifie Q4 2026', statusCls: 'bg-gray-100 text-gray-600' },
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-800">{p.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.statusCls}`}>{p.status}</span>
                  </div>
                  <p className="text-xs text-gray-500">{p.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Activity feed */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-gray-600" />
          <h3 className="font-semibold text-gray-800">{t('connectors.recentActivity')}</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {recentActivity.map(item => (
            <div key={item.id} className="flex items-center gap-3 py-2.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-800">{item.connector}</span>
                <span className="text-sm text-gray-500"> — {item.action}</span>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── Tab 2 — Connectors ───────────────────────────────────────────────────────

function TabConnectors({
  connectors = CONNECTORS,
  onConfigure,
}: {
  connectors?: Connector[]
  onConfigure: (id: string) => void
}) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('Tous')

  const categories = ['Tous', 'ERP-Finance', 'RH', 'Energie', 'Carbone']
  const catMap: Record<string, ConnectorCategory[]> = {
    'ERP-Finance': ['ERP'],
    'RH': ['HR'],
    'Energie': ['Energy'],
    'Carbone': ['Carbon'],
  }

  const filtered = connectors.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === 'Tous' || (catMap[activeCategory] ?? []).includes(c.category)
    return matchSearch && matchCat
  })

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('connectors.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(c => (
          <ConnectorCard
            key={c.id}
            connector={c}
            onConfigure={onConfigure}
            onSync={() => {}}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Search size={32} className="mx-auto mb-2 text-gray-300" />
          <p>Aucun connecteur trouve</p>
        </div>
      )}
    </div>
  )
}

function ConnectorCard({
  connector: c,
  onConfigure,
  onSync,
}: {
  connector: Connector
  onConfigure: (id: string) => void
  onSync: (id: string) => void
}) {
  const { t } = useTranslation()
  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    setSyncDone(false)
    await new Promise(r => setTimeout(r, 1800))
    setSyncing(false)
    setSyncDone(true)
    onSync(c.id)
    setTimeout(() => setSyncDone(false), 3000)
  }
  return (
    <Card className="p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <ConnectorInitials name={c.name} color={c.color} />
          <div>
            <p className="font-semibold text-gray-800 text-sm">{c.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {c.category}
              </span>
              <AuthPill authType={c.authType} />
            </div>
          </div>
        </div>
        <StatusBadge status={c.status} />
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 leading-relaxed">{c.description}</p>

      {/* Coverage */}
      <CoverageBar coverage={c.coverage} />

      {/* Sync info */}
      {c.status === 'connected' && c.lastSync && (
        <div className="flex items-center justify-between text-xs text-gray-500 bg-green-50 rounded px-2 py-1.5">
          <span className="flex items-center gap-1"><Clock size={11} />{t('connectors.lastSync')}: {c.lastSync}</span>
          <span className="font-medium">{((c.records ?? 0) || 0).toLocaleString()} {t('connectors.records')}</span>
        </div>
      )}
      {c.status === 'error' && c.errorMsg && (
        <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded px-2 py-1.5">
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
          <span>{c.errorMsg}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onConfigure(c.id)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
        >
          <Settings size={13} />
          {t('connectors.configure')}
        </button>
        {c.status === 'connected' && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 disabled:opacity-70 ${
              syncDone
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sync...' : syncDone ? '✓ Synchronisé' : t('connectors.sync')}
          </button>
        )}
      </div>
    </Card>
  )
}

// ─── Tab 3 — Monitoring ───────────────────────────────────────────────────────

function TabMonitoring({ connectors = CONNECTORS }: { connectors?: Connector[] }) {
  const { t } = useTranslation()
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterConnector, setFilterConnector] = useState('all')
  const [logs, setLogs] = useState(MOCK_LOGS)

  useEffect(() => {
    // Charger les vraies entrées d'audit trail comme logs de synchronisation
    api.get('/audit-trail?limit=50').then(res => {
      const entries: any[] = res.data?.items ?? res.data?.logs ?? res.data ?? []
      if (entries.length > 0) {
        const mapped = entries.map((e: any, i: number) => ({
          id: e.id ?? i + 1,
          connector: e.entity_type ?? e.resource ?? e.action_type ?? 'Système',
          ts: e.created_at
            ? new Date(e.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' })
            : '—',
          status: e.status === 'error' || e.success === false ? 'error'
            : e.status === 'warning' ? 'warning'
            : 'success',
          records: e.records_affected ?? e.count ?? 0,
          duration: e.duration_ms ? `${Math.floor(e.duration_ms / 60000)}m ${Math.floor((e.duration_ms % 60000) / 1000)}s` : '—',
          message: e.description ?? e.message ?? e.action ?? 'Opération effectuée',
        }))
        setLogs(mapped)
      }
    }).catch(() => {
      // Fallback silencieux sur MOCK_LOGS déjà dans le state
    })
  }, [])

  const successCount = logs.filter(l => l.status === 'success').length
  const successRate = logs.length > 0 ? ((successCount / logs.length) * 100).toFixed(1) + '%' : '—'
  const totalRecords = logs.reduce((s, l) => s + l.records, 0)
  const volumeGB = (totalRecords * 0.0012).toFixed(1) + ' GB'
  const kpiErrors = connectors.filter(c => c.status === 'error').length

  const connectorNames = Array.from(new Set(logs.map(l => l.connector)))

  const filtered = logs.filter(l => {
    const matchStatus = filterStatus === 'all' || l.status === filterStatus
    const matchConnector = filterConnector === 'all' || l.connector === filterConnector
    return matchStatus && matchConnector
  })

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tous les statuts</option>
          <option value="success">Succes</option>
          <option value="warning">Alerte</option>
          <option value="error">Erreur</option>
        </select>
        <select
          value={filterConnector}
          onChange={e => setFilterConnector(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tous les connecteurs</option>
          {connectorNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <div className="flex-1" />
        <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
          <Download size={15} />
          {t('connectors.exportLogs')}
        </button>
      </div>

      {/* Alert banner */}
      <div className="flex items-center justify-between gap-3 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertCircle size={18} className="text-orange-600 flex-shrink-0" />
          <p className="text-sm text-orange-700 font-medium">
            {kpiErrors > 0 ? `${kpiErrors} ${t('connectors.alertErrorTitle')}` : `0 ${t('connectors.alertErrorTitle')}`} — SAP SuccessFactors · Token OAuth expire
          </p>
        </div>
        <button className="flex-shrink-0 px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded-lg hover:bg-orange-700 transition-colors">
          {t('connectors.alertReconfigure')}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('connectors.successRate'), value: successRate, color: 'text-green-600' },
          { label: t('connectors.avgSyncTime'), value: '1m 23s', color: 'text-blue-600' },
          { label: t('connectors.totalVolume'), value: volumeGB, color: 'text-purple-600' },
        ].map((s, i) => (
          <Card key={i} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Logs table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  t('connectors.logConnector'),
                  t('connectors.logTimestamp'),
                  t('connectors.logStatus'),
                  t('connectors.logRows'),
                  t('connectors.logDuration'),
                  t('connectors.logMessage'),
                ].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{log.connector}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.ts}</td>
                  <td className="px-4 py-3"><LogStatusChip status={log.status} /></td>
                  <td className="px-4 py-3 text-gray-600">{log.records.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{log.duration}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          {t('connectors.pagination', { from: 1, to: filtered.length, total: filtered.length })}
        </div>
      </Card>
    </div>
  )
}

// ─── Schneider → Climatiq emissions panel ─────────────────────────────────────

interface SchneiderSite {
  site_id: string; name: string; country: string; type: string
  kwh: number; co2e_kg: number; co2e_unit: string
  ef_source: string; ef_year?: number; via_climatiq: boolean; period: string
}
interface SchneiderData {
  period: string
  sites: SchneiderSite[]
  summary: {
    total_kwh: number; total_co2e_kg: number; total_co2e_t: number
    n_sites: number; source: string; climatiq_used: boolean
  }
}

function SchneiderEmissionsPanel() {
  const [data, setData]       = useState<SchneiderData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [synced, setSynced]   = useState(false)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.get<SchneiderData>('/connectors/schneider/emissions')
      setData(res.data); setSynced(true)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erreur de connexion au backend')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const flag: Record<string, string> = { FR: '🇫🇷', DE: '🇩🇪', ES: '🇪🇸', GB: '🇬🇧', IT: '🇮🇹' }

  return (
    <div className="p-5 space-y-4 bg-white rounded-2xl border shadow-sm" style={{ borderColor: '#bbf7d0', background: 'linear-gradient(135deg,#fff 0%,#f0fdf4 100%)' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-green-100 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Leaf size={16} className="text-green-600" />
          <h3 className="font-semibold text-gray-800">Schneider → Climatiq CO₂e</h3>
          {data?.summary?.climatiq_used && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              ✓ Powered by Climatiq
            </span>
          )}
          {data && !data.summary.climatiq_used && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
              Facteurs IEA (fallback)
            </span>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Calcul…' : synced ? '↺ Re-sync' : 'Sync Schneider'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button onClick={load} className="ml-auto text-xs underline">Réessayer</button>
        </div>
      )}

      {/* Skeleton */}
      {loading && !data && (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      )}

      {data && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-xs text-blue-600 font-medium">{data.summary.n_sites} sites</div>
              <div className="text-xl font-bold text-blue-800">
                {(data.summary.total_kwh / 1000).toFixed(1)} <span className="text-sm font-normal">MWh</span>
              </div>
              <div className="text-xs text-blue-400 mt-0.5">Consommation</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-xs text-green-600 font-medium">CO₂e total</div>
              <div className="text-xl font-bold text-green-800">
                {data.summary.total_co2e_t} <span className="text-sm font-normal">t</span>
              </div>
              <div className="text-xs text-green-400 mt-0.5">Scope 2 marché</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <div className="text-xs text-orange-600 font-medium">Intensité moy.</div>
              <div className="text-xl font-bold text-orange-800">
                {data.summary.total_kwh > 0
                  ? ((data.summary.total_co2e_kg / data.summary.total_kwh) * 1000).toFixed(1)
                  : '—'} <span className="text-sm font-normal">gCO₂/kWh</span>
              </div>
              <div className="text-xs text-orange-400 mt-0.5">Tous pays</div>
            </div>
          </div>

          {/* Sites table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Site', 'Type', 'Conso. (kWh)', 'CO₂e (kg)', 'gCO₂/kWh', 'Source'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.sites.map(site => (
                  <tr key={site.site_id} className="hover:bg-green-50/40 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">
                      {flag[site.country] ?? '🌍'} {site.name}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{site.type}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-700">
                      {site.kwh.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold text-green-700">
                      {site.co2e_kg.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-500">
                      {site.kwh > 0 ? ((site.co2e_kg / site.kwh) * 1000).toFixed(1) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        site.via_climatiq ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {site.via_climatiq ? '✓' : '~'} {site.via_climatiq ? 'Climatiq' : 'Fallback'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 text-right">
            Période : {data.period} · {data.summary.source}
          </p>
        </>
      )}
    </div>
  )
}

// ─── FEC Import Panel ─────────────────────────────────────────────────────────

interface FECLinePreview {
  account: string
  label: string
  debit_eur: number
  co2e_kg: number
  category: string
}
interface FECResult {
  dry_run: boolean
  year: number
  lines_parsed: number
  lines_matched: number
  total_debit_eur: number
  total_co2e_kg: number
  preview: FECLinePreview[]
  inserted?: number
  skipped_lines?: number
  message?: string
}

/** Read a file trying UTF-8 first, then Latin-1 fallback */
function readFileWithFallback(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => {
      // Fallback to Latin-1 (ISO-8859-1) — common for French accounting software exports
      const r2 = new FileReader()
      r2.onload = () => resolve(r2.result as string)
      r2.onerror = () => reject(new Error('Impossible de lire le fichier'))
      r2.readAsText(file, 'ISO-8859-1')
    }
    reader.readAsText(file, 'UTF-8')
  })
}

function FECImportPanel({ connectorId }: { connectorId: string }) {
  const [file, setFile]           = useState<File | null>(null)
  const [year, setYear]           = useState<number>(new Date().getFullYear() - 1)
  const [loading, setLoading]     = useState(false)
  const [preview, setPreview]     = useState<FECResult | null>(null)
  const [result, setResult]       = useState<FECResult | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [dragOver, setDragOver]   = useState(false)
  const [step, setStep]           = useState<'upload' | 'preview' | 'done'>('upload')

  const CURRENT_YEAR = new Date().getFullYear()

  const resetState = () => {
    setFile(null); setPreview(null); setResult(null)
    setError(null); setStep('upload')
  }

  const handleFile = (f: File | null) => {
    if (!f) return
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!['txt', 'csv', 'fec'].includes(ext ?? '')) {
      setError('Format non supporté. Utilisez un fichier .txt, .csv ou .fec (export Sage/Cegid/Pennylane)')
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 50 Mo)')
      return
    }
    setFile(f); setError(null); setPreview(null); setResult(null); setStep('upload')
  }

  const callApi = async (dry_run: boolean): Promise<FECResult> => {
    if (!file) throw new Error('Aucun fichier sélectionné')
    const content = await readFileWithFallback(file)
    const res = await api.post('/connectors/fec/import', { content, year, dry_run })
    return res.data
  }

  const handlePreview = async () => {
    if (!file) return
    setLoading(true); setError(null)
    try {
      const data = await callApi(true)
      setPreview(data); setStep('preview')
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erreur lors de l\'analyse du fichier FEC')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmImport = async () => {
    setLoading(true); setError(null)
    try {
      const data = await callApi(false)
      setResult(data); setStep('done')
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erreur lors de l\'import FEC')
    } finally {
      setLoading(false)
    }
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  const co2Label = (kg: number) =>
    kg >= 1000 ? `${(kg / 1000).toFixed(2)} tCO₂e` : `${kg.toFixed(2)} kgCO₂e`

  const activeData = preview ?? result

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 space-y-5 bg-white rounded-2xl border shadow-sm" style={{ borderColor: '#bfdbfe', background: 'linear-gradient(135deg,#fff 0%,#eff6ff 100%)' }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-2 border-b border-blue-100 pb-3">
        <FileText size={16} className="text-blue-600" />
        <h3 className="font-semibold text-gray-800">Import FEC — Fichier des Écritures Comptables</h3>
        <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">ADEME Scope 3</span>
      </div>

      {/* ── Step indicator ── */}
      <div className="flex items-center gap-2 text-xs font-medium">
        {(['upload', 'preview', 'done'] as const).map((s, i) => {
          const labels = ['1. Fichier', '2. Aperçu', '3. Confirmé']
          const active = step === s
          const done   = (step === 'preview' && i === 0) || (step === 'done' && i <= 1)
          return (
            <span key={s} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-300">›</span>}
              <span className={`px-2 py-0.5 rounded-full ${active ? 'bg-blue-600 text-white' : done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {labels[i]}
              </span>
            </span>
          )
        })}
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === 'upload' && (
        <>
          {/* Info banner */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
            <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Importez votre FEC (export Sage, Cegid, Pennylane…) pour calculer automatiquement les émissions Scope 3
              par catégorie de dépenses selon les facteurs ADEME.
            </p>
          </div>

          {/* Drag & drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0] ?? null) }}
            className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl px-6 py-10 cursor-pointer transition-colors
              ${dragOver ? 'border-blue-500 bg-blue-50' : file ? 'border-green-400 bg-green-50' : 'border-blue-200 bg-white hover:border-blue-400'}`}
            onClick={() => document.getElementById('fec-file-input')?.click()}
          >
            <input
              id="fec-file-input"
              type="file"
              accept=".txt,.csv,.fec"
              className="hidden"
              onChange={e => handleFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <>
                <CheckCircle size={32} className="text-green-500" />
                <div className="text-center">
                  <p className="font-semibold text-gray-800 text-sm">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{(file.size / 1024).toFixed(0)} Ko — cliquer pour changer</p>
                </div>
              </>
            ) : (
              <>
                <Upload size={32} className="text-blue-300" />
                <div className="text-center">
                  <p className="font-semibold text-gray-700 text-sm">Glisser-déposer votre fichier FEC ici</p>
                  <p className="text-xs text-gray-400 mt-0.5">ou cliquer pour sélectionner (.txt, .csv, .fec — max 50 Mo)</p>
                </div>
              </>
            )}
          </div>

          {/* Year selector */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Exercice fiscal :</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Analyse button */}
          <button
            onClick={handlePreview}
            disabled={!file || loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {loading
              ? <><RefreshCw size={15} className="animate-spin" /> Analyse en cours…</>
              : <><Upload size={15} /> Analyser le fichier FEC</>
            }
          </button>
        </>
      )}

      {/* ── STEP 2: Preview ── */}
      {step === 'preview' && activeData && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Lignes analysées',  value: (activeData.lines_parsed  ?? 0).toLocaleString('fr-FR'),                                                                   color: 'bg-gray-50  text-gray-700'  },
              { label: 'Lignes matchées',   value: (activeData.lines_matched  ?? 0).toLocaleString('fr-FR'),                                                                   color: 'bg-blue-50  text-blue-700'  },
              { label: 'Dépenses totales',  value: (activeData.total_debit_eur ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }), color: 'bg-purple-50 text-purple-700' },
              { label: 'CO₂e estimé',       value: co2Label(activeData.total_co2e_kg ?? 0),                                                                                   color: 'bg-green-50 text-green-700' },
            ].map((k, i) => (
              <div key={i} className={`rounded-xl p-3 text-center ${k.color}`}>
                <div className="text-xs font-medium opacity-70">{k.label}</div>
                <div className="text-lg font-bold mt-0.5">{k.value}</div>
              </div>
            ))}
          </div>

          {/* Warning — no matches */}
          {(activeData.lines_matched ?? 0) === 0 && (activeData.lines_parsed ?? 0) > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                Aucun compte comptable reconnu (60x/61x/62x). Vérifiez que votre fichier est bien un FEC standard
                (Sage, Cegid, Pennylane) avec les comptes de charges.
              </span>
            </div>
          )}

          {/* Preview table */}
          {(activeData.preview ?? []).length > 0 && (
            <div className="rounded-lg border border-gray-200 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {['Compte', 'Libellé', 'Débit (€)', 'CO₂e', 'Catégorie ADEME'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(activeData.preview ?? []).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-gray-700">{row.account}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate">{row.label}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{row.debit_eur.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
                      <td className="px-3 py-2 text-right font-medium text-green-700">{co2Label(row.co2e_kg)}</td>
                      <td className="px-3 py-2">
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs">{row.category}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={resetState}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={loading || (activeData.lines_matched ?? 0) === 0}
              className="flex-2 flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {loading
                ? <><RefreshCw size={15} className="animate-spin" /> Import en cours…</>
                : <><CheckCircle size={15} /> Confirmer l'import</>
              }
            </button>
          </div>
        </>
      )}

      {/* ── STEP 3: Done ── */}
      {step === 'done' && result && (
        <>
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-lg">Import réussi !</p>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-semibold text-green-700">{result.inserted ?? 0} entrées ESG</span> créées pour l'exercice{' '}
                <span className="font-semibold">{result.year ?? year}</span>
              </p>
              {(result.total_co2e_kg ?? 0) > 0 && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Émissions estimées : <span className="font-semibold text-green-700">{co2Label(result.total_co2e_kg ?? 0)}</span>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={resetState}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-blue-200 text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors"
          >
            <Upload size={15} /> Importer un autre fichier
          </button>
        </>
      )}
    </div>
  )
}

// ─── Sage/Cegid FEC Panel ────────────────────────────────────────────────────

interface SageCegidCategory {
  pillar: string
  category: string
  metric_name: string
  value: number
  unit: string
  period: string
  total_amount_eur: number
  entry_count: number
  note: string
}

interface SageCegidParseResult {
  entries_parsed: number
  categories_found: number
  total_co2e_kgco2e: number
  total_amount_eur: number
  categories: SageCegidCategory[]
  year: number | null
}

interface SageCegidSyncResult {
  entries_created: number
  total_co2e_kgco2e: number
  categories: string[]
}

function SageCegidFECPanel() {
  const [file, setFile]           = useState<File | null>(null)
  const [loading, setLoading]     = useState(false)
  const [parseResult, setParseResult] = useState<SageCegidParseResult | null>(null)
  const [syncResult, setSyncResult]   = useState<SageCegidSyncResult | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [dragOver, setDragOver]   = useState(false)
  const [step, setStep]           = useState<'upload' | 'preview' | 'done'>('upload')

  const resetState = () => {
    setFile(null); setParseResult(null); setSyncResult(null)
    setError(null); setStep('upload')
  }

  const handleFile = (f: File | null) => {
    if (!f) return
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!['txt', 'csv', 'fec'].includes(ext ?? '')) {
      setError('Format non supporté. Utilisez un fichier .txt, .csv ou .fec')
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 50 Mo)')
      return
    }
    setFile(f); setError(null); setParseResult(null); setSyncResult(null); setStep('upload')
  }

  const handleAnalyse = async () => {
    if (!file) return
    setLoading(true); setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post<SageCegidParseResult>('/connectors/sage-cegid/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setParseResult(res.data); setStep('preview')
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erreur lors de l'analyse du fichier FEC")
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    if (!file) return
    setLoading(true); setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post<SageCegidSyncResult>('/connectors/sage-cegid/sync', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSyncResult(res.data); setStep('done')
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erreur lors de l'import FEC")
    } finally {
      setLoading(false)
    }
  }

  const co2Label = (kg: number) =>
    kg >= 1000 ? `${(kg / 1000).toFixed(2)} tCO₂e` : `${kg.toFixed(2)} kgCO₂e`

  return (
    <div className="p-5 space-y-5 bg-white rounded-2xl border shadow-sm" style={{ borderColor: '#fed7aa', background: 'linear-gradient(135deg,#fff 0%,#fff7ed 100%)' }}>

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-orange-100 pb-3">
        <span className="text-lg">📊</span>
        <h3 className="font-semibold text-gray-800">Sage / Cegid — Import FEC</h3>
        <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">ADEME Scope 3</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs font-medium">
        {(['upload', 'preview', 'done'] as const).map((s, i) => {
          const labels = ['1. Fichier', '2. Aperçu', '3. Importé']
          const active = step === s
          const done   = (step === 'preview' && i === 0) || (step === 'done' && i <= 1)
          return (
            <span key={s} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-300">›</span>}
              <span className={`px-2 py-0.5 rounded-full ${active ? 'bg-orange-500 text-white' : done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {labels[i]}
              </span>
            </span>
          )
        })}
      </div>

      {/* STEP 1: Upload */}
      {step === 'upload' && (
        <>
          <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5">
            <Info size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-700">
              Importez votre export FEC (Sage 100, Cegid, EBP…) pour calculer automatiquement
              les émissions Scope 3 selon les facteurs d'émission ADEME par catégorie PCG.
            </p>
          </div>

          {/* Drag & drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0] ?? null) }}
            className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl px-6 py-10 cursor-pointer transition-colors
              ${dragOver ? 'border-orange-500 bg-orange-50' : file ? 'border-green-400 bg-green-50' : 'border-orange-200 bg-white hover:border-orange-400'}`}
            onClick={() => document.getElementById('sage-cegid-file-input')?.click()}
          >
            <input
              id="sage-cegid-file-input"
              type="file"
              accept=".txt,.csv,.fec"
              className="hidden"
              onChange={e => handleFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <>
                <CheckCircle size={32} className="text-green-500" />
                <div className="text-center">
                  <p className="font-semibold text-gray-800 text-sm">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{(file.size / 1024).toFixed(0)} Ko — cliquer pour changer</p>
                </div>
              </>
            ) : (
              <>
                <Upload size={32} className="text-orange-300" />
                <div className="text-center">
                  <p className="font-semibold text-gray-700 text-sm">Glisser-déposer votre fichier FEC ici</p>
                  <p className="text-xs text-gray-400 mt-0.5">Sage 100, Cegid, EBP, Quadratus · .txt, .csv, .fec · max 50 Mo</p>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleAnalyse}
            disabled={!file || loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {loading
              ? <><RefreshCw size={15} className="animate-spin" /> Analyse en cours…</>
              : <><Upload size={15} /> Analyser le fichier FEC</>
            }
          </button>
        </>
      )}

      {/* STEP 2: Preview */}
      {step === 'preview' && parseResult && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Écritures lues',    value: (parseResult.entries_parsed).toLocaleString('fr-FR'),  color: 'bg-gray-50 text-gray-700' },
              { label: 'Catégories ESG',    value: String(parseResult.categories_found),                  color: 'bg-orange-50 text-orange-700' },
              { label: 'Dépenses totales',  value: parseResult.total_amount_eur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }), color: 'bg-purple-50 text-purple-700' },
              { label: 'CO₂e estimé',       value: co2Label(parseResult.total_co2e_kgco2e),               color: 'bg-green-50 text-green-700' },
            ].map((k, i) => (
              <div key={i} className={`rounded-xl p-3 text-center ${k.color}`}>
                <div className="text-xs font-medium opacity-70">{k.label}</div>
                <div className="text-lg font-bold mt-0.5">{k.value}</div>
              </div>
            ))}
          </div>

          {parseResult.year && (
            <p className="text-xs text-gray-500 text-right">Exercice détecté : <strong>{parseResult.year}</strong></p>
          )}

          {/* Categories table */}
          {parseResult.categories.length > 0 && (
            <div className="rounded-lg border border-gray-200 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {['Pilier', 'Catégorie', 'Indicateur', 'Valeur', 'Unité', 'Montant (€)', 'Source'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parseResult.categories.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${row.pillar === 'environmental' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                          {row.pillar === 'environmental' ? 'Env.' : 'Social'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{row.category}</td>
                      <td className="px-3 py-2 font-medium text-gray-800 max-w-[160px] truncate">{row.metric_name}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-green-700">
                        {row.unit === 'kgCO2e' ? co2Label(row.value) : `${row.value.toLocaleString('fr-FR')} ${row.unit}`}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{row.unit}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{row.total_amount_eur.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={resetState}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSync}
              disabled={loading || parseResult.categories_found === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {loading
                ? <><RefreshCw size={15} className="animate-spin" /> Import en cours…</>
                : <><CheckCircle size={15} /> Importer dans ESG</>
              }
            </button>
          </div>
        </>
      )}

      {/* STEP 3: Done */}
      {step === 'done' && syncResult && (
        <>
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-lg">Import réussi !</p>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-semibold text-green-700">{syncResult.entries_created} entrées ESG</span> créées
              </p>
              {syncResult.total_co2e_kgco2e > 0 && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Émissions Scope 3 estimées : <span className="font-semibold text-green-700">{co2Label(syncResult.total_co2e_kgco2e)}</span>
                </p>
              )}
              {syncResult.categories.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                  {syncResult.categories.map((c, i) => (
                    <span key={i} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={resetState}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-orange-200 text-orange-600 rounded-xl text-sm font-semibold hover:bg-orange-50 transition-colors"
          >
            <Upload size={15} /> Importer un autre fichier
          </button>
        </>
      )}
    </div>
  )
}

// ─── Tab 4 — Configuration ────────────────────────────────────────────────────

function TabConfiguration({ connectors = CONNECTORS, initialSelectedId }: { connectors?: Connector[]; initialSelectedId?: string | null }) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string>(initialSelectedId || 'sap-s4')

  // Sync if parent changes the selection (e.g. clicking "Configurer" from another tab)
  useEffect(() => {
    if (initialSelectedId) setSelectedId(initialSelectedId)
  }, [initialSelectedId])
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [syncFreq, setSyncFreq] = useState<string>('hourly')
  const [mappingRows, setMappingRows] = useState(ESG_MAPPING_ROWS)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<{
    status: 'success' | 'error'
    message: string
    details?: Record<string, unknown>
  } | null>(null)

  const selected = connectors.find(c => c.id === selectedId)

  const toggleSecret = (key: string) => setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))
  const toggleMapping = (i: number) =>
    setMappingRows(prev => prev.map((r, idx) => idx === i ? { ...r, enabled: !r.enabled } : r))

  const handleTestConnection = async () => {
    if (!selected) return
    setTestLoading(true)
    setTestResult(null)
    try {
      // Use fetch with relative URL → goes through Vite proxy, avoids CORS
      const res = await fetch('/api/v1/connectors/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connector_id: selected.id }),
      })
      const data = await res.json()
      setTestResult(data)
    } catch (err: unknown) {
      setTestResult({
        status: 'error',
        message: `Erreur réseau : backend inaccessible (${(err as Error)?.message ?? 'inconnu'})`,
      })
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left panel */}
      <div className="lg:col-span-1">
        <Card className="p-2">
          {connectors.map(c => (
            <button
              key={c.id}
              onClick={() => { setSelectedId(c.id); setTestResult(null) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                selectedId === c.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                c.status === 'connected' ? 'bg-green-500' :
                c.status === 'error' ? 'bg-red-500' : 'bg-gray-300'
              }`} />
              <span className="text-sm font-medium truncate">{c.name}</span>
            </button>
          ))}
        </Card>
      </div>

      {/* Right panel */}
      <div className="lg:col-span-3 space-y-5">
        {selected ? (
          <>
            <div className="flex items-center gap-3">
              <ConnectorInitials name={selected.name} color={selected.color} />
              <div>
                <h2 className="font-bold text-gray-800">{selected.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={selected.status} />
                  <span className="text-xs text-gray-500">{selected.version}</span>
                </div>
              </div>
            </div>

            {/* Auth section */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Shield size={16} className="text-blue-600" />
                <h3 className="font-semibold text-gray-800">{t('connectors.authSection')}</h3>
                <AuthPill authType={selected.authType} />
              </div>

              {selected.authType === 'oauth2' && (
                <div className="space-y-3">
                  <FormField label={t('connectors.clientId')} placeholder="app-client-id-xxxx" />
                  <SecretField label={t('connectors.clientSecret')} fieldKey="cs" showSecrets={showSecrets} toggleSecret={toggleSecret} />
                  <FormField label={t('connectors.tokenUrl')} placeholder="https://auth.provider.com/oauth2/token" />
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('connectors.scopes')}</label>
                    <div className="flex flex-wrap gap-1 p-2 border border-gray-200 rounded-lg min-h-[40px] bg-white">
                      {['read:emissions', 'read:energy', 'read:hr'].map(s => (
                        <span key={s} className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                          {s}<button className="text-blue-400 hover:text-blue-600">&times;</button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleTestConnection}
                      disabled={testLoading}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-wait"
                    >
                      {testLoading ? '⏳ Test...' : t('connectors.testConnection')}
                    </button>
                    <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                      {t('connectors.authorizeOAuth')}
                    </button>
                  </div>
                </div>
              )}

              {selected.authType === 'apikey' && (
                <div className="space-y-3">
                  <SecretField label={t('connectors.apiKey')} fieldKey="ak" showSecrets={showSecrets} toggleSecret={toggleSecret} />
                  <FormField label={t('connectors.baseUrl')} placeholder={selected.endpoint} />
                  <FormField label={t('connectors.orgId')} placeholder="org-xxxxxxxx" />
                  <button
                    onClick={handleTestConnection}
                    disabled={testLoading}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-wait"
                  >
                    {testLoading ? '⏳ Test en cours...' : t('connectors.testConnection')}
                  </button>
                </div>
              )}

              {selected.authType === 'certificate' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('connectors.certFile')}</label>
                    <div className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors cursor-pointer">
                      <Upload size={18} />
                      <span className="text-sm">{t('connectors.uploadCert')}</span>
                    </div>
                  </div>
                  <SecretField label={t('connectors.certPassword')} fieldKey="cp" showSecrets={showSecrets} toggleSecret={toggleSecret} />
                  <button
                    onClick={handleTestConnection}
                    disabled={testLoading}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-wait"
                  >
                    {testLoading ? '⏳ Test en cours...' : t('connectors.testConnection')}
                  </button>
                </div>
              )}

              {/* ── Test result banner ── */}
              {testResult && (
                <div className={`flex items-start gap-3 rounded-lg p-3 text-sm ${
                  testResult.status === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  <span className="text-lg leading-none flex-shrink-0">
                    {testResult.status === 'success' ? '✅' : '❌'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{selected?.name}</p>
                    <p className="mt-0.5 text-xs">{testResult.message}</p>
                    {testResult.details && testResult.status === 'success' && (
                      <p className="mt-1 text-xs text-green-600 font-mono">
                        {Object.entries(testResult.details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setTestResult(null)}
                    className="ml-auto flex-shrink-0 text-gray-400 hover:text-gray-600"
                  >✕</button>
                </div>
              )}
            </Card>

            {/* Sync section */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <RefreshCw size={16} className="text-green-600" />
                <h3 className="font-semibold text-gray-800">{t('connectors.syncSection')}</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'realtime', label: t('connectors.freqRealtime') },
                  { value: 'hourly', label: t('connectors.freqHourly') },
                  { value: 'daily', label: t('connectors.freqDaily') },
                  { value: 'weekly', label: t('connectors.freqWeekly') },
                ].map(opt => (
                  <label key={opt.value} className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    syncFreq === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="syncFreq"
                      value={opt.value}
                      checked={syncFreq === opt.value}
                      onChange={e => setSyncFreq(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 rounded-lg px-3 py-2">
                <Clock size={15} className="text-blue-600" />
                <span>{t('connectors.nextSync')} <strong>4h 23min</strong></span>
              </div>
            </Card>

            {/* Mapping section */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Layers size={16} className="text-purple-600" />
                <h3 className="font-semibold text-gray-800">{t('connectors.mappingSection')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{t('connectors.sourceField')}</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600"></th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{t('connectors.targetField')}</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">{t('connectors.enabled')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mappingRows.map((row, i) => (
                      <tr key={i} className={row.enabled ? '' : 'opacity-50'}>
                        <td className="px-3 py-2.5 font-mono text-xs text-gray-700 bg-gray-50 rounded">{row.source}</td>
                        <td className="px-3 py-2.5 text-center text-gray-400"><ArrowRight size={14} /></td>
                        <td className="px-3 py-2.5 font-mono text-xs text-blue-700">{row.target}</td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => toggleMapping(i)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${row.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${row.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Schneider → Climatiq live emissions panel */}
            {selected?.id === 'schneider' && <SchneiderEmissionsPanel />}

            {/* Enedis CSV import panel */}
            {selected?.id === 'enedis' && (
              <Card className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Zap size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">Import CSV Enedis</p>
                    <p className="text-xs text-gray-500">Consommation électrique + Scope 2 automatique</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  Importez votre export CSV Enedis pour créer automatiquement les entrées ESG de consommation
                  électrique et calculer les émissions Scope 2 (facteur RTE 2023 : 23,4 gCO₂e/kWh).
                </p>
                <a
                  href="/app/connectors/enedis"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <Upload size={15} />
                  Ouvrir l'import Enedis
                </a>
              </Card>
            )}

            {/* FEC import panel for French accounting connectors */}
            {(selected?.id === 'sage' || selected?.id === 'cegid' || selected?.id === 'pennylane') && (
              <FECImportPanel connectorId={selected.id} />
            )}

            {/* Save section */}
            <Card className="p-5 space-y-3">
              <button className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                {t('connectors.saveConfig')}
              </button>
              <div className="text-center">
                <button className="text-xs text-red-500 hover:text-red-700 transition-colors">
                  {t('connectors.deleteConnector')}
                </button>
              </div>
            </Card>
          </>
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <p>{t('connectors.configSelectPrompt')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function FormField({ label, placeholder }: { label: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

function SecretField({ label, fieldKey, showSecrets, toggleSecret }: {
  label: string
  fieldKey: string
  showSecrets: Record<string, boolean>
  toggleSecret: (k: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative">
        <input
          type={showSecrets[fieldKey] ? 'text' : 'password'}
          defaultValue="••••••••••••••••"
          className="w-full pl-3 pr-9 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => toggleSecret(fieldKey)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showSecrets[fieldKey] ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

// ─── Tab 5 — Documentation ────────────────────────────────────────────────────

function TabDocumentation() {
  const { t } = useTranslation()
  const [docTab, setDocTab] = useState<'architecture' | 'devguide' | 'integrationplan' | 'apiref'>('architecture')
  const [openApiSection, setOpenApiSection] = useState<string | null>(null)

  const docTabs: { key: typeof docTab; label: string }[] = [
    { key: 'architecture', label: t('connectors.docArchitecture') },
    { key: 'devguide', label: t('connectors.docDevGuide') },
    { key: 'integrationplan', label: t('connectors.docIntegrationPlan') },
    { key: 'apiref', label: t('connectors.docApiRef') },
  ]

  const INTERFACE_CODE = `interface IConnector {
  id: string
  name: string
  category: ConnectorCategory
  authType: AuthType
  connect(credentials: Credentials): Promise<void>
  sync(): Promise<SyncResult>
  normalize(raw: unknown): ESGDataPoint[]
  validate(): ValidationResult
}`

  const API_SECTIONS = [
    {
      cat: 'ERP', color: '#1e40af',
      connectors: [{
        name: 'SAP S/4HANA', endpoint: 'https://api.sap.com/s4hanacloud/v1',
        auth: 'OAuth2', rateLimit: '500 req/min',
        fields: [
          { field: 'CO2_EMISSION_KG', type: 'number', desc: 'Emissions CO2 directes', mapping: 'ghg.scope1.direct' },
          { field: 'ENERGY_KWH', type: 'number', desc: 'Consommation electrique', mapping: 'energy.electricity.kwh' },
        ],
        example: `{
  "CO2_EMISSION_KG": 1250.5,
  "ENERGY_KWH": 45200,
  "PERIOD": "2026-Q1",
  "PLANT_ID": "DE-HAM-001"
}`
      }],
    },
    {
      cat: 'RH', color: '#0891b2',
      connectors: [{
        name: 'Workday', endpoint: 'https://wd2-impl-services1.workday.com/ccx/service',
        auth: 'OAuth2', rateLimit: '300 req/min',
        fields: [
          { field: 'EMPLOYEE_COUNT', type: 'integer', desc: 'Nombre total de salaries', mapping: 'social.workforce.headcount' },
          { field: 'DIVERSITY_RATIO', type: 'number', desc: 'Ratio diversite H/F', mapping: 'social.diversity.gender_ratio' },
        ],
        example: `{
  "EMPLOYEE_COUNT": 890,
  "DIVERSITY_RATIO": 0.48,
  "TURNOVER_RATE": 0.12,
  "TRAINING_HOURS": 24.5
}`
      }],
    },
    {
      cat: 'Energie', color: '#059669',
      connectors: [{
        name: 'Schneider Electric', endpoint: 'https://api.exchange.se.com/ecostruxure/v3',
        auth: 'OAuth2', rateLimit: '1000 req/min',
        fields: [
          { field: 'ACTIVE_ENERGY_KWH', type: 'number', desc: 'Energie active consommee', mapping: 'energy.electricity.kwh' },
          { field: 'PEAK_DEMAND_KW', type: 'number', desc: 'Pic de puissance', mapping: 'energy.peak_demand.kw' },
        ],
        example: `{
  "ACTIVE_ENERGY_KWH": 4200.8,
  "PEAK_DEMAND_KW": 180.2,
  "SITE_ID": "SITE-PAR-001",
  "TIMESTAMP": "2026-03-21T10:00:00Z"
}`
      }],
    },
    {
      cat: 'Carbone', color: '#16a34a',
      connectors: [{
        name: 'Climatiq API', endpoint: 'https://api.climatiq.io/v3',
        auth: 'API Key', rateLimit: '200 req/min',
        fields: [
          { field: 'co2e', type: 'number', desc: 'Equivalent CO2 calcule', mapping: 'ghg.co2_equivalent' },
          { field: 'emission_factor', type: 'number', desc: "Facteur d'emission utilise", mapping: 'ghg.emission_factor' },
        ],
        example: `{
  "co2e": 0.2856,
  "co2e_unit": "kg",
  "emission_factor": 0.23314,
  "activity_id": "electricity-supply_grid-source_residual_mix"
}`
      }],
    },
  ]

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex gap-6 border-b border-gray-200 overflow-x-auto">
        {docTabs.map(dt => (
          <button
            key={dt.key}
            onClick={() => setDocTab(dt.key)}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              docTab === dt.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {dt.label}
          </button>
        ))}
      </div>

      {/* Architecture */}
      {docTab === 'architecture' && (
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-bold text-gray-800 mb-1">Architecture d&apos;ingestion ESG automatisee</h3>
            <p className="text-sm text-gray-500 mb-6">
              ESGFlow connecte vos systemes sources a une plateforme de normalisation et de stockage ESG centralisee.
            </p>
            {/* Pipeline */}
            <div className="flex flex-col sm:flex-row items-center gap-2 overflow-x-auto py-2">
              {[
                { icon: <Globe size={20} />, title: 'Source ERP/RH/Energie', bullets: ['SAP, Oracle, Workday', 'APIs REST / SOAP', 'Webhooks temps reel'] },
                { icon: <Plug size={20} />, title: 'Connecteur ESGFlow', bullets: ['Auth OAuth2/API Key', 'Rate limiting', 'Retry automatique'] },
                { icon: <Layers size={20} />, title: 'Normalisation ESG', bullets: ['Schema GHG Protocol', 'Validation CSRD', 'Deduplication'] },
                { icon: <Database size={20} />, title: 'Stockage & Reporting', bullets: ['Base de donnees ESG', 'Calculs Scope 1/2/3', 'Exports conformes'] },
              ].map((step, i, arr) => (
                <div key={i} className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-44 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-blue-600">
                      {step.icon}
                      <span className="text-xs font-bold text-gray-700">{step.title}</span>
                    </div>
                    <ul className="space-y-0.5">
                      {step.bullets.map(b => (
                        <li key={b} className="text-xs text-gray-500 flex items-start gap-1">
                          <span className="text-blue-400 mt-0.5">•</span>{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {i < arr.length - 1 && <ArrowRight size={20} className="text-gray-400 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Principes architecturaux</h3>
            <ul className="space-y-2">
              {[
                'Securite : chiffrement TLS 1.3 + stockage securise des credentials (vault)',
                "Extensibilite : interface IConnector standardisee pour ajouter facilement de nouveaux connecteurs",
                "Tracabilite : chaque synchronisation est logguee avec horodatage et identifiant unique",
                "Resilience : mecanisme de retry avec backoff exponentiel en cas d'erreur transitoire",
                "Conformite : normalisation des donnees selon GHG Protocol, GRI et CSRD",
                "Observabilite : metriques temps reel, alertes, tableau de bord monitoring",
              ].map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
                  {p}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Dev guide */}
      {docTab === 'devguide' && (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Terminal size={18} className="text-indigo-600" />
              <h3 className="font-bold text-gray-800">Ajouter un nouveau connecteur</h3>
            </div>
            <div className="space-y-6">
              {[
                {
                  step: 1,
                  title: "Implementer l'interface IConnector",
                  body: "Creer un fichier TypeScript dans /connectors/your-connector/index.ts implementant l'interface IConnector.",
                  showCode: true,
                },
                { step: 2, title: "Definir l'authentification", body: "Configurer authType ('oauth2' | 'apikey' | 'certificate') et implementer la methode connect() avec gestion des tokens.", showCode: false },
                { step: 3, title: "Implementer sync() + normalize()", body: "sync() recupere les donnees brutes de l'API source. normalize() transforme ces donnees au format ESGDataPoint standardise.", showCode: false },
                { step: 4, title: "Enregistrer dans la ConnectorRegistry", body: "Ajouter votre connecteur dans src/connectors/registry.ts pour qu'il soit detecte automatiquement par la plateforme.", showCode: false },
                { step: 5, title: "Tester avec le connecteur mock", body: "Utiliser MockConnector en environnement de test pour valider le comportement sans connexion reelle a l'API.", showCode: false },
              ].map(s => (
                <div key={s.step} className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    {s.step}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-800 mb-1">{s.title}</p>
                    <p className="text-sm text-gray-500 mb-2">{s.body}</p>
                    {s.showCode && (
                      <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto font-mono leading-relaxed">
                        {INTERFACE_CODE}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Integration plan */}
      {docTab === 'integrationplan' && (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={18} className="text-blue-600" />
              <h3 className="font-bold text-gray-800">{t('connectors.integrationPlan')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    {[t('connectors.phase'), 'Connecteurs', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', t('connectors.effort'), t('connectors.priority')].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { phase: 'Phase 1 — ERP/Finance', connectors: 'SAP S/4HANA ✓, Oracle Fusion, NetSuite', q: 1, effort: '3 mois', priority: t('connectors.priorityHigh'), priCls: 'text-red-600' },
                    { phase: 'Phase 2 — RH', connectors: 'Workday ✓, BambooHR, SuccessFactors', q: 2, effort: '2 mois', priority: t('connectors.priorityHigh'), priCls: 'text-red-600' },
                    { phase: 'Phase 3 — Energie', connectors: 'Schneider ✓, Enedis, EDF', q: 3, effort: '3 mois', priority: t('connectors.priorityMedium'), priCls: 'text-amber-600' },
                    { phase: 'Phase 4 — Carbone', connectors: 'Climatiq ✓, Carbon Interface', q: 4, effort: '1 mois', priority: t('connectors.priorityLow'), priCls: 'text-gray-500' },
                  ].map(row => (
                    <tr key={row.phase} className="hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-gray-800 text-xs whitespace-nowrap">{row.phase}</td>
                      <td className="px-3 py-3 text-gray-500 text-xs">{row.connectors}</td>
                      {[1, 2, 3, 4].map(q => (
                        <td key={q} className="px-3 py-3 min-w-[80px]">
                          {q === row.q && <div className="h-3 rounded-full bg-blue-500 w-full" />}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{row.effort}</td>
                      <td className={`px-3 py-3 text-xs font-medium whitespace-nowrap ${row.priCls}`}>{row.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Criteres de validation</h3>
            <ul className="space-y-2">
              {[
                'Taux de succes des synchronisations >= 95% sur 30 jours',
                'Latence de synchronisation < 5 minutes pour les modes temps reel',
                'Couverture de mapping ESG >= 80% des champs requis par le standard CSRD',
                "Aucune perte de donnees lors des retries et reconnexions automatiques",
                "Tests d'integration passes sur environnements de staging et production",
              ].map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  {c}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* API Ref */}
      {docTab === 'apiref' && (
        <div className="space-y-4">
          {API_SECTIONS.map(section => (
            <Card key={section.cat} className="overflow-hidden">
              <button
                onClick={() => setOpenApiSection(openApiSection === section.cat ? null : section.cat)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: section.color }} />
                  <span className="font-semibold text-gray-800">{section.cat}</span>
                  <span className="text-xs text-gray-500">{section.connectors.length} connecteur(s)</span>
                </div>
                <ChevronRight size={16} className={`text-gray-400 transition-transform ${openApiSection === section.cat ? 'rotate-90' : ''}`} />
              </button>
              {openApiSection === section.cat && section.connectors.map(conn => (
                <div key={conn.name} className="px-5 pb-5 space-y-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('connectors.endpoint')}</p>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono break-all">{conn.endpoint}</code>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Authentification</p>
                      <span className="text-xs font-medium text-gray-700">{conn.auth}</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Rate limit</p>
                      <span className="text-xs font-medium text-gray-700">{conn.rateLimit}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">Champs disponibles</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-2 py-1.5 text-left text-gray-500">Champ</th>
                            <th className="px-2 py-1.5 text-left text-gray-500">Type</th>
                            <th className="px-2 py-1.5 text-left text-gray-500">Description</th>
                            <th className="px-2 py-1.5 text-left text-gray-500">Mapping ESG</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {conn.fields.map(f => (
                            <tr key={f.field}>
                              <td className="px-2 py-1.5 font-mono text-gray-700">{f.field}</td>
                              <td className="px-2 py-1.5 text-gray-500">{f.type}</td>
                              <td className="px-2 py-1.5 text-gray-500">{f.desc}</td>
                              <td className="px-2 py-1.5 font-mono text-blue-600">{f.mapping}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">Exemple de reponse</p>
                    <pre className="bg-gray-900 text-green-400 rounded-lg p-3 text-xs overflow-x-auto font-mono">{conn.example}</pre>
                  </div>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConnectorsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'overview' | 'connectors' | 'monitoring' | 'configuration' | 'docs' | 'fec'>('overview')
  const [configSelectedId, setConfigSelectedId] = useState<string | null>(null)
  const [connectors, setConnectors] = useState<Connector[]>(CONNECTORS)

  // Fetch per-tenant connector statuses from backend, overlay on static catalog
  useEffect(() => {
    api.get('/connectors/catalog').then(res => {
      const items: Connector[] = res.data?.connectors ?? []
      if (items.length > 0) setConnectors(items)
    }).catch(() => {
      // Keep default CONNECTORS on failure (API unavailable)
    })
  }, [])

  const handleConfigure = (id: string) => {
    setConfigSelectedId(id)
    setActiveTab('configuration')
  }

  const tabs: { key: typeof activeTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: t('connectors.tabOverview'), icon: <BarChart3 size={16} /> },
    { key: 'connectors', label: t('connectors.tabConnectors'), icon: <Plug size={16} /> },
    { key: 'monitoring', label: t('connectors.tabMonitoring'), icon: <Activity size={16} /> },
    { key: 'configuration', label: t('connectors.tabConfiguration'), icon: <Settings size={16} /> },
    { key: 'fec', label: 'Import FEC', icon: <FileText size={16} /> },
    { key: 'docs', label: t('connectors.tabDocs'), icon: <Book size={16} /> },
  ]

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <BackButton to="/app/data" label="Données" />
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
              {t('connectors.badge')}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('connectors.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('connectors.subtitle')}</p>
        </div>
        <Button variant="primary" size="sm" className="flex items-center gap-2 flex-shrink-0">
          <Plug size={15} />
          {t('connectors.addConnector')}
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <TabOverview connectors={connectors} />}
      {activeTab === 'connectors' && <TabConnectors connectors={connectors} onConfigure={handleConfigure} />}
      {activeTab === 'monitoring' && <TabMonitoring connectors={connectors} />}
      {activeTab === 'configuration' && <TabConfiguration connectors={connectors} initialSelectedId={configSelectedId} />}
      {activeTab === 'fec' && (
        <div className="max-w-3xl mx-auto space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Import FEC — Comptabilité française</h2>
            <p className="text-sm text-gray-500 mt-1">
              Importez votre Fichier des Écritures Comptables (Sage, Cegid, Pennylane) pour calculer automatiquement
              vos émissions Scope 3 par catégorie de dépenses selon les facteurs ADEME.
            </p>
          </div>
          <FECImportPanel connectorId="fec" />
        </div>
      )}
      {activeTab === 'docs' && <TabDocumentation />}
    </div>
  )
}
