/**
 * Pillar SEO #3 — CSDDD : devoir de vigilance fournisseurs.
 * URL : /guide/csddd-supply-chain
 * Cible : "CSDDD obligations PME", "devoir de vigilance supply chain",
 *         "directive 2024/1760", "audit fournisseurs RSE".
 */
import { Link } from 'react-router-dom';
import {
  CheckCircle2, Calendar, BookOpen, ArrowRight, ChevronRight, Download,
  Shield, Users, AlertTriangle, Factory, Globe, Scale, FileText,
} from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import type { TFunction } from 'i18next';
import { LogoBrand } from '@/components/common/Logo';
import { usePageSeo } from '@/hooks/usePageSeo';

const getTOC = (t: TFunction) => [
  { id: 'intro',         title: t('resources.guideCsddd.toc.intro', 'En 30 secondes') },
  { id: 'definition',    title: t('resources.guideCsddd.toc.definition', "Qu'est-ce que la CSDDD ?") },
  { id: 'periodes',      title: t('resources.guideCsddd.toc.periodes', "Calendrier d'application") },
  { id: 'qui',           title: t('resources.guideCsddd.toc.qui', 'Qui est concerné·e ?') },
  { id: 'obligations',   title: t('resources.guideCsddd.toc.obligations', 'Les 6 obligations clés') },
  { id: 'ruissellement', title: t('resources.guideCsddd.toc.ruissellement', "L'effet sur les PME") },
  { id: 'sanctions',     title: t('resources.guideCsddd.toc.sanctions', 'Sanctions & responsabilité civile') },
  { id: 'methode',       title: t('resources.guideCsddd.toc.methode', 'Méthode en 7 étapes') },
  { id: 'esgflow',       title: t('resources.guideCsddd.toc.esgflow', 'Mettre en place avec ESG Flow') },
  { id: 'faq',           title: t('resources.guideCsddd.toc.faq', 'FAQ') },
];

