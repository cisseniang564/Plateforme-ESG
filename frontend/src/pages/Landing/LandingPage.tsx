import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  Users, 
  FileText, 
  BarChart3,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Globe,
  Award,
  ChevronDown,
  Brain,
  Building2,
  Factory,
  Briefcase,
  LineChart,
  Database,
  Bell,
  Target,
  PieChart
} from 'lucide-react';
import Button from '@/components/common/Button';

export default function LandingPage() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const menuItems = {
    plateforme: [
      { 
        icon: BarChart3, 
        title: 'Dashboard Exécutif', 
        description: 'Vue d\'ensemble temps réel de vos performances ESG',
        href: '#dashboard'
      },
      { 
        icon: Brain, 
        title: 'Intelligence IA', 
        description: 'Détection d\'anomalies et suggestions automatiques',
        href: '#ia'
      },
      { 
        icon: Database, 
        title: 'Gestion des Données', 
        description: 'Import CSV, saisie manuelle, calculs automatiques',
        href: '#donnees'
      },
      { 
        icon: FileText, 
        title: 'Rapports PDF', 
        description: 'CSRD, GRI, TCFD - Génération en 1 clic',
        href: '#rapports'
      }
    ],
    solutions: [
      { 
        icon: Building2, 
        title: 'PME & ETI', 
        description: 'Solution adaptée aux moyennes entreprises',
        href: '#pme'
      },
      { 
        icon: Factory, 
        title: 'Grandes Entreprises', 
        description: 'Pour les groupes du CAC40 et SBF120',
        href: '#grandes'
      },
      { 
        icon: Briefcase, 
        title: 'Cabinets Conseil', 
        description: 'Multi-clients, white-label disponible',
        href: '#cabinets'
      },
      { 
        icon: LineChart, 
        title: 'Investisseurs', 
        description: 'Due diligence ESG et scoring portfolio',
        href: '#investisseurs'
      }
    ],
    fonctionnalites: [
      { 
        icon: Sparkles, 
        title: '100+ Indicateurs ESRS', 
        description: 'Référentiel complet pré-configuré',
        href: '#indicateurs'
      },
      { 
        icon: Target, 
        title: 'Calculs Automatiques', 
        description: 'Scope 3, ratios, KPIs - 0 erreur',
        href: '#calculs'
      },
      { 
        icon: PieChart, 
        title: 'Analytics Avancés', 
        description: 'Graphiques interactifs, benchmarking',
        href: '#analytics'
      },
      { 
        icon: Bell, 
        title: 'Notifications & Workflow', 
        description: 'Validation multi-niveaux, alertes email',
        href: '#workflow'
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      
      {/* Header / Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-lg bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">
                ESGFlow
              </span>
            </Link>

            {/* Menu Desktop */}
            <div className="hidden md:flex items-center gap-1">
              
              {/* Plateforme */}
              <div 
                className="relative"
                onMouseEnter={() => setOpenMenu('plateforme')}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <button className="px-4 py-2 text-gray-700 hover:text-green-600 font-medium transition-colors flex items-center gap-1 rounded-lg hover:bg-gray-50">
                  Plateforme
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {openMenu === 'plateforme' && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-4">
                    <div className="space-y-2">
                      {menuItems.plateforme.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <a
                            key={idx}
                            href={item.href}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                          >
                            <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                              <Icon className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 mb-1">{item.title}</div>
                              <div className="text-sm text-gray-600">{item.description}</div>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Solutions */}
              <div 
                className="relative"
                onMouseEnter={() => setOpenMenu('solutions')}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <button className="px-4 py-2 text-gray-700 hover:text-green-600 font-medium transition-colors flex items-center gap-1 rounded-lg hover:bg-gray-50">
                  Solutions
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {openMenu === 'solutions' && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-4">
                    <div className="space-y-2">
                      {menuItems.solutions.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <a
                            key={idx}
                            href={item.href}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                          >
                            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                              <Icon className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 mb-1">{item.title}</div>
                              <div className="text-sm text-gray-600">{item.description}</div>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Fonctionnalités */}
              <div 
                className="relative"
                onMouseEnter={() => setOpenMenu('fonctionnalites')}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <button className="px-4 py-2 text-gray-700 hover:text-green-600 font-medium transition-colors flex items-center gap-1 rounded-lg hover:bg-gray-50">
                  Fonctionnalités
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {openMenu === 'fonctionnalites' && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-4">
                    <div className="space-y-2">
                      {menuItems.fonctionnalites.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <a
                            key={idx}
                            href={item.href}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                          >
                            <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                              <Icon className="h-5 w-5 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 mb-1">{item.title}</div>
                              <div className="text-sm text-gray-600">{item.description}</div>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Tarifs */}
              <a href="#tarifs" className="px-4 py-2 text-gray-700 hover:text-green-600 font-medium transition-colors rounded-lg hover:bg-gray-50">
                Tarifs
              </a>

              {/* Connexion */}
              <Link to="/login" className="px-4 py-2 text-gray-700 hover:text-green-600 font-medium transition-colors rounded-lg hover:bg-gray-50">
                Connexion
              </Link>

              {/* CTA */}
              <Link to="/register">
                <Button className="ml-2 bg-green-600 hover:bg-green-700">
                  Demander une démo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-900 via-emerald-800 to-green-950 text-white">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Texte */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">Plateforme nouvelle génération</span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Plateforme intégrée
                <br />
                <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                  et intelligente
                </span>
              </h1>

              <p className="text-xl text-gray-300 leading-relaxed">
                Automatisez votre reporting ESG avec l'intelligence artificielle. 
                Conforme CSRD, rapports en 1 clic, 100+ indicateurs pré-configurés.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg" className="bg-white text-green-900 hover:bg-gray-100 px-8 py-4 text-lg font-semibold shadow-xl">
                    Demander une démonstration
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <a href="#fonctionnalites">
                  <Button 
                    size="lg" 
                    variant="secondary" 
                    className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 px-8 py-4 text-lg font-semibold"
                  >
                    Découvrir ESGFlow
                  </Button>
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/20">
                <div>
                  <div className="text-3xl font-bold">100+</div>
                  <div className="text-sm text-gray-300">Indicateurs ESRS</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">80%</div>
                  <div className="text-sm text-gray-300">Gain de temps</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">100%</div>
                  <div className="text-sm text-gray-300">CSRD Compliant</div>
                </div>
              </div>
            </div>

            {/* Visual Card */}
            <div className="relative">
              <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
                <div className="aspect-video bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-24 w-24 text-white" />
                </div>
                
                {/* Floating card - Conforme CSRD */}
                <div className="absolute -top-4 -right-4 bg-white rounded-xl p-4 shadow-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">Conforme CSRD</div>
                      <div className="text-xs text-gray-500">Rapports automatisés</div>
                    </div>
                  </div>
                </div>

                {/* Floating card - IA intégrée */}
                <div className="absolute -bottom-4 -left-4 bg-white rounded-xl p-4 shadow-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">IA intégrée</div>
                      <div className="text-xs text-gray-500">Détection anomalies</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-gray-50 py-12 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-gray-500 mb-8">
            ILS NOUS FONT CONFIANCE
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60">
            {['Total', 'LVMH', 'Carrefour', 'Renault', 'Schneider'].map((company) => (
              <div key={company} className="text-2xl font-bold text-gray-400">
                {company}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fonctionnalites" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Une plateforme complète
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tout ce dont vous avez besoin pour gérer votre performance ESG de A à Z
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                title: 'Intelligence Artificielle',
                description: 'Détection automatique d\'anomalies et suggestions d\'amélioration en temps réel',
                color: 'from-purple-500 to-pink-500'
              },
              {
                icon: FileText,
                title: 'Rapports Automatisés',
                description: 'Génération de rapports CSRD, GRI et TCFD en 1 clic. PDF professionnels avec graphiques',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                icon: BarChart3,
                title: '100+ Indicateurs ESRS',
                description: 'Référentiel complet pré-configuré. Conforme directive européenne CSRD',
                color: 'from-green-500 to-emerald-500'
              },
              {
                icon: Zap,
                title: 'Calculs Automatiques',
                description: 'Formules pré-configurées: Scope 3, ratios, KPIs. Gain de temps ×10 vs Excel',
                color: 'from-orange-500 to-red-500'
              },
              {
                icon: Shield,
                title: 'Sécurité Maximale',
                description: 'Cryptage de bout en bout. Hébergement France. Conformité RGPD garantie',
                color: 'from-indigo-500 to-purple-500'
              },
              {
                icon: Users,
                title: 'Collaboration',
                description: 'Multi-utilisateurs avec rôles. Workflow de validation. Audit trail complet',
                color: 'from-pink-500 to-rose-500'
              }
            ].map((feature, idx) => (
              <div key={idx} className="group relative bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-green-500 hover:shadow-2xl transition-all duration-300">
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-green-600 to-emerald-700 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Prêt à transformer votre reporting ESG ?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Rejoignez les entreprises qui ont choisi ESGFlow pour leur conformité CSRD
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-white text-green-900 hover:bg-gray-100 px-8 py-4 text-lg font-semibold shadow-xl">
                Essai gratuit 14 jours
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button 
                size="lg" 
                variant="secondary"
                className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 px-8 py-4 text-lg font-semibold"
              >
                Demander une démo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            
            {/* Logo & Description */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold">ESGFlow</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                La plateforme de référence pour la gestion ESG. 
                Automatisez votre reporting et restez conforme CSRD.
              </p>
            </div>

            {/* Solutions */}
            <div>
              <h4 className="font-bold mb-4">Solutions</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#pme" className="hover:text-white transition-colors">PME & ETI</a></li>
                <li><a href="#grandes" className="hover:text-white transition-colors">Grandes entreprises</a></li>
                <li><a href="#cabinets" className="hover:text-white transition-colors">Cabinets conseil</a></li>
                <li><a href="#investisseurs" className="hover:text-white transition-colors">Investisseurs</a></li>
              </ul>
            </div>

            {/* Entreprise */}
            <div>
              <h4 className="font-bold mb-4">Entreprise</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link to="/support" className="hover:text-white transition-colors">À propos</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Connexion</Link></li>
                <li><Link to="/support" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © 2026 ESGFlow. Tous droits réservés.
            </p>
            <div className="flex gap-6 text-sm text-gray-400">
              <Link to="/legal-notice" className="hover:text-white transition-colors">Mentions légales</Link>
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Confidentialité</Link>
              <Link to="/terms-of-service" className="hover:text-white transition-colors">CGV</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}