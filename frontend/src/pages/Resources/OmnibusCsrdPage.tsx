import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle, AlertTriangle,
  Building2, TrendingDown, Users, FileText, Globe,
  Sparkles, ChevronDown, ChevronUp, Calendar,
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

// ─── Timeline component ───────────────────────────────────────────────────────
function TimelineItem({
  date, title, desc, highlight, color,
}: {
  date: string; title: string; desc: string; highlight?: boolean; color: string;
}) {
  return (
    <div className="relative flex gap-5">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${highlight ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : `bg-${color}-100`}`}>
          <span className={`text-xs font-extrabold ${highlight ? 'text-white' : `text-${color}-600`}`}>
            {date.slice(-2)}
          </span>
        </div>
        <div className="w-0.5 flex-1 bg-gray-200 mt-2 last:hidden" />
      </div>
      <div className={`pb-10 flex-1 ${highlight ? 'bg-emerald-50 border border-emerald-100 rounded-2xl p-4 -mt-1 mb-4' : ''}`}>
        <div className={`text-xs font-semibold mb-1 ${highlight ? 'text-emerald-600' : 'text-gray-400'}`}>{date}</div>
        <div className={`font-bold mb-1 ${highlight ? 'text-emerald-900' : 'text-gray-900'}`}>{title}</div>
        <div className="text-sm text-gray-600 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OmnibusCsrdPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-white antialiased font-sans">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t('resources.omnibus.nav.home', 'Accueil')}
          </Link>
          <span className="text-xs text-gray-500 font-medium hidden sm:block">{t('resources.omnibus.nav.guideLabel', 'Guide · Omnibus CSRD 2025')}</span>
          <Link to="/register" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors">
            {t('resources.omnibus.nav.freeTrial', 'Essai gratuit')} →
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 pt-16 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-300 text-xs font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" /> {t('resources.omnibus.hero.badge', 'Réglementation · Décembre 2025')}
            </span>
            <span className="text-slate-500 text-xs">{t('resources.omnibus.hero.updated', 'Mis à jour le 17 mai 2026')}</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-tight">
            {t('resources.omnibus.hero.titleLine1', 'Omnibus CSRD : ce qui change')}<br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">{t('resources.omnibus.hero.titleLine2', 'et ce que vous devez faire maintenant')}</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl leading-relaxed mb-8">
            {t('resources.omnibus.hero.subtitle', 'Le paquet Omnibus I adopté en décembre 2025 a profondément modifié le périmètre de la CSRD. Voici ce qui a changé, qui est encore concerné, et comment les PME doivent se positionner.')}
          </p>

          <div className="flex flex-wrap gap-3">
            <a href="#perimetre" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-medium rounded-xl hover:bg-white/20 transition-colors">
              {t('resources.omnibus.hero.jumpScope', 'Nouveau périmètre')} <ChevronDown className="h-3.5 w-3.5" />
            </a>
            <a href="#pme" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-medium rounded-xl hover:bg-white/20 transition-colors">
              {t('resources.omnibus.hero.jumpPme', 'Impact PME')} <ChevronDown className="h-3.5 w-3.5" />
            </a>
            <a href="#actions" className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-400 transition-colors">
              {t('resources.omnibus.hero.jumpActions', 'Ce que faire maintenant')} <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">

        {/* ── Context ───────────────────────────────────────────────────────── */}
        <section>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900 mb-1">{t('resources.omnibus.context.title', "Ce qui a changé avec l'Omnibus I (décembre 2025)")}</div>
              <p className="text-sm text-amber-800 leading-relaxed">
                <Trans i18nKey="resources.omnibus.context.body">
                  La Commission européenne a adopté le <strong>Omnibus Simplification Package I</strong> en décembre 2025.
                  Ce texte modifie substantiellement la directive CSRD (2022/2464/UE) en réduisant son champ d'application,
                  en allégeant les exigences de reporting et en reportant les calendriers d'entrée en vigueur pour les vagues 2 et 3.
                </Trans>
              </p>
            </div>
          </div>
        </section>

        {/* ── Nouveau périmètre ─────────────────────────────────────────────── */}
        <section id="perimetre">
          <div className="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100 mb-4">
            {t('resources.omnibus.scope.badge', "Nouveau périmètre d'application")}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-8">
            {t('resources.omnibus.scope.heading', 'Qui est encore obligé par la CSRD ?')}
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Avant */}
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-red-100 rounded-xl flex items-center justify-center">
                  <span className="text-red-600 font-bold text-xs">×</span>
                </div>
                <span className="font-bold text-gray-900 text-sm">{t('resources.omnibus.scope.before.label', 'CSRD originale (2022)')}</span>
              </div>
              <ul className="space-y-2.5 text-sm text-gray-700">
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />{t('resources.omnibus.scope.before.items.0', 'Grandes entreprises cotées dès 2024')}</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />{t('resources.omnibus.scope.before.items.1', '+250 salariés ou +50 M€ CA ou +25 M€ bilan dès 2026 (vague 2)')}</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />{t('resources.omnibus.scope.before.items.2', 'PME cotées dès 2027 (vague 3)')}</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />{t('resources.omnibus.scope.before.items.3', 'Périmètre : ~50 000 entreprises en UE')}</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />{t('resources.omnibus.scope.before.items.4', '1 100+ points de données ESRS')}</li>
              </ul>
            </div>

            {/* Après Omnibus */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <span className="text-emerald-600 font-bold text-xs">✓</span>
                </div>
                <span className="font-bold text-gray-900 text-sm">{t('resources.omnibus.scope.after.label', 'Après Omnibus I (décembre 2025)')}</span>
              </div>
              <ul className="space-y-2.5 text-sm text-gray-700">
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" /><strong>{t('resources.omnibus.scope.after.items.0', 'Seuil relevé : +1 000 salariés ET +450 M€ CA')}</strong></li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />{t('resources.omnibus.scope.after.items.1', 'Vague 2 reportée à 2028–2029')}</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />{t('resources.omnibus.scope.after.items.2', 'PME cotées : exemption prolongée')}</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />{t('resources.omnibus.scope.after.items.3', 'Périmètre réduit : ~5 000–10 000 entreprises en UE')}</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />{t('resources.omnibus.scope.after.items.4', 'ESRS allégés : ~400–500 points de données')}</li>
              </ul>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-600" />
              {t('resources.omnibus.scope.check.title', 'Êtes-vous dans le périmètre ?')}
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: t('resources.omnibus.scope.check.0.label', 'Salariés'), threshold: t('resources.omnibus.scope.check.0.threshold', '≥ 1 000 ETP'), icon: Users, color: 'blue' },
                { label: t('resources.omnibus.scope.check.1.label', "Chiffre d'affaires"), threshold: t('resources.omnibus.scope.check.1.threshold', '≥ 450 M€'), icon: TrendingDown, color: 'emerald' },
                { label: t('resources.omnibus.scope.check.2.label', 'Critère supplémentaire'), threshold: t('resources.omnibus.scope.check.2.threshold', 'Ou titres cotés sur marché réglementé'), icon: Globe, color: 'violet' },
              ].map(c => (
                <div key={c.label} className="text-center">
                  <div className={`w-10 h-10 bg-${c.color}-100 rounded-xl flex items-center justify-center mx-auto mb-2`}>
                    <c.icon className={`h-5 w-5 text-${c.color}-600`} />
                  </div>
                  <div className="text-xs text-gray-500 mb-1">{c.label}</div>
                  <div className="text-sm font-bold text-gray-900">{c.threshold}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">
              {t('resources.omnibus.scope.check.note', "Les deux premiers critères sont cumulatifs (ET, pas OU) selon l'Omnibus I. Les entreprises cotées sur un marché réglementé peuvent être soumises indépendamment.")}
            </p>
          </div>
        </section>

        {/* ── Calendrier ────────────────────────────────────────────────────── */}
        <section>
          <div className="inline-block px-4 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full mb-4">
            {t('resources.omnibus.timeline.badge', 'Calendrier post-Omnibus')}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-8">{t('resources.omnibus.timeline.heading', 'Nouvelles échéances')}</h2>

          <div className="relative">
            <TimelineItem
              date="2024"
              title={t('resources.omnibus.timeline.0.title', 'Vague 1 — Grandes entreprises cotées (NFID existantes)')}
              desc={t('resources.omnibus.timeline.0.desc', "Entreprises déjà soumises à la NFID (déclaration non financière) : maintien des obligations. Premier rapport CSRD pour l'exercice 2024.")}
              color="gray"
            />
            <TimelineItem
              date="2025"
              title={t('resources.omnibus.timeline.1.title', 'Omnibus I adopté — Révision majeure du périmètre')}
              desc={t('resources.omnibus.timeline.1.desc', "Décembre 2025 : la Commission adopte l'Omnibus Simplification Package I. Le seuil passe de 250 à 1 000 salariés + 450 M€ CA. Les vagues 2 et 3 sont reportées.")}
              highlight
              color="emerald"
            />
            <TimelineItem
              date="2027"
              title={t('resources.omnibus.timeline.2.title', 'Vague 1 étendue — Grandes entreprises non cotées >1 000 sal.')}
              desc={t('resources.omnibus.timeline.2.desc', "Entreprises de plus de 1 000 salariés et 450 M€ de CA non cotées : premier exercice CSRD pour l'exercice 2026, rapport en 2027.")}
              color="blue"
            />
            <TimelineItem
              date="2028"
              title={t('resources.omnibus.timeline.3.title', 'Vague 2 — Extension (anciennement 2026)')}
              desc={t('resources.omnibus.timeline.3.desc', "ETI cotées et autres entreprises atteignant les nouveaux seuils : premier exercice CSRD pour l'exercice 2027.")}
              color="violet"
            />
            <TimelineItem
              date="2029"
              title={t('resources.omnibus.timeline.4.title', 'Vague 3 — PME cotées (anciennement 2027)')}
              desc={t('resources.omnibus.timeline.4.desc', "PME cotées sur marchés réglementés avec possibilité de standard VSME allégé. Standard ESRS PME en cours d'élaboration par l'EFRAG.")}
              color="amber"
            />
          </div>
        </section>

        {/* ── Impact PME ────────────────────────────────────────────────────── */}
        <section id="pme">
          <div className="inline-block px-4 py-1.5 bg-orange-50 text-orange-700 text-xs font-semibold rounded-full border border-orange-100 mb-4">
            {t('resources.omnibus.pme.badge', 'Ce que ça change pour les PME')}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            {t('resources.omnibus.pme.heading', 'PME non obligées — mais pas indemnes')}
          </h2>
          <p className="text-gray-600 leading-relaxed mb-8 text-lg">
            {t('resources.omnibus.pme.intro', "L'Omnibus I exonère les PME de l'obligation directe. Mais 5 pressions indirectes persistent et s'intensifient.")}
          </p>

          <div className="space-y-4">
            {[
              {
                n: '01',
                title: t('resources.omnibus.pme.items.0.title', 'Questionnaires supply chain de vos clients'),
                desc: t('resources.omnibus.pme.items.0.desc', 'Les grandes entreprises soumises à la CSRD doivent déclarer leurs émissions Scope 3 (achetées). Elles vont vous demander vos données carbone, sociales et de gouvernance — même si vous êtes une PME. Refuser ou ne pas répondre peut coûter un contrat.'),
                color: 'orange',
              },
              {
                n: '02',
                title: t('resources.omnibus.pme.items.1.title', 'Due diligence CSDDD (Devoir de vigilance)'),
                desc: t('resources.omnibus.pme.items.1.desc', "La directive CSDDD (CS3D), maintenue par l'Omnibus I, oblige les grandes entreprises à évaluer et auditer leurs fournisseurs sur les droits humains et l'environnement. Vos clients grands groupes vont conduire des audits de vos pratiques ESG."),
                color: 'red',
              },
              {
                n: '03',
                title: t('resources.omnibus.pme.items.2.title', 'Exigences des investisseurs et banques'),
                desc: t('resources.omnibus.pme.items.2.desc', "Les fonds ESG (SFDR Article 8/9) et les banques avec des engagements net-zéro conditionnent désormais leurs investissements à la transparence ESG des PME. Certains critères ESG deviennent des conditions d'accès au crédit."),
                color: 'blue',
              },
              {
                n: '04',
                title: t('resources.omnibus.pme.items.3.title', "Appels d'offres publics et secteur privé"),
                desc: t('resources.omnibus.pme.items.3.desc', "De plus en plus d'appels d'offres publics (marchés publics) et privés incluent des critères ESG dans leur notation. Les PME sans bilan ESG sont désavantagées sur les marchés à partir de 2025–2026."),
                color: 'violet',
              },
              {
                n: '05',
                title: t('resources.omnibus.pme.items.4.title', 'Standard VSME (préparation)'),
                desc: t('resources.omnibus.pme.items.4.desc', "L'EFRAG travaille sur un standard VSME (Voluntary Sustainability Reporting Standard for SMEs). Se préparer maintenant avec une plateforme structurée permet d'adopter le VSME sans effort supplémentaire quand il sera finalisé."),
                color: 'emerald',
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

        {/* ── Qu'est-ce qui change dans les ESRS ───────────────────────────── */}
        <section>
          <div className="inline-block px-4 py-1.5 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full border border-violet-100 mb-4">
            {t('resources.omnibus.esrs.badge', 'Contenu des rapports')}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-8">{t('resources.omnibus.esrs.heading', 'ESRS allégés : ce qui change')}</h2>

          <div className="grid sm:grid-cols-3 gap-5 mb-8">
            {[
              { before: t('resources.omnibus.esrs.compare.0.before', '1 100+'), after: t('resources.omnibus.esrs.compare.0.after', '~400–500'), label: t('resources.omnibus.esrs.compare.0.label', 'Points de données ESRS'), color: 'blue' },
              { before: t('resources.omnibus.esrs.compare.1.before', 'Obligatoires'), after: t('resources.omnibus.esrs.compare.1.after', 'MND + optionnel'), label: t('resources.omnibus.esrs.compare.1.label', 'Nature des indicateurs'), color: 'emerald' },
              { before: t('resources.omnibus.esrs.compare.2.before', 'Toutes PME'), after: t('resources.omnibus.esrs.compare.2.after', 'ETI/Grands groupes'), label: t('resources.omnibus.esrs.compare.2.label', 'Cible directe'), color: 'violet' },
            ].map(item => (
              <div key={item.label} className="text-center p-5 bg-gray-50 border border-gray-200 rounded-2xl">
                <div className="text-lg font-bold text-red-400 line-through mb-1">{item.before}</div>
                <div className={`text-2xl font-extrabold text-${item.color}-600 mb-2`}>{item.after}</div>
                <div className="text-xs text-gray-500">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('resources.omnibus.esrs.mnd.title', 'Indicateurs Minimum de Divulgation (MND) maintenus')}
            </h3>
            <p className="text-sm text-blue-800 leading-relaxed mb-3">
              <Trans i18nKey="resources.omnibus.esrs.mnd.body1">
                L'Omnibus I distingue les indicateurs <strong>MND (Mandatory Non-discretionary)</strong> — obligatoires pour tous les assujettis —
                des indicateurs optionnels. Les MND couvrent les données essentielles des 10 topics ESRS (E1 à G1).
              </Trans>
            </p>
            <p className="text-sm text-blue-800 leading-relaxed">
              {t('resources.omnibus.esrs.mnd.body2', 'ESG Flow intègre déjà cette distinction : chaque indicateur est marqué MND ou optionnel dans le module ESRS Gap Analysis et le CSRD Report Builder.')}
            </p>
          </div>
        </section>

        {/* ── Actions à prendre ────────────────────────────────────────────── */}
        <section id="actions">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100 mb-4">
            <Sparkles className="h-3.5 w-3.5" /> {t('resources.omnibus.actions.badge', 'Recommandations')}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">{t('resources.omnibus.actions.heading', 'Ce que vous devez faire maintenant')}</h2>
          <p className="text-gray-600 mb-8 text-lg">{t('resources.omnibus.actions.intro', 'Que vous soyez dans le périmètre direct ou non, voici les 5 actions à mener en 2026.')}</p>

          <div className="space-y-4">
            {[
              {
                step: 1, urgency: t('resources.omnibus.actions.items.0.urgency', 'Immédiat'),
                title: t('resources.omnibus.actions.items.0.title', 'Identifiez si vous êtes dans le périmètre direct'),
                desc: t('resources.omnibus.actions.items.0.desc', "Vérifiez vos effectifs et votre CA. Si vous dépassez 1 000 salariés ET 450 M€, vous serez soumis dès l'exercice 2026 (rapport 2027). Lancez immédiatement votre gap analysis ESRS."),
                color: 'red',
              },
              {
                step: 2, urgency: t('resources.omnibus.actions.items.1.urgency', 'Ce trimestre'),
                title: t('resources.omnibus.actions.items.1.title', 'Réalisez votre premier bilan carbone Scope 1/2/3'),
                desc: t('resources.omnibus.actions.items.1.desc', "Le Scope 3 est le point bloquant de la plupart des chaînes d'approvisionnement. Un bilan carbone structuré vous permettra de répondre aux questionnaires de vos clients grands groupes et de préparer votre plan de décarbonation SBTi."),
                color: 'orange',
              },
              {
                step: 3, urgency: t('resources.omnibus.actions.items.2.urgency', "Avant l'été 2026"),
                title: t('resources.omnibus.actions.items.2.title', 'Répondez aux questionnaires supply chain de vos clients'),
                desc: t('resources.omnibus.actions.items.2.desc', "Anticipez les demandes. La plupart des grandes entreprises françaises vont envoyer leurs questionnaires fournisseurs ESG en 2026 pour leurs rapports 2027. Préparez vos réponses maintenant plutôt que dans l'urgence."),
                color: 'blue',
              },
              {
                step: 4, urgency: t('resources.omnibus.actions.items.3.urgency', '2026'),
                title: t('resources.omnibus.actions.items.3.title', 'Structurez vos données sociales et gouvernance'),
                desc: t('resources.omnibus.actions.items.3.desc', 'Au-delà du carbone, les piliers Social (égalité H/F, formation, sécurité) et Gouvernance (éthique, lutte anti-corruption) sont de plus en plus scrutés. Centralisez ces données dans un outil structuré.'),
                color: 'violet',
              },
              {
                step: 5, urgency: t('resources.omnibus.actions.items.4.urgency', 'Avant 2027'),
                title: t('resources.omnibus.actions.items.4.title', 'Préparez votre rapport CSRD ou VSME'),
                desc: t('resources.omnibus.actions.items.4.desc', "Même sans obligation directe, publier un rapport de durabilité volontaire — aligné ESRS ou VSME — est un avantage commercial croissant. C'est aussi la meilleure préparation si votre croissance vous fait atteindre les seuils demain."),
                color: 'emerald',
              },
            ].map(action => (
              <div key={action.step} className="flex gap-5 p-5 bg-white border border-gray-200 rounded-2xl hover:shadow-md transition-all">
                <div className={`flex-shrink-0`}>
                  <div className={`w-10 h-10 bg-${action.color}-100 rounded-xl flex items-center justify-center text-${action.color}-600 font-extrabold text-sm`}>
                    {action.step}
                  </div>
                  <div className={`text-xs text-center mt-1.5 font-semibold text-${action.color}-600 whitespace-nowrap`}>{action.urgency}</div>
                </div>
                <div>
                  <div className="font-bold text-gray-900 mb-1">{action.title}</div>
                  <div className="text-sm text-gray-600 leading-relaxed">{action.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-6">{t('resources.omnibus.faq.heading', "Questions fréquentes sur l'Omnibus CSRD")}</h2>
          <div className="space-y-3">
            {[
              {
                q: t('resources.omnibus.faq.items.0.q', 'Mon entreprise de 300 salariés était en vague 2 — est-elle exemptée ?'),
                a: t('resources.omnibus.faq.items.0.a', "Oui. Avec l'Omnibus I, le seuil est passé à 1 000 salariés ET 450 M€ de CA. Une entreprise de 300 salariés n'est plus directement soumise à la CSRD, sauf si elle est cotée sur un marché réglementé européen. En revanche, elle reste exposée aux pressions supply chain de ses clients."),
              },
              {
                q: t('resources.omnibus.faq.items.1.q', 'Les obligations DPEF (article L.225-102-1) sont-elles maintenues ?'),
                a: t('resources.omnibus.faq.items.1.a', "La DPEF (Déclaration de Performance Extra-Financière), applicable depuis 2017 aux entreprises de plus de 500 salariés, est remplacée progressivement par la CSRD. Pour les entreprises qui dépassent les nouveaux seuils CSRD, la CSRD se substitue à la DPEF. Pour les entreprises en dessous des seuils CSRD mais au-dessus des seuils DPEF (500 sal. ou 100 M€ CA), la DPEF reste applicable jusqu'à l'adoption de textes de simplification."),
              },
              {
                q: t('resources.omnibus.faq.items.2.q', "Qu'est-ce que le VSME et pour qui s'applique-t-il ?"),
                a: t('resources.omnibus.faq.items.2.a', "Le VSME (Voluntary Sustainability Reporting Standard for SMEs) est un standard en cours d'élaboration par l'EFRAG, conçu pour les PME non cotées. Il est volontaire et allégé par rapport aux ESRS complets. Son adoption est fortement recommandée pour les PME qui répondent à des questionnaires de donneurs d'ordres ou d'investisseurs. ESG Flow est conçu pour être compatible avec le VSME dès sa finalisation."),
              },
              {
                q: t('resources.omnibus.faq.items.3.q', 'Les délais pour les entreprises déjà en vague 1 ont-ils changé ?'),
                a: t('resources.omnibus.faq.items.3.a', "Non. Les entreprises déjà soumises à la CSRD (grandes entreprises cotées, ex-NFID) restent dans leurs calendriers initiaux. L'Omnibus I a uniquement reporté les vagues 2 et 3 et relevé le seuil. La vague 1 étendue (>1 000 sal. + 450 M€ CA) démarre pour l'exercice 2026."),
              },
              {
                q: t('resources.omnibus.faq.items.4.q', "La Taxonomie UE est-elle aussi allégée par l'Omnibus ?"),
                a: t('resources.omnibus.faq.items.4.a', "L'Omnibus I contient également des simplifications pour le reporting Taxonomie UE (règlement 2020/852), notamment en réduisant les obligations de reporting quantitatif pour certaines activités. Les entreprises soumises à la Taxonomie doivent consulter les textes amendés pour leur périmètre spécifique. ESG Flow met à jour ses modules Taxonomie en temps réel selon les textes officiels."),
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
                <span className="text-emerald-300 text-sm font-semibold">{t('resources.omnibus.cta.badge', 'ESG Flow — Prêt pour post-Omnibus')}</span>
              </div>
              <h2 className="text-2xl font-extrabold text-white mb-3">
                {t('resources.omnibus.cta.title', 'Préparez votre ESG avant que vos clients vous le demandent')}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                {t('resources.omnibus.cta.body', "Bilan carbone, gap analysis ESRS, double matérialité, rapport CSRD et EU Taxonomie — tout ce qu'il vous faut pour répondre aux pressions post-Omnibus, à partir de 249 €/mois.")}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/30 text-base"
              >
                {t('resources.omnibus.cta.button1', 'Démarrer gratuitement — 14 jours')} <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/compare/sweep"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-2xl transition-all text-sm"
              >
                {t('resources.omnibus.cta.button2', 'Comparer avec les concurrents')}
              </Link>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                <span>{t('resources.omnibus.cta.demoNote', 'Ou réservez une démo de 30 min avec un expert CSRD')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Sources ───────────────────────────────────────────────────────── */}
        <section className="text-xs text-gray-400">
          <p className="font-semibold text-gray-500 mb-2">{t('resources.omnibus.sources.heading', 'Sources et références')}</p>
          <ul className="space-y-1">
            <li>{t('resources.omnibus.sources.items.0', 'Directive CSRD — 2022/2464/UE du Parlement européen et du Conseil')}</li>
            <li>{t('resources.omnibus.sources.items.1', 'Commission européenne — Omnibus I Simplification Package, décembre 2025')}</li>
            <li>{t('resources.omnibus.sources.items.2', 'EFRAG — ESRS Set 1 (août 2023), travaux VSME en cours')}</li>
            <li>{t('resources.omnibus.sources.items.3', 'Règlement Taxonomie UE — 2020/852/UE et actes délégués 2021/2178/UE')}</li>
            <li>{t('resources.omnibus.sources.items.4', 'AMF — Guide de reporting extra-financier, mise à jour 2025')}</li>
          </ul>
        </section>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        <p>
          <Trans i18nKey="resources.omnibus.footer.copyright">
            © 2026 GreenConnect SAS — <Link to="/privacy-policy" className="hover:text-gray-600">Confidentialité</Link> · <Link to="/legal-notice" className="hover:text-gray-600">Mentions légales</Link>
          </Trans>
        </p>
        <p className="mt-1">{t('resources.omnibus.footer.disclaimer', 'Ce guide est fourni à titre informatif. Consultez votre conseil juridique pour une analyse adaptée à votre situation.')}</p>
      </footer>
    </div>
  );
}
