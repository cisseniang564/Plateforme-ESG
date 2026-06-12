/**
 * ReportsUnified — Page unifiée Rapports CSRD + Constructeur
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Download, Shield, Globe, TrendingUp, Leaf,
  Calendar, CheckCircle, AlertCircle, Clock, ChevronRight,
  BarChart3, RefreshCw, Zap, Building2, Users, Droplets,
  Recycle, TreePine, Scale, AlertTriangle, FileDown,
  Sparkles, Info, Circle, ArrowRight, Star,
} from 'lucide-react'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import ReportHistoryPanel from '@/components/reports/ReportHistoryPanel'
import DataChecksPanel from '@/components/reports/DataChecksPanel'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'csrd' | 'generate'
type ExportFormat = 'pdf' | 'excel' | 'word' | 'json'
type ReportType = 'csrd' | 'executive' | 'detailed' | 'gri' | 'tcfd'

interface KPI { label: string; value: string; sub?: string; color: string; icon: React.ElementType }
interface ESRSEntry {
  id: string; name: string; icon: React.ElementType; color: string; bg: string
  items: { code: string; name: string; value: string | null; unit: string; status: 'ok' | 'partial' | 'missing' }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function matchesKeywords(text: string, kws: string[]) {
  const t = text.toLowerCase()
  return kws.some(k => t.includes(k.toLowerCase()))
}

function mapEntriesToESRS(entries: any[], t: TFunction): ESRSEntry[] {
  const env = entries.filter(e => e.pillar === 'environmental')
  const soc = entries.filter(e => e.pillar === 'social')
  const gov = entries.filter(e => e.pillar === 'governance')

  const pick = (list: any[], kws: string[]) =>
    list.filter(e => matchesKeywords(e.metric_name + ' ' + (e.category || ''), kws))

  const toItem = (e: any) => ({
    code: e.category?.slice(0, 6).toUpperCase().replace(/\s/g, '-') || '—',
    name: e.metric_name,
    value: e.value_numeric != null ? String(e.value_numeric) : null,
    unit: e.unit || '',
    status: (e.value_numeric != null ? 'ok' : 'missing') as 'ok' | 'partial' | 'missing',
  })

  return [
    { id: 'E1', name: t('reports.esrs.E1', 'Changement climatique'), icon: Zap, color: '#dc2626', bg: '#fef2f2',
      items: [...pick(env, ['scope 1', 'scope1', 'ghg', 'ges', 'carbone', 'co2', 'émission']), ...pick(env, ['énergie renouvelable', 'renewable', 'énergie']), ...pick(env, ['intensité carbone', 'objectif'])].slice(0, 8).map(toItem) },
    { id: 'E2', name: t('reports.esrs.E2', 'Pollution'), icon: AlertTriangle, color: '#ea580c', bg: '#fff7ed',
      items: pick(env, ['pollution', 'déchets', 'rejet', 'atmosphérique', 'sol']).map(toItem) },
    { id: 'E3', name: t('reports.esrs.E3', 'Ressources marines & aquatiques'), icon: Droplets, color: '#0891b2', bg: '#ecfeff',
      items: pick(env, ['eau', 'hydrique', 'water', 'aqua']).map(toItem) },
    { id: 'E4', name: t('reports.esrs.E4', 'Biodiversité'), icon: TreePine, color: '#16a34a', bg: '#f0fdf4',
      items: pick(env, ['biodiversité', 'écosystème', 'faune', 'site protégé']).map(toItem) },
    { id: 'E5', name: t('reports.esrs.E5', 'Économie circulaire'), icon: Recycle, color: '#7c3aed', bg: '#faf5ff',
      items: pick(env, ['recyclage', 'circul', 'déchet', 'réemploi']).map(toItem) },
    { id: 'S1', name: t('reports.esrs.S1', 'Effectifs propres'), icon: Users, color: '#2563eb', bg: '#eff6ff',
      items: pick(soc, ['effectif', 'salarié', 'formation', 'accident', 'turnover', 'femme', 'parité']).map(toItem) },
    { id: 'S2', name: t('reports.esrs.S2', 'Chaîne de valeur'), icon: Globe, color: '#0284c7', bg: '#f0f9ff',
      items: pick(soc, ['fournisseur', 'chaîne', 'supply', 'sous-traitant']).map(toItem) },
    { id: 'S3', name: t('reports.esrs.S3', 'Communautés'), icon: Building2, color: '#0d9488', bg: '#f0fdfa',
      items: pick(soc, ['communauté', 'local', 'territoire', 'riverain']).map(toItem) },
    { id: 'G1', name: t('reports.esrs.G1', 'Gouvernance des affaires'), icon: Scale, color: '#6366f1', bg: '#eef2ff',
      items: gov.map(toItem) },
  ]
}

// ─── Templates config ─────────────────────────────────────────────────────────

const getTemplates = (t: TFunction) => [
  {
    type: 'csrd' as ReportType,
    label: 'CSRD / ESRS 2024',
    sub: t('reports.tpl.csrd.sub', 'Directive européenne complète'),
    desc: t('reports.tpl.csrd.desc', "Conformité totale avec les nouvelles exigences ESRS de l'UE. Rapport complet E, S, G."),
    icon: Shield,
    gradient: 'from-violet-500 to-indigo-600',
    lightBg: '#eef2ff',
    color: '#6366f1',
    badge: t('reports.tpl.csrd.badge', 'Recommandé') as string | null,
    badgeColor: 'bg-violet-100 text-violet-700',
    pages: '80-120 pages',
    time: '~45s',
  },
  {
    type: 'executive' as ReportType,
    label: t('reports.tpl.executive.label', 'Résumé exécutif'),
    sub: t('reports.tpl.executive.sub', 'Vision synthétique dirigeants'),
    desc: t('reports.tpl.executive.desc', "KPIs clés, tendances et axes d'amélioration prioritaires pour votre comité de direction."),
    icon: BarChart3,
    gradient: 'from-sky-500 to-blue-600',
    lightBg: '#eff6ff',
    color: '#0284c7',
    badge: null,
    badgeColor: '',
    pages: '15-25 pages',
    time: '~15s',
  },
  {
    type: 'detailed' as ReportType,
    label: t('reports.tpl.detailed.label', 'Rapport détaillé'),
    sub: t('reports.tpl.detailed.sub', 'Analyse technique complète'),
    desc: t('reports.tpl.detailed.desc', "Tous les indicateurs, données brutes, méthodologies et pistes d'amélioration détaillées."),
    icon: FileText,
    gradient: 'from-teal-500 to-emerald-600',
    lightBg: '#f0fdfa',
    color: '#0d9488',
    badge: null,
    badgeColor: '',
    pages: '60-100 pages',
    time: '~35s',
  },
  {
    type: 'gri' as ReportType,
    label: 'GRI Standards 2021',
    sub: 'Global Reporting Initiative',
    desc: t('reports.tpl.gri.desc', 'Rapport conforme aux standards GRI avec index de contenu complet et références croisées.'),
    icon: Globe,
    gradient: 'from-green-500 to-lime-600',
    lightBg: '#f0fdf4',
    color: '#16a34a',
    badge: null,
    badgeColor: '',
    pages: '50-80 pages',
    time: '~30s',
  },
  {
    type: 'tcfd' as ReportType,
    label: 'TCFD',
    sub: t('reports.tpl.tcfd.sub', 'Risques climatiques financiers'),
    desc: t('reports.tpl.tcfd.desc', 'Divulgations financières liées au climat : gouvernance, stratégie, gestion des risques.'),
    icon: Leaf,
    gradient: 'from-amber-500 to-orange-500',
    lightBg: '#fffbeb',
    color: '#d97706',
    badge: null,
    badgeColor: '',
    pages: '30-50 pages',
    time: '~20s',
  },
]

// ─── Format config ────────────────────────────────────────────────────────────

const getFormats = (t: TFunction): { id: ExportFormat; label: string; ext: string; icon: string; color: string; bg: string; desc: string }[] => [
  { id: 'pdf', label: 'PDF', ext: '.pdf', icon: '📄', color: '#dc2626', bg: '#fef2f2', desc: t('reports.fmt.pdf', 'Document universel, idéal pour le partage') },
  { id: 'excel', label: 'Excel', ext: '.xlsx', icon: '📊', color: '#16a34a', bg: '#f0fdf4', desc: t('reports.fmt.excel', 'Données tabulaires, pour analyses complémentaires') },
  { id: 'word', label: 'Word', ext: '.docx', icon: '📝', color: '#2563eb', bg: '#eff6ff', desc: t('reports.fmt.word', 'Document éditable, pour personnalisation') },
  { id: 'json', label: 'JSON', ext: '.json', icon: '{ }', color: '#d97706', bg: '#fffbeb', desc: t('reports.fmt.json', 'Export structuré pour intégration système') },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'ok' | 'partial' | 'missing' }) {
  const { t } = useTranslation()
  if (status === 'ok') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle size={9} /> {t('reports.status.ok', 'Validé')}
    </span>
  )
  if (status === 'partial') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-200">
      <Clock size={9} /> {t('reports.status.partial', 'Partiel')}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 ring-1 ring-slate-200">
      <AlertCircle size={9} /> {t('reports.status.missing', 'Manquant')}
    </span>
  )
}

function CompletionRing({ pct, color }: { pct: number; color: string }) {
  const r = 14, circ = 2 * Math.PI * r
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="flex-shrink-0">
      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3" stroke="#f1f5f9" />
      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3"
        stroke={color} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
        transform="rotate(-90 18 18)" style={{ transition: 'stroke-dashoffset .6s ease' }} />
      <text x="18" y="22" textAnchor="middle" fontSize="8" fontWeight="700" fill={color}>{pct}%</text>
    </svg>
  )
}

function ESRSCard({ section, expanded, onToggle }: {
  section: ESRSEntry; expanded: boolean; onToggle: () => void
}) {
  const { t } = useTranslation()
  const Icon = section.icon
  const total = section.items.length
  const ok = section.items.filter(i => i.status === 'ok').length
  const pct = total ? Math.round((ok / total) * 100) : 0

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: section.bg }}>
          <Icon size={15} style={{ color: section.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: section.bg, color: section.color }}>{section.id}</span>
            <span className="text-[13px] font-semibold text-slate-800 truncate">{section.name}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{t('reports.card.summary', '{{total}} indicateur{{ps}} · {{ok}} validé{{vs}}', { total, ps: total !== 1 ? 's' : '', ok, vs: ok !== 1 ? 's' : '' })}</p>
        </div>
        <CompletionRing pct={pct} color={section.color} />
        <ChevronRight size={14} className={`text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && total > 0 && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {section.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/50 transition-colors duration-100">
              <span className="text-[10px] font-mono text-slate-400 w-16 flex-shrink-0">{item.code}</span>
              <span className="flex-1 text-[12px] text-slate-700 truncate">{item.name}</span>
              {item.value != null
                ? <span className="text-[12px] font-semibold text-slate-900 mr-1">{Number(item.value).toLocaleString('fr-FR')} <span className="text-slate-400 font-normal">{item.unit}</span></span>
                : <span className="text-[11px] text-slate-400 italic mr-1">—</span>
              }
              <StatusBadge status={item.status} />
            </div>
          ))}
        </div>
      )}

      {expanded && total === 0 && (
        <div className="border-t border-slate-100 px-4 py-5 text-center">
          <Info size={16} className="mx-auto text-slate-300 mb-1" />
          <p className="text-[12px] text-slate-400">{t('reports.card.noData', 'Aucune donnée disponible pour cette section.')}</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <a href="/app/data-entry" className="text-[11px] font-medium text-violet-600 hover:text-violet-700 px-3 py-1.5 rounded-lg bg-violet-50 transition-colors">
              {t('reports.action.manualEntry', 'Saisie manuelle')}
            </a>
            <a href="/app/import-csv" className="text-[11px] font-medium text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg bg-slate-100 transition-colors">
              {t('reports.action.csvImport', 'Import CSV')}
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step indicator ────────────────────────────────────────────────────────────

function StepBadge({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  if (done) return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 shadow-sm shadow-violet-200">
      <CheckCircle size={14} className="text-white" />
    </div>
  )
  if (active) return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 shadow-sm shadow-violet-200 ring-4 ring-violet-100">
      <span className="text-[12px] font-bold text-white">{n}</span>
    </div>
  )
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100">
      <span className="text-[12px] font-bold text-slate-400">{n}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReportsUnified() {
  const { t } = useTranslation()
  const TEMPLATES = getTemplates(t)
  const FORMATS = getFormats(t)
  const [tab, setTab] = useState<TabId>('overview')
  const [entries, setEntries] = useState<any[]>([])
  const navigate = useNavigate()
  const [esrsData, setEsrsData] = useState<ESRSEntry[]>([])
  const [kpis, setKpis] = useState<KPI[]>([])
  const [expandedSection, setExpandedSection] = useState<string | null>('E1')
  const [selectedTemplate, setSelectedTemplate] = useState<ReportType>('csrd')
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [orgId, setOrgId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  // Step wizard: 0=type 1=config 2=ready
  const [genStep, setGenStep] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [entriesRes, dashRes, orgsRes] = await Promise.allSettled([
        api.get('/data-entry', { params: { limit: 500 } }),
        api.get('/esg-scoring/dashboard'),
        api.get('/organizations'),
      ])

      const rawEntriesRaw = entriesRes.status === 'fulfilled' ? entriesRes.value.data : null
      const rawEntries: any[] = Array.isArray(rawEntriesRaw)
        ? rawEntriesRaw
        : Array.isArray(rawEntriesRaw?.items) ? rawEntriesRaw.items
        : Array.isArray(rawEntriesRaw?.data) ? rawEntriesRaw.data
        : Array.isArray(rawEntriesRaw?.entries) ? rawEntriesRaw.entries
        : Array.isArray(rawEntriesRaw?.results) ? rawEntriesRaw.results
        : []

      const dash = dashRes.status === 'fulfilled' ? dashRes.value.data : null
      const orgs = orgsRes.status === 'fulfilled'
        ? (orgsRes.value.data?.items ?? orgsRes.value.data?.organizations ?? orgsRes.value.data ?? [])
        : []

      if (orgs.length > 0 && !orgId) setOrgId(orgs[0].id)

      const totalEntries: number = rawEntries.length
      const validated: number = rawEntries.filter((e: any) => e.verification_status === 'verified' || e.value_numeric != null).length
      const score: number =
        dash?.statistics?.average_score ?? dash?.overall_score ?? dash?.score ?? dash?.data?.overall_score ?? 0
      const lastUpdate: string = rawEntries.length > 0
        ? new Date(rawEntries[0].updated_at ?? rawEntries[0].created_at ?? Date.now()).toLocaleDateString('fr-FR')
        : '—'

      setKpis([
        { label: t('reports.kpi.collected', 'Indicateurs collectés'), value: String(totalEntries), color: '#6366f1', icon: BarChart3 },
        { label: t('reports.kpi.completeness', 'Taux de complétude'), value: totalEntries ? `${Math.round((validated / totalEntries) * 100)}%` : '0%', sub: t('reports.kpi.verified', '{{count}} vérifiés', { count: validated }), color: '#10b981', icon: CheckCircle },
        { label: t('reports.kpi.score', 'Score ESG global'), value: score ? `${Math.round(score)}/100` : '—', sub: score >= 60 ? t('reports.rating.good', 'Bon') : score >= 40 ? t('reports.rating.average', 'Moyen') : t('reports.rating.toImprove', 'À améliorer'), color: score >= 60 ? '#10b981' : score >= 40 ? '#f59e0b' : '#f87171', icon: TrendingUp },
        { label: t('reports.kpi.lastUpdate', 'Dernière mise à jour'), value: lastUpdate, color: '#64748b', icon: Clock },
      ])

      setEntries(rawEntries)
      setEsrsData(mapEntriesToESRS(rawEntries, t))
    } catch {
      toast.error(t('reports.toast.loadError', 'Erreur lors du chargement des données'))
    } finally {
      setLoading(false)
    }
  }, [orgId, t])

  useEffect(() => { loadData() }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const resp = await api.post('/reports/generate', {
        report_type: selectedTemplate,
        period: 'annual',
        year: selectedYear,
        format: selectedFormat,
        organization_id: orgId,
      }, { responseType: 'blob' })

      const ext = selectedFormat === 'excel' ? 'xlsx' : selectedFormat === 'json' ? 'json' : selectedFormat
      const url = URL.createObjectURL(new Blob([resp.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `rapport-esg-${selectedTemplate}-${selectedYear}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t('reports.toast.generated', 'Rapport généré et téléchargé !'))
    } catch {
      toast.error(t('reports.toast.genError', 'Erreur lors de la génération du rapport'))
    } finally {
      setGenerating(false)
    }
  }

  const globalPct = esrsData.length
    ? Math.round(
        esrsData.reduce((sum, s) => {
          const t = s.items.length, ok = s.items.filter(i => i.status === 'ok').length
          return sum + (t ? ok / t : 0)
        }, 0) / esrsData.length * 100
      )
    : 0

  const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: t('reports.tab.overview', "Vue d'ensemble"), icon: BarChart3 },
    { id: 'csrd', label: t('reports.tab.csrd', 'Constructeur CSRD'), icon: Shield },
    { id: 'generate', label: t('reports.tab.generate', 'Générer & Exporter'), icon: FileDown },
  ]

  const activeTpl = TEMPLATES.find(t => t.type === selectedTemplate)!
  const activeFormat = FORMATS.find(f => f.id === selectedFormat)!

  return (
    <div className="space-y-6">
      {/* ── Hero Header ───────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-950 to-indigo-900 p-8 text-white shadow-2xl relative">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-20 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/20 backdrop-blur-sm mb-4">
              <FileText size={12} />
              {t('reports.hero.badge', 'Rapports ESG · CSRD 2024 · ESRS')}
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{t('reports.hero.title', 'Rapports & Conformité ESG')}</h1>
            <p className="text-sm text-white/60 max-w-lg mb-6">
              {t('reports.hero.desc', 'Générez des rapports conformes aux normes CSRD, GRI et TCFD directement depuis vos données réelles. Exportez en PDF, Excel ou Word.')}
            </p>

            {/* KPI chips */}
            {!loading && (
              <div className="flex flex-wrap gap-2.5">
                {kpis.map((k, i) => {
                  const Icon = k.icon
                  return (
                    <div key={i} className="flex items-center gap-2 rounded-xl bg-white/8 px-3 py-2 ring-1 ring-white/12 backdrop-blur-sm">
                      <Icon size={13} className="text-white/40" />
                      <span className="text-xs text-white/40">{k.label}</span>
                      <span className="text-sm font-bold" style={{ color: k.color }}>{k.value}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: CSRD readiness ring + per-pillar bars */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            {(() => {
              const r = 52, circ = 2 * Math.PI * r
              const col = globalPct >= 80 ? '#34d399' : globalPct >= 50 ? '#fbbf24' : '#f87171'
              return (
                <svg width="140" height="140" viewBox="0 0 140 140">
                  <defs>
                    <filter id="glow2"><feGaussianBlur stdDeviation="3" result="cb" /><feMerge><feMergeNode in="cb" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                  </defs>
                  <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
                  <circle cx="70" cy="70" r={r} fill="none" stroke={col} strokeWidth="12"
                    strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (globalPct / 100) * circ}
                    transform="rotate(-90 70 70)" filter="url(#glow2)"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                  <text x="70" y="62" textAnchor="middle" fontSize="26" fontWeight="900" fill="white">{globalPct}%</text>
                  <text x="70" y="82" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.5)">{t('reports.hero.csrdConformity', 'conformité CSRD')}</text>
                </svg>
              )
            })()}
            {/* Per-pillar mini bars */}
            {!loading && esrsData.length > 0 && (
              <div className="w-full max-w-[180px] space-y-1.5">
                {[
                  { label: 'E', name: t('reports.pillar.environment', 'Environnement'), items: esrsData.filter(s => s.id.startsWith('E')), color: '#34d399' },
                  { label: 'S', name: t('reports.pillar.social', 'Social'),        items: esrsData.filter(s => s.id.startsWith('S')), color: '#60a5fa' },
                  { label: 'G', name: t('reports.pillar.governance', 'Gouvernance'),   items: esrsData.filter(s => s.id.startsWith('G')), color: '#a78bfa' },
                ].map(({ label, name, items, color }) => {
                  const all = items.flatMap(x => x.items)
                  const ok  = all.filter(x => x.status === 'ok').length
                  const pct = all.length > 0 ? Math.round((ok / all.length) * 100) : 0
                  return (
                    <div key={label} className="flex items-center gap-2" title={`${name} — ${ok}/${all.length}`}>
                      <span className="text-[10px] font-black w-3 text-white/70">{label}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="text-[10px] font-bold tabular-nums w-8 text-right" style={{ color }}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 flex-shrink-0 self-start">
            <button onClick={loadData} className="flex items-center gap-1.5 text-[12px] text-white/60 hover:text-white px-3 py-2 rounded-xl border border-white/15 hover:bg-white/10 transition-all">
              <RefreshCw size={12} /> {t('reports.action.refresh', 'Actualiser')}
            </button>
            <button
              onClick={() => { setTab('generate'); setGenStep(0) }}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 transition-all shadow-lg shadow-violet-900/50"
            >
              <Download size={13} /> {t('reports.action.generateReport', 'Générer un rapport')}
            </button>
            {globalPct < 60 && !loading && (
              <button
                onClick={() => navigate('/app/data-entry')}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-200 px-3 py-2 rounded-xl border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 transition-all"
                title={t('reports.action.completeDataTitle', 'Renseignez vos données ESG pour améliorer la conformité')}
              >
                <AlertTriangle size={12} /> {t('reports.action.completeData', 'Compléter les données')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs bar ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-0.5 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={13} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Tab: Vue d'ensemble                                                   */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Template cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">{t('reports.overview.templates', 'Modèles de rapports')}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{t('reports.overview.templatesSub', '5 standards reconnus disponibles — sélectionnez pour générer')}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {TEMPLATES.map(tpl => {
                const Icon = tpl.icon
                return (
                  <button
                    key={tpl.type}
                    onClick={() => { setSelectedTemplate(tpl.type); setTab('generate'); setGenStep(1) }}
                    className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-200 overflow-hidden"
                  >
                    {/* Top gradient strip */}
                    <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${tpl.gradient} opacity-80`} />

                    {tpl.badge && (
                      <span className={`absolute top-3 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tpl.badgeColor}`}>
                        {tpl.badge}
                      </span>
                    )}

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl mb-3" style={{ background: tpl.lightBg }}>
                      <Icon size={18} style={{ color: tpl.color }} />
                    </div>

                    <p className="text-[13px] font-bold text-slate-800 leading-tight mb-0.5">{tpl.label}</p>
                    <p className="text-[11px] text-slate-400 mb-3">{tpl.sub}</p>

                    <div className="mt-auto space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <FileText size={9} />{tpl.pages}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <Clock size={9} />{tpl.time}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold transition-all duration-100" style={{ color: tpl.color }}>
                      {t('reports.action.generate', 'Générer')} <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* CSRD Readiness */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                  <Shield size={18} className="text-violet-600" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-900">{t('reports.overview.readiness', 'Préparation CSRD')}</h2>
                  <p className="text-[12px] text-slate-400 mt-0.5">{t('reports.overview.readinessSub', 'Complétude de vos données selon les exigences ESRS')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-3xl font-black text-slate-900">{globalPct}<span className="text-lg font-semibold text-slate-400">%</span></p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">{t('reports.overview.globalCompleteness', 'complétude globale')}</p>
                </div>
                <button onClick={() => setTab('csrd')}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-violet-600 hover:text-violet-700 px-4 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 transition-all">
                  {t('reports.overview.viewDetail', 'Voir le détail')} <ArrowRight size={12} />
                </button>
              </div>
            </div>

            {/* Global bar */}
            <div className="px-6 pt-4 pb-2">
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${globalPct}%`, background: globalPct >= 80 ? '#10b981' : globalPct >= 50 ? '#f59e0b' : '#ef4444' }} />
              </div>
            </div>

            {/* Pillar breakdown */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 px-0">
              {[
                { label: t('reports.pillar.environment', 'Environnement'), sub: 'E1–E5', items: esrsData.filter(s => s.id.startsWith('E')), color: '#16a34a', icon: '🌿' },
                { label: t('reports.pillar.social', 'Social'), sub: 'S1–S4', items: esrsData.filter(s => s.id.startsWith('S')), color: '#2563eb', icon: '👥' },
                { label: t('reports.pillar.governance', 'Gouvernance'), sub: 'G1', items: esrsData.filter(s => s.id.startsWith('G')), color: '#6366f1', icon: '🏛️' },
              ].map((pillar, i) => {
                const all = pillar.items.flatMap(s => s.items)
                const ok = all.filter(x => x.status === 'ok').length
                const pct = all.length ? Math.round((ok / all.length) * 100) : 0
                return (
                  <div key={i} className="px-6 py-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{pillar.icon}</span>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-700">{pillar.label}</p>
                        <p className="text-[10px] text-slate-400">{pillar.sub}</p>
                      </div>
                    </div>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-2xl font-black" style={{ color: pillar.color }}>{pct}%</span>
                      <span className="text-[11px] text-slate-400 mb-0.5">{t('reports.overview.indicatorsCount', '{{ok}}/{{total}} indicateurs', { ok, total: all.length })}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: pillar.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tips banner */}
          {globalPct < 60 && (
            <div className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <AlertCircle size={16} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-amber-900">{t('reports.tips.insufficientTitle', 'Complétude insuffisante pour un rapport CSRD complet')}</p>
                <p className="text-[12px] text-amber-700 mt-0.5">{t('reports.tips.insufficientDesc', 'Votre taux de complétude est en dessous de 60%. Complétez vos données dans la saisie manuelle ou via import CSV pour améliorer la qualité du rapport.')}</p>
              </div>
              <button onClick={() => setTab('csrd')}
                className="flex-shrink-0 flex items-center gap-1 text-[12px] font-semibold text-amber-700 hover:text-amber-800 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 transition-colors">
                {t('reports.action.complete', 'Compléter')} <ArrowRight size={11} />
              </button>
            </div>
          )}

          {/* ── Vérifications avant génération ─────────────────────────────── */}
          <DataChecksPanel entries={entries} />

          {/* ── Historique des rapports générés ────────────────────────────── */}
          <ReportHistoryPanel />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Tab: Constructeur CSRD                                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'csrd' && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">{t('reports.csrd.sections', 'Sections ESRS')}</h2>
                <p className="text-[12px] text-slate-400 mt-0.5">{t('reports.csrd.entriesLoaded', '{{count}} entrées chargées', { count: entries.length })} · {t('reports.csrd.validatedIndicators', '{{count}} indicateurs validés', { count: esrsData.reduce((s, e) => s + e.items.filter(i => i.status === 'ok').length, 0) })}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 text-[12px] text-slate-500">
                  <span className="flex items-center gap-1"><Circle size={8} fill="#10b981" stroke="none" /> {t('reports.status.ok', 'Validé')}</span>
                  <span className="flex items-center gap-1"><Circle size={8} fill="#f59e0b" stroke="none" /> {t('reports.status.partial', 'Partiel')}</span>
                  <span className="flex items-center gap-1"><Circle size={8} fill="#cbd5e1" stroke="none" /> {t('reports.status.missing', 'Manquant')}</span>
                </div>
                <button
                  onClick={() => { setTab('generate'); setGenStep(0) }}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-violet-600 hover:text-violet-700 px-3 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 transition-colors"
                >
                  <Download size={12} /> {t('reports.csrd.generateReport', 'Générer le rapport')}
                </button>
              </div>
            </div>

            {/* Global progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-slate-500 font-medium">{t('reports.csrd.globalCompleteness', 'Complétude globale')}</span>
                <span className="text-[12px] font-bold" style={{ color: globalPct >= 80 ? '#16a34a' : globalPct >= 50 ? '#d97706' : '#dc2626' }}>{globalPct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${globalPct}%`, background: globalPct >= 80 ? '#10b981' : globalPct >= 50 ? '#f59e0b' : '#ef4444' }} />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <RefreshCw size={20} className="animate-spin mr-2" /> {t('reports.csrd.loading', 'Chargement des données…')}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {esrsData.map(section => (
                <ESRSCard
                  key={section.id}
                  section={section}
                  expanded={expandedSection === section.id}
                  onToggle={() => setExpandedSection(prev => prev === section.id ? null : section.id)}
                />
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <Sparkles size={22} className="mx-auto text-slate-300 mb-2" />
            <p className="text-[13px] font-semibold text-slate-600 mb-1">{t('reports.csrd.missingData', 'Données manquantes ?')}</p>
            <p className="text-[12px] text-slate-400 mb-4">{t('reports.csrd.missingDataDesc', 'Ajoutez vos données dans Saisie manuelle ou via Import CSV pour améliorer votre conformité ESRS.')}</p>
            <div className="flex items-center justify-center gap-2">
              <a href="/app/data-entry" className="text-[12px] font-medium text-violet-600 hover:text-violet-700 px-4 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 transition-colors">
                {t('reports.action.manualEntry', 'Saisie manuelle')}
              </a>
              <a href="/app/import-csv" className="text-[12px] font-medium text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors">
                {t('reports.action.csvImport', 'Import CSV')}
              </a>
              <button onClick={() => { setTab('generate'); setGenStep(0) }}
                className="text-[12px] font-medium text-white px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 transition-colors">
                {t('reports.csrd.generateAnyway', 'Générer quand même')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Tab: Générer & Exporter                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: wizard ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Step progress */}
            <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
              {[
                { n: 1, label: t('reports.step.type', 'Type de rapport') },
                { n: 2, label: t('reports.step.params', 'Paramètres') },
                { n: 3, label: t('reports.step.generate', 'Générer') },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <button onClick={() => setGenStep(i)} className="flex items-center gap-2 group">
                    <StepBadge n={step.n} active={genStep === i} done={genStep > i} />
                    <span className={`text-[12px] font-medium transition-colors ${genStep === i ? 'text-violet-700' : genStep > i ? 'text-slate-500' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                  </button>
                  {i < 2 && (
                    <div className="flex-1 h-px bg-slate-200 mx-2" />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Type */}
            {genStep === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-[14px] font-bold text-slate-900">{t('reports.gen.chooseType', 'Choisissez le type de rapport')}</h3>
                  <p className="text-[12px] text-slate-400 mt-0.5">{t('reports.gen.chooseTypeSub', 'Sélectionnez le standard de reporting adapté à vos besoins')}</p>
                </div>
                <div className="p-4 space-y-2.5">
                  {TEMPLATES.map(tpl => {
                    const Icon = tpl.icon
                    const selected = selectedTemplate === tpl.type
                    return (
                      <button
                        key={tpl.type}
                        onClick={() => { setSelectedTemplate(tpl.type); setGenStep(1) }}
                        className={`w-full flex items-center gap-4 rounded-xl px-4 py-3.5 border text-left transition-all duration-100 ${
                          selected
                            ? 'border-violet-300 bg-violet-50 ring-1 ring-violet-200'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: tpl.lightBg }}>
                          <Icon size={18} style={{ color: tpl.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-[13px] font-bold ${selected ? 'text-violet-800' : 'text-slate-800'}`}>{tpl.label}</p>
                            {tpl.badge && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tpl.badgeColor}`}>{tpl.badge}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{tpl.desc}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-[10px] text-slate-400">{tpl.pages}</p>
                          <p className="text-[10px] text-slate-400">{tpl.time}</p>
                        </div>
                        {selected
                          ? <CheckCircle size={16} className="text-violet-600 flex-shrink-0" />
                          : <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                        }
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Paramètres */}
            {genStep === 1 && (
              <div className="space-y-4">
                {/* Year */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                  <h3 className="text-[13px] font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    {t('reports.gen.refYear', 'Année de référence')}
                  </h3>
                  <div className="flex gap-2">
                    {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(y => (
                      <button
                        key={y}
                        onClick={() => setSelectedYear(y)}
                        className={`px-6 py-2.5 rounded-xl text-[13px] font-bold border transition-all duration-100 ${
                          selectedYear === y
                            ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-200'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                  <h3 className="text-[13px] font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <FileDown size={14} className="text-slate-400" />
                    {t('reports.gen.exportFormat', "Format d'export")}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {FORMATS.map(f => {
                      const selected = selectedFormat === f.id
                      return (
                        <button
                          key={f.id}
                          onClick={() => setSelectedFormat(f.id)}
                          className={`flex items-start gap-3 rounded-xl p-3.5 border text-left transition-all duration-100 ${
                            selected
                              ? 'border-violet-300 bg-violet-50 ring-1 ring-violet-200'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-base font-bold"
                            style={{ background: f.bg, color: f.color }}>
                            {f.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-[13px] font-bold ${selected ? 'text-violet-800' : 'text-slate-800'}`}>{f.label}</p>
                              {selected && <CheckCircle size={13} className="text-violet-600 flex-shrink-0" />}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">{f.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setGenStep(2)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-[13px] transition-colors shadow-sm shadow-violet-200"
                >
                  {t('reports.gen.continue', 'Continuer')} <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* Step 3: Generate */}
            {genStep === 2 && (
              <div className="space-y-4">
                {/* Recap card */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: activeTpl.lightBg }}>
                      {(() => { const Icon = activeTpl.icon; return <Icon size={20} style={{ color: activeTpl.color }} /> })()}
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-slate-900">{activeTpl.label}</p>
                      <p className="text-[12px] text-slate-400">{activeTpl.sub} · {selectedYear} · {activeFormat.label}</p>
                    </div>
                    {activeTpl.badge && (
                      <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full ${activeTpl.badgeColor}`}>{activeTpl.badge}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                      { label: t('reports.gen.availableData', 'Données disponibles'), value: t('reports.gen.entriesCount', '{{count}} entrées', { count: entries.length }) },
                      { label: t('reports.gen.csrdCompleteness', 'Complétude CSRD'), value: `${globalPct}%` },
                      { label: t('reports.gen.format', 'Format'), value: `${activeFormat.label} (${activeFormat.ext})` },
                      { label: t('reports.gen.estimatedLength', 'Longueur estimée'), value: activeTpl.pages },
                    ].map((row, i) => (
                      <div key={i} className="flex flex-col gap-0.5 rounded-xl bg-slate-50 px-4 py-3">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide">{row.label}</span>
                        <span className="text-[13px] font-bold text-slate-800">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Conformity banner */}
                  <div className={`rounded-xl p-4 mb-5 ${globalPct >= 80 ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
                    <div className="flex items-start gap-3">
                      <Sparkles size={15} className={globalPct >= 80 ? 'text-emerald-600 flex-shrink-0 mt-0.5' : 'text-amber-600 flex-shrink-0 mt-0.5'} />
                      <div>
                        <p className={`text-[12px] font-bold ${globalPct >= 80 ? 'text-emerald-800' : 'text-amber-800'}`}>
                          {globalPct >= 80 ? t('reports.gen.excellentTitle', 'Excellent niveau de conformité CSRD') : t('reports.gen.partialTitle', 'Complétude partielle — rapport généré avec les données disponibles')}
                        </p>
                        <p className={`text-[11px] mt-0.5 ${globalPct >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {globalPct >= 80
                            ? t('reports.gen.excellentDesc', 'Vos données couvrent {{pct}}% des exigences ESRS. Le rapport sera complet et conforme.', { pct: globalPct })
                            : t('reports.gen.partialDesc', 'Seulement {{pct}}% des indicateurs ESRS sont renseignés. Le rapport mentionnera les données manquantes.', { pct: globalPct })
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-[15px] shadow-lg shadow-violet-200 transition-all duration-150"
                  >
                    {generating
                      ? <><RefreshCw size={16} className="animate-spin" /> {t('reports.gen.generating', 'Génération en cours…')}</>
                      : <><Download size={16} /> {t('reports.gen.generateDownload', 'Générer & Télécharger — {{label}} {{year}}', { label: activeTpl.label, year: selectedYear })}</>
                    }
                  </button>
                </div>

                {/* Edit steps */}
                <div className="flex gap-2">
                  <button onClick={() => setGenStep(0)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    {t('reports.gen.changeType', '← Changer de type')}
                  </button>
                  <button onClick={() => setGenStep(1)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    {t('reports.gen.changeParams', 'Changer les paramètres →')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: summary panel ─────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Config summary */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
              <h3 className="text-[13px] font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Star size={13} className="text-violet-500" />
                {t('reports.gen.currentConfig', 'Configuration actuelle')}
              </h3>
              <div className="space-y-3">
                {[
                  { label: t('reports.step.type', 'Type de rapport'), value: activeTpl.label },
                  { label: t('reports.gen.year', 'Année'), value: String(selectedYear) },
                  { label: t('reports.gen.format', 'Format'), value: `${activeFormat.label} ${activeFormat.ext}` },
                  { label: t('reports.gen.data', 'Données'), value: t('reports.gen.entriesCount', '{{count}} entrées', { count: entries.length }) },
                  { label: t('reports.gen.csrdCompliance', 'Conformité CSRD'), value: `${globalPct}%` },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-[11px] text-slate-400">{row.label}</span>
                    <span className="text-[12px] font-semibold text-slate-800">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-violet-600" />
                <p className="text-[12px] font-bold text-violet-800">{t('reports.gen.tips', 'Conseils')}</p>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <CheckCircle size={11} className="text-violet-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-violet-700">{t('reports.gen.tip1', 'Le format PDF est recommandé pour les rapports officiels et les présentations aux investisseurs.')}</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={11} className="text-violet-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-violet-700">{t('reports.gen.tip2', "Excel vous permet d'effectuer des analyses complémentaires sur vos données ESG.")}</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle size={11} className="text-violet-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-violet-700">{t('reports.gen.tip3', "Complétez d'abord vos données ESRS pour maximiser la qualité du rapport.")}</p>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
              <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-3">{t('reports.gen.otherActions', 'Autres actions')}</h3>
              <div className="space-y-1.5">
                {[
                  { label: t('reports.gen.linkComplete', 'Compléter les données ESRS'), path: () => setTab('csrd'), icon: Shield },
                  { label: t('reports.gen.linkManual', 'Saisie manuelle ESG'), path: () => window.location.href = '/app/data-entry', icon: FileText },
                  { label: t('reports.action.csvImport', 'Import CSV'), path: () => window.location.href = '/app/import-csv', icon: Database },
                ].map((link, i) => {
                  const Icon = link.icon
                  return (
                    <button key={i} onClick={link.path}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-[12px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors group">
                      <Icon size={13} className="text-slate-400 group-hover:text-violet-500 transition-colors flex-shrink-0" />
                      {link.label}
                      <ChevronRight size={11} className="ml-auto text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Missing import shim ──────────────────────────────────────────────────────
function Database({ size, className }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 16} height={size ?? 16} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </svg>
  )
}
