import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2, TrendingUp, TrendingDown, Search, Filter, Download,
  BarChart3, Eye, Zap, Award, ArrowUpDown, Grid3x3, List,
  Sparkles, Activity, X, Minus, Plus, Loader2
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { getBatchOrgScores } from '@/services/esgScoringService';
import toast from 'react-hot-toast';

// ─── Modal Création Organisation ──────────────────────────────────────────────

const ORG_TYPES = [
  { id: 'company',       label: 'Entreprise' },
  { id: 'group',         label: 'Groupe' },
  { id: 'business_unit', label: 'Business Unit' },
  { id: 'site',          label: 'Site / Établissement' },
  { id: 'department',    label: 'Département' },
]

const INDUSTRIES = [
  'Énergie', 'Finance & Assurance', 'Industrie manufacturière',
  'Services', 'Immobilier', 'Santé', 'Technologies', 'Agriculture',
  'Transport', 'Commerce', 'Construction', 'Alimentaire', 'Autre',
]

interface CreateOrgModalProps {
  onClose: () => void
  onCreated: () => void
}

function CreateOrgModal({ onClose, onCreated }: CreateOrgModalProps) {
  const [name, setName] = useState('')
  const [orgType, setOrgType] = useState('company')
  const [industry, setIndustry] = useState('')
  const [externalId, setExternalId] = useState('')
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  // Fermer sur Échap
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      setSaving(true)
      await api.post('/organizations', {
        name: name.trim(),
        org_type: orgType,
        industry: industry || null,
        external_id: externalId.trim() || null,
      })
      toast.success(`Organisation "${name.trim()}" créée avec succès`)
      onCreated()
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Erreur lors de la création'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <Building2 size={18} className="text-primary-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Nouvelle organisation</h2>
              <p className="text-xs text-gray-400">Ajoutez une entité à votre portefeuille</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Nom de l'organisation <span className="text-red-400">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex : GreenCo France SAS"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type</label>
              <select
                value={orgType}
                onChange={e => setOrgType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                {ORG_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>

            {/* Secteur */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Secteur</label>
              <select
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">— Choisir —</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          {/* ID externe (optionnel) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Identifiant externe <span className="text-gray-400 font-normal">(SIREN, code interne…)</span>
            </label>
            <input
              type="text"
              value={externalId}
              onChange={e => setExternalId(e.target.value)}
              placeholder="Optionnel"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <><Loader2 size={14} className="animate-spin" />Création…</>
              ) : (
                <><Plus size={14} />Créer</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface Organization {
  id: string;
  name: string;
  external_id?: string;
  industry?: string;
  type?: string;
  esg_score: number | null;
  environmental_score: number | null;
  social_score: number | null;
  governance_score: number | null;
  rating: string | null;
  trend: number | null;
  data_completeness: number | null;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'score' | 'rating';

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 76, strokeWidth = 7 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const dashOffset = circumference - (progress / 100) * circumference;
  const color = score >= 75 ? '#16a34a' : score >= 60 ? '#2563eb' : score >= 45 ? '#ea580c' : '#dc2626';
  const trackColor = score >= 75 ? '#dcfce7' : score >= 60 ? '#dbeafe' : score >= 45 ? '#ffedd5' : '#fee2e2';
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
        className="transition-all duration-700" />
    </svg>
  );
}

function PillarBar({ score, color, label }: { score: number | null; color: string; label: string }) {
  const val = score ?? 0;
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-[10px] font-bold text-gray-500">{label}</span>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${val}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-semibold" style={{ color: score != null ? color : '#9ca3af' }}>
        {score != null ? score : '—'}
      </span>
    </div>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return (
    <div className="flex flex-col items-center justify-center w-[76px] h-[76px] rounded-full border-2 border-dashed border-gray-200 bg-gray-50">
      <span className="text-lg font-bold text-gray-300">—</span>
      <span className="text-[9px] text-gray-400 uppercase tracking-wide">ESG</span>
    </div>
  );
  const color = score >= 75 ? '#16a34a' : score >= 60 ? '#2563eb' : score >= 45 ? '#ea580c' : '#dc2626';
  return (
    <div className="relative w-[76px] h-[76px] flex-shrink-0">
      <ScoreRing score={score} size={76} strokeWidth={7} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold leading-none" style={{ color }}>{score}</span>
        <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wide mt-0.5">ESG</span>
      </div>
    </div>
  );
}

function RatingBadge({ rating }: { rating: string | null }) {
  if (!rating) return <span className="text-xs text-gray-400 italic">Non scoré</span>;
  const cls = rating.startsWith('A')
    ? 'bg-green-50 text-green-700 border-green-200'
    : rating.startsWith('B')
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-orange-50 text-orange-700 border-orange-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${cls}`}>
      {rating}
    </span>
  );
}

function TrendCell({ trend }: { trend: number | null }) {
  if (trend == null) return <span className="text-gray-300 text-sm">—</span>;
  if (trend > 0) return (
    <span className="inline-flex items-center gap-1 text-green-600 font-semibold text-sm">
      <TrendingUp className="h-3.5 w-3.5" />+{trend.toFixed(1)}%
    </span>
  );
  if (trend < 0) return (
    <span className="inline-flex items-center gap-1 text-red-500 font-semibold text-sm">
      <TrendingDown className="h-3.5 w-3.5" />{trend.toFixed(1)}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-gray-400 text-sm">
      <Minus className="h-3.5 w-3.5" />0%
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OrganizationsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [selectedRating, setSelectedRating] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadOrganizations();
    // Ouvrir automatiquement le modal si navigué depuis le FAB
    if ((location.state as any)?.openCreate) {
      setShowCreateModal(true);
      // Nettoyer le state pour éviter re-ouverture à la prochaine navigation
      window.history.replaceState({}, '');
    }
  }, []);

  const loadOrganizations = async () => {
    try {
      const res = await api.get('/organizations');
      const orgs: any[] = res.data?.organizations || res.data?.items || [];
      const scoreMap = await getBatchOrgScores(orgs.map((o) => o.id));
      const enriched: Organization[] = orgs.map((org) => {
        const s = scoreMap[org.id];
        return {
          ...org,
          esg_score: s?.overall_score ?? null,
          environmental_score: s?.environmental_score ?? null,
          social_score: s?.social_score ?? null,
          governance_score: s?.governance_score ?? null,
          rating: s?.rating ?? null,
          trend: null,
          data_completeness: s ? s.data_completeness : null,
        };
      });
      setOrganizations(enriched);
    } catch (err: any) {
      console.error('OrganizationsList: load error', err);
      const status = err?.response?.status;
      if (status === 429) {
        toast.error('Trop de requêtes — réessayez dans quelques secondes');
      } else if (status !== 401) {
        toast.error('Impossible de charger les organisations');
      }
    } finally {
      setLoading(false);
    }
  };

  const industries = useMemo(() =>
    Array.from(new Set(organizations.map(o => o.industry).filter(Boolean))) as string[],
    [organizations]);

  const ratings = useMemo(() =>
    Array.from(new Set(organizations.map(o => o.rating).filter(Boolean))).sort() as string[],
    [organizations]);

  const filtered = useMemo(() => {
    let r = organizations.filter(org => {
      const q = searchQuery.toLowerCase();
      const matchSearch = org.name.toLowerCase().includes(q) || org.external_id?.toLowerCase().includes(q);
      const matchIndustry = selectedIndustry === 'all' || org.industry === selectedIndustry;
      const matchRating = selectedRating === 'all' || org.rating === selectedRating;
      return matchSearch && matchIndustry && matchRating;
    });
    r.sort((a, b) => {
      const d = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * d;
      if (sortBy === 'score') return ((b.esg_score ?? -1) - (a.esg_score ?? -1)) * d;
      if (sortBy === 'rating') {
        const idx = ['AAA','AA','A','BBB','BB','B','CCC','CC','C'];
        return (idx.indexOf(a.rating ?? 'C') - idx.indexOf(b.rating ?? 'C')) * d;
      }
      return 0;
    });
    return r;
  }, [organizations, searchQuery, selectedIndustry, selectedRating, sortBy, sortDir]);

  const stats = useMemo(() => {
    const scored = organizations.filter(o => o.esg_score != null);
    return {
      total: organizations.length,
      avgScore: scored.length ? Math.round(scored.reduce((s, o) => s + o.esg_score!, 0) / scored.length) : 0,
      leaders: organizations.filter(o => (o.esg_score ?? 0) >= 75).length,
      scored: scored.length,
      sectors: industries.length,
    };
  }, [organizations, industries]);

  const clearFilters = () => { setSelectedIndustry('all'); setSelectedRating('all'); };
  const hasFilters = selectedIndustry !== 'all' || selectedRating !== 'all' || searchQuery;

  if (loading) return (
    <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>
  );

  return (
    <div className="space-y-6">
      {/* Modal création */}
      {showCreateModal && (
        <CreateOrgModal
          onClose={() => setShowCreateModal(false)}
          onCreated={loadOrganizations}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary-600" />
            {t('organizations.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} organisation{filtered.length > 1 ? 's' : ''}
            {filtered.length !== organizations.length && ` sur ${organizations.length}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/app/organizations/compare')}>
            <BarChart3 className="h-4 w-4 mr-1.5" />{t('organizations.compare')}
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1.5" />Nouvelle organisation
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Building2, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: 'Score moyen', value: stats.avgScore || '—', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Leaders ≥75', value: stats.leaders, icon: Award, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Secteurs', value: stats.sectors, icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
            <div className={`${color} opacity-70`}><Icon className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une organisation…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sector */}
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <select
              value={selectedIndustry}
              onChange={e => setSelectedIndustry(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white appearance-none min-w-[150px]"
            >
              <option value="all">Tous secteurs</option>
              {industries.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          {/* Rating */}
          <select
            value={selectedRating}
            onChange={e => setSelectedRating(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white min-w-[120px]"
          >
            <option value="all">Tous ratings</option>
            {ratings.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          {/* Sort */}
          <div className="relative">
            <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <select
              value={`${sortBy}-${sortDir}`}
              onChange={e => {
                const [s, d] = e.target.value.split('-');
                setSortBy(s as SortBy); setSortDir(d as 'asc' | 'desc');
              }}
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="score-desc">Score ↓</option>
              <option value="score-asc">Score ↑</option>
              <option value="name-asc">Nom A→Z</option>
              <option value="name-desc">Nom Z→A</option>
              <option value="rating-asc">Rating ↑</option>
              <option value="rating-desc">Rating ↓</option>
            </select>
          </div>

          {/* Clear */}
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg bg-white transition-colors">
              <X className="h-3.5 w-3.5" /> Effacer
            </button>
          )}

          {/* View toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden ml-1">
            <button onClick={() => setViewMode('grid')}
              className={`px-3 py-2 transition-colors ${viewMode === 'grid' ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`px-3 py-2 border-l border-gray-200 transition-colors ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid view */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(org => (
            <div
              key={org.id}
              onClick={() => navigate(`/app/organizations/${org.id}`)}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-primary-300 hover:shadow-md cursor-pointer transition-all group"
            >
              {/* Top row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-3">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug truncate group-hover:text-primary-600 transition-colors">
                    {org.name}
                  </h3>
                  {org.industry && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded-full">
                      {org.industry}
                    </span>
                  )}
                </div>
                <RatingBadge rating={org.rating} />
              </div>

              {/* Score + pillars */}
              <div className="flex items-center gap-4 py-3 border-t border-b border-gray-100 my-3">
                <ScoreBadge score={org.esg_score} />
                <div className="flex gap-2 flex-1">
                  <PillarBar score={org.environmental_score} color="#16a34a" label="E" />
                  <PillarBar score={org.social_score} color="#2563eb" label="S" />
                  <PillarBar score={org.governance_score} color="#7c3aed" label="G" />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-gray-500">
                  {org.data_completeness != null
                    ? <><span className="font-medium text-gray-700">{org.data_completeness}%</span> complété</>
                    : <span className="text-gray-400">Données manquantes</span>
                  }
                </div>
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/app/organizations/${org.id}`); }}
                  className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" /> Voir
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List view */
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Organisation</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Score ESG</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Rating</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">E / S / G</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Tendance</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Complétude</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(org => (
                <tr
                  key={org.id}
                  className="hover:bg-primary-50/40 cursor-pointer transition-colors"
                  onClick={() => navigate(`/app/organizations/${org.id}`)}
                >
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900 text-sm">{org.name}</p>
                    {org.industry && <p className="text-xs text-gray-400 mt-0.5">{org.industry}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {org.esg_score != null ? (
                      <span className={`text-xl font-bold ${
                        org.esg_score >= 75 ? 'text-green-600' :
                        org.esg_score >= 60 ? 'text-blue-600' :
                        org.esg_score >= 45 ? 'text-orange-500' : 'text-red-500'
                      }`}>{org.esg_score}</span>
                    ) : <span className="text-gray-300 text-lg">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <RatingBadge rating={org.rating} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold">
                      <span className="text-green-600">{org.environmental_score ?? '—'}</span>
                      <span className="text-gray-200">/</span>
                      <span className="text-blue-600">{org.social_score ?? '—'}</span>
                      <span className="text-gray-200">/</span>
                      <span className="text-purple-600">{org.governance_score ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <TrendCell trend={org.trend} />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {org.data_completeness != null ? (
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full" style={{ width: `${org.data_completeness}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8">{org.data_completeness}%</span>
                      </div>
                    ) : <span className="text-gray-300 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/app/organizations/${org.id}`); }}
                      className="text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-xl">
          <Building2 className="h-14 w-14 text-gray-200 mx-auto mb-4" />
          {organizations.length === 0 ? (
            <>
              <p className="text-gray-700 font-semibold mb-1">Aucune organisation encore</p>
              <p className="text-gray-400 text-sm mb-5">Créez votre première organisation pour commencer</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Créer une organisation
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-700 font-semibold mb-1">Aucune organisation trouvée</p>
              <p className="text-gray-400 text-sm mb-5">Modifiez vos critères de recherche</p>
              {hasFilters && (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Réinitialiser les filtres
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
