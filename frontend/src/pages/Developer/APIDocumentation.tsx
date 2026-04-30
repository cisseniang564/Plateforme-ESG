import { useState, useEffect, useCallback } from 'react'
import {
  Key,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  Terminal,
  Code2,
  AlertTriangle,
  X,
  Loader2,
  Globe,
  Shield,
} from 'lucide-react'
import { api } from '@/services/api'

// --- Types ---

interface ApiKeyItem {
  id: string
  name: string
  key_prefix: string
  description: string | null
  created_at: string
  last_used_at: string | null
  expires_at: string | null
  is_active: boolean
}

type CodeLang = 'python' | 'curl' | 'javascript'

// --- Code examples ---

const CODE_EXAMPLES: Record<CodeLang, string> = {
  python: `import requests

API_KEY = "esgsk_votre_clé_ici"
BASE_URL = "https://app.esgflow.io/api/v1"

headers = {"X-API-Key": API_KEY}

# Lister les indicateurs
resp = requests.get(f"{BASE_URL}/indicators/", headers=headers)
print(resp.json())`,

  curl: `curl -H "X-API-Key: esgsk_votre_clé_ici" \\
  https://app.esgflow.io/api/v1/indicators/`,

  javascript: `const API_KEY = 'esgsk_votre_clé_ici';

const resp = await fetch('https://app.esgflow.io/api/v1/indicators/', {
  headers: { 'X-API-Key': API_KEY }
});
const data = await resp.json();`,
}

const QUICK_START_EXAMPLES: Record<string, { label: string; lang: CodeLang; code: string }> = {
  list: {
    label: 'Lister les indicateurs',
    lang: 'python',
    code: `import requests

headers = {"X-API-Key": "esgsk_votre_clé_ici"}

resp = requests.get(
    "https://app.esgflow.io/api/v1/indicators/",
    headers=headers
)
for indicator in resp.json():
    print(indicator["code"], indicator["name"])`,
  },
  submit: {
    label: 'Soumettre des données',
    lang: 'python',
    code: `import requests

headers = {"X-API-Key": "esgsk_votre_clé_ici"}

payload = {
    "date": "2024-01-15",
    "value": 1250.5,
    "notes": "Q1 2024"
}

resp = requests.post(
    "https://app.esgflow.io/api/v1/indicator-data/indicators/{id}/data",
    headers=headers,
    json=payload
)
print(resp.json())`,
  },
  scores: {
    label: 'Obtenir les scores ESG',
    lang: 'python',
    code: `import requests

headers = {"X-API-Key": "esgsk_votre_clé_ici"}

resp = requests.get(
    "https://app.esgflow.io/api/v1/esg-scoring/dashboard",
    headers=headers
)
scores = resp.json()
print(f"Score global: {scores['global_score']}")
print(f"Environnemental: {scores['environmental']['score']}")`,
  },
}

// --- Helpers ---

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// --- Sub-components ---

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      title="Copier"
      className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition ${className}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copié !' : 'Copier'}
    </button>
  )
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="relative rounded-lg bg-gray-900 text-sm">
      <div className="flex items-center justify-between border-b border-gray-700/60 px-4 py-2">
        <span className="text-xs font-medium text-gray-400">{lang}</span>
        <CopyButton text={code} className="text-gray-400 hover:bg-gray-700 hover:text-white" />
      </div>
      <pre className="overflow-x-auto p-4">
        <code className="text-green-400 leading-relaxed whitespace-pre">{code}</code>
      </pre>
    </div>
  )
}

// --- Create key modal ---

interface CreateKeyModalProps {
  onClose: () => void
  onCreated: (fullKey: string, keyName: string) => void
}

