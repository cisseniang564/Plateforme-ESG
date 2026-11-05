import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ClipboardList, Copy, Download, Leaf, Mail, Pencil, Scale, Send, Trash2, Users, X, Check } from 'lucide-react';
import AssessmentForm from './AssessmentForm';
import { RISK_CFG, STATUS_CFG, Supplier, downloadCsv, hasScore, portalUrl } from './supplyChainModel';

interface Props {
  supplier: Supplier;
  busy: boolean;
  onClose: () => void;
  onSend: (s: Supplier) => void;
  onEdit: (s: Supplier) => void;
  onDelete: (s: Supplier) => void;
  onAssessed: (raw: any) => void;
}

const DIMS = [
  { key: 'env', label: 'Environnement', icon: Leaf, color: '#16a34a' },
  { key: 'social', label: 'Social', icon: Users, color: '#2563eb' },
  { key: 'gov', label: 'Gouvernance', icon: Scale, color: '#7c3aed' },
] as const;

export default function SupplierDrawer({ supplier, busy, onClose, onSend, onEdit, onDelete, onAssessed }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'view' | 'assess'>('view');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const evaluated = hasScore(supplier);
  const risk = RISK_CFG[supplier.risk];
  const status = STATUS_CFG[supplier.status];
  const StatusIcon = status.icon;

  const copyLink = async () => {
    if (!supplier.portalToken) return;
    try {
      await navigator.clipboard.writeText(portalUrl(supplier.portalToken));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* presse-papiers indisponible */ }
  };

  const exportSheet = () =>
    downloadCsv(`fiche-${supplier.name.replace(/\s+/g, '-')}.csv`, [
      ['Nom', supplier.name], ['Pays', supplier.country], ['Catégorie', supplier.category],
      ['Achats (k€)', supplier.spend], ['Effectif', supplier.employees],
      ['Statut', supplier.status],
      ['Risque ESG', evaluated ? supplier.risk : 'Non évalué'],
      ['Score global', evaluated ? supplier.globalScore : ''],
      ['Score Environnement', evaluated ? supplier.scores.env : ''],
      ['Score Social', evaluated ? supplier.scores.social : ''],
      ['Score Gouvernance', evaluated ? supplier.scores.gov : ''],
      ['Dernière évaluation', supplier.lastEval ?? ''], ['Email contact', supplier.contactEmail],
    ]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={supplier.name} className="w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{supplier.name}</h2>
            <p className="text-xs text-gray-400">{[supplier.country, supplier.category].filter(Boolean).join(' · ')}</p>
          </div>
          <button onClick={onClose} aria-label={t('common.close', 'Fermer')} className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          {mode === 'assess' ? (
            <AssessmentForm supplier={supplier} onCancel={() => setMode('view')} onSaved={raw => { onAssessed(raw); setMode('view'); }} />
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${status.bg} ${status.color}`}>
                  <StatusIcon className="h-3.5 w-3.5" />{supplier.status}
                </span>
                {evaluated && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${risk.bg} ${risk.color} ${risk.border}`}>
                    <span className={`w-2 h-2 rounded-full ${risk.dot}`} />{t('supplychain.drawerRisk', 'Risque')} {supplier.risk}
                  </span>
                )}
                {supplier.lastEval && (
                  <span className="ml-auto text-xs text-gray-400">{t('supplychain.drawerLastEval', 'Évalué le')} {new Date(supplier.lastEval).toLocaleDateString('fr-FR')}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t('supplychain.drawerSpend', 'Achats annuels'), val: supplier.spend > 0 ? `${supplier.spend.toLocaleString('fr-FR')} k€` : '—' },
                  { label: t('supplychain.drawerHeadcount', 'Effectif'), val: supplier.employees > 0 ? supplier.employees.toLocaleString('fr-FR') : '—' },
                ].map(i => (
                  <div key={i.label} className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-400 mb-0.5">{i.label}</div>
                    <div className="text-sm font-bold text-gray-900">{i.val}</div>
                  </div>
                ))}
              </div>

              {evaluated ? (
                <div className="space-y-4">
                  <div className="bg-slate-900 rounded-2xl p-5 text-center text-white">
                    <div className="text-5xl font-extrabold">{supplier.globalScore}<span className="text-xl text-slate-400">/100</span></div>
                    <div className="text-sm text-slate-300 mt-1">{t('supplychain.drawerGlobalScore', 'Score ESG global')}</div>
                  </div>
                  {DIMS.map(d => (
                    <div key={d.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700 flex items-center gap-1.5"><d.icon className="h-3.5 w-3.5" style={{ color: d.color }} />{d.label}</span>
                        <span className="text-sm font-bold" style={{ color: d.color }}>{supplier.scores[d.key]}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-2 rounded-full" style={{ width: `${supplier.scores[d.key]}%`, backgroundColor: d.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center">
                  <p className="text-sm font-semibold text-gray-800">{t('supplychain.notEvaluatedTitle', "Pas encore d'évaluation")}</p>
                  <p className="text-xs text-gray-500 mt-1">{t('supplychain.notEvaluatedDesc', "Envoyez le questionnaire au fournisseur ou saisissez ses réponses vous-même.")}</p>
                </div>
              )}

              {supplier.flags.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-red-700 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" />{t('supplychain.drawerAlerts', 'Alertes')}</h3>
                  {supplier.flags.map((f, i) => <div key={i} className="p-2.5 bg-red-50 rounded-lg border border-red-200 text-sm text-red-700">{f}</div>)}
                </div>
              )}

              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-gray-900">{t('supplychain.drawerQuestionnaire', 'Questionnaire ESG')}</h3>
                <p className="text-sm text-gray-600">
                  {supplier.completed
                    ? t('supplychain.qStateDone', 'Réponses reçues.')
                    : supplier.linkActive
                      ? t('supplychain.qStateWaiting', 'Lien envoyé, en attente de réponse.')
                      : t('supplychain.qStateNone', 'Aucun questionnaire en attente.')}
                </p>
                {supplier.contactEmail
                  ? <div className="flex items-center gap-2 text-xs text-gray-500"><Mail className="h-3.5 w-3.5" />{supplier.contactEmail}</div>
                  : <p className="text-xs text-amber-600">{t('supplychain.noEmail', "Aucune adresse email : le lien sera généré mais non envoyé.")}</p>}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => onSend(supplier)} disabled={busy}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold">
                    <Send className="h-4 w-4" />
                    {supplier.linkActive ? t('supplychain.resend', 'Renvoyer') : t('supplychain.drawerSendQuestionnaire', 'Envoyer le questionnaire')}
                  </button>
                  {supplier.linkActive && supplier.portalToken && (
                    <button onClick={copyLink} className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold">
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      {copied ? t('supplychain.copied', 'Lien copié') : t('supplychain.copyLink', 'Copier le lien')}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setMode('assess')} className="col-span-2 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm">
                  <ClipboardList className="h-4 w-4" />
                  {supplier.completed ? t('supplychain.updateAssessment', "Mettre à jour l'évaluation") : t('supplychain.enterAssessment', "Saisir l'évaluation")}
                </button>
                <button onClick={() => onEdit(supplier)} className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50"><Pencil className="h-4 w-4" />{t('common.edit', 'Modifier')}</button>
                <button onClick={exportSheet} className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50"><Download className="h-4 w-4" />{t('supplychain.exportSheet', 'Fiche CSV')}</button>
              </div>

              <div className="pt-2 border-t border-gray-100">
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 flex-1">{t('supplychain.confirmDelete', 'Supprimer définitivement ce fournisseur ?')}</span>
                    <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">{t('common.cancel', 'Annuler')}</button>
                    <button onClick={() => onDelete(supplier)} disabled={busy} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{t('common.delete', 'Supprimer')}</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" />{t('supplychain.deleteSupplier', 'Supprimer ce fournisseur')}</button>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
