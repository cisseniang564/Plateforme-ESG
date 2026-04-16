import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  onClick?: () => void;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  hover?: boolean;
}

export default function Card({
  title,
  subtitle,
  children,
  className = '',
  footer,
  onClick,
  padding = 'md',
  hover = false,
}: CardProps) {
  const padMap = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };

  return (
    <div
      className={`
        bg-white rounded-2xl border border-gray-100 shadow-sm
        ${hover ? 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${padMap[padding]}
        ${className}
      `}
      onClick={onClick}
    >
      {(title || subtitle) && (
        <div className={`${padding !== 'none' ? 'mb-4' : 'px-5 pt-5 mb-4'}`}>
          {title && (
            <h3 className="text-base font-semibold text-gray-900 leading-tight">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      )}
      <div>{children}</div>
      {footer && (
        <div className="border-t border-gray-100 pt-4 mt-4">
          {footer}
        </div>
      )}
    </div>
  );
}
