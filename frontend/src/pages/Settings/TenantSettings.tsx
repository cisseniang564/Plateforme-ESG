import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store';
import { setUser } from '@/store/slices/authSlice';
import TwoFactorSetupModal from '@/components/security/TwoFactorSetupModal';
import { authService } from '@/services/authService';
import {
  Building2, Users, Webhook, Plug, CreditCard, Shield, Key,
  Bell, Globe, Save, Download, RefreshCw, X, Check, AlertCircle,
  CheckCircle, Lock, Activity, ChevronRight, Zap, ExternalLink,
  Trash2, AlertTriangle, Mail, BarChart3, FileText, Database,
  Eye, EyeOff, Copy, Plus, ArrowUpRight, Star, ShieldCheck,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import billingService, { Subscription } from '@/services/billingService';
import api from '@/services/api';

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

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'tenantSettings.tabWorkspace',
    items: [
      { id: 'workspace',      label: 'tenantSettings.tabGeneral',         icon: Building2 },
      { id: 'members',        label: 'tenantSettings.tabMembers',         icon: Users },
      { id: 'notifications',  label: 'tenantSettings.tabNotifications',   icon: Bell },
      { id: 'integrations',   label: 'tenantSettings.tabIntegrations',    icon: Plug },
    ],
  },
  {
    title: 'tenantSettings.tabAccount',
    items: [
      { id: 'billing',   label: 'tenantSettings.tabBilling',  icon: CreditCard },
      { id: 'security',  label: 'tenantSettings.tabSecurity',     icon: Shield },
      { id: 'sso',       label: 'SSO',          icon: ShieldCheck, badge: 'OIDC', badgeColor: 'bg-blue-100 text-blue-600' },
      { id: 'api-keys',  label: 'tenantSettings.tabApiKeys',     icon: Key },
      { id: 'sessions',  label: 'tenantSettings.tabSessions',     icon: Activity },
    ],
  },
  {
    title: 'tenantSettings.tabAdvanced',
    items: [
      { id: 'danger', label: 'tenantSettings.tabDanger', icon: AlertTriangle, badge: '!', badgeColor: 'bg-red-100 text-red-600' },
    ],
  },
];

// ─── Static data ──────────────────────────────────────────────────────────────
const SETTINGS_MODULES = [
  { id: 'webhooks',    title: 'tenantSettings.intWebhooksTitle',            desc: 'tenantSettings.intWebhooksDesc',           icon: Webhook,    gradient: 'from-green-500 to-emerald-600',  badge: '3 actifs',       path: '/app/settings/webhooks' },
  { id: 'insee',       title: 'tenantSettings.intInseeTitle',    desc: 'tenantSettings.intInseeDesc',     icon: Building2,  gradient: 'from-indigo-500 to-indigo-600',  badge: 'Gov API',        path: '/app/settings/insee' },
  { id: 'enrichment',  title: 'tenantSettings.intEsgTitle',  desc: 'tenantSettings.intEsgDesc',              icon: Database,   gradient: 'from-purple-500 to-purple-600',  badge: 'AI',             path: '/app/settings/esg-enrichment' },
  { id: 'integrations',title: 'tenantSettings.intConnectorsTitle',         desc: 'tenantSettings.intConnectorsDesc',     icon: Plug,       gradient: 'from-orange-500 to-orange-600',  badge: '5 connectés',    path: '/app/settings/integrations' },
  { id: 'methodology', title: 'tenantSettings.intMethodologiesTitle',       desc: 'GRI, SASB, TCFD, ESRS',             icon: BarChart3,  gradient: 'from-teal-500 to-teal-600',      badge: '3 actives',      path: '/app/settings/methodology' },
  { id: 'api-docs',    title: 'tenantSettings.intApiDocsTitle',            desc: 'tenantSettings.intApiDocsDesc',              icon: FileText,   gradient: 'from-pink-500 to-pink-600',      badge: 'Swagger',        path: '/docs', external: true },
];

