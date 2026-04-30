/**
 * ReportsUnified — Page unifiée Rapports CSRD + Constructeur
 * Remplace ReportsDashboard + CSRDReportBuilder
 */
import { useState, useEffect, useCallback } from 'react'
import {
  FileText, Download, Shield, Globe, TrendingUp, Leaf,
  Calendar, CheckCircle, AlertCircle, Clock, ChevronRight,
  BarChart3, RefreshCw, Zap, Building2, Users, Droplets,
  Recycle, TreePine, Scale, AlertTriangle, FileDown,
  Sparkles, Info, Circle,
} from 'lucide-react'
import api from '@/services/api'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'csrd' | 'generate'
type ExportFormat = 'pdf' | 'excel' | 'word' | 'json'
type ReportType = 'csrd' | 'executive' | 'detailed' | 'gri' | 'tcfd'

interface KPI { label: string; value: string; sub?: string; color: string }
interface ESRSEntry {
  id: string; name: string; icon: React.ElementType; color: string; bg: string
  items: { code: string; name: string; value: string | null; unit: string; status: 'ok' | 'partial' | 'missing' }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function matchesKeywords(text: string, kws: string[]) {
  const t = text.toLowerCase()
  return kws.some(k => t.includes(k.toLowerCase()))
}

function mapEntriesToESRS(entries: any[]): ESRSEntry[] {
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

  const sections: ESRSEntry[] = [
    {
      id: 'E1', name: 'Changement climatique', icon: Zap, color: '#dc2626', bg: '#fef2f2',
      items: [
        ...pick(env, ['scope 1', 'scope1', 'ghg', 'ges', 'carbone', 'co2', 'émission']),
        ...pick(env, ['énergie renouvelable', 'renewable', 'énergie']),
        ...pick(env, ['intensité carbone', 'objectif']),
      ].slice(0, 8).map(toItem),
    },
    {
      id: 'E2', name: 'Pollution', icon: AlertTriangle, color: '#ea580c', bg: '#fff7ed',
      items: pick(env, ['pollution', 'déchets', 'rejet', 'atmosphérique', 'sol']).map(toItem),
    },
    {
      id: 'E3', name: 'Ressources marines & aquatiques', icon: Droplets, color: '#0891b2', bg: '#ecfeff',
      items: pick(env, ['eau', 'hydrique', 'water', 'aqua']).map(toItem),
    },
    {
      id: 'E4', name: 'Biodiversité', icon: TreePine, color: '#16a34a', bg: '#f0fdf4',
      items: pick(env, ['biodiversité', 'écosystème', 'faune', 'site protégé']).map(toItem),
    },
    {
      id: 'E5', name: 'Économie circulaire', icon: Recycle, color: '#7c3aed', bg: '#faf5ff',
      items: pick(env, ['recyclage', 'circul', 'déchet', 'réemploi']).map(toItem),
    },
    {
      id: 'S1', name: 'Effectifs propres', icon: Users, color: '#2563eb', bg: '#eff6ff',
      items: pick(soc, ['effectif', 'salarié', 'formation', 'accident', 'turnover', 'femme', 'parité']).map(toItem),
    },
    {
      id: 'S2', name: 'Chaîne de valeur', icon: Globe, color: '#0284c7', bg: '#f0f9ff',
      items: pick(soc, ['fournisseur', 'chaîne', 'supply', 'sous-traitant']).map(toItem),
    },
    {
      id: 'S3', name: 'Communautés', icon: Building2, color: '#0d9488', bg: '#f0fdfa',
      items: pick(soc, ['communauté', 'local', 'territoire', 'riverain']).map(toItem),
    },
    {
      id: 'G1', name: 'Gouvernance des affaires', icon: Scale, color: '#6366f1', bg: '#eef2ff',
      items: gov.map(toItem),
    },
  ]

  return sections
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'ok' | 'partial' | 'missing' }) {
  if (status === 'ok') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle size={9} /> Validé
    </span>
  )
  if (status === 'partial') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-200">
      <Clock size={9} /> Partiel
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 ring-1 ring-slate-200">
      <AlertCircle size={9} /> Manquant
    </span>
  )
}

// ─── Completion ring ──────────────────────────────────────────────────────────

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

// ─── ESRS Section card ────────────────────────────────────────────────────────

