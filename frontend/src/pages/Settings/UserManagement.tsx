import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Users as UsersIcon, Plus, Search, Edit2, Trash2, Shield,
  CheckCircle, XCircle, Mail, Calendar, Download, X,
  ChevronDown, UserCheck, UserX, Eye, EyeOff, RefreshCw,
  Crown, BarChart3, Zap, Lock, ArrowLeft
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
const EMPTY_FORM: UserForm = {
  email: '', first_name: '', last_name: '',
  role_id: '', password: '', confirm_password: '',
};

// Rôles de fallback — affichés quand l'API ne les retourne pas (id vide = jamais envoyé à l'API)
const FALLBACK_ROLES: Role[] = [
  { id: '', name: 'tenant_admin', display_name: 'Administrateur', description: 'Accès complet à toute la plateforme',   is_system: true },
  { id: '', name: 'esg_manager',  display_name: 'Manager ESG',    description: 'Gestion des organisations et rapports', is_system: true },
  { id: '', name: 'esg_analyst',  display_name: 'Analyste ESG',   description: 'Saisie et analyse des données ESG',     is_system: true },
  { id: '', name: 'viewer',       display_name: 'Lecteur',        description: 'Consultation uniquement',               is_system: true },
];

/** Fusionne les rôles API avec les fallbacks :
 *  - On garde tous les rôles API (avec vrais UUIDs)
 *  - On ajoute les fallbacks dont le nom n'est pas déjà couvert par l'API */
function mergeRoles(apiRoles: Role[]): Role[] {
  if (apiRoles.length === 0) return FALLBACK_ROLES;
  const apiNames = new Set(apiRoles.map(r => r.name));
  const extras = FALLBACK_ROLES.filter(f => !apiNames.has(f.name));
  return [...apiRoles, ...extras];
}

/** Vérifie qu'une chaîne est un UUID v4 valide avant de l'envoyer à l'API */
const isValidUUID = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const ROLE_STYLE: Record<string, { badge: string; dot: string; icon: React.ElementType }> = {
  // noms DB réels
  tenant_admin: { badge: 'bg-red-100 text-red-800 border-red-200',      dot: 'bg-red-500',    icon: Crown },
  esg_admin:    { badge: 'bg-red-100 text-red-800 border-red-200',      dot: 'bg-red-500',    icon: Crown },
  esg_manager:  { badge: 'bg-blue-100 text-blue-800 border-blue-200',   dot: 'bg-blue-500',   icon: BarChart3 },
  esg_analyst:  { badge: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500', icon: Zap },
  // noms courts (fallback + compatibilité)
  admin:        { badge: 'bg-red-100 text-red-800 border-red-200',      dot: 'bg-red-500',    icon: Crown },
  manager:      { badge: 'bg-blue-100 text-blue-800 border-blue-200',   dot: 'bg-blue-500',   icon: BarChart3 },
  analyst:      { badge: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500', icon: Zap },
  viewer:       { badge: 'bg-gray-100 text-gray-700 border-gray-200',   dot: 'bg-gray-400',   icon: Eye },
};

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-violet-100 text-violet-700', 'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',   'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',     'bg-teal-100 text-teal-700',
  ];
  const idx = (name.charCodeAt(0) || 0) % colors.length;
  return colors[idx];
};

/* ─── RoleCombobox ────────────────────────────────────────────────────────
   Dropdown searchable : sélectionner OU saisir un rôle personnalisé         */
