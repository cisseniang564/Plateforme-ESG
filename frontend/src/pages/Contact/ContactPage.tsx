import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import type { TFunction } from 'i18next';
import { usePageSeo } from '@/hooks/usePageSeo';
import {
  Send,
  Building2,
  Users,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  Shield,
  Zap,
  HeadphonesIcon,
  Calendar,
  ChevronLeft,
} from 'lucide-react';

/* ───────────────────────────────────────────────── constants ── */
const getCompanySizes = (t: TFunction) => [
  t('contact.size.1', '1-49 salaries'),
  t('contact.size.2', '50-249 salaries'),
  t('contact.size.3', '250-999 salaries'),
  t('contact.size.4', '1 000-4 999 salaries'),
  t('contact.size.5', '5 000+ salaries'),
] as const;

const getSubjects = (t: TFunction) => [
  t('contact.subject.quote', 'Demande de devis Enterprise'),
  t('contact.subject.demo', 'Demo personnalisee'),
  t('contact.subject.partner', 'Partenariat / Revendeur'),
  t('contact.subject.technical', 'Question technique'),
  t('contact.subject.other', 'Autre'),
] as const;

const getBenefits = (t: TFunction) => [
  {
    icon: Shield,
    title: t('contact.benefit.deploy.title', 'Deploiement dedie'),
    desc: t('contact.benefit.deploy.desc', 'Instance isolee, SLA 99,9 %, hebergement souverain EU.'),
  },
  {
    icon: Users,
    title: t('contact.benefit.users.title', 'Utilisateurs illimites'),
    desc: t('contact.benefit.users.desc', 'Toute votre equipe ESG, auditeurs et parties prenantes inclus.'),
  },
  {
    icon: Zap,
    title: t('contact.benefit.integ.title', 'Integrations sur-mesure'),
    desc: t('contact.benefit.integ.desc', 'Connecteurs ERP, SIRH et comptables configures pour vous.'),
  },
  {
    icon: HeadphonesIcon,
    title: t('contact.benefit.support.title', 'Support prioritaire'),
    desc: t('contact.benefit.support.desc', 'CSM dedie, onboarding guide, assistance sous 2 h ouvrees.'),
  },
] as const;

