import type { ReactNode } from 'react';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

const TONES: Record<Tone, { box: string; dot: string }> = {
  success: { box: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  warning: { box: 'bg-amber-50 text-amber-700 ring-amber-600/20',       dot: 'bg-amber-500' },
  danger:  { box: 'bg-red-50 text-red-700 ring-red-600/20',             dot: 'bg-red-500' },
  info:    { box: 'bg-blue-50 text-blue-700 ring-blue-600/20',          dot: 'bg-blue-500' },
  neutral: { box: 'bg-gray-100 text-gray-700 ring-gray-500/20',         dot: 'bg-gray-400' },
  brand:   { box: 'bg-primary-50 text-primary-700 ring-primary-600/20', dot: 'bg-primary-500' },
};

interface BadgeProps {
  tone?: Tone;
  /** Petit point coloré devant le texte. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export default function Badge({ tone = 'neutral', dot = false, children, className = '' }: BadgeProps) {
  const t = TONES[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${t.box} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden="true" />}
      {children}
    </span>
  );
}