function RoleCombobox({
  roles, value, displayValue, onChange, error,
}: { roles: Role[]; value: string; displayValue: string; onChange: (id: string, label: string) => void; error?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Priorité : chercher par UUID valide, sinon utiliser le libellé contrôlé
  const selected = value && isValidUUID(value) ? roles.find(r => r.id === value) : null;
  const displayLabel = selected ? selected.display_name : displayValue;

  const filtered = query
    ? roles.filter(r => r.display_name.toLowerCase().includes(query.toLowerCase()) || r.name.toLowerCase().includes(query.toLowerCase()))
    : roles;

  // Fermer en cliquant dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (role: Role) => {
    // N'envoyer l'id que s'il est un vrai UUID (les fallback ont id:'')
    onChange(isValidUUID(role.id) ? role.id : '', role.display_name);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div
        className={`flex items-center w-full border-2 rounded-xl transition-all ${
          error ? 'border-red-300' : open ? 'border-primary-500 ring-2 ring-primary-100' : 'border-gray-200'
        } bg-white`}
      >
        <Shield className="absolute left-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={open ? query : displayLabel}
          placeholder="Sélectionner ou saisir un rôle..."
          onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange('', e.target.value); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-10 pr-10 py-3 bg-transparent outline-none text-sm rounded-xl"
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="absolute right-3 p-0.5"
        >
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 italic">Aucun rôle trouvé</div>
          ) : (
            <ul className="max-h-52 overflow-y-auto py-1">
              {filtered.map(role => {
                const style = ROLE_STYLE[role.name] || ROLE_STYLE.viewer;
                const Icon = style.icon;
                return (
                  <li
                    key={role.id}
                    onMouseDown={() => handleSelect(role)}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${
                      value === role.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${style.badge}`}>
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

/* ─── PasswordStrength ──────────────────────────────────────────────────── */
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const label = ['Très faible', 'Faible', 'Moyen', 'Fort'][score - 1] || 'Très faible';
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < score ? colors[score - 1] : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className="text-xs text-gray-500">{label} — {checks[0] ? '' : 'min. 8 car. · '}{checks[1] ? '' : 'maj. · '}{checks[2] ? '' : 'chiffre · '}{checks[3] ? '' : 'symbole'}</p>
    </div>
  );
}

/* ─── Modal ──────────────────────────────────────────────────────────────── */
function SideModal({
  open, onClose, title, subtitle, children, footer
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: string;
  children: React.ReactNode; footer: React.ReactNode;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="relative ml-auto w-full max-w-lg h-full bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">{footer}</div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function UserManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [users, setUsers]   = useState<User[]>([]);
  const [roles, setRoles]   = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [search, setSearch]   = useState('');
  const [filterRole, setFilterRole]     = useState('');   // UUID ou nom du rôle
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Panels
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen]     = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [editingUser, setEditingUser]   = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Form
  const [form, setForm]           = useState<UserForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<UserForm & { role_label: string }>>({});
  const [roleLabel, setRoleLabel]   = useState('');
  const [showPwd, setShowPwd]       = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersResult, rolesResult] = await Promise.allSettled([
        api.get('/users/'),
        api.get('/users/roles'),
      ]);

      if (usersResult.status === 'fulfilled') {
        setUsers(usersResult.value.data.items || []);
      }

      const fetchedRoles: Role[] =
        rolesResult.status === 'fulfilled'
          ? rolesResult.value.data.roles || []
          : [];
      setRoles(mergeRoles(fetchedRoles));
    } finally {
      setLoading(false);
    }
  };

  /* ── Filtrage local ────────────────────────────────────────────────────── */
  const displayed = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.email.toLowerCase().includes(q)
      || u.first_name.toLowerCase().includes(q)
      || u.last_name.toLowerCase().includes(q);
    const matchRole = !filterRole || (
      isValidUUID(filterRole)
        ? u.role?.id === filterRole
        : u.role?.name === filterRole
    );
    const matchStatus = filterStatus === 'all'
      || (filterStatus === 'active' && u.is_active)
      || (filterStatus === 'inactive' && !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  /* ── Validation ────────────────────────────────────────────────────────── */
  const validate = (isEdit = false): boolean => {
    const errors: Partial<UserForm & { role_label: string }> = {};
    if (!form.first_name.trim()) errors.first_name = 'Prénom requis';
    if (!form.last_name.trim())  errors.last_name  = 'Nom requis';
    if (!form.email)             errors.email = 'Email requis';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Email invalide';
    if (!isEdit && !form.role_id && !roleLabel.trim()) errors.role_label = 'Rôle requis';
    if (!isEdit) {
      if (!form.password) errors.password = 'Mot de passe requis';
      else if (form.password.length < 8) errors.password = 'Min. 8 caractères';
      else if (!/[A-Z]/.test(form.password)) errors.password = 'Doit contenir au moins une majuscule';
      else if (!/[0-9]/.test(form.password)) errors.password = 'Doit contenir au moins un chiffre';
      else if (!/[^A-Za-z0-9]/.test(form.password)) errors.password = 'Doit contenir au moins un caractère spécial';
      if (form.password && form.confirm_password !== form.password)
        errors.confirm_password = 'Les mots de passe ne correspondent pas';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ── Handlers ──────────────────────────────────────────────────────────── */
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
  const openDelete = (user: User) => { setDeletingUser(user); setDeleteModal(true); };

  const handleCreate = async () => {
    if (!validate(false)) return;
    setSaving(true);
    try {
      // Résoudre le role_id : priorité au sélectionné, sinon chercher par libellé
      let resolvedRoleId = isValidUUID(form.role_id) ? form.role_id : '';
      if (!resolvedRoleId && roleLabel) {
        const match = roles.find(r =>
          r.display_name.toLowerCase() === roleLabel.toLowerCase() ||
          r.name.toLowerCase() === roleLabel.toLowerCase()
        );
        resolvedRoleId = match?.id && isValidUUID(match.id) ? match.id : '';
      }

      await api.post('/users/', {
        email:      form.email,
        first_name: form.first_name,
        last_name:  form.last_name,
        password:   form.password,
        ...(resolvedRoleId ? { role_id: resolvedRoleId } : {}),
      });

      toast.success(t('users.userCreated', { name: `${form.first_name} ${form.last_name}` }));
      setCreateOpen(false);
      await loadData();
    } catch (err: any) {
      const raw = err.response?.data?.detail || err.response?.data?.message;
      let msg: string;
      if (!raw) {
        msg = err.message || t('users.createError');
      } else if (typeof raw === 'string') {
        msg = raw;
      } else if (Array.isArray(raw)) {
        // Erreurs de validation Pydantic : array de { loc, msg, type }
        msg = raw.map((e: any) => {
          const field = Array.isArray(e.loc) ? e.loc.filter((l: any) => l !== 'body').join('.') : '';
          return field ? `${field} : ${e.msg}` : e.msg;
        }).join('\n');
      } else {
        msg = JSON.stringify(raw);
      }
      toast.error(msg, { duration: 6000 });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!validate(true) || !editingUser) return;
    setSaving(true);
    try {
      let resolvedRoleId = isValidUUID(form.role_id) ? form.role_id : '';
      if (!resolvedRoleId && roleLabel) {
        const match = roles.find(r =>
          r.display_name.toLowerCase() === roleLabel.toLowerCase() ||
          r.name.toLowerCase() === roleLabel.toLowerCase()
        );
        resolvedRoleId = match?.id && isValidUUID(match.id) ? match.id : '';
      }

      await api.patch(`/users/${editingUser.id}`, {
        first_name: form.first_name,
        last_name:  form.last_name,
        ...(resolvedRoleId ? { role_id: resolvedRoleId } : {}),
      });

      toast.success(t('users.userUpdated'));
      setEditOpen(false);
      setEditingUser(null);
      await loadData();
    } catch (err: any) {
      const raw = err.response?.data?.detail || err.response?.data?.message;
      let msg: string;
      if (!raw) msg = err.message || t('users.updateError');
      else if (typeof raw === 'string') msg = raw;
      else if (Array.isArray(raw)) msg = raw.map((e: any) => e.msg).join('\n');
      else msg = JSON.stringify(raw);
      toast.error(msg, { duration: 6000 });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await api.patch(`/users/${user.id}`, { is_active: !user.is_active });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
      toast.success(user.is_active ? t('users.userDeactivated') : t('users.userReactivated'));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setSaving(true);
    try {
      await api.delete(`/users/${deletingUser.id}`);
      toast.success(t('users.userDeleted'));
      setDeleteModal(false);
      setDeletingUser(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('users.deleteError'));
    } finally {
      setSaving(false);
    }
  };

  // Suppression directe — confirmation via toast (évite window.confirm bloqué par Safari)
  const handleDeleteDirect = (user: User) => {
    toast((t_toast) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontWeight: 600 }}>Supprimer {user.first_name} {user.last_name} ?</span>
        <span style={{ fontSize: 12, color: '#6b7280' }}>{user.email}</span>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            onClick={async () => {
              toast.dismiss(t_toast.id);
              try {
                await api.delete(`/users/${user.id}`);
                toast.success('Utilisateur supprimé');
                await loadData();
              } catch (err: any) {
                toast.error(err.response?.data?.detail || 'Erreur lors de la suppression');
              }
            }}
            style={{ padding: '4px 12px', background: '#dc2626', color: '#fff', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
          >
            Confirmer
          </button>
          <button
            onClick={() => toast.dismiss(t_toast.id)}
            style={{ padding: '4px 12px', background: '#f3f4f6', color: '#374151', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12 }}
          >
            Annuler
          </button>
        </div>
      </div>
    ), { duration: 8000 });
  };

  const handleToggleActiveDirect = async (user: User) => {
    const userId = user.id;
    const newState = !user.is_active;
    try {
      await api.patch(`/users/${userId}`, { is_active: newState });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: newState } : u));
      toast.success(newState ? 'Utilisateur réactivé' : 'Utilisateur désactivé');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
  };

  const exportCSV = () => {
    const rows = [
      [t('users.firstName'), t('users.lastName'), t('users.email'), t('users.role'), t('users.status'), t('users.createdAt')],
      ...users.map(u => [
        u.first_name, u.last_name, u.email,
        u.role?.display_name || '',
        u.is_active ? t('users.active') : t('users.inactive'),
        new Date(u.created_at).toLocaleDateString('fr-FR'),
      ]),
    ];
    const csv = '\uFEFF' + rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'utilisateurs.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Stats ─────────────────────────────────────────────────────────────── */
  const stats = {
    total:    users.length,
    active:   users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    byRole:   roles.map(r => ({ ...r, count: users.filter(u => u.role?.id === r.id).length })),
  };

  /* ── Shared form JSX (stable reference via variables, not sub-component) ─ */
  const formContent = (isEdit: boolean) => (
    <div className="space-y-5">
      {/* Nom / Prénom */}
      <div className="grid grid-cols-2 gap-4">
        {(['first_name', 'last_name'] as const).map((field, i) => (
          <div key={field}>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {i === 0 ? t('users.firstName') : t('users.lastName')} *
            </label>
            <input
              type="text"
              value={form[field]}
              onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
              placeholder={i === 0 ? 'Jean' : 'Dupont'}
              className={`w-full px-4 py-3 border-2 rounded-xl outline-none transition-all focus:ring-2 focus:ring-primary-100 ${
                formErrors[field] ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-primary-400'
              }`}
            />
            {formErrors[field] && <p className="text-xs text-red-600 mt-1">{formErrors[field]}</p>}
          </div>
        ))}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('users.email')} *</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
            disabled={isEdit}
            placeholder="jean.dupont@entreprise.com"
            className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl outline-none transition-all focus:ring-2 focus:ring-primary-100 ${
              formErrors.email ? 'border-red-300' : 'border-gray-200 focus:border-primary-400'
            } ${isEdit ? 'bg-gray-50 text-gray-500' : ''}`}
          />
        </div>
        {formErrors.email && <p className="text-xs text-red-600 mt-1">{formErrors.email}</p>}
      </div>

      {/* Rôle — Combobox */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          {t('users.role')} *
          <span className="ml-2 text-xs font-normal text-gray-400">{t('users.selectOrType')}</span>
        </label>
        <RoleCombobox
          roles={roles}
          value={form.role_id}
          displayValue={roleLabel}
          onChange={(id, label) => { setForm(f => ({ ...f, role_id: id })); setRoleLabel(label); }}
          error={formErrors.role_label}
        />
        {/* Description du rôle sélectionné */}
        {form.role_id && (() => {
          const r = roles.find(r => r.id === form.role_id);
          const style = ROLE_STYLE[r?.name || ''] || ROLE_STYLE.viewer;
          return r ? (
            <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${style.badge}`}>
              <div className={`w-2 h-2 rounded-full ${style.dot}`} />
              {r.description}
            </div>
          ) : null;
        })()}
      </div>

      {/* Mot de passe (création uniquement) */}
      {!isEdit && (
        <>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('users.password')} *
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={t('users.min8Chars')}
                className={`w-full pl-10 pr-11 py-3 border-2 rounded-xl outline-none transition-all focus:ring-2 focus:ring-primary-100 ${
                  formErrors.password ? 'border-red-300' : 'border-gray-200 focus:border-primary-400'
                }`}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {showPwd ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
              </button>
            </div>
            {formErrors.password
              ? <p className="text-xs text-red-600 mt-1">{formErrors.password}</p>
              : <PasswordStrength password={form.password} />
            }
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('users.confirmPassword')} *</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.confirm_password}
                onChange={(e) => setForm(f => ({ ...f, confirm_password: e.target.value }))}
                placeholder={t('users.repeatPassword')}
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl outline-none transition-all focus:ring-2 focus:ring-primary-100 ${
                  formErrors.confirm_password ? 'border-red-300' : 'border-gray-200 focus:border-primary-400'
                }`}
              />
            </div>
            {formErrors.confirm_password && (
              <p className="text-xs text-red-600 mt-1">{formErrors.confirm_password}</p>
            )}
          </div>
        </>
      )}
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==')] opacity-30" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <button
              onClick={() => navigate('/app/settings')}
              className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Paramètres
            </button>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold tracking-wide uppercase">
                Gestion des Utilisateurs
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <UsersIcon className="h-8 w-8" />
              {t('users.title')}
            </h1>
            <p className="text-blue-100">{t('users.subtitle')}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 rounded-xl text-sm font-medium transition-all"
            >
              <Download className="h-4 w-4" />
              {t('users.exportCsv')}
            </button>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 rounded-xl text-sm font-medium transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              {t('users.refresh')}
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-50 transition-all shadow-md"
            >
              <Plus className="h-4 w-4" />
              {t('users.newUser')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('users.users'),    value: stats.total,    icon: UsersIcon,  bg: 'bg-primary-50',  text: 'text-primary-600',  border: 'border-primary-100' },
          { label: t('users.active'),   value: stats.active,   icon: UserCheck,  bg: 'bg-green-50',    text: 'text-green-600',    border: 'border-green-100' },
          { label: t('users.inactive'), value: stats.inactive, icon: UserX,      bg: 'bg-gray-50',     text: 'text-gray-500',     border: 'border-gray-200' },
          { label: t('users.roles'),    value: roles.length,   icon: Shield,     bg: 'bg-purple-50',   text: 'text-purple-600',   border: 'border-purple-100' },
        ].map(({ label, value, icon: Icon, bg, text, border }) => (
          <div key={label} className={`bg-white border-2 ${border} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 ${bg} rounded-xl`}>
                <Icon className={`h-5 w-5 ${text}`} />
              </div>
              <span className={`text-3xl font-black ${text}`}>{value}</span>
            </div>
            <p className="text-sm font-semibold text-gray-600">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Rôles breakdown ────────────────────────────────────────────────── */}
      {stats.byRole.filter(r => r.count > 0).length > 0 && (
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-5">
          <p className="text-sm font-bold text-gray-700 mb-4">{t('users.roleBreakdown')}</p>
          <div className="flex flex-wrap gap-3">
            {stats.byRole.map(role => {
              const style = ROLE_STYLE[role.name] || ROLE_STYLE.viewer;
              const Icon  = style.icon;
              const pct   = stats.total > 0 ? Math.round((role.count / stats.total) * 100) : 0;
              return (
                <div key={role.id} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${style.badge}`}>
                  <Icon className="h-4 w-4" />
                  <span className="font-semibold text-sm">{role.display_name}</span>
                  <span className="font-black text-sm">{role.count}</span>
                  <span className="text-xs opacity-60">({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filtres ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-2 border-gray-100 rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Recherche */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('users.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm transition-all"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Filtre rôle */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            aria-label="Filtrer par rôle"
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary-400 outline-none text-sm bg-white"
          >
            <option value="">{t('users.allRoles')}</option>
            {roles.map(r => {
              const val = isValidUUID(r.id) ? r.id : r.name;
              return <option key={val} value={val}>{r.display_name}</option>;
            })}
          </select>

          {/* Filtre statut */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filterStatus === s ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {s === 'all' ? t('users.all') : s === 'active' ? t('users.activeFilter') : t('users.inactiveFilter')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden">
        {displayed.length === 0 ? (
          <div className="text-center py-16">
            <UsersIcon className="h-12 w-12 mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500 font-semibold mb-1">{t('users.noUsersFound')}</p>
            <p className="text-sm text-gray-400 mb-5">
              {search || filterRole || filterStatus !== 'all'
                ? t('users.adjustFilters')
                : t('users.createFirst')}
            </p>
            {!search && !filterRole && filterStatus === 'all' && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />{t('users.createUser')}
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('users.userCol')}</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('users.roleCol')}</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('users.statusCol')}</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('users.memberSince')}</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('users.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map(user => {
                const initials   = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
                const avatarColor = getAvatarColor(user.first_name);
                const roleStyle   = user.role ? (ROLE_STYLE[user.role.name] || ROLE_STYLE.viewer) : null;
                const RoleIcon    = roleStyle?.icon;
                return (
                  <tr key={user.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${avatarColor}`}>
                          {initials || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />{user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {user.role && roleStyle && RoleIcon ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full border ${roleStyle.badge}`}>
                          <RoleIcon className="h-3 w-3" />
                          {user.role.display_name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">{t('users.noRole')}</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(user)}
                        className="group/btn flex items-center gap-2 hover:opacity-80 transition-opacity"
                        title={user.is_active ? 'Cliquer pour désactiver' : 'Cliquer pour réactiver'}
                      >
                        {user.is_active ? (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-xs font-semibold text-green-700">{t('users.active')}</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-gray-400 rounded-full" />
                            <span className="text-xs font-semibold text-gray-500">{t('users.inactive')}</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right" style={{ position: 'relative', zIndex: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          type="button"
                          onMouseDown={() => openEdit(user)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          <Edit2 style={{ width: 14, height: 14 }} />
                          Modifier
                        </button>
                        <button
                          type="button"
                          onMouseDown={() => handleToggleActiveDirect(user)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: user.is_active ? '#ea580c' : '#16a34a', background: user.is_active ? '#fff7ed' : '#f0fdf4', border: `1px solid ${user.is_active ? '#fed7aa' : '#bbf7d0'}`, borderRadius: '8px', cursor: 'pointer' }}
                        >
                          {user.is_active ? <><UserX style={{ width: 14, height: 14 }} />Désactiver</> : <><UserCheck style={{ width: 14, height: 14 }} />Réactiver</>}
                        </button>
                        <button
                          type="button"
                          onMouseDown={() => handleDeleteDirect(user)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {displayed.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            {displayed.length} utilisateur{displayed.length > 1 ? 's' : ''} affiché{displayed.length > 1 ? 's' : ''}
            {users.length !== displayed.length && ` sur ${users.length}`}
          </div>
        )}
      </div>

      {/* ── Panel Créer ─────────────────────────────────────────────────────── */}
      <SideModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('users.newUser')}
        subtitle={t('users.inviteMember')}
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setCreateOpen(false)} disabled={saving}>
              {t('users.cancel')}
            </Button>
            <Button className="flex-1" onClick={handleCreate} disabled={saving}>
              {saving
                ? <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />{t('users.creating')}</>
                : <><Plus className="h-4 w-4 mr-2" />{t('users.createUser')}</>
              }
            </Button>
          </>
        }
      >
        {formContent(false)}
      </SideModal>

      {/* ── Panel Modifier ──────────────────────────────────────────────────── */}
      <SideModal
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditingUser(null); }}
        title={editingUser ? `${t('users.edit')} — ${editingUser.first_name} ${editingUser.last_name}` : t('users.edit')}
        subtitle={t('users.updateMember')}
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => { setEditOpen(false); setEditingUser(null); }} disabled={saving}>
              {t('users.cancel')}
            </Button>
            <Button className="flex-1" onClick={handleEdit} disabled={saving}>
              {saving
                ? <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />{t('users.saving')}</>
                : <><CheckCircle className="h-4 w-4 mr-2" />{t('users.save')}</>
              }
            </Button>
          </>
        }
      >
        {formContent(true)}
      </SideModal>

      {/* ── Modal Suppression ────────────────────────────────────────────────── */}
      {deleteModal && deletingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{t('users.deleteConfirmTitle')}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-semibold">{deletingUser.first_name} {deletingUser.last_name}</span>
                  {' '}({deletingUser.email}) {t('users.deleteConfirmDesc')}
                </p>
              </div>
            </div>
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl mb-5 text-xs text-red-700 font-medium">
              ⚠ {t('users.deleteWarning')}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteModal(false)} disabled={saving}>
                {t('users.cancel')}
              </Button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
              >
                {saving
                  ? <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />{t('users.deleting')}</>
                  : <><Trash2 className="h-4 w-4" />{t('users.deletePermanently')}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
