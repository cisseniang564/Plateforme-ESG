/**
 * Public Stakeholder Survey — token-based, no auth.
 *
 * External stakeholders (employees, customers, suppliers, investors) land
 * here via a shared public token or a personalized invitation token. They
 * rate ESRS topics on two axes (impact + financial materiality) and can
 * leave free-text feedback. Submissions feed the tenant's double-materiality
 * matrix (ESRS 2 SBM-3).
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Users, Send, CheckCircle, AlertCircle, Leaf, Heart, Shield, Loader2,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation, Trans } from 'react-i18next';
import type { TFunction } from 'i18next';

// ─── Constants ────────────────────────────────────────────────────────────────

const getTopicLabels = (t: TFunction): Record<string, { label: string; pillar: 'E' | 'S' | 'G' }> => ({
  E1: { label: t('survey.topic.E1', 'Changement climatique'),                  pillar: 'E' },
  E2: { label: t('survey.topic.E2', 'Pollution'),                              pillar: 'E' },
  E3: { label: t('survey.topic.E3', 'Eau et ressources marines'),              pillar: 'E' },
  E4: { label: t('survey.topic.E4', 'Biodiversité et écosystèmes'),            pillar: 'E' },
  E5: { label: t('survey.topic.E5', 'Ressources et économie circulaire'),      pillar: 'E' },
  S1: { label: t('survey.topic.S1', 'Effectifs propres (salariés)'),           pillar: 'S' },
  S2: { label: t('survey.topic.S2', 'Travailleurs de la chaîne de valeur'),    pillar: 'S' },
  S3: { label: t('survey.topic.S3', 'Communautés affectées'),                  pillar: 'S' },
  S4: { label: t('survey.topic.S4', 'Consommateurs et utilisateurs finaux'),   pillar: 'S' },
  G1: { label: t('survey.topic.G1', 'Conduite des affaires (éthique, anti-corruption)'), pillar: 'G' },
});

const PILLAR_STYLE = {
  E: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: Leaf },
  S: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    icon: Heart },
  G: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: Shield },
};

const getCategories = (t: TFunction) => [
  { code: 'employee',  label: t('survey.cat.employee',  'Salarié / collaborateur')    },
  { code: 'client',    label: t('survey.cat.client',    'Client / consommateur')      },
  { code: 'supplier',  label: t('survey.cat.supplier',  'Fournisseur / partenaire')   },
  { code: 'investor',  label: t('survey.cat.investor',  'Investisseur / actionnaire') },
  { code: 'ngo',       label: t('survey.cat.ngo',       'ONG / société civile')       },
  { code: 'regulator', label: t('survey.cat.regulator', 'Régulateur / pouvoir public')},
  { code: 'other',     label: t('survey.cat.other',     'Autre')                      },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface SurveyMeta {
  id: string;
  name: string;
  description: string | null;
  topics: string[];
  template_type: string | null;
  expires_at: string | null;
  invitation: {
    id: string;
    name: string | null;
    email: string;
    organization: string | null;
    category: string;
    already_responded: boolean;
  } | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PublicSurvey() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const TOPIC_LABELS = getTopicLabels(t);
  const CATEGORIES = getCategories(t);
  const [survey, setSurvey] = useState<SurveyMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [respName, setRespName]               = useState('');
  const [respEmail, setRespEmail]             = useState('');
  const [respOrg, setRespOrg]                 = useState('');
  const [respCategory, setRespCategory]       = useState('other');
  const [ratings, setRatings]                 = useState<Record<string, { impact?: number; financial?: number }>>({});
  const [freeText, setFreeText]               = useState('');
  const [submitting, setSubmitting]           = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('survey.err.invalidLink', 'Lien invalide.'));
      setLoading(false);
      return;
    }
    axios
      .get(`/api/v1/stakeholder-surveys/public/${token}`)
      .then(r => {
        setSurvey(r.data);
        if (r.data.invitation) {
          setRespName(r.data.invitation.name || '');
          setRespEmail(r.data.invitation.email || '');
          setRespOrg(r.data.invitation.organization || '');
          setRespCategory(r.data.invitation.category || 'other');
          if (r.data.invitation.already_responded) {
            setError(t('survey.err.alreadyResponded', 'Vous avez déjà répondu à ce sondage. Merci pour votre contribution !'));
          }
        }
      })
      .catch(err => {
        setError(err?.response?.data?.detail || t('survey.err.loadFail', 'Impossible de charger le sondage.'));
      })
      .finally(() => setLoading(false));
  }, [token]);

  const setRating = (topic: string, axis: 'impact' | 'financial', value: number) => {
    setRatings(prev => ({
      ...prev,
      [topic]: { ...prev[topic], [axis]: value },
    }));
  };

  const submit = async () => {
    if (!survey || !token) return;
    // Minimal validation: at least one rating
    if (Object.keys(ratings).length === 0) {
      toast.error(t('survey.err.atLeastOne', 'Merci de noter au moins un thème.'));
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`/api/v1/stakeholder-surveys/public/${token}/respond`, {
        respondent_name: respName.trim() || undefined,
        respondent_email: respEmail.trim() || undefined,
        respondent_organization: respOrg.trim() || undefined,
        respondent_category: respCategory,
        ratings,
        free_text: freeText.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('survey.err.submitFail', "Erreur lors de l'envoi."));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render states ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t('survey.inaccessible.title', 'Sondage inaccessible')}</h1>
          <p className="text-sm text-gray-600">{error || t('survey.inaccessible.fallback', "Ce lien n'est pas valide.")}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="h-9 w-9 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('survey.done.title', 'Merci pour votre contribution')}</h1>
          <p className="text-sm text-gray-600 mb-6">
            {t('survey.done.body', "Vos réponses ont été enregistrées. Elles seront intégrées à l'analyse de matérialité de durabilité de l'organisation conformément aux exigences ESRS 2 (SBM-2 et SBM-3).")}
          </p>
          <p className="text-xs text-gray-400">
            {t('survey.done.close', 'Vous pouvez fermer cette page.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <header className="bg-gradient-to-br from-indigo-700 via-blue-700 to-slate-800 text-white">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Users size={14} />
            {t('survey.badge', 'Sondage parties prenantes · Double matérialité ESRS')}
          </div>
          <h1 className="text-3xl font-bold mb-3">{survey.name}</h1>
          {survey.description && (
            <p className="text-blue-100 leading-relaxed">{survey.description}</p>
          )}
        </div>
      </header>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {/* Instructions */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-indigo-100">
          <h2 className="text-base font-semibold text-gray-900 mb-2">{t('survey.how.title', 'Comment répondre')}</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            {t('survey.how.intro', 'Pour chaque thème ci-dessous, évaluez sur une échelle de 1 à 5 :')}
          </p>
          <ul className="text-sm text-gray-600 mt-2 space-y-1">
            <li><Trans i18nKey="survey.how.impact"><strong>Impact</strong> : importance des conséquences de l'organisation sur la société/environnement.</Trans></li>
            <li><Trans i18nKey="survey.how.financial"><strong>Matérialité financière</strong> : impact potentiel sur les performances financières de l'organisation.</Trans></li>
          </ul>
          <p className="text-xs text-gray-400 mt-3">
            {t('survey.how.confidential', "Vos réponses sont confidentielles et utilisées uniquement pour l'analyse agrégée.")}
          </p>
        </div>

        {/* Identity */}
        <section className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{t('survey.identity.title', 'À propos de vous (optionnel)')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder={t('survey.identity.namePh', 'Nom (facultatif)')}
              value={respName}
              onChange={e => setRespName(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={!!survey.invitation?.name}
            />
            <input
              type="email"
              placeholder={t('survey.identity.emailPh', 'Email (facultatif)')}
              value={respEmail}
              onChange={e => setRespEmail(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={!!survey.invitation?.email}
            />
            <input
              type="text"
              placeholder={t('survey.identity.orgPh', 'Organisation')}
              value={respOrg}
              onChange={e => setRespOrg(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={!!survey.invitation?.organization}
            />
            <select
              value={respCategory}
              onChange={e => setRespCategory(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              disabled={!!survey.invitation?.category}
            >
              {CATEGORIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Topics */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">
            {t('survey.topics.title', 'Évaluation des thèmes ESRS ({{count}})', { count: survey.topics.length })}
          </h2>
          {survey.topics.map(code => {
            const topic = TOPIC_LABELS[code];
            if (!topic) return null;
            const cfg = PILLAR_STYLE[topic.pillar];
            const Icon = cfg.icon;
            const r = ratings[code] || {};
            return (
              <div key={code} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${cfg.bg} ${cfg.border} border flex-shrink-0`}>
                    <Icon size={18} className={cfg.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm">{topic.label}</h3>
                    <p className="text-xs text-gray-400 font-mono">{code}</p>
                  </div>
                </div>

                <RatingRow
                  axisLabel={t('survey.axis.impact', 'Impact (sur la société / environnement)')}
                  value={r.impact}
                  onChange={v => setRating(code, 'impact', v)}
                  colorClass={cfg.text}
                />
                <div className="mt-3" />
                <RatingRow
                  axisLabel={t('survey.axis.financial', "Matérialité financière (pour l'organisation)")}
                  value={r.financial}
                  onChange={v => setRating(code, 'financial', v)}
                  colorClass={cfg.text}
                />
              </div>
            );
          })}
        </section>

        {/* Free text */}
        <section className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <label className="block text-base font-semibold text-gray-900 mb-2">
            {t('survey.freeText.label', 'Commentaire libre (optionnel)')}
          </label>
          <textarea
            rows={4}
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            placeholder={t('survey.freeText.ph', 'Quels autres enjeux ESG vous semblent prioritaires ? Avez-vous des recommandations spécifiques ?')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </section>

        {/* Submit */}
        <button
          onClick={submit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors disabled:opacity-60 shadow-md"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {t('survey.submit', 'Envoyer mes réponses')}
        </button>
        <p className="text-xs text-gray-400 text-center pb-8">
          {t('survey.consent', "En soumettant ce sondage, vous acceptez que vos réponses agrégées soient utilisées pour l'analyse de matérialité de l'organisation. Aucune donnée personnelle n'est partagée publiquement.")}
        </p>
      </main>
    </div>
  );
}

// ─── Sub-component: 1-to-5 radio row ─────────────────────────────────────────

function RatingRow({
  axisLabel,
  value,
  onChange,
  colorClass = 'text-indigo-600',
}: {
  axisLabel: string;
  value?: number;
  onChange: (v: number) => void;
  colorClass?: string;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-2">{axisLabel}</p>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map(n => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={
                'py-2 rounded-lg border text-sm font-semibold transition-all ' +
                (selected
                  ? `bg-indigo-600 border-indigo-600 text-white shadow-md`
                  : `bg-white border-gray-200 ${colorClass} hover:border-indigo-300 hover:bg-indigo-50`)
              }
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{t('survey.scale.low', 'Faible')}</span>
        <span>{t('survey.scale.high', 'Élevé')}</span>
      </div>
    </div>
  );
}
