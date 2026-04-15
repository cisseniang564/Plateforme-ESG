import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import BackButton from '@/components/common/BackButton';
import { Plus, Clock, Trash2, Calendar, RefreshCw, CheckCircle } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface Schedule {
  id: string;
  title: string;
  report_type: string;
  frequency: string;
  format: string;
  status: string;
  next_run?: string;
  created_at?: string;
}

const FREQUENCIES = [
  { value: 'daily',     label: 'Quotidien' },
  { value: 'weekly',    label: 'Hebdomadaire' },
  { value: 'monthly',   label: 'Mensuel' },
  { value: 'quarterly', label: 'Trimestriel' },
];

const REPORT_TYPES = [
  { value: 'executive', label: 'Rapport exécutif' },
  { value: 'detailed',  label: 'Rapport détaillé' },
  { value: 'csrd',      label: 'Rapport CSRD' },
  { value: 'gri',       label: 'Rapport GRI' },
];

export default function ScheduledReports() {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', report_type: 'executive', frequency: 'monthly', format: 'pdf' });

  useEffect(() => { loadSchedules(); }, []);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/scheduled');
      setSchedules(res.data?.schedules || []);
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Le titre est requis'); return; }
    setSaving(true);
    try {
      const res = await api.post('/reports/scheduled', form);
      setSchedules(prev => [...prev, res.data]);
      setShowModal(false);
      setForm({ title: '', report_type: 'executive', frequency: 'monthly', format: 'pdf' });
      toast.success('Rapport planifié créé');
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/reports/scheduled/${id}`);
      setSchedules(prev => prev.filter(s => s.id !== id));
      toast.success('Rapport planifié supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <BackButton to="/app/reports" label="Rapports" />
      {/* Modal création */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Nouveau rapport planifié</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Ex: Rapport ESG mensuel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de rapport</label>
                <select
                  value={form.report_type}
                  onChange={e => setForm(f => ({ ...f, report_type: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {REPORT_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence</label>
                <select
                  value={form.frequency}
                  onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {FREQUENCIES.map(fr => <option key={fr.value} value={fr.value}>{fr.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <select
                  value={form.format}
                  onChange={e => setForm(f => ({ ...f, format: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('reports.scheduled', 'Rapports planifiés')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('reports.scheduledSubtitle', 'Automatisez vos rapports ESG récurrents')}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadSchedules} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <Plus size={16} />
            {t('reports.newSchedule', 'Nouveau rapport')}
          </button>
        </div>
      </div>

      <Card>
        {schedules.length > 0 ? (
          <div className="space-y-3">
            {schedules.map(schedule => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 rounded-lg">
                    <Clock className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{schedule.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 capitalize">
                        {FREQUENCIES.find(f => f.value === schedule.frequency)?.label ?? schedule.frequency}
                      </span>
                      <span className="text-xs rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 uppercase">
                        {schedule.format}
                      </span>
                      {schedule.next_run && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar size={11} />
                          Prochaine : {new Date(schedule.next_run).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(schedule.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">
              {t('reports.noSchedules', 'Aucun rapport planifié')}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {t('reports.scheduleFirst', 'Configurez des rapports automatiques récurrents')}
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              <Plus size={16} />
              {t('reports.newSchedule', 'Créer le premier rapport')}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
