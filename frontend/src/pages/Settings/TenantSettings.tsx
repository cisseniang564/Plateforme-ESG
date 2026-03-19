import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Webhook, Plug, FileText, Building2, Database,
  Crown, Mail, TrendingUp, Shield, Zap, CheckCircle,
  AlertCircle, ArrowUpRight, Calendar, Save, Sparkles,
  Globe, CreditCard, Lock, Key, Activity, Star,
  ChevronRight, RefreshCw, Download, Bell, X, Check,
  Infinity, BarChart3
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import PageHeader from '@/components/PageHeader';

type Tab = 'general' | 'billing' | 'integrations' | 'security';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'Général', icon: Building2 },
  { id: 'billing', label: 'Facturation', icon: CreditCard },
  { id: 'integrations', label: 'Config & Intégrations', icon: Plug },
  { id: 'security', label: 'Sécurité', icon: Shield },
];

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 29,
    annualPrice: 290,
    description: 'Pour les petites équipes qui démarrent',
    color: 'gray',
    gradient: 'from-gray-500 to-gray-600',
    current: false,
    features: [
      { text: '10 utilisateurs', included: true },
      { text: '20 organisations', included: true },
      { text: '1 000 appels API/mois', included: true },
      { text: '2 webhooks actifs', included: true },
      { text: 'Rapports basiques', included: true },
      { text: 'Support email', included: true },
      { text: 'IA & analyses avancées', included: false },
      { text: 'Intégrations premium', included: false },
      { text: 'API complète', included: false },
      { text: 'SLA garanti', included: false },
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 99,
    annualPrice: 990,
    description: 'Pour les équipes ESG professionnelles',
    color: 'primary',
    gradient: 'from-primary-500 to-blue-600',
    current: true,
    badge: 'Plan actuel',
    features: [
      { text: '50 utilisateurs', included: true },
      { text: '100 organisations', included: true },
      { text: '10 000 appels API/mois', included: true },
      { text: '10 webhooks actifs', included: true },
      { text: 'Rapports avancés', included: true },
      { text: 'Support prioritaire', included: true },
      { text: 'IA & analyses avancées', included: true },
      { text: 'Intégrations premium', included: true },
      { text: 'API complète', included: true },
      { text: 'SLA garanti', included: false },
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    annualPrice: null,
    description: 'Pour les grands groupes et institutions',
    color: 'purple',
    gradient: 'from-purple-600 to-indigo-600',
    current: false,
    badge: 'Sur devis',
    features: [
      { text: 'Utilisateurs illimités', included: true },
      { text: 'Organisations illimitées', included: true },
      { text: 'API illimitée', included: true },
      { text: 'Webhooks illimités', included: true },
      { text: 'Rapports sur-mesure', included: true },
      { text: 'Support dédié 24/7', included: true },
      { text: 'IA & ML avancé', included: true },
      { text: 'Intégrations custom', included: true },
      { text: 'API complète + SDK', included: true },
      { text: 'SLA 99.9% garanti', included: true },
    ]
  }
];

