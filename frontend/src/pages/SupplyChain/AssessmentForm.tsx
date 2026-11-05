import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import api from '@/services/api';
import { Question, Supplier, apiErrorMessage } from './supplyChainModel';

interface Props {
  supplier: Supplier;
  onSaved: (raw: any) => void;
  onCancel: () => void;
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function AssessmentForm({ supplier, onSaved, onCancel }: Props) {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>(supplier.answers ?? {});
  const [missing, setMissing] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/supply-chain/questionnaire/questions')
      .then(res => setQuestions(res.data as Question[]))
      .catch(() => setLoadError(true));
  }, []);

  const sections = useMemo(() => {
    const map = new Map<string, Question[]>();
    (questions ?? []).forEach(q => map.set(q.section, [...(map.get(q.section) ?? []), q]));
    return [...map.entries()];
  }, [questions]);

  const isEmpty = (v: unknown) => v === undefined || v === null || v === '';
  const requiredLeft = (questions ?? []).filter(q => q.required && isEmpty(answers[q.id])).length;

  const set = (id: string, value: any) => {
    setAnswers(p => {
      const next = { ...p };
      if (isEmpty(value)) delete next[id]; else next[id] = value;
      return next;
    });
    setMissing(m => m.filter(x => x !== id));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post(`/supply-chain/suppliers/${supplier.id}/assessment`, { answers });
      onSaved(res.data.supplier);
    } catch (err: any) {
      const d = err?.response?.data?.detail;
      if (d && Array.isArray(d.missing)) setMissing(d.missing);
      setError(apiErrorMessage(err, t('supplychain.assessmentError', "L'évaluation n'a pas pu être enregistrée.")));
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <p role="alert" className="text-sm text-red-600">{t('supplychain.questionsError', 'Impossible de charger les questions.')}</p>;
  if (!questions) return <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />{t('common.loading', 'Chargement…')}</div>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">{t('supplychain.assessmentIntro', "Saisissez les réponses du fournisseur. Les scores sont calculés à l'enregistrement.")}</p>
      {sections.map(([section, qs]) => (
        <fieldset key={section} className="space-y-4">
          <legend className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{section}</legend>
          {qs.map(q => {
            const bad = missing.includes(q.id);
            return (
              <div key={q.id} className={`rounded-xl p-3 border ${bad ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                <label htmlFor={`q-${q.id}`} className="text-sm font-medium text-gray-900 block">
                  {q.question}{q.required && <span className="text-red-500 ml-1" aria-label="obligatoire">*</span>}
                </label>
                {q.help && <p className="text-xs text-gray-400 mb-2">{q.help}</p>}
                {q.type === 'number' && (
                  <div className="flex items-center gap-2">
                    <input id={`q-${q.id}`} type="number" min="0" inputMode="decimal" className={inputCls}
                      value={answers[q.id] ?? ''} onChange={e => set(q.id, e.target.value === '' ? '' : Number(e.target.value))} />
                    {q.unit && <span className="text-xs text-gray-400 whitespace-nowrap">{q.unit}</span>}
                  </div>
                )}
                {q.type === 'boolean' && (
                  <div className="flex gap-2" role="group" aria-labelledby={`q-${q.id}`}>
                    {[{ v: true, l: t('common.yes', 'Oui') }, { v: false, l: t('common.no', 'Non') }].map(o => (
                      <button key={String(o.v)} type="button" onClick={() => set(q.id, answers[q.id] === o.v ? '' : o.v)}
                        aria-pressed={answers[q.id] === o.v}
                        className={`px-5 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${answers[q.id] === o.v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === 'select' && (
                  <select id={`q-${q.id}`} className={inputCls} value={answers[q.id] ?? ''} onChange={e => set(q.id, e.target.value)}>
                    <option value="">{t('supplychain.choose', 'Choisir…')}</option>
                    {(q.options ?? []).map(o => <option key={o}>{o}</option>)}
                  </select>
                )}
              </div>
            );
          })}
        </fieldset>
      ))}
      {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
      <div className="flex items-center gap-3 sticky bottom-0 bg-white pt-3 pb-1 border-t border-gray-100">
        <span className="text-xs text-gray-400 flex-1">
          {requiredLeft > 0
            ? t('supplychain.requiredLeft', '{{n}} question(s) obligatoire(s) restante(s)', { n: requiredLeft })
            : t('supplychain.requiredDone', 'Questions obligatoires renseignées')}
        </span>
        <button onClick={onCancel} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50">{t('common.cancel', 'Annuler')}</button>
        <button onClick={save} disabled={saving || requiredLeft > 0}
          className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}{t('supplychain.saveAssessment', "Enregistrer l'évaluation")}
        </button>
      </div>
    </div>
  );
}
