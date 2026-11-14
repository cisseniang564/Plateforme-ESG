// En-tête commun aux pages « Collecte » : titre, actions et onglets de navigation.
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Database, Download, FolderOpen, Upload } from 'lucide-react';

const TABS = [
  { to: '/app/data-entry', key: 'collect.tabEntry', fallback: 'Saisie', icon: Database },
  { to: '/app/import-csv', key: 'collect.tabImport', fallback: 'Import de fichier', icon: Upload },
  { to: '/app/my-data', key: 'collect.tabMyData', fallback: 'Mes données', icon: FolderOpen },
  { to: '/app/data-export', key: 'collect.tabExport', fallback: 'Export', icon: Download },
] as const;

export default function CollectHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <nav aria-label={t('collect.navLabel', 'Collecte des données')} className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map(({ to, key, fallback, icon: Icon }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'
              }`}>
            <Icon className="h-4 w-4" aria-hidden="true" />{t(key, fallback)}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

// Styles partagés (mêmes boutons et champs sur les quatre pages).
export const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50';
export const btnSecondary = 'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';
export const field = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500';
export const card = 'rounded-xl border border-gray-200 bg-white';
