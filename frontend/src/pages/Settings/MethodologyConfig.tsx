import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle, Settings, BookOpen, BarChart3,
  Thermometer, ChevronDown, ChevronUp, ExternalLink, Save
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import PageHeader from '@/components/PageHeader';

interface Methodology {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  bgLight: string;
  active: boolean;
  coverage: number;
  indicators: number;
  lastUpdate: string;
  categories: { name: string; count: number; configured: number }[];
  docsUrl: string;
}

const DEFAULT_METHODOLOGIES: Methodology[] = [
  {
    id: 'gri',
    name: 'GRI Standards',
    version: '2024',
    description: 'Standards GRI 2021 — référentiel mondial pour le reporting de durabilité des entreprises.',
    icon: BookOpen,
    gradient: 'from-green-500 to-emerald-600',
    bgLight: 'bg-green-50',
    active: true,
    coverage: 87,
    indicators: 34,
    lastUpdate: 'janv. 2026',
    categories: [
      { name: 'Environnement', count: 12, configured: 10 },
      { name: 'Social', count: 14, configured: 12 },
      { name: 'Gouvernance', count: 8, configured: 7 },
    ],
    docsUrl: 'https://www.globalreporting.org',
  },
  {
    id: 'sasb',
    name: 'SASB Framework',
    version: 'v2.1',
    description: 'Sustainability Accounting Standards Board — normes sectorielles pour la communication financière ESG.',
    icon: BarChart3,
    gradient: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    active: true,
    coverage: 72,
    indicators: 27,
    lastUpdate: 'déc. 2025',
    categories: [
      { name: 'Finance', count: 9, configured: 7 },
      { name: 'Capital humain', count: 10, configured: 6 },
      { name: 'Environnement', count: 8, configured: 6 },
    ],
    docsUrl: 'https://sasb.org',
  },
  {
    id: 'tcfd',
    name: 'TCFD Recommendations',
    version: 'v3.0',
    description: 'Task Force on Climate-related Financial Disclosures — divulgation des risques et opportunités climatiques.',
    icon: Thermometer,
    gradient: 'from-purple-500 to-indigo-600',
    bgLight: 'bg-purple-50',
    active: true,
    coverage: 91,
    indicators: 19,
    lastUpdate: 'févr. 2026',
    categories: [
      { name: 'Gouvernance', count: 5, configured: 5 },
      { name: 'Stratégie', count: 6, configured: 5 },
      { name: 'Risques', count: 8, configured: 7 },
    ],
    docsUrl: 'https://www.fsb-tcfd.org',
  },
  {
    id: 'csrd',
    name: 'CSRD / ESRS',
    version: '2024',
    description: 'Corporate Sustainability Reporting Directive — directive européenne obligatoire pour le reporting extra-financier.',
    icon: Settings,
    gradient: 'from-orange-500 to-red-500',
    bgLight: 'bg-orange-50',
    active: false,
    coverage: 41,
    indicators: 48,
    lastUpdate: 'mars 2026',
    categories: [
      { name: 'Environnement (E)', count: 18, configured: 8 },
      { name: 'Social (S)', count: 16, configured: 7 },
      { name: 'Gouvernance (G)', count: 14, configured: 5 },
    ],
    docsUrl: 'https://efrag.org/esrs',
  },
];

export default function MethodologyConfig() {
  const { t } = useTranslation();
  const [methodologies, setMethodologies] = useState<Methodology[]>(DEFAULT_METHODOLOGIES);
  const [expanded, setExpanded] = useState<string | null>('gri');
  const [saving, setSaving] = useState(false);

  const toggleActive = (id: string) => {
    setMethodologies(prev =>
      prev.map(m => m.id === id ? { ...m, active: !m.active } : m)
    );
    const m = methodologies.find(m => m.id === id);
    if (m) toast.success(`${m.name} ${m.active ? t('methodology.deactivated') : t('methodology.activated')}`);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));
    setSaving(false);
    toast.success(t('methodology.saveSuccess'));
  };

  const activeCount = methodologies.filter(m => m.active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('methodology.title')}
        subtitle={t('methodology.subtitle')}
        showBack
        backTo="/app/settings"
        actions={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />{t('methodology.saving')}</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />{t('methodology.save')}</>
            )}
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-green-100 rounded-2xl p-5">
          <p className="text-3xl font-black text-gray-900">{activeCount}</p>
          <p className="text-sm font-semibold text-gray-500 mt-1">{t('methodology.active')}</p>
        </div>
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-5">
          <p className="text-3xl font-black text-gray-900">{methodologies.length}</p>
          <p className="text-sm font-semibold text-gray-500 mt-1">{t('methodology.available')}</p>
        </div>
        <div className="bg-white border-2 border-blue-100 rounded-2xl p-5">
          <p className="text-3xl font-black text-gray-900">
            {methodologies.filter(m => m.active).reduce((s, m) => s + m.indicators, 0)}
          </p>
          <p className="text-sm font-semibold text-gray-500 mt-1">{t('methodology.activeIndicators')}</p>
        </div>
        <div className="bg-white border-2 border-purple-100 rounded-2xl p-5">
          <p className="text-3xl font-black text-gray-900">
            {activeCount > 0
              ? Math.round(methodologies.filter(m => m.active).reduce((s, m) => s + m.coverage, 0) / activeCount)
              : 0}%
          </p>
          <p className="text-sm font-semibold text-gray-500 mt-1">{t('methodology.avgCoverage')}</p>
        </div>
      </div>

      {/* Methodology Cards */}
      <div className="space-y-4">
        {methodologies.map((m) => {
          const Icon = m.icon;
          const isExpanded = expanded === m.id;
          return (
            <div
              key={m.id}
              className={`bg-white border-2 rounded-2xl overflow-hidden transition-all duration-200 ${
                m.active ? 'border-green-200' : 'border-gray-100'
              }`}
            >
              {/* Header row */}
              <div className="flex items-center gap-4 p-5">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-0.5">
                    <h3 className="font-bold text-gray-900">{m.name}</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-mono">{m.version}</span>
                    {m.active ? (
                      <span className="text-xs font-bold px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> {t('methodology.active')}
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">{t('methodology.inactive')}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{m.description}</p>
                </div>

                {/* Coverage */}
                <div className="hidden md:flex flex-col items-end gap-1 flex-shrink-0 w-28">
                  <span className="text-xs text-gray-400">{t('methodology.coverage')}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${m.gradient} rounded-full`}
                        style={{ width: `${m.coverage}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-900">{m.coverage}%</span>
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={() => toggleActive(m.id)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${
                    m.active ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                    m.active ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>

                {/* Expand */}
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : m.id)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                </button>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 pb-5 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                    {m.categories.map((cat) => {
                      const pct = Math.round((cat.configured / cat.count) * 100);
                      return (
                        <div key={cat.name} className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
                            <span className="text-xs text-gray-500">{cat.configured}/{cat.count}</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${m.gradient} rounded-full transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1.5">{pct}% {t('methodology.configured')}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      {t('methodology.lastUpdate')}: {m.lastUpdate} · {m.indicators} {t('methodology.totalIndicators')}
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={m.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 px-3 py-1.5 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> {t('methodology.documentation')}
                      </a>
                      <Button size="sm" variant="secondary">
                        <Settings className="h-3.5 w-3.5 mr-1.5" /> {t('methodology.configure')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info banner */}
      <Card className="border-2 border-blue-100 bg-blue-50">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-900 mb-1">{t('methodology.complianceTitle')}</p>
            <p className="text-sm text-blue-700">
              {t('methodology.complianceDesc')}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
