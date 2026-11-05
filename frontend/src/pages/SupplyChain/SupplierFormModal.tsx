import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, X } from 'lucide-react';
import api from '@/services/api';
import { CATEGORIES, Supplier, apiErrorMessage } from './supplyChainModel';

interface Props {
  supplier?: Supplier; // présent = modification
  onClose: () => void;
  onSaved: (raw: any) => void;
}

const field = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function SupplierFormModal({ supplier, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: supplier?.name ?? '',
    country: supplier?.country ?? 'France',
    category: supplier?.category || 'Services',
    contactEmail: supplier?.contactEmail ?? '',
    spend: supplier ? String(supplier.spend) : '',
    employees: supplier ? String(supplier.employees) : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    const body = {
      name: form.name.trim(),
      country: form.country.trim() || 'France',
      category: form.category,
      contact_email: form.contactEmail.trim(),
      spend_k_eur: Number(form.spend) || 0,
      employees: Math.max(0, Math.round(Number(form.employees) || 0)),
    };
    try {
      const res = supplier
        ? await api.put(`/supply-chain/suppliers/${supplier.id}`, body)
        : await api.post('/supply-chain/suppliers', body);
      onSaved(res.data);
    } catch (err) {
      setError(apiErrorMessage(err, t('supplychain.saveError', "Enregistrement impossible. Réessayez dans un instant.")));
    } finally {
      setSaving(false);
    }
  };

  const categories = CATEGORIES.includes(form.category) || !form.category ? CATEGORIES : [form.category, ...CATEGORIES];

  return createPortal(
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            {supplier ? t('supplychain.editSupplier', 'Modifier le fournisseur') : t('supplychain.addSupplier', 'Ajouter un fournisseur')}
          </h2>
          <button onClick={onClose} aria-label={t('common.close', 'Fermer')} className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sf-name">{t('supplychain.modalFieldName', 'Nom')} <span className="text-red-500">*</span></label>
            <input id="sf-name" value={form.name} onChange={set('name')} className={field} autoFocus placeholder={t('supplychain.modalNamePlaceholder', "Nom de l'entreprise fournisseur")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sf-country">{t('supplychain.modalFieldCountry', 'Pays')}</label>
              <input id="sf-country" value={form.country} onChange={set('country')} className={field} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sf-cat">{t('supplychain.modalFieldCategory', 'Catégorie')}</label>
              <select id="sf-cat" value={form.category} onChange={set('category')} className={field}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sf-email">{t('supplychain.modalFieldEmail', 'Email du contact RSE')}</label>
            <input id="sf-email" type="email" value={form.contactEmail} onChange={set('contactEmail')} className={field} placeholder="rse@fournisseur.com" />
            <p className="text-xs text-gray-400 mt-1">{t('supplychain.modalEmailHint', "Le questionnaire ESG sera envoyé à cette adresse.")}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sf-spend">{t('supplychain.modalFieldSpend', 'Achats annuels (k€)')}</label>
              <input id="sf-spend" type="number" min="0" value={form.spend} onChange={set('spend')} className={field} placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sf-emp">{t('supplychain.modalFieldEmployees', 'Effectif')}</label>
              <input id="sf-emp" type="number" min="0" value={form.employees} onChange={set('employees')} className={field} placeholder="0" />
            </div>
          </div>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50">{t('common.cancel', 'Annuler')}</button>
          <button onClick={submit} disabled={!form.name.trim() || saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {supplier ? t('common.save', 'Enregistrer') : t('common.add', 'Ajouter')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
