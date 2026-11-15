import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FEATURE_GROUPS } from './featuresCatalog';
import { FeatureLink, useFeatureText } from './FeaturesMegaMenu';

interface Props { onModule: (moduleId: string) => void }

// Un groupe par couleur du logo : vert, bleu, violet (collecter, analyser, rapporter).
const GROUP_STYLE = [
  { rule: 'border-emerald-500', tile: 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100' },
  { rule: 'border-blue-500', tile: 'bg-blue-50 text-blue-700 group-hover:bg-blue-100' },
  { rule: 'border-violet-500', tile: 'bg-violet-50 text-violet-700 group-hover:bg-violet-100' },
];

/** Vue d'ensemble des fonctionnalités, rangées par besoin : de la donnée au rapport. */
export default function FeaturesOverview({ onModule }: Props) {
  const { title, desc, group, newLabel, t } = useFeatureText();
  return (
    <section id="fonctionnalites" className="scroll-mt-16 bg-white py-20 sm:py-24" aria-labelledby="features-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="features-title" className="font-display text-3xl font-medium tracking-tight text-gray-900 sm:text-4xl">
          {t('landing.lp.featuresSection.title', 'De la donnée au rapport, sans changer d’outil')}
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-gray-600">
          {t('landing.lp.featuresSection.subtitle', 'Collectez, fiabilisez, analysez, puis rapportez et répondez à vos clients : chaque étape s’appuie sur les mêmes données.')}
        </p>

        <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-3">
          {FEATURE_GROUPS.map((g, gi) => {
            const style = GROUP_STYLE[gi % GROUP_STYLE.length];
            return (
              <div key={g.id}>
                <h3 className={`border-t-[3px] pt-4 font-display text-2xl font-medium text-gray-900 ${style.rule}`}>{group(g.id, g.title)}</h3>
                <ul className="mt-4 space-y-1">
                  {g.items.map(item => (
                    <li key={item.id}>
                      <FeatureLink item={item} onModule={onModule}
                        className="group -mx-3 flex gap-4 rounded-xl p-3 transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
                        <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${style.tile}`}>
                          <item.icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[15px] font-semibold text-gray-900">
                            {title(item)}
                            {item.isNew && <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 align-middle text-[10px] font-bold text-emerald-800">{newLabel}</span>}
                          </span>
                          <span className="mt-1 block text-sm leading-relaxed text-gray-600">{desc(item)}</span>
                        </span>
                      </FeatureLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-3">
          <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
            {t('landing.lp.nav.trial', 'Essai gratuit')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link to="/demo" className="inline-flex items-center rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
            {t('landing.lp.nav.demo', 'Voir la démo')}
          </Link>
        </div>
      </div>
    </section>
  );
}
