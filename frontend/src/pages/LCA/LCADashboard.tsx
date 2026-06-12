/**
 * LCA (Life Cycle Assessment) Dashboard
 *
 * Product-level cradle-to-grave emission tracking based on the ADEME Base
 * Empreinte v23.0 catalog. Lets users:
 *   - Browse their product catalog with per-product carbon impact
 *   - Create / edit a product by adding inputs to each life-cycle stage
 *   - Visualize the stage breakdown (waterfall) + largest contributor
 *
 * The backend (`/lca/factors`, `/lca/products`) does all aggregation —
 * this page is purely presentational + form handling.
 */
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Plus, Leaf, Factory, Truck, Zap, Archive, Recycle,
  Trash2, RefreshCw, AlertCircle, ChevronRight, Box, Calendar,
  TrendingUp, Sparkles, BarChart3, Lightbulb, GitCompare, Battery,
  Download, ArrowDown, ArrowUp, Minus, Target, CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import PageHero, { PageHeroButton, PageHeroPrimaryButton } from '@/components/layout/PageHero';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

// ─── Types ──────────────────────────────────────────────────────────────

interface ImpactFactor {
  code: string;
  label_fr: string;
  category: string;
  unit: string;
  kg_co2e_per_unit: number;
  source: string;
}

interface FactorCategory {
  code: string;
  label_fr: string;
  factors: ImpactFactor[];
}

interface StageItem {
  factor_code: string;
  quantity: number;
  unit?: string;
  note?: string;
  // populated by backend
  kg_co2e?: number;
  factor_label_fr?: string;
}

interface StageBreakdown {
  stage: string;
  label_fr: string;
  total_kg_co2e: number;
  pct_of_total: number;
  items: StageItem[];
}

interface Impact {
  total_kg_co2e: number;
  annual_kg_co2e: number | null;
  stages: StageBreakdown[];
  largest_contributor: {
    stage: string;
    stage_label_fr: string;
    factor_code: string;
    factor_label_fr: string;
    kg_co2e: number;
    pct: number;
  } | null;
  computed_at: string;
  methodology: string;
}

interface LCAProduct {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  category: string | null;
  functional_unit: string;
  annual_volume: number | null;
  standard: string | null;
  stages: Record<string, StageItem[]>;
  cached_total_kgco2e: number | null;
  cached_stages_breakdown?: Impact | null;
  cached_computed_at: string | null;
  created_at: string;
}

// ─── Stage config ───────────────────────────────────────────────────────

