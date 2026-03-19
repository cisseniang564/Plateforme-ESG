import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Users as UsersIcon, Plus, Search, Edit, Trash2, Shield,
  CheckCircle, XCircle, Mail, Calendar, Download, X
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import Modal from '@/components/common/Modal';
import PageHeader from '@/components/PageHeader';
import api from '@/services/api';

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
}

const EMPTY_FORM: UserForm = { email: '', first_name: '', last_name: '', role_id: '', password: '' };

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-blue-100 text-blue-800',
  analyst: 'bg-green-100 text-green-800',
};

export default function UserManagement() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Form
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<UserForm>>({});

  useEffect(() => { loadData(); }, [search, selectedRole]);

  const loadData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/users', { params: { search: search || undefined, role_id: selectedRole || undefined } }),
        api.get('/users/roles'),
      ]);
      setUsers(usersRes.data.items || []);
      setRoles(rolesRes.data.roles || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<UserForm> = {};
    if (!form.email) errors.email = 'Email requis';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Email invalide';
    if (!form.first_name) errors.first_name = 'Prénom requis';
    if (!form.last_name) errors.last_name = 'Nom requis';
    if (!editingUser && !form.password) errors.password = 'Mot de passe requis';
    if (!editingUser && form.password && form.password.length < 8) errors.password = 'Min. 8 caractères';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreate = () => { setForm(EMPTY_FORM); setFormErrors({}); setCreateModal(true); };
  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({ email: user.email, first_name: user.first_name, last_name: user.last_name, role_id: user.role?.id || '', password: '' });
    setFormErrors({});
    setEditModal(true);
  };
  const openDelete = (user: User) => { setDeletingUser(user); setDeleteModal(true); };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      await api.post('/users', {
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        password: form.password,
        ...(form.role_id && { role_id: form.role_id }),
      });
      toast.success('Utilisateur créé avec succès');
      setCreateModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!validateForm() || !editingUser) return;
    setSaving(true);
    try {
      await api.put(`/users/${editingUser.id}`, {
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
      });
      if (form.role_id && form.role_id !== editingUser.role?.id) {
        await api.post(`/users/${editingUser.id}/roles`, { role_id: form.role_id });
      }
      toast.success('Utilisateur mis à jour');
      setEditModal(false);
      setEditingUser(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setSaving(true);
    try {
      await api.delete(`/users/${deletingUser.id}`);
      toast.success('Utilisateur désactivé');
      setDeleteModal(false);
      setDeletingUser(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Prénom', 'Nom', 'Email', 'Rôle', 'Statut', 'Créé le'],
      ...users.map(u => [
        u.first_name, u.last_name, u.email,
        u.role?.display_name || '',
        u.is_active ? 'Actif' : 'Inactif',
        new Date(u.created_at).toLocaleDateString(),
      ]),
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'utilisateurs.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const UserFormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
          <input
            type="text"
            value={form.first_name}
            onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 ${formErrors.first_name ? 'border-red-300' : 'border-gray-300'}`}
            placeholder="Jean"
          />
          {formErrors.first_name && <p className="text-xs text-red-600 mt-1">{formErrors.first_name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
          <input
            type="text"
            value={form.last_name}
            onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 ${formErrors.last_name ? 'border-red-300' : 'border-gray-300'}`}
            placeholder="Dupont"
          />
          {formErrors.last_name && <p className="text-xs text-red-600 mt-1">{formErrors.last_name}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 ${formErrors.email ? 'border-red-300' : 'border-gray-300'}`}
          placeholder="jean.dupont@entreprise.com"
        />
        {formErrors.email && <p className="text-xs text-red-600 mt-1">{formErrors.email}</p>}
      </div>

      {!editingUser && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 ${formErrors.password ? 'border-red-300' : 'border-gray-300'}`}
            placeholder="Minimum 8 caractères"
          />
          {formErrors.password && <p className="text-xs text-red-600 mt-1">{formErrors.password}</p>}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
        <select
          value={form.role_id}
          onChange={(e) => setForm(f => ({ ...f, role_id: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
          aria-label="Rôle"
        >
          <option value="">Sans rôle</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
        </select>
      </div>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        showBack={true}
        backTo="/settings"
        actions={
          <>
            <Button variant="secondary" onClick={exportCSV}>
              <Download className="h-5 w-5 mr-2" />{t('common.export')}
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-5 w-5 mr-2" />{t('users.addUser')}
            </Button>
          </>
        }
      />

      {/* Role stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {roles.map(role => (
          <Card key={role.id}>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <Shield className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{role.display_name}</p>
                <p className="text-sm text-gray-500">{users.filter(u => u.role?.id === role.id).length} utilisateur(s)</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('users.searchUsers')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
            aria-label={t('users.allRoles')}
          >
            <option value="">{t('users.allRoles')}</option>
            {roles.map(role => <option key={role.id} value={role.id}>{role.display_name}</option>)}
          </select>
        </div>
      </Card>

      {/* Users table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('settings.users')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('users.role')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('users.created')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 font-medium text-sm">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" />{user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.role && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${ROLE_COLORS[user.role.name] || 'bg-gray-100 text-gray-800'}`}>
                        {user.role.display_name}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {user.is_active ? (
                        <><CheckCircle className="h-4 w-4 text-green-500" /><span className="text-sm text-green-700">Actif</span></>
                      ) : (
                        <><XCircle className="h-4 w-4 text-red-500" /><span className="text-sm text-red-700">Inactif</span></>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="h-3 w-3" />
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button
                      onClick={() => openEdit(user)}
                      className="text-primary-600 hover:text-primary-900 transition-colors"
                    >
                      <Edit className="h-4 w-4 inline" /> Modifier
                    </button>
                    <button
                      onClick={() => openDelete(user)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 inline" /> Désactiver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="text-center py-12">
            <UsersIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">{t('users.noUsers')}</p>
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Créer un utilisateur"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModal(false)} disabled={saving}>
              <X className="h-4 w-4 mr-1" /> Annuler
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Spinner size="sm" /> : <><Plus className="h-4 w-4 mr-1" /> Créer</>}
            </Button>
          </>
        }
      >
        <UserFormFields />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => { setEditModal(false); setEditingUser(null); }}
        title={`Modifier — ${editingUser?.first_name} ${editingUser?.last_name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setEditModal(false); setEditingUser(null); }} disabled={saving}>
              <X className="h-4 w-4 mr-1" /> Annuler
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? <Spinner size="sm" /> : <><CheckCircle className="h-4 w-4 mr-1" /> Enregistrer</>}
            </Button>
          </>
        }
      >
        <UserFormFields />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal}
        onClose={() => { setDeleteModal(false); setDeletingUser(null); }}
        title="Confirmer la désactivation"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setDeleteModal(false); setDeletingUser(null); }} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving ? <Spinner size="sm" /> : <><Trash2 className="h-4 w-4 mr-1" /> Désactiver</>}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-gray-900 font-medium">
              Désactiver {deletingUser?.first_name} {deletingUser?.last_name} ?
            </p>
            <p className="text-sm text-gray-500 mt-1">
              L'utilisateur ({deletingUser?.email}) ne pourra plus se connecter. Cette action est réversible.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
