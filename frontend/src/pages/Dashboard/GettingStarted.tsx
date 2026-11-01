import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Building2, Calculator, FileUp, Plug, PenLine, Sparkles, Play } from 'lucide-react';

/**
 * Parcours des premières minutes, affiché quand le compte n'a encore aucune organisation :
 * ajouter l'organisation, apporter des données (4 voies), obtenir un premier score.
 */
export default function GettingStarted() {
  const { t } = useTranslation();

  const ways = [
    { to: '/app/data-entry', icon: PenLine, label: t('dashboard.start.wayEntry', 'Saisir à la main'), hint: t('dashboard.start.wayEntryHint', 'Quelques indicateurs suffisent pour démarrer') },
    { to: '/app/import-csv', icon: FileUp, label: t('dashboard.start.wayCsv', 'Importer un fichier'), hint: t('dashboard.start.wayCsvHint', 'CSV ou Excel que vous avez déjà') },
    { to: '/app/data/connectors', icon: Plug, label: t('dashboard.start.wayConnect', 'Connecter un outil'), hint: t('dashboard.start.wayConnectHint', 'Paie, comptabilité, RH') },
    { to: '/app/gaia', icon: Sparkles, label: t('dashboard.start.wayGaia', 'Analyser un rapport avec Gaïa'), hint: t('dashboard.start.wayGaiaHint', 'Déposez un rapport existant') },
  ];

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-kpi sm:p-10" aria-labelledby="start-title">
      <div className="max-w-2xl">
        <h2 id="start-title" className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          {t('dashboard.emptyTitle', 'Bienvenue sur ESGFlow')}
        </h2>
        <p className="mt-2 text-gray-500">
          {t('dashboard.start.intro', "Trois étapes pour obtenir votre premier score. Vos données restent privées : rien n'est partagé sans votre décision.")}
        </p>
      </div>

      <ol className="mt-8 grid gap-4 lg:grid-cols-3">
        {/* 1 */}
        <li className="flex flex-col rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">1</span>
          <h3 className="mt-3 flex items-center gap-2 font-semibold text-gray-900"><Building2 className="h-4 w-4 text-emerald-700" />{t('dashboard.start.s1', 'Ajoutez votre organisation')}</h3>
          <p className="mt-1 flex-1 text-sm text-gray-600">{t('dashboard.start.s1Text', 'Nom, secteur et effectif : environ deux minutes. L\'effectif permet d\'adapter le score à votre taille.')}</p>
          <Link to="/app/organizations" className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
            {t('dashboard.emptyCta', 'Ajouter une organisation')} <ArrowRight className="h-4 w-4" />
          </Link>
        </li>

        {/* 2 */}
        <li className="flex flex-col rounded-2xl border border-gray-200 p-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">2</span>
          <h3 className="mt-3 font-semibold text-gray-900">{t('dashboard.start.s2', 'Apportez vos données')}</h3>
          <p className="mt-1 text-sm text-gray-600">{t('dashboard.start.s2Text', 'Choisissez la voie la plus simple pour vous :')}</p>
          <ul className="mt-3 space-y-1.5">
            {ways.map(w => (
              <li key={w.to}>
                <Link to={w.to} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-gray-50">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 group-hover:bg-emerald-100 group-hover:text-emerald-700"><w.icon className="h-4 w-4" /></span>
                  <span className="min-w-0"><span className="block text-sm font-medium text-gray-900">{w.label}</span><span className="block text-xs text-gray-500">{w.hint}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </li>

        {/* 3 */}
        <li className="flex flex-col rounded-2xl border border-gray-200 p-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">3</span>
          <h3 className="mt-3 flex items-center gap-2 font-semibold text-gray-900"><Calculator className="h-4 w-4 text-gray-600" />{t('dashboard.start.s3', 'Obtenez votre premier score')}</h3>
          <p className="mt-1 flex-1 text-sm text-gray-600">{t('dashboard.start.s3Text', 'Le score se calcule dès que quelques indicateurs sont renseignés, et le bouton « Comment ce score est calculé » en détaille la méthode.')}</p>
          <Link to="/app/scores/calculate" className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">
            {t('dashboard.start.s3Cta', 'Calculer le score')} <ArrowRight className="h-4 w-4" />
          </Link>
        </li>
      </ol>

      <p className="mt-6 text-sm text-gray-500">
        {t('dashboard.start.demoLead', 'Pas encore prêt à saisir quoi que ce soit ?')}{' '}
        <Link to="/demo" className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline"><Play className="h-3.5 w-3.5" />{t('dashboard.start.demo', 'Parcourir une démonstration avec des données fictives')}</Link>
      </p>
    </section>
  );
}
