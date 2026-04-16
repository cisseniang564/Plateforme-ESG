/**
 * QuickActions — Floating Action Button accessible depuis toutes les pages.
 * Donne un accès en 1 clic aux actions les plus fréquentes :
 * - Saisir une donnée
 * - Nouvelle organisation
 * - Importer CSV
 * - Générer un rapport
 * - Calculer les scores
 */
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, X, Database, Building2, Upload, FileText,
  Zap, BarChart3,
} from 'lucide-react'

interface QuickAction {
  label: string
  icon: React.ElementType
  href: string
  color: string
  bgColor: string
  shortcut?: string
}

const ACTIONS: QuickAction[] = [
  {
    label: 'Saisir une donnée',
    icon: Database,
    href: '/app/data-entry',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    shortcut: 'D',
  },
  {
    label: 'Nouvelle organisation',
    icon: Building2,
    href: '/app/organizations',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    shortcut: 'O',
  },
  {
    label: 'Importer CSV',
    icon: Upload,
    href: '/app/import-csv',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    shortcut: 'I',
  },
  {
    label: 'Générer un rapport',
    icon: FileText,
    href: '/app/reports',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    shortcut: 'R',
  },
  {
    label: 'Calculer les scores',
    icon: BarChart3,
    href: '/app/scores/calculate',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
    shortcut: 'S',
  },
]

export default function QuickActions() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fermer sur clic extérieur
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Raccourci clavier : Alt+A pour ouvrir/fermer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'a') {
        e.preventDefault()
        setOpen(v => !v)
      }
      if (e.key === 'Escape') setOpen(false)
      // Raccourcis des actions (quand ouvert)
      if (open) {
        const action = ACTIONS.find(a => a.shortcut && e.key.toLowerCase() === a.shortcut.toLowerCase())
        if (action) {
          setOpen(false)
          navigate(action.href)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, navigate])

  const handleAction = (href: string) => {
    setOpen(false)
    // Si c'est organisations, on navigue et on déclenche l'ouverture du modal via state
    if (href === '/app/organizations') {
      navigate(href, { state: { openCreate: true } })
    } else {
      navigate(href)
    }
  }

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">

      {/* Menu des actions */}
      <div
        className={`flex flex-col gap-2 transition-all duration-200 ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {ACTIONS.map((action, i) => {
          const Icon = action.icon
          return (
            <div
              key={action.href}
              className="flex items-center gap-2 justify-end"
              style={{ transitionDelay: open ? `${(ACTIONS.length - 1 - i) * 40}ms` : `${i * 30}ms` }}
            >
              {/* Label */}
              <div className="flex items-center gap-1.5 bg-white rounded-lg shadow-md border border-gray-200 px-3 py-1.5">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{action.label}</span>
                {action.shortcut && (
                  <kbd className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                    {action.shortcut}
                  </kbd>
                )}
              </div>

              {/* Icon button */}
              <button
                onClick={() => handleAction(action.href)}
                className={`w-10 h-10 rounded-full border shadow-md flex items-center justify-center transition-all duration-150 active:scale-95 ${action.bgColor}`}
                title={action.label}
              >
                <Icon size={17} className={action.color} />
              </button>
            </div>
          )
        })}
      </div>

      {/* FAB principal */}
      <button
        onClick={() => setOpen(v => !v)}
        title={open ? 'Fermer (Échap)' : 'Actions rapides (Alt+A)'}
        className={`
          w-14 h-14 rounded-full shadow-xl flex items-center justify-center
          transition-all duration-200 active:scale-95
          ${open
            ? 'bg-gray-700 hover:bg-gray-800 rotate-45'
            : 'bg-indigo-600 hover:bg-indigo-700 rotate-0'
          }
        `}
        style={{ boxShadow: open ? '0 8px 24px rgba(0,0,0,0.25)' : '0 8px 24px rgba(99,102,241,0.4)' }}
      >
        {open
          ? <X size={22} className="text-white transition-transform duration-200" />
          : <Plus size={22} className="text-white transition-transform duration-200" />
        }
      </button>

      {/* Tooltip raccourci clavier */}
      {!open && (
        <div className="text-[10px] text-gray-400 text-right leading-none mt-0.5 pr-1">
          Alt+A
        </div>
      )}
    </div>
  )
}
