import { useEffect, useState } from 'react';
import { Sparkles, X, Loader2, AlertCircle, Save, Copy, Check, Target, Clock, TrendingDown, Zap, RotateCcw, FileText } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

export interface AIMitigationAction { title: string; detail: string; effort: 'low' | 'medium' | 'high'; timeline: string; }
export interface AIMitigationResult {
  risk_id: string; summary: string; actions: AIMitigationAction[]; kpis: string[];
  estimated_residual_score: number | null; estimated_effort: 'low' | 'medium' | 'high';
  timeline: string; source: 'openai' | 'rule_based'; saved: boolean;
}

interface Props { riskId: string; riskTitle: string; currentScore: number; onClose: () => void; onSaved: () => void; }

function getEFFORT_CFG(t: TFunction) {
  return {
    low:    { label: t('aimit.effortLow',  'Faible'), bg: 'bg-green-100', text: 'text-green-700' },
    medium: { label: t('aimit.effortMed',  'Moyen'),  bg: 'bg-amber-100', text: 'text-amber-700' },
    high:   { label: t('aimit.effortHigh', 'Élevé'),  bg: 'bg-red-100',   text: 'text-red-700'   },
  } as const;
}

export default function AIMitigationModal({ riskId, riskTitle, currentScore, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const EFFORT_CFG = getEFFORT_CFG(t);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIMitigationResult | null>(null);
  const [extraContext, setExtraContext] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = async (withContext = false) => {
    setLoading(true); setError(null); setResult(null);
    try {
      const body: Record<string, unknown> = { save: false };
      if (withContext && extraContext.trim()) body.extra_context = extraContext.trim();
      const res = await api.post(`/materiality/risks/${riskId}/ai-mitigation`, body);
      setResult(res.data);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(e.response?.data?.detail || e.message || t('aimit.errOccurred', 'Une erreur est survenue'));
    } finally { setLoading(false); }
  };

  useEffect(() => { void generate(false); /* eslint-disable-next-line */ }, []);

  const apply = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { save: true };
      if (extraContext.trim()) body.extra_context = extraContext.trim();
      await api.post(`/materiality/risks/${riskId}/ai-mitigation`, body);
      toast.success(t('aimit.applied', 'Plan de mitigation appliqué au risque'));
      onSaved();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || t('aimit.errSave', "Impossible d'enregistrer le plan"));
    } finally { setSaving(false); }
  };

  const copyToClipboard = async () => {
    if (!result) return;
    const text = `${result.summary}\n\n` +
      result.actions.map((a, i) => `${i + 1}. ${a.title} (${a.effort}, ${a.timeline}) — ${a.detail}`).join('\n') +
      `\n\nKPIs :\n${result.kpis.map((k) => `- ${k}`).join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { toast.error(t('aimit.errCopy', 'Copie impossible')); }
  };

  const reduction = result?.estimated_residual_score != null ? Math.max(0, currentScore - result.estimated_residual_score) : 0;
  const reductionPct = currentScore > 0 ? Math.round((reduction / currentScore) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-5 text-white overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage:'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize:'20px 20px' }} />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-white/20 border border-white/30 rounded-full px-2.5 py-1 mb-2">
                <Sparkles className="h-3 w-3" />{t('aimit.badge', 'Mitigation IA')}
              </span>
              <h2 className="text-xl font-bold truncate">{riskTitle}</h2>
              <p className="text-violet-100 text-sm mt-0.5">{t('aimit.subtitle', 'Plan de mitigation contextualisé généré automatiquement')}</p>
            </div>
            <button onClick={onClose} className="flex-shrink-0 p-2 rounded-xl hover:bg-white/15 transition-colors text-white/70 hover:text-white" aria-label={t('aimit.close','Fermer')}>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 text-violet-500 animate-spin mb-4" />
              <p className="text-sm font-semibold text-gray-700">{t('aimit.analyzing', "Analyse du risque par l'IA…")}</p>
              <p className="text-xs text-gray-400 mt-1">{t('aimit.analyzingSub', "Génération d'actions, KPIs et estimation d'impact (≈ 5 sec)")}</p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700">{t('aimit.errTitle', 'Génération impossible')}</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
                <button onClick={() => generate(false)} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors">
                  <RotateCcw className="h-3.5 w-3.5" />{t('aimit.retry', 'Réessayer')}
                </button>
              </div>
            </div>
          )}

          {result && !loading && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${result.source==='openai' ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                  <Sparkles className="h-3 w-3" />
                  {result.source === 'openai' ? t('aimit.sourceAI', 'Analyse IA (OpenAI)') : t('aimit.sourceRuleBased', 'Plan rule-based')}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">
                  <Clock className="h-3 w-3" />{t('aimit.horizon', 'Horizon :')} {result.timeline}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${EFFORT_CFG[result.estimated_effort].bg} ${EFFORT_CFG[result.estimated_effort].text}`}>
                  <Zap className="h-3 w-3" />{t('aimit.effort', 'Effort :')} {EFFORT_CFG[result.estimated_effort].label}
                </span>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-violet-600" />
                  <h3 className="text-sm font-bold text-violet-900">{t('aimit.summaryTitle', 'Résumé de la stratégie')}</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
              </div>

              {result.estimated_residual_score != null && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-center">
                    <p className="text-3xl font-bold text-red-600">{currentScore}</p>
                    <p className="text-xs text-red-700 font-semibold mt-0.5">{t('aimit.scoreCurrent', 'Score actuel')}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-600">{result.estimated_residual_score}</p>
                    <p className="text-xs text-emerald-700 font-semibold mt-0.5">{t('aimit.scoreResidual', 'Score résiduel')}</p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600 flex items-center justify-center gap-1"><TrendingDown className="h-5 w-5" />-{reductionPct}%</p>
                    <p className="text-xs text-blue-700 font-semibold mt-0.5">{t('aimit.scoreReduction', 'Réduction estimée')}</p>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-bold text-gray-900">{t('aimit.actionsTitle', "Plan d'action ({{n}})", { n: result.actions.length })}</h3>
                </div>
                <ol className="space-y-3">
                  {result.actions.map((action, i) => (
                    <li key={i} className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-7 h-7 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center text-xs font-bold">{i+1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap mb-1.5">
                            <p className="text-sm font-bold text-gray-900">{action.title}</p>
                            <div className="flex gap-1.5 flex-shrink-0">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${EFFORT_CFG[action.effort].bg} ${EFFORT_CFG[action.effort].text}`}>{EFFORT_CFG[action.effort].label}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{action.timeline}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{action.detail}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-bold text-gray-900">{t('aimit.kpisTitle', 'KPIs à suivre')}</h3>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.kpis.map((kpi, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                      <span className="text-violet-500 mt-0.5">•</span>
                      <span className="text-sm text-gray-700">{kpi}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 p-4">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('aimit.refineLabel', 'Affiner avec votre contexte (optionnel — secteur, contraintes, périmètre)')}</label>
                <div className="flex gap-2 flex-col sm:flex-row">
                  <input type="text" value={extraContext} onChange={(e) => setExtraContext(e.target.value)}
                    placeholder={t('aimit.refinePlaceholder','Ex: PME industrielle 250 salariés, France, secteur chimie')} maxLength={1000}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none" />
                  <button onClick={() => generate(true)} disabled={loading || !extraContext.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors">
                    <RotateCcw className="h-4 w-4" />{t('aimit.regenerate', 'Régénérer')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {result && !loading && (
          <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/60 px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
            <button onClick={copyToClipboard} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? t('aimit.copied','Copié') : t('aimit.copy','Copier')}
            </button>
            <div className="flex items-center gap-2">
              <button onClick={onClose} disabled={saving} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">
                {t('aimit.cancel','Annuler')}
              </button>
              <button onClick={apply} disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all shadow-sm">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" />{t('aimit.saving','Enregistrement…')}</> : <><Save className="h-4 w-4" />{t('aimit.apply','Appliquer au risque')}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
