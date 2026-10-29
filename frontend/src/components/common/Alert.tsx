import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

type AlertTone = 'success' | 'warning' | 'danger' | 'info';

const TONES = {
  success: { box: 'bg-emerald-50 border-emerald-200 text-emerald-900', icon: CheckCircle2,  color: 'text-emerald-600' },
  warning: { box: 'bg-amber-50 border-amber-200 text-amber-900',       icon: AlertTriangle, color: 'text-amber-600' },
  danger:  { box: 'bg-red-50 border-red-200 text-red-900',             icon: AlertCircle,   color: 'text-red-600' },
  info:    { box: 'bg-blue-50 border-blue-200 text-blue-900',          icon: Info,          color: 'text-blue-600' },
};

interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  /** Bouton ou lien à droite (ex. « Réessayer »). */
  action?: ReactNode;
}

export default function Alert({ tone = 'info', title, children, action }: AlertProps) {
  const { box, icon: Icon, color } = TONES[tone];
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${box}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${color}`} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
