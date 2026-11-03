/**
 * Insights IA — une seule entrée de menu, deux onglets :
 *  - « Analyse » : tableau de bord d'intelligence (anomalies, prédictions, assistant) ;
 *  - « Recommandations » : actions prioritaires et gains de score estimés.
 * L'ancienne page « IA prédictive » (/app/ai-insights) renvoie ici, sur l'onglet Recommandations.
 */
import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Spinner from '@/components/common/Spinner';
import { tabFromParam, TAB_PARAM, type InsightsTab } from './insightsTabs';

const IntelligenceDashboard = lazy(() => import('./IntelligenceDashboard'));
const AIInsights = lazy(() => import('./AIInsights'));

export default function InsightsIA() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab = tabFromParam(params.get('tab'));

  const tabs: { key: InsightsTab; label: string }[] = [
    { key: 'analyse', label: t('insights.tabAnalysis', 'Analyse') },
    { key: 'recommandations', label: t('insights.tabReco', 'Recommandations') },
  ];
  const select = (key: InsightsTab) => setParams(key === 'analyse' ? {} : { tab: TAB_PARAM[key] }, { replace: true });

  return (
    <div className="space-y-5">
      <div className="flex gap-1 border-b border-gray-200" role="tablist" aria-label={t('insights.sections', 'Sections')}>
        {tabs.map(x => (
          <button key={x.key} type="button" role="tab" id={`insights-tab-${x.key}`} aria-selected={tab === x.key} aria-controls={`insights-panel-${x.key}`} onClick={() => select(x.key)}
            className={`-mb-px min-h-[44px] whitespace-nowrap border-b-2 px-4 text-sm font-semibold ${tab === x.key ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
            {x.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`insights-panel-${tab}`} aria-labelledby={`insights-tab-${tab}`}>
        <Suspense fallback={<div className="flex justify-center py-24"><Spinner /></div>}>
          {tab === 'analyse' ? <IntelligenceDashboard /> : <AIInsights embedded />}
        </Suspense>
      </div>
    </div>
  );
}
