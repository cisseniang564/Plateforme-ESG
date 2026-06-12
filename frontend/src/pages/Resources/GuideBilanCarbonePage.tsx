/**
 * Pillar SEO #2 — Bilan carbone entreprise : méthode complète Scopes 1/2/3.
 * URL : /guide/bilan-carbone-entreprise
 * Cible : "bilan carbone entreprise logiciel", "bilan ges obligatoire",
 *         "scope 1 scope 2 scope 3", "ADEME base carbone".
 */
import { Link } from 'react-router-dom';
import {
  CheckCircle2, Calendar, BookOpen, ArrowRight,
  Flame, Zap, Truck, Factory, ChevronRight, Download,
  TrendingUp, FileText, AlertTriangle,
} from 'lucide-react';
import { LogoBrand } from '@/components/common/Logo';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useTranslation, Trans } from 'react-i18next';
import type { TFunction } from 'i18next';

const getTOC = (t: TFunction) => [
  { id: 'intro',          title: t('resources.guideBilanCarbone.toc.intro', 'En 30 secondes') },
  { id: 'definitions',    title: t('resources.guideBilanCarbone.toc.definitions', "Qu'est-ce qu'un bilan carbone ?") },
  { id: 'obligations',    title: t('resources.guideBilanCarbone.toc.obligations', 'Suis-je obligé·e ?') },
  { id: 'methodologie',   title: t('resources.guideBilanCarbone.toc.methodologie', 'Méthodologie GHG Protocol') },
  { id: 'scope-1',        title: t('resources.guideBilanCarbone.toc.scope1', 'Scope 1 : émissions directes') },
  { id: 'scope-2',        title: t('resources.guideBilanCarbone.toc.scope2', 'Scope 2 : énergie achetée') },
  { id: 'scope-3',        title: t('resources.guideBilanCarbone.toc.scope3', 'Scope 3 : chaîne de valeur') },
  { id: 'facteurs',       title: t('resources.guideBilanCarbone.toc.facteurs', "Facteurs d'émission ADEME") },
  { id: 'calcul-exemple', title: t('resources.guideBilanCarbone.toc.calculExemple', 'Exemple chiffré PME') },
  { id: 'reduction',      title: t('resources.guideBilanCarbone.toc.reduction', 'Réduction & trajectoire SBTi') },
  { id: 'esgflow',        title: t('resources.guideBilanCarbone.toc.esgflow', 'Faire son bilan avec ESG Flow') },
  { id: 'faq',            title: t('resources.guideBilanCarbone.toc.faq', 'FAQ') },
];

