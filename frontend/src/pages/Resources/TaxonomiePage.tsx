import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle, AlertTriangle,
  FileText, Globe, Sparkles, ChevronDown, ChevronUp,
  Shield, Layers, Scale, BookOpen, X,
} from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

// ─── FAQ component ────────────────────────────────────────────────────────────
function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-2xl overflow-hidden transition-colors ${open ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-white'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left"
      >
        <span className="font-semibold text-gray-900 pr-4">{q}</span>
        {open
          ? <ChevronUp className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-6 pb-5 text-gray-600 leading-relaxed border-t border-gray-100 pt-4 text-sm">
          {a}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TaxonomiePage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-white antialiased font-sans">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t('resources.taxonomie.nav.home', 'Accueil')}
          </Link>
          <span className="text-xs text-gray-500 font-medium hidden sm:block">{t('resources.taxonomie.nav.guideLabel', 'Guide · Taxonomie européenne 2024')}</span>
          <Link to="/register" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors">
            {t('resources.taxonomie.nav.freeTrial', 'Essai gratuit')} →
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 pt-16 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300 text-xs font-semibold">
              <Globe className="h-3.5 w-3.5" /> {t('resources.taxonomie.hero.badge', 'Taxonomie UE · Avril 2026')}
            </span>
            <span className="text-slate-500 text-xs">{t('resources.taxonomie.hero.readingTime', '10 min de lecture')}</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-tight">
            {t('resources.taxonomie.hero.titleLine1', 'Taxonomie européenne 2024 : éligibilité vs alignement,')}<br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">{t('resources.taxonomie.hero.titleLine2', 'les pièges à éviter')}</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl leading-relaxed mb-8">
            {t('resources.taxonomie.hero.subtitle', 'Critères de contribution substantielle, DNSH et garanties minimales : décryptage des obligations pour vos activités économiques et comment ne pas confondre éligibilité et alignement.')}
          </p>

          {/* Quick stats pills */}
          <div className="flex flex-wrap gap-3 mb-10">
            {[
              t('resources.taxonomie.hero.pills.0', 'Règlement 2020/852/UE'),
              t('resources.taxonomie.hero.pills.1', '6 objectifs environnementaux'),
              t('resources.taxonomie.hero.pills.2', 'Contribution + DNSH + MinSafeguards'),
            ].map((pill, i) => (
              <span key={i} className="inline-flex items-center px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-medium rounded-xl">
                {pill}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <a href="#intro" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-medium rounded-xl hover:bg-white/20 transition-colors">
              {t('resources.taxonomie.hero.jumpIntro', "Qu'est-ce que la Taxonomie ?")} <ChevronDown className="h-3.5 w-3.5" />
            </a>
            <a href="#eligibilite" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-medium rounded-xl hover:bg-white/20 transition-colors">
              {t('resources.taxonomie.hero.jumpEligibility', 'Éligibilité vs Alignement')} <ChevronDown className="h-3.5 w-3.5" />
            </a>
            <a href="#pieges" className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-400 transition-colors">
              {t('resources.taxonomie.hero.jumpPitfalls', 'Les 5 pièges à éviter')} <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">

        {/* ── Section 1 — Intro ─────────────────────────────────────────────── */}
        <section id="intro">
          <div className="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100 mb-4">
            {t('resources.taxonomie.intro.badge', 'Fondamentaux')}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-6">
            {t('resources.taxonomie.intro.heading', "C'est quoi la Taxonomie européenne ?")}
          </h2>
          <p className="text-gray-600 leading-relaxed text-lg mb-8">
            {t('resources.taxonomie.intro.body', "La Taxonomie UE (Règlement 2020/852/UE) est un système de classification qui définit ce qui compte comme une activité économique durable sur le plan environnemental. Elle sert de socle au Green Deal européen, à la finance durable et aux obligations de reporting de l'Article 8 de la CSRD.")}
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[
              { num: '1', label: t('resources.taxonomie.objectives.0', 'Atténuation du changement climatique'), color: 'emerald', active: true },
              { num: '2', label: t('resources.taxonomie.objectives.1', 'Adaptation au changement climatique'), color: 'blue', active: true },
              { num: '3', label: t('resources.taxonomie.objectives.2', "Utilisation durable de l'eau et des ressources marines"), color: 'cyan', active: false },
              { num: '4', label: t('resources.taxonomie.objectives.3', 'Transition vers une économie circulaire'), color: 'violet', active: false },
              { num: '5', label: t('resources.taxonomie.objectives.4', 'Prévention et contrôle de la pollution'), color: 'orange', active: false },
              { num: '6', label: t('resources.taxonomie.objectives.5', 'Protection et restauration de la biodiversité'), color: 'lime', active: false },
            ].map(obj => (
              <div
                key={obj.num}
                className={`relative p-5 rounded-2xl border ${obj.active ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}
              >
                {obj.active && (
                  <span className="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                    {t('resources.taxonomie.objectives.available', 'Critères disponibles')}
                  </span>
                )}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm mb-3 ${obj.active ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {obj.num}
                </div>
                <div className={`font-semibold text-sm ${obj.active ? 'text-emerald-900' : 'text-gray-600'}`}>{obj.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900 mb-1">{t('resources.taxonomie.intro.warningTitle', 'Objectifs 1 et 2 uniquement opérationnels à ce stade')}</div>
              <p className="text-sm text-amber-800 leading-relaxed">
                {t('resources.taxonomie.intro.warningBody', 'Seuls les objectifs 1 (atténuation) et 2 (adaptation) disposent de critères techniques détaillés et opposables. Les objectifs 3 à 6 ont reçu leurs premiers actes délégués en 2023, mais leurs critères restent moins exhaustifs. ESG Flow les intègre progressivement au fil de la publication des textes officiels.')}
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 2 — Éligibilité vs Alignement ────────────────────────── */}
        <section id="eligibilite">
          <div className="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100 mb-4">
            {t('resources.taxonomie.eligibility.badge', 'La distinction essentielle')}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            {t('resources.taxonomie.eligibility.heading', 'Éligibilité vs Alignement : la confusion la plus courante')}
          </h2>
          <p className="text-gray-600 leading-relaxed text-lg mb-8">
            {t('resources.taxonomie.eligibility.intro', "C'est la distinction la plus importante — et la plus fréquemment mal comprise par les entreprises dans leur premier rapport Taxonomie.")}
          </p>

          {/* Side-by-side comparison */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            {/* Éligibilité */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-extrabold text-blue-900 text-lg">{t('resources.taxonomie.eligibility.elig.title', 'Éligibilité')}</span>
              </div>
              <ul className="space-y-3 text-sm">
                <li>
                  <span className="font-semibold text-blue-800 block mb-0.5">{t('resources.taxonomie.eligibility.elig.defLabel', 'Définition')}</span>
                  <span className="text-blue-700">{t('resources.taxonomie.eligibility.elig.defText', 'Votre activité figure dans les annexes de la Taxonomie UE (elle PEUT potentiellement être "verte").')}</span>
                </li>
                <li>
                  <span className="font-semibold text-blue-800 block mb-0.5">{t('resources.taxonomie.eligibility.elig.testLabel', 'Test')}</span>
                  <span className="text-blue-700">{t('resources.taxonomie.eligibility.elig.testText', 'Mon activité apparaît-elle dans la liste des activités avec des critères techniques ?')}</span>
                </li>
                <li>
                  <span className="font-semibold text-blue-800 block mb-0.5">{t('resources.taxonomie.eligibility.elig.exLabel', 'Exemple')}</span>
                  <span className="text-blue-700">{t('resources.taxonomie.eligibility.elig.exText', 'La construction de bâtiments est listée → éligible.')}</span>
                </li>
                <li>
                  <span className="font-semibold text-blue-800 block mb-0.5">{t('resources.taxonomie.eligibility.elig.repLabel', 'Reporting')}</span>
                  <span className="text-blue-700">{t('resources.taxonomie.eligibility.elig.repText', 'Vous déclarez le % de CA/CapEx/OpEx éligibles.')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-red-700 font-semibold">{t('resources.taxonomie.eligibility.elig.warning', "N'est PAS suffisant pour se dire \"vert\".")}</span>
                </li>
              </ul>
            </div>

            {/* Alignement */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="font-extrabold text-emerald-900 text-lg">{t('resources.taxonomie.eligibility.align.title', 'Alignement')}</span>
              </div>
              <ul className="space-y-3 text-sm">
                <li>
                  <span className="font-semibold text-emerald-800 block mb-0.5">{t('resources.taxonomie.eligibility.align.defLabel', 'Définition')}</span>
                  <span className="text-emerald-700">{t('resources.taxonomie.eligibility.align.defText', 'Votre activité remplit réellement les 3 conditions cumulatives : (1) SC + (2) DNSH + (3) MinSafeguards.')}</span>
                </li>
                <li>
                  <span className="font-semibold text-emerald-800 block mb-0.5">{t('resources.taxonomie.eligibility.align.testLabel', 'Test')}</span>
                  <span className="text-emerald-700">{t('resources.taxonomie.eligibility.align.testText', 'Contribue-t-elle substantiellement + ne nuit pas significativement + respecte les garanties sociales minimales ?')}</span>
                </li>
                <li>
                  <span className="font-semibold text-emerald-800 block mb-0.5">{t('resources.taxonomie.eligibility.align.exLabel', 'Exemple')}</span>
                  <span className="text-emerald-700">{t('resources.taxonomie.eligibility.align.exText', 'Le bâtiment construit doit atteindre une performance énergétique EPC classe A + pas de nuisance eau/biodiversité + droits du travail respectés.')}</span>
                </li>
                <li>
                  <span className="font-semibold text-emerald-800 block mb-0.5">{t('resources.taxonomie.eligibility.align.repLabel', 'Reporting')}</span>
                  <span className="text-emerald-700">{t('resources.taxonomie.eligibility.align.repText', 'Vous déclarez séparément le % de CA/CapEx/OpEx alignés.')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-emerald-700 font-semibold">{t('resources.taxonomie.eligibility.align.warning', "Seul l'alignement justifie la qualification \"verte\".")}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 3 cumulative conditions */}
          <div className="inline-block px-4 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full mb-6">
            {t('resources.taxonomie.conditions.badge', "Les 3 conditions cumulatives pour l'alignement")}
          </div>
          <div className="space-y-4">
            {[
              {
                num: 1,
                icon: Sparkles,
                title: t('resources.taxonomie.conditions.0.title', 'Contribution Substantielle (SC)'),
                desc: t('resources.taxonomie.conditions.0.desc', "L'activité contribue substantiellement à au moins un des 6 objectifs environnementaux. Des seuils quantitatifs précis s'appliquent — par exemple, une performance énergétique ≤ 10e percentile local pour les bâtiments neufs (critère EPC)."),
                color: 'emerald',
              },
              {
                num: 2,
                icon: Shield,
                title: t('resources.taxonomie.conditions.1.title', 'DNSH (Do No Significant Harm)'),
                desc: t('resources.taxonomie.conditions.1.desc', "L'activité ne nuit pas significativement à l'un des 5 autres objectifs environnementaux. Chaque objectif doit être vérifié individuellement avec des critères spécifiques. Même une activité 'verte' comme le solaire photovoltaïque doit passer le DNSH eau et biodiversité."),
                color: 'blue',
              },
              {
                num: 3,
                icon: Scale,
                title: t('resources.taxonomie.conditions.2.title', 'Garanties Minimales (MinSafeguards)'),
                desc: t('resources.taxonomie.conditions.2.desc', "Conformité avec les Principes directeurs de l'OCDE pour les entreprises multinationales, les Principes directeurs des Nations Unies sur les entreprises et les droits de l'homme, les conventions fondamentales de l'OIT et la Charte des droits fondamentaux de l'UE."),
                color: 'violet',
              },
            ].map(cond => (
              <div key={cond.num} className="flex gap-5 p-5 bg-white border border-gray-200 rounded-2xl hover:shadow-md hover:border-gray-300 transition-all">
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 bg-${cond.color}-100 rounded-xl flex items-center justify-center text-${cond.color}-600 font-extrabold text-sm`}>
                    {cond.num}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <cond.icon className={`h-4 w-4 text-${cond.color}-600`} />
                    <span className="font-bold text-gray-900">{cond.title}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{cond.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 3 — Les 5 pièges ──────────────────────────────────────── */}
        <section id="pieges">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-full border border-red-100 mb-4">
            <AlertTriangle className="h-3.5 w-3.5" /> {t('resources.taxonomie.pitfalls.badge', 'Erreurs fréquentes')}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            {t('resources.taxonomie.pitfalls.heading', 'Les 5 pièges les plus fréquents')}
          </h2>
          <p className="text-gray-600 leading-relaxed text-lg mb-8">
            {t('resources.taxonomie.pitfalls.intro', 'Ces erreurs reviennent systématiquement dans les premiers rapports Taxonomie. Elles peuvent conduire à des retraitements, des sanctions ou des accusations de greenwashing.')}
          </p>

          <div className="space-y-4">
            {[
              {
                n: '01',
                title: t('resources.taxonomie.pitfalls.0.title', 'Confondre éligibilité et alignement'),
                desc: t('resources.taxonomie.pitfalls.0.desc', "Reportez vos % d'éligibilité ET d'alignement séparément. Dire \"X% de notre CA est conforme à la Taxonomie\" sans préciser éligibilité vs alignement est une erreur de communication — et une potentielle non-conformité réglementaire."),
                color: 'red',
              },
              {
                n: '02',
                title: t('resources.taxonomie.pitfalls.1.title', 'Ignorer le DNSH pour les activités "vertes"'),
                desc: t('resources.taxonomie.pitfalls.1.desc', "Une activité d'énergie solaire doit quand même passer le DNSH eau (pas d'impact sur les ressources en eau), biodiversité (pas d'installation sur des zones protégées), etc. Ce n'est pas automatique — chaque objectif doit être documenté."),
                color: 'orange',
              },
              {
                n: '03',
                title: t('resources.taxonomie.pitfalls.2.title', 'Oublier les Garanties Minimales'),
                desc: t('resources.taxonomie.pitfalls.2.desc', "Même une activité parfaitement SC + DNSH n'est pas alignée si l'entreprise ne respecte pas les droits humains, les droits des travailleurs et les principes anti-corruption. Le pilier G de l'ESG est nécessaire à l'alignement Taxonomie."),
                color: 'amber',
              },
              {
                n: '04',
                title: t('resources.taxonomie.pitfalls.3.title', 'Mal calculer les KPIs (CA, CapEx, OpEx)'),
                desc: t('resources.taxonomie.pitfalls.3.desc', "Le règlement délégué 2021/2178/UE impose des règles précises pour calculer les 3 KPIs. Un cabinet de conseil doit par exemple bien distinguer le CA \"taxonomie-éligible\" de ses services selon la nature des prestations effectivement fournies."),
                color: 'blue',
              },
              {
                n: '05',
                title: t('resources.taxonomie.pitfalls.4.title', 'Ne pas documenter les preuves'),
                desc: t('resources.taxonomie.pitfalls.4.desc', "L'alignement doit être justifié par des preuves concrètes (certifications, bilans énergie, attestations fournisseurs, contrats). Sans trail documentaire, l'auditeur rejettera l'alignement. ESG Flow lie chaque déclaration Taxonomie à ses pièces justificatives."),
                color: 'violet',
              },
            ].map(item => (
              <div key={item.n} className="flex gap-5 p-5 bg-white border border-gray-200 rounded-2xl hover:shadow-md hover:border-gray-300 transition-all">
                <div className={`w-10 h-10 bg-${item.color}-100 rounded-xl flex items-center justify-center flex-shrink-0 text-${item.color}-600 font-extrabold text-sm`}>
                  {item.n}
                </div>
                <div>
                  <div className="font-bold text-gray-900 mb-1">{item.title}</div>
                  <div className="text-sm text-gray-600 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 4 — Périmètre ─────────────────────────────────────────── */}
        <section id="perimetre">
          <div className="inline-block px-4 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full mb-4">
            {t('resources.taxonomie.scope.badge', "Périmètre d'application")}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-8">
            {t('resources.taxonomie.scope.heading', 'Quelles entreprises doivent reporter la Taxonomie ?')}
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200">
                  <th className="text-left px-5 py-4 font-semibold text-gray-700">{t('resources.taxonomie.scope.colCategory', 'Catégorie')}</th>
                  <th className="text-left px-5 py-4 font-semibold text-gray-700">{t('resources.taxonomie.scope.colObligation', 'Obligation')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  {
                    category: t('resources.taxonomie.scope.rows.0.category', 'Grandes entreprises soumises CSRD (>1 000 sal. + >450 M€ CA après Omnibus)'),
                    obligation: t('resources.taxonomie.scope.rows.0.obligation', 'CSRD Article 8 obligatoire → % CA, CapEx, OpEx éligibles ET alignés'),
                    highlight: true,
                  },
                  {
                    category: t('resources.taxonomie.scope.rows.1.category', 'Sociétés de gestion SFDR Art. 8/9'),
                    obligation: t('resources.taxonomie.scope.rows.1.obligation', 'Reporting SFDR + Taxonomie alignement'),
                    highlight: false,
                  },
                  {
                    category: t('resources.taxonomie.scope.rows.2.category', 'Banques / assurances sujets SFDR'),
                    obligation: t('resources.taxonomie.scope.rows.2.obligation', 'Green Asset Ratio (GAR) ou BTAR'),
                    highlight: false,
                  },
                  {
                    category: t('resources.taxonomie.scope.rows.3.category', 'PME non soumises'),
                    obligation: t('resources.taxonomie.scope.rows.3.obligation', 'Volontaire, fortement recommandé si clients grands groupes'),
                    highlight: false,
                  },
                ].map((row, i) => (
                  <tr key={i} className={row.highlight ? 'bg-emerald-50' : 'bg-white'}>
                    <td className={`px-5 py-4 font-medium ${row.highlight ? 'text-emerald-900' : 'text-gray-900'}`}>
                      {row.category}
                    </td>
                    <td className={`px-5 py-4 ${row.highlight ? 'text-emerald-800' : 'text-gray-600'}`}>
                      {row.obligation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4">
            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 leading-relaxed">
              {t('resources.taxonomie.scope.note', "Post-Omnibus I, certaines obligations de reporting Taxonomie sont simplifiées, notamment les estimations pour le CapEx et les obligations quantitatives pour certaines catégories d'activités.")}{' '}
              <Link to="/omnibus-csrd" className="font-semibold underline underline-offset-2 hover:text-blue-900">
                {t('resources.taxonomie.scope.noteLink', 'Lire notre guide Omnibus CSRD →')}
              </Link>
            </p>
          </div>
        </section>

        {/* ── Section 5 — ESG Flow ──────────────────────────────────────────── */}
        <section id="esgflow">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100 mb-4">
            <Sparkles className="h-3.5 w-3.5" /> {t('resources.taxonomie.esgflow.badge', 'Solution')}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            {t('resources.taxonomie.esgflow.heading', 'Comment ESG Flow simplifie votre reporting Taxonomie')}
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-8">
            {t('resources.taxonomie.esgflow.intro', "Un module Taxonomie guidé, de la qualification NACE jusqu'à l'export réglementaire final.")}
          </p>

          <div className="grid sm:grid-cols-2 gap-5">
            {[
              {
                icon: Layers,
                title: t('resources.taxonomie.esgflow.features.0.title', 'Wizard guidé par activité économique (code NACE)'),
                desc: t('resources.taxonomie.esgflow.features.0.desc', 'Identifiez vos activités Taxonomie-éligibles à partir de votre code NACE. Le wizard vous guide step-by-step pour chaque activité.'),
                color: 'blue',
              },
              {
                icon: CheckCircle,
                title: t('resources.taxonomie.esgflow.features.1.title', 'Check-list SC + DNSH + MinSafeguards par objectif'),
                desc: t('resources.taxonomie.esgflow.features.1.desc', 'Pour chaque activité, ESG Flow vérifie les 3 conditions cumulatives avec des critères mis à jour en temps réel selon les textes officiels.'),
                color: 'emerald',
              },
              {
                icon: Globe,
                title: t('resources.taxonomie.esgflow.features.2.title', 'Calcul automatique des 3 KPIs (CA, CapEx, OpEx)'),
                desc: t('resources.taxonomie.esgflow.features.2.desc', 'Conformément au règlement délégué 2021/2178/UE. ESG Flow calcule et ventile automatiquement vos KPIs par activité et par objectif.'),
                color: 'violet',
              },
              {
                icon: Shield,
                title: t('resources.taxonomie.esgflow.features.3.title', 'Evidence Vault : liez vos justificatifs à chaque critère'),
                desc: t('resources.taxonomie.esgflow.features.3.desc', 'Attachez certifications, bilans énergétiques et attestations directement à chaque critère Taxonomie pour un trail documentaire complet et auditable.'),
                color: 'orange',
              },
            ].map(feature => (
              <div key={feature.title} className="p-6 bg-white border border-gray-200 rounded-2xl hover:shadow-md hover:border-gray-300 transition-all">
                <div className={`w-10 h-10 bg-${feature.color}-100 rounded-xl flex items-center justify-center mb-4`}>
                  <feature.icon className={`h-5 w-5 text-${feature.color}-600`} />
                </div>
                <div className="font-bold text-gray-900 mb-2">{feature.title}</div>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-6">{t('resources.taxonomie.faq.heading', 'Questions fréquentes sur la Taxonomie européenne')}</h2>
          <div className="space-y-3">
            {[
              {
                q: t('resources.taxonomie.faq.0.q', 'Dois-je reporter la Taxonomie si je suis une PME ?'),
                a: t('resources.taxonomie.faq.0.a', "Pas d'obligation directe pour les PME non cotées en dessous des seuils CSRD post-Omnibus. Mais vos clients grands groupes peuvent vous demander vos données Taxonomie pour calculer leurs propres KPIs. Se préparer volontairement est recommandé — et facilite votre référencement fournisseur."),
              },
              {
                q: t('resources.taxonomie.faq.1.q', 'La Taxonomie couvre-t-elle le social et la gouvernance ?'),
                a: t('resources.taxonomie.faq.1.a', "Non, la Taxonomie UE actuelle ne couvre que les 6 objectifs environnementaux. Le projet de Taxonomie sociale est en cours de développement par la Commission, mais n'a pas encore force de loi. Attention : les Garanties Minimales (MinSafeguards) intègrent bien une dimension sociale, mais elles conditionnent l'alignement environnemental plutôt que de constituer un volet social indépendant."),
              },
              {
                q: t('resources.taxonomie.faq.2.q', "Qu'est-ce qu'une activité 'de transition' vs 'habilitante' ?"),
                a: t('resources.taxonomie.faq.2.a', "Les activités de transition (ex : véhicules au gaz naturel) contribuent à la décarbonation mais sans solution zéro-carbone disponible aujourd'hui. Les activités habilitantes (ex : fabrication d'éoliennes, isolation thermique) permettent à d'autres activités d'atteindre les objectifs environnementaux. Les deux peuvent être alignées avec des critères techniques spécifiques définis dans les annexes de la Taxonomie."),
              },
              {
                q: t('resources.taxonomie.faq.3.q', 'Les objectifs 3 à 6 sont-ils déjà applicables ?'),
                a: t('resources.taxonomie.faq.3.a', "Les objectifs Eau (3), Économie circulaire (4), Pollution (5) et Biodiversité (6) ont reçu leurs premiers actes délégués en 2023. Ils sont applicables mais encore moins détaillés par rapport aux objectifs 1 et 2, dont les critères couvrent la grande majorité des secteurs. ESG Flow les intègre au fur et à mesure de la publication des textes techniques officiels."),
              },
              {
                q: t('resources.taxonomie.faq.4.q', "Comment l'Omnibus I a-t-il modifié le reporting Taxonomie ?"),
                a: t('resources.taxonomie.faq.4.a', "L'Omnibus I a simplifié certains aspects du reporting Taxonomie, notamment en réduisant les obligations quantitatives pour certaines activités et en permettant des estimations pour le CapEx. Le périmètre des entreprises soumises reste aligné sur la CSRD après l'Omnibus (>1 000 sal. + 450 M€ CA). Les entreprises déjà en vague 1 (ex-NFID) conservent leurs calendriers initiaux."),
              },
            ].map((faq, i) => (
              <Faq key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <section style={{ background: 'linear-gradient(135deg, #064e3b 0%, #134e4a 50%, #1e3a5f 100%)' }} className="rounded-3xl p-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                <span className="text-emerald-300 text-sm font-semibold">{t('resources.taxonomie.cta.label', 'ESG Flow — Module Taxonomie UE')}</span>
              </div>
              <h2 className="text-2xl font-extrabold text-white mb-3">
                {t('resources.taxonomie.cta.title', 'Votre reporting Taxonomie, sans confusion entre éligibilité et alignement')}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                {t('resources.taxonomie.cta.body', "Wizard NACE, check-list SC + DNSH + MinSafeguards, calcul automatique des 3 KPIs et Evidence Vault — tout ce qu'il faut pour un rapport Taxonomie auditable, à partir de 249 €/mois.")}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/30 text-base"
              >
                {t('resources.taxonomie.cta.button1', 'Démarrer gratuitement — 14 jours')} <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/omnibus-csrd"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-2xl transition-all text-sm"
              >
                <BookOpen className="h-4 w-4" />
                {t('resources.taxonomie.cta.button2', 'Lire aussi : Guide Omnibus CSRD')}
              </Link>
            </div>
          </div>
        </section>

        {/* ── Sources ───────────────────────────────────────────────────────── */}
        <section className="text-xs text-gray-400">
          <p className="font-semibold text-gray-500 mb-2">{t('resources.taxonomie.sources.heading', 'Sources et références')}</p>
          <ul className="space-y-1">
            <li>{t('resources.taxonomie.sources.0', 'Règlement Taxonomie UE — 2020/852/UE du Parlement européen et du Conseil')}</li>
            <li>{t('resources.taxonomie.sources.1', 'Règlement délégué — 2021/2178/UE (Article 8 — KPIs Taxonomie)')}</li>
            <li>{t('resources.taxonomie.sources.2', 'Actes délégués Taxonomie Climatique — 2021/2139/UE et 2023/2486/UE')}</li>
            <li>{t('resources.taxonomie.sources.3', 'Commission européenne — Omnibus I Simplification Package, décembre 2025')}</li>
            <li>{t('resources.taxonomie.sources.4', 'EFRAG — Technical Expert Group (TEG) Taxonomy reports')}</li>
            <li>{t('resources.taxonomie.sources.5', 'AMF — Position recommandation sur le reporting Taxonomie, mise à jour 2025')}</li>
          </ul>
        </section>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        <p>
          <Trans i18nKey="resources.taxonomie.footer.copyright">
            © 2026 GreenConnect SAS — <Link to="/privacy-policy" className="hover:text-gray-600">Confidentialité</Link> · <Link to="/legal-notice" className="hover:text-gray-600">Mentions légales</Link>
          </Trans>
        </p>
        <p className="mt-1">{t('resources.taxonomie.footer.disclaimer', 'Ce guide est fourni à titre informatif. Consultez votre conseil juridique pour une analyse adaptée à votre situation.')}</p>
      </footer>
    </div>
  );
}
