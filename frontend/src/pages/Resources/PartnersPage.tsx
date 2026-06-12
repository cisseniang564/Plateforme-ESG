/**
 * Page Partenaires — /partenaires
 * Programme partenaires pour cabinets de conseil RSE, experts-comptables, intégrateurs.
 */
import { Link } from 'react-router-dom';
import {
  ArrowRight, Users, Briefcase, Award, TrendingUp,
  CheckCircle2, Mail, Building2, Sparkles, Coins,
} from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import type { TFunction } from 'i18next';
import { LogoBrand } from '@/components/common/Logo';
import { usePageSeo } from '@/hooks/usePageSeo';

const getTiers = (t: TFunction) => [
  {
    name: t('resources.partners.tiers.0.name', 'Référent'),
    target: t('resources.partners.tiers.0.target', 'Consultant·e ou cabinet de moins de 5 personnes'),
    commission: t('resources.partners.tiers.0.commission', '15 %'),
    duration: t('resources.partners.tiers.0.duration', 'sur 12 mois'),
    benefits: [
      t('resources.partners.tiers.0.benefits.0', 'Formation gratuite (3 h en ligne)'),
      t('resources.partners.tiers.0.benefits.1', "Compte ESG Flow démo offert (jusqu'à 3 organisations)"),
      t('resources.partners.tiers.0.benefits.2', 'Référencement dans notre annuaire public'),
      t('resources.partners.tiers.0.benefits.3', 'Co-rédaction de cas clients'),
    ],
    color: 'emerald',
    cta: t('resources.partners.tiers.0.cta', 'Devenir Référent'),
  },
  {
    name: t('resources.partners.tiers.1.name', 'Premium'),
    target: t('resources.partners.tiers.1.target', 'Cabinet de conseil RSE 5-50 personnes'),
    commission: t('resources.partners.tiers.1.commission', '20 %'),
    duration: t('resources.partners.tiers.1.duration', 'sur 24 mois'),
    badge: t('resources.partners.tiers.1.badge', 'Le plus choisi'),
    benefits: [
      t('resources.partners.tiers.1.benefits.0', "Tout ce qu'inclut Référent"),
      t('resources.partners.tiers.1.benefits.1', "Mise en avant prioritaire dans l'annuaire"),
      t('resources.partners.tiers.1.benefits.2', 'Account manager dédié'),
      t('resources.partners.tiers.1.benefits.3', 'Co-organisation de webinaires (2/an)'),
      t('resources.partners.tiers.1.benefits.4', 'Accès anticipé aux nouvelles fonctionnalités'),
      t('resources.partners.tiers.1.benefits.5', 'Tableau de bord partenaire (clients référés, MRR, commissions)'),
    ],
    color: 'blue',
    cta: t('resources.partners.tiers.1.cta', 'Devenir Premium'),
    highlight: true,
  },
  {
    name: t('resources.partners.tiers.2.name', 'Intégrateur'),
    target: t('resources.partners.tiers.2.target', 'Cabinet 50+ pers., ESN, expert-comptable national'),
    commission: t('resources.partners.tiers.2.commission', 'Sur mesure'),
    duration: t('resources.partners.tiers.2.duration', 'négociable'),
    benefits: [
      t('resources.partners.tiers.2.benefits.0', 'Marque blanche (white-label) possible'),
      t('resources.partners.tiers.2.benefits.1', 'Tarification volume'),
      t('resources.partners.tiers.2.benefits.2', 'SLA premium + accompagnement implémentation'),
      t('resources.partners.tiers.2.benefits.3', 'API et webhooks dédiés'),
      t('resources.partners.tiers.2.benefits.4', 'Co-marketing : présence salons, livre blanc co-signé'),
    ],
    color: 'violet',
    cta: t('resources.partners.tiers.2.cta', 'Discuter'),
  },
];

const getPartnerTypes = (t: TFunction) => [
  {
    icon: Briefcase,
    title: t('resources.partners.types.0.title', 'Cabinets de conseil RSE'),
    desc: t('resources.partners.types.0.desc', 'Vous accompagnez vos clients dans leur démarche CSRD ? ESG Flow devient votre outil opérationnel, vous gardez la relation conseil à forte valeur ajoutée.'),
  },
  {
    icon: Award,
    title: t('resources.partners.types.1.title', 'Experts-comptables'),
    desc: t('resources.partners.types.1.desc', 'Vos clients vous interrogent sur la CSRD ? Devenez prescripteur ESG Flow et générez un revenu récurrent en restant focus sur votre métier comptable.'),
  },
  {
    icon: Building2,
    title: t('resources.partners.types.2.title', 'ESN et intégrateurs'),
    desc: t('resources.partners.types.2.desc', 'Vous déployez du logiciel chez vos clients PME/ETI ? Intégrez ESG Flow à votre offre cloud, avec marque blanche possible et API documentée.'),
  },
  {
    icon: Users,
    title: t('resources.partners.types.3.title', 'Associations professionnelles'),
    desc: t('resources.partners.types.3.desc', 'CCI, OPCO, syndicats professionnels : nous proposons des conditions privilégiées pour vos adhérents, plus des webinaires gratuits sur la CSRD.'),
  },
];

