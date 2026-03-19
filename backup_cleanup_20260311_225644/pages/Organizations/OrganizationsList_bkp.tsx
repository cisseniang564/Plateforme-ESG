import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronRight,
  Users,
  X,
  CheckCircle,
  List,
  GitBranch,
  BarChart2,
  Filter,
  ArrowUpDown,
  BadgeCheck,
  BadgeX,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import Modal from '@/components/common/Modal';
import PageHeader from '@/components/PageHeader';
import api from '@/services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type OrgType = 'group' | 'business_unit' | 'site' | 'department';

interface Organization {
  id: string;
  name: string;
  org_type: OrgType;
  parent_org_id: string | null;
  parent?: { id: string; name: string } | null;
  siren?: string | null;
  employee_count?: number | null;
  is_active: boolean;
  created_at: string;
}

interface OrgTreeNode {
  id: string;
  name: string;
  org_type: OrgType;
  is_active: boolean;
  children: OrgTreeNode[];
}

interface OrgForm {
  name: string;
  org_type: OrgType;
  parent_org_id: string;
  siren: string;
  employee_count: string;
}

const EMPTY_FORM: OrgForm = {
  name: '',
  org_type: 'business_unit',
  parent_org_id: '',
  siren: '',
  employee_count: '',
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  group: 'Groupe',
  business_unit: 'Unité Métier',
  site: 'Site',
  department: 'Département',
};

const ORG_TYPE_BADGE: Record<OrgType, string> = {
  group: 'bg-violet-50 text-violet-700 ring-violet-200',
  business_unit: 'bg-blue-50 text-blue-700 ring-blue-200',
  site: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  department: 'bg-amber-50 text-amber-800 ring-amber-200',
};

const ORG_TYPE_ICON_BG: Record<OrgType, string> = {
  group: 'bg-violet-100 text-violet-700',
  business_unit: 'bg-blue-100 text-blue-700',
  site: 'bg-emerald-100 text-emerald-700',
  department: 'bg-amber-100 text-amber-800',
};

const orgTypeOrder: OrgType[] = ['group', 'business_unit', 'site', 'department'];

type SortKey = 'name' | 'org_type' | 'employee_count' | 'is_active';
type SortDir = 'asc' | 'desc';

// ─── Utils ───────────────────────────────────────────────────────────────────

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function safeNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalize(s: string) {
  return (s || '').toLowerCase().trim();
}

// ─── Tree Node ───────────────────────────────────────────────────────────────

