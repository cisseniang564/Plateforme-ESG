import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Spinner from '@/components/common/Spinner';
import BackButton from '@/components/common/BackButton';
import { Plus, Clock, Trash2, Calendar, RefreshCw, CheckCircle, AlertTriangle, X } from 'lucide-react';
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
  start_date?: string | null;
  time_of_day?: string | null;
  end_date?: string | null;
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
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Default start date = today, time = 08:00. ISO format YYYY-MM-DD.
  const _todayIso = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: '',
    report_type: 'executive',
    frequency: 'monthly',
    format: 'pdf',
    start_date: _todayIso,
    time_of_day: '08:00',
    end_date: '',  // optional
  });

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
    // Validate the date range
    if (form.end_date && form.end_date < form.start_date) {
      toast.error("La date de fin doit être après la date de début");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        end_date: form.end_date || undefined,  // omit empty
      };
      const res = await api.post('/reports/scheduled', payload);
      setSchedules(prev => [...prev, res.data]);
      setShowModal(false);
      setForm({
        title: '', report_type: 'executive', frequency: 'monthly', format: 'pdf',
        start_date: _todayIso, time_of_day: '08:00', end_date: '',
      });
      toast.success('Rapport planifié créé');
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  // Confirmed delete (called from the delete-confirmation modal)
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/reports/scheduled/${deleteTarget.id}`);
      setSchedules(prev => prev.filter(s => s.id !== deleteTarget.id));
      toast.success('Rapport planifié supprimé');
      setDeleteTarget(null);
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  return (
    <div className="space-y-6">
      <BackButton to="/app/reports" label="Rapports" />
      {/* Modal création */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
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

              {/* ── Calendrier : date de première exécution + heure ─────────── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                    <Calendar size={14} className="text-teal-600" />
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    min={_todayIso}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Premier envoi à partir de cette date</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                    <Clock size={14} className="text-teal-600" />
                    Heure
                  </label>
                  <input
                    type="time"
                    value={form.time_of_day}
                    onChange={e => setForm(f => ({ ...f, time_of_day: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Fuseau Europe/Paris</p>
                </div>
              </div>

              {/* ── Date de fin (optionnel) ──────────────────────────────────── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  min={form.start_date || _todayIso}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Laisser vide pour une récurrence sans fin
                </p>
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

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl shadow-xl" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 40%, #0891b2 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 85% 15%, rgba(255,255,255,0.1) 0%, transparent 55%)' }} />
        <div className="relative px-8 py-7 flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Clock className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">{t('reports.scheduled', 'Rapports planifiés')}</h1>
            </div>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {t('reports.scheduledSubtitle', 'Automatisez vos rapports ESG récurrents')}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>
                {schedules.length} rapport{schedules.length !== 1 ? 's' : ''} planifié{schedules.length !== 1 ? 's' : ''}
              </div>
              {schedules.filter(s => s.status === 'active').length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(16,185,129,0.25)', color: '#6ee7b7' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {schedules.filter(s => s.status === 'active').length} actif{schedules.filter(s => s.status === 'active').length !== 1 ? 's' : ''}
                </div>
              )}
              {['Quotidien', 'Mensuel', 'Trimestriel'].map(f => (
                <div key={f} className="px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ background: 'rgba(255,255,255,0.1)' }}>{f}</div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={loadSchedules} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
              <RefreshCw size={14} /> Actualiser
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-colors"
              style={{ background: 'white', color: '#0f766e' }}
            >
              <Plus size={16} />
              {t('reports.newSchedule', 'Nouveau rapport')}
            </button>
          </div>
        </div>
      </div>

      <div className="hidden" style={{ display: 'none' }}>{/* replaced header */}
      </div>

      {/* ── Modal de confirmation de suppression ────────────────────────── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) setDeleteTarget(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-red-50 border-b border-red-100">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900">Supprimer ce rapport planifié ?</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Cette action est irréversible. Les prochaines exécutions automatiques
                    seront annulées.
                  </p>
                </div>
                {!deleting && (
                  <button onClick={() => setDeleteTarget(null)} className="text-gray-400 hover:text-gray-700">
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
                <p className="text-sm font-semibold text-gray-900">{deleteTarget.title}</p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                    {FREQUENCIES.find(f => f.value === deleteTarget.frequency)?.label ?? deleteTarget.frequency}
                  </span>
                  <span className="text-xs rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 uppercase">
                    {deleteTarget.format}
                  </span>
                  {deleteTarget.next_run && (
                    <span className="text-xs text-gray-500">
                      Prochaine : {new Date(deleteTarget.next_run).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
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
                          {schedule.time_of_day && (
                            <span className="text-gray-400">à {schedule.time_of_day}</span>
                          )}
                        </span>
                      )}
                      {schedule.end_date && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={11} />
                          Fin : {new Date(schedule.end_date).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteTarget(schedule)}
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
      </div>
    </div>
  );
}
