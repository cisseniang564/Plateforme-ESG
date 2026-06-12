import { useEffect, useState } from 'react';
import { Building2, ExternalLink, AlertTriangle, CheckCircle2, Clock, Palette, Save, Image } from 'lucide-react';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';

interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  plan_tier: string;
  score_overall: number | null;
  score_environmental: number | null;
  score_social: number | null;
  score_governance: number | null;
  last_score_date: string | null;
  risks_count: number;
  pending_audit: boolean;
}

interface BrandingData {
  logo_url: string | null;
  primary_color: string;
  company_name: string;
}

const DEFAULT_BRANDING: BrandingData = {
  logo_url: null,
  primary_color: "#059669",
  company_name: "ESGFlow",
};

function ScoreBar({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  const color =
    value > 70
      ? 'bg-emerald-500'
      : value >= 40
      ? 'bg-amber-500'
      : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums w-8 text-right text-gray-700">
        {Math.round(value)}
      </span>
    </div>
  );
}

function PillarBadge({ label, value }: { label: string; value: number | null }) {
  if (value === null) return <span className="text-[10px] text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded">{label} —</span>;
  const color =
    value > 70
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : value >= 40
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-red-50 text-red-700 border-red-200';
  return (
    <span className={`text-[10px] font-semibold border px-1.5 py-0.5 rounded ${color}`}>
      {label} {Math.round(value)}
    </span>
  );
}

function PlanBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    free: 'bg-gray-100 text-gray-600',
    starter: 'bg-blue-50 text-blue-700',
    pro: 'bg-emerald-50 text-emerald-700',
    enterprise: 'bg-violet-50 text-violet-700',
  };
  const style = styles[tier] ?? styles.free;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${style}`}>
      {tier}
    </span>
  );
}

// ─── Branding Preview Card ────────────────────────────────────────────────────

function BrandingPreview({ branding }: { branding: BrandingData }) {
  const { t } = useTranslation();
  const initials = branding.company_name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden w-64 shadow-sm">
      {/* Simulated sidebar header */}
      <div
        className="flex items-center gap-2.5 px-3.5 h-14"
        style={{ backgroundColor: '#0c0e14' }}
      >
        {/* Logo mark */}
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: branding.primary_color }}
        >
          {branding.logo_url ? (
            <img
              src={branding.logo_url}
              alt="Logo"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="text-[11px] font-bold text-white leading-none">{initials}</span>
          )}
        </div>
        {/* Brand name */}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold text-white leading-tight tracking-tight truncate">
            {branding.company_name || 'ESGFlow'}
          </p>
          <p className="text-[10px] leading-tight" style={{ color: branding.primary_color }}>
            {t('cab.platformESG', 'Plateforme ESG')}
          </p>
        </div>
      </div>
      {/* Body hint */}
      <div className="px-3 py-2.5 bg-gray-50">
        <p className="text-[10px] text-gray-400 text-center">{t('cab.sidebarPreviewHint', "Aperçu de l'en-tête de la barre latérale")}</p>
      </div>
    </div>
  );
}

// ─── Branding Tab ─────────────────────────────────────────────────────────────

function BrandingTab() {
  const { t } = useTranslation();
  const [branding, setBranding] = useState<BrandingData>(DEFAULT_BRANDING);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/cabinet/branding')
      .then((res) => {
        const data: BrandingData = {
          logo_url: res.data.logo_url ?? null,
          primary_color: res.data.primary_color || DEFAULT_BRANDING.primary_color,
          company_name: res.data.company_name || DEFAULT_BRANDING.company_name,
        };
        setBranding(data);
      })
      .catch(() => setLoadError(t('cab.errLoadBranding', "Impossible de charger le branding. Les valeurs par défaut sont utilisées.")));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await api.put('/cabinet/branding', {
        logo_url: branding.logo_url || null,
        primary_color: branding.primary_color,
        company_name: branding.company_name,
      });
      const saved: BrandingData = {
        logo_url: res.data.logo_url ?? null,
        primary_color: res.data.primary_color,
        company_name: res.data.company_name,
      };
      setBranding(saved);
      localStorage.setItem('cabinet_branding', JSON.stringify(saved));
      setSaveMsg(t('cab.saveOk', "Branding sauvegardé avec succès."));
    } catch {
      setSaveMsg(t('cab.saveErr', "Erreur lors de la sauvegarde. Veuillez réessayer."));
    } finally {
      setSaving(false);
    }
  };

  const isValidHex = (val: string) => /^#[0-9A-Fa-f]{6}$/.test(val);

  return (
    <div className="max-w-2xl space-y-8">
      {loadError && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle size={15} />
          {loadError}
        </div>
      )}

      {/* Logo URL */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Image size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Logo URL</h3>
        </div>
        <p className="text-xs text-gray-500">
          {t('cab.logoDesc', "Entrez l'URL publique de votre logo (PNG, SVG, WEBP recommandé). Laissez vide pour utiliser les initiales.")}
        </p>
        <input
          type="text"
          placeholder="https://example.com/logo.png"
          value={branding.logo_url ?? ''}
          onChange={(e) => setBranding((b) => ({ ...b, logo_url: e.target.value || null }))}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        {/* Logo preview */}
        {branding.logo_url ? (
          <div className="flex items-center gap-3">
            <img
              src={branding.logo_url}
              alt={t('cab.logoPreviewAlt', 'Aperçu du logo')}
              className="h-12 w-12 rounded-lg object-cover border border-gray-200"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="text-xs text-gray-500">{t('cab.logoPreview', 'Aperçu du logo')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: branding.primary_color }}
            >
              <span className="text-sm font-bold text-white">
                {branding.company_name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </span>
            </div>
            <span className="text-xs text-gray-500">{t('cab.initials', 'Initiales (aucun logo défini)')}</span>
          </div>
        )}
      </div>

      {/* Primary color */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Palette size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">{t('cab.primaryColor', 'Couleur principale')}</h3>
        </div>
        <p className="text-xs text-gray-500">
          {t('cab.colorDesc', "Cette couleur sera appliquée comme teinte d'accentuation dans l'interface de vos clients.")}
        </p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={isValidHex(branding.primary_color) ? branding.primary_color : DEFAULT_BRANDING.primary_color}
            onChange={(e) => setBranding((b) => ({ ...b, primary_color: e.target.value }))}
            className="h-10 w-12 cursor-pointer rounded-lg border border-gray-200 p-0.5"
            title={t('cab.pickColor', 'Choisir une couleur')}
          />
          <input
            type="text"
            value={branding.primary_color}
            maxLength={7}
            placeholder="#059669"
            onChange={(e) => {
              const val = e.target.value;
              setBranding((b) => ({ ...b, primary_color: val }));
            }}
            className={`w-32 rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 ${
              isValidHex(branding.primary_color)
                ? 'border-gray-200 text-gray-900 focus:border-emerald-500 focus:ring-emerald-500'
                : 'border-red-300 text-red-600 focus:border-red-500 focus:ring-red-500'
            }`}
          />
          {!isValidHex(branding.primary_color) && (
            <span className="text-xs text-red-500">{t('cab.hexInvalid', 'Hex invalide')}</span>
          )}
        </div>
      </div>

      {/* Company name */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">{t('cab.brandName', 'Nom de la marque')}</h3>
        </div>
        <p className="text-xs text-gray-500">
          {t('cab.brandNameDesc', 'Ce nom s\'affichera dans l\'en-tête de la barre latérale à la place de "ESGFlow".')}
        </p>
        <input
          type="text"
          placeholder="ESGFlow"
          value={branding.company_name}
          onChange={(e) => setBranding((b) => ({ ...b, company_name: e.target.value }))}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">{t('cab.preview', 'Aperçu')}</h3>
        <p className="text-xs text-gray-500">
          {t('cab.previewDesc', "Voici comment l'en-tête de la barre latérale apparaîtra à vos clients.")}
        </p>
        <BrandingPreview branding={branding} />
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || !isValidHex(branding.primary_color)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {saving ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              {t('cab.saving', 'Sauvegarde…')}
            </>
          ) : (
            <>
              <Save size={14} />
              {t('cab.save', 'Sauvegarder')}
            </>
          )}
        </button>
        {saveMsg && (
          <span
            className={`text-sm ${
              saveMsg.startsWith('Erreur') || saveMsg.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {saveMsg}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

type ActiveTab = 'clients' | 'branding';

export default function CabinetDashboard() {
  const { t } = useTranslation();
  const [clients, setClients] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('clients');

  useEffect(() => {
    api
      .get('/cabinet/clients')
      .then((res) => setClients(res.data))
      .catch(() => setError(t('cab.errLoadClients', 'Impossible de charger la liste des clients.')))
      .finally(() => setLoading(false));
  }, []);

  const handleSwitch = async (tenantId: string) => {
    setSwitching(tenantId);
    try {
      await api.post(`/cabinet/switch-tenant/${tenantId}`);
      window.location.href = '/app';
    } catch {
      setError(t('cab.errSwitch', 'Impossible de basculer vers ce client.'));
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="bg-indigo-600 text-white px-6 py-2.5 text-sm flex items-center gap-2">
        <Building2 size={15} className="flex-shrink-0" />
        <span>
          {t('cab.bannerA', "Vous êtes en mode Cabinet. Cliquez sur ")}<strong>{t('cab.bannerAccess', 'Accéder')}</strong>{t('cab.bannerB', " pour basculer dans l'interface d'un client.")}
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('cab.pageTitle', 'Espace Cabinet — Vue multi-clients')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('cab.pageDesc', 'Gérez les dossiers ESG de tous vos clients depuis une interface unifiée.')}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors duration-100 border-b-2 -mb-px ${
              activeTab === 'clients'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Building2 size={14} />
              {t('cab.tabClients', 'Clients')}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors duration-100 border-b-2 -mb-px ${
              activeTab === 'branding'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Palette size={14} />
              {t('cab.tabBranding', 'Marque blanche')}
            </span>
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={15} />
            {error}
          </div>
        )}

        {/* Tab content */}
        {activeTab === 'branding' ? (
          <BrandingTab />
        ) : loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            {t('cab.loading', 'Chargement des clients…')}
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-20 gap-4">
            <Building2 size={40} className="text-gray-300" />
            <p className="text-gray-500 text-sm text-center max-w-xs">
              {t('cab.noClients', 'Aucun client trouvé. Invitez vos clients à rejoindre ESGflow.')}
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(window.location.origin + '/register')}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              <ExternalLink size={14} />
              {t('cab.shareLink', "Partager le lien d'inscription")}
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('cab.thClient', 'Client')}</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">{t('cab.thScore', 'Score ESG global')}</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">E / S / G</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('cab.thRisks', 'Risques actifs')}</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Audit</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900">{client.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{client.slug}</div>
                    </td>
                    <td className="px-5 py-4">
                      <PlanBadge tier={client.plan_tier} />
                    </td>
                    <td className="px-5 py-4 w-48">
                      <ScoreBar value={client.score_overall} />
                      {client.last_score_date && (
                        <div className="text-[10px] text-gray-400 mt-1">{client.last_score_date}</div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1 flex-wrap">
                        <PillarBadge label="E" value={client.score_environmental} />
                        <PillarBadge label="S" value={client.score_social} />
                        <PillarBadge label="G" value={client.score_governance} />
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {client.risks_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={10} />
                          {client.risks_count}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {client.pending_audit ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Clock size={10} />
                          {t('cab.auditPending', 'Audit en cours')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleSwitch(client.id)}
                        disabled={switching === client.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {switching === client.id ? (
                          t('cab.loadingDots', 'Chargement…')
                        ) : (
                          <>
                            <CheckCircle2 size={12} />
                            {t('cab.access', 'Accéder')}
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
