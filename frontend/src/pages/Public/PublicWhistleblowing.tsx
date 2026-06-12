/**
 * PublicWhistleblowing — Formulaire public de signalement anonyme.
 *
 * Accessible sans auth à /signalement?company={tenant_slug}
 * Conforme Loi Sapin 2 (Art. 8 — Décret 2017-564) + Loi 2017-399.
 *
 * 2 modes:
 *   - submit  : créer un nouveau signalement (anonyme par défaut)
 *   - status  : consulter l'état d'un dossier via son case_number
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Shield, AlertCircle, CheckCircle2, Loader2, Lock, Mail,
  FileText, ArrowRight, Eye, EyeOff,
} from 'lucide-react';
import axios from 'axios';
import { useTranslation, Trans } from 'react-i18next';
import type { TFunction } from 'i18next';

const API_BASE = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');

const getCategories = (t: TFunction) => [
  { id: 'human_rights', label: t('wb.cat.human_rights', 'Droits humains (travail forcé, discrimination, etc.)') },
  { id: 'health_safety', label: t('wb.cat.health_safety', 'Santé & sécurité des personnes') },
  { id: 'environment', label: t('wb.cat.environment', "Atteintes graves à l'environnement") },
  { id: 'labor_rights', label: t('wb.cat.labor_rights', 'Droits du travail (conditions, salaires)') },
  { id: 'corruption', label: t('wb.cat.corruption', "Corruption / trafic d'influence (Sapin 2)") },
  { id: 'data_privacy', label: t('wb.cat.data_privacy', 'Vie privée / protection des données') },
  { id: 'freedoms', label: t('wb.cat.freedoms', 'Libertés fondamentales') },
  { id: 'other', label: t('wb.cat.other', 'Autre') },
];

export default function PublicWhistleblowing() {
  const [params] = useSearchParams();
  const tenantSlug = params.get('company') || params.get('tenant') || '';
  const { t } = useTranslation();
  const CATEGORIES = getCategories(t);
  const [mode, setMode] = useState<'submit' | 'status'>('submit');

  // Submit form state
  const [identify, setIdentify] = useState(false);
  const [form, setForm] = useState({
    category: 'human_rights',
    severity: 'medium',
    subject: '',
    description: '',
    country: '',
    location: '',
    organization_concerned: '',
    reporter_name: '',
    reporter_email: '',
    reporter_role: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ case_number: string; message: string } | null>(null);
  const [error, setError] = useState('');

  // Status lookup state
  const [caseNumber, setCaseNumber] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusData, setStatusData] = useState<any>(null);
  const [statusError, setStatusError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantSlug) { setError(t('wb.err.invalidLink', 'Lien invalide — identifiant entreprise manquant.')); return; }
    if (!form.subject.trim() || form.description.length < 10) {
      setError(t('wb.err.required', 'Le sujet et une description (10 caractères minimum) sont requis.'));
      return;
    }
    setSubmitting(true); setError('');
    try {
      const payload: any = {
        tenant_slug: tenantSlug,
        category: form.category,
        severity: form.severity,
        subject: form.subject.trim(),
        description: form.description.trim(),
      };
      if (form.country) payload.country = form.country;
      if (form.location) payload.location = form.location;
      if (form.organization_concerned) payload.organization_concerned = form.organization_concerned;
      if (identify && form.reporter_email) {
        payload.reporter_name = form.reporter_name || null;
        payload.reporter_email = form.reporter_email;
        payload.reporter_role = form.reporter_role || null;
      }
      const res = await axios.post(`${API_BASE}/vigilance-public/alerts`, payload);
      setSuccess(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || t('wb.err.submitFail', "Erreur lors de l'envoi. Réessayez."));
    } finally {
      setSubmitting(false);
    }
  };

  const lookupStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseNumber.trim()) return;
    setStatusLoading(true); setStatusError(''); setStatusData(null);
    try {
      const res = await axios.get(
        `${API_BASE}/vigilance-public/alerts/case/${caseNumber.trim().toUpperCase()}`,
        { params: { tenant_slug: tenantSlug } }
      );
      setStatusData(res.data);
    } catch (err: any) {
      setStatusError(t('wb.status.notFound', "Dossier introuvable. Vérifiez le numéro et l'identifiant entreprise."));
    } finally {
      setStatusLoading(false);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{t('wb.success.title', 'Signalement enregistré')}</h1>
          <p className="text-gray-600 mb-6">{success.message}</p>
          <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl mb-6">
            <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider mb-1">
              {t('wb.success.caseLabel', 'Numéro de dossier')}
            </p>
            <p className="text-3xl font-extrabold text-emerald-900 font-mono">{success.case_number}</p>
            <p className="text-xs text-emerald-600 mt-2">
              {t('wb.success.keepNote', "⚠ Conservez ce numéro précieusement — il vous permet de suivre l'avancement de votre signalement sans révéler votre identité.")}
            </p>
          </div>
          <button
            onClick={() => {
              setSuccess(null);
              setForm({
                category: 'human_rights', severity: 'medium', subject: '', description: '',
                country: '', location: '', organization_concerned: '',
                reporter_name: '', reporter_email: '', reporter_role: '',
              });
              setMode('status');
              setCaseNumber(success.case_number);
            }}
            className="text-sm text-emerald-700 hover:text-emerald-800 font-semibold"
          >
            {t('wb.success.track', 'Suivre ce signalement →')}
          </button>
        </div>
      </div>
    );
  }

  // ── Status view ──────────────────────────────────────────────────────────
  if (mode === 'status') {
    const statusLabels: Record<string, string> = {
      new: t('wb.statusLabel.new', 'Nouvelle — reçue'),
      under_review: t('wb.statusLabel.under_review', 'En examen'),
      investigating: t('wb.statusLabel.investigating', 'Enquête en cours'),
      action_taken: t('wb.statusLabel.action_taken', 'Action prise'),
      closed: t('wb.statusLabel.closed', 'Clôturée'),
      dismissed: t('wb.statusLabel.dismissed', 'Écartée'),
    };
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 py-10 px-6">
        <div className="max-w-xl mx-auto">
          <Header tenantSlug={tenantSlug} />
          <div className="bg-white rounded-3xl shadow-xl p-8 mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{t('wb.track.title', 'Suivre un dossier')}</h2>
              <button
                onClick={() => { setMode('submit'); setStatusData(null); }}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
              >
                {t('wb.track.new', '← Nouveau signalement')}
              </button>
            </div>
            <form onSubmit={lookupStatus} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('wb.track.caseLabel', 'Numéro de dossier')}</label>
                <input
                  value={caseNumber}
                  onChange={e => setCaseNumber(e.target.value.toUpperCase())}
                  placeholder="VIG-2026-0042"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono uppercase focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={statusLoading || !caseNumber}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {statusLoading ? t('wb.track.searching', 'Recherche…') : t('wb.track.lookup', 'Consulter')}
              </button>
            </form>
            {statusError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {statusError}
              </div>
            )}
            {statusData && (
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-gray-500">{statusData.case_number}</span>
                  <span className="text-xs font-bold uppercase px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded">
                    {statusLabels[statusData.status] || statusData.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">{statusData.subject}</h3>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>{t('wb.track.receivedOn', 'Reçu le {{date}}', { date: new Date(statusData.created_at).toLocaleDateString('fr-FR') })}</p>
                  {statusData.has_been_assigned && <p>{t('wb.track.assigned', '✓ Assigné à un référent')}</p>}
                  {statusData.closed_at && (
                    <p>{t('wb.track.closedOn', 'Clôturé le {{date}}', { date: new Date(statusData.closed_at).toLocaleDateString('fr-FR') })}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Submit form ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 py-10 px-6">
      <div className="max-w-2xl mx-auto">
        <Header tenantSlug={tenantSlug} />

        <div className="bg-white rounded-3xl shadow-xl p-8 mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900">{t('wb.submit.title', 'Effectuer un signalement')}</h2>
            <button
              onClick={() => setMode('status')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
            >
              {t('wb.submit.trackExisting', 'Suivre un dossier existant →')}
            </button>
          </div>

          {!tenantSlug && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <Trans i18nKey="wb.submit.incompleteLink">
                  Lien incomplet — l'identifiant entreprise est manquant.
                  Demandez à votre interlocuteur le lien complet (avec <code>?company=...</code>).
                </Trans>
              </span>
            </div>
          )}

          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-900 flex items-start gap-2">
            <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">{t('wb.submit.confidentialTitle', 'Signalement confidentiel et anonyme par défaut')}</p>
              <p className="text-xs leading-relaxed">
                {t('wb.submit.confidentialBody', "Vous êtes protégé(e) par la Loi Sapin 2 (Art. 8) et la Loi 2017-399 (devoir de vigilance). Aucune information personnelle n'est requise.")}
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">{t('wb.submit.categoryLabel', 'Catégorie du signalement *')}</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white"
              >
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">{t('wb.submit.severityLabel', 'Gravité perçue')}</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high', 'critical'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, severity: s })}
                    className={`flex-1 py-2 text-sm font-semibold border-2 rounded-lg transition-colors ${
                      form.severity === s
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {s === 'low' ? t('wb.severity.low', 'Faible') : s === 'medium' ? t('wb.severity.medium', 'Moyenne') : s === 'high' ? t('wb.severity.high', 'Haute') : t('wb.severity.critical', 'Critique')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">{t('wb.submit.subjectLabel', 'Sujet *')}</label>
              <input
                required
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder={t('wb.submit.subjectPh', 'Résumé en une phrase')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">{t('wb.submit.descLabel', 'Description détaillée *')}</label>
              <textarea
                required
                rows={6}
                minLength={10}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder={t('wb.submit.descPh', "Décrivez les faits avec précision : qui, quand, où, comment. Évitez de mentionner d'autres personnes par leur nom si vous n'êtes pas certain(e) des faits.")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">{t('wb.submit.charCount', '{{n}} caractères', { n: form.description.length })}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('wb.submit.countryLabel', 'Pays (ISO 2 lettres)')}</label>
                <input
                  value={form.country}
                  onChange={e => setForm({ ...form, country: e.target.value.toUpperCase().slice(0, 2) })}
                  placeholder="FR"
                  maxLength={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('wb.submit.locationLabel', 'Lieu / site')}</label>
                <input
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder={t('wb.submit.locationPh', 'Usine X, Bureau Y…')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                <Trans i18nKey="wb.submit.orgLabel">Organisation concernée <span className="text-gray-400 font-normal">(filiale, fournisseur, sous-traitant…)</span></Trans>
              </label>
              <input
                value={form.organization_concerned}
                onChange={e => setForm({ ...form, organization_concerned: e.target.value })}
                placeholder={t('wb.submit.optional', 'Optionnel')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>

            {/* Identification optionnelle */}
            <div className="pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIdentify(!identify)}
                className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
              >
                {identify ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {identify ? t('wb.submit.stayAnon', 'Rester anonyme') : t('wb.submit.identify', 'Me faire connaître pour un suivi')}
              </button>
              {identify && (
                <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder={t('wb.submit.namePh', 'Prénom Nom')}
                      value={form.reporter_name}
                      onChange={e => setForm({ ...form, reporter_name: e.target.value })}
                      className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                    />
                    <input
                      type="email"
                      placeholder={t('wb.submit.emailPh', 'Email de contact')}
                      value={form.reporter_email}
                      onChange={e => setForm({ ...form, reporter_email: e.target.value })}
                      className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                    />
                  </div>
                  <select
                    value={form.reporter_role}
                    onChange={e => setForm({ ...form, reporter_role: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white"
                  >
                    <option value="">{t('wb.role.placeholder', 'Rôle (optionnel)')}</option>
                    <option value="employee">{t('wb.role.employee', 'Salarié(e)')}</option>
                    <option value="former_employee">{t('wb.role.former_employee', 'Ancien(ne) salarié(e)')}</option>
                    <option value="supplier">{t('wb.role.supplier', 'Fournisseur / sous-traitant')}</option>
                    <option value="community">{t('wb.role.community', 'Riverain / communauté locale')}</option>
                    <option value="other">{t('wb.role.other', 'Autre')}</option>
                  </select>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !tenantSlug}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('wb.submit.send', 'Envoyer le signalement')}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>

            <p className="text-[11px] text-gray-400 text-center leading-relaxed pt-2">
              {t('wb.submit.gdprNote', "Conformément au RGPD, vos données sont traitées dans le seul but du traitement de votre signalement. Aucun cookie de suivi n'est déposé. Les signalements de mauvaise foi sont passibles de sanctions pénales (Art. 226-10 Code pénal).")}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Header({ tenantSlug }: { tenantSlug: string }) {
  const { t } = useTranslation();
  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold mb-3">
        <Shield className="w-3.5 h-3.5" />
        {t('wb.header.badge', "Canal d'alerte officiel")}
      </div>
      <h1 className="text-3xl font-extrabold text-gray-900">{t('wb.header.title', 'Signalement éthique')}</h1>
      {tenantSlug && (
        <p className="text-sm text-gray-500 mt-1 font-mono">{tenantSlug}</p>
      )}
      <p className="text-xs text-gray-400 mt-2 max-w-md mx-auto">
        {t('wb.header.legal', 'Loi Sapin 2 · Art. 8 · Décret 2017-564 · Loi 2017-399 · Devoir de vigilance')}
      </p>
    </div>
  );
}
