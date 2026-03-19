import { NavLink, useLocation } from 'react-router-dom';

import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Database, Upload,
  Activity,
  BarChart3,
  FileText,
  Settings,
  TrendingUp,
  Building2,
  Grid,
  Shield,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '@/services/api';

interface ScoreTrend {
  current_score: number;
  trend_percentage: number;
  trend_direction: 'up' | 'down' | 'stable';
}

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const [trend, setTrend] = useState<ScoreTrend | null>(null);

  useEffect(() => {
    loadTrend();
  }, []);

  const loadTrend = async () => {
    try {
      const response = await api.get('/esg-scoring/trends');
      setTrend(response.data);
    } catch (error) {
      // Fallback: try latest score
      try {
        const latest = await api.get('/esg-scoring/latest');
        setTrend({
          current_score: latest.data.overall_score,
          trend_percentage: 0,
          trend_direction: 'stable',
        });
      } catch {
        // No score available yet
      }
    }
  };

  const navigation = [
    {
      name: t('nav.dashboard'),
      description: t('nav.executiveOverview'),
      href: '/',
      icon: LayoutDashboard,
    },
    { 
    name: 'Saisie Données', 
    description: 'Enregistrer vos indicateurs', 
    href: '/data-entry', 
    icon: Database 
  },
  { name: 'Import CSV', description: 'Import en masse', href: '/import-csv', icon: Upload },
  { name: 'Mes Données', description: 'Toutes mes données ESG', href: '/my-data', icon: TrendingUp },
  { name: 'Qualité Données', description: 'Validation et audit trail', href: '/data-quality', icon: Shield },
    //{
    //  name: t('nav.dataManagement'),
    //  description: t('nav.uploadAndManageData'),
    //  href: '/data/upload',
    //  icon: Database,
    //},
    {
      name: t('nav.indicators'),
      description: t('nav.esgIndicators'),
      href: '/indicators',
      icon: Activity,
    },
    {
      name: t('nav.scores'),
      description: t('nav.esgScoresAnalytics'),
      href: '/scores',
      icon: BarChart3,
    },
    {
      name: 'Organisations',
      description: 'Structure & hiérarchie',
      href: '/organizations',
      icon: Building2,
    },
    {
      name: 'Matérialité',
      description: 'Double matérialité CSRD',
      href: '/materiality',
      icon: Grid,
    },
    {
      name: 'Risques ESG',
      description: 'Registre des risques',
      href: '/risks',
      icon: Shield,
    },
    {
      name: t('nav.reports'),
      description: t('nav.generateReports'),
      href: '/reports',
      icon: FileText,
    },
    {
      name: t('nav.settings'),
      description: t('nav.configuration'),
      href: '/settings',
      icon: Settings,
    },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">ESGFlow</h1>
            <p className="text-xs text-gray-500">v2.0.0</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${active ? 'text-primary-700' : 'text-gray-900'}`}>
                  {item.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* ESG Score Widget */}
      {trend !== null && (
        <div className="p-4 border-t border-gray-200">
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-600 mb-2">{t('sidebar.esgScore')}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-primary-700">
                {typeof trend.current_score === 'number' ? trend.current_score.toFixed(1) : '—'}
              </p>
              {trend.trend_direction === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : trend.trend_direction === 'down' ? (
                <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
              ) : null}
              {typeof trend.trend_percentage === 'number' && trend.trend_percentage !== 0 && (
                <span className={`text-xs font-medium ${trend.trend_direction === 'up' ? 'text-green-600' : 'text-red-500'}`}>
                  {trend.trend_direction === 'up' ? '+' : ''}{trend.trend_percentage.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}