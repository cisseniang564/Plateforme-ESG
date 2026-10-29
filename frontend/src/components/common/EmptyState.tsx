import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Bouton d'action principal (ex. « Ajouter une donnée »). */
  action?: ReactNode;
}

/** Affiché quand une liste ou un tableau est vide : explique quoi faire ensuite. */
export default function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="p-3 rounded-2xl bg-gray-100 mb-4">
        <Icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
