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
  { id: 'esgflow',       title: t('resources.guideCsddd.toc.esgflow', 'Mettre en place avec ESGFlow') },
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
    title: t('resources.guideCsddd.seo.title', 'CSDDD — guide complet du devoir de vigilance fournisseurs · ESGFlow'),
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
      "author":    { "@type": "Organization", "name": "ESGFlow", "url": "https://greenconnect.cloud" },
      "publisher": { "@type": "Organization", "name": "GreenConnect SAS",
                     "logo": { "@type": "ImageObject", "url": "https://greenconnect.cloud/brand/icon-esgflow-v5-256.png", "width": 256, "height": 256 } },
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
          "acceptedAnswer": { "@type": "Answer", "text": "Directement, non — la CSDDD ne vise que les entreprises de plus de 5 000 salariés et 1,5 Md€ de CA. Mais si vous fournissez un très grand groupe soumis, vous pouvez recevoir un questionnaire de diligence." } },
        { "@type": "Question", "name": "Quelle différence entre CSDDD et loi française devoir de vigilance ?",
          "acceptedAnswer": { "@type": "Answer", "text": "La loi française de 2017 vise les très grandes sociétés françaises. La CSDDD fixe un cadre européen harmonisé avec des amendes plafonnées à 3 % du CA mondial net. La loi de 2017 s'applique jusqu'à la transposition." } },
        { "@type": "Question", "name": "Quel calendrier d'application de la CSDDD ?",
          "acceptedAnswer": { "@type": "Answer", "text": "Transposition au plus tard le 26 juillet 2028, application à partir du 26 juillet 2029 pour les entreprises de plus de 5 000 salariés et 1,5 Md€ de CA net." } },
        { "@type": "Question", "name": "Quelles sanctions en cas de manquement à la CSDDD ?",
          "acceptedAnswer": { "@type": "Answer", "text": "Amendes administratives plafonnées à 3 % du chiffre d'affaires mondial net et publication de la décision. Le régime européen harmonisé de responsabilité civile a été supprimé : le droit national s'applique." } },
        { "@type": "Question", "name": "Comment ESGFlow aide à se conformer à la CSDDD ?",
          "acceptedAnswer": { "@type": "Answer", "text": "Module Supply Chain ESG inclus dès le plan PME (249 €/mois) : cartographie fournisseurs, questionnaires par lien sécurisé, suivi des risques, canal de signalement. Aide à préparer la démarche, sans garantir la conformité." } },
      ]
    },
  });

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" aria-label={t('resources.guideCsddd.nav.homeAria', 'ESGFlow — Accueil')}><LogoBrand size="sm" variant="dark" showTagline={false} /></Link>
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
            <Trans i18nKey="resources.guideCsddd.hero.subtitle">La directive UE 2024/1760, modifiée par l'Omnibus I (directive 2026/470), impose aux très grands groupes un devoir de vigilance sur leurs chaînes d'activités. Conséquence possible : <strong>même une PME peut recevoir un questionnaire</strong> de ses clients soumis. Voici comment vous préparer.</Trans>
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
              <p className="text-xs text-gray-600 mb-3">{t('resources.guideCsddd.aside.checklistDesc', '46 indicateurs prioritaires dont ESRS S2 (chaîne de valeur) au format PDF.')}</p>
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
                <li><Trans i18nKey="resources.guideCsddd.intro.item1">Depuis l'Omnibus I, la CSDDD ne vise que les entreprises de <strong>plus de 5 000 salariés ET plus de 1,5 Md€ de CA net mondial</strong>. Transposition au plus tard le <strong>26 juillet 2028</strong>, application à partir du <strong>26 juillet 2029</strong>.</Trans></li>
                <li><Trans i18nKey="resources.guideCsddd.intro.item2">Sanctions : amendes plafonnées à <strong>3 % du CA mondial net</strong> + publication de la décision (naming and shaming). Le régime européen harmonisé de responsabilité civile a été supprimé : le droit national s'applique.</Trans></li>
                <li><Trans i18nKey="resources.guideCsddd.intro.item3">L'effet de ruissellement : les groupes soumis peuvent demander à leurs <strong>fournisseurs PME/ETI</strong> des informations via des questionnaires (type EcoVadis, Sedex). Le périmètre étant restreint, ces demandes seront moins nombreuses qu'annoncé initialement.</Trans></li>
                <li><Trans i18nKey="resources.guideCsddd.intro.item4">Lien fort avec <strong>ESRS S2</strong> (CSRD) : « Travailleurs de la chaîne de valeur » — mêmes données, double usage.</Trans></li>
                <li><Trans i18nKey="resources.guideCsddd.intro.item5">La loi française sur le <strong>devoir de vigilance de 2017</strong> reste applicable en attendant la transposition de la CSDDD.</Trans></li>
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
            <p>{t('resources.guideCsddd.periodes.intro', "Après l'Omnibus I, la CSDDD s'applique en une seule échéance, à partir du 26 juillet 2029 :")}</p>
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
                    <td className="p-3 font-semibold">{t('resources.guideCsddd.periodes.wave1', "Entreprises UE")}</td>
                    <td className="p-3"><Trans i18nKey="resources.guideCsddd.periodes.wave1Scope"><strong>5 000+ salariés</strong> ET 1,5 Md€ de CA mondial net</Trans></td>
                    <td className="p-3"><Trans i18nKey="resources.guideCsddd.periodes.wave1Date">26 juillet <strong>2029</strong></Trans></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">{t('resources.guideCsddd.periodes.nonEu', 'Sociétés non-UE')}</td>
                    <td className="p-3">{t('resources.guideCsddd.periodes.nonEuScope', "CA dans l'UE > 1,5 Md€")}</td>
                    <td className="p-3">{t('resources.guideCsddd.periodes.nonEuDate', "26 juillet 2029")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-500 italic">{t('resources.guideCsddd.periodes.note', "Note : la transposition en droit français doit intervenir au plus tard le 26 juillet 2028. Vérifiez l'état d'avancement auprès des sources officielles ; la loi de 2017 s'applique d'ici là.")}</p>
          </section>

          <section id="qui" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsddd.qui.heading', 'Qui est concerné·e ?')}</h2>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">{t('resources.guideCsddd.qui.directHeading', "Directement (un nombre restreint de très grands groupes)")}</h3>
            <p><Trans i18nKey="resources.guideCsddd.qui.directIntro">Toutes les entreprises de l'UE qui, sur 2 exercices consécutifs, dépassent <strong>cumulativement</strong> :</Trans></p>
            <ul className="space-y-2 my-4 list-disc list-inside">
              <li><Trans i18nKey="resources.guideCsddd.qui.directItem0">Plus de <em>5 000 salariés</em> en moyenne annuelle</Trans></li>
              <li>{t('resources.guideCsddd.qui.directItem1', "Plus de 1,5 Md€ de CA mondial net")}</li>
            </ul>
            <p>{t('resources.guideCsddd.qui.directFooter', "Plus les sociétés non-UE qui réalisent plus de 1,5 Md€ de CA dans l'UE.")}</p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsddd.qui.indirectHeading', "Indirectement (~plusieurs centaines de milliers d'entreprises UE — dont votre PME)")}</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 my-6">
              <p className="font-semibold text-amber-900 mb-2">{t('resources.guideCsddd.qui.dominoTitle', "⚠ L'effet domino qui vous concerne")}</p>
              <p className="text-amber-900 text-base"><Trans i18nKey="resources.guideCsddd.qui.dominoBody">Les entreprises soumises doivent identifier et traiter les risques chez leurs <strong>partenaires commerciaux</strong>, en priorité là où les risques sont les plus graves. Si vous fournissez un très grand groupe, il peut vous envoyer un questionnaire de diligence et en tenir compte dans ses relations commerciales.</Trans></p>
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
              <li><Trans i18nKey="resources.guideCsddd.sanctions.adminItem0">Amende plafonnée à <strong>3 % du chiffre d'affaires mondial net</strong> (plafond relevé dans le texte final de l'Omnibus I)</Trans></li>
              <li>{t('resources.guideCsddd.sanctions.adminItem1', 'Publication de la décision et du nom de l\'entreprise (« naming and shaming »)')}</li>
              <li><Trans i18nKey="resources.guideCsddd.sanctions.adminItem2">Décision par une <strong>autorité de supervision nationale</strong> désignée par chaque État membre</Trans></li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsddd.sanctions.civilHeading', "Responsabilité civile")}</h3>
            <p><Trans i18nKey="resources.guideCsddd.sanctions.civilP1">L'Omnibus I a supprimé le régime européen harmonisé de responsabilité civile prévu à l'origine. La responsabilité des entreprises reste donc régie par le droit national de chaque État membre (en France, le droit commun et la loi de 2017).</Trans></p>
            <p>{t('resources.guideCsddd.sanctions.civilFooter', "Documentez votre démarche de vigilance : c'est votre meilleure protection, quel que soit le régime applicable.")}</p>
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsddd.esgflow.heading', 'Mettre en place la CSDDD avec ESGFlow')}</h2>
            <p><Trans i18nKey="resources.guideCsddd.esgflow.intro">Le module <strong>Supply Chain ESG</strong> d'ESGFlow aide à préparer une démarche de vigilance (CSDDD, loi de 2017) et les données ESRS S2. Il ne remplace ni un conseil juridique ni vos audits :</Trans></p>
            <div className="grid md:grid-cols-2 gap-4 my-8">
              {[
                { icon: Users,       t: t('resources.guideCsddd.esgflow.features.0.t', 'Cartographie fournisseurs'),  d: t('resources.guideCsddd.esgflow.features.0.d', "Import Excel de votre annuaire fournisseurs (modèle fourni), niveaux de risque et matrice probabilité/impact.") },
                { icon: Shield,      t: t('resources.guideCsddd.esgflow.features.1.t', "Fiche fournisseur"),     d: t('resources.guideCsddd.esgflow.features.1.d', "Informations légales, score ESG, historique d'évaluations et documents justificatifs par fournisseur.") },
                { icon: FileText,    t: t('resources.guideCsddd.esgflow.features.2.t', "Questionnaires fournisseurs"),    d: t('resources.guideCsddd.esgflow.features.2.d', "Envoi d'un questionnaire ESG via un lien sécurisé (90 jours), sans compte pour le fournisseur ; suivi des réponses.") },
                { icon: AlertTriangle, t: t('resources.guideCsddd.esgflow.features.3.t', 'Registre des plaintes'),    d: t('resources.guideCsddd.esgflow.features.3.d', "Canal de signalement public anonyme pour recueillir les alertes.") },
                { icon: Scale,       t: t('resources.guideCsddd.esgflow.features.4.t', "Plans d'action correctifs"), d: t('resources.guideCsddd.esgflow.features.4.d', "Documentez les mesures recommandées pour chaque fournisseur à risque (suivi manuel).") },
                { icon: FileText,    t: t('resources.guideCsddd.esgflow.features.5.t', "Données pour l'ESRS S2"),       d: t('resources.guideCsddd.esgflow.features.5.d', "Les données fournisseurs alimentent la préparation de la section ESRS S2 de votre rapport.") },
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
                { q: t('resources.guideCsddd.faq.0.q', 'Ma PME de 100 salariés est-elle soumise à la CSDDD ?'), a: t('resources.guideCsddd.faq.0.a', "Directement, non — la CSDDD ne vise que les entreprises de plus de 5 000 salariés et 1,5 Md€ de CA. Indirectement, vous pouvez recevoir des demandes d'un grand client soumis.") },
                { q: t('resources.guideCsddd.faq.1.q', 'Quelle différence entre CSDDD et loi française devoir de vigilance ?'), a: t('resources.guideCsddd.faq.1.a', "La loi française de 2017 vise les très grandes sociétés françaises (5 000 salariés en France ou 10 000 dans le monde). La CSDDD fixe un cadre européen harmonisé, avec des sanctions administratives plafonnées à 3 % du CA mondial net.") },
                { q: t('resources.guideCsddd.faq.2.q', "Quel calendrier d'application de la CSDDD ?"), a: t('resources.guideCsddd.faq.2.a', "Transposition au plus tard le 26 juillet 2028, application à partir du 26 juillet 2029 pour les entreprises de plus de 5 000 salariés et 1,5 Md€ de CA net (Omnibus I, directive 2026/470).") },
                { q: t('resources.guideCsddd.faq.3.q', 'Quelles sanctions en cas de manquement ?'), a: t('resources.guideCsddd.faq.3.a', "Amendes plafonnées à 3 % du CA mondial net et publication de la décision. Le régime européen harmonisé de responsabilité civile a été supprimé : le droit national s'applique.") },
                { q: t('resources.guideCsddd.faq.4.q', 'Comment ESGFlow aide à se conformer ?'), a: t('resources.guideCsddd.faq.4.a', "Le module Supply Chain ESG (inclus dès le plan PME) permet de cartographier vos fournisseurs, de leur envoyer des questionnaires, de suivre les risques et de recueillir des signalements. Il aide à préparer la démarche mais ne garantit pas la conformité.") },
                { q: t('resources.guideCsddd.faq.5.q', 'La CSDDD remplace-t-elle la loi française de 2017 ?'), a: t('resources.guideCsddd.faq.5.a', "Non, pas avant la transposition complète de la CSDDD (au plus tard juillet 2028, application en juillet 2029). D'ici là, la loi de 2017 continue de s'appliquer.") },
                { q: t('resources.guideCsddd.faq.6.q', 'Quels documents préparer pour répondre à un questionnaire CSDDD client ?'), a: t('resources.guideCsddd.faq.6.a', "Politique droits humains, code de conduite fournisseurs, cartographie des risques, résultats d'audits récents, mécanisme de plainte, plan d'action correctif. ESGFlow n'en fournit pas de modèles ; il aide à centraliser les informations fournisseurs.") },
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
          <p className="text-xs text-gray-400 mt-6">{t('resources.guideCsddd.footer.copyright', '© 2026 GreenConnect SAS — ESGFlow')}</p>
        </div>
      </footer>
    </div>
  );
}