/* ────────────────────────────────────────────────── component ── */
export default function ContactPage() {
  const { t } = useTranslation();
  const COMPANY_SIZES = getCompanySizes(t);
  const SUBJECTS = getSubjects(t);
  const BENEFITS = getBenefits(t);
  usePageSeo({ id: 'contact', title: t('contact.seo.title', 'Contact — ESG Flow'), description: t('contact.seo.desc', 'Contactez l\'équipe ESG Flow pour une démonstration, un devis ou une question sur la conformité CSRD, Bilan Carbone, Taxonomie UE.'), url: 'https://greenconnect.cloud/contact', keywords: t('contact.seo.keywords', 'contact ESG Flow, démonstration CSRD, devis plateforme ESG'), ogImage: 'https://greenconnect.cloud/og/contact.png' });
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    companySize: '',
    subject: SUBJECTS[0] as string,
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  // scroll to top + page title on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = t('contact.docTitle', 'Contactez-nous — ESG Flow | Devis Enterprise & Demo');
    return () => { document.title = t('contact.docTitleDefault', 'ESG Flow — Plateforme ESG, CSRD & Bilan Carbone'); };
  }, []);

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);

    // Simulate API call (replace with real endpoint later)
    await new Promise(r => setTimeout(r, 1200));
    setSending(false);
    setSubmitted(true);
  }

  /* ── Success state ── */
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('contact.success.title', 'Message envoye !')}
            </h1>
            <p className="text-gray-600">
              <Trans i18nKey="contact.success.body">
                Merci pour votre interet. Notre equipe commerciale vous recontactera sous <strong>24 heures ouvrees</strong>.
              </Trans>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                {t('contact.success.home', "Retour a l'accueil")}
              </Link>
              <Link
                to="/demo"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                {t('contact.success.seeDemo', 'Voir la demo')}
              </Link>
            </div>
          </div>
        </div>
    );
  }

  /* ── Main layout ── */
  return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* ── Nav bar ── */}
        <nav className="sticky top-0 z-40 backdrop-blur-lg bg-white/80 border-b border-gray-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-gray-900 hover:text-emerald-600 transition-colors">
              <ChevronLeft className="w-4 h-4" />
              <img src="/brand/logo-full.png" alt="ESG Flow" className="h-8" />
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              {t('contact.nav.freeTrial', 'Essai gratuit')} <ArrowRight className="inline w-4 h-4 ml-1" />
            </Link>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          {/* ── Header ── */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold mb-4">
              <MessageSquare className="w-3.5 h-3.5" />
              {t('contact.header.badge', 'Contactez-nous')}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
              <Trans i18nKey="contact.header.title">
                Parlons de votre projet <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">ESG</span>
              </Trans>
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              {t('contact.header.subtitle', 'Obtenez un devis Enterprise sur-mesure, planifiez une demo personnalisee ou posez vos questions a notre equipe.')}
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
            {/* ── Left : Form (3/5) ── */}
            <div className="lg:col-span-3">
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6"
              >
                {/* Name row */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('contact.form.firstName', 'Prenom *')}
                    </label>
                    <input
                      type="text"
                      required
                      value={form.firstName}
                      onChange={e => update('firstName', e.target.value)}
                      placeholder={t('contact.form.firstNamePh', 'Jean')}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('contact.form.lastName', 'Nom *')}
                    </label>
                    <input
                      type="text"
                      required
                      value={form.lastName}
                      onChange={e => update('lastName', e.target.value)}
                      placeholder={t('contact.form.lastNamePh', 'Dupont')}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                    />
                  </div>
                </div>

                {/* Email + Phone */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Mail className="inline w-4 h-4 mr-1 text-gray-400" />
                      {t('contact.form.email', 'Email professionnel *')}
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => update('email', e.target.value)}
                      placeholder={t('contact.form.emailPh', 'jean@entreprise.fr')}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Phone className="inline w-4 h-4 mr-1 text-gray-400" />
                      {t('contact.form.phone', 'Telephone')}
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => update('phone', e.target.value)}
                      placeholder="+33 6 12 34 56 78"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                    />
                  </div>
                </div>

                {/* Company + Size */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Building2 className="inline w-4 h-4 mr-1 text-gray-400" />
                      {t('contact.form.company', 'Entreprise *')}
                    </label>
                    <input
                      type="text"
                      required
                      value={form.company}
                      onChange={e => update('company', e.target.value)}
                      placeholder={t('contact.form.companyPh', "Nom de l'entreprise")}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Users className="inline w-4 h-4 mr-1 text-gray-400" />
                      {t('contact.form.size', 'Taille')}
                    </label>
                    <select
                      value={form.companySize}
                      onChange={e => update('companySize', e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow bg-white"
                    >
                      <option value="">{t('contact.form.selectPh', 'Selectionnez')}</option>
                      {COMPANY_SIZES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('contact.form.subject', 'Objet *')}
                  </label>
                  <select
                    required
                    value={form.subject}
                    onChange={e => update('subject', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow bg-white"
                  >
                    {SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('contact.form.message', 'Message *')}
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={e => update('message', e.target.value)}
                    placeholder={t('contact.form.messagePh', "Decrivez votre projet ESG, le nombre d'entites, vos besoins specifiques...")}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      {t('contact.form.sending', 'Envoi en cours...')}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {t('contact.form.submit', 'Envoyer le message')}
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  <Trans i18nKey="contact.form.privacyNote">
                    En soumettant ce formulaire, vous acceptez notre <Link to="/privacy-policy" className="underline hover:text-emerald-600">politique de confidentialite</Link>. Nous repondons sous 24 h ouvrees.
                  </Trans>
                </p>
              </form>
            </div>

            {/* ── Right : Info (2/5) ── */}
            <div className="lg:col-span-2 space-y-8">
              {/* Benefits */}
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-gray-900">
                  {t('contact.info.whyTitle', 'Pourquoi choisir Enterprise ?')}
                </h2>
                {BENEFITS.map(b => (
                  <div key={b.title} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <b.icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{b.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Direct contact */}
              <div className="bg-gray-50 rounded-2xl p-6 space-y-4 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">{t('contact.info.directTitle', 'Contact direct')}</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <a
                    href="mailto:contact@greenconnect.cloud"
                    className="flex items-center gap-3 hover:text-emerald-600 transition-colors"
                  >
                    <Mail className="w-4 h-4 text-gray-400" />
                    contact@greenconnect.cloud
                  </a>
                  <a
                    href="tel:+33176340000"
                    className="flex items-center gap-3 hover:text-emerald-600 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-gray-400" />
                    +33 1 76 34 00 00
                  </a>
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    Paris, France
                  </div>
                </div>
              </div>

              {/* CTA secondary */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white space-y-3">
                <h3 className="text-sm font-bold">{t('contact.cta.title', 'Pas encore pret ?')}</h3>
                <p className="text-sm text-gray-300">
                  {t('contact.cta.body', 'Essayez gratuitement pendant 14 jours, sans engagement ni carte bancaire.')}
                </p>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  {t('contact.cta.link', "Demarrer l'essai gratuit")}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mini footer ── */}
        <footer className="border-t border-gray-200 bg-white mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <span>{t('contact.footer.copyright', '© {{year}} GreenConnect SAS. Tous droits reserves.', { year: new Date().getFullYear() })}</span>
            <div className="flex items-center gap-4">
              <Link to="/privacy-policy" className="hover:text-emerald-600 transition-colors">
                {t('contact.footer.privacy', 'Confidentialite')}
              </Link>
              <Link to="/terms-of-service" className="hover:text-emerald-600 transition-colors">
                {t('contact.footer.terms', 'CGU')}
              </Link>
              <Link to="/legal-notice" className="hover:text-emerald-600 transition-colors">
                {t('contact.footer.legal', 'Mentions legales')}
              </Link>
            </div>
          </div>
        </footer>
      </div>
  );
}
