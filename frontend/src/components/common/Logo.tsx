/**
 * ESGFlow — composants logo.
 *
 * Le logo : trois flux aux couleurs des piliers de l'application (vert = environnement,
 * bleu = social, violet = gouvernance). Il montre ce que fait le produit : trois piliers, un seul flux de données.
 *
 *   LogoMark  : l'icône seule (sans fond, ou sur tuile sombre pour les petits formats).
 *   Wordmark  : le nom « ESGFlow » (ESG en gras, Flow en léger).
 *   LogoBrand : icône + nom, pour les en-têtes.
 *
 * Fichiers d'icône : /public/icon-esgflow-v5.svg (favicon) et /public/brand/icon-esgflow-v5-*.png.
 */

export const BRAND_COLORS = { environment: '#10b981', social: '#3b82f6', governance: '#8b5cf6', tile: '#0f172a' } as const;

interface LogoMarkProps {
  size?: number;
  className?: string;
  /** Sur une tuile sombre arrondie (icône d'application, fonds clairs ou chargés). */
  tile?: boolean;
  /** Icône décorative : le nom est déjà lu à côté (évite une double annonce par les lecteurs d'écran). */
  decorative?: boolean;
}

function Waves() {
  return (
    <>
      <path d="M8 14 C18 6 28 22 48 14" fill="none" stroke={BRAND_COLORS.environment} strokeWidth="7" strokeLinecap="round" />
      <path d="M8 28 C18 20 28 36 48 28" fill="none" stroke={BRAND_COLORS.social} strokeWidth="7" strokeLinecap="round" />
      <path d="M8 42 C18 34 28 50 48 42" fill="none" stroke={BRAND_COLORS.governance} strokeWidth="7" strokeLinecap="round" />
    </>
  );
}

export function LogoMark({ size = 32, className = '', tile = false, decorative = false }: LogoMarkProps) {
  const a11y = decorative ? { 'aria-hidden': true as const } : { role: 'img' as const, 'aria-label': 'ESGFlow' };
  return tile ? (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} style={{ display: 'block', flexShrink: 0 }} {...a11y}>
      <rect width="64" height="64" rx="16" fill={BRAND_COLORS.tile} />
      <g transform="translate(4,4)"><Waves /></g>
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 56 56" className={className} style={{ display: 'block', flexShrink: 0 }} {...a11y}>
      <Waves />
    </svg>
  );
}

interface WordmarkProps {
  /** Taille et couleur du texte via Tailwind (ex. « text-xl »). */
  className?: string;
  /** « light » = texte clair pour fond sombre ; « dark » = texte sombre pour fond clair. */
  tone?: 'light' | 'dark';
}

export function Wordmark({ className = 'text-xl', tone = 'dark' }: WordmarkProps) {
  const base = tone === 'light' ? 'text-white' : 'text-gray-900';
  const accent = tone === 'light' ? 'text-emerald-400' : 'text-emerald-600';
  return (
    <span className={`font-semibold tracking-tight leading-none select-none ${base} ${className}`}>
      ESG<span className={`font-normal ${accent}`}>Flow</span>
    </span>
  );
}

type LogoBrandVariant = 'light' | 'dark';
type LogoBrandSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface LogoBrandProps {
  size?: LogoBrandSize;
  variant?: LogoBrandVariant;   // 'light' = texte blanc (fond sombre) | 'dark' = texte gris (fond clair)
  className?: string;
  showTagline?: boolean;
}

const SIZE_CONFIG: Record<LogoBrandSize, { iconPx: number; name: string; tag: string; gap: string }> = {
  xs: { iconPx: 20, name: 'text-sm',   tag: 'text-[8px]',  gap: 'gap-1.5' },
  sm: { iconPx: 24, name: 'text-base', tag: 'text-[9px]',  gap: 'gap-2'   },
  md: { iconPx: 32, name: 'text-lg',   tag: 'text-[10px]', gap: 'gap-2.5' },
  lg: { iconPx: 40, name: 'text-xl',   tag: 'text-xs',     gap: 'gap-3'   },
  xl: { iconPx: 52, name: 'text-3xl',  tag: 'text-sm',     gap: 'gap-3.5' },
};

export function LogoBrand({ size = 'md', variant = 'light', className = '', showTagline = false }: LogoBrandProps) {
  const cfg = SIZE_CONFIG[size];
  const tagColor = variant === 'light' ? 'text-white/60' : 'text-gray-400';
  return (
    <div className={`flex items-center ${cfg.gap} ${className}`}>
      <LogoMark size={cfg.iconPx} decorative />
      <div className="flex flex-col">
        <Wordmark className={cfg.name} tone={variant} />
        {showTagline && <span className={`${cfg.tag} font-medium mt-1 tracking-wider uppercase ${tagColor}`}>Data · Carbon · Impact</span>}
      </div>
    </div>
  );
}
