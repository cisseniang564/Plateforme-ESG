/**
 * ConsolidatedView — Vue consolidée des indicateurs ESG d'une organisation
 * et de ses filiales (IFRS 10 — intégration globale / proportionnelle).
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Loader2, AlertCircle, BarChart3, Layers, TrendingUp, CheckCircle2 } from 'lucide-react';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import i18n from '@/i18n/config';

const numLocale = () => (i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR');

interface ConsolidatedIndicator { indicator_code: string; indicator_name: string; unit: string | null; period: string | null; value: string; contributing_orgs: number; }
interface ConsolidatedReport { parent_org_id: string; parent_org_name: string; period: string | null; method: string; indicators: ConsolidatedIndicator[]; descendants_included: number; descendants_excluded: number; }

function getMETHOD_LABEL(t: TFunction): Record<string, { label: string; color: string }> {
  return {
    full:         { label: t('consol.methodFull',         'Intégration globale'),         color: 'emerald' },
    proportional: { label: t('consol.methodProportional', 'Intégration proportionnelle'), color: 'blue' },
    mixed:        { label: t('consol.methodMixed',        'Méthodes mixtes'),              color: 'violet' },
    none:         { label: t('consol.methodNone',         'Aucune consolidation'),         color: 'slate' },
  };
}

export default function ConsolidatedView() {
  const { t } = useTranslation();
  const METHOD_LABEL = getMETHOD_LABEL(t);
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ConsolidatedReport | null>(null);
  const [period, setPeriod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const url = period ? `/organizations/${id}/consolidated?period=${period}` : `/organizations/${id}/consolidated`;
        const res = await api.get<ConsolidatedReport>(url);
        if (mounted) setReport(res.data);
      } catch (e: any) {
        if (mounted) setError(e?.response?.data?.detail || t('consol.errLoad', 'Impossible de charger le rapport consolidé.'));
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [id, period]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;
  if (error) return <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700"><AlertCircle className="w-5 h-5 inline mr-2" />{error}</div>;
  if (!report) return null;

  const methodMeta = METHOD_LABEL[report.method] || METHOD_LABEL.none;
  const byPeriod: Record<string, ConsolidatedIndicator[]> = {};
  for (const ind of report.indicators) {
    const p = ind.period || t('consol.allPeriods', 'Toutes périodes');
    if (!byPeriod[p]) byPeriod[p] = [];
    byPeriod[p].push(ind);
  }
  const periods = Object.keys(byPeriod).sort().reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/app/organizations/${id}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><Building2 className="w-3.5 h-3.5" />{report.parent_org_name}</div>
          <h1 className="text-2xl font-extrabold text-gray-900">{t('consol.title', 'Vue consolidée')}</h1>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="">{t('consol.allPeriods', 'Toutes périodes')}</option>
          {[2025,2024,2023].map(y => <option key={y} value={String(y)}>{t('consol.exercice','Exercice {{y}}',{y})}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-2xl">
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold uppercase tracking-wider mb-2"><Layers className="w-3.5 h-3.5" />{t('consol.subsidiaries','Filiales incluses')}</div>
          <div className="text-3xl font-extrabold text-gray-900">{report.descendants_included}</div>
          {report.descendants_excluded > 0 && <div className="text-xs text-gray-500 mt-1">{t('consol.excluded','{{n}} entité(s) exclue(s) (equity / none)',{n:report.descendants_excluded})}</div>}
        </div>
        <div className={`p-5 bg-gradient-to-br from-${methodMeta.color}-50 to-white border border-${methodMeta.color}-100 rounded-2xl`}>
          <div className={`flex items-center gap-2 text-xs text-${methodMeta.color}-700 font-semibold uppercase tracking-wider mb-2`}><CheckCircle2 className="w-3.5 h-3.5" />{t('consol.method','Méthode')}</div>
          <div className="text-base font-extrabold text-gray-900 leading-tight mt-1">{methodMeta.label}</div>
          <div className="text-xs text-gray-500 mt-1">IFRS 10 / Code com. L233-16</div>
        </div>
        <div className="p-5 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl">
          <div className="flex items-center gap-2 text-xs text-blue-700 font-semibold uppercase tracking-wider mb-2"><BarChart3 className="w-3.5 h-3.5" />{t('consol.indicators','Indicateurs')}</div>
          <div className="text-3xl font-extrabold text-gray-900">{report.indicators.length}</div>
          <div className="text-xs text-gray-500 mt-1">{t('consol.numericConsolidated','numérique consolidés')}</div>
        </div>
        <div className="p-5 bg-gradient-to-br from-violet-50 to-white border border-violet-100 rounded-2xl">
          <div className="flex items-center gap-2 text-xs text-violet-700 font-semibold uppercase tracking-wider mb-2"><TrendingUp className="w-3.5 h-3.5" />{t('consol.period','Période')}</div>
          <div className="text-base font-extrabold text-gray-900 mt-1">{period || t('consol.all','Toutes')}</div>
        </div>
      </div>

      {periods.length === 0 ? (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl text-center">
          <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">{t('consol.noIndicators','Aucun indicateur consolidé pour cette période')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('consol.noIndicatorsHint',"Les indicateurs n'apparaissent que si au moins une filiale a des données saisies.")}</p>
        </div>
      ) : (
        periods.map(p => (
          <div key={p} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">{p}</h2>
              <span className="text-xs text-gray-500">{t('consol.indicCount','{{n}} indicateurs',{n:byPeriod[p].length})}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 bg-gray-50/50">
                  <th className="text-left px-5 py-2 font-semibold">{t('consol.thCode','Code')}</th>
                  <th className="text-left px-5 py-2 font-semibold">{t('consol.thIndicator','Indicateur')}</th>
                  <th className="text-right px-5 py-2 font-semibold">{t('consol.thValue','Valeur consolidée')}</th>
                  <th className="text-right px-5 py-2 font-semibold">{t('consol.thUnit','Unité')}</th>
                  <th className="text-right px-5 py-2 font-semibold">{t('consol.thSubsidiaries','Filiales')}</th>
                </tr>
              </thead>
              <tbody>
                {byPeriod[p].map((ind, i) => (
                  <tr key={`${ind.indicator_code}-${i}`} className="border-t border-gray-100 hover:bg-emerald-50/30 transition-colors">
                    <td className="px-5 py-2.5 font-mono text-xs text-gray-500">{ind.indicator_code}</td>
                    <td className="px-5 py-2.5 text-gray-900 font-medium">{ind.indicator_name}</td>
                    <td className="px-5 py-2.5 text-right font-bold text-gray-900">{parseFloat(ind.value).toLocaleString(numLocale(), { maximumFractionDigits: 2 })}</td>
                    <td className="px-5 py-2.5 text-right text-gray-500 text-xs">{ind.unit || '—'}</td>
                    <td className="px-5 py-2.5 text-right"><span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">{ind.contributing_orgs}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      <div className="text-xs text-gray-400 text-center pt-2">
        {t('consol.legalNote1','Consolidation conforme IFRS 10 et Code de commerce art. L233-16.')}<br />
        {t('consol.legalNote2','Méthodes : Intégration globale (100 %) · Proportionnelle (% détention) · Mise en équivalence (exclue) · Aucune.')}
      </div>
    </div>
  );
}
