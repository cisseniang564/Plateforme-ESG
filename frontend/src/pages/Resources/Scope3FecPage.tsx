import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle, AlertTriangle,
  Building2, Users, FileText, Globe,
  Sparkles, ChevronDown, ChevronUp, Calendar,
  Upload, Zap, BarChart3, Layers, Flame, TrendingDown,
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

// ─── Category badge ───────────────────────────────────────────────────────────
type CatStatus = 'auto' | 'partial' | 'required';

function GhgCategory({
  num, label, status,
}: { num: number; label: string; status: CatStatus }) {
  const { t } = useTranslation();
  const badge: Record<CatStatus, { text: string; cls: string }> = {
    auto:     { text: t('resources.scope3Fec.cats.badge.auto', 'Auto FEC ✓'),          cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    partial:  { text: t('resources.scope3Fec.cats.badge.partial', 'Partiel FEC'),          cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    required: { text: t('resources.scope3Fec.cats.badge.required', 'Données requises'),     cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  };
  const borderCls: Record<CatStatus, string> = {
    auto:     'border-emerald-200 bg-emerald-50/40',
    partial:  'border-amber-200 bg-amber-50/30',
    required: 'border-gray-200 bg-white',
  };
  const { text, cls } = badge[status];
  return (
    <div className={`border rounded-xl p-4 flex flex-col gap-2 ${borderCls[status]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-400">{t('resources.scope3Fec.cats.catPrefix', 'Cat.')} {num}</span>
        <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full border ${cls}`}>{text}</span>
      </div>
      <p className="text-sm font-semibold text-gray-800 leading-snug">{label}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Scope3FecPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-white antialiased font-sans">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t('resources.scope3Fec.nav.home', 'Accueil')}
          </Link>
          <span className="text-xs text-gray-500 font-medium hidden sm:block">{t('resources.scope3Fec.nav.guideLabel', 'Guide · Scope 3 par import FEC')}</span>
          <Link to="/register" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors">
            {t('resources.scope3Fec.nav.cta', 'Essai gratuit →')}
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 pt-16 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-300 text-xs font-semibold">
              <Flame className="h-3.5 w-3.5" /> {t('resources.scope3Fec.hero.badge', 'Bilan Carbone · Mai 2026')}
            </span>
            <span className="text-slate-500 text-xs">{t('resources.scope3Fec.hero.readTime', '8 min de lecture')}</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-tight">
            {t('resources.scope3Fec.hero.titleLine1', 'Scope 3 par import FEC :')}<br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">{t('resources.scope3Fec.hero.titleLine2', 'calculez vos émissions indirectes en 1 clic')}</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl leading-relaxed mb-8">
            {t('resources.scope3Fec.hero.subtitle', 'Importez votre Fichier des Écritures Comptables depuis Sage, Cegid ou Pennylane et obtenez automatiquement vos 15 catégories GHG Protocol avec les facteurs ADEME 2024.')}
          </p>

          <div className="flex flex-wrap gap-3">
            <a href="#scope3" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-medium rounded-xl hover:bg-white/20 transition-colors">
              {t('resources.scope3Fec.hero.pill1', '15 catégories GHG Protocol')} <ChevronDown className="h-3.5 w-3.5" />
            </a>
            <a href="#probleme" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 border border-white/20 text-white text-sm font-medium rounded-xl hover:bg-white/20 transition-colors">
              {t('resources.scope3Fec.hero.pill2', 'Facteurs ADEME 2024')} <ChevronDown className="h-3.5 w-3.5" />
            </a>
            <a href="#comment" className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-400 transition-colors">
              {t('resources.scope3Fec.hero.pill3', 'Sage · Cegid · Pennylane')} <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">

        {/* ── Qu'est-ce que le Scope 3 ──────────────────────────────────────── */}
        <section id="scope3">
          <div className="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100 mb-4">
            {t('resources.scope3Fec.scope3.badge', 'Comprendre le Scope 3')}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-6">
            {t('resources.scope3Fec.scope3.title', "Qu'est-ce que le Scope 3 ?")}
          </h2>
          <p className="text-gray-600 leading-relaxed mb-6 text-lg">
            <Trans i18nKey="resources.scope3Fec.scope3.intro">
              Le Scope 3 regroupe toutes les émissions de gaz à effet de serre <strong>indirectes</strong> générées
              en amont et en aval de l'activité d'une entreprise — c'est-à-dire hors énergie propre (Scope 1) et
              hors électricité achetée (Scope 2). Le GHG Protocol décompose le Scope 3 en <strong>15 catégories</strong>
              couvrant toute la chaîne de valeur.
            </Trans>
          </p>

          <div className="grid sm:grid-cols-3 gap-5 mb-8">
            {[
              { icon: Layers, color: 'blue', label: t('resources.scope3Fec.scope3.card1.label', 'Scope 1'), desc: t('resources.scope3Fec.scope3.card1.desc', 'Émissions directes (combustion fioul, gaz, véhicules propres)') },
              { icon: Zap, color: 'violet', label: t('resources.scope3Fec.scope3.card2.label', 'Scope 2'), desc: t('resources.scope3Fec.scope3.card2.desc', 'Énergie achetée (électricité, chaleur, vapeur)') },
              { icon: Globe, color: 'emerald', label: t('resources.scope3Fec.scope3.card3.label', 'Scope 3'), desc: t('resources.scope3Fec.scope3.card3.desc', "15 catégories amont + aval — représente 70–90 % de l'empreinte totale") },
            ].map(item => (
              <div key={item.label} className={`text-center p-5 bg-${item.color}-50 border border-${item.color}-100 rounded-2xl`}>
                <div className={`w-10 h-10 bg-${item.color}-100 rounded-xl flex items-center justify-center mx-auto mb-3`}>
                  <item.icon className={`h-5 w-5 text-${item.color}-600`} />
                </div>
                <div className={`font-extrabold text-lg text-${item.color}-700 mb-1`}>{item.label}</div>
                <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-slate-600" />
              {t('resources.scope3Fec.scope3.briefTitle', 'Les 15 catégories GHG Protocol en bref')}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              <Trans i18nKey="resources.scope3Fec.scope3.briefIntro">
                Le GHG Protocol distingue les catégories <strong>amont</strong> (liées aux achats et aux intrants)
                et <strong>aval</strong> (liées aux produits vendus et à leur fin de vie). Parmi les plus significatives :
              </Trans>
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" /><span><Trans i18nKey="resources.scope3Fec.scope3.brief1"><strong>Cat. 1 — Biens &amp; services achetés :</strong> achats auprès des fournisseurs (souvent le poste le plus élevé).</Trans></span></li>
              <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" /><span><Trans i18nKey="resources.scope3Fec.scope3.brief2"><strong>Cat. 3 — Activités liées à l'énergie :</strong> extraction et transport du combustible, pertes réseau.</Trans></span></li>
              <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" /><span><Trans i18nKey="resources.scope3Fec.scope3.brief3"><strong>Cat. 4 — Transport amont :</strong> acheminement des marchandises achetées vers vos sites.</Trans></span></li>
              <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" /><span><Trans i18nKey="resources.scope3Fec.scope3.brief4"><strong>Cat. 5 — Déchets générés :</strong> traitement des déchets produits par vos opérations.</Trans></span></li>
              <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" /><span><Trans i18nKey="resources.scope3Fec.scope3.brief5"><strong>Cat. 6 — Déplacements professionnels :</strong> avion, train, hôtel pour vos salariés.</Trans></span></li>
              <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" /><span><Trans i18nKey="resources.scope3Fec.scope3.brief6"><strong>Cat. 7 — Trajets domicile-travail :</strong> mobilité des salariés hors missions.</Trans></span></li>
              <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" /><span><Trans i18nKey="resources.scope3Fec.scope3.brief7"><strong>Cat. 11 — Utilisation des produits vendus :</strong> émissions lors de l'usage final par vos clients.</Trans></span></li>
              <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" /><span><Trans i18nKey="resources.scope3Fec.scope3.brief8"><strong>Cat. 12 — Fin de vie des produits vendus :</strong> traitement, recyclage ou incinération après usage.</Trans></span></li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900 mb-1">{t('resources.scope3Fec.scope3.calloutTitle', 'Scope 3 : obligatoire CSRD, SBTi, CDP')}</div>
              <p className="text-sm text-amber-800 leading-relaxed">
                <Trans i18nKey="resources.scope3Fec.scope3.calloutBody">
                  Le Scope 3 est exigé par l'<strong>ESRS E1</strong> (CSRD), par <strong>SBTi</strong> pour la validation des objectifs
                  de réduction à 1,5 °C, et par <strong>CDP</strong> pour le questionnaire Climat. Il représente généralement
                  <strong> 70 à 90 %</strong> de l'empreinte carbone totale d'une entreprise — l'ignorer fausse complètement l'analyse.
                </Trans>
              </p>
            </div>
          </div>
        </section>

        {/* ── Le problème : collecter les données ───────────────────────────── */}
        <section id="probleme">
          <div className="inline-block px-4 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-full border border-red-100 mb-4">
            {t('resources.scope3Fec.probleme.badge', 'Le défi de la collecte Scope 3')}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            {t('resources.scope3Fec.probleme.title', 'Le problème : collecter les données Scope 3')}
          </h2>
          <p className="text-gray-600 leading-relaxed mb-8 text-lg">
            {t('resources.scope3Fec.probleme.intro', "La méthode traditionnelle de collecte des données Scope 3 est longue, coûteuse et source d'erreurs. Le FEC offre une alternative radicale : toutes vos dépenses, déjà structurées dans votre comptabilité.")}
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Avant */}
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-red-100 rounded-xl flex items-center justify-center">
                  <span className="text-red-600 font-bold text-xs">×</span>
                </div>
                <span className="font-bold text-gray-900 text-sm">{t('resources.scope3Fec.probleme.tradTitle', 'Méthode traditionnelle')}</span>
              </div>
              <ul className="space-y-2.5 text-sm text-gray-700">
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />{t('resources.scope3Fec.probleme.trad1', 'Enquêtes manuelles auprès de chaque fournisseur')}</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />{t('resources.scope3Fec.probleme.trad2', 'Tableurs Excel multi-onglets non standardisés')}</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />{t('resources.scope3Fec.probleme.trad3', 'Saisie manuelle ligne par ligne')}</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />{t('resources.scope3Fec.probleme.trad4', 'Données manquantes, incomplètes ou incohérentes')}</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" /><Trans i18nKey="resources.scope3Fec.probleme.trad5"><strong>3 à 6 mois de travail</strong> pour un résultat partiel</Trans></li>
              </ul>
            </div>

            {/* Après FEC */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <span className="text-emerald-600 font-bold text-xs">✓</span>
                </div>
                <span className="font-bold text-gray-900 text-sm">{t('resources.scope3Fec.probleme.fecTitle', 'Méthode FEC avec ESG Flow')}</span>
              </div>
              <ul className="space-y-2.5 text-sm text-gray-700">
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />{t('resources.scope3Fec.probleme.fec1', 'Export FEC depuis votre logiciel comptable existant')}</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />{t('resources.scope3Fec.probleme.fec2', 'Import glisser-déposer dans ESG Flow')}</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />{t('resources.scope3Fec.probleme.fec3', 'Lecture automatique des comptes 60x, 61x, 62x')}</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />{t('resources.scope3Fec.probleme.fec4', 'Facteurs ADEME 2024 appliqués automatiquement')}</li>
                <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" /><Trans i18nKey="resources.scope3Fec.probleme.fec5"><strong>15 catégories complètes en 1 clic</strong></Trans></li>
              </ul>
            </div>
          </div>

          {/* Before / After comparison pills */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <h3 className="font-bold text-gray-900 mb-4 text-sm">{t('resources.scope3Fec.probleme.compareTitle', 'Comparaison rapide')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">{t('resources.scope3Fec.probleme.beforeLabel', 'Avant')}</div>
                {[t('resources.scope3Fec.probleme.before1', '6 mois'), t('resources.scope3Fec.probleme.before2', 'Tableurs Excel'), t('resources.scope3Fec.probleme.before3', 'Données manquantes'), t('resources.scope3Fec.probleme.before4', 'Erreurs fréquentes')].map(v => (
                  <div key={v} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold mr-1">
                    {v}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">{t('resources.scope3Fec.probleme.afterLabel', 'Après')}</div>
                {[t('resources.scope3Fec.probleme.after1', '1 clic'), t('resources.scope3Fec.probleme.after2', 'FEC importé'), t('resources.scope3Fec.probleme.after3', '15 catégories'), t('resources.scope3Fec.probleme.after4', 'Facteurs ADEME 2024')].map(v => (
                  <div key={v} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold mr-1">
                    {v}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('resources.scope3Fec.probleme.fecBoxTitle', "Qu'est-ce que le FEC (Fichier des Écritures Comptables) ?")}
            </h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              <Trans i18nKey="resources.scope3Fec.probleme.fecBoxBody">
                Le FEC est un fichier normalisé (NF Z55-002) que <strong>tout logiciel de comptabilité certifié en France</strong> doit
                pouvoir générer. Instauré par la loi de finances 2014 pour la vérification fiscale, il contient
                l'intégralité des écritures comptables d'un exercice. ESG Flow lit les comptes <strong>60x</strong> (achats de
                matières et marchandises), <strong>61x</strong> (services extérieurs) et <strong>62x</strong> (autres services extérieurs)
                pour en extraire les dépenses par catégorie GHG Protocol et appliquer les <strong>facteurs d'émission ADEME 2024</strong>.
              </Trans>
            </p>
          </div>
        </section>

        {/* ── Comment fonctionne l'import FEC ──────────────────────────────── */}
        <section id="comment">
          <div className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100 mb-4">
            {t('resources.scope3Fec.comment.badge', "Mode d'emploi")}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            {t('resources.scope3Fec.comment.title', "Comment fonctionne l'import FEC")}
          </h2>
          <p className="text-gray-600 leading-relaxed mb-8 text-lg">
            {t('resources.scope3Fec.comment.intro', 'Quatre étapes suffisent pour passer de votre logiciel comptable à un bilan Scope 3 complet et certifiable.')}
          </p>

          <div className="space-y-4">
            {[
              {
                n: 1,
                icon: FileText,
                color: 'blue',
                title: t('resources.scope3Fec.comment.step1.title', 'Exportez votre FEC depuis Sage / Cegid / Pennylane'),
                desc: t('resources.scope3Fec.comment.step1.desc', 'Dans votre logiciel comptable, accédez au menu "Export comptable" ou "Export DGFiP" et choisissez le format FEC (extension .txt ou .csv normalisé). Cette opération prend moins de 2 minutes sur Sage 100, Cegid, Pennylane, EBP ou Quadratus.'),
              },
              {
                n: 2,
                icon: Upload,
                color: 'violet',
                title: t('resources.scope3Fec.comment.step2.title', 'Importez le fichier dans ESG Flow'),
                desc: t('resources.scope3Fec.comment.step2.desc', 'Glissez-déposez votre fichier FEC dans ESG Flow ou cliquez sur "Parcourir". ESG Flow valide automatiquement la structure du fichier (colonnes NF Z55-002) et vous informe si des données sont manquantes ou mal formatées.'),
              },
              {
                n: 3,
                icon: Zap,
                color: 'amber',
                title: t('resources.scope3Fec.comment.step3.title', 'ESG Flow analyse les comptes et applique les facteurs ADEME 2024'),
                desc: t('resources.scope3Fec.comment.step3.desc', "Le moteur de calcul lit les comptes 60x (achats), 61x (services) et 62x (autres services), les associe aux 15 catégories GHG Protocol et multiplie chaque montant par le facteur d'émission ADEME 2024 correspondant. Une note de qualité est attribuée à chaque catégorie."),
              },
              {
                n: 4,
                icon: BarChart3,
                color: 'emerald',
                title: t('resources.scope3Fec.comment.step4.title', 'Obtenez votre bilan Scope 3 complet'),
                desc: t('resources.scope3Fec.comment.step4.desc', 'ESG Flow génère votre bilan Scope 3 avec ventilation par catégorie, graphiques interactifs, comparaison année-sur-année et export PDF / Excel certifiable. Vous pouvez enrichir les catégories avec des données physiques complémentaires pour améliorer la précision.'),
              },
            ].map(step => (
              <div key={step.n} className="flex gap-5 p-5 bg-white border border-gray-200 rounded-2xl hover:shadow-md hover:border-gray-300 transition-all">
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 bg-${step.color}-100 rounded-xl flex items-center justify-center text-${step.color}-600 font-extrabold text-sm`}>
                    {step.n}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <step.icon className={`h-4 w-4 text-${step.color}-600`} />
                    <div className="font-bold text-gray-900">{step.title}</div>
                  </div>
                  <div className="text-sm text-gray-600 leading-relaxed">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Les 15 catégories GHG Protocol ───────────────────────────────── */}
        <section id="categories">
          <div className="inline-block px-4 py-1.5 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full border border-violet-100 mb-4">
            {t('resources.scope3Fec.categories.badge', 'Couverture complète')}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            {t('resources.scope3Fec.categories.title', 'Les 15 catégories GHG Protocol couvertes')}
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4 text-lg">
            {t('resources.scope3Fec.categories.intro', 'ESG Flow calcule automatiquement les catégories disponibles depuis le FEC et indique les catégories nécessitant des données complémentaires.')}
          </p>

          <div className="flex flex-wrap gap-3 mb-6">
            {[
              { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: t('resources.scope3Fec.categories.legend.auto', 'Auto FEC ✓ — calculé automatiquement') },
              { cls: 'bg-amber-100 text-amber-700 border-amber-200',       label: t('resources.scope3Fec.categories.legend.partial', 'Partiel FEC — données mixtes') },
              { cls: 'bg-gray-100 text-gray-500 border-gray-200',          label: t('resources.scope3Fec.categories.legend.required', 'Données requises — saisie complémentaire') },
            ].map(l => (
              <span key={l.label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-xs font-semibold ${l.cls}`}>
                {l.label}
              </span>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <GhgCategory num={1}  label={t('resources.scope3Fec.categories.cat1', 'Achats de biens & services')}         status="auto" />
            <GhgCategory num={2}  label={t('resources.scope3Fec.categories.cat2', "Biens d'équipement (immobilisations)")}   status="auto" />
            <GhgCategory num={3}  label={t('resources.scope3Fec.categories.cat3', "Activités liées à l'énergie")}            status="auto" />
            <GhgCategory num={4}  label={t('resources.scope3Fec.categories.cat4', 'Transport & distribution amont')}     status="auto" />
            <GhgCategory num={5}  label={t('resources.scope3Fec.categories.cat5', 'Déchets générés par les opérations')}     status="auto" />
            <GhgCategory num={6}  label={t('resources.scope3Fec.categories.cat6', 'Déplacements professionnels')}            status="auto" />
            <GhgCategory num={7}  label={t('resources.scope3Fec.categories.cat7', 'Trajets domicile-travail')}               status="required" />
            <GhgCategory num={8}  label={t('resources.scope3Fec.categories.cat8', 'Actifs loués amont')}                     status="partial" />
            <GhgCategory num={9}  label={t('resources.scope3Fec.categories.cat9', 'Transport & distribution aval')}      status="required" />
            <GhgCategory num={10} label={t('resources.scope3Fec.categories.cat10', 'Traitement des produits vendus')}         status="required" />
            <GhgCategory num={11} label={t('resources.scope3Fec.categories.cat11', 'Utilisation des produits vendus')}        status="required" />
            <GhgCategory num={12} label={t('resources.scope3Fec.categories.cat12', 'Fin de vie des produits vendus')}         status="required" />
            <GhgCategory num={13} label={t('resources.scope3Fec.categories.cat13', 'Actifs loués aval')}                      status="required" />
            <GhgCategory num={14} label={t('resources.scope3Fec.categories.cat14', 'Franchises')}                             status="required" />
            <GhgCategory num={15} label={t('resources.scope3Fec.categories.cat15', 'Investissements financiers')}             status="required" />
          </div>

          <p className="text-xs text-gray-400 mt-4">
            {t('resources.scope3Fec.categories.note', 'Les catégories marquées "Données requises" peuvent être saisies manuellement ou importées depuis d\'autres sources (RH, logistique, données produit). ESG Flow génère une note de qualité de 0 à 100 pour votre bilan global.')}
          </p>
        </section>

        {/* ── Exemples de résultats ─────────────────────────────────────────── */}
        <section id="exemples">
          <div className="inline-block px-4 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full mb-4">
            {t('resources.scope3Fec.exemples.badge', 'Cas concrets')}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-8">
            {t('resources.scope3Fec.exemples.title', 'Exemples de résultats')}
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Building2,
                color: 'blue',
                profile: t('resources.scope3Fec.exemples.ex1.profile', 'PME services'),
                size: t('resources.scope3Fec.exemples.ex1.size', '50 salariés'),
                total: t('resources.scope3Fec.exemples.ex1.total', '≈ 280 tCO₂e'),
                breakdown: [
                  { cat: t('resources.scope3Fec.exemples.ex1.b1', 'Cat. 1 — Achats'), pct: '65 %' },
                  { cat: t('resources.scope3Fec.exemples.ex1.b2', 'Cat. 6 — Déplacements'), pct: '20 %' },
                  { cat: t('resources.scope3Fec.exemples.ex1.b3', 'Autres catégories'), pct: '15 %' },
                ],
              },
              {
                icon: Flame,
                color: 'orange',
                profile: t('resources.scope3Fec.exemples.ex2.profile', 'ETI industrielle'),
                size: t('resources.scope3Fec.exemples.ex2.size', '500 salariés'),
                total: t('resources.scope3Fec.exemples.ex2.total', '≈ 8 500 tCO₂e'),
                breakdown: [
                  { cat: t('resources.scope3Fec.exemples.ex2.b1', 'Cat. 1 — Achats'), pct: '45 %' },
                  { cat: t('resources.scope3Fec.exemples.ex2.b2', 'Cat. 4 — Transport amont'), pct: '30 %' },
                  { cat: t('resources.scope3Fec.exemples.ex2.b3', 'Autres catégories'), pct: '25 %' },
                ],
              },
              {
                icon: Users,
                color: 'violet',
                profile: t('resources.scope3Fec.exemples.ex3.profile', 'Cabinet conseil'),
                size: t('resources.scope3Fec.exemples.ex3.size', '100 salariés'),
                total: t('resources.scope3Fec.exemples.ex3.total', '≈ 450 tCO₂e'),
                breakdown: [
                  { cat: t('resources.scope3Fec.exemples.ex3.b1', 'Cat. 6 — Déplacements'), pct: '55 %' },
                  { cat: t('resources.scope3Fec.exemples.ex3.b2', 'Cat. 7 — Trajets domicile-travail'), pct: '25 %' },
                  { cat: t('resources.scope3Fec.exemples.ex3.b3', 'Autres catégories'), pct: '20 %' },
                ],
              },
            ].map(ex => (
              <div key={ex.profile} className={`bg-${ex.color}-50 border border-${ex.color}-100 rounded-2xl p-6`}>
                <div className={`w-10 h-10 bg-${ex.color}-100 rounded-xl flex items-center justify-center mb-4`}>
                  <ex.icon className={`h-5 w-5 text-${ex.color}-600`} />
                </div>
                <div className="font-extrabold text-gray-900 mb-0.5">{ex.profile}</div>
                <div className="text-xs text-gray-500 mb-3">{ex.size}</div>
                <div className={`text-2xl font-extrabold text-${ex.color}-700 mb-4`}>{ex.total}</div>
                <ul className="space-y-2">
                  {ex.breakdown.map(b => (
                    <li key={b.cat} className="flex items-center justify-between text-xs text-gray-700">
                      <span>{b.cat}</span>
                      <span className={`font-bold text-${ex.color}-700`}>{b.pct}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── Réglementation liée ───────────────────────────────────────────── */}
        <section>
          <div className="inline-block px-4 py-1.5 bg-orange-50 text-orange-700 text-xs font-semibold rounded-full border border-orange-100 mb-4">
            {t('resources.scope3Fec.reglementation.badge', 'Cadre réglementaire')}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            {t('resources.scope3Fec.reglementation.title', 'Scope 3 et obligations réglementaires')}
          </h2>
          <p className="text-gray-600 leading-relaxed mb-8 text-lg">
            {t('resources.scope3Fec.reglementation.intro', "Le Scope 3 n'est plus optionnel pour les entreprises soumises aux grands référentiels ESG.")}
          </p>

          <div className="space-y-4">
            {[
              {
                n: '01',
                color: 'emerald',
                title: t('resources.scope3Fec.reglementation.item1.title', 'CSRD — ESRS E1 : obligatoire pour les assujettis'),
                desc: t('resources.scope3Fec.reglementation.item1.desc', "L'ESRS E1 (Changement climatique) exige la déclaration des émissions Scope 1, 2 et 3. Depuis l'Omnibus I, les entreprises de +1 000 salariés et +450 M€ de CA sont directement concernées. L'import FEC couvre les catégories comptables du Scope 3 conformément aux exigences de l'ESRS E1-6."),
              },
              {
                n: '02',
                color: 'blue',
                title: t('resources.scope3Fec.reglementation.item2.title', 'SBTi — Science Based Targets : Scope 3 obligatoire'),
                desc: t('resources.scope3Fec.reglementation.item2.desc', "Pour obtenir la validation SBTi de vos objectifs de réduction à 1,5 °C, le Scope 3 doit être inclus s'il représente plus de 40 % de vos émissions totales — ce qui est pratiquement toujours le cas. La méthode FEC (spend-based) est acceptée comme point de départ par le GHG Protocol."),
              },
              {
                n: '03',
                color: 'violet',
                title: t('resources.scope3Fec.reglementation.item3.title', 'CDP — Questionnaire Climat : Scope 3 noté'),
                desc: t('resources.scope3Fec.reglementation.item3.desc', 'Le questionnaire Climat CDP inclut une section dédiée au Scope 3. Les entreprises qui ne le déclarent pas perdent des points et risquent une note C ou D. ESG Flow génère les tableaux CDP-ready pour votre soumission annuelle.'),
              },
              {
                n: '04',
                color: 'orange',
                title: t('resources.scope3Fec.reglementation.item4.title', 'Supply chain : vos clients vous demanderont vos données'),
                desc: t('resources.scope3Fec.reglementation.item4.desc', 'Vos clients grands groupes soumis à la CSRD doivent déclarer leur Scope 3 catégorie 1 (achats). Ils vont vous envoyer des questionnaires fournisseurs. Avoir un bilan Scope 3 structuré vous permet de répondre en quelques minutes au lieu de plusieurs semaines.'),
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

        {/* ── ADEME 2024 ────────────────────────────────────────────────────── */}
        <section>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingDown className="h-6 w-6 text-emerald-600 flex-shrink-0" />
              <h3 className="font-bold text-gray-900 text-lg">{t('resources.scope3Fec.ademe.title', 'Pourquoi les facteurs ADEME 2024 ?')}</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              <Trans i18nKey="resources.scope3Fec.ademe.body">
                La Base Empreinte® de l'ADEME est la référence française pour les facteurs d'émission. Mise à jour
                annuellement, elle couvre plus de <strong>3 000 postes de dépenses</strong> avec des facteurs validés
                par des experts sectoriels. ESG Flow intègre la version 2024 et la met à jour dès que l'ADEME publie
                de nouvelles données.
              </Trans>
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: t('resources.scope3Fec.ademe.stat1.label', 'Facteurs disponibles'), value: t('resources.scope3Fec.ademe.stat1.value', '3 000+'), color: 'emerald' },
                { label: t('resources.scope3Fec.ademe.stat2.label', 'Mise à jour'), value: t('resources.scope3Fec.ademe.stat2.value', 'Annuelle'), color: 'blue' },
                { label: t('resources.scope3Fec.ademe.stat3.label', 'Méthode GHG Protocol'), value: t('resources.scope3Fec.ademe.stat3.value', 'Spend-based'), color: 'violet' },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <div className={`text-2xl font-extrabold text-${stat.color}-600 mb-1`}>{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-6">{t('resources.scope3Fec.faq.title', 'Questions fréquentes sur le Scope 3 par import FEC')}</h2>
          <div className="space-y-3">
            {[
              {
                q: t('resources.scope3Fec.faq.q1', 'Mon logiciel comptable génère-t-il un FEC ?'),
                a: t('resources.scope3Fec.faq.a1', 'Oui. Tous les logiciels comptables certifiés en France génèrent le FEC — c\'est une obligation légale depuis 2014 pour faciliter la vérification fiscale par la DGFiP. Sage 100, Cegid, Pennylane, EBP, Quadratus, Ciel et la plupart des ERPs disposent d\'un menu "Export FEC" ou "Export DGFiP". Si vous n\'êtes pas sûr de l\'emplacement, contactez votre éditeur ou votre expert-comptable.'),
              },
              {
                q: t('resources.scope3Fec.faq.q2', 'Quelle est la précision du calcul par FEC ?'),
                a: t('resources.scope3Fec.faq.a2', 'La méthode monétaire (spend-based) via FEC est reconnue par le GHG Protocol comme approche de niveau 1 — la plus accessible. Elle est particulièrement adaptée pour les catégories 1, 3, 4, 5 et 6 du Scope 3. La précision peut être améliorée en remplaçant les facteurs monétaires par des données physiques (kWh, km, tonnes) quand elles sont disponibles. ESG Flow génère une note de qualité de 0 à 100 pour chaque catégorie, indiquant où des améliorations sont possibles.'),
              },
              {
                q: t('resources.scope3Fec.faq.q3', 'Les données de mon FEC sont-elles confidentielles ?'),
                a: t('resources.scope3Fec.faq.a3', 'Oui. Votre fichier FEC est chiffré en AES-256 dès l\'upload, traité dans notre infrastructure hébergée en France (OVHcloud HDS), et jamais partagé avec des tiers ni utilisé pour l\'entraînement de modèles. Vous pouvez supprimer vos données à tout moment depuis votre tableau de bord. ESG Flow est conforme au RGPD et dispose d\'une certification ISO 27001 en cours.'),
              },
              {
                q: t('resources.scope3Fec.faq.q4', 'Puis-je compléter le FEC par d\'autres sources de données ?'),
                a: t('resources.scope3Fec.faq.a4', 'Oui. ESG Flow est conçu pour mixer les méthodes : le FEC couvre automatiquement les catégories comptables (1, 2, 3, 4, 5, 6), et vous pouvez ajouter des données physiques pour les autres catégories — données RH (cat. 7 trajets domicile-travail), données logistiques (cat. 9 transport aval), données produit (cat. 11 et 12), données financières (cat. 15 investissements). Vous pouvez aussi importer des facteurs d\'émission personnalisés pour votre secteur.'),
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
                <span className="text-emerald-300 text-sm font-semibold">{t('resources.scope3Fec.cta.badge', 'ESG Flow — Bilan Scope 3 en 1 clic')}</span>
              </div>
              <h2 className="text-2xl font-extrabold text-white mb-3">
                {t('resources.scope3Fec.cta.title', "Importez votre FEC et obtenez votre bilan Scope 3 aujourd'hui")}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                {t('resources.scope3Fec.cta.body', "15 catégories GHG Protocol, facteurs ADEME 2024, export PDF certifiable — tout ce qu'il vous faut pour votre CSRD, SBTi et CDP, à partir de 249 €/mois.")}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/30 text-base"
              >
                {t('resources.scope3Fec.cta.primaryBtn', 'Démarrer gratuitement — 14 jours')} <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/compare/sweep"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-2xl transition-all text-sm"
              >
                {t('resources.scope3Fec.cta.secondaryBtn', 'Comparer avec les concurrents')}
              </Link>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                <span>{t('resources.scope3Fec.cta.demoNote', 'Ou réservez une démo de 30 min avec un expert bilan carbone')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Sources ───────────────────────────────────────────────────────── */}
        <section className="text-xs text-gray-400">
          <p className="font-semibold text-gray-500 mb-2">{t('resources.scope3Fec.sources.title', 'Sources et références')}</p>
          <ul className="space-y-1">
            <li>{t('resources.scope3Fec.sources.s1', 'GHG Protocol — Corporate Value Chain (Scope 3) Accounting and Reporting Standard, 2011')}</li>
            <li>{t('resources.scope3Fec.sources.s2', "ADEME — Base Empreinte® 2024 (facteurs d'émission pour la France)")}</li>
            <li>{t('resources.scope3Fec.sources.s3', 'Direction Générale des Finances Publiques — Spécifications du FEC (NF Z55-002), mise à jour 2023')}</li>
            <li>{t('resources.scope3Fec.sources.s4', 'EFRAG — ESRS E1 Changement climatique (version adoptée Commission européenne, 2023)')}</li>
            <li>{t('resources.scope3Fec.sources.s5', 'SBTi — Corporate Net-Zero Standard v1.1, 2023')}</li>
          </ul>
        </section>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        <p><Trans i18nKey="resources.scope3Fec.footer.copyright">© 2026 GreenConnect SAS — <Link to="/privacy-policy" className="hover:text-gray-600">Confidentialité</Link> · <Link to="/legal-notice" className="hover:text-gray-600">Mentions légales</Link></Trans></p>
        <p className="mt-1">{t('resources.scope3Fec.footer.disclaimer', 'Ce guide est fourni à titre informatif. Consultez votre conseil ESG pour une analyse adaptée à votre situation.')}</p>
      </footer>
    </div>
  );
}
