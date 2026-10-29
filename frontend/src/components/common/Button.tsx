import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Icône affichée avant le texte. */
  icon?: ReactNode;
  /** Bouton carré avec seulement une icône : pense à mettre un aria-label. */
  iconOnly?: boolean;
  fullWidth?: boolean;
}

const BASE = [
  'inline-flex items-center justify-center font-medium rounded-xl select-none',
  'transition-all duration-150 ease-smooth active:scale-[0.98]',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
].join(' ');

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-btn-primary hover:shadow-btn-primary-hover hover:-translate-y-px focus-visible:ring-primary-500',
  success:   'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm focus-visible:ring-emerald-500',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm focus-visible:ring-red-500',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm focus-visible:ring-gray-400',
  outline:   'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 focus-visible:ring-gray-400',
  ghost:     'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400',
};

const SIZES: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1',
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

const ICON_ONLY_SIZES: Record<Size, string> = {
  xs: 'h-7 w-7',
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconOnly = false,
  fullWidth = false,
  type = 'button', // évite l'envoi involontaire d'un formulaire
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const sizeClass = iconOnly ? ICON_ONLY_SIZES[size] : SIZES[size];
  const classes = [BASE, VARIANTS[variant], sizeClass, fullWidth ? 'w-full' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? (
        <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
