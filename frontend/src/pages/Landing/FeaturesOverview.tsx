import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FEATURE_GROUPS } from './featuresCatalog';
import { FeatureLink, useFeatureText } from './FeaturesMegaMenu';

interface Props { onModule: (moduleId: string) => void }

/** Vue d'ensemble des fonctionnalités, rangées par besoin : de la donnée au rapport. */
export default function FeaturesOverview({ onModule }: Props) {
  const { title, desc, group, newLabel, t } = useFeatureText();
  return (
    <section id="fonctionnalites" className="py-24 bg-gray-50 border-y border-gray-100" aria-labelledby="features-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-sm font-semibold text-green-600 uppercase tracking-widest">{t('landing.lp.featuresSection.eyebrow', 'Fonctionnalités')}</span>
          <h2 id="features-title" className="text-4xl font-bold text-gray-900 mt-3 mb-4">{t('landing.lp.featuresSection.title', 'De la donnée au rapport, sans changer d’outil')}</h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            {t('landing.lp.featuresSection.subtitle', 'Collectez, fiabilisez, analysez, puis rapportez et répondez à vos clients : chaque étape s’appuie sur les mêmes données.')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {FEATURE_GROUPS.map(g => (
            <div key={g.id}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5 pb-3 border-b border-gray-200">{group(g.id, g.title)}</h3>
              <ul className="space-y-2">
                {g.items.map(item => (
                  <li key={item.id}>
                    <FeatureLink item={item} onModule={onModule}
                      className="group flex gap-4 p-4 -mx-4 rounded-2xl hover:bg-white hover:shadow-sm focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition-all">
                      <span className="w-10 h-10 rounded-xl bg-green-50 group-hover:bg-green-100 flex items-center justify-center flex-shrink-0 transition-colors">
                        <item.icon className="h-5 w-5 text-green-600" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[15px] font-semibold text-gray-900">
                          {title(item)}
                          {item.isNew && <span className="ml-2 align-middle px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">{newLabel}</span>}
                        </span>
                        <span className="block text-sm leading-relaxed text-gray-500 mt-1">{desc(item)}</span>
                      </span>
                    </FeatureLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
          <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-green-600/25 transition-all hover:-translate-y-0.5">
            {t('landing.lp.nav.trial', 'Essai gratuit')} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/demo" className="inline-flex items-center gap-2 px-6 py-3 border border-green-600 text-green-700 hover:bg-green-50 font-semibold rounded-xl text-sm transition-colors">
            {t('landing.lp.nav.demo', 'Voir la démo')}
          </Link>
        </div>
      </div>
    </section>
  );
}
