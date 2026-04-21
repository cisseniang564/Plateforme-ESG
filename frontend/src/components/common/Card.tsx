import type { ReactNode, CSSProperties } from 'react';

type CardVariant = 'default' | 'elevated' | 'flat' | 'outlined';
type AccentColor = 'green' | 'blue' | 'violet' | 'amber' | 'red' | 'cyan' | 'pink';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  headerRight?: ReactNode;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  /** Visual style variant */
  variant?: CardVariant;
  /** Optional left-border accent color */
  accent?: AccentColor;
  /** Stretch to fill parent height */
  fullHeight?: boolean;
  style?: CSSProperties;
}

const ACCENT_COLORS: Record<AccentColor, string> = {
  green:  'border-l-4 border-l-emerald-500',
  blue:   'border-l-4 border-l-blue-500',
  violet: 'border-l-4 border-l-violet-500',
  amber:  'border-l-4 border-l-amber-500',
  red:    'border-l-4 border-l-red-500',
  cyan:   'border-l-4 border-l-cyan-500',
  pink:   'border-l-4 border-l-pink-500',
};

const VARIANT_STYLES: Record<CardVariant, string> = {
  default:  'bg-white border border-[#e8ecf0] shadow-card',
  elevated: 'bg-white border border-[#e8ecf0] shadow-card-lg',
  flat:     'bg-white border border-[#f0f4f8]',
  outlined: 'bg-transparent border-2 border-[#e2e8f0]',
};

const PAD: Record<string, string> = {
  none: '',
  sm:   'p-4',
  md:   'p-5',
  lg:   'p-6',
};

export default function Card({
  title,
  subtitle,
  children,
  className = '',
  footer,
  headerRight,
  onClick,
  padding = 'md',
  hover = false,
  variant = 'default',
  accent,
  fullHeight = false,
  style,
}: CardProps) {
  return (
    <div
      className={[
        'rounded-2xl',
        VARIANT_STYLES[variant],
        accent ? ACCENT_COLORS[accent] : '',
        hover || onClick
          ? 'hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer'
          : '',
        fullHeight ? 'h-full flex flex-col' : '',
        PAD[padding],
        className,
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      style={style}
    >
      {/* Header */}
      {(title || subtitle || headerRight) && (
        <div
          className={[
            'flex items-start justify-between gap-4',
            padding !== 'none' ? 'mb-4' : 'px-5 pt-5 mb-4',
            fullHeight ? '' : '',
          ].filter(Boolean).join(' ')}
        >
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-[15px] font-semibold text-gray-900 leading-snug tracking-tight truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{subtitle}</p>
            )}
          </div>
          {headerRight && (
            <div className="flex-shrink-0">{headerRight}</div>
          )}
        </div>
      )}

      {/* Body */}
      <div className={fullHeight ? 'flex-1 min-h-0' : ''}>{children}</div>

      {/* Footer */}
      {footer && (
        <div className="border-t border-[#f0f4f8] pt-4 mt-4">
          {footer}
        </div>
      )}
    </div>
  );
}
