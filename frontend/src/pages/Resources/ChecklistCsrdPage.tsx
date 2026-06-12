/**
 * Lead magnet landing — /ressources/checklist-csrd
 * Formulaire de capture email → PDF check-list 47 indicateurs ESRS livrée par email.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download, CheckCircle2, FileText, Mail, AlertCircle, Sparkles,
  Loader2,
} from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { LogoBrand } from '@/components/common/Logo';
import { usePageSeo } from '@/hooks/usePageSeo';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function ChecklistCsrdPage() {
  const { t } = useTranslation();
  const [email, setEmail]         = useState('');
  const [firstName, setFirstName] = useState('');
  const [company, setCompany]     = useState('');
  const [consent, setConsent]     = useState(false);
  const [status, setStatus]       = useState<Status>('idle');
  const [errorMsg, setErrorMsg]   = useState('');

  const url = 'https://greenconnect.cloud/ressources/checklist-csrd';
  const img = 'https://greenconnect.cloud/api/v1/og/checklist-csrd.png';

  usePageSeo({
    id: 'checklist-csrd',
    title: t('resources.checklist.seo.title', 'Check-list CSRD gratuite — 47 indicateurs ESRS · ESG Flow'),
    description: t('resources.checklist.seo.description', "Téléchargez la check-list CSRD gratuite : 47 indicateurs ESRS prioritaires classés par criticité. PDF prêt à imprimer pour démarrer votre conformité CSRD."),
    keywords: t('resources.checklist.seo.keywords', 'check-list CSRD, indicateurs ESRS, PDF gratuit, conformité CSRD, EFRAG, lead magnet'),
    url,
    ogTitle: t('resources.checklist.seo.ogTitle', 'Check-list CSRD gratuite — 47 indicateurs ESRS'),
    ogImage: img,
    ogImageAlt: t('resources.checklist.seo.ogImageAlt', 'Check-list CSRD — 47 indicateurs ESRS prioritaires (PDF gratuit)'),
    breadcrumb: [
      { name: t('resources.checklist.breadcrumb.home', 'Accueil'),     url: 'https://greenconnect.cloud/' },
      { name: t('resources.checklist.breadcrumb.resources', 'Ressources'),  url: 'https://greenconnect.cloud/resources' },
      { name: t('resources.checklist.breadcrumb.checklist', 'Check-list CSRD'), url },
    ],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !consent) {
      setErrorMsg(t('resources.checklist.form.errorRequired', "Merci de renseigner votre email et d'accepter de recevoir le PDF."));
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/v1/leads/checklist-csrd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          first_name: firstName || undefined,
          company: company || undefined,
          consent: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || t('resources.checklist.form.errorStatus', 'Erreur {{status}}', { status: res.status }));
      }
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || t('resources.checklist.form.errorGeneric', "Impossible d'envoyer pour le moment."));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" aria-label={t('resources.checklist.nav.homeAria', 'ESG Flow — Accueil')}>
            <LogoBrand size="sm" variant="dark" showTagline={false} />
          </Link>
          <Link to="/register" className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
            {t('resources.checklist.nav.freeTrial', 'Essai gratuit')} →
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid lg:grid-cols-[1fr_440px] gap-12 items-start">

        {/* ── Left : pitch ──────────────────────────────────── */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-xs font-bold mb-6">
            <FileText className="h-3.5 w-3.5" /> {t('resources.checklist.pitch.badge', 'RESSOURCE GRATUITE · PDF 7 PAGES')}
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            {t('resources.checklist.pitch.titleLine1', 'La check-list CSRD')}<br />
            <span className="text-emerald-600">{t('resources.checklist.pitch.titleLine2', 'en 47 indicateurs ESRS')}</span>
          </h1>

          <p className="text-xl text-gray-600 leading-relaxed mb-8">
            <Trans i18nKey="resources.checklist.pitch.intro">
              Le document de référence pour démarrer votre conformité CSRD <strong>sans rien oublier</strong>.
              Chaque indicateur est classé par <strong>criticité</strong> (haute / moyenne / basse) pour vous aider
              à prioriser votre collecte de données.
            </Trans>
          </p>

          {/* What's inside */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm">
            <p className="font-semibold text-gray-900 mb-4">{t('resources.checklist.inside.heading', 'Ce que vous obtenez')}</p>
            <ul className="space-y-3">
              {[
                t('resources.checklist.inside.0', 'Les 6 indicateurs transversaux ESRS 2 obligatoires'),
                t('resources.checklist.inside.1', 'Les 11 indicateurs climat ESRS E1 (scopes 1/2/3, objectifs SBTi, etc.)'),
                t('resources.checklist.inside.2', 'Les 10 indicateurs sociaux ESRS S1 (effectifs, sécurité, diversité, rémunération)'),
                t('resources.checklist.inside.3', 'Les 5 indicateurs gouvernance ESRS G1 (anti-corruption, paiement fournisseurs, lobbying)'),
                t('resources.checklist.inside.4', 'Plus E2-E5, S2-S4 pour les normes thématiques'),
                t('resources.checklist.inside.5', 'Cases à cocher imprimables — utilisable en réunion projet'),
                t('resources.checklist.inside.6', 'Conseils pratiques : par où commencer si vous avez 2 semaines'),
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-600" /> {t('resources.checklist.trust.free', '100% gratuit')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-emerald-600" /> {t('resources.checklist.trust.instant', 'Livraison instantanée par email')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {t('resources.checklist.trust.compliant', 'Conforme directive 2022/2464')}
            </span>
          </div>
        </div>

        {/* ── Right : form ──────────────────────────────────── */}
        <aside className="sticky top-20">
          {status === 'success' ? (
            <div className="bg-white rounded-2xl border-2 border-emerald-200 p-8 text-center shadow-xl">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('resources.checklist.success.title', 'Email envoyé !')}</h2>
              <p className="text-gray-600 mb-6">
                {t('resources.checklist.success.body', "Vérifiez votre boîte mail (et le dossier spam au cas où). La check-list arrive dans moins d'une minute.")}
              </p>
              <Link to="/register" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
                {t('resources.checklist.success.cta', 'Démarrer mon essai ESG Flow')} →
              </Link>
              <p className="text-xs text-gray-400 mt-6">
                <Trans i18nKey="resources.checklist.success.notReceived">
                  Pas reçu après 5 min ? <a href="mailto:support@greenconnect.cloud" className="underline">Écrivez-nous</a>.
                </Trans>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border-2 border-emerald-100 p-7 shadow-xl" noValidate>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center">
                  <Download className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{t('resources.checklist.form.title', 'Recevoir le PDF')}</h2>
                  <p className="text-xs text-gray-500">{t('resources.checklist.form.subtitle', 'Livraison instantanée par email')}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="cl-email" className="block text-sm font-semibold text-gray-700 mb-1.5">{t('resources.checklist.form.emailLabel', 'Email professionnel')} *</label>
                  <input
                    id="cl-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                    placeholder="vous@entreprise.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="cl-first" className="block text-sm font-semibold text-gray-700 mb-1.5">{t('resources.checklist.form.firstNameLabel', 'Prénom')}</label>
                    <input
                      id="cl-first"
                      type="text"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <label htmlFor="cl-company" className="block text-sm font-semibold text-gray-700 mb-1.5">{t('resources.checklist.form.companyLabel', 'Entreprise')}</label>
                    <input
                      id="cl-company"
                      type="text"
                      autoComplete="organization"
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                      placeholder="Acme SAS"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={e => setConsent(e.target.checked)}
                    required
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-gray-600 leading-relaxed">
                    {t('resources.checklist.form.consent', "J'accepte de recevoir cette ressource par email ainsi que la newsletter mensuelle ESG Flow (désabonnement en un clic).")}
                  </span>
                </label>

                {errorMsg && (
                  <div role="alert" className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />{errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm transition-colors"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      {t('resources.checklist.form.sending', 'Envoi…')}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" aria-hidden="true" />
                      {t('resources.checklist.form.submit', 'Télécharger gratuitement')}
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-gray-400 pt-1">
                  <Trans i18nKey="resources.checklist.form.privacy">
                    Vos données restent en France, hébergées chez OVH. <Link to="/privacy-policy" className="underline">Politique de confidentialité</Link>.
                  </Trans>
                </p>
              </div>
            </form>
          )}
        </aside>
      </main>

      {/* Bottom CTA */}
      <section className="bg-white border-t border-gray-100 py-12 mt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('resources.checklist.bottomCta.title', 'Et si on automatisait tout ça ?')}</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            {t('resources.checklist.bottomCta.body', "ESG Flow remplit automatiquement 80 % de la check-list à partir de vos données comptables, RH et énergie. 14 jours d'essai gratuit, sans carte bancaire.")}
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
            {t('resources.checklist.bottomCta.cta', 'Démarrer mon essai ESG Flow')} →
          </Link>
        </div>
      </section>
    </div>
  );
}
