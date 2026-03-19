import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Shield, Zap, Users, FileText, BarChart3,
  CheckCircle, ArrowRight, Sparkles, Award, ChevronDown,
  Brain, Building2, Factory, Briefcase, LineChart, Database,
  Bell, Target, PieChart, Plus, Minus, Star, Check, X,
  Play, ArrowUpRight, Leaf, Globe, ChevronRight,
} from 'lucide-react';
import Button from '@/components/common/Button';

// ─── Animated counter hook ────────────────────────────────────────────────────
function useCounter(end: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start]);
  return count;
}

// ─── Intersection observer hook ───────────────────────────────────────────────
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); observer.disconnect(); }
    }, { threshold });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Stat counter component ───────────────────────────────────────────────────
function StatCounter({ value, suffix, label, started }: { value: number; suffix: string; label: string; started: boolean }) {
  const count = useCounter(value, 2000, started);
  return (
    <div className="text-center">
      <div className="text-4xl lg:text-5xl font-bold text-white">
        {count}{suffix}
      </div>
      <div className="text-sm text-green-300 mt-1 font-medium">{label}</div>
    </div>
  );
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900">{q}</span>
        {open
          ? <Minus className="h-5 w-5 text-green-600 flex-shrink-0" />
          : <Plus className="h-5 w-5 text-gray-400 flex-shrink-0" />
        }
      </button>
      {open && (
        <div className="px-6 pb-5 text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [scrolled, setScrolled] = useState(false);

  const { ref: heroRef, inView: heroInView } = useInView(0.3);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const menuItems = {
    plateforme: [
      { icon: BarChart3, title: 'Dashboard Exécutif', description: 'Vue temps réel de vos performances ESG', color: 'bg-green-100 text-green-600' },
      { icon: Brain, title: 'Intelligence IA', description: 'Détection d\'anomalies et suggestions auto', color: 'bg-purple-100 text-purple-600' },
      { icon: Database, title: 'Gestion des Données', description: 'Import CSV, saisie manuelle, calculs auto', color: 'bg-blue-100 text-blue-600' },
      { icon: FileText, title: 'Rapports PDF', description: 'CSRD, GRI, TCFD – génération en 1 clic', color: 'bg-orange-100 text-orange-600' },
    ],
    solutions: [
      { icon: Building2, title: 'PME & ETI', description: 'Solution adaptée aux moyennes entreprises', color: 'bg-teal-100 text-teal-600' },
      { icon: Factory, title: 'Grandes Entreprises', description: 'Pour les groupes CAC40 et SBF120', color: 'bg-indigo-100 text-indigo-600' },
      { icon: Briefcase, title: 'Cabinets Conseil', description: 'Multi-clients, white-label disponible', color: 'bg-pink-100 text-pink-600' },
      { icon: LineChart, title: 'Investisseurs', description: 'Due diligence ESG et scoring portfolio', color: 'bg-yellow-100 text-yellow-600' },
    ],
  };

  const features = [
    { icon: Sparkles, title: 'Intelligence Artificielle', description: 'Détection automatique d\'anomalies, suggestions d\'amélioration et analyse prédictive de vos données ESG.', gradient: 'from-purple-500 to-pink-500' },
    { icon: FileText, title: 'Rapports Automatisés', description: 'Génération de rapports CSRD, GRI et TCFD en 1 clic. PDF professionnels avec graphiques intégrés.', gradient: 'from-blue-500 to-cyan-500' },
    { icon: BarChart3, title: '100+ Indicateurs ESRS', description: 'Référentiel complet pré-configuré. Conforme à la directive européenne CSRD dès le premier jour.', gradient: 'from-green-500 to-emerald-500' },
    { icon: Zap, title: 'Calculs Automatiques', description: 'Formules pré-configurées : Scope 3, ratios, KPIs. Gain de temps ×10 comparé à Excel.', gradient: 'from-orange-500 to-red-500' },
    { icon: Shield, title: 'Sécurité & Conformité', description: 'Cryptage de bout en bout. Hébergement France. Conformité RGPD et ISO 27001 garantie.', gradient: 'from-indigo-500 to-purple-500' },
    { icon: Users, title: 'Collaboration', description: 'Multi-utilisateurs avec rôles granulaires. Workflow de validation multi-niveaux. Audit trail complet.', gradient: 'from-pink-500 to-rose-500' },
  ];

  const steps = [
    { num: '01', title: 'Connectez vos données', desc: 'Importez vos données via CSV, API ou saisie manuelle. Nos 100+ indicateurs pré-configurés vous guident.', icon: Database },
    { num: '02', title: 'L\'IA analyse & calcule', desc: 'Notre moteur IA détecte les anomalies, calcule les Scopes et génère vos KPIs automatiquement.', icon: Brain },
    { num: '03', title: 'Publiez vos rapports', desc: 'Générez des rapports CSRD, GRI ou TCFD en 1 clic. Partagez avec vos parties prenantes en toute sécurité.', icon: FileText },
  ];

  const plans = [
    {
      name: 'Starter',
      desc: 'Idéal pour les PME qui débutent leur démarche ESG',
      monthlyPrice: 199,
      annualPrice: 159,
      color: 'border-gray-200',
      badge: null,
      features: [
        '5 utilisateurs inclus',
        '50 indicateurs ESG',
        'Rapports PDF basiques',
        'Import CSV',
        'Support email 5j/7',
        'Tableau de bord standard',
      ],
      missing: ['Intelligence IA', 'API & intégrations', 'White-label', 'Support dédié'],
      cta: 'Commencer gratuitement',
      ctaVariant: 'secondary' as const,
    },
    {
      name: 'Business',
      desc: 'La solution complète pour les ETI et entreprises en croissance',
      monthlyPrice: 499,
      annualPrice: 399,
      color: 'border-green-500',
      badge: 'Le plus populaire',
      features: [
        'Utilisateurs illimités',
        '100+ indicateurs ESRS',
        'Rapports CSRD / GRI / TCFD',
        'Intelligence IA complète',
        'Import CSV + API',
        'Workflow de validation',
        'Support prioritaire 7j/7',
        'Analytics avancés',
      ],
      missing: ['White-label', 'SLA garanti 99,9%'],
      cta: 'Essai gratuit 14 jours',
      ctaVariant: 'primary' as const,
    },
    {
      name: 'Enterprise',
      desc: 'Pour les grands groupes avec des besoins sur mesure',
      monthlyPrice: null,
      annualPrice: null,
      color: 'border-slate-800',
      badge: 'Sur mesure',
      features: [
        'Tout Business inclus',
        'White-label & branding',
        'SLA garanti 99,9%',
        'Intégrations personnalisées',
        'Formation & onboarding dédié',
        'Account manager dédié',
        'Audit de conformité annuel',
        'Hébergement privé en option',
      ],
      missing: [],
      cta: 'Contacter les ventes',
      ctaVariant: 'secondary' as const,
    },
  ];

  const testimonials = [
    { name: 'Sophie Martineau', role: 'RSE Director, Groupe Nexans', text: 'ESGFlow nous a permis de diviser par 3 le temps de préparation de notre rapport CSRD. L\'IA détecte des incohérences que nous aurions ratées.', stars: 5, avatar: 'SM' },
    { name: 'Thomas Durand', role: 'CFO, Biocoop', text: 'Interface intuitive, données fiables, support réactif. Exactement ce qu\'il nous fallait pour notre première déclaration ESG réglementaire.', stars: 5, avatar: 'TD' },
    { name: 'Amélie Chen', role: 'Partner ESG, Deloitte France', text: 'Nous utilisons ESGFlow pour accompagner 12 clients simultanément. Le mode multi-tenant et les rapports white-label sont excellents.', stars: 5, avatar: 'AC' },
  ];

  const faqs = [
    { q: 'Combien de temps faut-il pour déployer la plateforme ?', a: 'La mise en service prend en moyenne 2 à 3 jours ouvrés. Nos équipes assurent l\'onboarding, la configuration des indicateurs et la formation de vos équipes. Pour les plans Enterprise, nous proposons un accompagnement sur mesure.' },
    { q: 'La plateforme est-elle vraiment conforme CSRD ?', a: 'Oui. ESGFlow intègre l\'ensemble des indicateurs ESRS (Environmental, Social, Governance) requis par la directive CSRD. Nos rapports sont régulièrement audités par des cabinets spécialisés pour garantir leur conformité aux dernières évolutions réglementaires.' },
    { q: 'Peut-on importer nos données existantes depuis Excel ou ERP ?', a: 'Absolument. La plateforme accepte les imports CSV/Excel et propose des connecteurs vers les principaux ERP (SAP, Oracle, Sage). Notre API RESTful permet également des intégrations sur mesure.' },
    { q: 'Où sont hébergées les données ?', a: 'Toutes les données sont hébergées en France, dans des datacenters certifiés ISO 27001 et HDS. Nous n\'utilisons aucun cloud américain. La conformité RGPD est garantie contractuellement.' },
    { q: 'Y a-t-il un engagement de durée ?', a: 'Non. Les plans Starter et Business sont sans engagement, résiliables à tout moment. Nous proposons également des contrats annuels avec 20% de réduction sur le tarif mensuel.' },
    { q: 'Que se passe-t-il à la fin de l\'essai gratuit ?', a: 'À la fin de la période d\'essai de 14 jours, vous choisissez le plan qui vous convient. Vos données sont conservées et aucun prélèvement n\'a lieu sans votre accord explicite.' },
  ];

  return (
    <div className="min-h-screen bg-white font-sans antialiased">

      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-lg shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
                <Leaf className="h-5 w-5 text-white" />
              </div>
              <span className={`text-xl font-bold transition-colors ${scrolled ? 'text-gray-900' : 'text-white'}`}>
                ESGFlow
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {(['plateforme', 'solutions'] as const).map((key) => (
                <div
                  key={key}
                  className="relative"
                  onMouseEnter={() => setOpenMenu(key)}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  <button className={`px-4 py-2 font-medium transition-colors flex items-center gap-1 rounded-lg capitalize ${scrolled ? 'text-gray-700 hover:text-green-600 hover:bg-gray-50' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {openMenu === key && (
                    <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="space-y-1">
                        {menuItems[key].map((item, idx) => {
                          const Icon = item.icon;
                          return (
                            <a key={idx} href={`#${key}`} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                              <div className={`p-2 rounded-lg ${item.color.split(' ')[0]} flex-shrink-0`}>
                                <Icon className={`h-4 w-4 ${item.color.split(' ')[1]}`} />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <a href="#fonctionnalites" className={`px-4 py-2 font-medium transition-colors rounded-lg ${scrolled ? 'text-gray-700 hover:text-green-600 hover:bg-gray-50' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>
                Fonctionnalités
              </a>
              <a href="#tarifs" className={`px-4 py-2 font-medium transition-colors rounded-lg ${scrolled ? 'text-gray-700 hover:text-green-600 hover:bg-gray-50' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>
                Tarifs
              </a>

              <div className="h-5 w-px bg-gray-300 mx-2" />

              <Link to="/login" className={`px-4 py-2 font-medium transition-colors rounded-lg ${scrolled ? 'text-gray-700 hover:text-green-600' : 'text-white/90 hover:text-white'}`}>
                Connexion
              </Link>
              <Link to="/register">
                <button className="ml-1 px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-600/25 hover:shadow-green-600/40 hover:-translate-y-0.5 text-sm">
                  Essai gratuit
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-green-950 to-emerald-900">
        {/* Grid pattern */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        {/* Glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/15 border border-green-500/30 rounded-full text-green-300 text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Plateforme ESG nouvelle génération
                <span className="bg-green-500/20 px-2 py-0.5 rounded-full text-xs text-green-400">2026</span>
              </div>

              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white leading-[1.05] tracking-tight">
                Le reporting ESG
                <br />
                <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
                  automatisé & conforme
                </span>
              </h1>

              <p className="text-lg text-slate-300 leading-relaxed max-w-lg">
                Automatisez votre reporting CSRD avec l'IA. 100+ indicateurs pré-configurés, rapports en 1 clic, collaboration multi-équipes.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/register">
                  <button className="group flex items-center gap-2 px-7 py-4 bg-green-500 hover:bg-green-400 text-white font-bold rounded-2xl transition-all shadow-xl shadow-green-500/30 hover:shadow-green-500/50 hover:-translate-y-0.5 text-base">
                    Essai gratuit 14 jours
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <a href="#demo">
                  <button className="flex items-center gap-2 px-7 py-4 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold rounded-2xl transition-all text-base backdrop-blur-sm">
                    <Play className="h-4 w-4" />
                    Voir la démo
                  </button>
                </a>
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-400">
                <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                Aucune carte de crédit requise · Sans engagement · RGPD
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
                <StatCounter value={100} suffix="+" label="Indicateurs ESRS" started={heroInView} />
                <StatCounter value={80} suffix="%" label="Gain de temps" started={heroInView} />
                <StatCounter value={500} suffix="+" label="Entreprises" started={heroInView} />
              </div>
            </div>

            {/* Right – mock dashboard */}
            <div className="relative hidden lg:block">
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                {/* Mock header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-white font-bold text-lg">Score ESG Global</div>
                    <div className="text-slate-400 text-sm">Mis à jour il y a 2 min</div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 rounded-full">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-green-400 text-xs font-medium">Live</span>
                  </div>
                </div>

                {/* Score circle */}
                <div className="flex items-center gap-6 mb-6">
                  <div className="relative w-32 h-32 flex-shrink-0">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#22c55e" strokeWidth="10"
                        strokeDasharray={`${2 * Math.PI * 50 * 0.78} ${2 * Math.PI * 50 * 0.22}`}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-white">78</span>
                      <span className="text-xs text-green-400">/100</span>
                    </div>
                  </div>
                  <div className="space-y-3 flex-1">
                    {[{ label: 'Environnemental', val: 82, color: 'bg-green-500' }, { label: 'Social', val: 74, color: 'bg-blue-500' }, { label: 'Gouvernance', val: 79, color: 'bg-purple-500' }].map(p => (
                      <div key={p.label}>
                        <div className="flex justify-between text-xs text-slate-300 mb-1"><span>{p.label}</span><span className="font-semibold">{p.val}</span></div>
                        <div className="h-2 bg-white/10 rounded-full"><div className={`h-2 ${p.color} rounded-full`} style={{ width: `${p.val}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mini chart bars */}
                <div className="flex items-end gap-2 h-20 mb-4">
                  {[45, 62, 58, 71, 68, 74, 78].map((h, i) => (
                    <div key={i} className="flex-1 bg-green-500/30 rounded-t-md hover:bg-green-500/50 transition-colors cursor-pointer" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  {['Sep', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar'].map(m => <span key={m}>{m}</span>)}
                </div>

                {/* Floating badges */}
                <div className="absolute -top-5 -right-5 bg-white rounded-2xl p-3 shadow-2xl border border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900">Conforme CSRD</div>
                      <div className="text-xs text-gray-500">Rapports validés</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-5 -left-5 bg-white rounded-2xl p-3 shadow-2xl border border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900">IA : 3 anomalies</div>
                      <div className="text-xs text-gray-500">détectées · 0 erreur</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 inset-x-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80L1440 80L1440 40C1200 80 960 0 720 20C480 40 240 80 0 40L0 80Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── Social proof logos ────────────────────────────────────────────────── */}
      <section className="py-14 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">
            Ils nous font confiance
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-14 gap-y-6">
            {['TotalEnergies', 'LVMH', 'Carrefour', 'Renault Group', 'Schneider Electric', 'Danone'].map((c) => (
              <div key={c} className="text-xl font-bold text-gray-200 hover:text-gray-400 transition-colors cursor-default">
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-green-600 uppercase tracking-widest">Comment ça marche</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">Opérationnel en 3 étapes</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">De la connexion des données à la publication du rapport, en quelques jours seulement.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-green-200 via-emerald-300 to-green-200 z-0" style={{ left: '22%', right: '22%' }} />

            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="relative z-10 flex flex-col items-center text-center p-8 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-green-500/30">
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-xs font-bold text-green-500 uppercase tracking-widest mb-2">{step.num}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-sm">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section id="fonctionnalites" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-green-600 uppercase tracking-widest">Fonctionnalités</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">Une plateforme complète</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">Tout ce dont vous avez besoin pour piloter votre performance ESG, de la collecte à la publication.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, idx) => (
              <div key={idx} className="group relative p-8 rounded-2xl border-2 border-gray-100 hover:border-transparent hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-default">
                {/* Hover gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                <div className={`w-12 h-12 bg-gradient-to-br ${f.gradient} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>

                <div className="flex items-center gap-1 mt-4 text-green-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  En savoir plus <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────────── */}
      <section id="tarifs" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-green-600 uppercase tracking-widest">Tarifs</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">Des plans adaptés à votre taille</h2>
            <p className="text-lg text-gray-500 mb-8">Commencez gratuitement, évoluez à votre rythme. Sans engagement.</p>

            {/* Toggle mensuel / annuel */}
            <div className="inline-flex items-center gap-3 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
              <button
                onClick={() => setBilling('monthly')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${billing === 'monthly' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setBilling('annual')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${billing === 'annual' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Annuel
                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan, idx) => {
              const price = billing === 'annual' ? plan.annualPrice : plan.monthlyPrice;
              const isHighlighted = plan.badge === 'Le plus populaire';

              return (
                <div key={idx} className={`relative flex flex-col rounded-3xl border-2 ${plan.color} bg-white p-8 transition-all duration-300 ${isHighlighted ? 'shadow-2xl shadow-green-500/15 scale-105' : 'hover:shadow-xl hover:-translate-y-1'}`}>
                  {plan.badge && (
                    <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${isHighlighted ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-slate-800 text-white'}`}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                    <p className="text-sm text-gray-500">{plan.desc}</p>
                  </div>

                  <div className="mb-8">
                    {price !== null ? (
                      <div className="flex items-end gap-2">
                        <span className="text-5xl font-extrabold text-gray-900">{price}€</span>
                        <span className="text-gray-400 mb-2 text-sm">/mois{billing === 'annual' && <span className="block text-xs text-green-600 font-semibold">facturé annuellement</span>}</span>
                      </div>
                    ) : (
                      <div className="text-4xl font-extrabold text-gray-900">Sur devis</div>
                    )}
                  </div>

                  <Link to={plan.name === 'Enterprise' ? '/contact' : '/register'} className="block mb-8">
                    <button className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${isHighlighted ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:-translate-y-0.5' : 'bg-gray-900 hover:bg-gray-800 text-white'}`}>
                      {plan.cta}
                    </button>
                  </Link>

                  <div className="space-y-3 flex-1">
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feat}</span>
                      </div>
                    ))}
                    {plan.missing.map((feat, i) => (
                      <div key={i} className="flex items-start gap-3 opacity-40">
                        <X className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-500">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-sm text-gray-400 mt-10">
            Tous les prix sont HT · TVA applicable selon pays · <a href="#faq" className="text-green-600 hover:underline">Questions fréquentes</a>
          </p>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-green-600 uppercase tracking-widest">Témoignages</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3">Ce que disent nos clients</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <div key={idx} className="flex flex-col p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed text-sm flex-1 mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-5 border-t border-gray-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-green-600 uppercase tracking-widest">FAQ</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">Questions fréquentes</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <FaqItem key={idx} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-green-900 via-emerald-800 to-green-950 relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-400/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-green-300 text-sm font-medium mb-8">
            <Sparkles className="h-4 w-4" />
            14 jours d'essai gratuit — sans carte bancaire
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
            Prêt à transformer votre reporting ESG ?
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
            Rejoignez plus de 500 entreprises qui ont choisi ESGFlow pour leur conformité CSRD. Démarrez en quelques minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <button className="group flex items-center gap-2 px-8 py-4 bg-white text-green-900 font-bold rounded-2xl hover:bg-gray-50 transition-all shadow-2xl text-base hover:-translate-y-0.5">
                Démarrer gratuitement
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link to="/login">
              <button className="flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold rounded-2xl transition-all text-base backdrop-blur-sm">
                <ArrowUpRight className="h-5 w-5" />
                Demander une démo
              </button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-8 mt-12 pt-8 border-t border-white/10">
            {[{ icon: Shield, label: 'RGPD conforme' }, { icon: Globe, label: 'Hébergé en France' }, { icon: Award, label: 'ISO 27001' }].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-400 text-sm">
                <item.icon className="h-4 w-4 text-green-400" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Leaf className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">ESGFlow</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-6">
                La plateforme de référence pour la gestion ESG et la conformité CSRD. Automatisez votre reporting, gagnez du temps, restez conforme.
              </p>
              <div className="flex gap-3">
                {['in', 'tw', 'yt'].map(s => (
                  <div key={s} className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center cursor-pointer transition-colors text-slate-400 hover:text-white text-xs font-bold uppercase">
                    {s}
                  </div>
                ))}
              </div>
            </div>

            {[
              { title: 'Plateforme', links: ['Dashboard', 'Indicateurs ESRS', 'Rapports CSRD', 'Intelligence IA', 'Workflow Validation'] },
              { title: 'Solutions', links: ['PME & ETI', 'Grandes entreprises', 'Cabinets conseil', 'Investisseurs'] },
              { title: 'Entreprise', links: ['À propos', 'Blog ESG', 'Carrières', 'Contact', 'Support'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="font-semibold text-sm mb-4 text-white">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map(l => (
                    <li key={l}><a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">© 2026 ESGFlow. Tous droits réservés.</p>
            <div className="flex gap-6 text-sm text-slate-500">
              <Link to="/legal-notice" className="hover:text-white transition-colors">Mentions légales</Link>
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Confidentialité</Link>
              <Link to="/terms-of-service" className="hover:text-white transition-colors">CGV</Link>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