function TreeNode({ node, depth = 0 }: { node: OrgTreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children?.length > 0;

  return (
    <div className={cx(depth > 0 && 'ml-6 border-l border-gray-200 pl-4')}>
      <div className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50">
        {hasChildren ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-gray-400 hover:text-gray-700"
            aria-label={expanded ? 'Réduire' : 'Déplier'}
          >
            <ChevronRight className={cx('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-4" />
        )}

        <div className="flex items-center gap-3 flex-1">
          <div className={cx('rounded-lg p-2', ORG_TYPE_ICON_BG[node.org_type])}>
            <Building2 className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">{node.name}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1', ORG_TYPE_BADGE[node.org_type])}>
                {ORG_TYPE_LABELS[node.org_type]}
              </span>
              {!node.is_active && (
                <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-600 ring-1 ring-gray-200">
                  Inactif
                </span>
              )}
              {hasChildren && <span className="text-xs text-gray-400">({node.children.length})</span>}
            </div>
          </div>
        </div>
      </div>

      {expanded &&
        node.children?.map((child) => <TreeNode key={child.id} node={child} depth={depth + 1} />)}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function OrganizationsList() {
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [tree, setTree] = useState<OrgTreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<OrgType | ''>('');

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Pagination (front)
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);

  // Form
  const [form, setForm] = useState<OrgForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<OrgForm>>({});

  useEffect(() => {
    loadData();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, sortKey, sortDir]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [orgsRes, treeRes] = await Promise.all([
        api.get('/organizations', { params: { limit: 200 } }),
        api.get('/organizations/tree').catch(() => ({ data: [] })),
      ]);

      setOrganizations(orgsRes.data.items || []);
      setTree(Array.isArray(treeRes.data) ? treeRes.data : []);
    } catch (error) {
      console.error('Error loading organizations:', error);
      toast.error('Impossible de charger les organisations');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const active = organizations.filter((o) => o.is_active);
    const byType = (t: OrgType) => active.filter((o) => o.org_type === t).length;
    return {
      totalActive: active.length,
      totalAll: organizations.length,
      group: byType('group'),
      business_unit: byType('business_unit'),
      site: byType('site'),
      department: byType('department'),
    };
  }, [organizations]);

  const filtered = useMemo(() => {
    const q = normalize(search);

    const base = organizations.filter((org) => {
      const matchSearch =
        !q ||
        normalize(org.name).includes(q) ||
        (org.siren ? normalize(org.siren).includes(q) : false);

      const matchType = !typeFilter || org.org_type === typeFilter;

      return matchSearch && matchType;
    });

    const sorted = [...base].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;

      if (sortKey === 'name') {
        return normalize(a.name).localeCompare(normalize(b.name)) * dir;
      }

      if (sortKey === 'org_type') {
        return (orgTypeOrder.indexOf(a.org_type) - orgTypeOrder.indexOf(b.org_type)) * dir;
      }

      if (sortKey === 'employee_count') {
        return (safeNumber(a.employee_count) - safeNumber(b.employee_count)) * dir;
      }

      if (sortKey === 'is_active') {
        return (Number(a.is_active) - Number(b.is_active)) * dir;
      }

      return 0;
    });

    return sorted;
  }, [organizations, search, typeFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
      return;
    }
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
  };

  const validateForm = (): boolean => {
    const errors: Partial<OrgForm> = {};

    if (!form.name.trim()) errors.name = 'Nom requis';
    if (form.siren && !/^\d{9}$/.test(form.siren)) errors.siren = 'SIREN invalide (9 chiffres)';
    if (form.employee_count && Number.isNaN(Number(form.employee_count)))
      errors.employee_count = 'Nombre invalide';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setCreateModal(true);
  };

  const openEdit = (org: Organization) => {
    setEditingOrg(org);
    setForm({
      name: org.name,
      org_type: org.org_type,
      parent_org_id: org.parent_org_id || '',
      siren: org.siren || '',
      employee_count: org.employee_count ? String(org.employee_count) : '',
    });
    setFormErrors({});
    setEditModal(true);
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      await api.post('/organizations', {
        name: form.name,
        org_type: form.org_type,
        ...(form.parent_org_id && { parent_org_id: form.parent_org_id }),
        ...(form.siren && { siren: form.siren }),
        ...(form.employee_count && { employee_count: Number(form.employee_count) }),
      });
      toast.success('Organisation créée');
      setCreateModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!validateForm() || !editingOrg) return;
    setSaving(true);
    try {
      await api.put(`/organizations/${editingOrg.id}`, {
        name: form.name,
        org_type: form.org_type,
        ...(form.parent_org_id && { parent_org_id: form.parent_org_id }),
        ...(form.siren && { siren: form.siren }),
        ...(form.employee_count && { employee_count: Number(form.employee_count) }),
      });
      toast.success('Organisation mise à jour');
      setEditModal(false);
      setEditingOrg(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingOrg) return;
    setSaving(true);
    try {
      await api.delete(`/organizations/${deletingOrg.id}`);
      toast.success('Organisation désactivée');
      setDeleteModal(false);
      setDeletingOrg(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la désactivation');
    } finally {
      setSaving(false);
    }
  };

  const OrgFormFields = () => (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Nom *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className={cx(
            'w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-primary-500',
            formErrors.name ? 'border-red-300' : 'border-gray-300'
          )}
          placeholder="ex: Division Europe"
        />
        {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
          <select
            value={form.org_type}
            onChange={(e) => setForm((f) => ({ ...f, org_type: e.target.value as OrgType }))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary-500"
            title="Sélectionner le type d'organisation"
            aria-label="Type d'organisation"
          >
            {Object.entries(ORG_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">Choisis le niveau hiérarchique.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Organisation parente</label>
          <select
            value={form.parent_org_id}
            onChange={(e) => setForm((f) => ({ ...f, parent_org_id: e.target.value }))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary-500"
            title="Sélectionner l'organisation parente"
            aria-label="Organisation parente"
          >
            <option value="">Aucune (racine)</option>
            {organizations
              .filter((o) => o.id !== editingOrg?.id)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">Permet de construire l’arborescence.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">SIREN</label>
          <input
            type="text"
            value={form.siren}
            onChange={(e) => setForm((f) => ({ ...f, siren: e.target.value }))}
            className={cx(
              'w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-primary-500',
              formErrors.siren ? 'border-red-300' : 'border-gray-300'
            )}
            placeholder="552081317"
            maxLength={9}
          />
          {formErrors.siren && <p className="mt-1 text-xs text-red-600">{formErrors.siren}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Effectif</label>
          <input
            type="number"
            value={form.employee_count}
            onChange={(e) => setForm((f) => ({ ...f, employee_count: e.target.value }))}
            className={cx(
              'w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-primary-500',
              formErrors.employee_count ? 'border-red-300' : 'border-gray-300'
            )}
            placeholder="250"
            min={0}
          />
          {formErrors.employee_count && (
            <p className="mt-1 text-xs text-red-600">{formErrors.employee_count}</p>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organisations"
        subtitle="Gérez la structure hiérarchique de vos organisations"
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/indicators/compare')}>
              <BarChart2 className="mr-2 h-5 w-5" />
              Vue comparative
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-5 w-5" />
              Nouvelle organisation
            </Button>
          </>
        }
      />

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-gray-600">Actives</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalActive}</p>
              <p className="mt-1 text-xs text-gray-500">sur {stats.totalAll} organisations</p>
            </div>
            <div className="rounded-lg bg-primary-50 p-3 text-primary-600">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
        </Card>

        {(['group', 'business_unit', 'site'] as OrgType[]).map((t) => (
          <Card key={t}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-gray-600">{ORG_TYPE_LABELS[t]}</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">{stats[t]}</p>
                <p className="mt-1 text-xs text-gray-500">actives</p>
              </div>
              <div className={cx('rounded-lg p-3', ORG_TYPE_ICON_BG[t])}>
                <Building2 className="h-6 w-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom ou SIREN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                aria-label="Filtrer par type d'organisation"
                title="Filtrer par type d'organisation"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as OrgType | '')}
                className="rounded-md border border-gray-300 py-2 pl-9 pr-8 text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Tous les types</option>
                {Object.entries(ORG_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            {/* Result counter */}
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{filtered.length}</span> résultat(s)
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex overflow-hidden rounded-md border border-gray-300">
              <button
                onClick={() => setViewMode('list')}
                className={cx(
                  'flex items-center gap-2 px-3 py-2 text-sm',
                  viewMode === 'list'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <List className="h-4 w-4" />
                Liste
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={cx(
                  'flex items-center gap-2 px-3 py-2 text-sm',
                  viewMode === 'tree'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <GitBranch className="h-4 w-4" />
                Hiérarchie
              </button>
            </div>

            <Button variant="secondary" onClick={loadData}>
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Rafraîchir
            </Button>
          </div>
        </div>
      </Card>

      {/* Content */}
      {viewMode === 'list' ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    <button
                      className="inline-flex items-center gap-2 hover:text-gray-700"
                      onClick={() => toggleSort('name')}
                      type="button"
                    >
                      Organisation <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    <button
                      className="inline-flex items-center gap-2 hover:text-gray-700"
                      onClick={() => toggleSort('org_type')}
                      type="button"
                    >
                      Type <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Parent
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    <button
                      className="inline-flex items-center gap-2 hover:text-gray-700"
                      onClick={() => toggleSort('employee_count')}
                      type="button"
                    >
                      Effectif <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    <button
                      className="inline-flex items-center gap-2 hover:text-gray-700"
                      onClick={() => toggleSort('is_active')}
                      type="button"
                    >
                      Statut <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 bg-white">
                {paginated.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    {/* Org */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cx('rounded-lg p-2', ORG_TYPE_ICON_BG[org.org_type])}>
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">{org.name}</p>
                          {org.siren ? (
                            <p className="mt-0.5 text-xs text-gray-500">SIREN: {org.siren}</p>
                          ) : (
                            <p className="mt-0.5 text-xs text-gray-300">SIREN: —</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cx('inline-flex rounded-full px-2 py-1 text-xs font-medium ring-1', ORG_TYPE_BADGE[org.org_type])}>
                        {ORG_TYPE_LABELS[org.org_type]}
                      </span>
                    </td>

                    {/* Parent */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {org.parent?.name || <span className="text-gray-300">—</span>}
                    </td>

                    {/* Employee */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {org.employee_count ? (
                        <span className="inline-flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          {org.employee_count.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {org.is_active ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2 py-1 text-sm text-emerald-700 ring-1 ring-emerald-200">
                          <BadgeCheck className="h-4 w-4" />
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-2 py-1 text-sm text-gray-600 ring-1 ring-gray-200">
                          <BadgeX className="h-4 w-4" />
                          Inactif
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEdit(org)}
                          className="rounded-md p-2 text-primary-600 hover:bg-primary-50"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => {
                            setDeletingOrg(org);
                            setDeleteModal(true);
                          }}
                          className="rounded-md p-2 text-red-600 hover:bg-red-50"
                          title="Désactiver"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty */}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <Building2 className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-600">Aucune organisation trouvée</p>
              <Button onClick={openCreate} className="mt-4">
                <Plus className="mr-2 h-4 w-4" /> Créer une organisation
              </Button>
            </div>
          )}

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Page <span className="font-medium text-gray-900">{page}</span> sur{' '}
                <span className="font-medium text-gray-900">{totalPages}</span>
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <GitBranch className="h-5 w-5 text-primary-600" />
              Arborescence hiérarchique
            </h2>
            <span className="text-sm text-gray-500">
              {tree.length} racine(s)
            </span>
          </div>

          {tree.length === 0 ? (
            <div className="py-10 text-center text-gray-600">
              <p>Aucune hiérarchie disponible</p>
            </div>
          ) : (
            <div className="space-y-1">
              {tree.map((node) => (
                <TreeNode key={node.id} node={node} />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Nouvelle organisation"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModal(false)} disabled={saving}>
              <X className="mr-1 h-4 w-4" /> Annuler
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Spinner size="sm" /> : <><Plus className="mr-1 h-4 w-4" /> Créer</>}
            </Button>
          </>
        }
      >
        <OrgFormFields />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => {
          setEditModal(false);
          setEditingOrg(null);
        }}
        title={editingOrg ? `Modifier — ${editingOrg.name}` : 'Modifier'}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setEditModal(false);
                setEditingOrg(null);
              }}
              disabled={saving}
            >
              <X className="mr-1 h-4 w-4" /> Annuler
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <CheckCircle className="mr-1 h-4 w-4" /> Enregistrer
                </>
              )}
            </Button>
          </>
        }
      >
        <OrgFormFields />
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={deleteModal}
        onClose={() => {
          setDeleteModal(false);
          setDeletingOrg(null);
        }}
        title="Confirmer la désactivation"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteModal(false);
                setDeletingOrg(null);
              }}
              disabled={saving}
            >
              Annuler
            </Button>

            <Button onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <Trash2 className="mr-1 h-4 w-4" /> Désactiver
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <Building2 className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Désactiver « {deletingOrg?.name} » ?</p>
            <p className="mt-1 text-sm text-gray-600">
              L’organisation sera marquée comme inactive. Les données associées sont conservées.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}