function CreateKeyModal({ onClose, onCreated }: CreateKeyModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [expiryDays, setExpiryDays] = useState<string>('never')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const payload: { name: string; description?: string; expires_in_days?: number } = {
        name: name.trim(),
      }
      if (description.trim()) payload.description = description.trim()
      if (expiryDays !== 'never') payload.expires_in_days = parseInt(expiryDays, 10)

      const res = await api.post('/api-keys/', payload)
      onCreated(res.data.full_key, res.data.name)
    } catch {
      setError("Une erreur s'est produite lors de la création de la clé.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <Key className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Nouvelle clé API</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Nom de la clé <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Production, CI/CD, Dashboard interne…"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Usage prévu, équipe responsable…"
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Expiration</label>
            <select
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="30">30 jours</option>
              <option value="90">90 jours</option>
              <option value="365">1 an</option>
              <option value="never">Jamais</option>
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {loading ? 'Création…' : 'Générer la clé'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// --- Reveal key modal (shown once after creation) ---

interface RevealKeyModalProps {
  fullKey: string
  keyName: string
  onClose: () => void
}

function RevealKeyModal({ fullKey, keyName, onClose }: RevealKeyModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(fullKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <Key className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Clé générée — {keyName}</h3>
            <p className="text-xs text-gray-500">Votre clé API a été créée avec succès</p>
          </div>
        </div>

        {/* Warning banner */}
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm font-medium text-amber-800">
            Copiez cette clé maintenant — elle ne sera plus affichée après la fermeture de cette fenêtre.
          </p>
        </div>

        {/* Key display */}
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <code className="min-w-0 flex-1 break-all font-mono text-sm text-gray-800">{fullKey}</code>
          <button
            onClick={handleCopy}
            className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              copied
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copié !' : 'Copier'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
        >
          J'ai copié ma clé, fermer
        </button>
      </div>
    </div>
  )
}

// --- Main component ---

export default function APIDocumentation() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [loadingKeys, setLoadingKeys] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [revealKey, setRevealKey] = useState<{ fullKey: string; keyName: string } | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [activeCodeLang, setActiveCodeLang] = useState<CodeLang>('python')
  const [activeQuickStart, setActiveQuickStart] = useState<string>('list')

  const fetchKeys = useCallback(async () => {
    try {
      const res = await api.get('/api-keys/')
      setKeys(res.data)
    } catch {
      // silently fail — user may not have any keys yet
    } finally {
      setLoadingKeys(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const handleCreated = (fullKey: string, keyName: string) => {
    setShowCreateModal(false)
    setRevealKey({ fullKey, keyName })
    fetchKeys()
  }

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Révoquer cette clé API ? Cette action est irréversible.')) return
    setRevokingId(id)
    try {
      await api.delete(`/api-keys/${id}`)
      setKeys((prev) => prev.filter((k) => k.id !== id))
    } finally {
      setRevokingId(null)
    }
  }

  const langLabels: Record<CodeLang, string> = {
    python: 'Python',
    curl: 'cURL',
    javascript: 'JavaScript',
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-800 px-8 py-10 shadow-xl">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-sm font-medium text-emerald-300 ring-1 ring-emerald-500/30">
            <Globe className="h-4 w-4" />
            Portail Développeur
          </div>
          <h1 className="text-3xl font-bold text-white md:text-4xl">API Publique ESGFlow</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Intégrez vos données ESG directement depuis vos applications. Gérez vos indicateurs, soumettez des données et récupérez vos scores via une API REST sécurisée.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-700"
            >
              <Key className="h-4 w-4" />
              Générer une nouvelle clé
            </button>
            <button
              onClick={() => window.open('/docs', '_blank')}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <ExternalLink className="h-4 w-4" />
              Ouvrir la documentation Swagger
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-8">

        {/* ── API Keys section ── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-gray-900">Clés API</h2>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Nouvelle clé
            </button>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            {loadingKeys ? (
              <div className="flex items-center justify-center py-14 text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : keys.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Key className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-600">Aucune clé API active</p>
                  <p className="mt-0.5 text-sm text-gray-400">Créez votre première clé pour commencer à utiliser l'API.</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                  Créer une clé
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <th className="px-5 py-3.5 text-left">Nom</th>
                      <th className="px-5 py-3.5 text-left">Préfixe</th>
                      <th className="px-5 py-3.5 text-left">Créée le</th>
                      <th className="px-5 py-3.5 text-left">Dernière utilisation</th>
                      <th className="px-5 py-3.5 text-left">Expiration</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((key) => (
                      <tr key={key.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                        <td className="px-5 py-4">
                          <span className="font-medium text-gray-900">{key.name}</span>
                          {key.description && (
                            <p className="mt-0.5 text-xs text-gray-400">{key.description}</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                            {key.key_prefix}…
                          </code>
                        </td>
                        <td className="px-5 py-4 text-gray-500">{formatDate(key.created_at)}</td>
                        <td className="px-5 py-4 text-gray-500">{formatDate(key.last_used_at)}</td>
                        <td className="px-5 py-4">
                          {key.expires_at ? (
                            <span className="text-gray-500">{formatDate(key.expires_at)}</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              Jamais
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleRevoke(key.id)}
                            disabled={revokingId === key.id}
                            title="Révoquer cette clé"
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {revokingId === key.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Révoquer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ── Authentication section ── */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900">Authentification</h2>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="mb-5 text-sm leading-relaxed text-gray-600">
              Toutes les requêtes API doivent inclure votre clé dans l'en-tête{' '}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-800">X-API-Key</code>.
              Les clés sont liées à votre tenant et héritent de ses permissions.
            </p>

            {/* Language tabs */}
            <div className="mb-4 flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
              {(Object.keys(langLabels) as CodeLang[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveCodeLang(lang)}
                  className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                    activeCodeLang === lang
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {langLabels[lang]}
                </button>
              ))}
            </div>

            <CodeBlock code={CODE_EXAMPLES[activeCodeLang]} lang={langLabels[activeCodeLang]} />

            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <strong>Sécurité :</strong> Ne partagez jamais votre clé API. Stockez-la dans des variables d'environnement, jamais dans le code source.
            </div>
          </div>
        </section>

        {/* ── Quick Start section ── */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Terminal className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900">Démarrage rapide</h2>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="mb-5 text-sm text-gray-600">
              Exemples d'utilisation des endpoints principaux de l'API ESGFlow.
            </p>

            {/* Quick start tabs */}
            <div className="mb-5 flex flex-wrap gap-2">
              {Object.entries(QUICK_START_EXAMPLES).map(([key, ex]) => (
                <button
                  key={key}
                  onClick={() => setActiveQuickStart(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    activeQuickStart === key
                      ? 'bg-emerald-600 text-white'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  {ex.label}
                </button>
              ))}
            </div>

            <CodeBlock
              code={QUICK_START_EXAMPLES[activeQuickStart].code}
              lang={langLabels[QUICK_START_EXAMPLES[activeQuickStart].lang]}
            />
          </div>
        </section>

        {/* ── Swagger link ── */}
        <section>
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Documentation complète</h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  Explorez tous les endpoints disponibles, testez des requêtes en direct et consultez les schémas de réponse.
                </p>
              </div>
              <button
                onClick={() => window.open('/docs', '_blank')}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900"
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir la documentation Swagger
              </button>
            </div>
          </div>
        </section>

      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateKeyModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}

      {revealKey && (
        <RevealKeyModal
          fullKey={revealKey.fullKey}
          keyName={revealKey.keyName}
          onClose={() => setRevealKey(null)}
        />
      )}
    </div>
  )
}
