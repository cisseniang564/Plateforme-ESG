import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import EmptyState from './EmptyState';

export interface Column<T> {
  key: keyof T & string;
  header: string;
  /** Affichage personnalisé de la cellule. */
  render?: (value: T[keyof T], row: T) => ReactNode;
  /** Clic sur l'en-tête pour trier. */
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  /** Champ unique d'une ligne (par défaut « id »). */
  rowKey?: keyof T & string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  /** « compact » pour les écrans de saisie denses. */
  density?: 'comfortable' | 'compact';
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' };

export default function Table<T extends object>({
  data,
  columns,
  rowKey = 'id' as keyof T & string,
  onRowClick,
  loading = false,
  emptyTitle = 'Aucune donnée',
  emptyDescription,
  emptyAction,
  density = 'comfortable',
}: TableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  const rows = useMemo(() => {
    if (!sort) return data;
    const k = sort.key as keyof T;
    const sign = sort.dir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const x = a[k] as unknown as number | string;
      const y = b[k] as unknown as number | string;
      return (x > y ? 1 : x < y ? -1 : 0) * sign;
    });
  }, [data, sort]);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }));

  const cell = density === 'compact' ? 'px-4 py-2' : 'px-6 py-3.5';

  if (!loading && data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => {
              const active = sort?.key === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={`${cell} ${ALIGN[col.align ?? 'left']} text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap`}
                >
                  {col.sortable ? (
                    <button type="button" onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1 uppercase hover:text-gray-900">
                      {col.header}
                      {active ? (sort!.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-50" />}
                    </button>
                  ) : col.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className={cell}><div className="h-4 rounded bg-gray-100 animate-pulse" /></td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={String(row[rowKey])}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`${cell} ${ALIGN[col.align ?? 'left']} text-gray-700 whitespace-nowrap`}>
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
