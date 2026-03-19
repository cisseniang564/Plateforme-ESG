import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Webhook, 
  Plug, 
  FileText, 
  Building2, 
  Database,
  Crown,
  Mail,
  TrendingUp,
  Shield,
  Zap,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Save,
  Sparkles,
  Globe
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import PageHeader from '@/components/PageHeader';

export default function TenantSettings() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    companyName: 'Demo Company',
    billingEmail: 'billing@demo.com',
    sector: 'finance',
    timezone: 'Europe/Paris'
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simuler l'appel API
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Modifications enregistrées avec succès !');
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const settingsSections = [
    {
      id: 'users',
      title: 'Gestion Utilisateurs',
      description: 'Gérer les utilisateurs, rôles et permissions',
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      path: '/settings/users',
      badge: '50 users',
      stats: { current: 50, max: 50 }
    },
    {
      id: 'webhooks',
      title: 'Webhooks',
      description: 'Notifications temps réel vers services externes',
      icon: Webhook,
      gradient: 'from-green-500 to-green-600',
      path: '/settings/webhooks',
      badge: '3 actifs',
      stats: { current: 3, max: 10 }
    },
    {
      id: 'integrations',
      title: 'Intégrations',
      description: 'Google Sheets, Power BI, Salesforce...',
      icon: Plug,
      gradient: 'from-orange-500 to-orange-600',
      path: '/settings/integrations',
      badge: 'Premium',
      stats: { current: 5, max: null }
    },
    {
      id: 'insee',
      title: 'API INSEE Sirene',
      description: 'Données officielles entreprises françaises',
      icon: Building2,
      gradient: 'from-indigo-500 to-indigo-600',
      path: '/settings/insee',
      badge: 'Gov API',
      stats: { current: 29, max: null }
    },
    {
      id: 'enrichment',
      title: 'Enrichissement ESG',
      description: 'Génération automatique de données ESG',
      icon: Database,
      gradient: 'from-purple-500 to-purple-600',
      path: '/settings/esg-enrichment',
      badge: 'AI-Powered',
      stats: { current: 2094, max: null }
    },
    {
      id: 'api',
      title: 'API Documentation',
      description: 'Documentation API et clés d\'accès',
      icon: FileText,
      gradient: 'from-pink-500 to-pink-600',
      path: '/docs',
      external: true,
      badge: 'Docs',
      stats: null
    },
  ];

  const usageData = [
    {
      label: 'Utilisateurs',
      used: 50,
      total: 50,
      icon: Users,
      color: 'blue',
      status: 'full',
    },
    {
      label: 'Organisations',
      used: 29,
      total: 100,
      icon: Building2,
      color: 'green',
      status: 'normal',
    },
    {
      label: 'Appels API (ce mois)',
      used: 8432,
      total: 10000,
      icon: Zap,
      color: 'yellow',
      status: 'warning',
    },
    {
      label: 'Webhooks actifs',
      used: 3,
      total: 10,
      icon: Webhook,
      color: 'purple',
      status: 'normal',
    },
  ];

  const getStatusColor = (status: string) => {
    if (status === 'full') return 'from-red-500 to-red-600';
    if (status === 'warning') return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-green-600';
  };

  const getColorClasses = (color: string) => ({
    bg: `bg-${color}-50`,
    text: `text-${color}-600`,
    border: `border-${color}-200`,
    gradient: `from-${color}-500 to-${color}-600`
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        subtitle="Configurez votre plateforme ESG et gérez vos intégrations"
      />

      {/* Plan Status Banner - Modernisé */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-primary-500 to-blue-600 rounded-2xl p-8 text-white shadow-2xl">
        {/* Effet de brillance */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
        
        <div className="relative flex items-start justify-between">
          <div className="flex items-start gap-5">
            <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm shadow-lg">
              <Crown className="h-10 w-10" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-3xl font-bold">Plan Pro</h3>
                <span className="px-4 py-1.5 bg-white/25 rounded-full text-sm font-semibold backdrop-blur-sm border border-white/30">
                  ✨ Actif
                </span>
              </div>
              <p className="text-white/95 mb-4 text-lg">
                99€/mois • Facturation annuelle • Renouvellement le 28 mars 2026
              </p>
              <div className="flex items-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">50 utilisateurs</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">API illimitée</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Support prioritaire</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="font-medium">IA incluse</span>
                </div>
              </div>
            </div>
          </div>
          <Button 
            variant="secondary" 
            className="bg-white text-primary-600 hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all"
            onClick={() => navigate('/settings/billing')}
          >
            <Crown className="h-4 w-4 mr-2" />
            Passer à Enterprise
          </Button>
        </div>
      </div>

      {/* Settings Grid - Modernisé */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Configuration & Intégrations</h2>
          <span className="text-sm text-gray-500">{settingsSections.length} modules disponibles</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                onClick={() => {
                  if (section.external) {
                    window.open(`${(import.meta.env.VITE_API_URL || 'http://localhost:8000').replace('/api/v1', '')}/docs`, '_blank');
                  } else {
                    navigate(section.path);
                  }
                }}
                className="group relative bg-white border-2 border-gray-100 rounded-2xl p-6 hover:shadow-2xl hover:border-primary-200 transition-all cursor-pointer hover:-translate-y-2 duration-300"
              >
                {/* Badge flottant */}
                <div className="absolute -top-3 -right-3">
                  <span className="px-3 py-1.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-xs font-bold rounded-full shadow-lg">
                    {section.badge}
                  </span>
                </div>

                {/* Icon avec gradient */}
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${section.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                  <Icon className="h-8 w-8 text-white" />
                </div>

                {/* Content */}
                <div className="mb-4">
                  <h3 className="font-bold text-gray-900 text-lg mb-2 flex items-center gap-2">
                    {section.title}
                    {section.external && <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {section.description}
                  </p>
                </div>

                {/* Stats */}
                {section.stats && (
                  <div className="mb-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Utilisation</span>
                      <span className="font-semibold text-gray-900">
                        {section.stats.current.toLocaleString()}
                        {section.stats.max && ` / ${section.stats.max.toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action */}
                <div className="flex items-center text-sm font-semibold text-primary-600 group-hover:gap-3 transition-all">
                  <span>{section.external ? 'Ouvrir docs' : 'Configurer'}</span>
                  <ArrowUpRight className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Info - Formulaire amélioré */}
        <Card className="border-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary-50 rounded-lg">
              <Building2 className="h-6 w-6 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Informations Générales</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Entrez le nom de votre entreprise"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email de facturation *
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.billingEmail}
                  onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
                  placeholder="facturation@entreprise.com"
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Secteur d'activité
              </label>
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fuseau horaire
              </label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select 
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  aria-label="Fuseau horaire"
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 appearance-none bg-white cursor-pointer"
                >
                  <option value="Europe/Paris">🇫🇷 Europe/Paris (UTC+1)</option>
                  <option value="Europe/London">🇬🇧 Europe/London (UTC+0)</option>
                  <option value="America/New_York">🇺🇸 America/New_York (UTC-5)</option>
                  <option value="Asia/Tokyo">🇯🇵 Asia/Tokyo (UTC+9)</option>
                </select>
              </div>
            </div>

            <Button 
              className="w-full py-3 text-base font-semibold"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Usage & Limits - Design amélioré */}
        <Card className="border-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Utilisation & Limites</h2>
            </div>
            <button 
              type="button"
              className="text-sm text-primary-600 hover:text-primary-700 font-semibold hover:underline"
            >
              Historique →
            </button>
          </div>

          <div className="space-y-6">
            {usageData.map((item) => {
              const Icon = item.icon;
              const percentage = (item.used / item.total) * 100;
              
              return (
                <div key={item.label} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-${item.color}-50 flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 text-${item.color}-600`} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.status === 'full' ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : item.status === 'warning' ? (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      <span className="text-base font-bold text-gray-900">
                        {item.used.toLocaleString()} <span className="text-gray-400">/</span> {item.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress bar moderne */}
                  <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-3 bg-gradient-to-r ${getStatusColor(item.status)} rounded-full transition-all duration-500 relative`}
                      style={{ width: `${percentage}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>

                  {item.status === 'full' && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      <p className="text-xs text-red-700 font-medium">
                        Limite atteinte - Passez à un plan supérieur pour continuer
                      </p>
                    </div>
                  )}
                  {item.status === 'warning' && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <p className="text-xs text-yellow-700 font-medium">
                        Proche de la limite - {(100 - percentage).toFixed(0)}% restant
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-5 bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl border-2 border-primary-100">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Shield className="h-6 w-6 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-gray-900 mb-2">
                  Besoin de plus de ressources ?
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Passez à Enterprise pour des limites illimitées, un support dédié et des fonctionnalités avancées
                </p>
                <Button size="sm" className="shadow-lg">
                  <Crown className="h-4 w-4 mr-2" />
                  Découvrir Enterprise
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Stats - Design futuriste */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Uptime ce mois', value: '99.9%', icon: CheckCircle, color: 'green', trend: '+0.1%' },
          { label: 'Dernier backup', value: 'Il y a 2h', icon: Calendar, color: 'blue', trend: 'Auto' },
          { label: 'Score sécurité', value: 'A+', icon: Shield, color: 'purple', trend: 'Excellent' },
          { label: 'Support', value: '< 1h', icon: Mail, color: 'orange', trend: 'Rapide' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.label} 
              className="bg-white border-2 border-gray-100 rounded-xl p-5 hover:shadow-lg hover:border-primary-200 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 bg-${stat.color}-50 rounded-lg`}>
                  <Icon className={`h-5 w-5 text-${stat.color}-600`} />
                </div>
                <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                  {stat.trend}
                </span>
              </div>
              <p className="text-xs text-gray-600 font-medium mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}