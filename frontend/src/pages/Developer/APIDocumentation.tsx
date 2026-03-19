import { useState } from 'react'
import {
  Code,
  Key,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Database,
  BarChart3,
  FileText,
  Webhook,
  ChevronRight,
  Terminal,
  Globe,
  Zap,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionId = 'auth' | 'indicators' | 'data' | 'scores' | 'reports' | 'webhooks'

interface NavSection {
  id: SectionId
  label: string
  icon: React.ReactNode
}

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  description: string
}

interface DocSection {
  title: string
  description: string
  endpoints: Endpoint[]
  curlExample: string
  responseExample: string
}

// ─── Navigation config ────────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  { id: 'auth', label: 'Authentification', icon: <Shield className="h-4 w-4" /> },
  { id: 'indicators', label: 'Indicateurs', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'data', label: 'Données', icon: <Database className="h-4 w-4" /> },
  { id: 'scores', label: 'Scores', icon: <Zap className="h-4 w-4" /> },
  { id: 'reports', label: 'Rapports', icon: <FileText className="h-4 w-4" /> },
  { id: 'webhooks', label: 'Webhooks', icon: <Webhook className="h-4 w-4" /> },
]

// ─── Documentation content ────────────────────────────────────────────────────

const DOC_SECTIONS: Record<SectionId, DocSection> = {
  auth: {
    title: 'Authentification',
    description:
      "L'API ESGFlow utilise JWT (JSON Web Token) pour sécuriser les échanges. Obtenez un token via l'endpoint de login et transmettez-le dans l'en-tête Authorization de chaque requête.",
    endpoints: [
      { method: 'POST', path: '/api/v1/auth/login', description: 'Obtenir un token JWT' },
      { method: 'POST', path: '/api/v1/auth/refresh', description: 'Rafraîchir le token' },
      { method: 'POST', path: '/api/v1/auth/logout', description: 'Révoquer le token' },
    ],
    curlExample: `curl -X POST https://api.esgflow.io/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@co.fr","password":"..."}'`,
    responseExample: `{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}`,
  },
  indicators: {
    title: 'Indicateurs',
    description:
      "Accédez au référentiel complet des indicateurs ESG. Chaque indicateur est associé à un pilier (environmental, social, governance), une unité de mesure et un cadre de référence (CSRD, GRI, TCFD…).",
    endpoints: [
      { method: 'GET', path: '/api/v1/indicators', description: 'Lister tous les indicateurs' },
      { method: 'GET', path: '/api/v1/indicators/{id}', description: "Détail d'un indicateur" },
      { method: 'POST', path: '/api/v1/indicators', description: 'Créer un indicateur personnalisé' },
      { method: 'PUT', path: '/api/v1/indicators/{id}', description: 'Mettre à jour un indicateur' },
    ],
    curlExample: `curl -X GET https://api.esgflow.io/api/v1/indicators \\
  -H "Authorization: Bearer {token}" \\
  -H "Accept: application/json"`,
    responseExample: `[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "code": "ENV-001",
    "name": "Émissions CO2",
    "pillar": "environmental",
    "unit": "tCO2e",
    "framework": "GRI 305-1",
    "required_csrd": true
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "code": "SOC-001",
    "name": "Part de femmes cadres",
    "pillar": "social",
    "unit": "%",
    "framework": "GRI 405-1",
    "required_csrd": true
  }
]`,
  },
  data: {
    title: 'Données',
    description:
      "Enregistrez et consultez les valeurs de vos indicateurs ESG. Les données sont versionnées et horodatées. Chaque saisie peut embarquer des notes et des pièces justificatives.",
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/indicator-data/indicators/{id}/data',
        description: "Lister les données d'un indicateur",
      },
      {
        method: 'POST',
        path: '/api/v1/indicator-data/indicators/{id}/data',
        description: 'Saisir une nouvelle valeur',
      },
      {
        method: 'PUT',
        path: '/api/v1/indicator-data/{data_id}',
        description: 'Mettre à jour une saisie',
      },
      {
        method: 'DELETE',
        path: '/api/v1/indicator-data/{data_id}',
        description: 'Supprimer une saisie',
      },
    ],
    curlExample: `curl -X POST https://api.esgflow.io/api/v1/indicator-data/indicators/{id}/data \\
  -H "Authorization: Bearer {token}" \\
  -H "Content-Type: application/json" \\
  -d '{"date":"2024-01-15","value":1250.5,"notes":"Q1 2024"}'`,
    responseExample: `{
  "id": "7f3d9c21-bb42-4f8a-8d31-1a2b3c4d5e6f",
  "indicator_id": "550e8400-e29b-41d4-a716-446655440000",
  "date": "2024-01-15",
  "value": 1250.5,
  "notes": "Q1 2024",
  "created_at": "2024-01-15T10:30:00Z",
  "status": "validated"
}`,
  },
  scores: {
    title: 'Scores ESG',
    description:
      "Calculez et consultez vos scores ESG agrégés. Le moteur de scoring utilise une méthodologie pondérée alignée sur les standards CSRD et les benchmarks sectoriels.",
    endpoints: [
      { method: 'GET', path: '/api/v1/esg-scoring/dashboard', description: 'Tableau de bord scores ESG' },
      { method: 'POST', path: '/api/v1/esg-scoring/calculate', description: 'Déclencher un calcul de score' },
      { method: 'GET', path: '/api/v1/esg-scoring/history', description: 'Historique des scores' },
      { method: 'GET', path: '/api/v1/esg-scoring/breakdown', description: 'Décomposition par indicateur' },
    ],
    curlExample: `curl -X GET https://api.esgflow.io/api/v1/esg-scoring/dashboard \\
  -H "Authorization: Bearer {token}"`,
    responseExample: `{
  "global_score": 74,
  "environmental": { "score": 68, "weight": 0.4 },
  "social": { "score": 72, "weight": 0.35 },
  "governance": { "score": 81, "weight": 0.25 },
  "rank": "Top 25%",
  "last_calculated": "2024-03-15T08:00:00Z"
}`,
  },
  reports: {
    title: 'Rapports',
    description:
      "Générez des rapports ESG conformes aux exigences réglementaires (CSRD, GRI, TCFD). Les rapports sont produits en PDF ou XLSX et stockés de façon sécurisée.",
    endpoints: [
      { method: 'GET', path: '/api/v1/reports', description: 'Lister les rapports' },
      { method: 'POST', path: '/api/v1/reports/generate', description: 'Générer un rapport' },
      { method: 'GET', path: '/api/v1/reports/{id}/download', description: 'Télécharger un rapport' },
      { method: 'DELETE', path: '/api/v1/reports/{id}', description: 'Supprimer un rapport' },
    ],
    curlExample: `curl -X POST https://api.esgflow.io/api/v1/reports/generate \\
  -H "Authorization: Bearer {token}" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"csrd","year":2024,"format":"pdf","language":"fr"}'`,
    responseExample: `{
  "report_id": "rpt_2024_csrd_abc123",
  "status": "generating",
  "estimated_duration_s": 45,
  "download_url": null,
  "webhook_notified": true
}`,
  },
  webhooks: {
    title: 'Webhooks',
    description:
      "Recevez des notifications en temps réel lors d'événements clés (nouvelle saisie, score calculé, rapport prêt). Configurez vos endpoints HTTPS et gérez les tentatives de livraison.",
    endpoints: [
      { method: 'GET', path: '/api/v1/webhooks', description: 'Lister les webhooks' },
      { method: 'POST', path: '/api/v1/webhooks', description: 'Créer un webhook' },
      { method: 'PUT', path: '/api/v1/webhooks/{id}', description: 'Mettre à jour un webhook' },
      { method: 'DELETE', path: '/api/v1/webhooks/{id}', description: 'Supprimer un webhook' },
    ],
    curlExample: `curl -X POST https://api.esgflow.io/api/v1/webhooks \\
  -H "Authorization: Bearer {token}" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://yourapp.io/hooks/esg","events":["score.calculated","report.ready"],"secret":"whsec_..."}'`,
    responseExample: `{
  "id": "wh_abc123def456",
  "url": "https://yourapp.io/hooks/esg",
  "events": ["score.calculated", "report.ready"],
  "active": true,
  "created_at": "2024-03-15T09:00:00Z"
}`,
  },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-100 text-emerald-700',
    POST: 'bg-blue-100 text-blue-700',
    PUT: 'bg-amber-100 text-amber-700',
    DELETE: 'bg-red-100 text-red-700',
    PATCH: 'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold tracking-wide ${colors[method] ?? 'bg-gray-100 text-gray-600'}`}>
      {method}
    </span>
  )
}

