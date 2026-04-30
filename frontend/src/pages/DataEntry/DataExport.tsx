/**
 * DataExport — Centre d'export des données ESG.
 * Permet d'exporter les saisies de données au format Excel ou CSV
 * avec filtres pilier / année / statut de vérification.
 * Fonctionnalité réservée au plan Starter+.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Download, FileSpreadsheet, FileText, Leaf, Users, Building2,
  CheckCircle2, Clock, XCircle, Filter, RefreshCw, BarChart3,
  Zap, ArrowRight, FileDown,
} from 'lucide-react'
import api from '@/services/api'
import PlanGate from '@/components/common/PlanGate'
import BackButton from '@/components/common/BackButton'
import { usePlan } from '@/hooks/usePlan'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExportStats {
  total: number
  by_pillar: Record<string, number>
  by_verification_status: Record<string, number>
  date_range: { min: string | null; max: string | null }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PILLARS = [
  { id: '',              label: 'Tous les piliers',   icon: BarChart3,  color: 'text-gray-500' },
  { id: 'environmental', label: 'Environnement',      icon: Leaf,       color: 'text-emerald-600' },
  { id: 'social',        label: 'Social',             icon: Users,      color: 'text-blue-600' },
  { id: 'governance',    label: 'Gouvernance',        icon: Building2,  color: 'text-purple-600' },
]

const STATUSES = [
  { id: '',          label: 'Tous les statuts' },
  { id: 'verified',  label: 'Vérifié' },
  { id: 'pending',   label: 'En attente' },
  { id: 'rejected',  label: 'Rejeté' },
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [0, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3]
  .map(y => ({ id: y === 0 ? '' : String(y), label: y === 0 ? 'Toutes les années' : String(y) }))

const EXPORT_FORMATS = [
  {
    id: 'xlsx',
    label: 'Excel (.xlsx)',
    icon: FileSpreadsheet,
    desc: 'Format tabulaire avec mise en forme colorée par pilier, idéal pour analyser et partager.',
    color: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100',
    badge: 'Recommandé',
    badgeColor: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'csv',
    label: 'CSV (.csv)',
    icon: FileText,
    desc: 'Format texte universel compatible avec tous les logiciels (R, Python, Power BI…).',
    color: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
    badge: 'Universel',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function DataExport() {
  const { can, loading: planLoading } = usePlan()
  const navigate = useNavigate()

  const [stats, setStats] = useState<ExportStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null) // 'xlsx' | 'csv'

  // Filters
  const [pillar, setPillar]   = useState('')
  const [year, setYear]       = useState('')
  const [status, setStatus]   = useState('')
  const [format, setFormat]   = useState<'xlsx' | 'csv'>('xlsx')

  useEffect(() => {
    if (!planLoading && can('data_export')) loadStats()
  }, [planLoading])

  const loadStats = async () => {
    try {
      setLoadingStats(true)
      const res = await api.get('/data-entry/stats')
      setStats(res.data)
    } catch {
      // silently ignore
    } finally {
      setLoadingStats(false)
    }
  }

  const countForFilter = () => {
    if (!stats) return null
    let count = stats.total
    if (pillar && stats.by_pillar) {
      count = stats.by_pillar[pillar] ?? 0
    }
    if (status && stats.by_verification_status) {
      // Further approximation — real count needs API call
      count = Math.round(count * ((stats.by_verification_status[status] ?? 0) / Math.max(stats.total, 1)))
    }
    return count
  }

  const handleExport = async (fmt: 'xlsx' | 'csv') => {
    if (!can('data_export')) return
    try {
      setExporting(fmt)
      const params: Record<string, string> = { format: fmt }
      if (pillar)  params.pillar = pillar
      if (year)    params.year = year
      if (status)  params.verification_status = status

      const query = new URLSearchParams(params).toString()
      const res = await api.get(`/data-entry/export?${query}`, { responseType: 'blob' })

      const mime = fmt === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv'
      const ext = fmt
      const blob = new Blob([res.data], { type: mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `esg_data_export.${ext}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Export ${fmt.toUpperCase()} téléchargé avec succès`)
    } catch (err: any) {
      toast.error('Erreur lors de l\'export')
    } finally {
      setExporting(null)
    }
  }

  // ── Pendant le chargement du plan ─────────────────────────────────────────
  if (planLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-xl w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="h-40 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 bg-gray-200 rounded-xl" />
          <div className="h-48 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  // ── Gate ──────────────────────────────────────────────────────────────────
  if (!can('data_export')) {
    return (
      <div className="p-6">
        <PlanGate feature="data_export" />
      </div>
    )
  }

  const estimatedCount = countForFilter()

  return (
    <div className="space-y-6 max-w-4xl">
      <BackButton to="/app/data" label="Données" />

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Export de données</h1>
          <p className="text-sm text-gray-500 mt-1">
            Téléchargez vos données ESG en Excel ou CSV pour vos analyses et rapports.
          </p>
        </div>
        <button
          onClick={loadStats}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      {/* ── Stats overview ── */}
      {loadingStats ? (
        <div className="grid grid-cols-3 gap-4 animate-pulse">
          {[0,1,2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <div className="text-3xl font-black text-gray-800">{stats.total.toLocaleString('fr-FR')}</div>
            <div className="text-xs text-gray-500 mt-1">Entrées totales</div>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
            <div className="text-3xl font-black text-emerald-600">{stats.by_pillar?.environmental ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1"><Leaf size={10} />Environnement</div>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
            <div className="text-3xl font-black text-blue-600">{stats.by_pillar?.social ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1"><Users size={10} />Social</div>
          </div>
          <div className="bg-purple-50 rounded-xl border border-purple-200 p-4 text-center">
            <div className="text-3xl font-black text-purple-600">{stats.by_pillar?.governance ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1"><Building2 size={10} />Gouvernance</div>
          </div>
        </div>
      ) : null}

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Filter size={14} className="text-indigo-500" />
          Filtres d'export
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Pillar */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Pilier</label>
            <select
              value={pillar}
              onChange={e => setPillar(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {PILLARS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Année</label>
            <select
              value={year}
              onChange={e => setYear(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {YEARS.map(y => (
                <option key={y.id} value={y.id}>{y.label}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Statut de vérification</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {STATUSES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active filters summary */}
        {(pillar || year || status) && (
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-400">Filtres actifs :</span>
            {pillar && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">{PILLARS.find(p => p.id === pillar)?.label}</span>}
            {year   && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">{year}</span>}
            {status && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">{STATUSES.find(s => s.id === status)?.label}</span>}
            <button
              onClick={() => { setPillar(''); setYear(''); setStatus('') }}
              className="text-xs text-gray-400 hover:text-gray-600 underline ml-1"
            >
              Effacer
            </button>
          </div>
        )}
      </div>

      {/* ── Format selection + Export buttons ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        {EXPORT_FORMATS.map(fmt => {
          const Icon = fmt.icon
          const isExporting = exporting === fmt.id
          return (
            <div
              key={fmt.id}
              className={`rounded-xl border-2 p-5 cursor-pointer transition-all ${fmt.color} ${format === fmt.id ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
              onClick={() => setFormat(fmt.id as 'xlsx' | 'csv')}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                  <Icon size={22} className={fmt.id === 'xlsx' ? 'text-emerald-600' : 'text-blue-600'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-gray-800">{fmt.label}</h3>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${fmt.badgeColor}`}>{fmt.badge}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{fmt.desc}</p>
                </div>
                <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 mt-0.5 transition-colors ${format === fmt.id ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 bg-white'}`}>
                  {format === fmt.id && <div className="w-full h-full rounded-full bg-white scale-50 block" />}
                </div>
              </div>

              {/* Export button */}
              <button
                onClick={e => { e.stopPropagation(); handleExport(fmt.id as 'xlsx' | 'csv') }}
                disabled={isExporting || stats?.total === 0}
                className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all
                  ${fmt.id === 'xlsx' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isExporting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Export en cours…
                  </>
                ) : (
                  <>
                    <FileDown size={14} />
                    Télécharger {fmt.label}
                    {estimatedCount !== null && (
                      <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        ~{estimatedCount.toLocaleString('fr-FR')} lignes
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Empty state ── */}
      {stats?.total === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <BarChart3 size={32} className="text-amber-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-amber-800">Aucune donnée à exporter</h3>
          <p className="text-xs text-amber-600 mt-1">
            Commencez par saisir des données ESG pour pouvoir les exporter.
          </p>
          <button
            onClick={() => navigate('/app/data-entry')}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700"
          >
            <Zap size={12} />
            Saisir des données
            <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* ── Info box ── */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-600 mb-2">Contenu de l'export</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-500">
          {[
            'ID de l\'entrée', 'Pilier ESG', 'Catégorie', 'Indicateur',
            'Valeur numérique', 'Unité', 'Période de référence',
            'Source de données', 'Méthode de collecte', 'Statut de vérification',
            'Notes', 'Date de création',
          ].map(field => (
            <div key={field} className="flex items-center gap-1.5">
              <CheckCircle2 size={10} className="text-emerald-500 flex-shrink-0" />
              {field}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