const SETTINGS_SECTIONS = [
  {
    id: 'users',
    title: 'Gestion Utilisateurs',
    description: 'Gérer les utilisateurs, rôles et permissions',
    icon: Users,
    gradient: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    path: '/app/settings/users',
    badge: '50 users',
    badgeColor: 'bg-blue-100 text-blue-700',
    stats: { current: 50, max: 50 },
    status: 'full' as const,
    activity: 'Dernière action : il y a 2h'
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    description: 'Notifications temps réel vers vos services',
    icon: Webhook,
    gradient: 'from-green-500 to-emerald-600',
    bgLight: 'bg-green-50',
    path: '/app/settings/webhooks',
    badge: '3 actifs',
    badgeColor: 'bg-green-100 text-green-700',
    stats: { current: 3, max: 10 },
    status: 'ok' as const,
    activity: 'Dernier envoi : il y a 5 min'
  },
  {
    id: 'integrations',
    title: 'Intégrations',
    description: 'Google Sheets, Power BI, Salesforce...',
    icon: Plug,
    gradient: 'from-orange-500 to-orange-600',
    bgLight: 'bg-orange-50',
    path: '/app/settings/integrations',
    badge: 'Premium',
    badgeColor: 'bg-orange-100 text-orange-700',
    stats: { current: 5, max: null },
    status: 'ok' as const,
    activity: '5 intégrations connectées'
  },
  {
    id: 'insee',
    title: 'API INSEE Sirene',
    description: 'Données officielles entreprises françaises',
    icon: Building2,
    gradient: 'from-indigo-500 to-indigo-600',
    bgLight: 'bg-indigo-50',
    path: '/app/settings/insee',
    badge: 'Gov API',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    stats: { current: 29, max: null },
    status: 'ok' as const,
    activity: '29 entreprises enrichies'
  },
  {
    id: 'enrichment',
    title: 'Enrichissement ESG',
    description: 'Génération automatique de données ESG par IA',
    icon: Database,
    gradient: 'from-purple-500 to-purple-600',
    bgLight: 'bg-purple-50',
    path: '/app/settings/esg-enrichment',
    badge: 'AI-Powered',
    badgeColor: 'bg-purple-100 text-purple-700',
    stats: { current: 2094, max: null },
    status: 'ok' as const,
    activity: '2 094 points enrichis'
  },
  {
    id: 'api',
    title: 'API Documentation',
    description: 'Documentation complète de l\'API REST',
    icon: FileText,
    gradient: 'from-pink-500 to-pink-600',
    bgLight: 'bg-pink-50',
    path: '/docs',
    external: true,
    badge: 'Docs',
    badgeColor: 'bg-pink-100 text-pink-700',
    stats: null,
    status: 'ok' as const,
    activity: 'Swagger UI disponible'
  },
];

const USAGE_DATA = [
  { label: 'Utilisateurs', used: 50, total: 50, icon: Users, status: 'full' as const, colorClass: 'text-blue-600', bgClass: 'bg-blue-50' },
  { label: 'Organisations', used: 29, total: 100, icon: Building2, status: 'ok' as const, colorClass: 'text-green-600', bgClass: 'bg-green-50' },
  { label: 'Appels API (ce mois)', used: 8432, total: 10000, icon: Zap, status: 'warning' as const, colorClass: 'text-yellow-600', bgClass: 'bg-yellow-50' },
  { label: 'Webhooks actifs', used: 3, total: 10, icon: Webhook, status: 'ok' as const, colorClass: 'text-purple-600', bgClass: 'bg-purple-50' },
];

const API_KEYS = [
  { id: 1, name: 'Production API Key', key: 'esg_prod_••••••••••••3f2a', created: '12 janv. 2026', lastUsed: 'Il y a 2h', status: 'active' },
  { id: 2, name: 'Development API Key', key: 'esg_dev_••••••••••••8b1c', created: '5 déc. 2025', lastUsed: 'Il y a 3 jours', status: 'active' },
  { id: 3, name: 'Test API Key', key: 'esg_test_••••••••••••4d9e', created: '2 nov. 2025', lastUsed: 'Il y a 30 jours', status: 'inactive' },
];

function getProgressColor(status: 'ok' | 'warning' | 'full') {
  if (status === 'full') return 'from-red-500 to-red-600';
  if (status === 'warning') return 'from-yellow-500 to-amber-500';
  return 'from-green-500 to-emerald-500';
}