export default function GuideBilanCarbonePage() {
  const { t } = useTranslation();
  const TOC = getTOC(t);
  const url = 'https://greenconnect.cloud/guide/bilan-carbone-entreprise';
  const img = 'https://greenconnect.cloud/api/v1/og/guide-bilan-carbone.png';
  const desc = t('resources.guideBilanCarbone.seo.description', "Guide pratique du bilan carbone pour PME et ETI : méthode GHG Protocol, scopes 1/2/3, facteurs ADEME Base Carbone, exemples chiffrés, trajectoire SBTi. Conformité BEGES, CSRD ESRS E1, taxonomie UE.");

  usePageSeo({
    id: 'guide-bilan-carbone',
    title: t('resources.guideBilanCarbone.seo.title', 'Bilan carbone entreprise : méthode complète Scopes 1/2/3 — ESG Flow'),
    description: desc,
    keywords: t('resources.guideBilanCarbone.seo.keywords', 'bilan carbone, BEGES, GHG Protocol, scope 1, scope 2, scope 3, ADEME, facteur émission, SBTi, ESRS E1, taxonomie UE'),
    url,
    ogType: 'article',
    ogTitle: t('resources.guideBilanCarbone.seo.ogTitle', 'Bilan carbone entreprise : méthode complète Scopes 1/2/3'),
    ogImage: img,
    ogImageAlt: t('resources.guideBilanCarbone.seo.ogImageAlt', 'Bilan carbone entreprise — méthode Scopes 1/2/3 — ESG Flow'),
    breadcrumb: [
      { name: t('resources.guideBilanCarbone.breadcrumb.home', 'Accueil'),     url: 'https://greenconnect.cloud/' },
      { name: t('resources.guideBilanCarbone.breadcrumb.resources', 'Ressources'),  url: 'https://greenconnect.cloud/resources' },
      { name: t('resources.guideBilanCarbone.breadcrumb.current', 'Bilan carbone entreprise'), url },
    ],
    articleJsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Bilan carbone entreprise : méthode complète Scopes 1/2/3",
      "description": desc,
      "image": [img],
      "datePublished": "2026-05-15T08:00:00+02:00",
      "dateModified": "2026-05-20T08:00:00+02:00",
      "author":    { "@type": "Organization", "name": "ESG Flow", "url": "https://greenconnect.cloud" },
      "publisher": { "@type": "Organization", "name": "GreenConnect SAS",
                     "logo": { "@type": "ImageObject", "url": "https://greenconnect.cloud/brand/icon-esgflow-v3-256.png", "width": 256, "height": 256 } },
      "mainEntityOfPage": { "@type": "WebPage", "@id": url },
      "inLanguage": "fr-FR",
      "keywords": "bilan carbone, GHG Protocol, scopes 1 2 3, ADEME, SBTi, BEGES",
    },
    faqJsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "Qui est obligé·e de faire un bilan carbone en France ?",
          "acceptedAnswer": { "@type": "Answer", "text": "Les entreprises de plus de 500 salariés (250 en outre-mer), les personnes morales de droit public de plus de 250 personnes, l'État, les régions, départements, communes >50 000 habitants. Article L229-25 du Code de l'environnement." } },
        { "@type": "Question", "name": "Quelle différence entre BEGES réglementaire et bilan carbone ADEME ?",
          "acceptedAnswer": { "@type": "Answer", "text": "Le BEGES est l'obligation légale française portant sur Scopes 1+2 minimum. Le bilan carbone ADEME est une méthodologie plus large (1+2+3) recommandée mais non obligatoire sauf CSRD." } },
        { "@type": "Question", "name": "Quel est le Scope 3 le plus important à traiter ?",
          "acceptedAnswer": { "@type": "Answer", "text": "Pour une PME B2B de services : catégories 1 (achats) et 6 (déplacements pro) = 60-80 %. Pour l'industrie : catégories 1 (matières premières) et 11 (usage produit vendu)." } },
        { "@type": "Question", "name": "Faut-il faire le bilan carbone tous les ans ?",
          "acceptedAnswer": { "@type": "Answer", "text": "BEGES tous les 4 ans (entreprises). CSRD : annuel. Mieux : suivi mensuel des principaux postes pour piloter en continu." } },
        { "@type": "Question", "name": "Quelle pénalité en cas d'absence de bilan carbone ?",
          "acceptedAnswer": { "@type": "Answer", "text": "Amende administrative jusqu'à 10 000 € (50 000 € en récidive). Loi du 17 août 2015." } },
        { "@type": "Question", "name": "Comment calculer son Scope 3 quand on n'a pas toutes les données ?",
          "acceptedAnswer": { "@type": "Answer", "text": "Méthode spend-based : montants d'achat (FEC) × facteur monétaire ADEME. Précision moyenne mais légalement acceptée." } },
        { "@type": "Question", "name": "Quel logiciel pour faire son bilan carbone ?",
          "acceptedAnswer": { "@type": "Answer", "text": "ESG Flow inclut le bilan carbone GHG Protocol avec facteurs ADEME 2024 dès le plan PME (249 €/mois)." } },
      ]
    },
  });

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" aria-label={t('resources.guideBilanCarbone.nav.logoAria', 'ESG Flow — Accueil')}><LogoBrand size="sm" variant="dark" showTagline={false} /></Link>
          <Link to="/register" className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">{t('resources.guideBilanCarbone.nav.cta', 'Essai gratuit →')}</Link>
        </div>
      </header>

      <section className="bg-gradient-to-br from-emerald-50 via-white to-blue-50 py-16 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold mb-6">
            <BookOpen className="h-3.5 w-3.5" /> {t('resources.guideBilanCarbone.hero.badge', 'GUIDE EXPERT · 20 MIN DE LECTURE')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            {t('resources.guideBilanCarbone.hero.titleLine1', 'Bilan carbone entreprise')}<br /><span className="text-emerald-600">{t('resources.guideBilanCarbone.hero.titleLine2', 'méthode complète Scopes 1/2/3')}</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed mb-8">
            {t('resources.guideBilanCarbone.hero.subtitle', "Comprendre la méthodologie GHG Protocol, identifier vos sources d'émissions, calculer Scope 1, 2 et 3 avec les facteurs ADEME Base Carbone®, et tracer une trajectoire de réduction alignée SBTi.")}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {t('resources.guideBilanCarbone.hero.updated', 'Mis à jour mai 2026')}</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {t('resources.guideBilanCarbone.hero.badge1', 'Conforme ADEME / GHG Protocol')}</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {t('resources.guideBilanCarbone.hero.badge2', 'CSRD ESRS E1 compatible')}</span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12">

        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1" aria-label={t('resources.guideBilanCarbone.aside.tocAria', 'Sommaire')}>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t('resources.guideBilanCarbone.aside.toc', 'Sommaire')}</h2>
            {TOC.map(item => (
              <a key={item.id} href={`#${item.id}`}
                 className="block text-sm text-gray-600 hover:text-emerald-600 py-1.5 border-l-2 border-transparent hover:border-emerald-500 pl-3 transition-all">
                {item.title}
              </a>
            ))}
            <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-700 mb-2">{t('resources.guideBilanCarbone.aside.ctaTitle', 'Check-list ESRS gratuite')}</p>
              <p className="text-xs text-gray-600 mb-3">{t('resources.guideBilanCarbone.aside.ctaDesc', '47 indicateurs prioritaires CSRD/ESRS au format PDF.')}</p>
              <Link to="/ressources/checklist-csrd" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800">
                <Download className="h-3.5 w-3.5" />{t('resources.guideBilanCarbone.aside.ctaLink', 'Télécharger')}
              </Link>
            </div>
          </nav>
        </aside>

        <article className="prose prose-lg max-w-none text-gray-700 leading-relaxed">

          <section id="intro" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideBilanCarbone.intro.title', 'En 30 secondes')}</h2>
            <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl p-5 my-6">
              <p className="font-semibold text-emerald-900 mb-2">{t('resources.guideBilanCarbone.intro.tldr', '⚡ TL;DR')}</p>
              <ul className="space-y-1.5 text-emerald-900 text-base list-disc list-inside">
                <li><Trans i18nKey="resources.guideBilanCarbone.intro.item1">Le <strong>bilan carbone</strong> mesure les émissions de gaz à effet de serre d'une organisation en <strong>tonnes équivalent CO₂ (tCO₂e)</strong>.</Trans></li>
                <li><Trans i18nKey="resources.guideBilanCarbone.intro.item2">Méthodologie standard mondiale : <strong>GHG Protocol</strong> — 3 scopes (1 = direct, 2 = énergie achetée, 3 = chaîne de valeur).</Trans></li>
                <li><Trans i18nKey="resources.guideBilanCarbone.intro.item3">En France, le <strong>BEGES</strong> est obligatoire pour les entreprises &gt; 500 salariés (Article L229-25).</Trans></li>
                <li>{t('resources.guideBilanCarbone.intro.item4', 'Sous CSRD, le bilan carbone (ESRS E1) est obligatoire pour les vagues concernées, avec audit limité.')}</li>
                <li><Trans i18nKey="resources.guideBilanCarbone.intro.item5">Le Scope 3 représente <strong>~70 % des émissions</strong> d'une entreprise B2B de services. Le négliger c'est rater l'essentiel.</Trans></li>
                <li><Trans i18nKey="resources.guideBilanCarbone.intro.item6">Méthode <strong>spend-based</strong> (multiplier les achats du FEC par des facteurs ADEME) = approche pragmatique pour démarrer.</Trans></li>
              </ul>
            </div>
          </section>

          <section id="definitions" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideBilanCarbone.definitions.title', "Qu'est-ce qu'un bilan carbone ?")}</h2>
            <p><Trans i18nKey="resources.guideBilanCarbone.definitions.p1">Un <strong>bilan carbone</strong> est un inventaire des <strong>émissions de gaz à effet de serre (GES)</strong> générées par une organisation sur un périmètre et une période donnés, exprimées en <strong>tonnes équivalent CO₂ (tCO₂e)</strong>.</Trans></p>
            <p><Trans i18nKey="resources.guideBilanCarbone.definitions.p2">L'équivalent CO₂ permet d'agréger les 7 GES du protocole de Kyoto (CO₂, CH₄, N₂O, HFC, PFC, SF₆, NF₃) en une unité commune en multipliant chaque GES par son <strong>Pouvoir de Réchauffement Global (PRG)</strong> à 100 ans. Le méthane (CH₄), par exemple, a un PRG de 28 — 1 tonne de CH₄ équivaut à 28 tCO₂e.</Trans></p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 my-6">
              <p className="font-semibold text-blue-900 mb-2">{t('resources.guideBilanCarbone.definitions.vocabTitle', '📚 Vocabulaire à connaître')}</p>
              <ul className="text-blue-900 text-sm space-y-1 list-disc list-inside">
                <li><Trans i18nKey="resources.guideBilanCarbone.definitions.vocab1"><strong>BEGES</strong> : Bilan d'Émissions de Gaz à Effet de Serre — obligation française L229-25</Trans></li>
                <li><Trans i18nKey="resources.guideBilanCarbone.definitions.vocab2"><strong>Bilan Carbone®</strong> : méthode ADEME (marque déposée), équivalent du GHG Protocol</Trans></li>
                <li><Trans i18nKey="resources.guideBilanCarbone.definitions.vocab3"><strong>GHG Protocol</strong> : standard international (World Resources Institute) le plus utilisé au monde</Trans></li>
                <li><Trans i18nKey="resources.guideBilanCarbone.definitions.vocab4"><strong>ISO 14064</strong> : norme ISO pour la quantification et le reporting des GES</Trans></li>
                <li><Trans i18nKey="resources.guideBilanCarbone.definitions.vocab5"><strong>BCF (Bilan Carbone Form.®)</strong> : version simplifiée portée par l'APCC</Trans></li>
              </ul>
            </div>
          </section>

          <section id="obligations" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideBilanCarbone.obligations.title', 'Suis-je obligé·e de faire un bilan carbone ?')}</h2>
            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">{t('resources.guideBilanCarbone.obligations.legalTitle', 'Obligations légales françaises (BEGES)')}</h3>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left p-3 font-bold text-gray-700">{t('resources.guideBilanCarbone.obligations.th.org', 'Organisation')}</th>
                    <th className="text-left p-3 font-bold text-gray-700">{t('resources.guideBilanCarbone.obligations.th.threshold', 'Seuil')}</th>
                    <th className="text-left p-3 font-bold text-gray-700">{t('resources.guideBilanCarbone.obligations.th.frequency', 'Périodicité')}</th>
                    <th className="text-left p-3 font-bold text-gray-700">{t('resources.guideBilanCarbone.obligations.th.scopes', 'Scopes')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100"><td className="p-3 font-semibold">{t('resources.guideBilanCarbone.obligations.row1.org', 'Entreprise privée')}</td><td className="p-3">{t('resources.guideBilanCarbone.obligations.row1.threshold', '> 500 salariés (250 outre-mer)')}</td><td className="p-3">{t('resources.guideBilanCarbone.obligations.row1.frequency', '4 ans')}</td><td className="p-3">{t('resources.guideBilanCarbone.obligations.row1.scopes', '1 + 2 (3 recommandé depuis 2022)')}</td></tr>
                  <tr className="border-b border-gray-100 bg-emerald-50/50"><td className="p-3 font-semibold">{t('resources.guideBilanCarbone.obligations.row2.org', 'Entreprise CSRD vague 2')}</td><td className="p-3">{t('resources.guideBilanCarbone.obligations.row2.threshold', '> 1 000 sal. / 450 M€ CA')}</td><td className="p-3">{t('resources.guideBilanCarbone.obligations.row2.frequency', 'Annuel')}</td><td className="p-3"><strong>{t('resources.guideBilanCarbone.obligations.row2.scopes', '1 + 2 + 3 complet')}</strong></td></tr>
                  <tr className="border-b border-gray-100"><td className="p-3 font-semibold">{t('resources.guideBilanCarbone.obligations.row3.org', 'Personne morale publique')}</td><td className="p-3">{t('resources.guideBilanCarbone.obligations.row3.threshold', '> 250 personnes')}</td><td className="p-3">{t('resources.guideBilanCarbone.obligations.row3.frequency', '3 ans')}</td><td className="p-3">1 + 2</td></tr>
                  <tr><td className="p-3 font-semibold">{t('resources.guideBilanCarbone.obligations.row4.org', 'Collectivité')}</td><td className="p-3">{t('resources.guideBilanCarbone.obligations.row4.threshold', '> 50 000 habitants')}</td><td className="p-3">{t('resources.guideBilanCarbone.obligations.row4.frequency', '3 ans')}</td><td className="p-3">1 + 2</td></tr>
                </tbody>
              </table>
            </div>
            <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-r-xl my-6">
              <p className="font-semibold text-red-900 mb-2">{t('resources.guideBilanCarbone.obligations.sanctionTitle', "⚠ Sanction en cas d'absence")}</p>
              <p className="text-red-900 text-base"><Trans i18nKey="resources.guideBilanCarbone.obligations.sanctionBody">Amende administrative jusqu'à <strong>10 000 €</strong> (50 000 € en récidive). Loi du 17 août 2015 et son décret d'application — appliquée depuis 2019 sur ~15 entreprises/an publiquement.</Trans></p>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideBilanCarbone.obligations.indirectTitle', 'Obligations indirectes (pression marché)')}</h3>
            <p><Trans i18nKey="resources.guideBilanCarbone.obligations.indirectIntro">Même sans obligation légale, votre entreprise est probablement <strong>obligée par ses clients</strong> :</Trans></p>
            <ul className="space-y-2 my-4 list-disc list-inside">
              <li><Trans i18nKey="resources.guideBilanCarbone.obligations.indirect1"><strong>Marchés publics</strong> : ~40 % des appels d'offres publics français incluent un critère ESG/carbone pondéré à au moins 10 %</Trans></li>
              <li><Trans i18nKey="resources.guideBilanCarbone.obligations.indirect2"><strong>Clients grands groupes</strong> qui doivent eux-mêmes rapporter leur Scope 3 — vous êtes une de leurs catégories 1 ou 4</Trans></li>
              <li><Trans i18nKey="resources.guideBilanCarbone.obligations.indirect3"><strong>CSDDD</strong> (directive devoir de vigilance, entre en vigueur 2027-2029) : audits supply chain incluant les émissions</Trans></li>
              <li><Trans i18nKey="resources.guideBilanCarbone.obligations.indirect4"><strong>Banques & assurances</strong> qui appliquent la Taxonomie UE et le SFDR à leurs portefeuilles d'investissement</Trans></li>
            </ul>
          </section>

          <section id="methodologie" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideBilanCarbone.methodologie.title', 'La méthodologie GHG Protocol')}</h2>
            <p><Trans i18nKey="resources.guideBilanCarbone.methodologie.intro">Le <strong>GHG Protocol Corporate Standard</strong> (2004, révisé 2015) est le standard international le plus utilisé. C'est la base de la quasi-totalité des autres méthodologies (Bilan Carbone ADEME, ISO 14064, CDP, SBTi, CSRD ESRS E1).</Trans></p>
            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">{t('resources.guideBilanCarbone.methodologie.stepsTitle', 'Les 5 étapes structurantes')}</h3>
            <ol className="space-y-3 my-4 list-decimal list-inside">
              <li><Trans i18nKey="resources.guideBilanCarbone.methodologie.step1"><strong>Définir le périmètre organisationnel</strong> : choix entre approche par contrôle opérationnel, contrôle financier, ou part de capital. Définit quelles filiales / sites sont inclus.</Trans></li>
              <li><Trans i18nKey="resources.guideBilanCarbone.methodologie.step2"><strong>Définir le périmètre opérationnel</strong> : choix des scopes à inclure (1 obligatoire, 2 obligatoire, 3 fortement recommandé)</Trans></li>
              <li><Trans i18nKey="resources.guideBilanCarbone.methodologie.step3"><strong>Identifier les sources d'émissions</strong> par scope : liste exhaustive des activités générant des GES (combustion, électricité, voyages, achats, déchets, …)</Trans></li>
              <li><Trans i18nKey="resources.guideBilanCarbone.methodologie.step4"><strong>Collecter les données d'activité</strong> : kWh, litres, km, kg, € selon la source. C'est l'étape la plus chronophage (60-70 % du temps total).</Trans></li>
              <li><Trans i18nKey="resources.guideBilanCarbone.methodologie.step5"><strong>Multiplier par les facteurs d'émission</strong> pour convertir en tCO₂e. Sources : ADEME Base Carbone®, ecoinvent, Climatiq, DEFRA UK, EPA US.</Trans></li>
            </ol>
          </section>

          <section id="scope-1" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Flame className="h-8 w-8 text-orange-500" /> {t('resources.guideBilanCarbone.scope1.title', 'Scope 1 : émissions directes')}
            </h2>
            <p><Trans i18nKey="resources.guideBilanCarbone.scope1.intro">Le <strong>Scope 1</strong> couvre les émissions de GES <strong>directement</strong> issues des activités de l'entreprise — c'est-à-dire émises par des sources qu'elle contrôle.</Trans></p>
            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">{t('resources.guideBilanCarbone.scope1.subTitle', '4 sous-catégories')}</h3>
            <div className="space-y-3 my-6">
              {[
                { t: t('resources.guideBilanCarbone.scope1.cat0.t', 'Combustion fixe'),           d: t('resources.guideBilanCarbone.scope1.cat0.d', 'Chaudière gaz, fioul, biomasse, …'), ex: t('resources.guideBilanCarbone.scope1.cat0.ex', 'Chaudière 80 kW × 1 800 h = 144 000 kWh gaz → 32 tCO₂e (facteur ADEME : 0,220 kgCO₂e/kWh PCI)') },
                { t: t('resources.guideBilanCarbone.scope1.cat1.t', 'Combustion mobile'),         d: t('resources.guideBilanCarbone.scope1.cat1.d', 'Véhicules de la flotte (essence, diesel, GPL)'), ex: t('resources.guideBilanCarbone.scope1.cat1.ex', '20 véhicules diesel × 30 000 km × 0,168 kgCO₂e/km = 100 tCO₂e') },
                { t: t('resources.guideBilanCarbone.scope1.cat2.t', 'Émissions de process'),      d: t('resources.guideBilanCarbone.scope1.cat2.d', 'Réactions chimiques, fermentations, …'), ex: t('resources.guideBilanCarbone.scope1.cat2.ex', 'Pertinent industries : cimenterie, sidérurgie, agro') },
                { t: t('resources.guideBilanCarbone.scope1.cat3.t', 'Émissions fugitives'),       d: t('resources.guideBilanCarbone.scope1.cat3.d', 'Fuites de fluides frigorigènes (clim, frigos)'), ex: t('resources.guideBilanCarbone.scope1.cat3.ex', 'Recharge 5 kg R-410A → 10 tCO₂e (PRG = 2 088)') },
              ].map((s, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4">
                  <p className="font-bold text-gray-900 mb-1">{s.t}</p>
                  <p className="text-sm text-gray-600 mb-2">{s.d}</p>
                  <p className="text-xs text-gray-500 italic">{t('resources.guideBilanCarbone.scope1.examplePrefix', 'Exemple :')} {s.ex}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="scope-2" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Zap className="h-8 w-8 text-yellow-500" /> {t('resources.guideBilanCarbone.scope2.title', 'Scope 2 : énergie achetée')}
            </h2>
            <p><Trans i18nKey="resources.guideBilanCarbone.scope2.intro">Le <strong>Scope 2</strong> couvre les émissions <strong>indirectes</strong> liées à l'énergie consommée mais produite ailleurs : électricité, vapeur, chaleur, froid achetés à un fournisseur.</Trans></p>
            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">{t('resources.guideBilanCarbone.scope2.methodsTitle', 'Deux méthodes de comptabilisation')}</h3>
            <div className="grid md:grid-cols-2 gap-4 my-6">
              <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-5">
                <p className="font-bold text-blue-900 mb-2">{t('resources.guideBilanCarbone.scope2.locationTitle', 'Location-based')}</p>
                <p className="text-sm text-gray-700 mb-2"><Trans i18nKey="resources.guideBilanCarbone.scope2.locationDesc">Facteur d'émission moyen du <strong>mix électrique national</strong> où la consommation a lieu.</Trans></p>
                <p className="text-xs text-gray-500 italic">{t('resources.guideBilanCarbone.scope2.locationNote', 'France 2024 : 0,0571 kgCO₂e/kWh (très bas grâce au nucléaire). Allemagne : 0,338 kgCO₂e/kWh.')}</p>
              </div>
              <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-5">
                <p className="font-bold text-emerald-900 mb-2">{t('resources.guideBilanCarbone.scope2.marketTitle', 'Market-based')}</p>
                <p className="text-sm text-gray-700 mb-2"><Trans i18nKey="resources.guideBilanCarbone.scope2.marketDesc">Facteur d'émission <strong>contractuel</strong> : si vous avez signé un contrat d'origine renouvelable, vous pouvez compter 0 kgCO₂e.</Trans></p>
                <p className="text-xs text-gray-500 italic">{t('resources.guideBilanCarbone.scope2.marketNote', "Demande une preuve : Garantie d'Origine (GO) ou CPPA (Corporate Power Purchase Agreement).")}</p>
              </div>
            </div>
            <p><Trans i18nKey="resources.guideBilanCarbone.scope2.outro">La CSRD exige les <strong>deux méthodes</strong> reportées séparément (ESRS E1-6 §44). Le BEGES n'exige que la méthode location-based.</Trans></p>
          </section>

          <section id="scope-3" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Truck className="h-8 w-8 text-purple-500" /> {t('resources.guideBilanCarbone.scope3.title', 'Scope 3 : chaîne de valeur')}
            </h2>
            <p><Trans i18nKey="resources.guideBilanCarbone.scope3.intro">Le <strong>Scope 3</strong> couvre <strong>toutes les autres émissions indirectes</strong> dans la chaîne de valeur de l'entreprise — amont (achats, transport, déchets) et aval (usage, fin de vie des produits vendus). Le GHG Protocol définit <strong>15 catégories</strong>.</Trans></p>
            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">{t('resources.guideBilanCarbone.scope3.catsTitle', 'Les 15 catégories')}</h3>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left p-2 font-bold text-gray-700">{t('resources.guideBilanCarbone.scope3.th.cat', 'Cat.')}</th>
                    <th className="text-left p-2 font-bold text-gray-700">{t('resources.guideBilanCarbone.scope3.th.name', 'Nom')}</th>
                    <th className="text-left p-2 font-bold text-gray-700">{t('resources.guideBilanCarbone.scope3.th.desc', 'Description')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [1,  t('resources.guideBilanCarbone.scope3.cat1.name', 'Achats biens & services'),       t('resources.guideBilanCarbone.scope3.cat1.desc', 'Émissions des fournisseurs (biens ET services)'), true],
                    [2,  t('resources.guideBilanCarbone.scope3.cat2.name', "Biens d'équipement"),           t('resources.guideBilanCarbone.scope3.cat2.desc', 'CapEx : machines, bâtiments, IT durable')],
                    [3,  t('resources.guideBilanCarbone.scope3.cat3.name', 'Énergie hors S1/S2'),            t('resources.guideBilanCarbone.scope3.cat3.desc', 'Pertes réseau, extraction des combustibles fossiles')],
                    [4,  t('resources.guideBilanCarbone.scope3.cat4.name', 'Transport amont'),                t('resources.guideBilanCarbone.scope3.cat4.desc', 'Logistique entrante (camion, avion, bateau)')],
                    [5,  t('resources.guideBilanCarbone.scope3.cat5.name', 'Déchets générés'),                t('resources.guideBilanCarbone.scope3.cat5.desc', 'Tri, incinération, mise en décharge')],
                    [6,  t('resources.guideBilanCarbone.scope3.cat6.name', 'Déplacements pro'),               t('resources.guideBilanCarbone.scope3.cat6.desc', 'Avion, train, voiture des collaborateurs'), true],
                    [7,  t('resources.guideBilanCarbone.scope3.cat7.name', 'Trajets domicile-travail'),       t('resources.guideBilanCarbone.scope3.cat7.desc', 'Estimé par enquête salariés')],
                    [8,  t('resources.guideBilanCarbone.scope3.cat8.name', 'Actifs en leasing amont'),        t('resources.guideBilanCarbone.scope3.cat8.desc', 'Bâtiments loués, véhicules loués')],
                    [9,  t('resources.guideBilanCarbone.scope3.cat9.name', 'Transport aval'),                 t('resources.guideBilanCarbone.scope3.cat9.desc', 'Distribution des produits vendus')],
                    [10, t('resources.guideBilanCarbone.scope3.cat10.name', 'Transformation des produits'),    t('resources.guideBilanCarbone.scope3.cat10.desc', 'Pertinent pour fournisseurs B2B amont')],
                    [11, t('resources.guideBilanCarbone.scope3.cat11.name', 'Utilisation des produits'),       t('resources.guideBilanCarbone.scope3.cat11.desc', 'Énergie consommée par le produit vendu pendant sa vie'), true],
                    [12, t('resources.guideBilanCarbone.scope3.cat12.name', 'Fin de vie des produits'),        t('resources.guideBilanCarbone.scope3.cat12.desc', 'Tri, recyclage, incinération des produits vendus')],
                    [13, t('resources.guideBilanCarbone.scope3.cat13.name', 'Actifs en leasing aval'),         t('resources.guideBilanCarbone.scope3.cat13.desc', 'Si vous louez vos produits (ex : machines)')],
                    [14, t('resources.guideBilanCarbone.scope3.cat14.name', 'Franchises'),                     t('resources.guideBilanCarbone.scope3.cat14.desc', 'Émissions des franchisés')],
                    [15, t('resources.guideBilanCarbone.scope3.cat15.name', 'Investissements'),                t('resources.guideBilanCarbone.scope3.cat15.desc', 'Pertinent banques, fonds, assurances')],
                  ].map(([n, name, desc, hot], i) => (
                    <tr key={i} className={`border-b border-gray-100 ${hot ? 'bg-amber-50/40' : ''}`}>
                      <td className="p-2 font-mono font-bold">{n}</td>
                      <td className="p-2 font-semibold">{name}{hot ? ' 🔥' : ''}</td>
                      <td className="p-2 text-gray-600">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-500 italic mt-2">{t('resources.guideBilanCarbone.scope3.hotNote', '🔥 = catégories habituellement les plus émettrices pour une PME B2B française.')}</p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideBilanCarbone.scope3.methodsTitle', '3 méthodes de calcul (de la moins précise à la plus précise)')}</h3>
            <div className="space-y-3 my-6">
              <div className="border border-gray-200 rounded-xl p-4">
                <p className="font-bold text-gray-900 mb-1">{t('resources.guideBilanCarbone.scope3.method1.title', '1. Spend-based')}</p>
                <p className="text-sm text-gray-700 mb-2"><Trans i18nKey="resources.guideBilanCarbone.scope3.method1.desc">Multiplier les <strong>montants d'achat en €</strong> par un facteur d'émission monétaire (kgCO₂e/€).</Trans></p>
                <p className="text-xs text-gray-500">{t('resources.guideBilanCarbone.scope3.method1.note', '✅ Rapide : depuis votre FEC comptable. ❌ Précision moyenne : ±30 %.')}</p>
              </div>
              <div className="border border-gray-200 rounded-xl p-4">
                <p className="font-bold text-gray-900 mb-1">{t('resources.guideBilanCarbone.scope3.method2.title', '2. Average-data')}</p>
                <p className="text-sm text-gray-700 mb-2">{t('resources.guideBilanCarbone.scope3.method2.desc', "Quantités physiques (kg, m³, kWh) × facteurs d'émission moyens sectoriels.")}</p>
                <p className="text-xs text-gray-500">{t('resources.guideBilanCarbone.scope3.method2.note', '✅ Précision meilleure : ±15 %. ❌ Demande de connaître les volumes physiques.')}</p>
              </div>
              <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4">
                <p className="font-bold text-emerald-900 mb-1">{t('resources.guideBilanCarbone.scope3.method3.title', '3. Supplier-specific')}</p>
                <p className="text-sm text-gray-700 mb-2"><Trans i18nKey="resources.guideBilanCarbone.scope3.method3.desc">Facteur d'émission <strong>fourni par chaque fournisseur</strong> (issu de leur propre bilan).</Trans></p>
                <p className="text-xs text-gray-500">{t('resources.guideBilanCarbone.scope3.method3.note', "✅ Maximum de précision (±5%). ❌ Demande d'obtenir les bilans de chaque fournisseur — irréaliste pour un grand portefeuille.")}</p>
              </div>
            </div>

            <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl p-5 my-6">
              <p className="font-semibold text-emerald-900 mb-2">{t('resources.guideBilanCarbone.scope3.recoTitle', '💡 Recommandation ADEME')}</p>
              <p className="text-emerald-900 text-base"><Trans i18nKey="resources.guideBilanCarbone.scope3.recoBody">Pour un <strong>premier bilan</strong>, démarrer en spend-based sur les catégories 1, 4, 6, 9 (qui couvrent typiquement 70-90 % du Scope 3). Affiner ensuite en average-data ou supplier-specific sur les 3-5 plus gros postes. <strong>Pas la peine de viser la perfection au premier exercice</strong> — mieux vaut un bilan complet avec marge d'erreur que l'absence de bilan.</Trans></p>
            </div>
          </section>

          <section id="facteurs" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideBilanCarbone.facteurs.title', "Les facteurs d'émission ADEME Base Carbone®")}</h2>
            <p><Trans i18nKey="resources.guideBilanCarbone.facteurs.intro">La <strong>Base Carbone®</strong> de l'ADEME est le référentiel français officiel — c'est la source à utiliser en priorité pour un bilan en France. Elle contient ~5 000 facteurs d'émission, mise à jour annuellement (dernière version 2024.4).</Trans></p>
            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">{t('resources.guideBilanCarbone.facteurs.tableTitle', 'Quelques facteurs clés à connaître')}</h3>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left p-3 font-bold text-gray-700">{t('resources.guideBilanCarbone.facteurs.th.activity', 'Activité')}</th>
                    <th className="text-left p-3 font-bold text-gray-700">{t('resources.guideBilanCarbone.facteurs.th.unit', 'Unité')}</th>
                    <th className="text-right p-3 font-bold text-gray-700">{t('resources.guideBilanCarbone.facteurs.th.factor', 'Facteur kgCO₂e')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [t('resources.guideBilanCarbone.facteurs.r0.name', 'Électricité France (location-based)'), 'kWh', '0,0571'],
                    [t('resources.guideBilanCarbone.facteurs.r1.name', 'Gaz naturel'), 'kWh PCI', '0,2207'],
                    [t('resources.guideBilanCarbone.facteurs.r2.name', 'Fioul domestique'), t('resources.guideBilanCarbone.facteurs.unit.litre', 'litre'), '3,142'],
                    [t('resources.guideBilanCarbone.facteurs.r3.name', 'Essence (voiture)'), t('resources.guideBilanCarbone.facteurs.unit.litre', 'litre'), '2,68'],
                    [t('resources.guideBilanCarbone.facteurs.r4.name', 'Diesel (voiture)'), t('resources.guideBilanCarbone.facteurs.unit.litre', 'litre'), '3,07'],
                    [t('resources.guideBilanCarbone.facteurs.r5.name', 'Voiture diesel — usage'), 'km', '0,168'],
                    [t('resources.guideBilanCarbone.facteurs.r6.name', 'Avion court courrier (<1500 km)'), 'pax-km', '0,256'],
                    [t('resources.guideBilanCarbone.facteurs.r7.name', 'Avion long courrier (>3000 km)'), 'pax-km', '0,151'],
                    [t('resources.guideBilanCarbone.facteurs.r8.name', 'Train haute vitesse (France)'), 'pax-km', '0,00298'],
                    [t('resources.guideBilanCarbone.facteurs.r9.name', 'Repas standard avec viande'), t('resources.guideBilanCarbone.facteurs.unit.repas', 'repas'), '2,3'],
                    [t('resources.guideBilanCarbone.facteurs.r10.name', 'Achats prestations de service B2B (moyen)'), t('resources.guideBilanCarbone.facteurs.unit.euroHt', '€ HT'), '0,225'],
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="p-3">{row[0]}</td>
                      <td className="p-3 text-gray-500">{row[1]}</td>
                      <td className="p-3 text-right font-mono">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-500 italic">{t('resources.guideBilanCarbone.facteurs.source', 'Source : ADEME Base Carbone® 2024.4 · base-carbone.fr')}</p>
          </section>

          <section id="calcul-exemple" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideBilanCarbone.exemple.title', 'Exemple chiffré : PME de services 80 salariés')}</h2>
            <p>{t('resources.guideBilanCarbone.exemple.intro', "Cas pratique d'une PME française de conseil B2B, 80 salariés, 12 M€ de CA, basée en Île-de-France :")}</p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left p-3 font-bold text-gray-700">{t('resources.guideBilanCarbone.exemple.th.source', 'Source')}</th>
                    <th className="text-right p-3 font-bold text-gray-700">{t('resources.guideBilanCarbone.exemple.th.quantity', 'Quantité')}</th>
                    <th className="text-right p-3 font-bold text-gray-700">{t('resources.guideBilanCarbone.exemple.th.factor', 'Facteur')}</th>
                    <th className="text-right p-3 font-bold text-gray-700">{t('resources.guideBilanCarbone.exemple.th.tco2e', 'tCO₂e')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-orange-50/50 border-b border-gray-100">
                    <td colSpan={4} className="p-2 font-bold text-orange-900">{t('resources.guideBilanCarbone.exemple.group1', 'Scope 1 — Émissions directes')}</td>
                  </tr>
                  <tr className="border-b border-gray-100"><td className="p-3">{t('resources.guideBilanCarbone.exemple.s1row1', 'Chaudière gaz (chauffage bureaux)')}</td><td className="p-3 text-right">120 000 kWh</td><td className="p-3 text-right text-gray-500">0,2207</td><td className="p-3 text-right font-mono">26,5</td></tr>
                  <tr className="border-b border-gray-100"><td className="p-3">{t('resources.guideBilanCarbone.exemple.s1row2', 'Véhicules société (5 voitures)')}</td><td className="p-3 text-right">125 000 km</td><td className="p-3 text-right text-gray-500">0,168</td><td className="p-3 text-right font-mono">21,0</td></tr>

                  <tr className="bg-yellow-50/50 border-b border-gray-100">
                    <td colSpan={4} className="p-2 font-bold text-yellow-900">{t('resources.guideBilanCarbone.exemple.group2', 'Scope 2 — Énergie achetée (location-based)')}</td>
                  </tr>
                  <tr className="border-b border-gray-100"><td className="p-3">{t('resources.guideBilanCarbone.exemple.s2row1', 'Électricité bureaux')}</td><td className="p-3 text-right">180 000 kWh</td><td className="p-3 text-right text-gray-500">0,0571</td><td className="p-3 text-right font-mono">10,3</td></tr>

                  <tr className="bg-purple-50/50 border-b border-gray-100">
                    <td colSpan={4} className="p-2 font-bold text-purple-900">{t('resources.guideBilanCarbone.exemple.group3', 'Scope 3 — Chaîne de valeur (top postes)')}</td>
                  </tr>
                  <tr className="border-b border-gray-100"><td className="p-3">{t('resources.guideBilanCarbone.exemple.s3row1', 'Cat. 1 — Achats biens & services (FEC spend-based)')}</td><td className="p-3 text-right">8,5 M€</td><td className="p-3 text-right text-gray-500">0,225</td><td className="p-3 text-right font-mono">1 912</td></tr>
                  <tr className="border-b border-gray-100"><td className="p-3">{t('resources.guideBilanCarbone.exemple.s3row2', 'Cat. 6 — Déplacements pro (avion court)')}</td><td className="p-3 text-right">450 000 pax-km</td><td className="p-3 text-right text-gray-500">0,256</td><td className="p-3 text-right font-mono">115</td></tr>
                  <tr className="border-b border-gray-100"><td className="p-3">{t('resources.guideBilanCarbone.exemple.s3row3', 'Cat. 7 — Domicile-travail')}</td><td className="p-3 text-right">~1,2 M km</td><td className="p-3 text-right text-gray-500">{t('resources.guideBilanCarbone.exemple.s3row3factor', '0,168 (moyen)')}</td><td className="p-3 text-right font-mono">200</td></tr>
                  <tr className="border-b border-gray-100"><td className="p-3">{t('resources.guideBilanCarbone.exemple.s3row4', 'Cat. 5 — Déchets bureautiques')}</td><td className="p-3 text-right">{t('resources.guideBilanCarbone.exemple.s3row4qty', '8 t papier')}</td><td className="p-3 text-right text-gray-500">~0,5 t/t</td><td className="p-3 text-right font-mono">4</td></tr>

                  <tr className="bg-emerald-50/70 border-t-2 border-emerald-300">
                    <td colSpan={3} className="p-3 text-right font-bold text-emerald-900">{t('resources.guideBilanCarbone.exemple.total', 'TOTAL')}</td>
                    <td className="p-3 text-right font-mono font-extrabold text-emerald-900 text-base">2 289 tCO₂e</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 my-6">
              <p className="font-semibold text-blue-900 mb-2">{t('resources.guideBilanCarbone.exemple.readingTitle', '📊 Lecture du résultat')}</p>
              <ul className="text-blue-900 text-sm space-y-1 list-disc list-inside">
                <li><Trans i18nKey="resources.guideBilanCarbone.exemple.reading1">Total : 2 289 tCO₂e — soit <strong>28,6 tCO₂e/salarié</strong>, dans la moyenne sectorielle services B2B (25-40 tCO₂e/sal.)</Trans></li>
                <li><Trans i18nKey="resources.guideBilanCarbone.exemple.reading2">Le <strong>Scope 3 représente 99,4 %</strong> du bilan (2 231 tCO₂e). Le négliger ferait passer à côté de l'essentiel.</Trans></li>
                <li><Trans i18nKey="resources.guideBilanCarbone.exemple.reading3">La <strong>catégorie 1 du Scope 3</strong> (achats) = 84 % du total. <strong>Le levier prioritaire est l'engagement fournisseurs.</strong></Trans></li>
                <li><Trans i18nKey="resources.guideBilanCarbone.exemple.reading4">Les Scopes 1+2 (58 tCO₂e) représentent seulement 2,5 % — mais sont les plus rapides à réduire (chaudière, voiture, contrat élec vert).</Trans></li>
              </ul>
            </div>
          </section>

          <section id="reduction" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideBilanCarbone.reduction.title', 'Réduction & trajectoire SBTi')}</h2>
            <p><Trans i18nKey="resources.guideBilanCarbone.reduction.intro">Mesurer ne suffit pas — il faut <strong>réduire</strong>. La méthodologie <strong>SBTi (Science-Based Targets initiative)</strong> est la référence mondiale pour fixer des objectifs de réduction alignés avec l'Accord de Paris (limiter le réchauffement à 1,5°C).</Trans></p>
            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">{t('resources.guideBilanCarbone.reduction.commitmentsTitle', 'Les engagements types')}</h3>
            <ul className="space-y-2 my-4 list-disc list-inside">
              <li><Trans i18nKey="resources.guideBilanCarbone.reduction.commit1"><strong>Trajectoire 1,5°C</strong> : -42 % d'émissions Scope 1+2 d'ici 2030 (vs année de base)</Trans></li>
              <li><Trans i18nKey="resources.guideBilanCarbone.reduction.commit2"><strong>Engagement net-zéro 2050</strong> : -90 % d'émissions absolues + neutralisation du résidu via captage carbone</Trans></li>
              <li><Trans i18nKey="resources.guideBilanCarbone.reduction.commit3"><strong>Engagement Scope 3</strong> : -25 % d'émissions Scope 3 d'ici 2030 (souvent par catégorie)</Trans></li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideBilanCarbone.reduction.leversTitle', 'Les 5 leviers de réduction prioritaires')}</h3>
            <ol className="space-y-2 my-4 list-decimal list-inside">
              <li><Trans i18nKey="resources.guideBilanCarbone.reduction.lever1"><strong>Efficacité énergétique</strong> : isolation, LED, GTB, sobriété — généralement -10 à -25 % sur Scopes 1+2 en 2-3 ans</Trans></li>
              <li><Trans i18nKey="resources.guideBilanCarbone.reduction.lever2"><strong>Électrification</strong> : remplacer combustion fossile par électricité (chaudière → pompe à chaleur, diesel → VE)</Trans></li>
              <li><Trans i18nKey="resources.guideBilanCarbone.reduction.lever3"><strong>Contrat d'électricité renouvelable</strong> : passe Scope 2 market-based à ~0. Attention : pas une vraie réduction physique mais comptable légitime.</Trans></li>
              <li><Trans i18nKey="resources.guideBilanCarbone.reduction.lever4"><strong>Engagement fournisseurs Scope 3</strong> : exiger un bilan carbone, fixer des cibles contractuelles, basculer vers fournisseurs bas-carbone</Trans></li>
              <li><Trans i18nKey="resources.guideBilanCarbone.reduction.lever5"><strong>Sobriété</strong> : réduire les volumes (moins d'avion, plus de visio, télétravail, mutualisation transports)</Trans></li>
            </ol>
          </section>

          <section id="esgflow" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideBilanCarbone.esgflow.title', 'Faire son bilan carbone avec ESG Flow')}</h2>
            <p><Trans i18nKey="resources.guideBilanCarbone.esgflow.intro">ESG Flow inclut un module bilan carbone <strong>conforme GHG Protocol et BEGES</strong> dans tous les plans payants (dès 249 €/mois). Les avantages :</Trans></p>
            <div className="grid md:grid-cols-2 gap-4 my-8">
              {[
                { icon: Factory,    t: t('resources.guideBilanCarbone.esgflow.feat0.t', 'Scopes 1/2/3 GHG Protocol'),  d: t('resources.guideBilanCarbone.esgflow.feat0.d', 'Les 3 scopes avec les 15 catégories Scope 3 selon le standard mondial.') },
                { icon: TrendingUp, t: t('resources.guideBilanCarbone.esgflow.feat1.t', 'Facteurs ADEME 2024'),         d: t('resources.guideBilanCarbone.esgflow.feat1.d', 'Base Carbone® française intégrée + Climatiq pour le Scope 3 international.') },
                { icon: Truck,      t: t('resources.guideBilanCarbone.esgflow.feat2.t', 'Import FEC scope 3 spend'),    d: t('resources.guideBilanCarbone.esgflow.feat2.d', 'Importez votre FEC comptable, le Scope 3 spend-based est calculé en 2 min.') },
                { icon: Zap,        t: t('resources.guideBilanCarbone.esgflow.feat3.t', 'Connecteur Enedis Scope 2'),   d: t('resources.guideBilanCarbone.esgflow.feat3.d', 'Consommation électrique automatisée par site, méthode location & market based.') },
                { icon: FileText,   t: t('resources.guideBilanCarbone.esgflow.feat4.t', 'Rapport BEGES + ESRS E1'),     d: t('resources.guideBilanCarbone.esgflow.feat4.d', 'Export PDF compatible plateforme BEGES ADEME et CSRD audité.') },
                { icon: AlertTriangle, t: t('resources.guideBilanCarbone.esgflow.feat5.t', 'Alertes trajectoire SBTi'), d: t('resources.guideBilanCarbone.esgflow.feat5.d', 'Suivi automatique de votre alignement 1,5°C avec rappels annuels.') },
              ].map((f, i) => {
                const I = f.icon;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center"><I className="h-5 w-5" /></div>
                    <div>
                      <p className="font-bold text-gray-900 mb-1">{f.t}</p>
                      <p className="text-base text-gray-600">{f.d}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="my-8 p-6 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl text-white">
              <h3 className="text-2xl font-bold mb-2">{t('resources.guideBilanCarbone.esgflow.ctaTitle', 'Tester sur vos vraies données')}</h3>
              <p className="text-emerald-50 mb-5">{t('resources.guideBilanCarbone.esgflow.ctaBody', 'Importez votre FEC, on calcule votre Scope 3 en moins de 5 minutes. Essai 14 jours gratuit ETI, sans CB.')}</p>
              <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-emerald-700 font-bold text-sm hover:bg-emerald-50">
                {t('resources.guideBilanCarbone.esgflow.ctaButton', 'Démarrer mon essai')} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <section id="faq" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{t('resources.guideBilanCarbone.faq.title', 'Questions fréquentes')}</h2>
            <div className="space-y-4">
              {[
                { q: t('resources.guideBilanCarbone.faq.0.q', "Qui est obligé·e de faire un bilan carbone en France ?"), a: t('resources.guideBilanCarbone.faq.0.a', "Entreprises >500 salariés (250 outre-mer), personnes morales publiques >250 personnes, collectivités >50 000 habitants. Article L229-25 du Code de l'environnement.") },
                { q: t('resources.guideBilanCarbone.faq.1.q', "Quelle différence entre BEGES réglementaire et bilan carbone ADEME ?"), a: t('resources.guideBilanCarbone.faq.1.a', "Le BEGES est l'obligation légale française portant sur Scopes 1+2 minimum. Le bilan carbone ADEME est une méthodologie plus large (1+2+3) recommandée mais non obligatoire sauf CSRD.") },
                { q: t('resources.guideBilanCarbone.faq.2.q', "Quel est le Scope 3 le plus important à traiter ?"), a: t('resources.guideBilanCarbone.faq.2.a', "Pour une PME B2B de services : catégories 1 (achats) et 6 (déplacements pro) = 60-80 %. Pour l'industrie : catégories 1 (matières premières) et 11 (usage produit vendu).") },
                { q: t('resources.guideBilanCarbone.faq.3.q', "Faut-il faire le bilan carbone tous les ans ?"), a: t('resources.guideBilanCarbone.faq.3.a', "BEGES tous les 4 ans (entreprises). CSRD : annuel. Mieux : suivi mensuel des principaux postes pour piloter en continu.") },
                { q: t('resources.guideBilanCarbone.faq.4.q', "Quelle pénalité en cas d'absence de bilan carbone ?"), a: t('resources.guideBilanCarbone.faq.4.a', "Amende administrative jusqu'à 10 000 € (50 000 € en récidive). Appliquée depuis 2019, ~15 entreprises/an sanctionnées.") },
                { q: t('resources.guideBilanCarbone.faq.5.q', "Comment calculer son Scope 3 quand on n'a pas toutes les données ?"), a: t('resources.guideBilanCarbone.faq.5.a', "Méthode spend-based : montants d'achat (FEC) × facteur monétaire ADEME. Précision moyenne mais légalement acceptée pour un premier bilan.") },
                { q: t('resources.guideBilanCarbone.faq.6.q', "Quel logiciel pour faire son bilan carbone ?"), a: t('resources.guideBilanCarbone.faq.6.a', "ESG Flow inclut le bilan carbone GHG Protocol avec facteurs ADEME 2024 dès le plan PME (249 €/mois). Concurrents : Greenly, Sweep, Sami, Carbonfact.") },
                { q: t('resources.guideBilanCarbone.faq.7.q', "Combien de temps prend un bilan carbone complet ?"), a: t('resources.guideBilanCarbone.faq.7.a', "Premier bilan : 6-10 semaines (collecte = 70 % du temps). Bilans suivants : 2-3 semaines si automatisé via connecteurs.") },
              ].map((item, i) => (
                <details key={i} className="group border border-gray-200 rounded-xl overflow-hidden hover:border-emerald-300 transition-colors">
                  <summary className="flex items-start justify-between cursor-pointer p-5 hover:bg-gray-50 transition-colors">
                    <p className="font-semibold text-gray-900 pr-8">{item.q}</p>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-open:rotate-90 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-5 pb-5 text-gray-600 text-base">{item.a}</div>
                </details>
              ))}
            </div>
          </section>

          <section className="mt-16 pt-12 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('resources.guideBilanCarbone.more.title', 'Pour aller plus loin')}</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <Link to="/guide/csrd-pme" className="block p-5 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all">
                <p className="font-bold text-gray-900 mb-1">{t('resources.guideBilanCarbone.more.0.title', 'Guide CSRD complet')}</p>
                <p className="text-sm text-gray-500">{t('resources.guideBilanCarbone.more.0.desc', 'Comprendre la directive et les 12 normes ESRS')}</p>
              </Link>
              <Link to="/guide/scope3-fec" className="block p-5 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all">
                <p className="font-bold text-gray-900 mb-1">{t('resources.guideBilanCarbone.more.1.title', 'Scope 3 par import FEC')}</p>
                <p className="text-sm text-gray-500">{t('resources.guideBilanCarbone.more.1.desc', 'Méthode spend-based en 15 minutes')}</p>
              </Link>
              <Link to="/guide/taxonomie" className="block p-5 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all">
                <p className="font-bold text-gray-900 mb-1">{t('resources.guideBilanCarbone.more.2.title', 'Taxonomie UE en pratique')}</p>
                <p className="text-sm text-gray-500">{t('resources.guideBilanCarbone.more.2.desc', 'CapEx & OpEx alignés sur les 6 objectifs')}</p>
              </Link>
            </div>
          </section>
        </article>
      </div>

      <footer className="bg-gray-50 border-t border-gray-200 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <LogoBrand size="sm" variant="dark" showTagline={false} />
          <p className="text-sm text-gray-500 mt-4 mb-6">{t('resources.guideBilanCarbone.footer.tagline', 'La plateforme ESG des PME et ETI françaises')}</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <Link to="/pricing" className="hover:text-emerald-600">{t('resources.guideBilanCarbone.footer.pricing', 'Tarifs')}</Link>
            <Link to="/security" className="hover:text-emerald-600">{t('resources.guideBilanCarbone.footer.security', 'Sécurité')}</Link>
            <Link to="/status" className="hover:text-emerald-600">{t('resources.guideBilanCarbone.footer.status', 'Statut')}</Link>
            <Link to="/privacy-policy" className="hover:text-emerald-600">{t('resources.guideBilanCarbone.footer.privacy', 'Confidentialité')}</Link>
          </div>
          <p className="text-xs text-gray-400 mt-6">{t('resources.guideBilanCarbone.footer.copyright', '© 2026 GreenConnect SAS — ESG Flow')}</p>
        </div>
      </footer>
    </div>
  );
}
