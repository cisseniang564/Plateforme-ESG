/**
 * ESG Flow — Composants logo officiels.
 *
 * LogoMark   : icône seule (F-feuille avec flux de données).
 * LogoBrand  : icône + wordmark "ESG FLOW" (variantes claire/sombre).
 *
 * Tous les assets résident dans /public/brand/.
 */

interface LogoMarkProps {
  size?: number;
  className?: string;
  rounded?: boolean;
}

/**
 * Icône seule — image PNG du logo (feuille verte/cyan + flux de données).
 * Sélectionne automatiquement la version la plus proche de la taille demandée
 * pour éviter les artefacts d'upscale.
 */
export function LogoMark({ size = 32, className = '', rounded = false }: LogoMarkProps) {
  // SVG source — crisp at any resolution, no PNG needed.
  // v4 filename = clean fetch across all browsers (query strings are unreliable
  // for icon/favicon caches).
  const src = `/icon-esgflow-v4.svg`;

  return (
    <img
      src={src}
      alt="ESG Flow"
      width={size}
      height={size}
      className={`${className} ${rounded ? 'rounded-xl' : ''}`.trim()}
      style={{ objectFit: 'contain', display: 'block', flexShrink: 0 }}
      draggable={false}
      onError={(e) => {
        // Fallback propre si le SVG ne charge pas
        const t = e.currentTarget;
        t.onerror = null;
        t.style.display = 'none';
        const el = document.createElement('div');
        el.style.cssText = `width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.25)}px;background:linear-gradient(135deg,#10b981,#0891b2);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.38)}px;font-weight:900;color:white;font-family:system-ui,sans-serif;flex-shrink:0;letter-spacing:-0.5px;`;
        el.textContent = 'G';
        t.parentNode?.insertBefore(el, t);
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

type LogoBrandVariant = 'light' | 'dark';
type LogoBrandSize    = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface LogoBrandProps {
  size?:    LogoBrandSize;
  variant?: LogoBrandVariant;   // 'light' = texte blanc (fond sombre) | 'dark' = texte gris (fond clair)
  className?: string;
  showTagline?: boolean;        // affiche "Plateforme ESG intelligente" en dessous
}

const SIZE_CONFIG: Record<LogoBrandSize, { iconPx: number; name: string; tag: string; gap: string }> = {
  xs: { iconPx: 22, name: 'text-xs',   tag: 'text-[8px]',  gap: 'gap-1.5' },
  sm: { iconPx: 28, name: 'text-sm',   tag: 'text-[9px]',  gap: 'gap-2'   },
  md: { iconPx: 36, name: 'text-base', tag: 'text-[10px]', gap: 'gap-2.5' },
  lg: { iconPx: 44, name: 'text-lg',   tag: 'text-xs',     gap: 'gap-3'   },
  xl: { iconPx: 56, name: 'text-2xl',  tag: 'text-sm',     gap: 'gap-3.5' },
};

/**
 * Logo complet : icône + wordmark "ESG FLOW".
 *
 * variant="light"  → wordmark blanc + accent cyan/vert  (fond sombre)
 * variant="dark"   → wordmark gris foncé + accent vert  (fond clair)
 */
export function LogoBrand({
  size = 'md',
  variant = 'light',
  className = '',
  showTagline = true,
}: LogoBrandProps) {
  const cfg = SIZE_CONFIG[size];

  const nameColor   = variant === 'light' ? 'text-white'        : 'text-gray-900';
  const accentColor = variant === 'light' ? 'text-emerald-400'  : 'text-emerald-600';
  const tagColor    = variant === 'light' ? 'text-white/60'     : 'text-gray-400';

  return (
    <div className={`flex items-center ${cfg.gap} ${className}`}>
      <LogoMark size={cfg.iconPx} />
      <div className="flex flex-col leading-none select-none">
        <span className={`${cfg.name} font-extrabold tracking-tight leading-none ${nameColor}`}>
          ESG<span className={accentColor}> FLOW</span>
        </span>
        {showTagline && (
          <span className={`${cfg.tag} font-medium mt-1 tracking-wider uppercase ${tagColor}`}>
            Data · Carbon · Impact
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

interface LogoFullProps {
  width?: number | string;
  className?: string;
}

/**
 * Logo "hero" complet (icône + ESG FLOW + tagline + sous-titre),
 * idéal pour pages marketing, splash screens, hero sections,
 * pages d'authentification.
 *
 * Image officielle 1254x1254 sur fond navy — peut être superposé sur
 * un fond sombre OU laissé tel quel (le fond est intégré au PNG).
 */
export function LogoFull({ width = 280, className = '' }: LogoFullProps) {
  return (
    <img
      src="/brand/logo-full.png"
      alt="ESG Flow — Plateforme ESG intelligente"
      style={{ width, height: 'auto', display: 'block' }}
      className={className}
      draggable={false}
    />
  );
}
