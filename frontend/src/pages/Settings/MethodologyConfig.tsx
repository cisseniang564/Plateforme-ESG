import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  CheckCircle, Settings, BookOpen, BarChart3,
  Thermometer, ChevronDown, ChevronUp, ExternalLink, Save, ArrowLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Methodology {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  bgLight: string;
  indicators: number;
  lastUpdate: string;
  categories: { name: string; count: number }[];
  docsUrl: string;
}

function getDefaultMethodologies(t: TFunction): Methodology[] {
  return [
    {
      id: 'gri',
      name: 'GRI Standards',
      version: '2024',
      description: t('settings.methodology.gri.description', "Standards GRI 2021 — référentiel mondial pour le reporting de durabilité des entreprises."),
      icon: BookOpen,
      gradient: 'from-green-500 to-emerald-600',
      bgLight: 'bg-green-50',
      
      indicators: 34,
      lastUpdate: t('settings.methodology.gri.lastUpdate', 'janv. 2026'),
      categories: [
        { name: t('settings.methodology.catEnvironnement', 'Environnement'), count: 12 },
        { name: t('settings.methodology.catSocial', 'Social'), count: 14 },
        { name: t('settings.methodology.catGouvernance', 'Gouvernance'), count: 8 },
      ],
      docsUrl: 'https://www.globalreporting.org',
    },
    {
      id: 'sasb',
      name: 'SASB Framework',
      version: 'v2.1',
      description: t('settings.methodology.sasb.description', "Sustainability Accounting Standards Board — normes sectorielles pour la communication financière ESG."),
      icon: BarChart3,
      gradient: 'from-blue-500 to-blue-600',
      bgLight: 'bg-blue-50',
      
      indicators: 27,
      lastUpdate: t('settings.methodology.sasb.lastUpdate', 'déc. 2025'),
      categories: [
        { name: t('settings.methodology.catFinance', 'Finance'), count: 9 },
        { name: t('settings.methodology.catCapitalHumain', 'Capital humain'), count: 10 },
        { name: t('settings.methodology.catEnvironnement', 'Environnement'), count: 8 },
      ],
      docsUrl: 'https://sasb.org',
    },
    {
      id: 'tcfd',
      name: 'TCFD Recommendations',
      version: 'v3.0',
      description: t('settings.methodology.tcfd.description', "Task Force on Climate-related Financial Disclosures — divulgation des risques et opportunités climatiques."),
      icon: Thermometer,
      gradient: 'from-purple-500 to-indigo-600',
      bgLight: 'bg-purple-50',
      
      indicators: 19,
      lastUpdate: t('settings.methodology.tcfd.lastUpdate', 'févr. 2026'),
      categories: [
        { name: t('settings.methodology.catGouvernance', 'Gouvernance'), count: 5 },
        { name: t('settings.methodology.catStrategie', "Stratégie"), count: 6 },
        { name: t('settings.methodology.catRisques', 'Risques'), count: 8 },
      ],
      docsUrl: 'https://www.fsb-tcfd.org',
    },
    {
      id: 'csrd',
      name: 'CSRD / ESRS',
      version: '2024',
      description: t('settings.methodology.csrd.description', "Corporate Sustainability Reporting Directive — directive européenne obligatoire pour le reporting extra-financier."),
      icon: Settings,
      gradient: 'from-orange-500 to-red-500',
      bgLight: 'bg-orange-50',
      
      indicators: 48,
      lastUpdate: t('settings.methodology.csrd.lastUpdate', 'mars 2026'),
      categories: [
        { name: t('settings.methodology.catEnvironnementE', 'Environnement (E)'), count: 18 },
        { name: t('settings.methodology.catSocialS', 'Social (S)'), count: 16 },
        { name: t('settings.methodology.catGouvernanceG', 'Gouvernance (G)'), count: 14 },
      ],
      docsUrl: 'https://efrag.org/esrs',
    },
  ];
}

