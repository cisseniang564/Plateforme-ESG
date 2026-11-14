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
import { Badge } from '@/components/common'
import { buildMeasures, coverageBar, coverageTone, missingText, statusMeta, type GapAnalysis } from './reportsHelpers'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'csrd' | 'generate'
type ExportFormat = 'pdf' | 'excel' | 'word' | 'json'
type ReportType = 'csrd' | 'executive' | 'detailed' | 'gri' | 'tcfd' | 'vsme'

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
    desc: t('reports.tpl.gri.desc', 'Rapport structuré selon les standards GRI avec index de contenu et références croisées.'),
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
    type: 'vsme' as ReportType,
    label: 'VSME',
    sub: t('reports.tpl.vsme.sub', 'Standard volontaire PME'),
    desc: t('reports.tpl.vsme.desc', 'Modules B1–B11 : la réponse structurée aux demandes de vos clients, banques et investisseurs.'),
    icon: FileText,
    gradient: 'from-lime-500 to-green-600',
    lightBg: '#f7fee7',
    color: '#65a30d',
    badge: t('reports.tpl.vsme.badge', 'PME'),
    badgeColor: 'bg-lime-100 text-lime-700',
    pages: '8-14 pages',
    time: '~10s',
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
  const [gap, setGap] = useState<GapAnalysis | null>(null)
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
      const [entriesRes, orgsRes, gapRes] = await Promise.allSettled([
        api.get('/data-entry/', { params: { limit: 500 } }),
        api.get('/organizations'),
        // Couverture ESRS : le même calcul que sur l'accueil, côté serveur.
        api.get('/esrs/gap-analysis'),
      ])

      const rawEntriesRaw = entriesRes.status === 'fulfilled' ? entriesRes.value.data : null
      const rawEntries: any[] = Array.isArray(rawEntriesRaw)
        ? rawEntriesRaw
        : Array.isArray(rawEntriesRaw?.items) ? rawEntriesRaw.items
        : Array.isArray(rawEntriesRaw?.data) ? rawEntriesRaw.data
        : Array.isArray(rawEntriesRaw?.entries) ? rawEntriesRaw.entries
        : Array.isArray(rawEntriesRaw?.results) ? rawEntriesRaw.results
        : []

      const orgs = orgsRes.status === 'fulfilled'
        ? (orgsRes.value.data?.items ?? orgsRes.value.data?.organizations ?? orgsRes.value.data ?? [])
        : []

      if (orgs.length > 0 && !orgId) setOrgId(orgs[0].id)

      setGap(gapRes.status === 'fulfilled' && Array.isArray(gapRes.value.data?.sections) ? gapRes.value.data : null)

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
    // Le rapport VSME n'existe qu'en PDF : Excel et Word ne suivent pas sa structure B1–B11.
    const effectiveFormat: ExportFormat = selectedTemplate === 'vsme' && selectedFormat !== 'pdf' && selectedFormat !== 'json' ? 'pdf' : selectedFormat
    if (effectiveFormat !== selectedFormat) toast(t('reports.vsmePdfOnly', 'Le rapport VSME est généré en PDF.'))
    try {
      const resp = await api.post('/reports/generate', {
        report_type: selectedTemplate,
        period: 'annual',
        year: selectedYear,
        format: effectiveFormat,
        organization_id: orgId,
      }, { responseType: 'blob' })

      const ext = effectiveFormat === 'excel' ? 'xlsx' : effectiveFormat === 'json' ? 'json' : effectiveFormat
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

  // Un seul chiffre de couverture ESRS dans toute l'application : celui de l'analyse serveur.
  const measures = buildMeasures(entries, gap)
  const globalPct = measures.coveragePct ?? 0

  const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: t('reports.tab.overview', "Vue d'ensemble"), icon: BarChart3 },
    { id: 'csrd', label: t('reports.tab.csrd', 'Constructeur CSRD'), icon: Shield },
    { id: 'generate', label: t('reports.tab.generate', 'Générer & Exporter'), icon: FileDown },
  ]

  const activeTpl = TEMPLATES.find(t => t.type === selectedTemplate)!
  const activeFormat = FORMATS.find(f => f.id === selectedFormat)!

  return (
    <div className="space-y-6">
      {/* ── En-tête : un titre, une action principale ────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{t('reports.v2.title', 'Rapports')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">{t('reports.v2.subtitle', 'Générez un rapport à partir de vos données et voyez ce qu’il manque avant de l’envoyer.')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">
            <RefreshCw size={14} aria-hidden="true" /> {t('reports.action.refresh', 'Actualiser')}
          </button>
          <button onClick={() => { setTab('generate'); setGenStep(0) }} className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">
            <Download size={14} aria-hidden="true" /> {t('reports.action.generateReport', 'Générer un rapport')}
          </button>
        </div>
      </header>

      {/* ── Deux mesures, nommées sans ambiguïté ─────────────────────────────── */}
      {!loading && (
        <section aria-label={t('reports.v2.measures', 'Mesures')} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-600">{t('reports.v2.entered', 'Données saisies')}</p>
            <p className="mt-2 text-3xl font-bold leading-none tabular-nums text-gray-900">{measures.entered} <span className="text-sm font-medium text-gray-600">{t('reports.v2.indicators', 'indicateurs')}</span></p>
            <p className="mt-2 text-[13px] text-gray-600">{t('reports.v2.enteredHint', 'Ce que vous avez renseigné · {{count}} vérifiés', { count: measures.verified })}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-600">{t('reports.v2.covered', 'Exigences ESRS couvertes')}</p>
              {measures.coveragePct !== null && <Badge tone={coverageTone(measures.coveragePct)}>{measures.coveragePct >= 80 ? t('reports.v2.good', 'Bonne couverture') : t('reports.v2.toReinforce', 'À renforcer')}</Badge>}
            </div>
            <p className="mt-2 text-3xl font-bold leading-none tabular-nums text-gray-900">{measures.coveragePct !== null ? `${measures.coveragePct} %` : '—'}</p>
            <p className="mt-2 text-[13px] text-gray-600">
              {measures.coveragePct !== null
                ? t('reports.v2.coveredHint', '{{covered}} exigences sur {{total}} mesurables sont remplies par vos données', { covered: measures.covered, total: measures.measurable })
                : t('reports.v2.coveredNone', 'Analyse ESRS indisponible pour le moment')}
            </p>
          </div>
        </section>
      )}

      {/* ── Onglets ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200" role="tablist" aria-label={t('reports.v2.sections', 'Sections')}>
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm font-semibold ${
                tab === t.id ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={14} aria-hidden="true" />
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
          {/* État par section ESRS (analyse serveur) */}
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white" aria-labelledby="esrs-state">
            <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div>
                <h2 id="esrs-state" className="text-[15px] font-semibold text-gray-900">{t('reports.v2.stateTitle', 'État par section ESRS')}</h2>
                <p className="mt-1 text-[13px] text-gray-600">{t('reports.v2.stateHint', 'Les sections prêtes peuvent être rédigées. Les autres indiquent la donnée manquante.')}</p>
              </div>
              <button onClick={() => navigate('/app/esrs-gap')} className="text-sm font-semibold text-emerald-800 hover:underline">{t('reports.v2.detail', 'Analyse détaillée')}</button>
            </div>
            {gap && gap.sections.length > 0 ? (
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
                    <th scope="col" className="px-5 py-2.5">{t('reports.v2.colSection', 'Section ESRS')}</th>
                    <th scope="col" className="px-3 py-2.5">{t('reports.v2.colCoverage', 'Couverture')}</th>
                    <th scope="col" className="px-3 py-2.5">{t('reports.v2.colStatus', 'Statut')}</th>
                    <th scope="col" className="px-3 py-2.5">{t('reports.v2.colMissing', 'Ce qui manque')}</th>
                    <th scope="col" className="px-5 py-2.5"><span className="sr-only">Action</span></th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {gap.sections.map(sec => {
                      const m = statusMeta(sec.status)
                      return (
                        <tr key={sec.code}>
                          <td className="px-5 py-3"><b className="text-gray-900">{String(sec.code).replace(/^ESRS\s*(?=[A-Z])/i, '')}</b> <span className="text-gray-700">{sec.label}</span></td>
                          <td className="w-48 px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 rounded-full bg-gray-200" role="img" aria-label={`${sec.label} : ${sec.coverage_pct} %`}><div className="h-2 rounded-full" style={{ width: `${sec.coverage_pct}%`, background: coverageBar(sec.coverage_pct) }} /></div>
                              <span className="w-12 whitespace-nowrap text-right text-[13px] font-semibold tabular-nums text-gray-900">{sec.coverage_pct} %</span>
                            </div>
                          </td>
                          <td className="px-3 py-3"><Badge tone={m.tone}>{m.label}</Badge></td>
                          <td className="px-3 py-3 text-[13px] text-gray-700">{missingText(sec)}</td>
                          <td className="px-5 py-3 text-right"><button onClick={() => navigate(sec.status === 'ready' ? '/app/esrs-gap' : '/app/data-entry')} className="text-[13px] font-semibold text-emerald-800 hover:underline">{m.action}</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 pb-5 text-sm text-gray-600">{t('reports.v2.noGap', 'L’analyse ESRS n’est pas disponible pour le moment. Vous pouvez tout de même générer un rapport.')}</p>
            )}
          </section>

          {/* Avertissement : seulement quand la couverture est basse et connue */}
          {measures.coveragePct !== null && measures.coveragePct < 60 && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-5 py-4 text-amber-900" role="note">
              <AlertCircle size={18} className="flex-none" aria-hidden="true" />
              <p className="flex-1 text-sm"><b>{t('reports.v2.lowTitle', 'Couverture inférieure à 60 %.')}</b> {t('reports.v2.lowDesc', 'Le rapport sera généré avec les données disponibles et signalera celles qui manquent.')}</p>
              <button onClick={() => navigate('/app/data-entry')} className="text-sm font-semibold text-amber-900 underline">{t('reports.action.completeData', 'Compléter les données')}</button>
            </div>
          )}

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
                    className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-5 text-left hover:border-gray-400 transition-colors overflow-hidden"
                  >
                    {tpl.badge && (
                      <span className={`absolute top-3 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tpl.badgeColor}`}>
                        {tpl.badge}
                      </span>
                    )}

                    <div className="flex h-10 w-10 items-center justify-center rounded-lg mb-3 bg-gray-100">
                      <Icon size={18} className="text-gray-700" aria-hidden="true" />
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

                    <div className="mt-3 flex items-center gap-1 text-[13px] font-semibold text-emerald-800 transition-all duration-100">
                      {t('reports.action.generate', 'Générer')} <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

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
                className="text-[12px] font-medium text-white px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 transition-colors">
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
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-[13px] transition-colors shadow-sm shadow-primary-200"
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
                      { label: t('reports.v2.covered', 'Exigences ESRS couvertes'), value: `${globalPct}%` },
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
                          {globalPct >= 80 ? t('reports.v2.excellentTitle', 'Excellente couverture des exigences ESRS') : t('reports.v2.partialTitle', 'Couverture partielle : rapport généré avec les données disponibles')}
                        </p>
                        <p className={`text-[11px] mt-0.5 ${globalPct >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {globalPct >= 80
                            ? t('reports.v2.excellentDesc', 'Vos données couvrent {{pct}} % des exigences ESRS mesurables. Le rapport sera complet.', { pct: globalPct })
                            : t('reports.v2.partialDesc', '{{pct}} % des exigences ESRS mesurables sont couvertes. Le rapport mentionnera les données manquantes.', { pct: globalPct })
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
                  { label: t('reports.v2.covered', 'Exigences ESRS couvertes'), value: `${globalPct}%` },
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