function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative rounded-lg bg-gray-900 text-sm">
      <div className="flex items-center justify-between border-b border-gray-700/60 px-4 py-2">
        <span className="text-xs font-medium text-gray-400">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 transition hover:bg-gray-700 hover:text-white"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4">
        <code className="text-green-400 leading-relaxed">{code}</code>
      </pre>
    </div>
  )
}

function KeyModal({
  apiKey,
  onClose,
}: {
  apiKey: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100">
            <Key className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Clé API générée</h3>
            <p className="text-xs text-gray-500">Conservez-la en lieu sûr — elle ne sera plus affichée.</p>
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="break-all font-mono text-sm text-gray-800">{apiKey}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copié !' : 'Copier la clé'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function APIDocumentation() {
  const [activeSection, setActiveSection] = useState<SectionId>('auth')
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [generatedKey, setGeneratedKey] = useState('')
  const [copiedKey, setCopiedKey] = useState(false)

  const handleGenerateKey = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    const rand = (n: number) =>
      Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const key = `esgflow_sk_prod_${rand(8)}_${rand(16)}`
    setGeneratedKey(key)
    setShowKeyModal(true)
  }

  const section = DOC_SECTIONS[activeSection]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 px-6 py-10 md:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-4 py-1.5 text-sm font-medium text-indigo-300 ring-1 ring-indigo-500/30">
            <Globe className="h-4 w-4" />
            Developer Portal
          </div>
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            API Publique ESGFlow
          </h1>
          <p className="mt-2 max-w-2xl text-slate-300">
            Intégrez vos données ESG dans vos outils — tableaux de bord, ERP, solutions BI et bien plus.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleGenerateKey}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700"
            >
              <Key className="h-4 w-4" />
              Générer une clé API
            </button>
            <button
              onClick={() => window.open('/api/docs', '_blank')}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
            >
              <ExternalLink className="h-4 w-4" />
              Ouvrir Swagger UI
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-6">
          {/* ── Sidebar ── */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-6 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Sections
              </p>
              <nav className="space-y-0.5">
                {NAV_SECTIONS.map((nav) => (
                  <button
                    key={nav.id}
                    onClick={() => setActiveSection(nav.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      activeSection === nav.id
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className={activeSection === nav.id ? 'text-indigo-600' : 'text-gray-400'}>
                      {nav.icon}
                    </span>
                    {nav.label}
                    {activeSection === nav.id && (
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-indigo-400" />
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* ── Mobile nav ── */}
          <div className="mb-4 flex gap-2 overflow-x-auto lg:hidden">
            {NAV_SECTIONS.map((nav) => (
              <button
                key={nav.id}
                onClick={() => setActiveSection(nav.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeSection === nav.id
                    ? 'bg-indigo-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-600'
                }`}
              >
                {nav.icon}
                {nav.label}
              </button>
            ))}
          </div>

          {/* ── Main content ── */}
          <main className="min-w-0 flex-1">
            <div className="space-y-6">
              {/* Section header */}
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{section.description}</p>
              </div>

              {/* Endpoints */}
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  <Terminal className="h-4 w-4" />
                  Endpoints
                </h3>
                <div className="space-y-2">
                  {section.endpoints.map((ep) => (
                    <div
                      key={ep.path}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                    >
                      <MethodBadge method={ep.method} />
                      <code className="flex-1 font-mono text-sm text-gray-800">{ep.path}</code>
                      <span className="text-xs text-gray-400">{ep.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Curl example */}
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  <Code className="h-4 w-4" />
                  Exemple de requête
                </h3>
                <CodeBlock code={section.curlExample} lang="bash" />
              </div>

              {/* Response example */}
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  <Database className="h-4 w-4" />
                  Exemple de réponse
                </h3>
                <CodeBlock code={section.responseExample} lang="json" />
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* ── Key modal ── */}
      {showKeyModal && (
        <KeyModal
          apiKey={generatedKey}
          onClose={() => { setShowKeyModal(false); setCopiedKey(false) }}
        />
      )}
    </div>
  )
}
