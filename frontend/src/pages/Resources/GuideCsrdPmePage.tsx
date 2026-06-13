/**
 * Pillar SEO — Guide complet CSRD pour PME et ETI françaises.
 * Cible : 5 000+ mots, top-of-funnel, intent "logiciel CSRD" + "obligations CSRD PME".
 * URL : /guide/csrd-pme
 */
import { Link } from 'react-router-dom';
import {
  CheckCircle2, AlertTriangle, ArrowRight, BookOpen, Calendar,
  FileText, Globe, Shield, Sparkles, TrendingUp, Users, Building2,
  Leaf, Scale, Factory, Briefcase, ChevronRight, Download, Mail,
} from 'lucide-react';
import { LogoBrand } from '@/components/common/Logo';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useTranslation, Trans } from 'react-i18next';
import type { TFunction } from 'i18next';

const getTOC = (t: TFunction) => [
  { id: 'intro',            title: t('resources.guideCsrdPme.toc.intro', 'En 30 secondes') },
  { id: 'comprendre',       title: t('resources.guideCsrdPme.toc.comprendre', 'Comprendre la CSRD') },
  { id: 'concernes',        title: t('resources.guideCsrdPme.toc.concernes', 'Suis-je concerné·e ?') },
  { id: 'esrs-12',          title: t('resources.guideCsrdPme.toc.esrs12', 'Les 12 normes ESRS') },
  { id: 'materialite',      title: t('resources.guideCsrdPme.toc.materialite', 'Double matérialité') },
  { id: 'donnees',          title: t('resources.guideCsrdPme.toc.donnees', 'Données à collecter') },
  { id: 'rapport',          title: t('resources.guideCsrdPme.toc.rapport', 'Le rapport') },
  { id: 'sanctions',        title: t('resources.guideCsrdPme.toc.sanctions', 'Sanctions & risques') },
  { id: 'esgflow',          title: t('resources.guideCsrdPme.toc.esgflow', 'Comment ESG Flow vous aide') },
  { id: 'faq',              title: t('resources.guideCsrdPme.toc.faq', 'FAQ') },
];

