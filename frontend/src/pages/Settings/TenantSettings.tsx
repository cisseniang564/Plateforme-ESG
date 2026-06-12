import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store';
import { setUser, logout } from '@/store/slices/authSlice';
import TwoFactorSetupModal from '@/components/security/TwoFactorSetupModal';
import { authService } from '@/services/authService';
import {
  Building2, Users, Webhook, Plug, CreditCard, Shield, Key,
  Bell, Globe, Save, Download, RefreshCw, X, Check, AlertCircle,
  CheckCircle, Lock, Activity, ChevronRight, Zap, ExternalLink,
  Trash2, AlertTriangle, Mail, BarChart3, FileText, Database,
  Eye, EyeOff, Copy, Plus, ArrowUpRight, Star, ShieldCheck,
  Pencil, Link2, BadgeCheck,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import billingService, { Subscription } from '@/services/billingService';
import api from '@/services/api';

const DEFAULT_EMAIL = 'esgflow@greenconnect.cloud';

interface TenantData {
  id: string;
  name: string;
  slug: string;
  plan_tier: string;
  billing_email: string | null;
  max_users?: number;
  max_orgs?: number;
}

// ─── Nav sections ─────────────────────────────────────────────────────────────
type SectionId =
  | 'workspace'
  | 'members'
  | 'notifications'
  | 'integrations'
  | 'billing'
  | 'security'
  | 'sso'
  | 'api-keys'
  | 'sessions'
  | 'danger';

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

function getNavGroups(t: TFunction): { id: string; title: string; items: NavItem[] }[] {
  return [
    {
      id: 'workspace',
      title: t('settings.tenant.nav.group.workspace', 'Espace de travail'),
      items: [
        { id: 'workspace',      label: t('settings.tenant.nav.item.workspace', "Général"),       icon: Building2 },
        { id: 'members',        label: t('settings.tenant.nav.item.members', 'Membres'),          icon: Users },
        { id: 'notifications',  label: t('settings.tenant.nav.item.notifications', 'Notifications'), icon: Bell },
        { id: 'integrations',   label: t('settings.tenant.nav.item.integrations', "Intégrations"), icon: Plug },
      ],
    },
    {
      id: 'account',
      title: t('settings.tenant.nav.group.account', 'Compte'),
      items: [
        { id: 'billing',   label: t('settings.tenant.nav.item.billing', 'Facturation'),   icon: CreditCard },
        { id: 'security',  label: t('settings.tenant.nav.item.security', "Sécurité"),     icon: Shield },
        { id: 'sso',       label: 'SSO',                                                   icon: ShieldCheck, badge: 'OIDC', badgeColor: 'bg-blue-100 text-blue-600' },
        { id: 'api-keys',  label: t('settings.tenant.nav.item.api-keys', "Clés API"),    icon: Key },
        { id: 'sessions',  label: t('settings.tenant.nav.item.sessions', 'Sessions'),    icon: Activity },
      ],
    },
    {
      id: 'advanced',
      title: t('settings.tenant.nav.group.advanced', "Avancé"),
      items: [
        { id: 'danger', label: t('settings.tenant.nav.item.danger', 'Zone de danger'), icon: AlertTriangle, badge: '!', badgeColor: 'bg-red-100 text-red-600' },
      ],
    },
  ];
}

// ─── Static data ──────────────────────────────────────────────────────────────
function getSettingsModules(t: TFunction) {
  return [
    { id: 'webhooks',    title: 'Webhooks',           desc: t('settings.tenant.modules.webhooks.desc', 'Notifications temps réel'),           icon: Webhook,    gradient: 'from-green-500 to-emerald-600',  badge: t('settings.tenant.modules.webhooks.badge', '3 actifs'),       path: '/app/settings/webhooks' },
    { id: 'insee',       title: 'API INSEE Sirene',   desc: t('settings.tenant.modules.insee.desc', 'Données entreprises françaises'),         icon: Building2,  gradient: 'from-indigo-500 to-indigo-600',  badge: 'Gov API',                                                      path: '/app/settings/insee' },
    { id: 'enrichment',  title: t('settings.tenant.modules.enrichment.title', 'Enrichissement ESG'),  desc: t('settings.tenant.modules.enrichment.desc', "Génération données IA"),              icon: Database,   gradient: 'from-purple-500 to-purple-600',  badge: 'AI',              path: '/app/settings/esg-enrichment' },
    { id: 'integrations',title: t('settings.tenant.modules.integrations.title', 'Connecteurs'),       desc: t('settings.tenant.modules.integrations.desc', 'Google Sheets, Power BI, SAP…'), icon: Plug,      gradient: 'from-orange-500 to-orange-600',  badge: t('settings.tenant.modules.integrations.badge', '5 connectés'), path: '/app/settings/integrations' },
    { id: 'methodology', title: t('settings.tenant.modules.methodology.title', 'Méthodologies'),      desc: t('settings.tenant.modules.methodology.desc', 'GRI, SASB, TCFD, ESRS'),             icon: BarChart3,  gradient: 'from-teal-500 to-teal-600',      badge: t('settings.tenant.modules.methodology.badge', '3 actives'),   path: '/app/settings/methodology' },
    { id: 'api-docs',    title: 'API Docs',           desc: t('settings.tenant.modules.api-docs.desc', 'Documentation Swagger'),               icon: FileText,   gradient: 'from-pink-500 to-pink-600',      badge: 'Swagger',                                                      path: '/docs', external: true },
  ];
}

// ─── Live data interfaces ──────────────────────────────────────────────────────
interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  description?: string | null;
  created_at: string;
  last_used_at?: string | null;
  expires_at?: string | null;
  is_active: boolean;
}

interface TenantUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  role?: { name: string } | null;
}

interface AuditEvent {
  id: string;
  action: string;
  user: string;
  module: string;
  description: string;
  timestamp: string | null;
}