const getStageCfg = (t: TFunction): Record<string, { label: string; icon: any; color: string; bg: string; hex: string }> => ({
  raw_material:  { label: t('lca.stage.rawMaterial', 'Matières premières'),   icon: Leaf,    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', hex: '#059669' },
  manufacturing: { label: t('lca.stage.manufacturing', 'Fabrication'),        icon: Factory, color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200',   hex: '#c2410c' },
  energy:        { label: t('lca.stage.energy', 'Énergie'),                   icon: Zap,     color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     hex: '#b45309' },
  transport:     { label: t('lca.stage.transport', 'Transport'),              icon: Truck,   color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',       hex: '#1d4ed8' },
  use_phase:     { label: t('lca.stage.usePhase', "Phase d'utilisation"),     icon: Battery, color: 'text-cyan-700',    bg: 'bg-cyan-50 border-cyan-200',       hex: '#0e7490' },
  packaging:     { label: t('lca.stage.packaging', 'Emballage'),              icon: Archive, color: 'text-purple-700',  bg: 'bg-purple-50 border-purple-200',   hex: '#7e22ce' },
  end_of_life:   { label: t('lca.stage.endOfLife', 'Fin de vie'),             icon: Recycle, color: 'text-slate-700',   bg: 'bg-slate-50 border-slate-200',     hex: '#475569' },
});

const STAGE_ORDER = ['raw_material', 'manufacturing', 'energy', 'transport', 'use_phase', 'packaging', 'end_of_life'];

// ─── Page ───────────────────────────────────────────────────────────────

// ─── Comparison types ──────────────────────────────────────────────────
interface ComparisonResult {
  products: Array<{
    id: string; name: string; sku: string | null;
    functional_unit: string; total_kg_co2e: number;
    annual_kg_co2e: number | null; delta_vs_ref_pct?: number;
    stages: Array<{ stage: string; label_fr: string; total_kg_co2e: number; pct_of_total: number }>;
    largest_contributor: { stage: string; factor_label_fr: string; pct: number } | null;
  }>;
  reference: string;
  recommendations: Array<{
    product: string; hotspot_stage: string; hotspot_pct: number;
    recommendation: string; potential_impact: string;
  }>;
}

type ViewMode = 'catalog' | 'compare' | 'ecodesign';

export default function LCADashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [products, setProducts] = useState<LCAProduct[]>([]);
  const [factors, setFactors] = useState<FactorCategory[]>([]);
  const [factorsSource, setFactorsSource] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<LCAProduct | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('catalog');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [ecoTips, setEcoTips] = useState<Record<string, any[]> | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [productsRes, factorsRes] = await Promise.all([
        api.get<{ items: LCAProduct[] }>('/lca/products'),
        api.get<{ categories: FactorCategory[]; source: string }>('/lca/factors'),
      ]);
      setProducts(productsRes.data.items || []);
      setFactors(factorsRes.data.categories || []);
      setFactorsSource(factorsRes.data.source || '');
    } catch (err) {
      console.error('LCA load failed', err);
      toast.error(t('lca.toast.loadFail', 'Impossible de charger les produits LCA'));
    } finally {
      setLoading(false);
    }
  };

  const runComparison = async () => {
    if (compareIds.length < 2) { toast.error(t('lca.toast.min2', 'Sélectionnez au moins 2 produits')); return; }
    setComparing(true);
    try {
      const res = await api.post<ComparisonResult>('/lca/products/compare', { product_ids: compareIds });
      setComparison(res.data);
      setViewMode('compare');
    } catch { toast.error(t('lca.toast.compareErr', 'Erreur lors de la comparaison')); }
    finally { setComparing(false); }
  };

  const loadEcoTips = async () => {
    try {
      const res = await api.get<{ tips: Record<string, any[]> }>('/lca/eco-design-tips');
      setEcoTips(res.data.tips);
      setViewMode('ecodesign');
    } catch { toast.error(t('lca.toast.tipsErr', 'Erreur chargement des recommandations')); }
  };

  const toggleCompareId = (id: string) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 5 ? [...prev, id] : prev);
  };

  const totalCarbon = useMemo(
    () => products.reduce((sum, p) => sum + (p.cached_total_kgco2e || 0) * (p.annual_volume || 1), 0),
    [products],
  );

  const deleteProduct = async (id: string) => {
    if (!window.confirm(t('lca.confirm.delete', 'Supprimer ce produit définitivement ?'))) return;
    try {
      await api.delete(`/lca/products/${id}`);
      toast.success(t('lca.toast.deleted', 'Produit supprimé'));
      setSelected(null);
      loadAll();
    } catch {
      toast.error(t('lca.toast.deleteErr', 'Erreur lors de la suppression'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ── Hero (signature) ──────────────────────────────────── */}
        <PageHero
          badge={t('lca.hero.badge', 'Analyse du Cycle de Vie · ISO 14040/14044 · PEF')}
          badgeIcon={Package}
          icon={Package}
          title={t('lca.hero.title', 'Empreinte carbone produit')}
          description={t('lca.hero.desc', "Cradle-to-grave par produit · {{source}} · 120+ facteurs d'impact", { source: factorsSource || 'ADEME Base Empreinte v23.0' })}
          actions={
            <>
              <PageHeroButton onClick={loadAll} disabled={loading} icon={RefreshCw}>
                {t('lca.btn.refresh', 'Actualiser')}
              </PageHeroButton>
              <PageHeroPrimaryButton onClick={() => setShowCreate(true)} icon={Plus}>
                {t('lca.btn.newProduct', 'Nouveau produit')}
              </PageHeroPrimaryButton>
            </>
          }
          kpis={[
            { label: t('lca.kpi.tracked', 'Produits suivis'), value: products.length },
            {
              label: t('lca.kpi.annualAgg', 'Empreinte annuelle agrégée'),
              value: totalCarbon >= 1000
                ? `${(totalCarbon / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} t CO₂eq`
                : `${totalCarbon.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} kg CO₂eq`,
            },
            { label: t('lca.kpi.factorRef', 'Référentiel facteurs'), value: 'ADEME Base Empreinte', sub: 'v23.0 · 2024' },
          ]}
        />

        {/* ── View mode tabs ─────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-3">
          {([
            { key: 'catalog' as ViewMode, label: t('lca.tab.catalog', 'Catalogue'), icon: Package },
            { key: 'compare' as ViewMode, label: t('lca.tab.compare', 'Comparaison'), icon: GitCompare },
            { key: 'ecodesign' as ViewMode, label: t('lca.tab.ecodesign', 'Éco-conception'), icon: Lightbulb },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => tab.key === 'ecodesign' ? loadEcoTips() : setViewMode(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === tab.key
                  ? 'bg-emerald-100 text-emerald-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
          {viewMode === 'catalog' && products.length >= 2 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-400">{t('lca.compare.selected', '{{count}} sélectionné{{ps}}', { count: compareIds.length, ps: compareIds.length > 1 ? 's' : '' })}</span>
              <button
                onClick={runComparison}
                disabled={comparing || compareIds.length < 2}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                <GitCompare size={12} />
                {comparing ? t('lca.compare.comparing', 'Comparaison…') : t('lca.btn.compare', 'Comparer')}
              </button>
            </div>
          )}
        </div>

      {/* ── Compare view ────────────────────────────────────────── */}
      {viewMode === 'compare' && comparison && (
        <ComparisonView comparison={comparison} onBack={() => setViewMode('catalog')} />
      )}

      {/* ── Eco-design view ──────────────────────────────────────── */}
      {viewMode === 'ecodesign' && ecoTips && (
        <EcoDesignView tips={ecoTips} onBack={() => setViewMode('catalog')} />
      )}

      {/* ── Main grid ────────────────────────────────────────────── */}
      {viewMode === 'catalog' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product list */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            {t('lca.list.catalog', 'Catalogue ({{count}})', { count: products.length })}
          </h2>
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2" />
              <p className="text-sm">{t('lca.loading', 'Chargement…')}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center">
              <Box className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-semibold text-gray-700">{t('lca.empty.title', 'Aucun produit suivi')}</p>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                {t('lca.empty.desc', 'Créez votre premier produit pour calculer son empreinte cradle-to-grave.')}
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
              >
                <Plus size={14} />
                {t('lca.empty.first', 'Premier produit')}
              </button>
            </div>
          ) : (
            products.map(p => (
              <div key={p.id} className="flex items-start gap-2">
                <button
                  onClick={() => toggleCompareId(p.id)}
                  className={`mt-4 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    compareIds.includes(p.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {compareIds.includes(p.id) && <CheckCircle size={12} className="text-white" />}
                </button>
                <button
                  onClick={() => setSelected(p)}
                  className={`flex-1 text-left p-4 rounded-xl border-2 transition-all ${
                    selected?.id === p.id
                      ? 'border-emerald-400 bg-emerald-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 flex-1">
                      {p.sku && <p className="text-[10px] text-gray-400 font-mono">{p.sku}</p>}
                      <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.functional_unit}</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="font-bold text-emerald-700">
                      {(p.cached_total_kgco2e || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kgCO₂eq
                    </span>
                    {p.annual_volume && (
                      <span className="text-gray-500">
                        × {p.annual_volume.toLocaleString('fr-FR')}{t('lca.suffix.perYear', '/an')}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Selected product detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <ProductDetail
              key={selected.id}
              productId={selected.id}
              onDelete={() => deleteProduct(selected.id)}
              onUpdate={loadAll}
              factors={factors}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-semibold text-gray-700">{t('lca.detail.selectProduct', 'Sélectionnez un produit')}</p>
              <p className="text-xs text-gray-500 mt-1">
                {t('lca.detail.selectHint', 'Cliquez sur un produit du catalogue pour voir son analyse de cycle de vie.')}
              </p>
            </div>
          )}
        </div>
      </div>

      )}

      {/* ── Create modal ──────────────────────────────────────────── */}
      {showCreate && (
        <CreateProductModal
          factors={factors}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadAll(); }}
        />
      )}
      </div>
    </div>
  );
}

// ─── Product Detail ─────────────────────────────────────────────────────

function ProductDetail({
  productId, onDelete, onUpdate, factors,
}: {
  productId: string;
  onDelete: () => void;
  onUpdate: () => void;
  factors: FactorCategory[];
}) {
  const { t, i18n } = useTranslation();
  const STAGE_CFG = getStageCfg(t);
  const [product, setProduct] = useState<(LCAProduct & { impact: Impact }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<LCAProduct & { impact: Impact }>(`/lca/products/${productId}`)
      .then(r => setProduct(r.data))
      .catch(() => toast.error(t('lca.toast.loadErr', 'Erreur lors du chargement')))
      .finally(() => setLoading(false));
  }, [productId]);

  const recompute = async () => {
    setComputing(true);
    try {
      const res = await api.post<Impact>(`/lca/products/${productId}/compute`);
      if (product) setProduct({ ...product, impact: res.data });
      toast.success(t('lca.toast.recomputed', 'Impact recalculé'));
      onUpdate();
    } catch {
      toast.error(t('lca.toast.computeErr', 'Erreur de calcul'));
    } finally {
      setComputing(false);
    }
  };

  if (loading || !product) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <RefreshCw className="h-6 w-6 mx-auto animate-spin text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">{t('lca.loading', 'Chargement…')}</p>
      </div>
    );
  }

  const impact = product.impact;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            {product.sku && <p className="text-xs text-gray-400 font-mono mb-1">{product.sku}</p>}
            <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {product.functional_unit}
              {product.annual_volume && ` · ${product.annual_volume.toLocaleString('fr-FR')} ${t('lca.detail.unitsPerYear', 'unités/an')}`}
            </p>
            {product.description && (
              <p className="text-sm text-gray-600 mt-2">{product.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={recompute}
              disabled={computing}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-50"
              title={t('lca.action.recompute', 'Recalculer')}
            >
              <RefreshCw size={14} className={computing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
              title={t('lca.action.delete', 'Supprimer')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Headline KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wide">{t('lca.kpi.perUnit', 'Par unité')}</p>
            <p className="text-xl font-bold text-emerald-900 mt-0.5">
              {impact.total_kg_co2e.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} <span className="text-xs">kgCO₂eq</span>
            </p>
          </div>
          {impact.annual_kg_co2e !== null && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-[10px] text-blue-700 font-semibold uppercase tracking-wide">{t('lca.kpi.annualTotal', 'Total annuel')}</p>
              <p className="text-xl font-bold text-blue-900 mt-0.5">
                {impact.annual_kg_co2e >= 1000
                  ? `${(impact.annual_kg_co2e / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}`
                  : impact.annual_kg_co2e.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}{' '}
                <span className="text-xs">{impact.annual_kg_co2e >= 1000 ? 't' : 'kg'}CO₂eq</span>
              </p>
            </div>
          )}
          {impact.largest_contributor && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-[10px] text-amber-700 font-semibold uppercase tracking-wide flex items-center gap-1">
                <TrendingUp size={9} /> Hot spot
              </p>
              <p className="text-sm font-bold text-amber-900 mt-0.5 truncate">
                {impact.largest_contributor.factor_label_fr}
              </p>
              <p className="text-xs text-amber-700">{t('lca.detail.ofTotal', '{{pct}}% du total', { pct: impact.largest_contributor.pct })}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stage breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-emerald-600" />
          <h3 className="text-base font-bold text-gray-900">{t('lca.detail.breakdown', 'Répartition par étape de cycle de vie')}</h3>
        </div>

        {impact.stages.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t('lca.detail.noEntries', 'Aucune entrée de cycle de vie pour ce produit.')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {impact.stages.map(stage => {
              const cfg = STAGE_CFG[stage.stage] || { label: stage.label_fr, icon: Box, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' };
              const Icon = cfg.icon;
              return (
                <div key={stage.stage} className={`rounded-xl border p-4 ${cfg.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className={cfg.color} />
                      <span className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${cfg.color}`}>
                        {stage.total_kg_co2e.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kgCO₂eq
                      </p>
                      <p className="text-xs text-gray-500">{stage.pct_of_total}%</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-white/60 overflow-hidden mb-3">
                    <div
                      className={`h-full ${cfg.color.replace('text-', 'bg-')} opacity-70`}
                      style={{ width: `${Math.min(stage.pct_of_total, 100)}%` }}
                    />
                  </div>
                  {/* Items */}
                  <div className="space-y-1.5">
                    {stage.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-white/70 rounded-lg px-2.5 py-1.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-700 truncate">{item.factor_label_fr || item.factor_code}</p>
                          {item.note && (
                            <p className="text-[10px] text-amber-600 mt-0.5">{item.note}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-2">
                          <span className="text-gray-500">
                            {item.quantity.toLocaleString('fr-FR')} {item.unit || ''}
                          </span>
                          <span className="font-semibold text-gray-800 min-w-[5rem] text-right">
                            {(item.kg_co2e || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-gray-400 mt-4">
          {t('lca.detail.methodology', 'Méthodologie : {{method}} · Calcul effectué le {{date}}', {
            method: impact.methodology,
            date: new Date(impact.computed_at).toLocaleString(i18n.language.startsWith('en') ? 'en-US' : 'fr-FR'),
          })}
        </p>
      </div>
    </div>
  );
}

// ─── Create Modal ───────────────────────────────────────────────────────

function CreateProductModal({
  factors, onClose, onCreated,
}: {
  factors: FactorCategory[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const STAGE_CFG = getStageCfg(t);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [functionalUnit, setFunctionalUnit] = useState('1 unité');
  const [annualVolume, setAnnualVolume] = useState<string>('');
  const [description, setDescription] = useState('');
  const [stages, setStages] = useState<Record<string, StageItem[]>>({});
  const [activeStage, setActiveStage] = useState<string>('raw_material');
  const [saving, setSaving] = useState(false);

  const addItem = (stage: string) => {
    const stageFactors = factors.find(c => c.code === stage)?.factors || [];
    if (stageFactors.length === 0) return;
    setStages(prev => ({
      ...prev,
      [stage]: [...(prev[stage] || []), { factor_code: stageFactors[0].code, quantity: 1 }],
    }));
  };

  const updateItem = (stage: string, idx: number, patch: Partial<StageItem>) => {
    setStages(prev => ({
      ...prev,
      [stage]: (prev[stage] || []).map((item, i) => i === idx ? { ...item, ...patch } : item),
    }));
  };

  const removeItem = (stage: string, idx: number) => {
    setStages(prev => ({
      ...prev,
      [stage]: (prev[stage] || []).filter((_, i) => i !== idx),
    }));
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error(t('lca.toast.nameRequired', 'Le nom du produit est requis.'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/lca/products', {
        name: name.trim(),
        sku: sku.trim() || undefined,
        functional_unit: functionalUnit.trim() || '1 unité',
        annual_volume: annualVolume ? parseFloat(annualVolume) : undefined,
        description: description.trim() || undefined,
        stages,
      });
      toast.success(t('lca.toast.created', 'Produit créé'));
      onCreated();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('lca.toast.createErr', 'Erreur lors de la création'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('lca.modal.title', 'Nouveau produit LCA')}</h2>
            <p className="text-xs text-gray-500">{t('lca.modal.subtitle', "Renseignez les entrées par étape — l'impact sera calculé automatiquement")}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <Trash2 size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{t('lca.field.name', 'Nom *')}</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('lca.ph.name', 'Ex : Bouteille verre 500ml')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{t('lca.field.sku', 'SKU (optionnel)')}</label>
              <input
                type="text"
                value={sku}
                onChange={e => setSku(e.target.value)}
                placeholder="BOT-500-V"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{t('lca.field.functionalUnit', 'Unité fonctionnelle *')}</label>
              <input
                type="text"
                value={functionalUnit}
                onChange={e => setFunctionalUnit(e.target.value)}
                placeholder={t('lca.ph.functionalUnit', 'Ex: 1 bouteille 500ml')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{t('lca.field.annualVolume', 'Volume annuel (optionnel)')}</label>
              <input
                type="number"
                value={annualVolume}
                onChange={e => setAnnualVolume(e.target.value)}
                placeholder="500000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{t('lca.field.description', 'Description (optionnel)')}</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Stage tabs */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">{t('lca.modal.stages', 'Étapes du cycle de vie')}</p>
            <div className="flex flex-wrap gap-1 mb-3 border-b border-gray-200">
              {STAGE_ORDER.map(s => {
                const cfg = STAGE_CFG[s];
                const Icon = cfg.icon;
                const count = (stages[s] || []).length;
                return (
                  <button
                    key={s}
                    onClick={() => setActiveStage(s)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                      activeStage === s
                        ? `${cfg.color} border-current`
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                  >
                    <Icon size={12} />
                    {cfg.label}
                    {count > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Stage items editor */}
            <StageEditor
              stage={activeStage}
              items={stages[activeStage] || []}
              factors={factors.find(c => c.code === activeStage)?.factors || []}
              onAdd={() => addItem(activeStage)}
              onUpdate={(idx, patch) => updateItem(activeStage, idx, patch)}
              onRemove={idx => removeItem(activeStage, idx)}
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
            {t('lca.btn.cancel', 'Annuler')}
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
          >
            {saving ? t('lca.btn.creating', 'Création…') : t('lca.btn.create', 'Créer le produit')}
          </button>
        </div>
      </div>
    </div>
  );
}

function StageEditor({
  stage, items, factors, onAdd, onUpdate, onRemove,
}: {
  stage: string;
  items: StageItem[];
  factors: ImpactFactor[];
  onAdd: () => void;
  onUpdate: (idx: number, patch: Partial<StageItem>) => void;
  onRemove: (idx: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">{t('lca.editor.empty', 'Aucune entrée — cliquez sur « Ajouter » pour commencer.')}</p>
      ) : (
        items.map((item, i) => {
          const factor = factors.find(f => f.code === item.factor_code);
          return (
            <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <select
                value={item.factor_code}
                onChange={e => onUpdate(i, { factor_code: e.target.value })}
                className="col-span-6 text-xs border border-gray-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {factors.map(f => (
                  <option key={f.code} value={f.code}>
                    {f.label_fr} ({f.kg_co2e_per_unit} kgCO₂eq/{f.unit})
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="any"
                value={item.quantity}
                onChange={e => onUpdate(i, { quantity: parseFloat(e.target.value) || 0 })}
                className="col-span-3 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="col-span-2 text-xs text-gray-500 font-mono">{factor?.unit || '—'}</span>
              <button
                onClick={() => onRemove(i)}
                className="col-span-1 text-red-500 hover:text-red-700 flex justify-center"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })
      )}
      <button
        onClick={onAdd}
        className="w-full text-xs font-semibold text-emerald-700 hover:text-emerald-800 border-2 border-dashed border-emerald-300 hover:border-emerald-400 rounded-lg py-2 transition-colors"
      >
        {t('lca.editor.add', '+ Ajouter une entrée')}
      </button>
    </div>
  );
}

// ─── Comparison View ───────────────────────────────────────────────────

function ComparisonView({ comparison, onBack }: { comparison: ComparisonResult; onBack: () => void }) {
  const { t } = useTranslation();
  const STAGE_CFG = getStageCfg(t);
  const maxTotal = Math.max(...comparison.products.map(p => p.total_kg_co2e));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <GitCompare size={18} className="text-blue-600" />
            {t('lca.compareView.title', 'Comparaison produits')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('lca.compareView.reference', 'Référence : {{ref}}', { ref: comparison.reference })}</p>
        </div>
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
          {t('lca.btn.backCatalog', '← Retour au catalogue')}
        </button>
      </div>

      {/* Waterfall-style comparison bars */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-4">{t('lca.compareView.totalFootprint', 'Empreinte totale par produit (kgCO₂eq / unité fonctionnelle)')}</h3>
        <div className="space-y-4">
          {comparison.products.map((p, idx) => (
            <div key={p.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-gray-400">{idx === 0 ? 'REF' : `#${idx + 1}`}</span>
                  <span className="text-sm font-semibold text-gray-900 truncate">{p.name}</span>
                  {p.sku && <span className="text-xs text-gray-400 font-mono">({p.sku})</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-900">
                    {p.total_kg_co2e.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                  </span>
                  {p.delta_vs_ref_pct !== undefined && (
                    <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      p.delta_vs_ref_pct > 0 ? 'bg-red-50 text-red-700' :
                      p.delta_vs_ref_pct < 0 ? 'bg-green-50 text-green-700' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {p.delta_vs_ref_pct > 0 ? <ArrowUp size={10} /> : p.delta_vs_ref_pct < 0 ? <ArrowDown size={10} /> : <Minus size={10} />}
                      {Math.abs(p.delta_vs_ref_pct)}%
                    </span>
                  )}
                </div>
              </div>
              {/* Stacked stage bar */}
              <div className="flex h-6 rounded-lg overflow-hidden bg-gray-100">
                {p.stages.map(s => {
                  const cfg = STAGE_CFG[s.stage];
                  const widthPct = maxTotal > 0 ? (s.total_kg_co2e / maxTotal) * 100 : 0;
                  return (
                    <div
                      key={s.stage}
                      style={{ width: `${widthPct}%`, backgroundColor: cfg?.hex || '#94a3b8' }}
                      className="h-full transition-all relative group"
                      title={`${s.label_fr}: ${s.total_kg_co2e.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kgCO₂eq (${s.pct_of_total}%)`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Stage legend */}
        <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-gray-100">
          {STAGE_ORDER.map(s => {
            const cfg = STAGE_CFG[s];
            if (!cfg) return null;
            return (
              <div key={s} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cfg.hex }} />
                {cfg.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations from hotspot analysis */}
      {comparison.recommendations.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
          <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-4">
            <Lightbulb size={16} className="text-amber-600" />
            {t('lca.compareView.recommendations', "Recommandations d'éco-conception")}
          </h3>
          <div className="space-y-3">
            {comparison.recommendations.map((rec, i) => (
              <div key={i} className="bg-white/80 rounded-xl p-4 border border-amber-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{rec.product}</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {t('lca.compareView.hotspot', "Hot spot : {{stage}} ({{pct}}% de l'empreinte)", { stage: rec.hotspot_stage, pct: rec.hotspot_pct })}
                    </p>
                    <p className="text-sm text-gray-700 mt-2">{rec.recommendation}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full whitespace-nowrap">
                    {rec.potential_impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Eco-Design View ───────────────────────────────────────────────────

function EcoDesignView({ tips, onBack }: { tips: Record<string, any[]>; onBack: () => void }) {
  const { t } = useTranslation();
  const STAGE_CFG = getStageCfg(t);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Lightbulb size={18} className="text-amber-600" />
            {t('lca.eco.title', "Guide d'éco-conception")}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('lca.eco.subtitle', 'Recommandations par étape du cycle de vie · ISO 14006')}</p>
        </div>
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
          {t('lca.btn.backCatalog', '← Retour au catalogue')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {STAGE_ORDER.map(stageKey => {
          const cfg = STAGE_CFG[stageKey];
          const stageTips = tips[stageKey];
          if (!cfg || !stageTips || stageTips.length === 0) return null;
          const Icon = cfg.icon;
          return (
            <div key={stageKey} className={`rounded-2xl border p-5 ${cfg.bg}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: cfg.hex + '20' }}>
                  <Icon size={18} style={{ color: cfg.hex }} />
                </div>
                <h3 className={`font-bold text-sm ${cfg.color}`}>{cfg.label}</h3>
              </div>
              <div className="space-y-2.5">
                {stageTips.map((tip: any, i: number) => (
                  <div key={i} className="bg-white/80 rounded-xl p-3 border border-white/60">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm text-gray-800 font-medium">{tip.tip}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                            {tip.impact}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            tip.effort === 'faible' ? 'bg-emerald-50 text-emerald-700' :
                            tip.effort === 'moyen' ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            Effort {tip.effort}
                          </span>
                        </div>
                      </div>
                      <Target size={14} className="text-gray-300 flex-shrink-0 mt-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
