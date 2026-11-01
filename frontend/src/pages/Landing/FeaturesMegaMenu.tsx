import { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FEATURE_GROUPS, FEATURES_PROMO, type FeatureItem } from './featuresCatalog';

export function useFeatureText() {
  const { t } = useTranslation();
  return {
    title: (f: FeatureItem) => t(`landing.lp.features.${f.id}.title`, f.title) as string,
    desc: (f: FeatureItem) => t(`landing.lp.features.${f.id}.desc`, f.desc) as string,
    group: (id: string, fallback: string) => t(`landing.lp.featureGroups.${id}`, fallback) as string,
    newLabel: t('landing.lp.featuresNew', 'Nouveau') as string,
    t,
  };
}

interface ItemLinkProps {
  item: FeatureItem;
  onModule: (moduleId: string) => void;
  onNavigate?: () => void;
  className: string;
  children: React.ReactNode;
}
/** Lien vers la page publique de la fonctionnalité, ou ouverture du module dans l'explorateur de modules. */
export function FeatureLink({ item, onModule, onNavigate, className, children }: ItemLinkProps) {
  if (item.to) return <Link to={item.to} onClick={onNavigate} className={className}>{children}</Link>;
  return (
    <a href="#modules" className={className}
      onClick={(e) => { e.preventDefault(); onModule(item.module || item.id); onNavigate?.(); }}>
      {children}
    </a>
  );
}

interface Props {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  scrolled: boolean;
  onModule: (moduleId: string) => void;
  onSeeAll: () => void;
}

export default function FeaturesMegaMenu({ open, onOpen, onClose, scrolled, onModule, onSeeAll }: Props) {
  const { title, desc, group, newLabel, t } = useFeatureText();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const PromoIcon = FEATURES_PROMO.icon;

  // Échap ferme le menu (et rend le focus au bouton) ; un appui hors du menu le ferme aussi (écrans tactiles).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); buttonRef.current?.focus(); } };
    const onPointer = (e: PointerEvent) => { if (!wrapperRef.current?.contains(e.target as Node)) onClose(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer); };
  }, [open, onClose]);

  return (
    <div ref={wrapperRef} className="relative" onMouseEnter={onOpen} onMouseLeave={onClose}>
      <button
        ref={buttonRef} type="button" aria-expanded={open} aria-controls="features-menu" aria-haspopup="true"
        onClick={onOpen}
        className={`px-4 py-2 font-medium transition-colors flex items-center gap-1 rounded-lg text-sm ${scrolled ? 'text-gray-700 hover:text-green-600 hover:bg-gray-50' : 'text-white/90 hover:text-white hover:bg-white/10'}`}
      >
        {t('landing.lp.nav.featuresLabel', 'Fonctionnalités')}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        // Centré dans la fenêtre (pas sous le bouton) ; pt-4 : zone transparente qui relie le bouton au panneau, pour que le survol ne se perde pas.
        <div id="features-menu" className="fixed left-1/2 -translate-x-1/2 top-[3.25rem] pt-4 w-[min(1120px,94vw)] z-50">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_280px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {FEATURE_GROUPS.map(g => (
              <div key={g.id} className="p-6">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4">{group(g.id, g.title)}</p>
                <ul className="space-y-1">
                  {g.items.map(item => (
                    <li key={item.id}>
                      <FeatureLink item={item} onModule={onModule} onNavigate={onClose}
                        className="group flex gap-3 p-2.5 -mx-2.5 rounded-xl hover:bg-green-50/60 focus-visible:bg-green-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition-colors">
                        <item.icon className="h-5 w-5 flex-shrink-0 mt-0.5 text-green-600" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-gray-900 group-hover:text-green-700">
                            {title(item)}
                            {item.isNew && <span className="ml-2 align-middle px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">{newLabel}</span>}
                          </span>
                          <span className="block text-[13px] leading-snug text-gray-500 mt-0.5">{desc(item)}</span>
                        </span>
                      </FeatureLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="bg-emerald-50/70 p-6 flex flex-col">
              <PromoIcon className="h-8 w-8 text-emerald-600" aria-hidden="true" />
              <span className="mt-4 self-start px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wide">
                {t('landing.lp.featuresPromo.badge', FEATURES_PROMO.badge)}
              </span>
              <p className="mt-2 text-base font-bold text-gray-900">{t('landing.lp.featuresPromo.title', FEATURES_PROMO.title)}</p>
              <p className="mt-1.5 text-[13px] leading-snug text-gray-600">{t('landing.lp.featuresPromo.desc', FEATURES_PROMO.desc)}</p>
              <Link to={FEATURES_PROMO.to} onClick={onClose}
                className="mt-4 inline-flex self-start px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors">
                {t('landing.lp.featuresPromo.cta', FEATURES_PROMO.cta)}
              </Link>
              <ul className="mt-auto pt-5 space-y-1.5 text-sm">
                {FEATURES_PROMO.more.map(m => (
                  <li key={m.to}><Link to={m.to} onClick={onClose} className="text-emerald-700 hover:underline font-medium">{t(`landing.lp.featuresPromo.more.${m.to}`, m.label)}</Link></li>
                ))}
                <li>
                  <a href="#fonctionnalites" onClick={(e) => { e.preventDefault(); onSeeAll(); onClose(); }} className="text-emerald-700 hover:underline font-medium">
                    {t('landing.lp.nav.featuresAll', 'Voir toutes les fonctionnalités')}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
