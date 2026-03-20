import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  Upload,
  TrendingUp,
  Activity,
  Grid,
  Shield,
  ShieldCheck,
  AlertTriangle,
  BarChart3,
  Building2,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  Award,
  Leaf,
  CheckSquare,
  Target,
  Code2,
  Flame,
  TrendingDown,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '@/services/api';

interface ScoreTrend {
  current_score: number;
  trend_percentage: number;
  trend_direction: 'up' | 'down' | 'stable';
}

interface NavItem {
  name: string;
  description: string;
  href: string;
  icon: any;
  tourId?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function Sidebar() {
  const location = useLocation();
  const [trend, setTrend] = useState<ScoreTrend | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    data: true,
    pilotage: true,
    scoring: true,
  });

  useEffect(() => {
    loadTrend();
  }, []);

  const loadTrend = async () => {
    try {
      // ✅ FIX: Utiliser /dashboard au lieu de /trends
      const response = await api.get('/esg-scoring/dashboard');
      if (response.data?.statistics?.average_score) {
        setTrend({
          current_score: response.data.statistics.average_score,
          trend_percentage: 0,
          trend_direction: 'stable',
        });
      }
    } catch (error) {
      // Silent fail - pas de score affiché
      console.log('Could not load ESG score trend');
    }
  };

  const navigation: (NavItem | NavSection)[] = [
    {
      name: 'Tableau de bord',
      description: 'Vue d\'ensemble exécutive',
      href: '/app',
      icon: LayoutDashboard,
      tourId: 'sidebar-dashboard',
    },
    {
      title: 'Collecte Données',
      items: [
        { name: 'Saisie manuelle', description: 'Enregistrer vos indicateurs', href: '/app/data-entry', icon: Database, tourId: 'sidebar-data-entry' },
        { name: 'Import CSV', description: 'Import en masse', href: '/app/import-csv', icon: Upload },
        { name: 'Mes données', description: 'Toutes mes données ESG', href: '/app/my-data', icon: TrendingUp },
        { name: 'Calculs auto', description: 'Intelligence ESG', href: '/app/calculated-metrics', icon: Activity },
      ],
    },
    {
      title: 'Pilotage ESG',
      items: [
        { name: 'Indicateurs', description: 'Indicateurs de performance', href: '/app/indicators', icon: Activity, tourId: 'sidebar-indicators' },
        { name: 'Matérialité', description: 'Double matérialité CSRD', href: '/app/materiality', icon: Grid },
        { name: 'Risques', description: 'Registre des risques', href: '/app/risks', icon: AlertTriangle },
        { name: 'Qualité données', description: 'Validation et audit', href: '/app/data-quality', icon: Shield },
        { name: 'Workflow validation', description: 'Révision & approbation', href: '/app/validation', icon: CheckSquare },
      ],
    },
    {
      title: 'Scoring & Analyses',
      items: [
        { name: 'Scores ESG', description: 'Tableau de bord scoring', href: '/app/scores-dashboard', icon: Award, tourId: 'sidebar-scores' },
        { name: 'Benchmarking', description: 'Position vs secteur', href: '/app/benchmarking', icon: Target },
        { name: 'Organisations', description: 'Structure & hiérarchie', href: '/app/organizations', icon: Building2, tourId: 'sidebar-organizations' },
        { name: 'IA Prédictive', description: 'Anomalies & prévisions', href: '/app/intelligence', icon: BarChart3 },
      ],
    },
    {
      title: 'Conformité',
      items: [
        { name: 'Plan de Décarbonation', description: 'SBTi · Net Zero 2050 · 24 actions ROI', href: '/app/decarbonation', icon: TrendingDown },
        { name: 'Bilan Carbone Scope 3', description: '15 catégories GHG Protocol · ADEME', href: '/app/carbon', icon: Flame },
        { name: 'Taxonomie UE', description: 'Alignement EU Taxonomy 2020/852', href: '/app/taxonomy', icon: Leaf },
        { name: 'Multi-Réglementaire', description: 'CSRD · Sapin II · SFDR · ISO · DPEF', href: '/app/compliance', icon: ShieldCheck },
        { name: 'Rapports CSRD', description: 'Générer des rapports', href: '/app/reports', icon: FileText, tourId: 'sidebar-reports' },
      ],
    },
    { name: 'API Publique', description: 'Documentation développeur', href: '/app/api-docs', icon: Code2 },
    { name: 'Paramètres', description: 'Configuration', href: '/app/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <NavLink
        key={item.href}
        to={item.href}
        data-tour={item.tourId}
        className={`group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
          active ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 transition-colors ${
          active ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
        }`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${active ? 'text-primary-700' : 'text-gray-900'}`}>{item.name}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-tight">{item.description}</p>
        </div>
      </NavLink>
    );
  };

  const renderSection = (section: NavSection, index: number) => {
    const sectionId = section.title.toLowerCase().replace(/\s+/g, '_');
    const isExpanded = expandedSections[sectionId] !== false;
    const hasActiveItem = section.items.some(item => isActive(item.href));
    return (
      <div key={index} className="space-y-1">
        <button
          onClick={() => toggleSection(sectionId)}
          className={`flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
            hasActiveItem ? 'text-primary-700' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>{section.title}</span>
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {isExpanded && (
          <div className="space-y-1 ml-2">
            {section.items.map(item => renderNavItem(item))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-sm">
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-br from-slate-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-primary-600 rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">ESGFlow</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">Plateforme ESG</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">v2.0</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs">
          <div className="flex flex-col">
            <span className="text-gray-400">Tenant</span>
            <span className="font-medium text-gray-800">Demo Organization</span>
          </div>

          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            Active
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-5 space-y-3 overflow-y-auto">
        {navigation.map((item, index) => (
          'title' in item ? renderSection(item, index) : renderNavItem(item)
        ))}
      </nav>

      {trend !== null && (
        <div className="p-4 border-t border-gray-200">
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-600 mb-2">Score ESG Moyen</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-primary-700">
                {trend.current_score.toFixed(1)}
              </p>
              {trend.trend_direction === 'up' && (
                <TrendingUp className="h-4 w-4 text-green-600" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}