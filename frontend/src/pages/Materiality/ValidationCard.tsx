import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, History, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { HORIZON_LABELS, VALUE_CHAIN_LABELS } from './materialityHelpers';

interface Summary {
  id: string; version: number; validated_at: string; validator_name: string; validator_role: string; comment?: string | null;
  issue_count: number; material_count: number; snapshot_hash: string;
}
interface Changes { added: { name: string }[]; removed: { name: string }[]; modified: { name: string; fields: string[] }[]; total: number }
interface Status { last: Summary | null; changes: Changes | null; up_to_date: boolean }

const FIELD_LABELS: Record<string, string> = {
  name: 'nom', category: 'pilier', financial_impact: 'note financière', esg_impact: "note d'impact", is_material: 'matérialité',
  esrs_topic: 'sujet ESRS', iro_type: 'type IRO', iro_actual_or_potential: 'avéré/potentiel', time_horizon: 'horizon',
  value_chain: 'chaîne de valeur', stakeholders: 'parties prenantes', rationale: 'justification',
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

interface Props {
  /** Nouvelle valeur à chaque modification de la matrice : recharge l'état de la validation. */
  issues: unknown;
  issueCount: number;
  /** Enjeux matériels dont la documentation est incomplète (information, ne bloque pas). */
  incompleteMaterial: number;
  defaultName?: string;
}

export default function ValidationCard({ issues, issueCount, incompleteMaterial, defaultName = '' }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [showChanges, setShowChanges] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Summary[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ validator_name: defaultName, validator_role: '', comment: '', attestation: false });

  const load = useCallback(async () => {
    try { setStatus((await api.get('/materiality/validations/status')).data); } catch { setStatus(null); }
  }, []);
  useEffect(() => { load(); }, [load, issues]);

  const openHistory = async () => {
    setShowHistory(true);
    try { setHistory((await api.get('/materiality/validations')).data.items || []); } catch { toast.error("Impossible de charger l'historique."); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/materiality/validations', { ...form, validator_name: form.validator_name || undefined, comment: form.comment || undefined });
      toast.success('Matrice validée.');
      setShowForm(false);
      setForm(f => ({ ...f, comment: '', attestation: false }));
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'La validation a échoué.');
    } finally { setSubmitting(false); }
  };

  // Copie figée téléchargeable : ce que la direction a réellement validé, avec l'empreinte pour contrôle.
  const download = async (s: Summary) => {
    try {
      const { snapshot } = (await api.get(`/materiality/validations/${s.id}`)).data as { snapshot: Record<string, any>[] };
      const meta = [
        ['Validation', `version ${s.version}`], ['Date', fmtDate(s.validated_at)], ['Valideur', `${s.validator_name} — ${s.validator_role}`],
        ['Empreinte SHA-256', s.snapshot_hash], ['Commentaire', s.comment || ''],
      ].map(r => r.map(esc).join(',')).join('\n');
      const head = ['Enjeu', 'Pilier', 'Impact financier (0-100)', 'Impact ESG (0-100)', 'Matériel', 'Sujet ESRS', 'Type IRO', 'Horizon', 'Chaîne de valeur', 'Parties prenantes', 'Justification'].map(esc).join(',');
      const rows = snapshot.map(r => [
        r.name, r.category, r.financial_impact, r.esg_impact, r.is_material ? 'oui' : 'non', r.esrs_topic, r.iro_type,
        r.time_horizon ? HORIZON_LABELS[r.time_horizon] : '', r.value_chain ? VALUE_CHAIN_LABELS[r.value_chain] : '', r.stakeholders, r.rationale,
      ].map(esc).join(',')).join('\n');
      const blob = new Blob(['﻿' + meta + '\n\n' + head + '\n' + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `matrice-validee-v${s.version}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Téléchargement impossible.'); }
  };

  const last = status?.last;
  const changes = status?.changes;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-emerald-50 rounded-lg"><ShieldCheck className="h-4 w-4 text-emerald-600" /></div>
        <h3 className="text-sm font-bold text-gray-900">Validation par la direction</h3>
      </div>

      {!last && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          La matrice n'a pas encore été validée. La CSRD attend une validation datée de l'évaluation par la direction.
        </p>
      )}
      {last && status?.up_to_date && (
        <p className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>Validée le {fmtDate(last.validated_at)} par {last.validator_name} ({last.validator_role}), version {last.version}.</span>
        </p>
      )}
      {last && changes && !status?.up_to_date && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <p>
            Modifiée depuis la validation du {fmtDate(last.validated_at)} (version {last.version}) : {changes.total} changement{changes.total > 1 ? 's' : ''}.{' '}
            <button type="button" className="font-semibold underline" onClick={() => setShowChanges(v => !v)}>{showChanges ? 'Masquer' : 'Voir'}</button>
          </p>
          {showChanges && (
            <ul className="mt-2 space-y-1 list-disc pl-4">
              {changes.added.map(c => <li key={`a${c.name}`}>Ajouté : {c.name}</li>)}
              {changes.removed.map(c => <li key={`r${c.name}`}>Supprimé : {c.name}</li>)}
              {changes.modified.map(c => <li key={`m${c.name}`}>{c.name} : {c.fields.map(f => FIELD_LABELS[f] || f).join(', ')}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button type="button" disabled={issueCount === 0} onClick={() => setShowForm(true)}
          className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-semibold transition-colors">
          {last ? 'Valider à nouveau' : 'Valider la matrice'}
        </button>
        <button type="button" onClick={openHistory} className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" /> Historique
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" role="dialog" aria-modal="true" aria-label="Valider la matrice">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Valider la matrice de matérialité</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Fermer" className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">Une copie figée des {issueCount} enjeux est enregistrée avec la date, votre nom et une empreinte. Elle ne pourra plus être modifiée.</p>
              {incompleteMaterial > 0 && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {incompleteMaterial} enjeu{incompleteMaterial > 1 ? 'x' : ''} matériel{incompleteMaterial > 1 ? 's' : ''} à documenter (justification, sujet ESRS, horizon…). Vous pouvez valider quand même, mais un auditeur le verra.
                </p>
              )}
              <div>
                <label htmlFor="val-name" className="block text-sm font-medium text-gray-700 mb-1.5">Nom du valideur <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <input id="val-name" type="text" maxLength={200} placeholder="Par défaut : le nom de votre compte" value={form.validator_name} onChange={e => setForm({ ...form, validator_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500" disabled={submitting} />
              </div>
              <div>
                <label htmlFor="val-role" className="block text-sm font-medium text-gray-700 mb-1.5">Fonction</label>
                <input id="val-role" type="text" required maxLength={200} value={form.validator_role} onChange={e => setForm({ ...form, validator_role: e.target.value })}
                  placeholder="Direction générale, comité de direction, conseil d'administration…"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500" disabled={submitting} />
              </div>
              <div>
                <label htmlFor="val-comment" className="block text-sm font-medium text-gray-700 mb-1.5">Commentaire <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <textarea id="val-comment" rows={2} maxLength={2000} value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-emerald-500" disabled={submitting} />
              </div>
              <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.attestation} onChange={e => setForm({ ...form, attestation: e.target.checked })} className="mt-1 rounded border-gray-300 text-emerald-600" />
                J'atteste avoir examiné cette matrice et la valider au nom de l'entreprise.
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={submitting || !form.attestation || !form.validator_role.trim()}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold">
                  {submitting ? 'Validation…' : 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" role="dialog" aria-modal="true" aria-label="Historique des validations">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Historique des validations</h2>
              <button type="button" onClick={() => setShowHistory(false)} aria-label="Fermer" className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-3">
              {history.length === 0 && <p className="text-sm text-gray-500">Aucune validation pour le moment.</p>}
              {history.map(h => (
                <div key={h.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Version {h.version} · {fmtDate(h.validated_at)}</p>
                      <p className="text-xs text-gray-600">{h.validator_name} — {h.validator_role}</p>
                      <p className="text-xs text-gray-500 mt-1">{h.issue_count} enjeux dont {h.material_count} matériels</p>
                      {h.comment && <p className="text-xs text-gray-600 mt-1 italic">« {h.comment} »</p>}
                      <p className="text-[10px] text-gray-400 mt-1 font-mono" title={h.snapshot_hash}>Empreinte {h.snapshot_hash.slice(0, 16)}…</p>
                    </div>
                    <button type="button" onClick={() => download(h)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 whitespace-nowrap">Télécharger</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
