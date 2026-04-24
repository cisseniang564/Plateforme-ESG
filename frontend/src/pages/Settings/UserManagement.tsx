import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Users as UsersIcon, Plus, Search, Edit2, Trash2, Shield,
  CheckCircle, XCircle, Mail, Calendar, Download, X,
  ChevronDown, UserCheck, UserX, Eye, EyeOff, RefreshCw,
  Crown, BarChart3, Zap, Lock, ArrowLeft, AlertTriangle,
  MoreHorizontal, Clock, ShieldCheck, ShieldAlert, ChevronLeft, ChevronRight,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  email_verified_at: string | null;
  last_login_at: string | null;
  mfa_enabled: boolean;
  role: { id: string; name: string; display_name: string } | null;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_system: boolean;
}

interface UserForm {
  email: string;
  first_name: string;
  last_name: string;
  role_id: string;
  password: string;
  confirm_password: string;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const PAGE_SIZE = 20;

const EMPTY_FORM: UserForm = {
  email: '', first_name: '', last_name: '',
  role_id: '', password: '', confirm_password: '',
};

const FALLBACK_ROLES: Role[] = [
  { id: '', name: 'tenant_admin', display_name: 'Administrateur', description: 'Accès complet à la plateforme',    is_system: true },
  { id: '', name: 'esg_manager',  display_name: 'Manager ESG',    description: 'Gestion des organisations',        is_system: true },
  { id: '', name: 'esg_analyst',  display_name: 'Analyste ESG',   description: 'Saisie et analyse des données ESG', is_system: true },
  { id: '', name: 'viewer',       display_name: 'Lecteur',        description: 'Consultation uniquement',            is_system: true },
];

const ADMIN_ROLE_NAMES = new Set(['tenant_admin', 'esg_admin', 'admin']);

function mergeRoles(apiRoles: Role[]): Role[] {
  if (apiRoles.length === 0) return FALLBACK_ROLES;
  const apiNames = new Set(apiRoles.map(r => r.name));
  return [...apiRoles, ...FALLBACK_ROLES.filter(f => !apiNames.has(f.name))];
}

const isValidUUID = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const ROLE_STYLE: Record<string, { bg: string; text: string; border: string; dot: string; icon: React.ElementType }> = {
  tenant_admin: { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',    dot: 'bg-red-500',    icon: Crown },
  esg_admin:    { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',    dot: 'bg-red-500',    icon: Crown },
  esg_manager:  { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   dot: 'bg-blue-500',   icon: BarChart3 },
  esg_analyst:  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',dot: 'bg-emerald-500',icon: Zap },
  admin:        { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',    dot: 'bg-red-500',    icon: Crown },
  manager:      { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   dot: 'bg-blue-500',   icon: BarChart3 },
  analyst:      { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',dot: 'bg-emerald-500',icon: Zap },
  viewer:       { bg: 'bg-gray-100',   text: 'text-gray-600',    border: 'border-gray-200',   dot: 'bg-gray-400',   icon: Eye },
};

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700', 'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700', 'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700', 'bg-teal-100 text-teal-700',
];
const getAvatarColor = (name: string) =>
  AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Jamais';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days}j`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`;
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
  return `Il y a ${Math.floor(days / 365)} an(s)`;
}

/* ─── RoleCombobox ─────────────────────────────────────────────────────────── */
function RoleCombobox({ roles, value, displayValue, onChange, error }: {
  roles: Role[]; value: string; displayValue: string;
  onChange: (id: string, label: string) => void; error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = value && isValidUUID(value) ? roles.find(r => r.id === value) : null;
  const displayLabel = selected ? selected.display_name : displayValue;

  const filtered = query
    ? roles.filter(r => r.display_name.toLowerCase().includes(query.toLowerCase()) || r.name.toLowerCase().includes(query.toLowerCase()))
    : roles;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (role: Role) => {
    onChange(isValidUUID(role.id) ? role.id : '', role.display_name);
    setQuery(''); setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center w-full border rounded-xl transition-all bg-white ${
        error ? 'border-red-300 ring-1 ring-red-300' : open ? 'border-primary-500 ring-2 ring-primary-100' : 'border-[#e2e8f0] hover:border-gray-300'
      }`}>
        <Shield className="absolute left-3.5 h-4 w-4 text-gray-400 pointer-events-none z-10" />
        <input
          type="text"
          value={open ? query : displayLabel}
          placeholder="Sélectionner un rôle..."
          onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange('', e.target.value); }}
          onFocus={() => setOpen(true)}
          aria-label="Sélectionner un rôle"
          aria-expanded={open}
          className="w-full pl-10 pr-10 py-2.5 bg-transparent outline-none text-sm rounded-xl text-gray-900 placeholder:text-gray-400"
        />
        <button type="button" onClick={() => setOpen(o => !o)} aria-label="Ouvrir la liste des rôles" className="absolute right-3 p-0.5 z-10">
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <div className="absolute z-[200] mt-1.5 w-full bg-white border border-[#e8ecf0] rounded-xl shadow-dropdown overflow-hidden" role="listbox">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 italic">Aucun rôle trouvé</div>
          ) : (
            <ul className="max-h-52 overflow-y-auto py-1">
              {filtered.map(role => {
                const style = ROLE_STYLE[role.name] || ROLE_STYLE.viewer;
                const Icon = style.icon;
                return (
                  <li
                    key={role.id || role.name}
                    role="option"
                    aria-selected={value === role.id}
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(role); }}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${value === role.id ? 'bg-primary-50/60' : ''}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg} ${style.text}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{role.display_name}</p>
                      <p className="text-xs text-gray-500 truncate">{role.description}</p>
                    </div>
                    {value === role.id && <CheckCircle className="h-4 w-4 text-primary-600 flex-shrink-0" />}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

/* ─── PasswordStrength ──────────────────────────────────────────────────────── */
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)];
  const score = checks.filter(Boolean).length;
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500'];
  const labels = ['Très faible', 'Faible', 'Moyen', 'Fort'];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[0,1,2,3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score - 1] : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className="text-xs text-gray-500">{labels[score - 1] || 'Très faible'}</p>
    </div>
  );
}

/* ─── SidePanel (with focus trap) ───────────────────────────────────────────── */
function SidePanel({ open, onClose, title, subtitle, children, footer }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string;
  children: React.ReactNode; footer: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), button:not([disabled])'
      );
      first?.focus();
    }, 80);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex" role="dialog" aria-modal="true" aria-labelledby="sidepanel-title">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div ref={panelRef} className="relative ml-auto w-full max-w-lg h-full bg-white shadow-modal flex flex-col animate-slide-in-right">
        <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-[#f0f4f8]">
          <div>
            <h2 id="sidepanel-title" className="text-[17px] font-bold text-gray-900 tracking-tight">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer le panneau" className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        <div className="px-6 py-4 border-t border-[#f0f4f8] bg-gray-50/50 flex gap-3">{footer}</div>
      </div>
    </div>,
    document.body
  );
}

/* ─── ToggleActiveModal ──────────────────────────────────────────────────────── */
function ToggleActiveModal({ user, onClose, onConfirm }: {
  user: User; onClose: () => void; onConfirm: () => void;
}) {
  const isDeactivating = user.is_active;
  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isDeactivating ? 'bg-orange-100' : 'bg-emerald-100'}`}>
            {isDeactivating
              ? <UserX className="h-5 w-5 text-orange-600" aria-hidden />
              : <UserCheck className="h-5 w-5 text-emerald-600" aria-hidden />}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-900">
              {isDeactivating ? 'Désactiver cet utilisateur ?' : 'Réactiver cet utilisateur ?'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              <strong>{user.first_name} {user.last_name}</strong> ({user.email})
            </p>
          </div>
        </div>
        <div className={`px-4 py-3 rounded-xl border mb-5 ${isDeactivating ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
          <p className={`text-xs font-medium ${isDeactivating ? 'text-orange-700' : 'text-emerald-700'}`}>
            {isDeactivating
              ? "L'utilisateur ne pourra plus se connecter. Ses données seront conservées."
              : "L'utilisateur pourra à nouveau accéder à la plateforme."}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm} icon={isDeactivating ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}>
            {isDeactivating ? 'Désactiver' : 'Réactiver'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── DeleteConfirmModal ────────────────────────────────────────────────────── */
function DeleteConfirmModal({ user, onClose, onConfirm, loading }: {
  user: User; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-900">Supprimer cet utilisateur ?</h3>
            <p className="text-sm text-gray-500 mt-1">
              <strong>{user.first_name} {user.last_name}</strong> ({user.email}) sera définitivement supprimé.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl mb-5">
          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-px" aria-hidden />
          <p className="text-xs text-red-700 font-medium">Cette action est irréversible. Toutes les données associées seront perdues.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm} loading={loading}>
            Supprimer définitivement
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── BulkDeleteModal ────────────────────────────────────────────────────────── */
function BulkDeleteModal({ count, onClose, onConfirm, loading }: {
  count: number; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-900">Supprimer {count} utilisateur{count > 1 ? 's' : ''} ?</h3>
            <p className="text-sm text-gray-500 mt-1">Cette suppression est définitive et irréversible.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm} loading={loading}>
            Supprimer {count} utilisateur{count > 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── RowMenu (mobile ··· dropdown) ─────────────────────────────────────────── */
function RowMenu({ user, onEdit, onToggle, onDelete, open, onOpenChange }: {
  user: User;
  onEdit: () => void; onToggle: () => void; onDelete: () => void;
  open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label="Actions"
        aria-expanded={open}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <MoreHorizontal className="h-4 w-4 text-gray-500" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-44 bg-white border border-[#e8ecf0] rounded-xl shadow-dropdown overflow-hidden">
          <button type="button" onClick={() => { onEdit(); onOpenChange(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Edit2 className="h-3.5 w-3.5 text-blue-500" />Modifier
          </button>
          <button type="button" onClick={() => { onToggle(); onOpenChange(false); }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-gray-50 transition-colors ${user.is_active ? 'text-orange-600' : 'text-emerald-600'}`}>
            {user.is_active ? <><UserX className="h-3.5 w-3.5" />Désactiver</> : <><UserCheck className="h-3.5 w-3.5" />Réactiver</>}
          </button>
          <div className="h-px bg-gray-100 mx-3" />
          <button type="button" onClick={() => { onDelete(); onOpenChange(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export default function UserManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [users, setUsers]     = useState<User[]>([]);
  const [roles, setRoles]     = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [search, setSearch]   = useState('');
  const [filterRole, setFilterRole]     = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen]     = useState(false);
  const [editingUser, setEditingUser]   = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [togglingUser, setTogglingUser] = useState<User | null>(null);

  const [form, setForm]             = useState<UserForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<UserForm & { role_label: string }>>({});
  const [roleLabel, setRoleLabel]   = useState('');
  const [showPwd, setShowPwd]       = useState(false);

  // Bulk selection
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Mobile row menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Current user (for self-demotion guard)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    api.get('/auth/me').then(r => setCurrentUserId(r.data.id)).catch(() => {});
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.allSettled([
        api.get('/users/'),
        api.get('/users/roles'),
      ]);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.items || []);
      const fetchedRoles: Role[] = rolesRes.status === 'fulfilled' ? rolesRes.value.data.roles || [] : [];
      setRoles(mergeRoles(fetchedRoles));
    } finally {
      setLoading(false);
    }
  };

  /* ── Filters & pagination ── */
  const allFiltered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.email.toLowerCase().includes(q) || u.first_name.toLowerCase().includes(q) || u.last_name.toLowerCase().includes(q);
    const matchRole = !filterRole || (isValidUUID(filterRole) ? u.role?.id === filterRole : u.role?.name === filterRole);
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' && u.is_active) || (filterStatus === 'inactive' && !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(allFiltered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const displayed = allFiltered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset page & selection when filters change
  useEffect(() => { setCurrentPage(1); setSelected(new Set()); }, [search, filterRole, filterStatus]);

  /* ── Bulk selection helpers ── */
  const allPageSelected = displayed.length > 0 && displayed.every(u => selected.has(u.id));
  const somePageSelected = displayed.some(u => selected.has(u.id)) && !allPageSelected;

  const toggleSelectAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allPageSelected) displayed.forEach(u => next.delete(u.id));
      else displayed.forEach(u => next.add(u.id));
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── Validation ── */
  const validate = (isEdit = false): boolean => {
    const errors: Partial<UserForm & { role_label: string }> = {};
    if (!form.first_name.trim()) errors.first_name = 'Prénom requis';
    if (!form.last_name.trim())  errors.last_name  = 'Nom requis';
    if (!form.email)             errors.email = 'Email requis';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Email invalide';
    if (!isEdit && !form.role_id && !roleLabel.trim()) errors.role_label = 'Rôle requis';
    if (!isEdit) {
      if (!form.password)                              errors.password = 'Mot de passe requis';
      else if (form.password.length < 8)               errors.password = 'Min. 8 caractères';
      else if (!/[A-Z]/.test(form.password))           errors.password = 'Doit contenir une majuscule';
      else if (!/[0-9]/.test(form.password))           errors.password = 'Doit contenir un chiffre';
      else if (!/[^A-Za-z0-9]/.test(form.password))   errors.password = 'Doit contenir un caractère spécial';
      if (form.password && form.confirm_password !== form.password)
        errors.confirm_password = 'Les mots de passe ne correspondent pas';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ── Handlers ── */
  const openCreate = () => {
    setForm(EMPTY_FORM); setFormErrors({}); setRoleLabel(''); setShowPwd(false);
    setEditingUser(null); setCreateOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({ ...EMPTY_FORM, email: user.email, first_name: user.first_name, last_name: user.last_name, role_id: user.role?.id || '' });
    setRoleLabel(user.role?.display_name || '');
    setFormErrors({});
    setEditOpen(true);
  };

  const resolveRoleId = () => {
    if (isValidUUID(form.role_id)) return form.role_id;
    if (roleLabel) {
      const match = roles.find(r =>
        r.display_name.toLowerCase() === roleLabel.toLowerCase() ||
        r.name.toLowerCase() === roleLabel.toLowerCase()
      );
      if (match?.id && isValidUUID(match.id)) return match.id;
    }
    return '';
  };

  const parseApiError = (err: any): string => {
    const raw = err.response?.data?.detail || err.response?.data?.message;
    if (!raw) return err.message || 'Une erreur est survenue';
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return raw.map((e: any) => {
      const field = Array.isArray(e.loc) ? e.loc.filter((l: any) => l !== 'body').join('.') : '';
      return field ? `${field} : ${e.msg}` : e.msg;
    }).join('\n');
    return JSON.stringify(raw);
  };

  const handleCreate = async () => {
    if (!validate(false)) return;
    setSaving(true);
    try {
      const roleId = resolveRoleId();
      await api.post('/users/', {
        email: form.email, first_name: form.first_name, last_name: form.last_name,
        password: form.password, ...(roleId ? { role_id: roleId } : {}),
      });
      toast.success(`${form.first_name} ${form.last_name} ajouté avec succès`);
      setCreateOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(parseApiError(err), { duration: 6000 });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!validate(true) || !editingUser) return;

    // Guard: prevent self-demotion
    if (currentUserId && editingUser.id === currentUserId) {
      const oldRoleName = editingUser.role?.name || '';
      const newRole = roles.find(r => r.id === form.role_id);
      const newRoleName = newRole?.name || '';
      if (ADMIN_ROLE_NAMES.has(oldRoleName) && !ADMIN_ROLE_NAMES.has(newRoleName)) {
        const confirmed = window.confirm(
          "Vous allez vous retirer vos droits d'administrateur. Vous perdrez l'accès à certaines fonctionnalités. Continuer ?"
        );
        if (!confirmed) return;
      }
    }

    setSaving(true);
    try {
      const roleId = resolveRoleId();
      await api.patch(`/users/${editingUser.id}`, {
        first_name: form.first_name, last_name: form.last_name,
        ...(roleId ? { role_id: roleId } : {}),
      });
      toast.success('Utilisateur mis à jour');
      setEditOpen(false); setEditingUser(null);
      await loadData();
    } catch (err: any) {
      toast.error(parseApiError(err), { duration: 6000 });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!togglingUser) return;
    const user = togglingUser;
    const newState = !user.is_active;
    setTogglingUser(null);
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: newState } : u));
    try {
      await api.patch(`/users/${user.id}`, { is_active: newState });
      toast.success(newState ? 'Utilisateur réactivé' : 'Utilisateur désactivé');
    } catch (err: any) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !newState } : u));
      toast.error(err.response?.data?.detail || 'Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setSaving(true);
    try {
      await api.delete(`/users/${deletingUser.id}`);
      toast.success('Utilisateur supprimé');
      setDeletingUser(null);
      setSelected(prev => { const n = new Set(prev); n.delete(deletingUser.id); return n; });
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDeactivate = async () => {
    const ids = Array.from(selected).filter(id => users.find(u => u.id === id)?.is_active);
    if (!ids.length) { toast('Tous les utilisateurs sélectionnés sont déjà inactifs'); return; }
    setUsers(prev => prev.map(u => ids.includes(u.id) ? { ...u, is_active: false } : u));
    await Promise.allSettled(ids.map(id => api.patch(`/users/${id}`, { is_active: false })));
    setSelected(new Set());
    toast.success(`${ids.length} utilisateur${ids.length > 1 ? 's' : ''} désactivé${ids.length > 1 ? 's' : ''}`);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    setSaving(true);
    const results = await Promise.allSettled(ids.map(id => api.delete(`/users/${id}`)));
    const ok = results.filter(r => r.status === 'fulfilled').length;
    setBulkDeleting(false);
    setSelected(new Set());
    await loadData();
    if (ok === ids.length) toast.success(`${ok} utilisateur${ok > 1 ? 's' : ''} supprimé${ok > 1 ? 's' : ''}`);
    else toast.error(`${ok}/${ids.length} supprimé${ok > 1 ? 's' : ''} — certains ont échoué`);
    setSaving(false);
  };

  const exportCSV = () => {
    const rows = [
      ['Prénom', 'Nom', 'Email', 'Rôle', 'Statut', 'Dernière connexion', 'Vérifié', 'Membre depuis'],
      ...users.map(u => [
        u.first_name, u.last_name, u.email,
        u.role?.display_name || '',
        u.is_active ? 'Actif' : 'Inactif',
        u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('fr-FR') : 'Jamais',
        u.email_verified_at ? 'Oui' : 'Non',
        new Date(u.created_at).toLocaleDateString('fr-FR'),
      ]),
    ];
    const csv  = '\uFEFF' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'utilisateurs.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Stats ── */
  const stats = {
    total:    users.length,
    active:   users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    byRole:   roles.map(r => ({ ...r, count: users.filter(u => u.role?.id === r.id).length })),
  };

  /* ── Form content ── */
  const formContent = (isEdit: boolean) => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(['first_name', 'last_name'] as const).map((field, i) => (
          <div key={field}>
            <label htmlFor={`form-${field}`} className="block text-sm font-semibold text-gray-700 mb-1.5">
              {i === 0 ? 'Prénom' : 'Nom'} <span className="text-red-500" aria-hidden>*</span>
            </label>
            <input
              id={`form-${field}`}
              type="text"
              autoFocus={i === 0 && !isEdit}
              value={form[field]}
              onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
              placeholder={i === 0 ? 'Jean' : 'Dupont'}
              className={`w-full px-3.5 py-2.5 border rounded-xl outline-none transition-all text-sm
                focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                ${formErrors[field] ? 'border-red-300 bg-red-50/30' : 'border-[#e2e8f0] hover:border-gray-300'}`}
            />
            {formErrors[field] && <p className="text-xs text-red-600 mt-1" role="alert">{formErrors[field]}</p>}
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="form-email" className="block text-sm font-semibold text-gray-700 mb-1.5">
          Email <span className="text-red-500" aria-hidden>*</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden />
          <input
            id="form-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
            disabled={isEdit}
            placeholder="jean.dupont@entreprise.com"
            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none transition-all text-sm
              focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
              ${formErrors.email ? 'border-red-300 bg-red-50/30' : 'border-[#e2e8f0] hover:border-gray-300'}
              ${isEdit ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
          />
        </div>
        {formErrors.email && <p className="text-xs text-red-600 mt-1" role="alert">{formErrors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Rôle <span className="text-red-500" aria-hidden>*</span>
        </label>
        <RoleCombobox
          roles={roles}
          value={form.role_id}
          displayValue={roleLabel}
          onChange={(id, label) => { setForm(f => ({ ...f, role_id: id })); setRoleLabel(label); }}
          error={formErrors.role_label}
        />
        {form.role_id && (() => {
          const r = roles.find(r => r.id === form.role_id);
          const s = ROLE_STYLE[r?.name || ''] || ROLE_STYLE.viewer;
          return r ? (
            <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${s.bg} ${s.text} ${s.border}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden />
              {r.description}
            </div>
          ) : null;
        })()}
      </div>

      {!isEdit && (
        <>
          <div>
            <label htmlFor="form-password" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Mot de passe <span className="text-red-500" aria-hidden>*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden />
              <input
                id="form-password"
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 caractères"
                className={`w-full pl-10 pr-11 py-2.5 border rounded-xl outline-none transition-all text-sm
                  focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                  ${formErrors.password ? 'border-red-300 bg-red-50/30' : 'border-[#e2e8f0] hover:border-gray-300'}`}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)} aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {formErrors.password
              ? <p className="text-xs text-red-600 mt-1" role="alert">{formErrors.password}</p>
              : <PasswordStrength password={form.password} />}
          </div>

          <div>
            <label htmlFor="form-confirm-password" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Confirmer le mot de passe <span className="text-red-500" aria-hidden>*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden />
              <input
                id="form-confirm-password"
                type={showPwd ? 'text' : 'password'}
                value={form.confirm_password}
                onChange={(e) => setForm(f => ({ ...f, confirm_password: e.target.value }))}
                placeholder="Répéter le mot de passe"
                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none transition-all text-sm
                  focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                  ${formErrors.confirm_password ? 'border-red-300 bg-red-50/30' : 'border-[#e2e8f0] hover:border-gray-300'}`}
              />
            </div>
            {formErrors.confirm_password && <p className="text-xs text-red-600 mt-1" role="alert">{formErrors.confirm_password}</p>}
          </div>
        </>
      )}
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  );

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate('/app/settings')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Paramètres
          </button>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
              <UsersIcon className="h-5 w-5 text-primary-600" aria-hidden />
            </div>
            Gestion des utilisateurs
          </h1>
          <p className="text-sm text-gray-500 mt-1 ml-11">Gérez les membres, rôles et permissions de votre organisation</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={exportCSV} icon={<Download className="h-4 w-4" aria-hidden />}>
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={loadData} icon={<RefreshCw className="h-4 w-4" aria-hidden />}>
            Actualiser
          </Button>
          <Button size="sm" onClick={openCreate} icon={<Plus className="h-4 w-4" aria-hidden />}>
            Nouvel utilisateur
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Utilisateurs',  value: stats.total,    icon: UsersIcon, color: 'text-primary-600', bg: 'bg-primary-50',  ring: 'ring-primary-100' },
          { label: 'Actifs',        value: stats.active,   icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
          { label: 'Inactifs',      value: stats.inactive, icon: UserX,     color: 'text-gray-500',    bg: 'bg-gray-100',   ring: 'ring-gray-200' },
          { label: 'Rôles',         value: roles.length,   icon: Shield,    color: 'text-violet-600',  bg: 'bg-violet-50',  ring: 'ring-violet-100' },
        ].map(({ label, value, icon: Icon, color, bg, ring }) => (
          <div key={label} className="bg-white border border-[#e8ecf0] rounded-2xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${bg} ring-1 ${ring} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${color}`} aria-hidden />
              </div>
              <span className={`text-3xl font-black tabular-nums ${color}`}>{value}</span>
            </div>
            <p className="text-sm font-semibold text-gray-600">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Répartition des rôles ── */}
      {stats.byRole.some(r => r.count > 0) && (
        <div className="bg-white border border-[#e8ecf0] rounded-2xl p-5 shadow-card">
          <p className="text-sm font-semibold text-gray-700 mb-3">Répartition des rôles</p>
          <div className="flex flex-wrap gap-2.5">
            {stats.byRole.map(role => {
              const s = ROLE_STYLE[role.name] || ROLE_STYLE.viewer;
              const Icon = s.icon;
              const pct = stats.total > 0 ? Math.round((role.count / stats.total) * 100) : 0;
              return (
                <button
                  key={role.id || role.name}
                  type="button"
                  onClick={() => setFilterRole(isValidUUID(role.id) ? role.id : role.name)}
                  aria-pressed={filterRole === (isValidUUID(role.id) ? role.id : role.name)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-semibold transition-all hover:shadow-sm active:scale-[0.98] ${s.bg} ${s.text} ${s.border} ${
                    filterRole === (isValidUUID(role.id) ? role.id : role.name) ? 'ring-2 ring-offset-1 ring-current/30' : ''
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {role.display_name}
                  <span className="font-black">{role.count}</span>
                  <span className="text-xs opacity-60">({pct}%)</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filtres ── */}
      <div className="bg-white border border-[#e8ecf0] rounded-2xl p-4 shadow-card">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher des utilisateurs..."
              aria-label="Rechercher des utilisateurs"
              className="w-full pl-10 pr-9 py-2.5 border border-[#e2e8f0] rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm transition-all hover:border-gray-300"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Effacer la recherche"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            aria-label="Filtrer par rôle"
            className="px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm bg-white hover:border-gray-300 transition-all cursor-pointer"
          >
            <option value="">Tous les rôles</option>
            {roles.map(r => (
              <option key={r.id || r.name} value={isValidUUID(r.id) ? r.id : r.name}>{r.display_name}</option>
            ))}
          </select>

          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl" role="group" aria-label="Filtrer par statut">
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button key={s} type="button" onClick={() => setFilterStatus(s)}
                aria-pressed={filterStatus === s}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  filterStatus === s ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {s === 'all' ? 'Tous' : s === 'active' ? 'Actif' : 'Inactif'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-[#e8ecf0] rounded-2xl overflow-hidden shadow-card">
        {allFiltered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <UsersIcon className="h-7 w-7 text-gray-300" aria-hidden />
            </div>
            <p className="text-base font-semibold text-gray-700 mb-1">Aucun utilisateur trouvé</p>
            <p className="text-sm text-gray-400 mb-5 max-w-xs">
              {search || filterRole || filterStatus !== 'all'
                ? 'Essayez de modifier vos filtres de recherche.'
                : 'Invitez votre premier collaborateur pour commencer.'}
            </p>
            {!search && !filterRole && filterStatus === 'all' && (
              <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
                Ajouter un utilisateur
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full" aria-label="Liste des utilisateurs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-[#f0f4f8]">
                    <th scope="col" className="px-5 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        ref={el => { if (el) el.indeterminate = somePageSelected; }}
                        onChange={toggleSelectAll}
                        aria-label="Sélectionner tous les utilisateurs de la page"
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      />
                    </th>
                    <th scope="col" className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Utilisateur</th>
                    <th scope="col" className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Rôle</th>
                    <th scope="col" className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Statut</th>
                    <th scope="col" className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Dernière connexion</th>
                    <th scope="col" className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Membre depuis</th>
                    <th scope="col" className="text-right px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f8fafc]">
                  {displayed.map(user => {
                    const initials    = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
                    const avatarColor = getAvatarColor(user.first_name);
                    const roleStyle   = user.role ? (ROLE_STYLE[user.role.name] || ROLE_STYLE.viewer) : null;
                    const RoleIcon    = roleStyle?.icon;
                    const isSelected  = selected.has(user.id);
                    const isVerified  = !!user.email_verified_at;

                    return (
                      <tr key={user.id} className={`hover:bg-gray-50/60 transition-colors group ${isSelected ? 'bg-primary-50/30' : ''}`}>

                        {/* Checkbox */}
                        <td className="px-5 py-4 w-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(user.id)}
                            aria-label={`Sélectionner ${user.first_name} ${user.last_name}`}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                          />
                        </td>

                        {/* Utilisateur */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${avatarColor}`} aria-hidden>
                              {initials || '?'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold text-gray-900 leading-tight truncate max-w-[140px]">
                                  {user.first_name} {user.last_name}
                                </p>
                                {isVerified
                                  ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" aria-label="Email vérifié" />
                                  : <ShieldAlert className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" aria-label="Email non vérifié" />
                                }
                                {user.mfa_enabled && (
                                  <span className="text-[9px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1 py-0.5 rounded" title="2FA activé">2FA</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <Mail className="h-3 w-3 flex-shrink-0" aria-hidden />
                                <span className="truncate max-w-[160px]">{user.email}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Rôle */}
                        <td className="px-5 py-4">
                          {user.role && roleStyle && RoleIcon ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                              <RoleIcon className="h-3 w-3" aria-hidden />
                              {user.role.display_name}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Aucun rôle</span>
                          )}
                        </td>

                        {/* Statut */}
                        <td className="px-5 py-4">
                          {user.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" aria-hidden />
                              Actif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-lg">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" aria-hidden />
                              Inactif
                            </span>
                          )}
                        </td>

                        {/* Dernière connexion */}
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                            {formatRelativeTime(user.last_login_at)}
                          </span>
                        </td>

                        {/* Membre depuis */}
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                            {user.created_at
                              ? new Date(user.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                          </span>
                        </td>

                        {/* Actions — desktop */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Desktop buttons */}
                            <div className="hidden sm:flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEdit(user)}
                                aria-label={`Modifier ${user.first_name} ${user.last_name}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all active:scale-[0.97] cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5" aria-hidden />
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => setTogglingUser(user)}
                                aria-label={user.is_active ? `Désactiver ${user.first_name} ${user.last_name}` : `Réactiver ${user.first_name} ${user.last_name}`}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all active:scale-[0.97] cursor-pointer ${
                                  user.is_active
                                    ? 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300'
                                    : 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                                }`}
                              >
                                {user.is_active
                                  ? <><UserX className="h-3.5 w-3.5" aria-hidden />Désactiver</>
                                  : <><UserCheck className="h-3.5 w-3.5" aria-hidden />Réactiver</>
                                }
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingUser(user)}
                                aria-label={`Supprimer ${user.first_name} ${user.last_name}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all active:scale-[0.97] cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                Supprimer
                              </button>
                            </div>

                            {/* Mobile ··· menu */}
                            <div className="sm:hidden">
                              <RowMenu
                                user={user}
                                onEdit={() => openEdit(user)}
                                onToggle={() => setTogglingUser(user)}
                                onDelete={() => setDeletingUser(user)}
                                open={openMenuId === user.id}
                                onOpenChange={(v) => setOpenMenuId(v ? user.id : null)}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Footer: count + pagination ── */}
            <div className="px-5 py-3 border-t border-[#f0f4f8] bg-gray-50/50 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs text-gray-500">
                {allFiltered.length} utilisateur{allFiltered.length > 1 ? 's' : ''}
                {users.length !== allFiltered.length && <span className="text-gray-400"> · {users.length} au total</span>}
                {selected.size > 0 && <span className="ml-2 font-semibold text-primary-600">· {selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>}
              </p>

              {totalPages > 1 && (
                <nav className="flex items-center gap-1" aria-label="Pagination">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    aria-label="Page précédente"
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-600" />
                  </button>
                  <span className="text-xs font-semibold text-gray-600 px-2">
                    Page {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    aria-label="Page suivante"
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  </button>
                </nav>
              )}

              {(search || filterRole || filterStatus !== 'all') && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setFilterRole(''); setFilterStatus('all'); }}
                  className="text-xs text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Floating bulk action bar ── */}
      {selected.size > 0 && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-2xl shadow-xl animate-slide-in">
          <span className="text-sm font-semibold pr-2 border-r border-white/20">
            {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
          </span>
          <button type="button" onClick={handleBulkDeactivate}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-300 hover:text-orange-200 transition-colors">
            <UserX className="h-4 w-4" aria-hidden />
            Désactiver
          </button>
          <button type="button" onClick={() => setBulkDeleting(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-red-300 hover:text-red-200 transition-colors">
            <Trash2 className="h-4 w-4" aria-hidden />
            Supprimer
          </button>
          <button type="button" onClick={() => setSelected(new Set())} aria-label="Annuler la sélection"
            className="ml-2 p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>,
        document.body
      )}

      {/* ── Panel Créer ── */}
      <SidePanel
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouvel utilisateur"
        subtitle="Invitez un nouveau membre dans votre organisation"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setCreateOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button className="flex-1" onClick={handleCreate} loading={saving} icon={<Plus className="h-4 w-4" />}>
              Créer l'utilisateur
            </Button>
          </>
        }
      >
        {formContent(false)}
      </SidePanel>

      {/* ── Panel Modifier ── */}
      <SidePanel
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditingUser(null); }}
        title={editingUser ? `Modifier — ${editingUser.first_name} ${editingUser.last_name}` : 'Modifier'}
        subtitle="Mettez à jour les informations de ce membre"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => { setEditOpen(false); setEditingUser(null); }} disabled={saving}>
              Annuler
            </Button>
            <Button className="flex-1" onClick={handleEdit} loading={saving} icon={<CheckCircle className="h-4 w-4" />}>
              Enregistrer
            </Button>
          </>
        }
      >
        {formContent(true)}
      </SidePanel>

      {/* ── Modal Désactiver/Réactiver ── */}
      {togglingUser && (
        <ToggleActiveModal
          user={togglingUser}
          onClose={() => setTogglingUser(null)}
          onConfirm={handleToggleActive}
        />
      )}

      {/* ── Modal Suppression unitaire ── */}
      {deletingUser && (
        <DeleteConfirmModal
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleDelete}
          loading={saving}
        />
      )}

      {/* ── Modal Suppression groupée ── */}
      {bulkDeleting && (
        <BulkDeleteModal
          count={selected.size}
          onClose={() => setBulkDeleting(false)}
          onConfirm={handleBulkDelete}
          loading={saving}
        />
      )}
    </div>
  );
}