function ESRSCard({ section, expanded, onToggle }: {
  section: ESRSEntry; expanded: boolean; onToggle: () => void
}) {
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
          <p className="text-[11px] text-slate-400 mt-0.5">{total} indicateur{total !== 1 ? 's' : ''} · {ok} validé{ok !== 1 ? 's' : ''}</p>
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
        <div className="border-t border-slate-100 px-4 py-4 text-center">
          <Info size={16} className="mx-auto text-slate-300 mb-1" />
          <p className="text-[12px] text-slate-400">Aucune donnée disponible pour cette section.</p>
          <p className="text-[11px] text-slate-300 mt-0.5">Ajoutez des données dans Saisie manuelle.</p>
        </div>
      )}
    </div>
  )
}

// ─── Report template card ──────────────────────────────────────────────────────

const TEMPLATES = [
  { type: 'csrd' as ReportType, label: 'CSRD / ESRS 2024', sub: 'Directive européenne', icon: Shield, color: '#6366f1', bg: '#eef2ff', badge: 'Recommandé' },
  { type: 'executive' as ReportType, label: 'Résumé exécutif', sub: 'Vision synthétique', icon: BarChart3, color: '#0284c7', bg: '#eff6ff', badge: null },
  { type: 'detailed' as ReportType, label: 'Rapport détaillé', sub: 'Analyse complète', icon: FileText, color: '#0d9488', bg: '#f0fdfa', badge: null },
  { type: 'gri' as ReportType, label: 'GRI Standards 2021', sub: 'Global Reporting', icon: Globe, color: '#16a34a', bg: '#f0fdf4', badge: null },
  { type: 'tcfd' as ReportType, label: 'TCFD', sub: 'Risques climatiques', icon: Leaf, color: '#d97706', bg: '#fffbeb', badge: null },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReportsUnified() {
  const [tab, setTab] = useState<TabId>('overview')
  const [entries, setEntries] = useState<any[]>([])
  const [esrsData, setEsrsData] = useState<ESRSEntry[]>([])
  const [kpis, setKpis] = useState<KPI[]>([])
  const [expandedSection, setExpandedSection] = useState<string | null>('E1')
  const [selectedTemplate, setSelectedTemplate] = useState<ReportType>('csrd')
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [orgId, setOrgId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

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
        dash?.statistics?.average_score ??
        dash?.overall_score ??
        dash?.score ??
        dash?.data?.overall_score ??
        0
      const lastUpdate: string = rawEntries.length > 0
        ? new Date(rawEntries[0].updated_at ?? rawEntries[0].created_at ?? Date.now()).toLocaleDateString('fr-FR')
        : '—'

      setKpis([
        { label: 'Indicateurs collectés', value: String(totalEntries), color: '#6366f1' },
        { label: 'Taux de complétude', value: totalEntries ? `${Math.round((validated / totalEntries) * 100)}%` : '0%', sub: `${validated} vérifiés`, color: '#10b981' },
        { label: 'Score ESG global', value: score ? `${Math.round(score)}/100` : '—', sub: score >= 60 ? 'Bon' : score >= 40 ? 'Moyen' : 'À améliorer', color: score >= 60 ? '#10b981' : score >= 40 ? '#f59e0b' : '#f87171' },
        { label: 'Dernière mise à jour', value: lastUpdate, color: '#64748b' },
      ])

      setEntries(rawEntries)
      setEsrsData(mapEntriesToESRS(rawEntries))
    } catch {
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }, [orgId])

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
      toast.success('Rapport généré et téléchargé !')
    } catch {
      toast.error('Erreur lors de la génération du rapport')
    } finally {
      setGenerating(false)
    }
  }

  // ── Global completion for CSRD ──────────────────────────────────────────────
  const globalPct = esrsData.length
    ? Math.round(
        esrsData.reduce((sum, s) => {
          const t = s.items.length, ok = s.items.filter(i => i.status === 'ok').length
          return sum + (t ? ok / t : 0)
        }, 0) / esrsData.length * 100
      )
    : 0

  const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'csrd', label: 'Constructeur CSRD', icon: Shield },
    { id: 'generate', label: 'Générer & Exporter', icon: FileDown },
  ]

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#e8ecf0] shadow-card px-6 py-5">
        <div>
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <FileText size={14} className="text-violet-600" />
                </div>
                <h1 className="text-xl font-bold text-slate-900">Rapports ESG</h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">CSRD 2024</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">ESRS</span>
              </div>
              <p className="text-[13px] text-slate-500">Générez des rapports conformes aux normes CSRD, GRI et TCFD depuis vos données réelles</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadData} className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all duration-100">
                <RefreshCw size={12} /> Actualiser
              </button>
              <button
                onClick={() => { setTab('generate'); }}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-white px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 transition-all duration-100 shadow-sm shadow-violet-200"
              >
                <Download size={12} /> Générer un rapport
              </button>
            </div>
          </div>

          {/* KPI strip */}
          {!loading && (
            <div className="grid grid-cols-4 gap-3 mb-5">
              {kpis.map((k, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-medium text-slate-400 mb-1">{k.label}</p>
                  <p className="text-[22px] font-black leading-none" style={{ color: k.color }}>{k.value}</p>
                  {k.sub && <p className="text-[10px] text-slate-400 mt-1">{k.sub}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-0.5 bg-slate-100 rounded-xl p-1 w-fit">
            {TABS.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                    tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon size={13} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div>

        {/* ── Tab: Vue d'ensemble ──────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Templates */}
            <div>
              <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Modèles disponibles</h2>
              <div className="grid grid-cols-5 gap-3">
                {TEMPLATES.map(tpl => {
                  const Icon = tpl.icon
                  return (
                    <button
                      key={tpl.type}
                      onClick={() => { setSelectedTemplate(tpl.type); setTab('generate') }}
                      className="group flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200"
                    >
                      <div className="flex w-full items-start justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: tpl.bg }}>
                          <Icon size={16} style={{ color: tpl.color }} />
                        </div>
                        {tpl.badge && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">{tpl.badge}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-slate-800 leading-tight">{tpl.label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{tpl.sub}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-medium mt-auto" style={{ color: tpl.color }}>
                        Générer <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform duration-100" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* CSRD Readiness */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h2 className="text-[14px] font-bold text-slate-900">Préparation CSRD</h2>
                  <p className="text-[12px] text-slate-400 mt-0.5">Taux de complétude global de vos données ESRS</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-900">{globalPct}<span className="text-base font-semibold text-slate-400">%</span></p>
                    <p className="text-[10px] text-slate-400">complétude globale</p>
                  </div>
                  <button onClick={() => setTab('csrd')} className="flex items-center gap-1.5 text-[12px] font-medium text-violet-600 hover:text-violet-700 px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 transition-all duration-100">
                    Voir le détail <ChevronRight size={11} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-100">
                {[
                  { label: 'Environnement (E1–E5)', items: esrsData.filter(s => s.id.startsWith('E')) },
                  { label: 'Social (S1–S4)', items: esrsData.filter(s => s.id.startsWith('S')) },
                  { label: 'Gouvernance (G1)', items: esrsData.filter(s => s.id.startsWith('G')) },
                ].map((pillar, i) => {
                  const all = pillar.items.flatMap(s => s.items)
                  const ok = all.filter(x => x.status === 'ok').length
                  const pct = all.length ? Math.round((ok / all.length) * 100) : 0
                  const colors = ['#16a34a', '#2563eb', '#6366f1']
                  return (
                    <div key={i} className="px-5 py-4">
                      <p className="text-[11px] font-semibold text-slate-500 mb-2">{pillar.label}</p>
                      <div className="flex items-end gap-2">
                        <span className="text-xl font-black" style={{ color: colors[i] }}>{pct}%</span>
                        <span className="text-[11px] text-slate-400 mb-0.5">{ok}/{all.length} indicateurs</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: colors[i] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Constructeur CSRD ───────────────────────────────────────── */}
        {tab === 'csrd' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">Sections ESRS</h2>
                <p className="text-[12px] text-slate-400">Données réelles issues de vos saisies — {entries.length} entrées chargées</p>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-slate-500">
                <Circle size={8} fill="#10b981" stroke="none" /> Validé
                <Circle size={8} fill="#f59e0b" stroke="none" /> Partiel
                <Circle size={8} fill="#cbd5e1" stroke="none" /> Manquant
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <RefreshCw size={20} className="animate-spin mr-2" /> Chargement des données…
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

            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center">
              <Sparkles size={20} className="mx-auto text-slate-300 mb-2" />
              <p className="text-[13px] font-semibold text-slate-600">Données manquantes ?</p>
              <p className="text-[12px] text-slate-400 mt-1">Ajoutez vos données dans <strong>Saisie manuelle</strong> ou via <strong>Import CSV</strong>.</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <a href="/app/data-entry" className="text-[12px] font-medium text-violet-600 hover:text-violet-700 px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 transition-colors duration-100">
                  Saisie manuelle
                </a>
                <a href="/app/import-csv" className="text-[12px] font-medium text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors duration-100">
                  Import CSV
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Générer & Exporter ──────────────────────────────────────── */}
        {tab === 'generate' && (
          <div className="grid grid-cols-3 gap-6">
            {/* Config panel */}
            <div className="col-span-2 space-y-5">
              {/* Report type */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                <h3 className="text-[13px] font-bold text-slate-900 mb-3">Type de rapport</h3>
                <div className="grid grid-cols-3 gap-2">
                  {TEMPLATES.map(tpl => {
                    const Icon = tpl.icon
                    const selected = selectedTemplate === tpl.type
                    return (
                      <button
                        key={tpl.type}
                        onClick={() => setSelectedTemplate(tpl.type)}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 border text-left transition-all duration-100 ${
                          selected
                            ? 'border-violet-300 bg-violet-50 ring-1 ring-violet-200'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: tpl.bg }}>
                          <Icon size={13} style={{ color: tpl.color }} />
                        </div>
                        <div>
                          <p className={`text-[12px] font-semibold ${selected ? 'text-violet-800' : 'text-slate-700'}`}>{tpl.label}</p>
                          <p className="text-[10px] text-slate-400">{tpl.sub}</p>
                        </div>
                        {selected && <CheckCircle size={13} className="ml-auto text-violet-600 flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Period & Format */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                  <h3 className="text-[13px] font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-400" /> Année de référence
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(y => (
                      <button
                        key={y}
                        onClick={() => setSelectedYear(y)}
                        className={`px-4 py-2 rounded-xl text-[13px] font-semibold border transition-all duration-100 ${
                          selectedYear === y
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                  <h3 className="text-[13px] font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                    <FileDown size={13} className="text-slate-400" /> Format d'export
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {(['pdf', 'excel', 'word', 'json'] as ExportFormat[]).map(f => (
                      <button
                        key={f}
                        onClick={() => setSelectedFormat(f)}
                        className={`py-2 rounded-xl text-[12px] font-semibold border transition-all duration-100 uppercase ${
                          selectedFormat === f
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-[14px] shadow-lg shadow-violet-200 transition-all duration-150"
              >
                {generating
                  ? <><RefreshCw size={15} className="animate-spin" /> Génération en cours…</>
                  : <><Download size={15} /> Générer le rapport {selectedTemplate.toUpperCase()} {selectedYear}</>
                }
              </button>
            </div>

            {/* Summary panel */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                <h3 className="text-[13px] font-bold text-slate-900 mb-4">Récapitulatif</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Type', value: TEMPLATES.find(t => t.type === selectedTemplate)?.label ?? '—' },
                    { label: 'Année', value: String(selectedYear) },
                    { label: 'Format', value: selectedFormat.toUpperCase() },
                    { label: 'Données', value: `${entries.length} entrées` },
                    { label: 'Complétude CSRD', value: `${globalPct}%` },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[12px] text-slate-500">{row.label}</span>
                      <span className="text-[12px] font-semibold text-slate-800">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className="text-violet-600" />
                  <p className="text-[12px] font-bold text-violet-800">Conformité CSRD</p>
                </div>
                <p className="text-[11px] text-violet-600 leading-relaxed">
                  Vos données couvrent <strong>{globalPct}%</strong> des exigences ESRS.
                  {globalPct < 80 && ' Complétez vos saisies pour améliorer la conformité.'}
                  {globalPct >= 80 && ' Excellent niveau de conformité !'}
                </p>
                <div className="mt-3 h-1.5 rounded-full bg-violet-200 overflow-hidden">
                  <div className="h-full rounded-full bg-violet-500 transition-all duration-700" style={{ width: `${globalPct}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