const API_KEYS = [
  { id: 1, name: 'Production',  prefix: 'esg_prod_', suffix: '3f2a', created: '12 jan. 2026', lastUsed: 'Il y a 2h',    status: 'active'   as const },
  { id: 2, name: 'Development', prefix: 'esg_dev_',  suffix: '8b1c', created: '5 déc. 2025',  lastUsed: 'Il y a 3j',    status: 'active'   as const },
  { id: 3, name: 'Test',        prefix: 'esg_test_', suffix: '4d9e', created: '2 nov. 2025',  lastUsed: 'Il y a 30j',   status: 'inactive' as const },
];

const SESSIONS = [
  { device: 'Chrome — macOS',      location: 'Paris, France',  ip: '92.184.x.x',  time: 'Maintenant',  current: true  },
  { device: 'Safari — iPhone 15',  location: 'Paris, France',  ip: '92.184.x.x',  time: 'Il y a 2h',   current: false },
  { device: 'Firefox — Windows',   location: 'Lyon, France',   ip: '81.57.x.x',   time: 'Il y a 1 j',  current: false },
];

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
      toast.success(t('tenantSettings.tSsoSaved'));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await api.get('/sso/test-config');
      toast.success(t('tenantSettings.tSsoTestOk') + res.data.issuer);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('tenantSettings.tSsoTestFail'));
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('tenantSettings.confirmDisableSso'))) return;
    await api.delete('/sso/config');
    setConfig(null);
    toast.success(t('tenantSettings.tSsoDisabled'));
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
          <h3 className="text-base font-semibold text-gray-900">{t('tenantSettings.ssoTitle')}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {t('tenantSettings.ssoIntro')}
          </p>
        </div>
        {config && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.is_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {config.is_enabled ? 'Actif' : 'Inactif'}
          </span>
        )}
      </div>

      {/* OIDC preset buttons */}
      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">{t('tenantSettings.prefillFor')}</p>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantSettings.providerName')}</label>
          <input
            value={form.provider_name}
            onChange={e => setForm(f => ({ ...f, provider_name: e.target.value }))}
            placeholder="ex: Okta, Microsoft Entra..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL Issuer (Discovery) *</label>
          <input
            value={form.issuer_url}
            onChange={e => setForm(f => ({ ...f, issuer_url: e.target.value }))}
            placeholder="https://login.microsoftonline.com/.../v2.0"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantSettings.clientId')}</label>
          <input
            value={form.client_id}
            onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Secret {config ? '(laisser vide pour ne pas modifier)' : '*'}
          </label>
          <input
            type="password"
            value={form.client_secret}
            onChange={e => setForm(f => ({ ...f, client_secret: e.target.value }))}
            placeholder={config ? '••••••••' : 'client secret...'}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Scopes</label>
          <input
            value={form.scopes}
            onChange={e => setForm(f => ({ ...f, scopes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenantSettings.allowedDomains')}</label>
          <input
            value={form.allowed_domains}
            onChange={e => setForm(f => ({ ...f, allowed_domains: e.target.value }))}
            placeholder="monentreprise.com, filiale.com"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">{t('tenantSettings.separateDomains')}</p>
        </div>
      </div>

      {/* Attribute mapping */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">{t('tenantSettings.attributeMapping')}</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t('tenantSettings.fieldEmail'),  key: 'email_attribute' },
            { label: t('tenantSettings.fieldFirstName'), key: 'first_name_attribute' },
            { label: t('tenantSettings.fieldName'),    key: 'last_name_attribute' },
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
        <span className="text-sm text-gray-700">{t('tenantSettings.enableSso')}</span>
      </label>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {saving
            ? <><div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sauvegarde…</>
            : <><Save size={14} /> Sauvegarder</>
          }
        </button>
        {config?.issuer_url && (
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {testing ? 'Test…' : 'Tester la connexion'}
          </button>
        )}
        {config && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors ml-auto"
          >
            {t('tenantSettings.disable')}
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
  const [revealedKey, setRevealedKey] = useState<number | null>(null);

  // Billing
  const [subscription, setSub]         = useState<Subscription | null>(null);
  const [billingLoading, setBilLoad]    = useState(false);

  // Form
  const [form, setForm] = useState({
    companyName: 'Demo Company',
    billingEmail: 'billing@demo.com',
    sector: 'finance',
    timezone: 'Europe/Paris',
    language: 'fr',
    website: 'https://demo.com',
  });

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
      toast.success(t('tenantSettings.tSubActivated'));
      setActive('billing');
      window.history.replaceState({}, '', window.location.pathname + '?tab=billing');
    }
  }, []);

  useEffect(() => {
    if (active !== 'billing') return;
    setBilLoad(true);
    billingService.getSubscription().then(setSub).catch(() => null).finally(() => setBilLoad(false));
  }, [active]);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));
    setSaving(false);
    toast.success(t('tenantSettings.tSettingsSaved'));
  };

  const handle2FAEnabled = () => {
    setMfaEnabled(true);
    if (currentUser) dispatch(setUser({ ...currentUser, mfa_enabled: true }));
    toast.success(t('tenantSettings.t2faEnabled'));
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
      toast.success(t('tenantSettings.t2faDisabled'));
    } catch (err: any) {
      setDisable2FAErr(err?.response?.data?.detail || 'Mot de passe incorrect');
    } finally {
      setDisabling2FA(false);
    }
  };

  const handleGenerateKey = () => {
    if (!newKeyName.trim()) { toast.error(t('tenantSettings.tNameRequired')); return; }
    toast.success(t('tenantSettings.tKeyCreated', { name: newKeyName }));
    setShowNewKey(false);
    setNewKeyName('');
  };

  const handlePortal = async () => {
    try {
      const url = await billingService.createPortal();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch { toast.error(t('tenantSettings.tBillingUnavailable')); }
  };

  // ── Sidebar ──────────────────────────────────────────────────────────────────
  const Sidebar = (
    <aside className="w-52 flex-shrink-0">
      <nav className="space-y-6">
        {NAV_GROUPS.map(group => (
          <div key={group.title}>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1 px-3">{t(group.title)}</p>
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
                    <span className="pointer-events-none flex-1 text-left">{t(item.label)}</span>
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
      <SectionHeader title={t('tenantSettings.secGeneral')} desc={t('tenantSettings.secGeneralDesc')} />

      <Field label="Nom de l'organisation">
        <input
          value={form.companyName}
          onChange={e => setForm({ ...form, companyName: e.target.value })}
          className="w-full max-w-sm px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </Field>

      <Field label={t('tenantSettings.billingEmail')} hint={t('tenantSettings.billingEmailHint')}>
        <div className="relative max-w-sm">
          <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            value={form.billingEmail}
            onChange={e => setForm({ ...form, billingEmail: e.target.value })}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </Field>

      <Field label="Site web">
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

      <Field label={t('tenantSettings.sectorField')}>
        <select
          value={form.sector}
          onChange={e => setForm({ ...form, sector: e.target.value })}
          className="max-w-sm w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none"
        >
          <option value="finance">{t('tenantSettings.sectorFinance')}</option>
          <option value="industry">{t('tenantSettings.sectorIndustry')}</option>
          <option value="energy">{t('tenantSettings.sectorEnergy')}</option>
          <option value="tech">{t('tenantSettings.sectorTech')}</option>
          <option value="commerce">{t('tenantSettings.sectorCommerce')}</option>
          <option value="agriculture">{t('tenantSettings.sectorAgri')}</option>
          <option value="immobilier">{t('tenantSettings.sectorRealEstate')}</option>
        </select>
      </Field>

      <Field label="Fuseau horaire">
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

      <Field label="Langue de l'interface">
        <select
          value={form.language}
          onChange={e => setForm({ ...form, language: e.target.value })}
          className="max-w-sm w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none"
        >
          <option value="fr">{t('tenantSettings.langFr')}</option>
          <option value="en">English</option>
        </select>
      </Field>

      <div className="pt-5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-60 transition-colors"
        >
          {saving
            ? <><div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sauvegarde…</>
            : <><Save size={14} /> Sauvegarder</>
          }
        </button>
      </div>
    </div>
  );

  const MembersSection = (
    <div>
      <SectionHeader title={t('tenantSettings.secMembers')} desc={t('tenantSettings.secMembersDesc')} />
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <p className="text-sm font-medium text-gray-700">3 membres actifs</p>
          <button
            onClick={() => navigate('/app/settings/users')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700"
          >
            {t('tenantSettings.manage')} <ArrowUpRight size={13} />
          </button>
        </div>
        {[
          { name: 'Admin Principal',     email: 'admin@demo.com',    role: 'Admin',     avatar: 'A' },
          { name: 'Analyste ESG',        email: 'analyst@demo.com',  role: 'Analyste',  avatar: 'A' },
          { name: 'Responsable Reporting', email: 'report@demo.com', role: 'Lecteur',   avatar: 'R' },
        ].map((m, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700">
                {m.avatar}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{m.name}</p>
                <p className="text-xs text-gray-400">{m.email}</p>
              </div>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              m.role === 'Admin' ? 'bg-violet-100 text-violet-700' :
              m.role === 'Analyste' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            }`}>{m.role}</span>
          </div>
        ))}
        <div className="px-5 py-3.5 bg-gray-50/50">
          <button
            onClick={() => navigate('/app/settings/users')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <Plus size={13} /> Inviter un membre
          </button>
        </div>
      </div>
    </div>
  );

  const NotificationsSection = (
    <div>
      <SectionHeader title={t('tenantSettings.secNotifications')} desc={t('tenantSettings.secNotificationsDesc')} />

      {[
        { key: 'weeklyReport' as const,    label: t('tenantSettings.notifWeeklyReport'),   desc: t('tenantSettings.notifWeeklyReportDesc') },
        { key: 'thresholdAlerts' as const, label: t('tenantSettings.notifThreshold'),      desc: t('tenantSettings.notifThresholdDesc') },
        { key: 'securityAlerts' as const,  label: t('tenantSettings.notifSecurity'),    desc: t('tenantSettings.notifSecurityDesc') },
        { key: 'invoiceEmails' as const,   label: t('tenantSettings.notifBillingEmails'),  desc: t('tenantSettings.notifBillingEmailsDesc') },
        { key: 'apiUsageAlerts' as const,  label: "Alertes d'usage API",    desc: t('tenantSettings.notifApiCallsDesc') },
        { key: 'productUpdates' as const,  label: t('tenantSettings.notifProductNews'),     desc: t('tenantSettings.notifProductNewsDesc') },
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
          onClick={() => { toast.success(t('tenantSettings.tNotifPrefsSaved')); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <Save size={14} /> Sauvegarder
        </button>
      </div>
    </div>
  );

  const IntegrationsSection = (
    <div>
      <SectionHeader title={t('tenantSettings.secIntegrations')} desc={t('tenantSettings.secIntegrationsDesc')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SETTINGS_MODULES.map(mod => {
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
                  {t(mod.title)}
                  {(mod as any).external && <ExternalLink size={11} className="text-gray-400" />}
                </p>
                <p className="text-xs text-gray-400 truncate">{t(mod.desc)}</p>
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
          <p className="text-sm font-semibold text-gray-700">{t('tenantSettings.activeFrameworks')}</p>
          <button onClick={() => navigate('/app/settings/methodology')} className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
            Configurer <ChevronRight size={12} />
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
              <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Actif</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const BillingSection = (
    <div>
      <SectionHeader title={t('tenantSettings.secBilling')} desc={t('tenantSettings.secBillingDesc')} />

      {billingLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
          <div className="h-4 w-4 border-2 border-gray-200 border-t-violet-600 rounded-full animate-spin" /> Chargement…
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
                    {subscription?.status === 'active' ? 'Actif' : subscription?.status === 'trialing' ? 'Essai' : subscription?.status === 'past_due' ? 'En retard' : 'Free'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {subscription?.current_period_end
                    ? `Renouvellement le ${new Date(subscription.current_period_end).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`
                    : 'Aucun abonnement actif'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {subscription?.stripe_customer_id && (
                <button onClick={handlePortal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  <ExternalLink size={12} /> Portail Stripe
                </button>
              )}
              <button
                onClick={() => navigate('/app/billing')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 rounded-lg text-xs font-medium text-white hover:bg-violet-700 transition-colors">
                {t('tenantSettings.manage')} <ArrowUpRight size={12} />
              </button>
            </div>
          </div>

          {/* Usage bars */}
          {subscription && (
            <div className="rounded-xl border border-gray-200 p-5 space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('tenantSettings.usageThisMonth')}</p>
              {[
                { label: t('tenantSettings.notifApiCalls'),     used: 8432, max: subscription.max_monthly_api_calls || 10000, color: 'bg-violet-500' },
                { label: 'Utilisateurs',   used: 12,   max: subscription.max_users || 50,                color: 'bg-blue-500' },
                { label: 'Organisations',  used: 29,   max: subscription.max_orgs || 100,               color: 'bg-emerald-500' },
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
            {t('tenantSettings.billingPortalHint')}{' '}
            <button onClick={() => navigate('/app/billing')} className="text-violet-600 hover:underline font-medium">page Facturation</button>.
          </p>
        </div>
      )}
    </div>
  );

  const SecuritySection = (
    <div>
      <SectionHeader title={t('tenantSettings.secSecurity')} desc={t('tenantSettings.secSecurityDesc')} />

      {/* Security score */}
      <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 p-5 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-white/60 uppercase tracking-wide">{t('tenantSettings.securityScore')}</p>
            <p className="text-3xl font-black mt-1">{mfaEnabled ? 'A+' : 'B'}</p>
            <p className="text-xs text-white/70 mt-0.5">{mfaEnabled ? t('tenantSettings.allControlsActive') : t('tenantSettings.enable2faHint')}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '2FA',            ok: mfaEnabled },
              { label: 'TLS',            ok: true },
              { label: t('tenantSettings.tabAuditLogs'),     ok: true },
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
              <p className="text-sm font-semibold text-gray-900">{t('tenantSettings.twoFactorAuth')}</p>
              <p className="text-xs text-gray-400 mt-0.5">Application TOTP (Google Authenticator, Authy, 1Password…)</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${mfaEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {mfaEnabled ? t('tenantSettings.enabled') : t('tenantSettings.disabled')}
          </span>
        </div>

        <div className="mt-4 pl-10">
          {mfaEnabled ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                <CheckCircle size={13} /> {t('tenantSettings.accountProtected')}
              </div>
              {!showDisable2FA ? (
                <button type="button" onClick={() => setShowDisable2FA(true)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  {t('tenantSettings.disable2fa')}
                </button>
              ) : (
                <form onSubmit={handleDisable2FA} className="space-y-2 max-w-xs">
                  <p className="text-xs text-gray-600">{t('tenantSettings.confirmPassword')}</p>
                  {disable2FAError && <p className="text-xs text-red-500">{disable2FAError}</p>}
                  <div className="flex gap-2">
                    <input type="password" value={disablePassword} onChange={e => setDisablePass(e.target.value)}
                      placeholder="Mot de passe"
                      className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400"
                    />
                    <button type="submit" disabled={disabling2FA || !disablePassword}
                      className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 hover:bg-red-600 transition-colors">
                      {disabling2FA ? '…' : 'OK'}
                    </button>
                    <button type="button" onClick={() => { setShowDisable2FA(false); setDisablePass(''); setDisable2FAErr(''); }}
                      className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50">
                      Annuler
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
              <Shield size={14} /> Activer la 2FA
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
            <p className="text-sm font-semibold text-gray-900">{t('tenantSettings.changePassword')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('tenantSettings.strongPasswordHint')}</p>
          </div>
        </div>
        <div className="space-y-3 max-w-xs pl-10">
          {['Mot de passe actuel', 'Nouveau mot de passe', 'Confirmer le nouveau'].map((ph, i) => (
            <input key={i} type="password" placeholder={ph}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
          ))}
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Save size={13} /> {t('tenantSettings.update')}
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
          <h2 className="text-base font-semibold text-gray-900">{t('tenantSettings.apiKeysTitle')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('tenantSettings.apiAccessDesc')}</p>
        </div>
        <button
          onClick={() => setShowNewKey(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus size={14} /> {t('tenantSettings.newKey')}
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-0 text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 bg-gray-50 border-b border-gray-100">
          <span>{t('tenantSettings.fieldName')}</span><span>{t('tenantSettings.colKey')}</span><span>{t('tenantSettings.colLastUsed')}</span><span />
        </div>
        {API_KEYS.map(k => (
          <div key={k.id} className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${k.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              <span className="text-sm font-medium text-gray-900">{k.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <code className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {revealedKey === k.id ? `${k.prefix}${'x'.repeat(12)}${k.suffix}` : `${k.prefix}••••••••••••${k.suffix}`}
              </code>
              <button type="button" onClick={() => setRevealedKey(revealedKey === k.id ? null : k.id)}
                className="text-gray-400 hover:text-gray-600 p-1">
                {revealedKey === k.id ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
              <button type="button" onClick={() => { navigator.clipboard.writeText(`${k.prefix}${'x'.repeat(12)}${k.suffix}`); toast.success(t('tenantSettings.tKeyCopied')); }}
                className="text-gray-400 hover:text-gray-600 p-1">
                <Copy size={12} />
              </button>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">{k.lastUsed}</span>
            <button type="button" onClick={() => toast.success(t('tenantSettings.tKeyRevoked', { name: k.name }))}
              className="text-xs text-red-400 hover:text-red-600 font-medium whitespace-nowrap">
              {t('tenantSettings.revoke')}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 flex gap-3 text-sm text-amber-800">
        <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-amber-500" />
        <p>{t('tenantSettings.neverShareKeys')}</p>
      </div>

      {/* New key modal */}
      {showNewKey && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">{t('tenantSettings.newApiKey')}</h3>
              <button type="button" onClick={() => setShowNewKey(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('tenantSettings.apiKeyName')}</label>
                <input
                  type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                  placeholder="ex. Mobile App, CI/CD Pipeline…"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  autoFocus
                />
              </div>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
                <AlertCircle size={13} className="flex-shrink-0 mt-0.5 text-amber-500" />
                {t('tenantSettings.keyShownOnce')}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowNewKey(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Annuler
                </button>
                <button onClick={handleGenerateKey}
                  className="flex-1 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
                  {t('tenantSettings.generateKey')}
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
          <h2 className="text-base font-semibold text-gray-900">{t('tenantSettings.activeSessions')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('tenantSettings.devicesConnected')}</p>
        </div>
        <button type="button" onClick={() => toast.success(t('tenantSettings.tAllSessionsOut'))}
          className="text-sm text-red-500 hover:text-red-700 font-medium">
          {t('tenantSettings.signOutAll')}
        </button>
      </div>

      <div className="space-y-2">
        {SESSIONS.map((s, i) => (
          <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${s.current ? 'border-violet-200 bg-violet-50/30' : 'border-gray-100 bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.current ? 'bg-violet-100' : 'bg-gray-100'}`}>
                <Activity size={15} className={s.current ? 'text-violet-600' : 'text-gray-400'} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{s.device}</p>
                  {s.current && <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{t('tenantSettings.currentSession')}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{s.location} · {s.ip} · {s.time}</p>
              </div>
            </div>
            {!s.current && (
              <button type="button" onClick={() => toast.success(t('tenantSettings.tSessionOut'))}
                className="text-gray-300 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Audit log preview */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">{t('tenantSettings.recentAuditLog')}</p>
          <button onClick={() => navigate('/app/audit-trail')} className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
            Tout voir <ArrowUpRight size={12} />
          </button>
        </div>
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          {[
            { action: 'Connexion réussie',       user: 'admin@demo.com',    time: 'Il y a 2 min',  color: 'text-emerald-600' },
            { action: 'Rapport ESG généré',      user: 'analyst@demo.com',  time: 'Il y a 1h',     color: 'text-blue-600' },
            { action: 'Import CSV déclenché',    user: 'manager@demo.com',  time: 'Il y a 3h',     color: 'text-purple-600' },
            { action: 'Clé API utilisée',        user: 'api@demo.com',      time: 'Il y a 4h',     color: 'text-orange-600' },
          ].map((log, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
              <span className={`text-xs font-semibold ${log.color}`}>{log.action}</span>
              <span className="text-xs text-gray-400 mx-4 flex-1 truncate">{log.user}</span>
              <span className="text-xs text-gray-300 whitespace-nowrap">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const DangerSection = (
    <div>
      <SectionHeader title={t('tenantSettings.secDanger')} desc={t('tenantSettings.secDangerDesc')} />

      <div className="space-y-3">
        {[
          {
            title:   t('tenantSettings.dangerExportTitle'),
            desc:    t('tenantSettings.dangerExportDesc'),
            action:  'Exporter',
            style:   'border-gray-200 hover:border-gray-300',
            btn:     'border border-gray-300 text-gray-700 hover:bg-gray-50',
            icon:    Download,
            danger:  false,
          },
          {
            title:   t('tenantSettings.dangerResetTitle'),
            desc:    t('tenantSettings.dangerResetDesc'),
            action:  t('tenantSettings.dangerResetAction'),
            style:   'border-orange-200 bg-orange-50/30',
            btn:     'border border-orange-300 text-orange-700 hover:bg-orange-50',
            icon:    RefreshCw,
            danger:  true,
          },
          {
            title:   'Supprimer l\'espace de travail',
            desc:    t('tenantSettings.dangerDeleteDesc'),
            action:  'Supprimer le compte',
            style:   'border-red-200 bg-red-50/30',
            btn:     'border border-red-300 text-red-700 hover:bg-red-50',
            icon:    Trash2,
            danger:  true,
          },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.title} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border ${item.style}`}>
              <div className="flex items-start gap-3">
                <Icon size={16} className={`mt-0.5 flex-shrink-0 ${item.danger ? 'text-red-500' : 'text-gray-500'}`} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 max-w-md">{item.desc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (item.danger) {
                    if (!confirm(t('tenantSettings.confirmIrreversible', { title: item.title }))) return;
                    toast.error(t('tenantSettings.tActionCancelled'));
                  } else {
                    toast.success(t('tenantSettings.tExportPreparing'));
                  }
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${item.btn}`}
              >
                {item.action}
              </button>
            </div>
          );
        })}
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

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900 p-8 text-white shadow-xl">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15 mb-4">
              <Building2 size={12} /> Administration
            </div>
            <h1 className="text-4xl font-bold tracking-tight">{t('tenantSettings.pageTitle')}</h1>
            <p className="mt-2 text-sm text-white/70">{t('tenantSettings.pageSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-4 py-2 ring-1 ring-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-white/80">{t('tenantSettings.allServicesOk')}</span>
          </div>
        </div>
      </div>

      {/* Layout: sidebar + content */}
      <div className="flex gap-8 items-start">
        {Sidebar}

        <main className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {CONTENT_MAP[active]}
        </main>
      </div>
    </div>
  );
}
