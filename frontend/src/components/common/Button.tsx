import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  children: ReactNode;
  loading?: boolean;
  icon?: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  loading = false,
  disabled,
  icon,
  ...props
}: ButtonProps) {
  const base = [
    'inline-flex items-center justify-center font-medium rounded-xl',
    'transition-all duration-150 ease-smooth',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'select-none active:scale-[0.98]',
  ].join(' ');

  const variants: Record<string, string> = {
    primary: [
      'bg-primary-600 text-white',
      'hover:bg-primary-700 active:bg-primary-800',
      'shadow-[0_1px_2px_0_rgb(22_163_74/0.25)]',
      'hover:shadow-[0_3px_10px_-2px_rgb(22_163_74/0.4)] hover:-translate-y-px',
      'focus-visible:ring-primary-500',
    ].join(' '),

    secondary: [
      'bg-white text-gray-700',
      'border border-[#e2e8f0]',
      'hover:bg-gray-50 hover:border-gray-300',
      'shadow-[0_1px_2px_0_rgb(0_0_0/0.05)]',
      'focus-visible:ring-gray-400',
    ].join(' '),

    danger: [
      'bg-red-600 text-white',
      'hover:bg-red-700 active:bg-red-800',
      'shadow-sm hover:shadow-[0_3px_10px_-2px_rgb(220_38_38/0.4)]',
      'focus-visible:ring-red-500',
    ].join(' '),

    ghost: [
      'text-gray-600',
      'hover:bg-gray-100 hover:text-gray-900',
      'focus-visible:ring-gray-400',
    ].join(' '),

    outline: [
      'border border-[#e2e8f0] bg-white text-gray-700',
      'hover:bg-gray-50 hover:border-gray-300',
      'shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]',
      'focus-visible:ring-gray-400',
    ].join(' '),

    success: [
      'bg-emerald-600 text-white',
      'hover:bg-emerald-700 active:bg-emerald-800',
      'shadow-[0_1px_2px_0_rgb(5_150_105/0.25)]',
      'hover:shadow-[0_3px_10px_-2px_rgb(5_150_105/0.4)] hover:-translate-y-px',
      'focus-visible:ring-emerald-500',
    ].join(' '),
  };

  const sizes: Record<string, string> = {
    xs: 'px-2.5 py-1   text-xs  gap-1   h-7',
    sm: 'px-3   py-1.5 text-sm  gap-1.5 h-8',
    md: 'px-4   py-2   text-sm  gap-2   h-9',
    lg: 'px-5   py-2.5 text-sm  gap-2   h-10',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4 flex-shrink-0"
          fill="none" viewBox="0 0 24 24"
        >
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}