export default function GuideCsdddPage() {
  const { t } = useTranslation();
  const TOC = getTOC(t);
  const url = 'https://greenconnect.cloud/guide/csddd-supply-chain';
  const img = 'https://greenconnect.cloud/api/v1/og/guide-csddd.png';
  const desc = t('resources.guideCsddd.seo.description', "Comprendre la CSDDD (directive devoir de vigilance UE 2024/1760) : obligations, calendrier, sanctions, méthode en 7 étapes pour PME et ETI. Effet de ruissellement sur les fournisseurs des grands groupes, lien avec CSRD ESRS S2.");

  usePageSeo({
    id: 'guide-csddd',
    title: t('resources.guideCsddd.seo.title', 'CSDDD — guide complet du devoir de vigilance fournisseurs · ESG Flow'),
    description: desc,
    keywords: t('resources.guideCsddd.seo.keywords', 'CSDDD, devoir de vigilance, directive 2024/1760, supply chain, audit fournisseurs, ESRS S2, droits humains, due diligence, loi vigilance, PME ETI'),
    url,
    ogType: 'article',
    ogTitle: t('resources.guideCsddd.seo.ogTitle', 'CSDDD : devoir de vigilance fournisseurs — guide PME / ETI'),
    ogImage: img,
    ogImageAlt: t('resources.guideCsddd.seo.ogImageAlt', 'CSDDD — guide du devoir de vigilance fournisseurs pour PME et ETI'),
    breadcrumb: [
      { name: t('resources.guideCsddd.breadcrumb.home', 'Accueil'),     url: 'https://greenconnect.cloud/' },
      { name: t('resources.guideCsddd.breadcrumb.resources', 'Ressources'),  url: 'https://greenconnect.cloud/resources' },
      { name: t('resources.guideCsddd.breadcrumb.guide', 'Guide CSDDD'), url },
    ],
    articleJsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "CSDDD : devoir de vigilance fournisseurs — guide pour PME et ETI françaises",
      "description": desc,
      "image": [img],
      "datePublished": "2026-05-20T08:00:00+02:00",
      "dateModified": "2026-05-20T08:00:00+02:00",
      "author":    { "@type": "Organization", "name": "ESG Flow", "url": "https://greenconnect.cloud" },
      "publisher": { "@type": "Organization", "name": "GreenConnect SAS",
                     "logo": { "@type": "ImageObject", "url": "https://greenconnect.cloud/brand/icon-esgflow-v3-256.png", "width": 256, "height": 256 } },
      "mainEntityOfPage": { "@type": "WebPage", "@id": url },
      "inLanguage": "fr-FR",
      "isAccessibleForFree": true,
      "keywords": "CSDDD, devoir de vigilance, directive 2024/1760, supply chain, ESRS S2, audit fournisseurs",
      "articleSection": ["CSDDD", "Devoir de vigilance", "Supply chain ESG"],
    },
    faqJsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "Ma PME de 100 salariés est-elle soumise à la CSDDD ?",
          "acceptedAnswer": { "@type": "Answer", "text": "Directement, non — la CSDDD ne s'applique qu'aux entreprises >1 000 salariés et >450 M€ de CA. MAIS si vous êtes fournisseur·euse d'un grand groupe soumis, ce dernier doit auditer ses fournisseurs : vous recevrez un questionnaire CSDDD." } },
        { "@type": "Question", "name": "Quelle différence entre CSDDD et loi française devoir de vigilance ?",
          "acceptedAnswer": { "@type": "Answer", "text": "La loi française de 2017 cible ~250 grandes entreprises FR. La CSDDD étend à ~6 000 entreprises UE avec un cadre harmonisé, des sanctions plus fortes, et une responsabilité civile élargie. Les deux coexistent jusqu'à fin 2027." } },
        { "@type": "Question", "name": "Quel calendrier d'application de la CSDDD ?",
          "acceptedAnswer": { "@type": "Answer", "text": "Vague 1 (5 000+ sal., 1,5 Md€ CA) : 26 juillet 2027. Vague 2 (3 000+ sal., 900 M€) : 26 juillet 2028. Vague 3 (1 000+ sal., 450 M€) : 26 juillet 2029." } },
        { "@type": "Question", "name": "Quelles sanctions en cas de manquement à la CSDDD ?",
          "acceptedAnswer": { "@type": "Answer", "text": "Amendes administratives jusqu'à 5 % du chiffre d'affaires mondial net. Naming and shaming public obligatoire. Responsabilité civile élargie : actions en réparation possibles par les victimes du préjudice." } },
        { "@type": "Question", "name": "Comment ESG Flow aide à se conformer à la CSDDD ?",
          "acceptedAnswer": { "@type": "Answer", "text": "Module Supply Chain ESG inclus dès le plan PME (249 €/mois) : cartographie fournisseurs, questionnaires d'audit social et environnemental, suivi des plans d'action, registre de plaintes. Conforme ESRS S2." } },
      ]
    },
  });

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" aria-label={t('resources.guideCsddd.nav.homeAria', 'ESG Flow — Accueil')}><LogoBrand size="sm" variant="dark" showTagline={false} /></Link>
          <Link to="/register" className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">{t('resources.guideCsddd.nav.freeTrial', 'Essai gratuit')} →</Link>
        </div>
      </header>

      <section className="bg-gradient-to-br from-violet-50 via-white to-blue-50 py-16 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-xs font-bold mb-6">
            <BookOpen className="h-3.5 w-3.5" /> {t('resources.guideCsddd.hero.badge', 'GUIDE EXPERT · 18 MIN DE LECTURE')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            {t('resources.guideCsddd.hero.titleLine1', 'CSDDD — le devoir de vigilance')}<br /><span className="text-violet-600">{t('resources.guideCsddd.hero.titleLine2', 'qui force toute la supply chain')}</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed mb-8">
            <Trans i18nKey="resources.guideCsddd.hero.subtitle">
              La directive UE 2024/1760 oblige les grands groupes à auditer leurs fournisseurs sur les droits humains et l'environnement.
              Conséquence directe : <strong>même votre PME va recevoir un questionnaire</strong> dès 2027. Voici comment vous préparer.
            </Trans>
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {t('resources.guideCsddd.hero.meta0', 'Mis à jour mai 2026')}</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {t('resources.guideCsddd.hero.meta1', 'Directive 2024/1760')}</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {t('resources.guideCsddd.hero.meta2', 'Lien ESRS S2 / loi 2017')}</span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1" aria-label={t('resources.guideCsddd.aside.tocAria', 'Sommaire')}>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t('resources.guideCsddd.aside.tocHeading', 'Sommaire')}</h2>
            {TOC.map(item => (
              <a key={item.id} href={`#${item.id}`}
                 className="block text-sm text-gray-600 hover:text-violet-600 py-1.5 border-l-2 border-transparent hover:border-violet-500 pl-3 transition-all">
                {item.title}
              </a>
            ))}
            <div className="mt-6 p-4 bg-violet-50 rounded-xl border border-violet-200">
              <p className="text-xs font-semibold text-violet-700 mb-2">{t('resources.guideCsddd.aside.checklistTitle', 'Check-list CSRD/ESRS')}</p>
              <p className="text-xs text-gray-600 mb-3">{t('resources.guideCsddd.aside.checklistDesc', '47 indicateurs prioritaires dont ESRS S2 (chaîne de valeur) au format PDF.')}</p>
              <Link to="/ressources/checklist-csrd" className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:text-violet-800">
                <Download className="h-3.5 w-3.5" />{t('resources.guideCsddd.aside.checklistCta', 'Télécharger')}
              </Link>
            </div>
          </nav>
        </aside>

        <article className="prose prose-lg max-w-none text-gray-700 leading-relaxed">

          <section id="intro" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsddd.intro.heading', 'En 30 secondes')}</h2>
            <div className="bg-violet-50 border-l-4 border-violet-500 rounded-r-xl p-5 my-6">
              <p className="font-semibold text-violet-900 mb-2">{t('resources.guideCsddd.intro.tldrLabel', '⚡ TL;DR')}</p>
              <ul className="space-y-1.5 text-violet-900 text-base list-disc list-inside">
                <li><Trans i18nKey="resources.guideCsddd.intro.item0">La <strong>CSDDD</strong> (Corporate Sustainability Due Diligence Directive, UE 2024/1760) impose aux grandes entreprises un <strong>devoir de vigilance sur l'ensemble de leur chaîne de valeur</strong> — droits humains ET environnement.</Trans></li>
                <li><Trans i18nKey="resources.guideCsddd.intro.item1">Vague 1 applicable au <strong>26 juillet 2027</strong> (5 000+ salariés ou 1,5 Md€ CA), puis 2028 et 2029.</Trans></li>
                <li><Trans i18nKey="resources.guideCsddd.intro.item2">Sanctions : amendes jusqu'à <strong>5 % du CA mondial</strong> + responsabilité civile élargie + naming and shaming public.</Trans></li>
                <li><Trans i18nKey="resources.guideCsddd.intro.item3">L'effet de ruissellement : les grands groupes soumis vont <strong>auditer leurs fournisseurs PME/ETI</strong> via des questionnaires standardisés (type EcoVadis, Sedex, VendorESG).</Trans></li>
                <li><Trans i18nKey="resources.guideCsddd.intro.item4">Lien fort avec <strong>ESRS S2</strong> (CSRD) : « Travailleurs de la chaîne de valeur » — mêmes données, double usage.</Trans></li>
                <li><Trans i18nKey="resources.guideCsddd.intro.item5">La loi française <strong>devoir de vigilance de 2017</strong> reste applicable jusqu'à transposition complète CSDDD (~2027).</Trans></li>
              </ul>
            </div>
          </section>

          <section id="definition" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsddd.definition.heading', "Qu'est-ce que la CSDDD ?")}</h2>
            <p><Trans i18nKey="resources.guideCsddd.definition.p1">La <strong>Corporate Sustainability Due Diligence Directive</strong> (CSDDD ou CS3D) est une directive européenne adoptée le 13 juin 2024 et publiée au JOUE le 5 juillet 2024 sous la référence <strong>2024/1760</strong>. Elle impose aux grandes entreprises de l'UE (et à certaines entreprises non-UE actives en UE) une <strong>obligation positive de prévenir, identifier, atténuer, faire cesser et réparer</strong> les impacts négatifs sur les droits humains et l'environnement dans leurs <strong>chaînes d'activités</strong> (activités propres + amont + aval limité).</Trans></p>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 my-6">
              <p className="font-semibold text-blue-900 mb-2">{t('resources.guideCsddd.definition.boxTitle', '📚 Distinction CSDDD vs CSRD')}</p>
              <ul className="text-blue-900 text-sm space-y-1 list-disc list-inside">
                <li><Trans i18nKey="resources.guideCsddd.definition.boxItem0"><strong>CSRD</strong> = obligation de <strong>publier des informations</strong> ESG (transparency)</Trans></li>
                <li><Trans i18nKey="resources.guideCsddd.definition.boxItem1"><strong>CSDDD</strong> = obligation d'<strong>agir</strong> sur les impacts identifiés (due diligence)</Trans></li>
              </ul>
              <p className="text-blue-900 text-sm mt-2">{t('resources.guideCsddd.definition.boxFooter', 'Les deux directives sont complémentaires et se nourrissent mutuellement : ce que vous publiez sous CSRD ESRS S2 doit refléter ce que vous faites sous CSDDD.')}</p>
            </div>
          </section>

          <section id="periodes" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsddd.periodes.heading', "Calendrier d'application")}</h2>
            <p>{t('resources.guideCsddd.periodes.intro', 'La CSDDD entre progressivement en application sur 3 ans, selon la taille des entreprises :')}</p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left p-3 font-bold text-gray-700">{t('resources.guideCsddd.periodes.colWave', 'Vague')}</th>
                    <th className="text-left p-3 font-bold text-gray-700">{t('resources.guideCsddd.periodes.colScope', 'Périmètre')}</th>
                    <th className="text-left p-3 font-bold text-gray-700">{t('resources.guideCsddd.periodes.colDate', "Date d'application")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 bg-violet-50/30">
                    <td className="p-3 font-semibold">{t('resources.guideCsddd.periodes.wave1', 'Vague 1')}</td>
                    <td className="p-3"><Trans i18nKey="resources.guideCsddd.periodes.wave1Scope"><strong>5 000+ salariés</strong> ET 1 500 M€ de CA mondial net</Trans></td>
                    <td className="p-3"><Trans i18nKey="resources.guideCsddd.periodes.wave1Date">26 juillet <strong>2027</strong></Trans></td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="p-3 font-semibold">{t('resources.guideCsddd.periodes.wave2', 'Vague 2')}</td>
                    <td className="p-3">{t('resources.guideCsddd.periodes.wave2Scope', '3 000+ salariés ET 900 M€ de CA')}</td>
                    <td className="p-3">{t('resources.guideCsddd.periodes.wave2Date', '26 juillet 2028')}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="p-3 font-semibold">{t('resources.guideCsddd.periodes.wave3', 'Vague 3')}</td>
                    <td className="p-3">{t('resources.guideCsddd.periodes.wave3Scope', '1 000+ salariés ET 450 M€ de CA')}</td>
                    <td className="p-3">{t('resources.guideCsddd.periodes.wave3Date', '26 juillet 2029')}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">{t('resources.guideCsddd.periodes.nonEu', 'Sociétés non-UE')}</td>
                    <td className="p-3">{t('resources.guideCsddd.periodes.nonEuScope', 'CA UE > 450 M€')}</td>
                    <td className="p-3">{t('resources.guideCsddd.periodes.nonEuDate', 'selon vague équivalente')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-500 italic">{t('resources.guideCsddd.periodes.note', 'Note : la transposition CSDDD en droit français doit intervenir avant le 26 juillet 2026. La loi française devoir de vigilance de 2017 sera modifiée ou remplacée à cette occasion.')}</p>
          </section>

          <section id="qui" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsddd.qui.heading', 'Qui est concerné·e ?')}</h2>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">{t('resources.guideCsddd.qui.directHeading', 'Directement (~6 000 entreprises UE)')}</h3>
            <p><Trans i18nKey="resources.guideCsddd.qui.directIntro">Toutes les entreprises de l'UE qui, sur 2 exercices consécutifs, dépassent <strong>cumulativement</strong> :</Trans></p>
            <ul className="space-y-2 my-4 list-disc list-inside">
              <li><Trans i18nKey="resources.guideCsddd.qui.directItem0">Le seuil de salariés <em>moyens annuels</em> (1 000+ dans la vague finale)</Trans></li>
              <li>{t('resources.guideCsddd.qui.directItem1', 'Le seuil de CA mondial net (450 M€+ dans la vague finale)')}</li>
            </ul>
            <p>{t('resources.guideCsddd.qui.directFooter', 'Plus les sociétés non-UE qui réalisent > 450 M€ de CA dans l\'UE.')}</p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsddd.qui.indirectHeading', "Indirectement (~plusieurs centaines de milliers d'entreprises UE — dont votre PME)")}</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 my-6">
              <p className="font-semibold text-amber-900 mb-2">{t('resources.guideCsddd.qui.dominoTitle', "⚠ L'effet domino qui vous concerne")}</p>
              <p className="text-amber-900 text-base"><Trans i18nKey="resources.guideCsddd.qui.dominoBody">Les entreprises soumises doivent identifier et auditer leurs <strong>partenaires commerciaux directs ET indirects</strong>. Concrètement, si vous fournissez Carrefour, Total, EDF, Orange, Decathlon ou Bouygues, ils vont vous envoyer un questionnaire d'audit CSDDD dès 2027 — et conditionner le renouvellement du contrat à votre conformité.</Trans></p>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsddd.qui.sectorsHeading', 'Mes secteurs à très forte exposition')}</h3>
            <div className="grid sm:grid-cols-2 gap-3 my-6">
              {[
                { icon: Factory,   t: t('resources.guideCsddd.qui.sectors.0.t', 'Textile & habillement'),   d: t('resources.guideCsddd.qui.sectors.0.d', 'Risque travail forcé fournisseurs Asie') },
                { icon: Globe,     t: t('resources.guideCsddd.qui.sectors.1.t', 'Agroalimentaire'),          d: t('resources.guideCsddd.qui.sectors.1.d', 'Risque déforestation amont') },
                { icon: Users,     t: t('resources.guideCsddd.qui.sectors.2.t', 'Service à la personne'),    d: t('resources.guideCsddd.qui.sectors.2.d', 'Risque sous-traitance précaire') },
                { icon: AlertTriangle, t: t('resources.guideCsddd.qui.sectors.3.t', 'Mines & métaux'),       d: t('resources.guideCsddd.qui.sectors.3.d', 'Risque conflit, droits autochtones') },
                { icon: Factory,   t: t('resources.guideCsddd.qui.sectors.4.t', 'Construction'),             d: t('resources.guideCsddd.qui.sectors.4.d', 'Risque travail des migrants') },
                { icon: Globe,     t: t('resources.guideCsddd.qui.sectors.5.t', 'Électronique'),             d: t('resources.guideCsddd.qui.sectors.5.d', 'Risque mines de cobalt RDC') },
              ].map((s, i) => {
                const I = s.icon;
                return (
                  <div key={i} className="flex gap-3 p-4 border border-gray-200 rounded-xl">
                    <I className="h-6 w-6 text-violet-600 flex-shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-bold text-gray-900">{s.t}</p>
                      <p className="text-sm text-gray-600">{s.d}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section id="obligations" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsddd.obligations.heading', 'Les 6 obligations clés')}</h2>
            <p>{t('resources.guideCsddd.obligations.intro', "Sous la CSDDD, l'entreprise soumise doit mettre en place et démontrer 6 obligations structurantes (art. 5 à 16) :")}</p>

            <ol className="space-y-4 my-6">
              {[
                { t: t('resources.guideCsddd.obligations.0.t', 'Intégrer la due diligence dans les politiques et systèmes de gestion des risques'),     d: t('resources.guideCsddd.obligations.0.d', 'Politique publique, ressources dédiées, comité de pilotage, mise à jour annuelle.') },
                { t: t('resources.guideCsddd.obligations.1.t', 'Identifier et évaluer les impacts négatifs réels et potentiels'),                       d: t('resources.guideCsddd.obligations.1.d', 'Cartographie risques pays × secteur, priorisation par sévérité × probabilité.') },
                { t: t('resources.guideCsddd.obligations.2.t', 'Prévenir, atténuer ou faire cesser les impacts identifiés'),                            d: t('resources.guideCsddd.obligations.2.d', "Plan d'action avec délais, exigences contractuelles fournisseurs, investissement, retrait si nécessaire.") },
                { t: t('resources.guideCsddd.obligations.3.t', 'Établir un mécanisme de plainte'),                                                       d: t('resources.guideCsddd.obligations.3.d', "Accessible aux travailleurs, syndicats, communautés affectées, lanceurs d'alerte. Anonyme et multilingue.") },
                { t: t('resources.guideCsddd.obligations.4.t', "Suivre l'efficacité des mesures"),                                                       d: t('resources.guideCsddd.obligations.4.d', "Indicateurs quantifiables, audits internes/externes, mise à jour des plans d'action.") },
                { t: t('resources.guideCsddd.obligations.5.t', 'Communiquer publiquement chaque année'),                                                 d: t('resources.guideCsddd.obligations.5.d', 'Rapport CSDDD annexé ou intégré au rapport CSRD ESRS S2.') },
              ].map((o, i) => (
                <li key={i} className="flex gap-4 p-4 border border-gray-200 rounded-xl">
                  <div className="w-9 h-9 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 mb-1">{o.t}</p>
                    <p className="text-sm text-gray-600">{o.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section id="ruissellement" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsddd.ruissellement.heading', "L'effet sur les PME : ce qu'on vous demandera")}</h2>
            <p>{t('resources.guideCsddd.ruissellement.intro', "Même si vous n'êtes pas directement soumis·e, vos clients grands comptes vont vous envoyer leur questionnaire CSDDD. Voici ce à quoi s'attendre :")}</p>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">{t('resources.guideCsddd.ruissellement.qHeading', 'Questionnaire-type (~80-120 questions)')}</h3>
            <div className="space-y-3 my-6">
              {[
                { sec: t('resources.guideCsddd.ruissellement.q.0.sec', 'Politiques'),              ex: t('resources.guideCsddd.ruissellement.q.0.ex', 'Avez-vous une politique droits humains publique ? Code de conduite fournisseurs signé ?') },
                { sec: t('resources.guideCsddd.ruissellement.q.1.sec', 'Gouvernance'),             ex: t('resources.guideCsddd.ruissellement.q.1.ex', 'Qui est responsable de la due diligence dans votre organisation ? Quel budget alloué ?') },
                { sec: t('resources.guideCsddd.ruissellement.q.2.sec', 'Cartographie risques'),    ex: t('resources.guideCsddd.ruissellement.q.2.ex', 'Avez-vous identifié les pays/secteurs à risque dans VOS fournisseurs ?') },
                { sec: t('resources.guideCsddd.ruissellement.q.3.sec', 'Audit fournisseurs'),      ex: t('resources.guideCsddd.ruissellement.q.3.ex', "Combien de % de vos fournisseurs (en valeur d'achat) ont été audités cette année ?") },
                { sec: t('resources.guideCsddd.ruissellement.q.4.sec', 'Incidents'),               ex: t('resources.guideCsddd.ruissellement.q.4.ex', 'Avez-vous eu des incidents droits humains / environnement déclarés ? Comment résolus ?') },
                { sec: t('resources.guideCsddd.ruissellement.q.5.sec', 'Mécanisme de plainte'),    ex: t('resources.guideCsddd.ruissellement.q.5.ex', "Disposez-vous d'un canal anonyme et multilingue ?") },
                { sec: t('resources.guideCsddd.ruissellement.q.6.sec', 'Formation'),               ex: t('resources.guideCsddd.ruissellement.q.6.ex', '% salariés formés à la due diligence cette année.') },
                { sec: t('resources.guideCsddd.ruissellement.q.7.sec', 'Certifications'),          ex: t('resources.guideCsddd.ruissellement.q.7.ex', 'B Corp, EcoVadis, SA8000, FSC, BSCI, Sedex SMETA, ISO 26000 ?') },
              ].map((q, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4">
                  <p className="font-bold text-gray-900 mb-1">{q.sec}</p>
                  <p className="text-sm text-gray-600 italic">{t('resources.guideCsddd.ruissellement.exPrefix', 'Ex :')} {q.ex}</p>
                </div>
              ))}
            </div>

            <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl p-5 my-6">
              <p className="font-semibold text-emerald-900 mb-2">{t('resources.guideCsddd.ruissellement.oppTitle', '💡 Opportunité commerciale')}</p>
              <p className="text-emerald-900 text-base"><Trans i18nKey="resources.guideCsddd.ruissellement.oppBody">Les PME qui répondent <strong>vite et bien</strong> à ces questionnaires deviennent <em>fournisseurs préférentiels</em>. Inversement, celles qui peinent à répondre se font progressivement déréférencer. La CSDDD est donc autant un <strong>levier d'acquisition</strong> qu'une contrainte.</Trans></p>
            </div>
          </section>

          <section id="sanctions" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsddd.sanctions.heading', 'Sanctions et responsabilité civile')}</h2>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">{t('resources.guideCsddd.sanctions.adminHeading', 'Sanctions administratives')}</h3>
            <ul className="space-y-2 my-4 list-disc list-inside">
              <li><Trans i18nKey="resources.guideCsddd.sanctions.adminItem0">Amende jusqu'à <strong>5 % du chiffre d'affaires mondial net</strong> consolidé (art. 27)</Trans></li>
              <li>{t('resources.guideCsddd.sanctions.adminItem1', 'Publication de la décision et du nom de l\'entreprise (« naming and shaming »)')}</li>
              <li><Trans i18nKey="resources.guideCsddd.sanctions.adminItem2">Décision par une <strong>autorité de supervision nationale</strong> désignée (en France : DGCCRF + ACPR pressentis)</Trans></li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsddd.sanctions.civilHeading', 'Responsabilité civile élargie (art. 29)')}</h3>
            <p><Trans i18nKey="resources.guideCsddd.sanctions.civilP1">C'est la grande nouveauté juridique : les victimes du préjudice (travailleurs lésés, communautés affectées, ONG mandatées) peuvent agir en justice <strong>directement contre l'entreprise française</strong>, même quand le préjudice a eu lieu chez un fournisseur tiers à l'étranger.</Trans></p>
            <ul className="space-y-2 my-4 list-disc list-inside">
              <li><Trans i18nKey="resources.guideCsddd.sanctions.civilItem0">Délai de prescription minimum : <strong>5 ans</strong> (au lieu des 2-3 ans habituels)</Trans></li>
              <li>{t('resources.guideCsddd.sanctions.civilItem1', 'Charge de la preuve facilitée pour les requérants')}</li>
              <li>{t('resources.guideCsddd.sanctions.civilItem2', "Possibilité d'action collective via syndicats et ONG")}</li>
            </ul>
            <p>{t('resources.guideCsddd.sanctions.civilFooter', "Concrètement : un travailleur exploité chez un sous-traitant indien d'un grand groupe français pourra l'attaquer aux Prud'hommes ou au tribunal de commerce français.")}</p>
          </section>

          <section id="methode" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsddd.methode.heading', 'Méthode en 7 étapes pour se préparer')}</h2>
            <ol className="space-y-3 my-4 list-decimal list-inside">
              <li><Trans i18nKey="resources.guideCsddd.methode.step0"><strong>Cartographier les fournisseurs</strong> par catégorie de risque (pays × secteur × montant achats)</Trans></li>
              <li><Trans i18nKey="resources.guideCsddd.methode.step1"><strong>Adopter un code de conduite fournisseurs</strong> aligné OIT + Principes ONU + ESRS S2, signé contractuellement</Trans></li>
              <li><Trans i18nKey="resources.guideCsddd.methode.step2"><strong>Auditer les fournisseurs critiques</strong> (~20 % du portefeuille qui couvrent 80 % du risque, principe de Pareto)</Trans></li>
              <li><Trans i18nKey="resources.guideCsddd.methode.step3"><strong>Mettre en place un mécanisme de plainte</strong> accessible aux salariés des fournisseurs (téléphone, web, multilingue)</Trans></li>
              <li><Trans i18nKey="resources.guideCsddd.methode.step4"><strong>Formaliser un plan d'action</strong> pour chaque non-conformité avec délais et responsable</Trans></li>
              <li><Trans i18nKey="resources.guideCsddd.methode.step5"><strong>Former les acheteurs et les commerciaux</strong> aux critères d'évaluation droits humains/environnement</Trans></li>
              <li><Trans i18nKey="resources.guideCsddd.methode.step6"><strong>Publier un rapport annuel</strong> de vigilance (intégré au rapport CSRD ESRS S2 si applicable)</Trans></li>
            </ol>
          </section>

          <section id="esgflow" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsddd.esgflow.heading', 'Mettre en place la CSDDD avec ESG Flow')}</h2>
            <p><Trans i18nKey="resources.guideCsddd.esgflow.intro">Le module <strong>Supply Chain ESG</strong> d'ESG Flow couvre les obligations CSDDD + ESRS S2 dans un seul outil :</Trans></p>
            <div className="grid md:grid-cols-2 gap-4 my-8">
              {[
                { icon: Users,       t: t('resources.guideCsddd.esgflow.features.0.t', 'Cartographie fournisseurs'),  d: t('resources.guideCsddd.esgflow.features.0.d', 'Importation Excel ou CSV de votre annuaire fournisseurs, scoring automatique par pays × secteur.') },
                { icon: Shield,      t: t('resources.guideCsddd.esgflow.features.1.t', 'Code de conduite signé'),     d: t('resources.guideCsddd.esgflow.features.1.d', 'Template prêt à personnaliser, envoi automatisé et collecte des signatures électroniques.') },
                { icon: FileText,    t: t('resources.guideCsddd.esgflow.features.2.t', "Questionnaires d'audit"),    d: t('resources.guideCsddd.esgflow.features.2.d', 'Templates EcoVadis-compatibles, envoi par email, relances auto, scoring centralisé.') },
                { icon: AlertTriangle, t: t('resources.guideCsddd.esgflow.features.3.t', 'Registre des plaintes'),    d: t('resources.guideCsddd.esgflow.features.3.d', 'Portail public anonyme + workflow de traitement interne (assignation, délai, action corrective).') },
                { icon: Scale,       t: t('resources.guideCsddd.esgflow.features.4.t', "Plans d'action correctifs"), d: t('resources.guideCsddd.esgflow.features.4.d', 'Pour chaque non-conformité, plan SMART avec responsable, délai, indicateurs de suivi.') },
                { icon: FileText,    t: t('resources.guideCsddd.esgflow.features.5.t', 'Rapport CSDDD annuel'),       d: t('resources.guideCsddd.esgflow.features.5.d', 'Génération PDF + intégration directe au rapport CSRD section ESRS S2.') },
              ].map((f, i) => {
                const I = f.icon;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center"><I className="h-5 w-5" aria-hidden="true" /></div>
                    <div>
                      <p className="font-bold text-gray-900 mb-1">{f.t}</p>
                      <p className="text-base text-gray-600">{f.d}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="my-8 p-6 bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl text-white">
              <h3 className="text-2xl font-bold mb-2">{t('resources.guideCsddd.esgflow.ctaTitle', 'Démarrer votre vigilance fournisseurs')}</h3>
              <p className="text-violet-50 mb-5">{t('resources.guideCsddd.esgflow.ctaBody', 'Module Supply Chain ESG inclus dès le plan PME (249 €/mois). Essai 14 jours gratuit sans CB.')}</p>
              <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-violet-700 font-bold text-sm hover:bg-violet-50">
                {t('resources.guideCsddd.esgflow.ctaButton', 'Démarrer mon essai')} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <section id="faq" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{t('resources.guideCsddd.faq.heading', 'Questions fréquentes')}</h2>
            <div className="space-y-4">
              {[
                { q: t('resources.guideCsddd.faq.0.q', 'Ma PME de 100 salariés est-elle soumise à la CSDDD ?'), a: t('resources.guideCsddd.faq.0.a', "Directement, non — la CSDDD ne s'applique qu'aux entreprises >1 000 salariés et >450 M€ de CA. Indirectement, oui si vous êtes fournisseur d'un grand groupe soumis : ils vont vous auditer.") },
                { q: t('resources.guideCsddd.faq.1.q', 'Quelle différence entre CSDDD et loi française devoir de vigilance ?'), a: t('resources.guideCsddd.faq.1.a', "La loi française 2017 cible ~250 entreprises FR. La CSDDD étend à ~6 000 entreprises UE avec cadre harmonisé, sanctions plus fortes (5 % CA mondial) et responsabilité civile élargie. Les deux coexistent jusqu'à fin 2027.") },
                { q: t('resources.guideCsddd.faq.2.q', "Quel calendrier d'application de la CSDDD ?"), a: t('resources.guideCsddd.faq.2.a', 'Vague 1 (5 000+ sal., 1,5 Md€ CA) : 26 juillet 2027. Vague 2 (3 000+ sal., 900 M€) : 26 juillet 2028. Vague 3 (1 000+ sal., 450 M€) : 26 juillet 2029.') },
                { q: t('resources.guideCsddd.faq.3.q', 'Quelles sanctions en cas de manquement ?'), a: t('resources.guideCsddd.faq.3.a', "Amendes jusqu'à 5 % du CA mondial net. Naming and shaming public obligatoire. Responsabilité civile élargie : victimes peuvent agir directement contre l'entreprise française même pour préjudice à l'étranger.") },
                { q: t('resources.guideCsddd.faq.4.q', 'Comment ESG Flow aide à se conformer ?'), a: t('resources.guideCsddd.faq.4.a', "Module Supply Chain ESG inclus dès le plan ETI : cartographie fournisseurs, questionnaires d'audit, suivi plans d'action, registre plaintes. Conforme ESRS S2 et CSDDD.") },
                { q: t('resources.guideCsddd.faq.5.q', 'La CSDDD remplace-t-elle la loi française de 2017 ?'), a: t('resources.guideCsddd.faq.5.a', "Elle s'y substituera après transposition complète (~juillet 2026 en théorie). En pratique, les 2 régimes coexistent et il faut respecter le plus exigeant des deux pendant la période transitoire.") },
                { q: t('resources.guideCsddd.faq.6.q', 'Quels documents préparer pour répondre à un questionnaire CSDDD client ?'), a: t('resources.guideCsddd.faq.6.a', "Code de conduite fournisseurs signé, politique droits humains, cartographie risques, résultats d'audits récents, mécanisme de plainte, plan d'action correctif. ESG Flow fournit les templates de tous ces documents.") },
              ].map((item, i) => (
                <details key={i} className="group border border-gray-200 rounded-xl overflow-hidden hover:border-violet-300 transition-colors">
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('resources.guideCsddd.more.heading', 'Pour aller plus loin')}</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <Link to="/guide/csrd-pme" className="block p-5 rounded-xl border border-gray-200 hover:border-violet-300 hover:bg-violet-50/30 transition-all">
                <p className="font-bold text-gray-900 mb-1">{t('resources.guideCsddd.more.0.title', 'Guide CSRD complet')}</p>
                <p className="text-sm text-gray-500">{t('resources.guideCsddd.more.0.desc', 'Comprendre les 12 normes ESRS — dont S2 (chaîne de valeur)')}</p>
              </Link>
              <Link to="/guide/bilan-carbone-entreprise" className="block p-5 rounded-xl border border-gray-200 hover:border-violet-300 hover:bg-violet-50/30 transition-all">
                <p className="font-bold text-gray-900 mb-1">{t('resources.guideCsddd.more.1.title', 'Bilan carbone Scopes 1/2/3')}</p>
                <p className="text-sm text-gray-500">{t('resources.guideCsddd.more.1.desc', 'Mesurer les émissions de votre chaîne de valeur (Scope 3)')}</p>
              </Link>
              <Link to="/omnibus-csrd" className="block p-5 rounded-xl border border-gray-200 hover:border-violet-300 hover:bg-violet-50/30 transition-all">
                <p className="font-bold text-gray-900 mb-1">{t('resources.guideCsddd.more.2.title', 'Omnibus CSRD 2025')}</p>
                <p className="text-sm text-gray-500">{t('resources.guideCsddd.more.2.desc', 'Les simplifications réglementaires en 2025-2027')}</p>
              </Link>
            </div>
          </section>
        </article>
      </div>

      <footer className="bg-gray-50 border-t border-gray-200 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <LogoBrand size="sm" variant="dark" showTagline={false} />
          <p className="text-sm text-gray-500 mt-4 mb-6">{t('resources.guideCsddd.footer.tagline', 'La plateforme ESG des PME et ETI françaises')}</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <Link to="/pricing" className="hover:text-violet-600">{t('resources.guideCsddd.footer.pricing', 'Tarifs')}</Link>
            <Link to="/security" className="hover:text-violet-600">{t('resources.guideCsddd.footer.security', 'Sécurité')}</Link>
            <Link to="/status" className="hover:text-violet-600">{t('resources.guideCsddd.footer.status', 'Statut')}</Link>
            <Link to="/privacy-policy" className="hover:text-violet-600">{t('resources.guideCsddd.footer.privacy', 'Confidentialité')}</Link>
          </div>
          <p className="text-xs text-gray-400 mt-6">{t('resources.guideCsddd.footer.copyright', '© 2026 GreenConnect SAS — ESG Flow')}</p>
        </div>
      </footer>
    </div>
  );
}