function relativeTime(iso: string | null, t: TFunction): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return t('settings.tenant.time.justNow', "À l'instant");
  if (m < 60) return t('settings.tenant.time.minutesAgo', 'Il y a {{m}} min', { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('settings.tenant.time.hoursAgo', 'Il y a {{h}}h', { h });
  const d = Math.floor(h / 24);
  return t('settings.tenant.time.daysAgo', 'Il y a {{d}}j', { d });
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 py-5 border-b border-gray-100 last:border-0">
      <div className="sm:w-56 flex-shrink-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function SectionHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {desc && <p className="text-sm text-gray-500 mt-0.5">{desc}</p>}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${checked ? 'bg-violet-600' : 'bg-gray-200'}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

// ─── SSO Tab ──────────────────────────────────────────────────────────────────
function SSOTab() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [form, setForm] = useState({
    provider_name: '',
    provider_type: 'oidc',
    issuer_url: '',
    client_id: '',
    client_secret: '',
    scopes: 'openid email profile',
    email_attribute: 'email',
    first_name_attribute: 'given_name',
    last_name_attribute: 'family_name',
    allowed_domains: '',
    is_enabled: true,
  });

  useEffect(() => {
    api.get('/sso/config')
      .then(res => {
        if (res.data) {
          setConfig(res.data);
          setForm(f => ({ ...f, ...res.data, client_secret: '' }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.post('/sso/config', form);
      setConfig(res.data);
      toast.success(t('settings.tenant.sso.saved', 'Configuration SSO sauvegardée'));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('settings.tenant.sso.error', 'Erreur'));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await api.get('/sso/test-config');
      toast.success(t('settings.tenant.sso.testOk', 'Connexion OK — Provider: {{issuer}}', { issuer: res.data.issuer }));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('settings.tenant.sso.testFailed', 'Échec du test'));
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('settings.tenant.sso.disableConfirm', 'Désactiver le SSO ?'))) return;
    await api.delete('/sso/config');
    setConfig(null);
    toast.success(t('settings.tenant.sso.disabled', 'SSO désactivé'));
  };

  if (loading) return (
    <div className="flex justify-center p-8">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{t('settings.tenant.sso.title', 'Authentification unique (SSO)')}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {t('settings.tenant.sso.subtitle', "Connectez votre fournisseur d'identité OIDC (Okta, Microsoft Entra, Google Workspace, Keycloak...)")}
          </p>
        </div>
        {config && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.is_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {config.is_enabled ? t('settings.tenant.sso.active', 'Actif') : t('settings.tenant.sso.inactive', 'Inactif')}
          </span>
        )}
      </div>

      {/* OIDC preset buttons */}
      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">{t('settings.tenant.sso.prefillFor', 'Pré-remplir pour :')}</p>
        <div className="flex flex-wrap gap-2">
          {[
            { name: 'Microsoft Entra', issuer: 'https://login.microsoftonline.com/{tenant}/v2.0', icon: '🏢' },
            { name: 'Okta',            issuer: 'https://{domain}.okta.com',                      icon: '🔑' },
            { name: 'Google Workspace',issuer: 'https://accounts.google.com',                    icon: '🔵' },
            { name: 'Keycloak',        issuer: 'https://your-keycloak.com/realms/{realm}',       icon: '🔐' },
          ].map(p => (
            <button
              key={p.name}
              onClick={() => setForm(f => ({ ...f, provider_name: p.name, issuer_url: f.issuer_url || p.issuer }))}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {p.icon} {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.tenant.sso.providerName', 'Nom du provider *')}</label>
          <input
            value={form.provider_name}
            onChange={e => setForm(f => ({ ...f, provider_name: e.target.value }))}
            placeholder={t('settings.tenant.sso.providerNamePlaceholder', 'ex: Okta, Microsoft Entra...')}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.tenant.sso.issuerUrl', 'URL Issuer (Discovery) *')}</label>
          <input
            value={form.issuer_url}
            onChange={e => setForm(f => ({ ...f, issuer_url: e.target.value }))}
            placeholder="https://login.microsoftonline.com/.../v2.0"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.tenant.sso.clientId', 'Client ID *')}</label>
          <input
            value={form.client_id}
            onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {config ? t('settings.tenant.sso.clientSecretOptional', 'Client Secret (laisser vide pour ne pas modifier)') : t('settings.tenant.sso.clientSecretRequired', 'Client Secret *')}
          </label>
          <input
            type="password"
            value={form.client_secret}
            onChange={e => setForm(f => ({ ...f, client_secret: e.target.value }))}
            placeholder={config ? '••••••••' : t('settings.tenant.sso.clientSecretPlaceholder', 'client secret...')}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.tenant.sso.scopes', 'Scopes')}</label>
          <input
            value={form.scopes}
            onChange={e => setForm(f => ({ ...f, scopes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.tenant.sso.allowedDomains', 'Domaines autorisés (optionnel)')}</label>
          <input
            value={form.allowed_domains}
            onChange={e => setForm(f => ({ ...f, allowed_domains: e.target.value }))}
            placeholder={t('settings.tenant.sso.allowedDomainsPlaceholder', 'monentreprise.com, filiale.com')}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">{t('settings.tenant.sso.allowedDomainsHint', 'Séparez les domaines par des virgules')}</p>
        </div>
      </div>

      {/* Attribute mapping */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">{t('settings.tenant.sso.attributeMapping', 'Mapping des attributs')}</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t('settings.tenant.sso.attrEmail', 'Email'),   key: 'email_attribute' },
            { label: t('settings.tenant.sso.attrFirstName', 'Prénom'), key: 'first_name_attribute' },
            { label: t('settings.tenant.sso.attrLastName', 'Nom'),    key: 'last_name_attribute' },
          ].map(attr => (
            <div key={attr.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{attr.label}</label>
              <input
                value={form[attr.key as keyof typeof form] as string}
                onChange={e => setForm(f => ({ ...f, [attr.key]: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Enable toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setForm(f => ({ ...f, is_enabled: !f.is_enabled }))}
          className={`relative w-11 h-6 rounded-full transition-colors ${form.is_enabled ? 'bg-violet-600' : 'bg-gray-200'}`}
        >
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.is_enabled ? 'translate-x-5' : ''}`} />
        </div>
        <span className="text-sm text-gray-700">{t('settings.tenant.sso.enableForTenant', 'Activer le SSO pour ce tenant')}</span>
      </label>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {saving
            ? <><div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('settings.tenant.sso.saving', 'Sauvegarde…')}</>
            : <><Save size={14} /> {t('settings.tenant.sso.save', 'Sauvegarder')}</>
          }
        </button>
        {config?.issuer_url && (
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {testing ? t('settings.tenant.sso.testing', 'Test…') : t('settings.tenant.sso.testConnection', 'Tester la connexion')}
          </button>
        )}
        {config && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors ml-auto"
          >
            {t('settings.tenant.sso.disable', 'Désactiver')}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TenantSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [active, setActive] = useState<SectionId>('workspace');
  const [saving, setSaving] = useState(false);
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [tenantLoading, setTenantLoading] = useState(true);

  // 2FA
  const [show2FA, setShow2FA]               = useState(false);
  const [mfaEnabled, setMfaEnabled]         = useState(currentUser?.mfa_enabled ?? false);
  const [disabling2FA, setDisabling2FA]     = useState(false);
  const [disablePassword, setDisablePass]   = useState('');
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disable2FAError, setDisable2FAErr] = useState('');

  // API keys
  const [showNewKey, setShowNewKey]   = useState(false);
  const [newKeyName, setNewKeyName]   = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  // Billing
  const [subscription, setSub]         = useState<Subscription | null>(null);
  const [billingLoading, setBilLoad]    = useState(false);

  // Danger zone modals & confirmation typing
  const [dangerAction, setDangerAction] = useState<null | 'reset' | 'delete'>(null);
  const [dangerInput, setDangerInput]   = useState('');
  const [dangerBusy, setDangerBusy]     = useState(false);
  const [exporting, setExporting]       = useState(false);

  // Form
  const [form, setForm] = useState({
    companyName: '',
    billingEmail: DEFAULT_EMAIL,
    sector: 'finance',
    timezone: 'Europe/Paris',
    language: 'fr',
    website: '',
  });

  // Live data
  const [tenantUsers, setTenantUsers]       = useState<TenantUser[]>([]);
  const [usersLoading, setUsersLoading]     = useState(false);
  const [apiKeys, setApiKeys]               = useState<ApiKeyItem[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [auditEvents, setAuditEvents]       = useState<AuditEvent[]>([]);
  const [auditLoading, setAuditLoading]     = useState(false);
  const [createdKey, setCreatedKey]         = useState<{ name: string; fullKey: string } | null>(null);

  // Notifications
  const [notifs, setNotifs] = useState({
    weeklyReport: true,
    thresholdAlerts: true,
    productUpdates: false,
    securityAlerts: true,
    invoiceEmails: true,
    apiUsageAlerts: false,
  });

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const s = p.get('tab') as SectionId | null;
    if (s) setActive(s);
    if (p.get('checkout') === 'success') {
      toast.success(t('settings.tenant.toast.subscriptionActivated', 'Abonnement activé avec succès !'));
      setActive('billing');
      window.history.replaceState({}, '', window.location.pathname + '?tab=billing');
    }
  }, []);

  // Load real tenant data
  useEffect(() => {
    setTenantLoading(true);
    api.get('/tenants/me')
      .then(res => {
        const tenant: TenantData = res.data;
        setTenantData(tenant);
        setForm(f => ({
          ...f,
          companyName: tenant.name || f.companyName,
          billingEmail: tenant.billing_email || DEFAULT_EMAIL,
        }));
      })
      .catch(() => {})
      .finally(() => setTenantLoading(false));
  }, []);

  useEffect(() => {
    if (active !== 'billing') return;
    setBilLoad(true);
    billingService.getSubscription().then(setSub).catch(() => null).finally(() => setBilLoad(false));
  }, [active]);

  useEffect(() => {
    if (active !== 'members') return;
    setUsersLoading(true);
    api.get('/users/?page_size=5')
      .then(res => setTenantUsers(res.data.items || []))
      .catch(() => setTenantUsers([]))
      .finally(() => setUsersLoading(false));
  }, [active]);

  useEffect(() => {
    if (active !== 'api-keys') return;
    setApiKeysLoading(true);
    api.get('/api-keys/')
      .then(res => setApiKeys(res.data || []))
      .catch(() => setApiKeys([]))
      .finally(() => setApiKeysLoading(false));
  }, [active]);

  useEffect(() => {
    if (active !== 'sessions') return;
    setAuditLoading(true);
    api.get('/audit-trail?limit=4')
      .then(res => setAuditEvents(res.data.events || res.data.items || res.data || []))
      .catch(() => setAuditEvents([]))
      .finally(() => setAuditLoading(false));
  }, [active]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/tenants/me', {
        name: form.companyName,
        billing_email: form.billingEmail,
      });
      setTenantData(res.data);
      toast.success(t('settings.tenant.toast.settingsSaved', 'Paramètres sauvegardés'));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('settings.tenant.toast.saveError', 'Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
    }
  };

  const handle2FAEnabled = () => {
    setMfaEnabled(true);
    if (currentUser) dispatch(setUser({ ...currentUser, mfa_enabled: true }));
    toast.success(t('settings.tenant.toast.twoFAEnabled', '2FA activée — compte protégé'));
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisable2FAErr('');
    setDisabling2FA(true);
    try {
      await authService.disable2FA(disablePassword);
      setMfaEnabled(false);
      if (currentUser) dispatch(setUser({ ...currentUser, mfa_enabled: false }));
      setShowDisable2FA(false);
      setDisablePass('');
      toast.success(t('settings.tenant.toast.twoFADisabled', '2FA désactivée'));
    } catch (err: any) {
      setDisable2FAErr(err?.response?.data?.detail || t('settings.tenant.toast.wrongPassword', 'Mot de passe incorrect'));
    } finally {
      setDisabling2FA(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) { toast.error(t('settings.tenant.toast.nameRequired', 'Nom requis')); return; }
    try {
      const res = await api.post('/api-keys/', { name: newKeyName });
      const created = res.data;
      setApiKeys(prev => [{ ...created, is_active: true }, ...prev]);
      setCreatedKey({ name: created.name, fullKey: created.full_key });
      setShowNewKey(false);
      setNewKeyName('');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('settings.tenant.toast.createError', 'Erreur lors de la création'));
    }
  };

  const handleRevokeKey = async (keyId: string, keyName: string) => {
    if (!confirm(t('settings.tenant.toast.revokeConfirm', 'Révoquer la clé "{{keyName}}" ? Cette action est irréversible.', { keyName }))) return;
    try {
      await api.delete(`/api-keys/${keyId}`);
      setApiKeys(prev => prev.filter(k => k.id !== keyId));
      toast.success(t('settings.tenant.toast.keyRevoked', 'Clé "{{keyName}}" révoquée', { keyName }));
    } catch {
      toast.error(t('settings.tenant.toast.revokeError', 'Erreur lors de la révocation'));
    }
  };

  const handlePortal = async () => {
    try {
      const url = await billingService.createPortal();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch { toast.error(t('settings.tenant.toast.portalUnavailable', 'Portail de facturation indisponible')); }
  };

  // ── Sidebar ──────────────────────────────────────────────────────────────────
  const navGroups = getNavGroups(t);
  const Sidebar = (
    <aside className="w-52 flex-shrink-0">
      <nav className="space-y-6">
        {navGroups.map(group => (
          <div key={group.id}>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1 px-3">{group.title}</p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActive(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-violet-50 text-violet-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={15} className={isActive ? 'text-violet-600' : 'text-gray-400'} />
                    <span className="pointer-events-none flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full pointer-events-none ${item.badgeColor || 'bg-gray-100 text-gray-500'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );

  // ── Content sections ──────────────────────────────────────────────────────────

  const WorkspaceSection = (
    <div>
      <SectionHeader title={t('settings.tenant.workspace.title', 'Général')} desc={t('settings.tenant.workspace.desc', 'Informations de votre organisation affichées dans les rapports et factures.')} />

      {/* ── Organisation name mapping card ────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-violet-100 overflow-hidden" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-violet-100">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
            <Link2 size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-violet-900">{t('settings.tenant.workspace.orgName', "Nom de l'organisation")}</p>
            <p className="text-xs text-violet-500">{t('settings.tenant.workspace.orgNameSynced', 'Synchronisé avec votre tenant ESG Flow')}</p>
          </div>
          {tenantData && (
            <span className="ml-auto flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: '#d1fae5', color: '#065f46' }}>
              <BadgeCheck size={11} /> {t('settings.tenant.workspace.mapped', 'Mappé')}
            </span>
          )}
        </div>

        {/* Current value display */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-violet-700 mb-1.5 uppercase tracking-wide">{t('settings.tenant.workspace.displayName', 'Nom affiché')}</label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-400" />
                <input
                  value={form.companyName}
                  onChange={e => setForm({ ...form, companyName: e.target.value })}
                  placeholder={tenantLoading ? t('settings.tenant.workspace.loading', 'Chargement…') : t('settings.tenant.workspace.orgNamePlaceholder', 'Nom de votre organisation')}
                  className="w-full pl-9 pr-4 py-2.5 border border-violet-200 rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>
          {tenantData?.slug && (
            <div className="flex items-center gap-2 text-xs text-violet-500">
              <span className="font-mono bg-violet-50 border border-violet-100 px-2 py-0.5 rounded text-violet-600">{tenantData.slug}</span>
              <span className="text-violet-400">{t('settings.tenant.workspace.uniqueId', 'identifiant unique (non modifiable)')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Email de contact */}
      <Field label={t('settings.tenant.workspace.contactEmail', 'Email de contact')} hint={t('settings.tenant.workspace.contactEmailHint', "Reçoit les factures, alertes d'usage et notifications de la plateforme.")}>
        <div className="space-y-1.5">
          <div className="relative max-w-sm">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={form.billingEmail}
              onChange={e => setForm({ ...form, billingEmail: e.target.value })}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          {form.billingEmail === DEFAULT_EMAIL && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle size={11} /> {t('settings.tenant.workspace.officialEmail', 'Email ESG Flow officiel')}
            </p>
          )}
        </div>
      </Field>

      <Field label={t('settings.tenant.workspace.website', 'Site web')}>
        <div className="relative max-w-sm">
          <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="url"
            value={form.website}
            onChange={e => setForm({ ...form, website: e.target.value })}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </Field>

      <Field label={t('settings.tenant.workspace.sector', "Secteur d'activité")}>
        <select
          value={form.sector}
          onChange={e => setForm({ ...form, sector: e.target.value })}
          className="max-w-sm w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none"
        >
          <option value="finance">{t('settings.tenant.workspace.sectorFinance', 'Finance & Services')}</option>
          <option value="industry">{t('settings.tenant.workspace.sectorIndustry', 'Industrie')}</option>
          <option value="energy">{t('settings.tenant.workspace.sectorEnergy', 'Énergie')}</option>
          <option value="tech">{t('settings.tenant.workspace.sectorTech', 'Technologie')}</option>
          <option value="commerce">{t('settings.tenant.workspace.sectorCommerce', 'Commerce')}</option>
          <option value="agriculture">{t('settings.tenant.workspace.sectorAgriculture', 'Agriculture')}</option>
          <option value="immobilier">{t('settings.tenant.workspace.sectorRealEstate', 'Immobilier')}</option>
        </select>
      </Field>

      <Field label={t('settings.tenant.workspace.timezone', 'Fuseau horaire')}>
        <select
          value={form.timezone}
          onChange={e => setForm({ ...form, timezone: e.target.value })}
          className="max-w-sm w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none"
        >
          <option value="Europe/Paris">🇫🇷 Europe/Paris (UTC+1)</option>
          <option value="Europe/London">🇬🇧 Europe/London (UTC+0)</option>
          <option value="Europe/Berlin">🇩🇪 Europe/Berlin (UTC+1)</option>
          <option value="America/New_York">🇺🇸 America/New_York (UTC-5)</option>
        </select>
      </Field>

      <Field label={t('settings.tenant.workspace.interfaceLanguage', "Langue de l'interface")}>
        <select
          value={form.language}
          onChange={e => setForm({ ...form, language: e.target.value })}
          className="max-w-sm w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none"
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </Field>

      <div className="pt-5">
        <button
          onClick={handleSave}
          disabled={saving || tenantLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
          style={{ background: '#7c3aed', color: 'white' }}
        >
          {saving
            ? <><div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('settings.tenant.workspace.saving', 'Sauvegarde…')}</>
            : <><Save size={14} /> {t('settings.tenant.workspace.saveChanges', 'Sauvegarder les modifications')}</>
          }
        </button>
      </div>
    </div>
  );

  const MembersSection = (
    <div>
      <SectionHeader title={t('settings.tenant.members.title', 'Membres')} desc={t('settings.tenant.members.desc', 'Gérez les utilisateurs, rôles et permissions de votre espace de travail.')} />
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <p className="text-sm font-medium text-gray-700">
            {usersLoading ? t('settings.tenant.members.loading', 'Chargement…') : `${tenantUsers.filter(u => u.is_active).length} membre${tenantUsers.filter(u => u.is_active).length !== 1 ? 's' : ''} actif${tenantUsers.filter(u => u.is_active).length !== 1 ? 's' : ''}`}
          </p>
          <button
            onClick={() => navigate('/app/settings/users')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700"
          >
            {t('settings.tenant.members.manage', 'Gérer')} <ArrowUpRight size={13} />
          </button>
        </div>

        {usersLoading ? (
          <div className="px-5 py-8 flex justify-center">
            <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : tenantUsers.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-gray-400">{t('settings.tenant.members.noUsers', 'Aucun utilisateur trouvé.')}</div>
        ) : (
          tenantUsers.map(u => {
            const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email;
            const initials = ([u.first_name?.[0], u.last_name?.[0]].filter(Boolean).join('') || u.email[0]).toUpperCase();
            const roleName = u.role?.name || '—';
            return (
              <div key={u.id} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                      {displayName}
                      {!u.is_active && <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">{t('settings.tenant.members.inactive', 'Inactif')}</span>}
                    </p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  roleName.toLowerCase().includes('admin') ? 'bg-violet-100 text-violet-700' :
                  roleName.toLowerCase().includes('analyst') || roleName.toLowerCase().includes('analyste') ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{roleName}</span>
              </div>
            );
          })
        )}

        <div className="px-5 py-3.5 bg-gray-50/50">
          <button
            onClick={() => navigate('/app/settings/users')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <Plus size={13} /> {t('settings.tenant.members.invite', 'Inviter un membre')}
          </button>
        </div>
      </div>
    </div>
  );

  const NotificationsSection = (
    <div>
      <SectionHeader title={t('settings.tenant.notifications.title', 'Notifications')} desc={t('settings.tenant.notifications.desc', 'Choisissez les événements pour lesquels vous souhaitez être alerté.')} />

      {[
        { key: 'weeklyReport' as const,    label: t('settings.tenant.notifications.weeklyReport', 'Rapport hebdomadaire'),  desc: t('settings.tenant.notifications.weeklyReportDesc', 'Résumé ESG chaque lundi matin') },
        { key: 'thresholdAlerts' as const, label: t('settings.tenant.notifications.thresholdAlerts', 'Alertes de seuils'), desc: t('settings.tenant.notifications.thresholdAlertsDesc', 'Quand un KPI dépasse les limites définies') },
        { key: 'securityAlerts' as const,  label: t('settings.tenant.notifications.securityAlerts', 'Alertes de sécurité'), desc: t('settings.tenant.notifications.securityAlertsDesc', 'Connexions suspectes, nouvelles sessions') },
        { key: 'invoiceEmails' as const,   label: t('settings.tenant.notifications.invoiceEmails', 'Emails de facturation'), desc: t('settings.tenant.notifications.invoiceEmailsDesc', 'Factures, renouvellements, échecs de paiement') },
        { key: 'apiUsageAlerts' as const,  label: t('settings.tenant.notifications.apiUsageAlerts', "Alertes d'usage API"), desc: t('settings.tenant.notifications.apiUsageAlertsDesc', 'Quand vous approchez de votre limite mensuelle') },
        { key: 'productUpdates' as const,  label: t('settings.tenant.notifications.productUpdates', 'Nouveautés produit'),  desc: t('settings.tenant.notifications.productUpdatesDesc', 'Nouvelles fonctionnalités et mises à jour') },
      ].map(item => (
        <div key={item.key} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
          <div>
            <p className="text-sm font-medium text-gray-900">{item.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
          </div>
          <Toggle
            checked={notifs[item.key]}
            onChange={v => setNotifs({ ...notifs, [item.key]: v })}
          />
        </div>
      ))}

      <div className="pt-5">
        <button
          onClick={() => { toast.success(t('settings.tenant.notifications.saved', 'Préférences de notification sauvegardées')); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <Save size={14} /> {t('settings.tenant.notifications.save', 'Sauvegarder')}
        </button>
      </div>
    </div>
  );

  const settingsModules = getSettingsModules(t);
  const IntegrationsSection = (
    <div>
      <SectionHeader title={t('settings.tenant.integrations.title', 'Intégrations & Modules')} desc={t('settings.tenant.integrations.desc', 'Configurez les connecteurs et modules actifs de votre plateforme.')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {settingsModules.map(mod => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => {
                if ((mod as any).external) window.open(`${(import.meta.env.VITE_API_URL || '').replace('/api/v1', '')}/docs`, '_blank', 'noopener,noreferrer');
                else navigate(mod.path);
              }}
              className="group flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-white hover:border-violet-200 hover:shadow-sm transition-all text-left"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                <Icon size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  {mod.title}
                  {(mod as any).external && <ExternalLink size={11} className="text-gray-400" />}
                </p>
                <p className="text-xs text-gray-400 truncate">{mod.desc}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{mod.badge}</span>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Methodologies */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">{t('settings.tenant.integrations.activeRefs', 'Référentiels actifs')}</p>
          <button onClick={() => navigate('/app/settings/methodology')} className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
            {t('settings.tenant.integrations.configure', 'Configurer')} <ChevronRight size={12} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { name: 'GRI Standards 2024',      version: 'v1.0', emoji: '🌿' },
            { name: 'SASB Framework',           version: 'v2.1', emoji: '📊' },
            { name: 'TCFD Recommendations',     version: 'v3.0', emoji: '🌡️' },
          ].map(m => (
            <div key={m.name} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-lg">{m.emoji}</span>
              <div>
                <p className="text-xs font-semibold text-gray-800">{m.name}</p>
                <p className="text-[10px] text-gray-400">{m.version}</p>
              </div>
              <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">{t('settings.tenant.integrations.active', 'Actif')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const BillingSection = (
    <div>
      <SectionHeader title={t('settings.tenant.billing.title', 'Facturation')} desc={t('settings.tenant.billing.desc', 'Plan actuel, usage et historique de vos factures.')} />

      {billingLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
          <div className="h-4 w-4 border-2 border-gray-200 border-t-violet-600 rounded-full animate-spin" /> {t('settings.tenant.billing.loading', 'Chargement…')}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Plan tile */}
          <div className="rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Star size={18} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    Plan {billingService.planLabel(subscription?.plan_tier || 'free')}
                  </p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    subscription?.status === 'active' || !subscription?.status
                      ? 'bg-emerald-100 text-emerald-700'
                      : subscription?.status === 'past_due'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {subscription?.status === 'active' ? t('settings.tenant.billing.statusActive', 'Actif') : subscription?.status === 'trialing' ? t('settings.tenant.billing.statusTrialing', 'Essai') : subscription?.status === 'past_due' ? t('settings.tenant.billing.statusPastDue', 'En retard') : 'Free'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {subscription?.current_period_end
                    ? t('settings.tenant.billing.renewalDate', 'Renouvellement le {{date}}', { date: new Date(subscription.current_period_end).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) })
                    : t('settings.tenant.billing.noSubscription', 'Aucun abonnement actif')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {subscription?.stripe_customer_id && (
                <button onClick={handlePortal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  <ExternalLink size={12} /> {t('settings.tenant.billing.stripePortal', 'Portail Stripe')}
                </button>
              )}
              <button
                onClick={() => navigate('/app/billing')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 rounded-lg text-xs font-medium text-white hover:bg-violet-700 transition-colors">
                {t('settings.tenant.billing.manage', 'Gérer')} <ArrowUpRight size={12} />
              </button>
            </div>
          </div>

          {/* Usage bars */}
          {subscription && (
            <div className="rounded-xl border border-gray-200 p-5 space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('settings.tenant.billing.monthlyUsage', 'Usage du mois')}</p>
              {[
                { label: t('settings.tenant.billing.apiCalls', 'Appels API'),     used: 8432, max: subscription.max_monthly_api_calls || 10000, color: 'bg-violet-500' },
                { label: t('settings.tenant.billing.users', 'Utilisateurs'),   used: 12,   max: subscription.max_users || 50,                color: 'bg-blue-500' },
                { label: t('settings.tenant.billing.organisations', 'Organisations'),  used: 29,   max: subscription.max_orgs || 100,               color: 'bg-emerald-500' },
              ].map(item => {
                const pct = item.max > 0 ? Math.min(100, Math.round((item.used / item.max) * 100)) : 0;
                const warn = pct >= 80;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-600 font-medium">{item.label}</span>
                      <span className={`font-semibold ${warn ? 'text-orange-600' : 'text-gray-700'}`}>
                        {item.used.toLocaleString()} / {item.max > 0 ? item.max.toLocaleString() : '∞'}
                        <span className="text-gray-400 font-normal ml-1">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${warn ? 'bg-orange-400' : item.color}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Zap size={11} />
            {t('settings.tenant.billing.billingPageHint', 'Pour gérer les plans, les factures et les moyens de paiement, rendez-vous sur la')}{' '}
            <button onClick={() => navigate('/app/billing')} className="text-violet-600 hover:underline font-medium">{t('settings.tenant.billing.billingPageLink', 'page Facturation')}</button>.
          </p>
        </div>
      )}
    </div>
  );

  const SecuritySection = (
    <div>
      <SectionHeader title={t('settings.tenant.security.title', 'Sécurité')} desc={t('settings.tenant.security.desc', 'Authentification à deux facteurs et paramètres de sécurité du compte.')} />

      {/* Security score */}
      <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 p-5 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-white/60 uppercase tracking-wide">{t('settings.tenant.security.scoreLabel', 'Score de sécurité')}</p>
            <p className="text-3xl font-black mt-1">{mfaEnabled ? 'A+' : 'B'}</p>
            <p className="text-xs text-white/70 mt-0.5">{mfaEnabled ? t('settings.tenant.security.scoreExcellent', 'Excellent — tous les contrôles actifs') : t('settings.tenant.security.scoreEnable2FA', 'Activez la 2FA pour atteindre A+')}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '2FA',            ok: mfaEnabled },
              { label: 'TLS',            ok: true },
              { label: 'Audit logs',     ok: true },
            ].map(c => (
              <div key={c.label} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg ${c.ok ? 'bg-white/10' : 'bg-amber-400/20'}`}>
                {c.ok
                  ? <CheckCircle size={14} className="text-emerald-400" />
                  : <AlertCircle size={14} className="text-amber-400" />
                }
                <span className="text-[10px] font-medium">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2FA */}
      <div className="rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 p-2 rounded-lg ${mfaEnabled ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              <Lock size={15} className={mfaEnabled ? 'text-emerald-600' : 'text-amber-500'} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{t('settings.tenant.security.twoFA', 'Authentification à deux facteurs')}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t('settings.tenant.security.twoFADesc', 'Application TOTP (Google Authenticator, Authy, 1Password…)')}</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${mfaEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {mfaEnabled ? t('settings.tenant.security.twoFAEnabled', 'Activée') : t('settings.tenant.security.twoFADisabled', 'Désactivée')}
          </span>
        </div>

        <div className="mt-4 pl-10">
          {mfaEnabled ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                <CheckCircle size={13} /> {t('settings.tenant.security.accountProtected', 'Votre compte est protégé par la 2FA.')}
              </div>
              {!showDisable2FA ? (
                <button type="button" onClick={() => setShowDisable2FA(true)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  {t('settings.tenant.security.disable2FA', 'Désactiver la 2FA…')}
                </button>
              ) : (
                <form onSubmit={handleDisable2FA} className="space-y-2 max-w-xs">
                  <p className="text-xs text-gray-600">{t('settings.tenant.security.confirmPassword', 'Confirmez votre mot de passe :')}</p>
                  {disable2FAError && <p className="text-xs text-red-500">{disable2FAError}</p>}
                  <div className="flex gap-2">
                    <input type="password" value={disablePassword} onChange={e => setDisablePass(e.target.value)}
                      placeholder={t('settings.tenant.security.passwordPlaceholder', 'Mot de passe')}
                      className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400"
                    />
                    <button type="submit" disabled={disabling2FA || !disablePassword}
                      className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 hover:bg-red-600 transition-colors">
                      {disabling2FA ? '…' : 'OK'}
                    </button>
                    <button type="button" onClick={() => { setShowDisable2FA(false); setDisablePass(''); setDisable2FAErr(''); }}
                      className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50">
                      {t('settings.tenant.security.cancel', 'Annuler')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShow2FA(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
            >
              <Shield size={14} /> {t('settings.tenant.security.enable2FA', 'Activer la 2FA')}
            </button>
          )}
        </div>
      </div>

      {/* Password change */}
      <div className="rounded-xl border border-gray-200 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-0.5 p-2 rounded-lg bg-gray-50">
            <Key size={15} className="text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{t('settings.tenant.security.changePassword', 'Changer le mot de passe')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('settings.tenant.security.changePasswordHint', 'Utilisez un mot de passe fort de 12+ caractères.')}</p>
          </div>
        </div>
        <div className="space-y-3 max-w-xs pl-10">
          {[
            t('settings.tenant.security.currentPassword', 'Mot de passe actuel'),
            t('settings.tenant.security.newPassword', 'Nouveau mot de passe'),
            t('settings.tenant.security.confirmNewPassword', 'Confirmer le nouveau'),
          ].map((ph, i) => (
            <input key={i} type="password" placeholder={ph}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
          ))}
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Save size={13} /> {t('settings.tenant.security.update', 'Mettre à jour')}
          </button>
        </div>
      </div>

      {show2FA && <TwoFactorSetupModal onClose={() => setShow2FA(false)} onEnabled={handle2FAEnabled} />}
    </div>
  );

  const ApiKeysSection = (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t('settings.tenant.apiKeys.title', 'Clés API')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('settings.tenant.apiKeys.desc', "Accès programmatique à l'API ESG Flow.")}</p>
        </div>
        <button
          onClick={() => setShowNewKey(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus size={14} /> {t('settings.tenant.apiKeys.newKey', 'Nouvelle clé')}
        </button>
      </div>

      {/* Created key banner — shown once */}
      {createdKey && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-800 mb-1">✅ {t('settings.tenant.apiKeys.keyCreated', 'Clé « {{name}} » créée', { name: createdKey.name })}</p>
              <p className="text-xs text-emerald-700 mb-2">{t('settings.tenant.apiKeys.copyNow', 'Copiez-la maintenant — elle ne sera plus affichée.')}</p>
              <code className="block text-xs font-mono bg-white border border-emerald-200 rounded-lg px-3 py-2 text-emerald-900 break-all select-all">
                {createdKey.fullKey}
              </code>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button
                onClick={() => { navigator.clipboard.writeText(createdKey.fullKey); toast.success(t('settings.tenant.apiKeys.keyCopied', 'Clé copiée !')); }}
                className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
              >
                <Copy size={11} /> {t('settings.tenant.apiKeys.copy', 'Copier')}
              </button>
              <button onClick={() => setCreatedKey(null)} className="px-3 py-1.5 border border-emerald-200 text-emerald-700 text-xs rounded-lg hover:bg-emerald-100 transition-colors">
                {t('settings.tenant.apiKeys.close', 'Fermer')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-0 text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 bg-gray-50 border-b border-gray-100">
          <span>{t('settings.tenant.apiKeys.colName', 'Nom')}</span><span>{t('settings.tenant.apiKeys.colPrefix', 'Préfixe')}</span><span>{t('settings.tenant.apiKeys.colLastUsed', 'Dernière utilisation')}</span><span />
        </div>

        {apiKeysLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            {t('settings.tenant.apiKeys.noKeys', "Aucune clé API. Créez-en une pour accéder à l'API programmatiquement.")}
          </div>
        ) : (
          apiKeys.map(k => (
            <div key={k.id} className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${k.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                <div>
                  <span className="text-sm font-medium text-gray-900">{k.name}</span>
                  {k.description && <p className="text-xs text-gray-400 truncate max-w-[120px]">{k.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <code className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {k.key_prefix}{'•'.repeat(8)}
                </code>
                <button type="button" onClick={() => { navigator.clipboard.writeText(k.key_prefix); toast.success(t('settings.tenant.apiKeys.prefixCopied', 'Préfixe copié')); }}
                  className="text-gray-400 hover:text-gray-600 p-1">
                  <Copy size={12} />
                </button>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">{relativeTime(k.last_used_at ?? null, t)}</span>
              <button type="button" onClick={() => handleRevokeKey(k.id, k.name)}
                className="text-xs text-red-400 hover:text-red-600 font-medium whitespace-nowrap">
                {t('settings.tenant.apiKeys.revoke', 'Révoquer')}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 flex gap-3 text-sm text-amber-800">
        <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-amber-500" />
        <p>{t('settings.tenant.apiKeys.securityWarning', 'Ne partagez jamais vos clés API. En cas de compromission, révoquez immédiatement et régénérez.')}</p>
      </div>

      {/* New key modal */}
      {showNewKey && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">{t('settings.tenant.apiKeys.newKeyTitle', 'Nouvelle clé API')}</h3>
              <button type="button" onClick={() => setShowNewKey(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('settings.tenant.apiKeys.keyNameLabel', 'Nom de la clé')}</label>
                <input
                  type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                  placeholder={t('settings.tenant.apiKeys.keyNamePlaceholder', 'ex. Mobile App, CI/CD Pipeline…')}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleGenerateKey()}
                />
              </div>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
                <AlertCircle size={13} className="flex-shrink-0 mt-0.5 text-amber-500" />
                {t('settings.tenant.apiKeys.oneTimeWarning', 'La clé complète sera affichée une seule fois. Copiez-la immédiatement.')}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowNewKey(false); setNewKeyName(''); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  {t('settings.tenant.apiKeys.cancelKey', 'Annuler')}
                </button>
                <button onClick={handleGenerateKey}
                  className="flex-1 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
                  {t('settings.tenant.apiKeys.generate', 'Générer la clé')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const SessionsSection = (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t('settings.tenant.sessions.title', 'Sessions actives')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('settings.tenant.sessions.desc', 'Appareils connectés à votre compte.')}</p>
        </div>
        <button type="button" onClick={() => toast.success(t('settings.tenant.sessions.allDisconnected', 'Toutes les autres sessions ont été déconnectées'))}
          className="text-sm text-red-500 hover:text-red-700 font-medium">
          {t('settings.tenant.sessions.disconnectAll', 'Déconnecter tout')}
        </button>
      </div>

      {/* Session actuelle */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between p-4 rounded-xl border border-violet-200 bg-violet-50/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Activity size={15} className="text-violet-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900">{t('settings.tenant.sessions.current', 'Session actuelle')}</p>
                <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{t('settings.tenant.sessions.active', 'En cours')}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{t('settings.tenant.sessions.browserInfo', 'Navigateur actif · Authentifié via ESG Flow')}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 text-xs text-gray-400">
          <AlertCircle size={13} className="flex-shrink-0 text-gray-300" />
          {t('settings.tenant.sessions.multiDeviceComingSoon', 'La gestion des sessions multi-appareils sera disponible dans une prochaine version.')}
        </div>
      </div>

      {/* Audit log réel */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">{t('settings.tenant.sessions.auditLog', "Journal d'audit récent")}</p>
          <button onClick={() => navigate('/app/audit-trail')} className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
            {t('settings.tenant.sessions.seeAll', 'Tout voir')} <ArrowUpRight size={12} />
          </button>
        </div>
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          {auditLoading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : auditEvents.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">{t('settings.tenant.sessions.noEvents', 'Aucun événement récent.')}</div>
          ) : (
            auditEvents.map((log, i) => {
              const actionColors: Record<string, string> = {
                CREATE: 'text-emerald-600', create: 'text-emerald-600',
                UPDATE: 'text-blue-600',   update: 'text-blue-600',
                DELETE: 'text-red-500',    delete: 'text-red-500',
                LOGIN:  'text-violet-600', login:  'text-violet-600',
              };
              const color = actionColors[log.action] || 'text-gray-600';
              return (
                <div key={log.id || i} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <span className={`text-xs font-semibold ${color} whitespace-nowrap`}>{log.description || log.action}</span>
                  <span className="text-xs text-gray-400 mx-4 flex-1 truncate">{log.user}</span>
                  <span className="text-xs text-gray-300 whitespace-nowrap">{relativeTime(log.timestamp, t)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  // ─── Danger zone handlers ───────────────────────────────────────────────
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    const toastId = toast.loading(t('settings.tenant.danger.preparingExport', "Préparation de l'archive ZIP…"));
    try {
      const res = await api.get('/tenants/me/export', { responseType: 'blob' });
      // Build filename from Content-Disposition or fallback
      const cd = res.headers['content-disposition'] as string | undefined;
      const m = cd?.match(/filename="?([^";]+)"?/);
      const filename = m?.[1] || `esgflow-export-${tenantData?.slug || 'workspace'}.zip`;

      const blob = new Blob([res.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('settings.tenant.danger.exportDownloaded', 'Export téléchargé.'), { id: toastId });
    } catch (err: any) {
      console.error('Export failed:', err);
      toast.error(err?.response?.data?.detail || t('settings.tenant.danger.exportFailed', "Échec de l'export — réessayez plus tard."), { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const handleResetData = async () => {
    if (dangerInput !== 'REINITIALISER') {
      toast.error(t('settings.tenant.danger.wrongInputReset', 'Saisie incorrecte. Tapez REINITIALISER.'));
      return;
    }
    setDangerBusy(true);
    const toastId = toast.loading(t('settings.tenant.danger.deletingESGData', 'Suppression des données ESG en cours…'));
    try {
      const res = await api.post('/tenants/me/reset', { confirmation: 'REINITIALISER' });
      toast.success(res.data?.message || t('settings.tenant.danger.dataReset', 'Données ESG réinitialisées.'), { id: toastId, duration: 6000 });
      setDangerAction(null);
      setDangerInput('');
      // Refresh the page so all caches/queries are invalidated
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      console.error('Reset failed:', err);
      toast.error(err?.response?.data?.detail || t('settings.tenant.danger.resetFailed', 'Échec de la réinitialisation.'), { id: toastId });
    } finally {
      setDangerBusy(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (dangerInput !== 'SUPPRIMER') {
      toast.error(t('settings.tenant.danger.wrongInputDelete', 'Saisie incorrecte. Tapez SUPPRIMER en majuscules.'));
      return;
    }
    setDangerBusy(true);
    const toastId = toast.loading(t('settings.tenant.danger.permanentDeletion', 'Suppression définitive en cours…'));
    try {
      await api.delete('/tenants/me', { data: { confirmation: 'SUPPRIMER' } });
      toast.success(t('settings.tenant.danger.workspaceDeleted', 'Espace de travail supprimé. À bientôt.'), { id: toastId, duration: 5000 });
      // Clear local auth and redirect to landing
      localStorage.clear();
      sessionStorage.clear();
      dispatch(logout());
      setTimeout(() => { window.location.href = '/'; }, 1500);
    } catch (err: any) {
      console.error('Delete failed:', err);
      toast.error(err?.response?.data?.detail || t('settings.tenant.danger.deleteFailed', 'Échec de la suppression — contactez le support.'), { id: toastId });
      setDangerBusy(false);
    }
  };

  const DangerSection = (
    <div>
      <SectionHeader title={t('settings.tenant.danger.title', 'Zone de danger')} desc={t('settings.tenant.danger.desc', 'Actions irréversibles. Lisez attentivement avant de procéder.')} />

      <div className="space-y-3">
        {/* Export — non-destructive */}
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-gray-200 hover:border-gray-300">
          <div className="flex items-start gap-3 min-w-0">
            <Download size={16} className="mt-0.5 flex-shrink-0 text-gray-500" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{t('settings.tenant.danger.exportTitle', 'Exporter toutes les données')}</p>
              <p className="text-xs text-gray-500 mt-0.5 max-w-md">
                {t('settings.tenant.danger.exportDesc', "Téléchargez une archive ZIP de l'ensemble de vos données ESG, rapports et configurations (RGPD Art. 20).")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="relative z-10 flex-shrink-0 w-full sm:w-auto min-h-[44px] px-6 py-3 rounded-lg text-sm font-semibold shadow-sm transition-all cursor-pointer active:scale-95 hover:shadow-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-60 disabled:cursor-wait"
          >
            {exporting ? t('settings.tenant.danger.preparing', 'Préparation…') : t('settings.tenant.danger.export', 'Exporter')}
          </button>
        </div>

        {/* Reset ESG data — destructive, modal-protected */}
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-orange-200 bg-orange-50/30">
          <div className="flex items-start gap-3 min-w-0">
            <RefreshCw size={16} className="mt-0.5 flex-shrink-0 text-orange-600" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{t('settings.tenant.danger.resetTitle', 'Réinitialiser les données ESG')}</p>
              <p className="text-xs text-gray-500 mt-0.5 max-w-md">
                {t('settings.tenant.danger.resetDesc', 'Supprime toutes les saisies de données ESG. Les organisations, utilisateurs et abonnement sont conservés.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setDangerAction('reset'); setDangerInput(''); }}
            className="relative z-10 flex-shrink-0 w-full sm:w-auto min-h-[44px] px-6 py-3 rounded-lg text-sm font-semibold shadow-sm transition-all cursor-pointer active:scale-95 hover:shadow-md bg-orange-600 text-white border border-orange-700 hover:bg-orange-700"
          >
            {t('settings.tenant.danger.resetData', 'Réinitialiser les données')}
          </button>
        </div>

        {/* Delete workspace — irreversible, modal-protected */}
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-red-200 bg-red-50/30">
          <div className="flex items-start gap-3 min-w-0">
            <Trash2 size={16} className="mt-0.5 flex-shrink-0 text-red-600" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{t('settings.tenant.danger.deleteWorkspaceTitle', "Supprimer l'espace de travail")}</p>
              <p className="text-xs text-gray-500 mt-0.5 max-w-md">
                {t('settings.tenant.danger.deleteWorkspaceDesc', "Suppression définitive : données ESG, utilisateurs, organisations, clés API. L'abonnement Stripe est annulé immédiatement.")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setDangerAction('delete'); setDangerInput(''); }}
            className="relative z-10 flex-shrink-0 w-full sm:w-auto min-h-[44px] px-6 py-3 rounded-lg text-sm font-semibold shadow-sm transition-all cursor-pointer active:scale-95 hover:shadow-md bg-red-600 text-white border border-red-700 hover:bg-red-700"
          >
            {t('settings.tenant.danger.deleteAccount', 'Supprimer le compte')}
          </button>
        </div>
      </div>

      {/* Safety spacer to avoid overlap with floating QuickActions (+) button on small viewports */}
      <div className="h-24 sm:h-4" aria-hidden="true" />
    </div>
  );

  // ─── Confirmation modal (rendered as overlay when dangerAction is set) ─────
  const DangerModal = dangerAction === null ? null : (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !dangerBusy) { setDangerAction(null); setDangerInput(''); } }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 border-b ${dangerAction === 'delete' ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${dangerAction === 'delete' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
              {dangerAction === 'delete' ? <Trash2 size={20} /> : <RefreshCw size={20} />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900">
                {dangerAction === 'delete' ? t('settings.tenant.danger.modal.deleteTitle', 'Supprimer définitivement le compte ?') : t('settings.tenant.danger.modal.resetTitle', 'Réinitialiser les données ESG ?')}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {dangerAction === 'delete'
                  ? t('settings.tenant.danger.modal.deleteWarning', 'Cette action est irréversible. Toutes vos données seront perdues.')
                  : t('settings.tenant.danger.modal.resetWarning', 'Toutes les saisies ESG seront définitivement supprimées.')}
              </p>
            </div>
            {!dangerBusy && (
              <button
                onClick={() => { setDangerAction(null); setDangerInput(''); }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-700 transition-colors"
                aria-label={t('settings.tenant.danger.modal.close', 'Fermer')}
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {dangerAction === 'delete' ? (
            <>
              <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                <p className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={16} /> {t('settings.tenant.danger.modal.immediateConsequences', 'Conséquences immédiates')}
                </p>
                <ul className="text-xs text-red-800 space-y-1 ml-5 list-disc">
                  <li>{t('settings.tenant.danger.modal.deleteItem1', 'Suppression de toutes les données ESG, organisations, utilisateurs')}</li>
                  <li>{t('settings.tenant.danger.modal.deleteItem2', 'Révocation de toutes les clés API et sessions actives')}</li>
                  <li>{t('settings.tenant.danger.modal.deleteItem3', "Annulation immédiate de l'abonnement Stripe (sans remboursement prorata)")}</li>
                  <li>{t('settings.tenant.danger.modal.deleteItem4', 'Vous serez déconnecté immédiatement après la suppression')}</li>
                </ul>
              </div>
              <p className="text-xs text-gray-500">
                💡 <strong>{t('settings.tenant.danger.modal.tip', 'Conseil')}</strong> : {t('settings.tenant.danger.modal.tipText', 'exportez d\'abord vos données via le bouton « Exporter » avant de procéder.')}
              </p>
            </>
          ) : (
            <div className="rounded-xl bg-orange-50 border border-orange-200 p-4">
              <p className="text-sm font-semibold text-orange-900 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={16} /> {t('settings.tenant.danger.modal.consequences', 'Conséquences')}
              </p>
              <ul className="text-xs text-orange-800 space-y-1 ml-5 list-disc">
                <li>{t('settings.tenant.danger.modal.resetItem1', "Toutes les valeurs d'indicateurs, scores, fournisseurs et matérialités seront supprimés")}</li>
                <li>{t('settings.tenant.danger.modal.resetItem2', 'Vos organisations, utilisateurs et paramètres de compte sont conservés')}</li>
                <li>{t('settings.tenant.danger.modal.resetItem3', "Votre abonnement Stripe n'est pas affecté")}</li>
              </ul>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              {t('settings.tenant.danger.modal.typeToConfirm', 'Pour confirmer, tapez')} <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-900 font-bold">
                {dangerAction === 'delete' ? 'SUPPRIMER' : 'REINITIALISER'}
              </code> {t('settings.tenant.danger.modal.below', 'ci-dessous :')}
            </label>
            <input
              type="text"
              autoFocus
              value={dangerInput}
              onChange={(e) => setDangerInput(e.target.value)}
              disabled={dangerBusy}
              placeholder={dangerAction === 'delete' ? 'SUPPRIMER' : 'REINITIALISER'}
              className={`w-full px-4 py-3 rounded-lg border text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 ${
                dangerAction === 'delete'
                  ? 'border-red-200 focus:border-red-500 focus:ring-red-200'
                  : 'border-orange-200 focus:border-orange-500 focus:ring-orange-200'
              } disabled:bg-gray-50 disabled:cursor-not-allowed`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:justify-end gap-2">
          <button
            onClick={() => { setDangerAction(null); setDangerInput(''); }}
            disabled={dangerBusy}
            className="min-h-[44px] px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t('settings.tenant.danger.modal.cancel', 'Annuler')}
          </button>
          <button
            onClick={dangerAction === 'delete' ? handleDeleteWorkspace : handleResetData}
            disabled={dangerBusy || dangerInput !== (dangerAction === 'delete' ? 'SUPPRIMER' : 'REINITIALISER')}
            className={`min-h-[44px] px-5 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              dangerAction === 'delete'
                ? 'bg-red-600 hover:bg-red-700 border border-red-700'
                : 'bg-orange-600 hover:bg-orange-700 border border-orange-700'
            }`}
          >
            {dangerBusy ? t('settings.tenant.danger.modal.processing', 'Traitement…') : (dangerAction === 'delete' ? t('settings.tenant.danger.modal.deletePermanently', 'Supprimer définitivement') : t('settings.tenant.danger.modal.resetData', 'Réinitialiser les données'))}
          </button>
        </div>
      </div>
    </div>
  );

  const CONTENT_MAP: Record<SectionId, React.ReactNode> = {
    workspace:     WorkspaceSection,
    members:       MembersSection,
    notifications: NotificationsSection,
    integrations:  IntegrationsSection,
    billing:       BillingSection,
    security:      SecuritySection,
    sso:           <SSOTab />,
    'api-keys':    ApiKeysSection,
    sessions:      SessionsSection,
    danger:        DangerSection,
  };

  const planLabel: Record<string, string> = { free: 'Free', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };
  const planColor: Record<string, string> = { free: '#94a3b8', starter: '#3b82f6', pro: '#7c3aed', enterprise: '#059669' };
  const tierLabel = planLabel[tenantData?.plan_tier || 'free'] || 'Free';
  const tierColor = planColor[tenantData?.plan_tier || 'free'] || '#94a3b8';

  return (
    <div className="space-y-6">
      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl shadow-xl" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 75% 0%, rgba(124,58,237,0.25) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 10% 100%, rgba(59,130,246,0.12) 0%, transparent 50%)' }} />

        <div className="relative px-8 py-7 flex items-start justify-between gap-6 flex-wrap">
          <div>
            {/* Breadcrumb badge */}
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Building2 size={11} /> {t('settings.tenant.hero.administration', 'Administration')}
            </div>

            {/* Org name */}
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {tenantLoading ? (
                  <span className="inline-block w-48 h-8 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }} />
                ) : (
                  form.companyName || t('settings.tenant.hero.defaultTitle', 'Paramètres')
                )}
              </h1>
              {!tenantLoading && (
                <button
                  onClick={() => setActive('workspace')}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  title={t('settings.tenant.hero.editNameTooltip', 'Modifier le nom')}
                >
                  <Pencil size={13} className="text-white/60" />
                </button>
              )}
            </div>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {t('settings.tenant.hero.subtitle', 'Gérez votre espace de travail, la sécurité et les intégrations.')}
            </p>

            {/* Stat pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Plan badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{ background: tierColor + '33', border: `1px solid ${tierColor}55` }}>
                <Star size={10} style={{ color: tierColor }} />
                <span style={{ color: tierColor }}>Plan {tierLabel}</span>
              </div>

              {/* Contact email */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Mail size={10} />
                {form.billingEmail || DEFAULT_EMAIL}
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.2)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t('settings.tenant.hero.operational', 'Opérationnel')}
              </div>
            </div>
          </div>

          {/* Quick-save org name button */}
          <button
            onClick={() => { setActive('workspace'); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex-shrink-0"
            style={{ background: 'rgba(124,58,237,0.25)', color: 'white', border: '1px solid rgba(124,58,237,0.4)' }}
          >
            <Pencil size={14} /> {t('settings.tenant.hero.editOrg', "Modifier l'organisation")}
          </button>
        </div>
      </div>

      {/* Layout: sidebar + content */}
      <div className="flex gap-8 items-start">
        {Sidebar}

        <main className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {CONTENT_MAP[active]}
        </main>
      </div>

      {/* Danger zone confirmation modal */}
      {DangerModal}
    </div>
  );
}