export default function GuideCsrdPmePage() {
  const { t } = useTranslation();
  const TOC = getTOC(t);
  const url = 'https://greenconnect.cloud/guide/csrd-pme';
  const img = 'https://greenconnect.cloud/api/v1/og/guide-csrd-pme.png';
  const desc = t('resources.guideCsrdPme.seo.description', "Comprendre la CSRD, savoir si vous êtes concerné·e, identifier les 12 normes ESRS, conduire la double matérialité, collecter les données et publier votre 1er rapport. Guide complet pour PME et ETI françaises, mis à jour Omnibus 2025.");

  usePageSeo({
    id: 'guide-csrd-pme',
    title: t('resources.guideCsrdPme.seo.title', 'Guide complet CSRD pour les PME et ETI françaises — ESG Flow'),
    description: desc,
    keywords: t('resources.guideCsrdPme.seo.keywords', 'CSRD, ESRS, PME, ETI, rapport durabilité, double matérialité, taxonomie UE, bilan carbone, EFRAG, directive 2022/2464'),
    url,
    ogType: 'article',
    ogTitle: t('resources.guideCsrdPme.seo.ogTitle', 'Guide complet CSRD pour les PME et ETI françaises'),
    ogImage: img,
    ogImageAlt: t('resources.guideCsrdPme.seo.ogImageAlt', 'Guide complet de la CSRD pour les PME et ETI françaises — ESG Flow'),
    breadcrumb: [
      { name: t('resources.guideCsrdPme.seo.breadcrumb.home', 'Accueil'),     url: 'https://greenconnect.cloud/' },
      { name: t('resources.guideCsrdPme.seo.breadcrumb.resources', 'Ressources'),  url: 'https://greenconnect.cloud/resources' },
      { name: t('resources.guideCsrdPme.seo.breadcrumb.current', 'Guide CSRD pour PME'), url },
    ],
    articleJsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Guide complet CSRD pour les PME et ETI françaises",
      "description": desc,
      "image": [img],
      "datePublished": "2026-05-01T08:00:00+02:00",
      "dateModified": "2026-05-20T08:00:00+02:00",
      "author":    { "@type": "Organization", "name": "ESG Flow", "url": "https://greenconnect.cloud" },
      "publisher": { "@type": "Organization", "name": "GreenConnect SAS",
                     "logo": { "@type": "ImageObject", "url": "https://greenconnect.cloud/brand/icon-esgflow-v4-256.png", "width": 256, "height": 256 } },
      "mainEntityOfPage": { "@type": "WebPage", "@id": url },
      "inLanguage": "fr-FR",
      "isAccessibleForFree": true,
      "keywords": "CSRD, ESRS, PME, ETI, rapport durabilité, double matérialité, taxonomie UE, bilan carbone, EFRAG",
      "articleSection": ["CSRD", "Conformité ESG", "Reporting durabilité"],
      "about": [
        { "@type": "Thing", "name": "Corporate Sustainability Reporting Directive" },
        { "@type": "Thing", "name": "European Sustainability Reporting Standards" }
      ]
    },
    faqJsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "Ma société de 60 salariés est-elle concernée par la CSRD ?",
          "acceptedAnswer": { "@type": "Answer", "text": "Directement, non (seuil post-Omnibus à 1 000 salariés). Indirectement, oui si vous fournissez des grands groupes : ils vont vous demander vos données ESG. Reporting volontaire recommandé." } },
        { "@type": "Question", "name": "Quelle différence entre CSRD et DPEF ?",
          "acceptedAnswer": { "@type": "Answer", "text": "La DPEF (loi 2017) couvrait ~3 000 sociétés françaises. La CSRD étend à toute l'UE (~50 000 entreprises) avec des standards techniques uniformes (ESRS), un audit obligatoire et un format iXBRL. La CSRD remplace la DPEF pour les sociétés concernées." } },
        { "@type": "Question", "name": "Quel budget prévoir pour la 1ère année CSRD ?",
          "acceptedAnswer": { "@type": "Answer", "text": "Sans outil : 30-80 k€ (cabinet conseil + commissaire aux comptes). Avec ESG Flow : 2-5 k€/an d'abonnement + 5-15 k€ d'audit. Économie 70-90 %." } },
        { "@type": "Question", "name": "Combien de temps pour produire le 1er rapport CSRD ?",
          "acceptedAnswer": { "@type": "Answer", "text": "Avec préparation amont : 3-4 mois (matrice de matérialité 4-6 sem, collecte données 6-8 sem, rédaction et audit 4-6 sem). ESG Flow accélère la collecte et la rédaction d'environ 60 %." } },
        { "@type": "Question", "name": "L'iXBRL est-il obligatoire pour ma PME non cotée ?",
          "acceptedAnswer": { "@type": "Answer", "text": "Non. iXBRL n'est obligatoire que pour les sociétés cotées sur un marché réglementé européen. Pour les autres, un PDF suffit (mais l'iXBRL aide à l'audit)." } }
      ]
    },
  });

  return (
    <div className="min-h-screen bg-white">
      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" aria-label={t('resources.guideCsrdPme.header.logoAria', 'ESG Flow — Accueil')}>
            <LogoBrand size="sm" variant="dark" showTagline={false} />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/register" className="hidden sm:inline-block px-4 py-2 text-sm font-semibold text-gray-700 hover:text-emerald-600">
              {t('resources.guideCsrdPme.header.trial', 'Essai gratuit 14 j')}
            </Link>
            <Link to="/register" className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-600/20">
              {t('resources.guideCsrdPme.header.cta', 'Démarrer →')}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-emerald-50 via-white to-blue-50 py-16 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold mb-6">
            <BookOpen className="h-3.5 w-3.5" /> {t('resources.guideCsrdPme.hero.badge', 'GUIDE EXPERT · 25 MIN DE LECTURE')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            <Trans i18nKey="resources.guideCsrdPme.hero.title">Guide complet de la CSRD<br />pour les PME et ETI françaises</Trans>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed mb-8">
            {t('resources.guideCsrdPme.hero.subtitle', "Comprendre les obligations, identifier si vous êtes concerné·e, mener votre première analyse de double matérialité, collecter les bonnes données et publier votre rapport de durabilité — sans cabinet de conseil et sans 6 mois d'implémentation.")}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {t('resources.guideCsrdPme.hero.meta1', 'Mis à jour mai 2026')}</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {t('resources.guideCsrdPme.hero.meta2', 'Inclus Omnibus CSRD 2025')}</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {t('resources.guideCsrdPme.hero.meta3', 'Conforme directive 2022/2464')}</span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12">

        {/* ── Sticky TOC ─────────────────────────────────────────────────────── */}
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1" aria-label={t('resources.guideCsrdPme.toc.aria', 'Sommaire')}>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t('resources.guideCsrdPme.toc.heading', 'Sommaire')}</h2>
            {TOC.map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block text-sm text-gray-600 hover:text-emerald-600 py-1.5 border-l-2 border-transparent hover:border-emerald-500 pl-3 transition-all"
              >
                {item.title}
              </a>
            ))}
            <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-700 mb-2">{t('resources.guideCsrdPme.tocCard.title', 'Check-list gratuite')}</p>
              <p className="text-xs text-gray-600 mb-3">{t('resources.guideCsrdPme.tocCard.desc', '47 indicateurs ESRS prioritaires à collecter, format PDF.')}</p>
              <Link to="/ressources/checklist-csrd" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800">
                <Download className="h-3.5 w-3.5" />{t('resources.guideCsrdPme.tocCard.link', 'Télécharger')}
              </Link>
            </div>
          </nav>
        </aside>

        {/* ── Article body ───────────────────────────────────────────────────── */}
        <article className="prose prose-lg max-w-none text-gray-700 leading-relaxed">

          {/* ───────────────────────────────────────── */}
          <section id="intro" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsrdPme.intro.title', "En 30 secondes : ce qu'il faut retenir")}</h2>
            <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-5 my-6">
              <p className="font-semibold text-amber-900 mb-2">{t('resources.guideCsrdPme.intro.tldrLabel', '⚡ TL;DR')}</p>
              <ul className="space-y-1.5 text-amber-900 text-base list-disc list-inside">
                <li><Trans i18nKey="resources.guideCsrdPme.intro.tldr1">La <strong>CSRD</strong> oblige ~50 000 entreprises européennes à publier un rapport ESG audité.</Trans></li>
                <li>{t('resources.guideCsrdPme.intro.tldr2', 'En France, vague 2 (publication 2026) : ~9 500 entreprises >250 salariés.')}</li>
                <li><Trans i18nKey="resources.guideCsrdPme.intro.tldr3">L'<strong>Omnibus</strong> de février 2025 relève le seuil à 1 000 salariés et 450 M€ de CA — mais l'effet "ruissellement" force les PME à se mettre à niveau pour leurs clients ETI/groupes.</Trans></li>
                <li><Trans i18nKey="resources.guideCsrdPme.intro.tldr4">12 normes <strong>ESRS</strong> à couvrir (E1 à E5, S1 à S4, G1, plus ESRS 2 transversal).</Trans></li>
                <li><Trans i18nKey="resources.guideCsrdPme.intro.tldr5">Le rapport doit être <strong>audité</strong> (assurance limitée) et <strong>structuré en iXBRL</strong> pour les sociétés cotées.</Trans></li>
                <li>{t('resources.guideCsrdPme.intro.tldr6', "Sanctions possibles : amendes administratives, interdiction d'accéder à certains marchés publics.")}</li>
              </ul>
            </div>
            <p>
              {t('resources.guideCsrdPme.intro.body', "Si vous dirigez ou conseillez une PME ou ETI française, vous avez probablement entendu parler de la CSRD (Corporate Sustainability Reporting Directive) ces derniers mois. Peut-être votre commissaire aux comptes vous a alerté, ou un grand client vous a demandé votre rapport ESG. Ce guide vous donne tout ce dont vous avez besoin pour comprendre, décider, et agir — sans jargon inutile et sans cabinet à 15 000 €.")}
            </p>
          </section>

          {/* ───────────────────────────────────────── */}
          <section id="comprendre" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsrdPme.comprendre.title', 'Comprendre la CSRD en 5 minutes')}</h2>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsrdPme.comprendre.whatTitle', "Qu'est-ce que la CSRD ?")}</h3>
            <p>
              <Trans i18nKey="resources.guideCsrdPme.comprendre.whatP1">
                La <strong>Corporate Sustainability Reporting Directive</strong> (CSRD, Directive UE 2022/2464) est entrée en vigueur le 5 janvier 2023. Elle remplace la NFRD (Non-Financial Reporting Directive) et étend considérablement le périmètre des entreprises soumises à l'obligation de publier un rapport extra-financier.
              </Trans>
            </p>
            <p>
              <Trans i18nKey="resources.guideCsrdPme.comprendre.whatP2">
                Là où la NFRD ne concernait que ~11 700 grandes entreprises européennes, la CSRD vise à terme ~50 000 entreprises — soit environ 4× plus. En France, on estime que <strong>9 500 entreprises</strong> sont directement concernées par la vague principale (2024-2026), et plusieurs dizaines de milliers indirectement via la pression de leurs clients.
              </Trans>
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsrdPme.comprendre.calendarTitle', "Le calendrier d'application")}</h3>
            <div className="my-6 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left p-3 font-bold text-gray-700">{t('resources.guideCsrdPme.comprendre.cal.thWave', 'Vague')}</th>
                    <th className="text-left p-3 font-bold text-gray-700">{t('resources.guideCsrdPme.comprendre.cal.thScope', 'Périmètre')}</th>
                    <th className="text-left p-3 font-bold text-gray-700">{t('resources.guideCsrdPme.comprendre.cal.thYear', 'Exercice')}</th>
                    <th className="text-left p-3 font-bold text-gray-700">{t('resources.guideCsrdPme.comprendre.cal.thPub', 'Publication')}</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr className="border-b border-gray-100"><td className="p-3 font-semibold">{t('resources.guideCsrdPme.comprendre.cal.row1.wave', 'Vague 1')}</td><td className="p-3">{t('resources.guideCsrdPme.comprendre.cal.row1.scope', 'Grandes entreprises déjà soumises NFRD (cotées >500 salariés)')}</td><td className="p-3">2024</td><td className="p-3">2025</td></tr>
                  <tr className="border-b border-gray-100 bg-emerald-50/50"><td className="p-3 font-semibold">{t('resources.guideCsrdPme.comprendre.cal.row2.wave', 'Vague 2')}</td><td className="p-3"><Trans i18nKey="resources.guideCsrdPme.comprendre.cal.row2.scope"><strong>Toutes grandes entreprises</strong> (&gt;250 sal., &gt;40 M€ CA, &gt;20 M€ bilan)</Trans></td><td className="p-3">2025</td><td className="p-3"><strong>2026</strong></td></tr>
                  <tr className="border-b border-gray-100"><td className="p-3 font-semibold">{t('resources.guideCsrdPme.comprendre.cal.row3.wave', 'Vague 3')}</td><td className="p-3">{t('resources.guideCsrdPme.comprendre.cal.row3.scope', 'PME cotées')}</td><td className="p-3">2026</td><td className="p-3">2027</td></tr>
                  <tr><td className="p-3 font-semibold">{t('resources.guideCsrdPme.comprendre.cal.row4.wave', 'Vague 4')}</td><td className="p-3">{t('resources.guideCsrdPme.comprendre.cal.row4.scope', 'Sociétés non-UE avec activité significative en UE')}</td><td className="p-3">2028</td><td className="p-3">2029</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsrdPme.comprendre.omniTitle', "L'Omnibus simplification (février 2025)")}</h3>
            <p>
              <Trans i18nKey="resources.guideCsrdPme.comprendre.omniIntro">
                En février 2025, la Commission européenne a proposé un paquet de mesures de simplification, dit <strong>« Omnibus »</strong>. Les points-clés pour les PME :
              </Trans>
            </p>
            <ul className="space-y-2 my-4 list-disc list-inside">
              <li><Trans i18nKey="resources.guideCsrdPme.comprendre.omni1"><strong>Seuil relevé</strong> : la vague 2 ne concerne plus que les entreprises &gt;1 000 salariés (au lieu de 250) ET &gt;450 M€ de CA (au lieu de 40 M€)</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.comprendre.omni2"><strong>Report de 2 ans</strong> : pour les vagues 2 et 3, repoussées à 2027 et 2028</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.comprendre.omni3"><strong>Standards sectoriels supprimés</strong> : les ESRS sectoriels prévus pour 2026 sont annulés</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.comprendre.omni4"><strong>Audit allégé</strong> : maintien de l'assurance limitée, abandon du plan vers l'assurance raisonnable</Trans></li>
            </ul>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl my-6">
              <p className="font-semibold text-blue-900 mb-2">{t('resources.guideCsrdPme.comprendre.omniBox.label', '📌 Implication pour les PME')}</p>
              <p className="text-blue-900 text-base">
                <Trans i18nKey="resources.guideCsrdPme.comprendre.omniBox.body">
                  Beaucoup de PME ne sont <em>plus</em> directement obligées par la CSRD post-Omnibus. <strong>MAIS</strong> les grands groupes restent soumis ET doivent renseigner les ESRS S2 (chaîne de valeur), ce qui les pousse à exiger des données ESG de leurs fournisseurs PME/ETI. Le marché du reporting "volontaire" explose donc en parallèle. <Link to="/omnibus-csrd" className="font-semibold underline">Lire notre guide Omnibus complet →</Link>
                </Trans>
              </p>
            </div>
          </section>

          {/* ───────────────────────────────────────── */}
          <section id="concernes" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsrdPme.concernes.title', 'Suis-je concerné·e ?')}</h2>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">{t('resources.guideCsrdPme.concernes.thresholdTitle', 'Critères de seuil (post-Omnibus 2025)')}</h3>
            <p>
              <Trans i18nKey="resources.guideCsrdPme.concernes.thresholdIntro">
                Une entreprise est concernée si elle dépasse <strong>2 des 3 seuils</strong> suivants sur 2 exercices consécutifs :
              </Trans>
            </p>
            <div className="grid sm:grid-cols-3 gap-4 my-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                <Users className="h-8 w-8 text-emerald-600 mb-2" />
                <p className="text-2xl font-extrabold text-gray-900">{t('resources.guideCsrdPme.concernes.card1.value', '1 000+')}</p>
                <p className="text-sm text-gray-600 mt-1">{t('resources.guideCsrdPme.concernes.card1.label', 'salariés (moyenne annuelle)')}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <TrendingUp className="h-8 w-8 text-blue-600 mb-2" />
                <p className="text-2xl font-extrabold text-gray-900">{t('resources.guideCsrdPme.concernes.card2.value', '450 M€+')}</p>
                <p className="text-sm text-gray-600 mt-1">{t('resources.guideCsrdPme.concernes.card2.label', "chiffre d'affaires net")}</p>
              </div>
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-5">
                <Building2 className="h-8 w-8 text-violet-600 mb-2" />
                <p className="text-2xl font-extrabold text-gray-900">{t('resources.guideCsrdPme.concernes.card3.value', '25 M€+')}</p>
                <p className="text-sm text-gray-600 mt-1">{t('resources.guideCsrdPme.concernes.card3.label', 'total de bilan')}</p>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsrdPme.concernes.specialTitle', 'Cas particuliers : vous êtes concerné·e même en-dessous des seuils')}</h3>
            <ul className="space-y-2 my-4 list-disc list-inside">
              <li><Trans i18nKey="resources.guideCsrdPme.concernes.special1"><strong>PME cotée</strong> sur un marché réglementé européen → vague 3 (publication 2027)</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.concernes.special2"><strong>Filiale d'un groupe coté</strong> → consolidée dans le rapport du groupe</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.concernes.special3"><strong>Établissement de crédit ou assurance</strong> → obligation indépendamment de la taille</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.concernes.special4"><strong>Société non-UE avec ≥150 M€ de CA UE + filiale ou succursale UE</strong> → vague 4</Trans></li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsrdPme.concernes.trickleTitle', 'L\'effet de ruissellement (le "vrai" enjeu pour les PME)')}</h3>
            <p>
              <Trans i18nKey="resources.guideCsrdPme.concernes.trickleIntro">
                Même si vous ne dépassez aucun seuil, vos clients grands comptes <strong>vont vous demander vos données ESG</strong>. Pourquoi ?
              </Trans>
            </p>
            <ol className="space-y-2 my-4 list-decimal list-inside">
              <li><Trans i18nKey="resources.guideCsrdPme.concernes.trickle1">Ils doivent rapporter leur <strong>Scope 3</strong> (émissions de leur chaîne de valeur, soit ~70 % de leurs émissions totales pour un service B2B typique)</Trans></li>
              <li>{t('resources.guideCsrdPme.concernes.trickle2', "L'ESRS S2 (« travailleurs de la chaîne de valeur ») impose des audits sociaux fournisseurs")}</li>
              <li><Trans i18nKey="resources.guideCsrdPme.concernes.trickle3">La directive <strong>CSDDD</strong> (devoir de vigilance) entre en vigueur progressivement 2027-2029 et impose des évaluations risques droits humains + environnement sur les fournisseurs</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.concernes.trickle4">Les <strong>marchés publics</strong> exigent de plus en plus de critères ESG (RSE = critère pondéré ≥10 % sur ~40 % des AO publics français en 2025)</Trans></li>
            </ol>
            <p>
              <Trans i18nKey="resources.guideCsrdPme.concernes.trickleOutro">
                Résultat : si vous êtes une PME de 80 salariés qui fournit Total, EDF, Carrefour, Decathlon, Orano ou n'importe quel grand groupe coté, attendez-vous à recevoir d'ici 12 mois un questionnaire ESG type « VendorESG », « EcoVadis » ou un audit CSDDD. <strong>Avoir un rapport ESG prêt vous donne un avantage commercial concret.</strong>
              </Trans>
            </p>
          </section>

          {/* ───────────────────────────────────────── */}
          <section id="esrs-12" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsrdPme.esrs.title', 'Les 12 normes ESRS expliquées')}</h2>
            <p>
              <Trans i18nKey="resources.guideCsrdPme.esrs.intro">
                Les <strong>European Sustainability Reporting Standards</strong> (ESRS) sont les normes techniques qui définissent <em>quoi</em> publier. Elles ont été adoptées en juillet 2023 et publiées au JOUE. Il y a 12 normes au total : 2 transversales et 10 thématiques.
              </Trans>
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsrdPme.esrs.crossTitle', 'Normes transversales (obligatoires pour tous)')}</h3>
            <div className="space-y-3 my-6">
              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-xs font-mono font-bold flex-shrink-0">ESRS 1</div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{t('resources.guideCsrdPme.esrs.esrs1.title', 'Exigences générales')}</p>
                    <p className="text-base text-gray-600"><Trans i18nKey="resources.guideCsrdPme.esrs.esrs1.desc">Principes de reporting : double matérialité, périmètre, qualité de l'information, structure du rapport. <em>Ne contient pas d'indicateurs</em> — c'est le cadre méthodologique.</Trans></p>
                  </div>
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-xs font-mono font-bold flex-shrink-0">ESRS 2</div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{t('resources.guideCsrdPme.esrs.esrs2.title', 'Informations générales')}</p>
                    <p className="text-base text-gray-600"><Trans i18nKey="resources.guideCsrdPme.esrs.esrs2.desc">Gouvernance ESG, stratégie, modèle d'affaires, gestion des risques, parties prenantes. <strong>~80 points de donnée obligatoires</strong> quelle que soit votre activité.</Trans></p>
                  </div>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsrdPme.esrs.envTitle', 'Pilier Environnement (E1 à E5)')}</h3>
            <div className="space-y-3 my-6">
              <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-mono font-bold flex-shrink-0">E1</div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{t('resources.guideCsrdPme.esrs.e1.title', 'Changement climatique')}</p>
                    <p className="text-base text-gray-600"><Trans i18nKey="resources.guideCsrdPme.esrs.e1.desc">Émissions GES Scopes 1, 2 et 3 (méthode GHG Protocol), objectifs de réduction, plan de transition, risques physiques et de transition (alignés TCFD). <strong>La norme la plus exigeante et la plus auditée.</strong></Trans></p>
                  </div>
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-mono font-bold flex-shrink-0">E2</div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{t('resources.guideCsrdPme.esrs.e2.title', 'Pollution')}</p>
                    <p className="text-base text-gray-600">{t('resources.guideCsrdPme.esrs.e2.desc', "Émissions atmosphériques (NOx, SOx, particules), rejets dans l'eau et les sols, substances préoccupantes (REACH). Pertinent surtout pour industrie.")}</p>
                  </div>
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-mono font-bold flex-shrink-0">E3</div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{t('resources.guideCsrdPme.esrs.e3.title', 'Eau et ressources marines')}</p>
                    <p className="text-base text-gray-600">{t('resources.guideCsrdPme.esrs.e3.desc', 'Prélèvements, consommation, rejets, zones de stress hydrique (WRI Aqueduct), efficience hydrique.')}</p>
                  </div>
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-mono font-bold flex-shrink-0">E4</div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{t('resources.guideCsrdPme.esrs.e4.title', 'Biodiversité et écosystèmes')}</p>
                    <p className="text-base text-gray-600">{t('resources.guideCsrdPme.esrs.e4.desc', 'Sites situés à proximité de zones protégées, impacts sur les espèces, déforestation, MSA (Mean Species Abundance).')}</p>
                  </div>
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-mono font-bold flex-shrink-0">E5</div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{t('resources.guideCsrdPme.esrs.e5.title', 'Utilisation des ressources et économie circulaire')}</p>
                    <p className="text-base text-gray-600">{t('resources.guideCsrdPme.esrs.e5.desc', 'Flux entrants (matières vierges vs recyclées), déchets générés, taux de réemploi, écoconception.')}</p>
                  </div>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsrdPme.esrs.socTitle', 'Pilier Social (S1 à S4)')}</h3>
            <div className="space-y-3 my-6">
              <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-mono font-bold flex-shrink-0">S1</div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{t('resources.guideCsrdPme.esrs.s1.title', 'Effectifs propres')}</p>
                    <p className="text-base text-gray-600"><Trans i18nKey="resources.guideCsrdPme.esrs.s1.desc">Démographie (ETP, contrats, diversité), rémunérations (gender pay gap), conditions de travail, formation, accidents du travail, négociation collective. <strong>~50 indicateurs.</strong></Trans></p>
                  </div>
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-mono font-bold flex-shrink-0">S2</div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{t('resources.guideCsrdPme.esrs.s2.title', 'Travailleurs de la chaîne de valeur')}</p>
                    <p className="text-base text-gray-600"><Trans i18nKey="resources.guideCsrdPme.esrs.s2.desc">Audits sociaux fournisseurs, taux de couverture, incidents droits humains, mécanisme de plainte. <strong>Très lié à la CSDDD.</strong></Trans></p>
                  </div>
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-mono font-bold flex-shrink-0">S3</div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{t('resources.guideCsrdPme.esrs.s3.title', 'Communautés affectées')}</p>
                    <p className="text-base text-gray-600">{t('resources.guideCsrdPme.esrs.s3.desc', 'Impacts sur les populations locales : pollution, expropriation, accès aux ressources. Pertinent pour industrie, extraction, infrastructures.')}</p>
                  </div>
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-mono font-bold flex-shrink-0">S4</div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{t('resources.guideCsrdPme.esrs.s4.title', 'Consommateurs et utilisateurs finaux')}</p>
                    <p className="text-base text-gray-600">{t('resources.guideCsrdPme.esrs.s4.desc', 'Sécurité produit, protection des données, accessibilité, marketing responsable, réclamations.')}</p>
                  </div>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsrdPme.esrs.govTitle', 'Pilier Gouvernance (G1)')}</h3>
            <div className="space-y-3 my-6">
              <div className="border border-violet-200 bg-violet-50/50 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="px-2.5 py-1 bg-violet-600 text-white rounded-lg text-xs font-mono font-bold flex-shrink-0">G1</div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{t('resources.guideCsrdPme.esrs.g1.title', 'Conduite des affaires')}</p>
                    <p className="text-base text-gray-600">{t('resources.guideCsrdPme.esrs.g1.desc', "Culture d'éthique, lutte anti-corruption (incidents, formations), gestion des relations fournisseurs, lobbying (montants, sujets), protection des lanceurs d'alerte, délais de paiement.")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 my-6">
              <p className="text-sm text-amber-900">
                <Trans i18nKey="resources.guideCsrdPme.esrs.note"><strong>💡 Vous ne devez PAS publier les 12 normes intégralement.</strong> Seuls ESRS 1 et 2 sont obligatoires en totalité. Pour E1-E5, S1-S4 et G1, vous appliquez le principe de <strong>double matérialité</strong> : ne publier que les normes jugées matérielles pour votre activité. C'est l'objet de la prochaine section.</Trans>
              </p>
            </div>
          </section>

          {/* ───────────────────────────────────────── */}
          <section id="materialite" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsrdPme.mat.title', "L'analyse de double matérialité")}</h2>

            <p>
              <Trans i18nKey="resources.guideCsrdPme.mat.intro">La <strong>double matérialité</strong> est le cœur méthodologique de la CSRD. C'est l'étape qui détermine quelles normes ESRS vous devez publier en détail et lesquelles vous pouvez écarter ou traiter rapidement.</Trans>
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsrdPme.mat.axesTitle', 'Les deux axes de matérialité')}</h3>

            <div className="grid md:grid-cols-2 gap-5 my-6">
              <div className="border-2 border-emerald-200 bg-emerald-50/50 rounded-xl p-5">
                <Leaf className="h-8 w-8 text-emerald-600 mb-2" />
                <p className="font-bold text-gray-900 mb-2">{t('resources.guideCsrdPme.mat.impact.title', "Matérialité d'impact")}</p>
                <p className="text-base text-gray-700">
                  <Trans i18nKey="resources.guideCsrdPme.mat.impact.body">Vos activités ont-elles un <strong>impact significatif</strong> sur l'environnement, les personnes ou la société ?</Trans>
                </p>
                <p className="text-sm text-gray-500 mt-3 italic">
                  {t('resources.guideCsrdPme.mat.impact.ex', 'Ex. : une cimenterie a un impact climat fort → E1 est matériel.')}
                </p>
              </div>
              <div className="border-2 border-blue-200 bg-blue-50/50 rounded-xl p-5">
                <TrendingUp className="h-8 w-8 text-blue-600 mb-2" />
                <p className="font-bold text-gray-900 mb-2">{t('resources.guideCsrdPme.mat.financial.title', 'Matérialité financière')}</p>
                <p className="text-base text-gray-700">
                  <Trans i18nKey="resources.guideCsrdPme.mat.financial.body">Les enjeux ESG affectent-ils <strong>vos résultats financiers</strong> (revenus, coûts, accès au capital, réputation) ?</Trans>
                </p>
                <p className="text-sm text-gray-500 mt-3 italic">
                  {t('resources.guideCsrdPme.mat.financial.ex', 'Ex. : une assurance subit le risque climatique sur son portefeuille → E1 est matériel.')}
                </p>
              </div>
            </div>

            <p>
              <Trans i18nKey="resources.guideCsrdPme.mat.orLogic">Un enjeu est <strong>matériel au sens CSRD</strong> dès qu'il atteint le seuil de matérialité sur <strong>au moins un des deux axes</strong> (logique « OU », pas « ET »). C'est en cela que la « double » matérialité est plus exigeante que la matérialité financière seule retenue par certains référentiels (ISSB, par exemple).</Trans>
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsrdPme.mat.efragTitle', 'La méthode recommandée par EFRAG (en 5 étapes)')}</h3>
            <ol className="space-y-3 my-4 list-decimal list-inside">
              <li><Trans i18nKey="resources.guideCsrdPme.mat.step1"><strong>Identifier les parties prenantes</strong> internes et externes (salariés, clients, fournisseurs, riverains, ONG, régulateurs)</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.mat.step2"><strong>Cartographier les enjeux ESG</strong> de votre activité (matrice de ~40-60 enjeux selon votre secteur)</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.mat.step3"><strong>Consulter les parties prenantes</strong> (enquête, interviews, ateliers) pour pondérer les enjeux</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.mat.step4"><strong>Évaluer chaque enjeu</strong> sur les deux axes (impact ESG × impact financier) selon une échelle 1-5</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.mat.step5"><strong>Définir le seuil de matérialité</strong> (typiquement 3/5 sur au moins un axe) et publier en conséquence</Trans></li>
            </ol>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsrdPme.mat.exTitle', 'Exemple concret : une PME industrielle de 200 salariés')}</h3>
            <p>
              {t('resources.guideCsrdPme.mat.exIntro', 'Imaginons une PME française de plasturgie, 180 salariés, 35 M€ de CA, située en Auvergne-Rhône-Alpes. Voici un extrait simplifié de sa matrice de double matérialité :')}
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left p-3 font-bold text-gray-700">{t('resources.guideCsrdPme.mat.th.issue', 'Enjeu')}</th>
                    <th className="text-center p-3 font-bold text-gray-700">{t('resources.guideCsrdPme.mat.th.esg', 'Impact ESG')}</th>
                    <th className="text-center p-3 font-bold text-gray-700">{t('resources.guideCsrdPme.mat.th.fin', 'Impact financier')}</th>
                    <th className="text-center p-3 font-bold text-gray-700">{t('resources.guideCsrdPme.mat.th.material', 'Matériel ?')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 bg-emerald-50/30"><td className="p-3">{t('resources.guideCsrdPme.mat.row1.label', 'Émissions GES (E1)')}</td><td className="text-center p-3">5/5</td><td className="text-center p-3">4/5</td><td className="text-center p-3 text-emerald-600 font-bold">{t('resources.guideCsrdPme.mat.yes', '✓ Oui')}</td></tr>
                  <tr className="border-b border-gray-100 bg-emerald-50/30"><td className="p-3">{t('resources.guideCsrdPme.mat.row2.label', 'Plastique vierge vs recyclé (E5)')}</td><td className="text-center p-3">5/5</td><td className="text-center p-3">5/5</td><td className="text-center p-3 text-emerald-600 font-bold">{t('resources.guideCsrdPme.mat.yes', '✓ Oui')}</td></tr>
                  <tr className="border-b border-gray-100 bg-emerald-50/30"><td className="p-3">{t('resources.guideCsrdPme.mat.row3.label', 'Sécurité au travail (S1)')}</td><td className="text-center p-3">4/5</td><td className="text-center p-3">3/5</td><td className="text-center p-3 text-emerald-600 font-bold">{t('resources.guideCsrdPme.mat.yes', '✓ Oui')}</td></tr>
                  <tr className="border-b border-gray-100"><td className="p-3">{t('resources.guideCsrdPme.mat.row4.label', 'Eau et stress hydrique (E3)')}</td><td className="text-center p-3">2/5</td><td className="text-center p-3">1/5</td><td className="text-center p-3 text-gray-400">{t('resources.guideCsrdPme.mat.no', '— Non')}</td></tr>
                  <tr className="border-b border-gray-100"><td className="p-3">{t('resources.guideCsrdPme.mat.row5.label', 'Biodiversité (E4)')}</td><td className="text-center p-3">2/5</td><td className="text-center p-3">1/5</td><td className="text-center p-3 text-gray-400">{t('resources.guideCsrdPme.mat.no', '— Non')}</td></tr>
                  <tr><td className="p-3">{t('resources.guideCsrdPme.mat.row6.label', 'Communautés affectées (S3)')}</td><td className="text-center p-3">2/5</td><td className="text-center p-3">2/5</td><td className="text-center p-3 text-gray-400">{t('resources.guideCsrdPme.mat.no', '— Non')}</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              <Trans i18nKey="resources.guideCsrdPme.mat.exConclusion">Cette PME publierait en détail E1, E5, S1 et G1, mais traiterait E2/E3/E4/S2/S3/S4 en « non matériels » avec justification courte. <strong>Résultat : un rapport de 30-40 pages au lieu de 150.</strong></Trans>
            </p>
          </section>

          {/* ───────────────────────────────────────── */}
          <section id="donnees" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsrdPme.data.title', 'Les données à collecter')}</h2>

            <p>
              <Trans i18nKey="resources.guideCsrdPme.data.intro">Une fois la matrice de matérialité figée, vient la phase la plus chronophage : <strong>collecter les données</strong> pour chaque norme matérielle. Voici les sources principales à mobiliser.</Trans>
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsrdPme.data.internalTitle', 'Sources internes')}</h3>
            <div className="grid md:grid-cols-2 gap-4 my-6">
              <div className="border border-gray-200 rounded-xl p-4">
                <p className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Briefcase className="h-4 w-4 text-blue-600" /> {t('resources.guideCsrdPme.data.acc.title', 'Comptabilité / DAF')}</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>{t('resources.guideCsrdPme.data.acc.li1', 'Fichier des Écritures Comptables (FEC) pour Scope 3 spend-based')}</li>
                  <li>{t('resources.guideCsrdPme.data.acc.li2', 'Investissements (CapEx / OpEx) pour taxonomie UE')}</li>
                  <li>{t('resources.guideCsrdPme.data.acc.li3', 'Délais de paiement fournisseurs (G1)')}</li>
                </ul>
              </div>
              <div className="border border-gray-200 rounded-xl p-4">
                <p className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Users className="h-4 w-4 text-emerald-600" /> {t('resources.guideCsrdPme.data.hr.title', 'RH / Paie')}</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>{t('resources.guideCsrdPme.data.hr.li1', 'Démographie (S1) : effectifs, contrats, genre, âge')}</li>
                  <li>{t('resources.guideCsrdPme.data.hr.li2', 'Rémunérations (gender pay gap, écart médiane/CEO)')}</li>
                  <li>{t('resources.guideCsrdPme.data.hr.li3', 'Formation, accidents, turnover')}</li>
                </ul>
              </div>
              <div className="border border-gray-200 rounded-xl p-4">
                <p className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Factory className="h-4 w-4 text-amber-600" /> {t('resources.guideCsrdPme.data.prod.title', 'Production / Exploitation')}</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>{t('resources.guideCsrdPme.data.prod.li1', 'Consommation énergétique (kWh par source)')}</li>
                  <li>{t('resources.guideCsrdPme.data.prod.li2', 'Émissions process (Scope 1 directes)')}</li>
                  <li>{t('resources.guideCsrdPme.data.prod.li3', 'Matières premières (vierges/recyclées pour E5)')}</li>
                  <li>{t('resources.guideCsrdPme.data.prod.li4', 'Déchets générés et valorisation')}</li>
                </ul>
              </div>
              <div className="border border-gray-200 rounded-xl p-4">
                <p className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Shield className="h-4 w-4 text-violet-600" /> {t('resources.guideCsrdPme.data.legal.title', 'Direction Générale / Juridique')}</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>{t('resources.guideCsrdPme.data.legal.li1', 'Politique anti-corruption, formations (G1)')}</li>
                  <li>{t('resources.guideCsrdPme.data.legal.li2', "Lanceurs d'alerte (dispositif, signalements)")}</li>
                  <li>{t('resources.guideCsrdPme.data.legal.li3', 'Lobbying (registre transparence)')}</li>
                  <li>{t('resources.guideCsrdPme.data.legal.li4', 'Code de conduite fournisseurs')}</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsrdPme.data.externalTitle', 'Sources externes (à connecter)')}</h3>
            <ul className="space-y-2 my-4 list-disc list-inside">
              <li><Trans i18nKey="resources.guideCsrdPme.data.ext1"><strong>Enedis</strong> : consommation électrique automatisée par site (Scope 2 location-based)</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.data.ext2"><strong>GRDF</strong> : consommation gaz naturel (Scope 1)</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.data.ext3"><strong>Base Carbone ADEME</strong> : facteurs d'émission de référence pour les conversions</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.data.ext4"><strong>Climatiq</strong> / <strong>ecoinvent</strong> : facteurs d'émission internationaux pour Scope 3</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.data.ext5"><strong>INSEE (Sirene)</strong> : données entreprises pour cartographie fournisseurs</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.data.ext6"><strong>WRI Aqueduct</strong> : stress hydrique des sites (E3)</Trans></li>
            </ul>

            <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl p-5 my-6">
              <p className="font-semibold text-emerald-900 mb-2">{t('resources.guideCsrdPme.data.useCaseLabel', '🎯 Cas d\'usage ESG Flow')}</p>
              <p className="text-emerald-900 text-base">
                <Trans i18nKey="resources.guideCsrdPme.data.useCaseBody">Toutes ces sources sont pré-connectables dans ESG Flow. Vous importez votre FEC une fois → on calcule automatiquement votre Scope 3 spend-based avec les facteurs ADEME. Vous connectez votre compte Enedis → vos kWh remontent quotidiennement. <Link to="/register" className="font-semibold underline">Voir la démo &nbsp;→</Link></Trans>
              </p>
            </div>
          </section>

          {/* ───────────────────────────────────────── */}
          <section id="rapport" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsrdPme.report.title', 'Le rapport : structure et exigences techniques')}</h2>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">{t('resources.guideCsrdPme.report.whereTitle', 'Où publier ?')}</h3>
            <p>
              <Trans i18nKey="resources.guideCsrdPme.report.whereBody">Le rapport CSRD doit être publié dans une <strong>section dédiée du rapport de gestion</strong> (et non un document séparé comme avant la DPEF). En France, le rapport de gestion est annexé aux comptes annuels et déposé au greffe avec eux.</Trans>
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsrdPme.report.formatTitle', 'Format : iXBRL / ESEF')}</h3>
            <p>
              <Trans i18nKey="resources.guideCsrdPme.report.formatBody">Pour les <strong>sociétés cotées</strong>, le rapport doit être publié au format <strong>iXBRL</strong> (Inline eXtensible Business Reporting Language), c'est-à-dire un fichier XHTML lisible humainement <em>et</em> taggué selon la taxonomie ESRS XBRL pour permettre une lecture machine (par l'AMF, EFRAG, investisseurs algo, etc.).</Trans>
            </p>
            <p>
              <Trans i18nKey="resources.guideCsrdPme.report.formatNote">Pour les sociétés <strong>non cotées</strong>, l'iXBRL n'est pas obligatoire mais reste recommandé pour faciliter l'audit.</Trans>
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsrdPme.report.auditTitle', 'Audit : assurance limitée')}</h3>
            <p>
              <Trans i18nKey="resources.guideCsrdPme.report.auditBody">Le rapport doit faire l'objet d'une <strong>assurance limitée</strong> (limited assurance) délivrée par votre commissaire aux comptes ou un Organisme Tiers Indépendant (OTI) accrédité par le COFRAC. C'est moins exigeant qu'une assurance raisonnable (reasonable assurance) mais cela impose néanmoins :</Trans>
            </p>
            <ul className="space-y-1 my-4 list-disc list-inside">
              <li><Trans i18nKey="resources.guideCsrdPme.report.audit1">Une <strong>piste d'audit</strong> documentée pour chaque indicateur (source, calcul, validation)</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.report.audit2">Un <strong>contrôle interne</strong> sur les données ESG (séparation des tâches, validation hiérarchique)</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.report.audit3">Une <strong>traçabilité</strong> permettant de remonter aux pièces sources en moins de 24 h</Trans></li>
            </ul>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 my-6">
              <p className="font-semibold text-blue-900 mb-2">{t('resources.guideCsrdPme.report.auditBoxLabel', "🔒 Comment ESG Flow vous aide à passer l'audit")}</p>
              <p className="text-blue-900 text-base">
                <Trans i18nKey="resources.guideCsrdPme.report.auditBoxBody">Chaque rapport généré dans ESG Flow inclut une <strong>empreinte SHA-256</strong> du contenu, un système de versioning automatique et un endpoint public <code className="bg-blue-100 px-1 rounded text-sm">/api/v1/reports/verify</code> que votre commissaire aux comptes peut interroger pour vérifier l'intégrité d'un PDF reçu — utile pour vos travaux d'assurance limitée (CSRD) ou raisonnable (ISA 3410).</Trans>
              </p>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">{t('resources.guideCsrdPme.report.deadlineTitle', 'Délais de publication')}</h3>
            <p>
              <Trans i18nKey="resources.guideCsrdPme.report.deadlineBody">Le rapport CSRD est publié avec le rapport de gestion, donc <strong>dans les 6 mois suivant la clôture de l'exercice</strong>. Pour un exercice clôturé au 31/12, publication au plus tard le 30/06 de l'année suivante.</Trans>
            </p>
          </section>

          {/* ───────────────────────────────────────── */}
          <section id="sanctions" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsrdPme.sanctions.title', 'Sanctions et risques')}</h2>
            <p>
              {t('resources.guideCsrdPme.sanctions.intro', "Le législateur français (transposition CSRD : ordonnance du 6 décembre 2023) a prévu plusieurs mécanismes pour faire respecter l'obligation :")}
            </p>
            <ul className="space-y-2 my-4 list-disc list-inside">
              <li><Trans i18nKey="resources.guideCsrdPme.sanctions.s1"><strong>Amende administrative</strong> de l'AMF jusqu'à 3,75 M€ (sociétés cotées) ou 50 000 € (non cotées) en cas d'absence ou de défaut grave de publication</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.sanctions.s2"><strong>Sanctions du commissaire aux comptes</strong> : refus de certification, qui bloque l'approbation des comptes en AG</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.sanctions.s3"><strong>Action en justice</strong> par les ONG ou parties prenantes pour information mensongère ou trompeuse</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.sanctions.s4"><strong>Exclusion des appels d'offres publics</strong> avec critères ESG (de plus en plus fréquents)</Trans></li>
              <li><Trans i18nKey="resources.guideCsrdPme.sanctions.s5"><strong>Risque réputationnel</strong> : la presse économique commence à publier les « mauvais élèves » de la CSRD</Trans></li>
            </ul>
            <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-5 my-6">
              <p className="font-semibold text-red-900 mb-2">{t('resources.guideCsrdPme.sanctions.boxLabel', '⚠ Au-delà des amendes')}</p>
              <p className="text-red-900 text-base">
                <Trans i18nKey="resources.guideCsrdPme.sanctions.boxBody">Le vrai risque pour une PME/ETI n'est <em>pas</em> l'amende AMF (rarement appliquée aux non-cotées) mais l'<strong>exclusion des marchés grands comptes</strong>. Si vous perdez un appel d'offres Carrefour, Engie ou Bouygues parce que votre dossier ESG est faible, l'impact financier dépasse de loin une amende administrative.</Trans>
              </p>
            </div>
          </section>

          {/* ───────────────────────────────────────── */}
          <section id="esgflow" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('resources.guideCsrdPme.esgflow.title', 'Comment ESG Flow accélère votre conformité CSRD')}</h2>
            <p>
              <Trans i18nKey="resources.guideCsrdPme.esgflow.intro">ESG Flow est la plateforme SaaS française pensée pour les PME et ETI qui veulent se mettre en conformité CSRD <strong>sans cabinet de conseil à 15 000 € ni 6 mois d'implémentation</strong>.</Trans>
            </p>

            <div className="grid md:grid-cols-2 gap-4 my-8">
              {[
                { icon: CheckCircle2, title: t('resources.guideCsrdPme.esgflow.feat1.title', '12 modules ESRS prêts'), desc: t('resources.guideCsrdPme.esgflow.feat1.desc', 'E1 à E5, S1 à S4, G1, plus ESRS 2 transversal. Tous les indicateurs préremplis selon les standards EFRAG.') },
                { icon: TrendingUp, title: t('resources.guideCsrdPme.esgflow.feat2.title', 'Matrice de double matérialité'), desc: t('resources.guideCsrdPme.esgflow.feat2.desc', 'Outil intégré pour cartographier vos enjeux, recueillir les parties prenantes et figer votre périmètre.') },
                { icon: FileText, title: t('resources.guideCsrdPme.esgflow.feat3.title', 'Rapport PDF + iXBRL'), desc: t('resources.guideCsrdPme.esgflow.feat3.desc', 'Génération en un clic, branding personnalisable, contenu prêt à insérer dans votre rapport de gestion.') },
                { icon: Shield, title: t('resources.guideCsrdPme.esgflow.feat4.title', "Piste d'audit certifiable"), desc: t('resources.guideCsrdPme.esgflow.feat4.desc', 'Hash SHA-256, versioning automatique, endpoint public de vérification — votre CAC valide en 1 heure.') },
                { icon: Sparkles, title: t('resources.guideCsrdPme.esgflow.feat5.title', 'IA narrative ETI+'), desc: t('resources.guideCsrdPme.esgflow.feat5.desc', 'Rédaction assistée pour les sections qualitatives (politiques, plans de transition, gouvernance climat).') },
                { icon: Globe, title: t('resources.guideCsrdPme.esgflow.feat6.title', 'Données 🇫🇷 hébergées en France'), desc: t('resources.guideCsrdPme.esgflow.feat6.desc', 'OVH/Scaleway, conformité RGPD, hors CLOUD Act, audit COFRAC en cours.') },
              ].map((f, i) => {
                const I = f.icon;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                      <I className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 mb-1">{f.title}</p>
                      <p className="text-base text-gray-600">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="my-8 p-6 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl text-white">
              <h3 className="text-2xl font-bold mb-2">{t('resources.guideCsrdPme.esgflow.ctaTitle', 'Essayer ESG Flow gratuitement')}</h3>
              <p className="text-emerald-50 mb-5">{t('resources.guideCsrdPme.esgflow.ctaBody', "14 jours d'essai sur le plan ETI, sans carte bancaire. Toutes les fonctionnalités débloquées.")}</p>
              <div className="flex flex-wrap gap-3">
                <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-emerald-700 font-bold text-sm hover:bg-emerald-50 transition-colors">
                  {t('resources.guideCsrdPme.esgflow.ctaPrimary', 'Démarrer mon essai')} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/pricing" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-800/50 hover:bg-emerald-800 text-white text-sm font-semibold border border-emerald-400/30 transition-colors">
                  {t('resources.guideCsrdPme.esgflow.ctaSecondary', 'Voir les tarifs')}
                </Link>
              </div>
            </div>
          </section>

          {/* ───────────────────────────────────────── */}
          <section id="faq" className="scroll-mt-24 mt-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{t('resources.guideCsrdPme.faq.title', 'Questions fréquentes')}</h2>
            <div className="space-y-4">
              {[
                { q: t('resources.guideCsrdPme.faq.q1', "Ma société de 60 salariés est-elle concernée par la CSRD ?"), a: t('resources.guideCsrdPme.faq.a1', "Directement, non (seuil post-Omnibus à 1 000 salariés). Indirectement, oui si vous fournissez des grands groupes : ils vont vous demander vos données ESG. Reporting volontaire recommandé.") },
                { q: t('resources.guideCsrdPme.faq.q2', "Quelle différence entre CSRD et DPEF ?"), a: t('resources.guideCsrdPme.faq.a2', "La DPEF (loi 2017) couvrait ~3 000 sociétés françaises. La CSRD étend à toute l'UE (~50 000 entreprises) avec des standards techniques uniformes (ESRS), un audit obligatoire et un format iXBRL. La CSRD remplace la DPEF pour les sociétés concernées.") },
                { q: t('resources.guideCsrdPme.faq.q3', "Quel budget prévoir pour la 1ère année CSRD ?"), a: t('resources.guideCsrdPme.faq.a3', "Sans outil : 30-80 k€ (cabinet de conseil + commissaire aux comptes). Avec ESG Flow : 2-5 k€/an d'abonnement + 5-15 k€ d'audit. Économie 70-90 %.") },
                { q: t('resources.guideCsrdPme.faq.q4', "Combien de temps pour produire le 1er rapport ?"), a: t('resources.guideCsrdPme.faq.a4', "Avec préparation amont : 3-4 mois (matrice de matérialité = 4-6 semaines, collecte données = 6-8 semaines, rédaction et audit = 4-6 semaines). ESG Flow accélère la collecte et la rédaction d'environ 60 %.") },
                { q: t('resources.guideCsrdPme.faq.q5', "L'iXBRL est-il obligatoire pour ma PME non cotée ?"), a: t('resources.guideCsrdPme.faq.a5', "Non. iXBRL n'est obligatoire que pour les sociétés cotées sur un marché réglementé européen. Pour les autres, un PDF suffit (mais l'iXBRL aide à l'audit).") },
                { q: t('resources.guideCsrdPme.faq.q6', "Que se passe-t-il si je ne publie pas ?"), a: t('resources.guideCsrdPme.faq.a6', "Si vous êtes légalement obligé·e : amende AMF (jusqu'à 3,75 M€ cotées / 50 k€ non-cotées), refus de certification CAC, exclusion AO publics. Si vous n'êtes pas obligé·e : pas de sanction directe, mais perte d'opportunités B2B avec les grands comptes.") },
                { q: t('resources.guideCsrdPme.faq.q7', "Peut-on utiliser ESG Flow uniquement pour le Bilan Carbone ?"), a: t('resources.guideCsrdPme.faq.a7', "Oui. Le plan PME inclut le Bilan Carbone Scopes 1/2/3 selon GHG Protocol avec les facteurs ADEME 2024. Vous n'êtes pas obligé·e d'activer les autres modules ESRS.") },
                { q: t('resources.guideCsrdPme.faq.q8', "Comment se passe l'audit avec ESG Flow ?"), a: t('resources.guideCsrdPme.faq.a8', "Chaque rapport généré inclut un hash SHA-256 et une URL de vérification publique. Votre CAC reçoit le PDF et peut vérifier l'intégrité en ouvrant /api/v1/reports/verify. Toutes les données sources sont traçables jusqu'à l'écriture comptable ou la mesure terrain.") },
              ].map((item, i) => (
                <details key={i} className="group border border-gray-200 rounded-xl overflow-hidden hover:border-emerald-300 transition-colors">
                  <summary className="flex items-start justify-between cursor-pointer p-5 hover:bg-gray-50 transition-colors">
                    <p className="font-semibold text-gray-900 pr-8">{item.q}</p>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-open:rotate-90 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-5 pb-5 text-gray-600 text-base">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* ───────────────────────────────────────── */}
          <section className="mt-16 pt-12 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('resources.guideCsrdPme.more.title', 'Pour aller plus loin')}</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <Link to="/guide/scope3-fec" className="block p-5 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all">
                <p className="font-bold text-gray-900 mb-1">{t('resources.guideCsrdPme.more.card1.title', 'Scope 3 par import FEC')}</p>
                <p className="text-sm text-gray-500">{t('resources.guideCsrdPme.more.card1.desc', 'Calculer votre empreinte chaîne de valeur en 15 minutes')}</p>
              </Link>
              <Link to="/guide/taxonomie" className="block p-5 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all">
                <p className="font-bold text-gray-900 mb-1">{t('resources.guideCsrdPme.more.card2.title', 'Taxonomie UE en pratique')}</p>
                <p className="text-sm text-gray-500">{t('resources.guideCsrdPme.more.card2.desc', 'Aligner vos CapEx/OpEx sur les 6 objectifs européens')}</p>
              </Link>
              <Link to="/omnibus-csrd" className="block p-5 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all">
                <p className="font-bold text-gray-900 mb-1">{t('resources.guideCsrdPme.more.card3.title', 'Omnibus CSRD 2025')}</p>
                <p className="text-sm text-gray-500">{t('resources.guideCsrdPme.more.card3.desc', 'Ce qui change concrètement post-simplification')}</p>
              </Link>
            </div>
          </section>

          {/* ── Newsletter / lead capture inline ─────────────────────── */}
          <section className="mt-16 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl p-8 border border-emerald-100">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{t('resources.guideCsrdPme.newsletter.title', 'Recevoir la check-list ESRS gratuite')}</h3>
                <p className="text-sm text-gray-600">{t('resources.guideCsrdPme.newsletter.body', 'PDF de 47 indicateurs ESRS prioritaires, classés par criticité. Idéal pour démarrer votre collecte de données.')}</p>
              </div>
            </div>
            <Link
              to="/ressources/checklist-csrd"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
            >
              <Download className="h-4 w-4" />
              {t('resources.guideCsrdPme.newsletter.cta', 'Télécharger gratuitement')}
            </Link>
          </section>

        </article>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <LogoBrand size="sm" variant="dark" showTagline={false} />
          <p className="text-sm text-gray-500 mt-4 mb-6">{t('resources.guideCsrdPme.footer.tagline', 'La plateforme ESG des PME et ETI françaises')}</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <Link to="/pricing" className="hover:text-emerald-600">{t('resources.guideCsrdPme.footer.pricing', 'Tarifs')}</Link>
            <Link to="/security" className="hover:text-emerald-600">{t('resources.guideCsrdPme.footer.security', 'Sécurité')}</Link>
            <Link to="/status" className="hover:text-emerald-600">{t('resources.guideCsrdPme.footer.status', 'Statut plateforme')}</Link>
            <Link to="/privacy-policy" className="hover:text-emerald-600">{t('resources.guideCsrdPme.footer.privacy', 'Confidentialité')}</Link>
            <Link to="/legal-notice" className="hover:text-emerald-600">{t('resources.guideCsrdPme.footer.legal', 'Mentions légales')}</Link>
          </div>
          <p className="text-xs text-gray-400 mt-6">© 2026 GreenConnect SAS — ESG Flow</p>
        </div>
      </footer>
    </div>
  );
}