export default function PartnersPage() {
  const { t } = useTranslation();
  const TIERS = getTiers(t);
  const PARTNER_TYPES = getPartnerTypes(t);

  const url = 'https://greenconnect.cloud/partenaires';
  const img = 'https://greenconnect.cloud/api/v1/og/partenaires.png';
  const desc = t('resources.partners.seo.description', "Devenez partenaire ESG Flow : commission jusqu'à 20% récurrente, formation gratuite, annuaire public. Pour cabinets RSE, experts-comptables, ESN.");

  usePageSeo({
    id: 'partenaires',
    title: t('resources.partners.seo.title', 'Programme Partenaires — ESG Flow'),
    description: desc,
    keywords: t('resources.partners.seo.keywords', 'partenaires ESG, cabinet RSE, expert-comptable, programme affiliation, white label CSRD, commission récurrente'),
    url,
    ogTitle: t('resources.partners.seo.ogTitle', "Programme Partenaires ESG Flow — jusqu'à 20% de commission"),
    ogImage: img,
    ogImageAlt: t('resources.partners.seo.ogImageAlt', 'Programme Partenaires ESG Flow — Référent, Premium, Intégrateur'),
    breadcrumb: [
      { name: t('resources.partners.breadcrumb.home', 'Accueil'),    url: 'https://greenconnect.cloud/' },
      { name: t('resources.partners.breadcrumb.company', 'Entreprise'), url: 'https://greenconnect.cloud/' },
      { name: t('resources.partners.breadcrumb.program', 'Programme Partenaires'), url },
    ],
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" aria-label={t('resources.partners.nav.homeAria', 'ESG Flow — Accueil')}>
            <LogoBrand size="sm" variant="dark" showTagline={false} />
          </Link>
          <Link to="/register" className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
            {t('resources.partners.nav.freeTrial', 'Essai gratuit')} →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 via-white to-blue-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold mb-6">
            <Sparkles className="h-3.5 w-3.5" /> {t('resources.partners.hero.badge', 'PROGRAMME PARTENAIRES · OUVERT 2026')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            {t('resources.partners.hero.titleLine1', "Développez votre chiffre d'affaires")}<br />{t('resources.partners.hero.titleLine2', 'en démocratisant la CSRD')}
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed mb-8 max-w-2xl mx-auto">
            <Trans i18nKey="resources.partners.hero.subtitle">
              Cabinet de conseil RSE, expert-comptable ou ESN : devenez partenaire ESG Flow et touchez
              jusqu'à <strong>20 % de commission récurrente</strong> sur chaque client référé.
            </Trans>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="#contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              {t('resources.partners.hero.applyCta', 'Postuler en 3 minutes')} <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#tiers" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 hover:border-emerald-300 text-gray-700 font-semibold">
              {t('resources.partners.hero.tiersCta', 'Voir les niveaux')}
            </a>
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="py-16 border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-4xl font-extrabold text-emerald-600">{t('resources.partners.numbers.0.value', '20 %')}</p>
            <p className="text-sm text-gray-500 mt-2">{t('resources.partners.numbers.0.label', 'Commission max récurrente')}</p>
          </div>
          <div>
            <p className="text-4xl font-extrabold text-emerald-600">{t('resources.partners.numbers.1.value', '24 mois')}</p>
            <p className="text-sm text-gray-500 mt-2">{t('resources.partners.numbers.1.label', 'Durée de versement (niveau Premium)')}</p>
          </div>
          <div>
            <p className="text-4xl font-extrabold text-emerald-600">{t('resources.partners.numbers.2.value', '~480 €/an')}</p>
            <p className="text-sm text-gray-500 mt-2">{t('resources.partners.numbers.2.label', 'Commission moyenne par client ETI référé')}</p>
          </div>
        </div>
      </section>

      {/* Partner types */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">{t('resources.partners.types.heading', "À qui s'adresse le programme")}</h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">
            {t('resources.partners.types.subtext', 'Vous accompagnez des PME et ETI françaises sur des sujets ESG, comptables ou IT ? Vous êtes éligible.')}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PARTNER_TYPES.map((pt, i) => {
              const I = pt.icon;
              return (
                <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-emerald-300 hover:shadow-md transition-all">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                    <I className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="font-bold text-gray-900 mb-2">{pt.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{pt.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section id="tiers" className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">{t('resources.partners.tiers.heading', '3 niveaux de partenariat')}</h2>
          <p className="text-gray-500 text-center mb-12">{t('resources.partners.tiers.subtext', 'Choisissez celui qui correspond à votre structure.')}</p>
          <div className="grid lg:grid-cols-3 gap-6">
            {TIERS.map((tier, i) => (
              <div
                key={i}
                className={`relative rounded-2xl p-7 border-2 ${tier.highlight ? 'border-emerald-500 shadow-xl shadow-emerald-100' : 'border-gray-200'} bg-white flex flex-col`}
              >
                {tier.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                    {tier.badge}
                  </span>
                )}
                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${tier.highlight ? 'text-emerald-600' : 'text-gray-400'}`}>{tier.name}</p>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{tier.target}</h3>
                <div className="mb-5">
                  <span className="text-4xl font-extrabold text-gray-900">{tier.commission}</span>
                  <span className="text-sm text-gray-500 ml-2">{tier.duration}</span>
                </div>
                <ul className="space-y-2 mb-7 flex-1">
                  {tier.benefits.map((b, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>
                <a
                  href="#contact"
                  className={`block text-center px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                    tier.highlight
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'border-2 border-gray-200 text-gray-700 hover:border-emerald-300'
                  }`}
                >
                  {tier.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">{t('resources.partners.how.heading', 'Comment ça marche')}</h2>
          <div className="grid sm:grid-cols-4 gap-6">
            {[
              { n: 1, title: t('resources.partners.how.0.title', 'Postulez'), desc: t('resources.partners.how.0.desc', 'Remplissez le formulaire (3 min). Nous validons sous 5 jours ouvrés.') },
              { n: 2, title: t('resources.partners.how.1.title', 'Formez-vous'), desc: t('resources.partners.how.1.desc', 'Formation 3h en ligne sur ESG Flow + ressources commerciales.') },
              { n: 3, title: t('resources.partners.how.2.title', 'Référez'), desc: t('resources.partners.how.2.desc', 'Partagez votre lien partenaire ou vendez ESG Flow comme outil de mission.') },
              { n: 4, title: t('resources.partners.how.3.title', 'Touchez'), desc: t('resources.partners.how.3.desc', 'Commission versée trimestriellement pendant 12-24 mois par client.') },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-full mx-auto flex items-center justify-center text-lg font-bold mb-4">
                  {s.n}
                </div>
                <p className="font-bold text-gray-900 mb-2">{s.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">{t('resources.partners.why.heading', 'Pourquoi recommander ESG Flow ?')}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Coins, title: t('resources.partners.why.0.title', 'Tarif accessible'), desc: t('resources.partners.why.0.desc', 'À partir de 249 €/mois — sans cabinet à 30 k€.') },
              { icon: Sparkles, title: t('resources.partners.why.1.title', 'Setup en 1 heure'), desc: t('resources.partners.why.1.desc', 'Self-service contre 3-6 mois de Workiva.') },
              { icon: TrendingUp, title: t('resources.partners.why.2.title', 'Conforme CSRD'), desc: t('resources.partners.why.2.desc', '12 modules ESRS, iXBRL, audit trail SHA-256.') },
            ].map((r, i) => {
              const I = r.icon;
              return (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <I className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 mb-1">{r.title}</p>
                    <p className="text-sm text-gray-600">{r.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact / apply */}
      <section id="contact" className="py-20 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">{t('resources.partners.contact.title', 'Prêt·e à rejoindre le programme ?')}</h2>
          <p className="text-emerald-50 mb-8 max-w-xl mx-auto">
            {t('resources.partners.contact.body', "Envoyez-nous un email avec votre activité actuelle et le type de clients que vous accompagnez. Nous revenons vers vous sous 5 jours ouvrés avec un kit d'onboarding partenaire.")}
          </p>
          <a
            href="mailto:partenaires@greenconnect.cloud?subject=Candidature%20programme%20partenaires%20ESG%20Flow"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-emerald-700 font-bold hover:bg-emerald-50 transition-colors"
          >
            <Mail className="h-5 w-5" />
            partenaires@greenconnect.cloud
          </a>
          <p className="text-xs text-emerald-100/80 mt-6">
            <Trans i18nKey="resources.partners.contact.other">
              Ou écrivez à <a href="mailto:contact@greenconnect.cloud" className="underline">contact@greenconnect.cloud</a> pour
              toute autre question.
            </Trans>
          </p>
        </div>
      </section>

      <footer className="bg-gray-50 border-t border-gray-200 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <LogoBrand size="sm" variant="dark" showTagline={false} />
          <div className="flex gap-5 text-sm text-gray-500">
            <Link to="/pricing" className="hover:text-emerald-600">{t('resources.partners.footer.pricing', 'Tarifs')}</Link>
            <Link to="/security" className="hover:text-emerald-600">{t('resources.partners.footer.security', 'Sécurité')}</Link>
            <Link to="/status" className="hover:text-emerald-600">{t('resources.partners.footer.status', 'Statut')}</Link>
            <Link to="/privacy-policy" className="hover:text-emerald-600">{t('resources.partners.footer.privacy', 'Confidentialité')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