export default function TenantSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [saving, setSaving] = useState(false);
  const [billingAnnual, setBillingAnnual] = useState(true);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [formData, setFormData] = useState({
    companyName: 'Demo Company',
    billingEmail: 'billing@demo.com',
    sector: 'finance',
    timezone: 'Europe/Paris'
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Modifications enregistrées avec succès !');
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateKey = () => {
    if (!newKeyName.trim()) { toast.error('Entrez un nom pour la clé'); return; }
    toast.success(`Clé API "${newKeyName}" créée avec succès !`);
    setShowNewKeyModal(false);
    setNewKeyName('');
  };

  const handleRevokeKey = (keyName: string) => {
    toast.success(`Clé "${keyName}" révoquée`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        subtitle="Configurez votre plateforme ESG et gérez vos intégrations"
      />

      {/* Tab Navigation */}
      <div className="bg-white border-2 border-gray-100 rounded-2xl p-2 flex gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-primary-500 to-blue-600 text-white shadow-lg shadow-primary-200'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Tab: GÉNÉRAL ─────────────────────────────────────── */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Uptime ce mois', value: '99.9%', icon: Activity, color: 'text-green-600', bg: 'bg-green-50', trend: '+0.1%' },
              { label: 'Dernier backup', value: '2h', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', trend: 'Automatique' },
              { label: 'Score sécurité', value: 'A+', icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50', trend: 'Excellent' },
              { label: 'Temps de réponse', value: '< 1h', icon: Bell, color: 'text-orange-600', bg: 'bg-orange-50', trend: 'Support' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-primary-100 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 ${stat.bg} rounded-xl`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{stat.trend}</span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Info Form */}
            <Card className="border-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-primary-50 rounded-xl">
                  <Building2 className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Informations Générales</h2>
                  <p className="text-xs text-gray-500">Données de votre organisation</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nom de l'entreprise *</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email de facturation *</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={formData.billingEmail}
                      onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Secteur d'activité</label>
                  <select
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    aria-label="Secteur d'activité"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 appearance-none bg-white cursor-pointer"
                  >
                    <option value="finance">Finance & Services</option>
                    <option value="industry">Industrie</option>
                    <option value="energy">Énergie</option>
                    <option value="tech">Technologie</option>
                    <option value="commerce">Commerce</option>
                    <option value="agriculture">Agriculture</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fuseau horaire</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      aria-label="Fuseau horaire"
                      className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 appearance-none bg-white cursor-pointer"
                    >
                      <option value="Europe/Paris">🇫🇷 Europe/Paris (UTC+1)</option>
                      <option value="Europe/London">🇬🇧 Europe/London (UTC+0)</option>
                      <option value="America/New_York">🇺🇸 America/New_York (UTC-5)</option>
                      <option value="Asia/Tokyo">🇯🇵 Asia/Tokyo (UTC+9)</option>
                    </select>
                  </div>
                </div>

                <Button className="w-full py-3 text-sm font-semibold" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />Enregistrement...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" />Enregistrer les modifications</>
                  )}
                </Button>
              </div>
            </Card>

            {/* Usage & Limits */}
            <Card className="border-2">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-green-50 rounded-xl">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Utilisation & Limites</h2>
                    <p className="text-xs text-gray-500">Plan Pro — Cycle actuel</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('billing')}
                  className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                >
                  Gérer le plan <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-5">
                {USAGE_DATA.map((item) => {
                  const Icon = item.icon;
                  const pct = Math.round((item.used / item.total) * 100);
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg ${item.bgClass} flex items-center justify-center`}>
                            <Icon className={`h-4 w-4 ${item.colorClass}`} />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status === 'full' && <AlertCircle className="h-4 w-4 text-red-500" />}
                          {item.status === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                          {item.status === 'ok' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          <span className="text-sm font-bold text-gray-900">
                            {item.used.toLocaleString()} <span className="text-gray-400 font-normal">/</span> {item.total.toLocaleString()}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'full' ? 'bg-red-100 text-red-700' :
                            item.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${getProgressColor(item.status)} rounded-full transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {item.status === 'full' && (
                        <p className="mt-1.5 text-xs text-red-600 font-medium">Limite atteinte — passez à Enterprise</p>
                      )}
                      {item.status === 'warning' && (
                        <p className="mt-1.5 text-xs text-yellow-600 font-medium">{100 - pct}% restant — bientôt la limite</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl border border-primary-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-0.5">Besoin de plus ?</p>
                    <p className="text-xs text-gray-600">Enterprise — limites illimitées</p>
                  </div>
                  <Button size="sm" onClick={() => setActiveTab('billing')}>
                    <Crown className="h-3.5 w-3.5 mr-1.5" />
                    Voir les plans
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ─── Tab: FACTURATION ─────────────────────────────────── */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Current Plan Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-primary-500 to-blue-600 rounded-2xl p-7 text-white shadow-xl">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15),_transparent_60%)]" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-3.5 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Crown className="h-8 w-8" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold">Plan Pro</h3>
                    <span className="px-3 py-1 bg-white/25 rounded-full text-xs font-bold border border-white/30">
                      ✨ Actif
                    </span>
                  </div>
                  <p className="text-white/90 mb-3">99€/mois · Facturation annuelle · Renouvellement le 28 mars 2026</p>
                  <div className="flex items-center gap-6 text-sm">
                    {['50 utilisateurs', 'API illimitée', 'Support prioritaire', 'IA incluse'].map((f) => (
                      <div key={f} className="flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4" /><span className="font-medium">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs mb-2">Prochaine facture</p>
                <p className="text-2xl font-bold">990€</p>
                <p className="text-white/70 text-xs">28 mars 2026</p>
              </div>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-semibold ${!billingAnnual ? 'text-gray-900' : 'text-gray-400'}`}>Mensuel</span>
            <button
              type="button"
              onClick={() => setBillingAnnual(!billingAnnual)}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${billingAnnual ? 'bg-primary-600' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${billingAnnual ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm font-semibold ${billingAnnual ? 'text-gray-900' : 'text-gray-400'}`}>
              Annuel
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">-17%</span>
            </span>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const price = billingAnnual ? plan.annualPrice : plan.monthlyPrice;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
                    plan.current
                      ? 'border-primary-400 shadow-xl shadow-primary-100 scale-[1.02]'
                      : 'border-gray-100 hover:border-gray-300 hover:shadow-lg'
                  }`}
                >
                  {/* Header */}
                  <div className={`bg-gradient-to-br ${plan.gradient} p-6 text-white`}>
                    {plan.badge && (
                      <span className="inline-block px-3 py-1 bg-white/25 rounded-full text-xs font-bold mb-3 border border-white/30">
                        {plan.current ? '✨ Plan actuel' : plan.badge}
                      </span>
                    )}
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    <p className="text-white/80 text-sm mb-4">{plan.description}</p>
                    <div className="flex items-end gap-1">
                      {price !== null ? (
                        <>
                          <span className="text-4xl font-black">{price}€</span>
                          <span className="text-white/70 mb-1.5 text-sm">/{billingAnnual ? 'an' : 'mois'}</span>
                        </>
                      ) : (
                        <span className="text-3xl font-black">Sur devis</span>
                      )}
                    </div>
                    {billingAnnual && price !== null && (
                      <p className="text-white/70 text-xs mt-1">
                        Soit {Math.round(price / 12)}€/mois · économisez {Math.round((plan.monthlyPrice! * 12 - price) / (plan.monthlyPrice! * 12) * 100)}%
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <div className="bg-white p-6">
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature) => (
                        <li key={feature.text} className="flex items-center gap-3">
                          {feature.included ? (
                            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Check className="h-3 w-3 text-green-600" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <X className="h-3 w-3 text-gray-400" />
                            </div>
                          )}
                          <span className={`text-sm ${feature.included ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {plan.current ? (
                      <div className="w-full py-2.5 bg-primary-50 border-2 border-primary-200 rounded-xl text-primary-700 text-sm font-bold text-center">
                        Plan actuel
                      </div>
                    ) : plan.id === 'enterprise' ? (
                      <Button variant="secondary" className="w-full">
                        Contacter les ventes
                      </Button>
                    ) : (
                      <Button variant="secondary" className="w-full hover:bg-gray-900 hover:text-white transition-colors">
                        {plan.id === 'starter' ? 'Rétrograder' : 'Passer à Enterprise'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Invoice History */}
          <Card className="border-2">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gray-50 rounded-xl">
                  <CreditCard className="h-5 w-5 text-gray-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Historique des factures</h2>
              </div>
              <Button variant="secondary" size="sm">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Tout télécharger
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Description</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Montant</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {[
                    { date: '28 mars 2025', desc: 'Plan Pro — Annuel', amount: '990,00€', status: 'Payée' },
                    { date: '28 mars 2024', desc: 'Plan Pro — Annuel', amount: '990,00€', status: 'Payée' },
                    { date: '28 mars 2023', desc: 'Plan Pro — Annuel', amount: '890,00€', status: 'Payée' },
                  ].map((invoice, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5 text-gray-600">{invoice.date}</td>
                      <td className="px-4 py-3.5 font-medium text-gray-900">{invoice.desc}</td>
                      <td className="px-4 py-3.5 font-bold text-gray-900">{invoice.amount}</td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">{invoice.status}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button type="button" className="text-primary-600 hover:text-primary-700 font-semibold text-xs flex items-center gap-1 ml-auto">
                          <Download className="h-3 w-3" /> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ─── Tab: CONFIG & INTÉGRATIONS ───────────────────────── */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Configuration & Intégrations</h2>
              <p className="text-sm text-gray-500 mt-0.5">{SETTINGS_SECTIONS.length} modules disponibles</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-green-50 text-green-700 px-3 py-2 rounded-lg font-medium border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Tous les services opérationnels
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SETTINGS_SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.id}
                  onClick={() => {
                    if (section.external) {
                      window.open(
                        `${(import.meta.env.VITE_API_URL || 'http://localhost:8000').replace('/api/v1', '')}/docs`,
                        '_blank'
                      );
                    } else {
                      navigate(section.path);
                    }
                  }}
                  className="group relative bg-white border-2 border-gray-100 rounded-2xl p-6 hover:shadow-xl hover:border-primary-200 cursor-pointer transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Status dot */}
                  <div className="absolute top-4 right-4 flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs font-semibold text-green-600">Actif</span>
                  </div>

                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${section.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-md`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="font-bold text-gray-900 text-base mb-1 flex items-center gap-2">
                    {section.title}
                    {section.external && <ArrowUpRight className="h-3.5 w-3.5 text-gray-400" />}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">{section.description}</p>

                  {/* Stats bar */}
                  {section.stats && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-gray-400">Utilisation</span>
                        <span className="font-bold text-gray-800">
                          {section.stats.current.toLocaleString()}
                          {section.stats.max && ` / ${section.stats.max.toLocaleString()}`}
                        </span>
                      </div>
                      {section.stats.max && (
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${section.gradient} rounded-full transition-all`}
                            style={{ width: `${Math.min((section.stats.current / section.stats.max) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Activity + Badge */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${section.badgeColor}`}>
                      {section.badge}
                    </span>
                    <span className="text-xs text-gray-400">{section.activity}</span>
                  </div>

                  {/* Hover action */}
                  <div className="mt-3 flex items-center text-sm font-semibold text-primary-600 group-hover:gap-2 gap-1 transition-all">
                    <span>{section.external ? 'Ouvrir' : 'Configurer'}</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Methodology Section */}
          <Card className="border-2">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-50 rounded-xl">
                  <BarChart3 className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Méthodologies ESG actives</h2>
                  <p className="text-xs text-gray-500">Référentiels de reporting configurés</p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/app/settings/methodology')}
              >
                Configurer
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'GRI Standards 2024', version: 'v1.0', status: 'Actif', color: 'green', icon: '🌿' },
                { name: 'SASB Framework', version: 'v2.1', status: 'Actif', color: 'blue', icon: '📊' },
                { name: 'TCFD Recommendations', version: 'v3.0', status: 'Actif', color: 'purple', icon: '🌡️' },
              ].map((method) => (
                <div key={method.name} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                  <span className="text-2xl">{method.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{method.name}</p>
                    <p className="text-xs text-gray-500">{method.version}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full flex-shrink-0">
                    {method.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ─── Tab: SÉCURITÉ ────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Security Score */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-7 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-3.5 bg-white/20 rounded-2xl">
                  <Shield className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Score de sécurité</h3>
                  <p className="text-white/80 text-sm">Basé sur vos configurations actuelles</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-5xl font-black">A+</p>
                <p className="text-white/70 text-sm mt-1">Excellent</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-4">
              {[
                { label: '2FA activé', ok: true },
                { label: 'Chiffrement TLS', ok: true },
                { label: 'Audit logs', ok: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
                  <CheckCircle className="h-4 w-4 text-green-300 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* API Keys */}
            <Card className="border-2">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-50 rounded-xl">
                    <Key className="h-5 w-5 text-orange-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Clés API</h2>
                </div>
                <Button size="sm" onClick={() => setShowNewKeyModal(true)}>
                  + Nouvelle clé
                </Button>
              </div>

              <div className="space-y-3">
                {API_KEYS.map((apiKey) => (
                  <div key={apiKey.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-gray-900 text-sm">{apiKey.name}</p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            apiKey.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {apiKey.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-gray-500 mb-1">{apiKey.key}</p>
                        <p className="text-xs text-gray-400">Créée le {apiKey.created} · Dernière utilisation : {apiKey.lastUsed}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRevokeKey(apiKey.name)}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold flex-shrink-0"
                      >
                        Révoquer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Sessions & 2FA */}
            <div className="space-y-5">
              {/* 2FA */}
              <Card className="border-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-green-50 rounded-xl">
                      <Lock className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Authentification 2FA</h2>
                      <p className="text-xs text-gray-500">Double authentification activée</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Activé</span>
                </div>
                <div className="p-3 bg-green-50 rounded-xl border border-green-100 text-sm text-green-800">
                  <CheckCircle className="inline h-4 w-4 mr-2" />
                  Votre compte est protégé par une authentification à deux facteurs.
                </div>
              </Card>

              {/* Active Sessions */}
              <Card className="border-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                    <h2 className="text-base font-bold text-gray-900">Sessions actives</h2>
                  </div>
                  <button type="button" className="text-xs text-red-500 hover:text-red-700 font-semibold">
                    Tout déconnecter
                  </button>
                </div>
                <div className="space-y-2.5">
                  {[
                    { device: 'Chrome — macOS', location: 'Paris, France', time: 'Maintenant', current: true },
                    { device: 'Safari — iPhone', location: 'Paris, France', time: 'Il y a 2h', current: false },
                    { device: 'Firefox — Windows', location: 'Lyon, France', time: 'Il y a 1j', current: false },
                  ].map((session, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          {session.device}
                          {session.current && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Actuelle</span>}
                        </p>
                        <p className="text-xs text-gray-500">{session.location} · {session.time}</p>
                      </div>
                      {!session.current && (
                        <button type="button" className="text-xs text-red-400 hover:text-red-600 font-medium">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Audit Logs */}
              <Card className="border-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gray-50 rounded-xl">
                      <RefreshCw className="h-5 w-5 text-gray-600" />
                    </div>
                    <h2 className="text-base font-bold text-gray-900">Audit & Logs</h2>
                  </div>
                  <Button variant="secondary" size="sm">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Exporter
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  Suivi complet de toutes les actions effectuées sur la plateforme.
                </p>
                <div className="space-y-2">
                  {[
                    { action: 'Connexion réussie', user: 'admin@demo.com', time: 'Il y a 2 min', color: 'text-green-600' },
                    { action: 'Rapport généré', user: 'analyst@demo.com', time: 'Il y a 1h', color: 'text-blue-600' },
                    { action: 'Donnée importée', user: 'manager@demo.com', time: 'Il y a 3h', color: 'text-purple-600' },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-gray-50 last:border-0">
                      <span className={`font-semibold ${log.color}`}>{log.action}</span>
                      <span className="text-gray-500">{log.user}</span>
                      <span className="text-gray-400">{log.time}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Nouvelle clé API ──────────────────────────── */}
      {showNewKeyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Générer une clé API</h3>
              <button type="button" onClick={() => setShowNewKeyModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nom de la clé *</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="ex. Mobile App Key"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  autoFocus
                />
              </div>
              <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-100 text-xs text-yellow-800">
                <AlertCircle className="inline h-3.5 w-3.5 mr-1.5" />
                La clé ne sera affichée qu'une seule fois. Copiez-la immédiatement.
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowNewKeyModal(false)}>
                  Annuler
                </Button>
                <Button className="flex-1" onClick={handleGenerateKey}>
                  <Key className="h-4 w-4 mr-2" />
                  Générer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