export default function MethodologyConfig() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const methodologies = getDefaultMethodologies(t);
  const [expanded, setExpanded] = useState<string | null>('gri');

  // ── ESG Pillar Weights ──────────────────────────────────────────────────────
  const [weights, setWeights] = useState({ env: 40, soc: 35, gov: 25 }); // in %
  const [weightsSaved, setWeightsSaved] = useState(false);
  const [savingWeights, setSavingWeights] = useState(false);
  const [weightsState, setWeightsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const weightSum = weights.env + weights.soc + weights.gov;

  useEffect(() => {
    api.get('/esg-scoring/weights')
      .then(res => {
        const w = res.data?.weights;
        if (w) setWeights({ env: Math.round(w.env * 100), soc: Math.round(w.soc * 100), gov: Math.round(w.gov * 100) });
        setWeightsState('ready');
      })
      .catch(() => setWeightsState('error'));
  }, []);

  const handleSaveWeights = async () => {
    if (Math.abs(weightSum - 100) > 1) return;
    setSavingWeights(true);
    try {
      await api.put('/esg-scoring/weights', { env: weights.env / 100, soc: weights.soc / 100, gov: weights.gov / 100 });
      setWeightsSaved(true);
      toast.success(t('settings.methodology.toastWeightsSaved', 'Pondérations ESG enregistrées'));
      setTimeout(() => setWeightsSaved(false), 3000);
    } catch {
      toast.error(t('settings.methodology.toastWeightsError', 'Erreur lors de la sauvegarde'));
    } finally {
      setSavingWeights(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==')] opacity-30" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <button
              onClick={() => navigate('/app/settings')}
              className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('settings.methodology.backToSettings', 'Paramètres')}
            </button>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold tracking-wide uppercase">
                {t('settings.methodology.heroBadge', 'Paramètres ESG')}
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-1">{t('methodology.title')}</h1>
            <p className="text-emerald-100">{t('methodology.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-5">
          <p className="text-3xl font-black text-gray-900">{methodologies.length}</p>
          <p className="text-sm font-semibold text-gray-500 mt-1">{t('methodology.available')}</p>
        </div>
        <div className="bg-white border-2 border-blue-100 rounded-2xl p-5">
          <p className="text-3xl font-black text-gray-900">{methodologies.reduce((s, m) => s + m.indicators, 0)}</p>
          <p className="text-sm font-semibold text-gray-500 mt-1">{t('settings.methodology.totalCatalog', "Indicateurs au catalogue")}</p>
        </div>
      </div>

      {/* ── ESG Pillar Weights ── */}
      <div className="bg-white border-2 border-gray-100 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">{t('settings.methodology.pillarWeightsTitle', 'Pondération des piliers ESG')}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{t('settings.methodology.pillarWeightsSubtitle', 'Définissez le poids de chaque pilier dans le score ESG global')}</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold ${Math.abs(weightSum - 100) <= 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            Total : {weightSum}%
          </div>
        </div>

        <div className="space-y-5">
          {[
            { key: 'env' as const, label: t('settings.methodology.pillarEnv', 'Environnement'), color: 'text-green-700', bar: 'bg-green-500', border: 'border-green-200 focus:ring-green-400' },
            { key: 'soc' as const, label: t('settings.methodology.pillarSoc', 'Social'),         color: 'text-blue-700',  bar: 'bg-blue-500',  border: 'border-blue-200 focus:ring-blue-400'  },
            { key: 'gov' as const, label: t('settings.methodology.pillarGov', 'Gouvernance'),    color: 'text-purple-700',bar: 'bg-purple-500',border: 'border-purple-200 focus:ring-purple-400'},
          ].map(({ key, label, color, bar, border }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-semibold ${color}`}>{label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={100} step={1}
                    value={weights[key]}
                    onChange={e => setWeights(prev => ({ ...prev, [key]: Math.max(0, Math.min(100, Number(e.target.value))) }))}
                    className={`w-16 text-center text-sm font-bold border-2 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 ${border}`}
                  />
                  <span className="text-sm text-gray-400">%</span>
                </div>
              </div>
              <input
                type="range" min={0} max={100} step={1}
                value={weights[key]}
                onChange={e => setWeights(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-100"
              />
              <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-2 ${bar} rounded-full transition-all duration-300`} style={{ width: `${weights[key]}%` }} />
              </div>
            </div>
          ))}
        </div>

        {weightsState === 'error' && (
          <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {t('settings.methodology.weightsLoadError', "Impossible de charger vos pondérations : les valeurs ci-dessus ne sont pas celles enregistrées. Rechargez la page avant de modifier.")}
          </p>
        )}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {Math.abs(weightSum - 100) > 1
              ? t('settings.methodology.weightInvalid', `⚠ La somme doit être 100% (manque ${100 - weightSum}%)`)
              : t('settings.methodology.weightValid', '✓ Pondérations valides')}
          </p>
          <button
            onClick={handleSaveWeights}
            disabled={savingWeights || weightsState !== 'ready' || Math.abs(weightSum - 100) > 1}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all"
          >
            {savingWeights
              ? <><div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />{t('settings.methodology.savingWeights', 'Sauvegarde...')}</>
              : weightsSaved
              ? <><CheckCircle className="h-3.5 w-3.5" />{t('settings.methodology.saved', 'Enregistré')}</>
              : <><Save className="h-3.5 w-3.5" />{t('settings.methodology.saveWeights', 'Enregistrer')}</>
            }
          </button>
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
                'border-gray-100'
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
                  </div>
                  <p className="text-sm text-gray-500 truncate">{m.description}</p>
                </div>

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
                    {m.categories.map((cat) => (
                      <div key={cat.name} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
                        <span className="text-xs text-gray-500">{cat.count} {t('settings.methodology.indicatorsShort', 'indicateurs')}</span>
                      </div>
                    ))}
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
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info banner */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm border-2 border-blue-100 bg-blue-50">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-900 mb-1">{t('settings.methodology.noteTitle', 'Catalogue de référentiels')}</p>
            <p className="text-sm text-blue-700">
              {t('settings.methodology.noteDesc', "Cette page présente les référentiels pris en charge par la plateforme. Seule la pondération des piliers ESG est un réglage enregistré ; elle s'applique au calcul de votre score.")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
