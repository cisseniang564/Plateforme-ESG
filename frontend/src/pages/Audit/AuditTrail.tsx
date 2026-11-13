import { useState, useMemo, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList, Search, Download, Filter, Eye, CheckCircle,
  XCircle, FileText, Upload, Trash2, Edit3, Plus, LogIn, Send,
  RefreshCw, Shield, Lock, Hash, Paperclip, Calendar,
  User, Database, ArrowRight, X, Info,
  BookOpen, GitBranch, Star,
} from 'lucide-react';
import BackButton from '@/components/common/BackButton';
import PageHero, { PageHeroPrimaryButton } from '@/components/layout/PageHero';

// ─── Types ────────────────────────────────────────────────────────────────────
type ActionType =
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'SUBMIT' | 'APPROVE'
  | 'REJECT' | 'IMPORT' | 'EXPORT' | 'LOGIN' | 'COMMENT'
  | 'ATTACH' | 'CALCULATE' | 'PUBLISH';

type TabId = 'journal' | 'versions' | 'export';

interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  userRole: string;
  action: ActionType;
  module: string;
  entity: string;
  entityId: string;
  description: string;
  oldValue?: string;
  newValue?: string;
  ipAddress: string;
  sessionId: string;
  hash: string;
  signatureHash?: string | null;  // SHA-256 approval fingerprint (not a qualified e-signature)
  attachments?: string[];
  comment?: string;
}

// ─── (no static mock data — loaded from API) ──────────────────────────────────

// ─── Action config ────────────────────────────────────────────────────────────
const ACTION_CFG_STATIC: Record<ActionType, { color: string; bg: string; border: string; icon: any }> = {
  CREATE:    { color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', icon: Plus },
  UPDATE:    { color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200',    icon: Edit3 },
  DELETE:    { color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200',     icon: Trash2 },
  SUBMIT:    { color: 'text-violet-700',  bg: 'bg-violet-50',   border: 'border-violet-200',  icon: Send },
  APPROVE:   { color: 'text-green-700',   bg: 'bg-green-50',    border: 'border-green-200',   icon: CheckCircle },
  REJECT:    { color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200',     icon: XCircle },
  IMPORT:    { color: 'text-orange-700',  bg: 'bg-orange-50',   border: 'border-orange-200',  icon: Upload },
  EXPORT:    { color: 'text-slate-600',   bg: 'bg-slate-50',    border: 'border-slate-200',   icon: Download },
  LOGIN:     { color: 'text-gray-600',    bg: 'bg-gray-50',     border: 'border-gray-200',    icon: LogIn },
  COMMENT:   { color: 'text-teal-700',    bg: 'bg-teal-50',     border: 'border-teal-200',    icon: BookOpen },
  ATTACH:    { color: 'text-indigo-700',  bg: 'bg-indigo-50',   border: 'border-indigo-200',  icon: Paperclip },
  CALCULATE: { color: 'text-cyan-700',    bg: 'bg-cyan-50',     border: 'border-cyan-200',    icon: RefreshCw },
  PUBLISH:   { color: 'text-pink-700',    bg: 'bg-pink-50',     border: 'border-pink-200',    icon: Star },
};

// Fallback used when the backend emits an action the frontend hasn't seen.
// Without this, ``ACTION_CFG_STATIC[event.action]`` returns undefined and the
// next ``cfg.icon`` access crashes with "undefined is not an object".
const ACTION_CFG_FALLBACK = {
  color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200', icon: BookOpen,
} as const;

/** Safe lookup that always returns a valid config — defends against new
 *  server-side action types that haven't been added to ACTION_CFG_STATIC yet. */
function getActionCfg(action: string | null | undefined) {
  if (!action) return ACTION_CFG_FALLBACK;
  return (ACTION_CFG_STATIC as Record<string, any>)[action] ?? ACTION_CFG_FALLBACK;
}

const MODULES = ['Tous', 'Collecte Données', 'Pilotage ESG', 'Validation', 'Rapports', 'Supply Chain', 'Matérialité', 'Décarbonation', 'IA & Automatisation', 'Authentification'];
const ACTIONS: (ActionType | 'Tous')[] = ['Tous', 'CREATE', 'UPDATE', 'DELETE', 'SUBMIT', 'APPROVE', 'REJECT', 'IMPORT', 'EXPORT', 'COMMENT', 'ATTACH'];

const USER_COLOR_PALETTE = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
  'bg-amber-500', 'bg-cyan-500',
];

function formatDate(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function userInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}


// ─── Event detail panel ───────────────────────────────────────────────────────
function EventDetail({ event, onClose }: { event: AuditEvent; onClose: () => void }) {
  const { t } = useTranslation();
  const cfg = getActionCfg(event.action);
  const ActionIcon = cfg.icon;
  return (
    <div className="fixed inset-0 z-[60] flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">{t('audit.eventDetail')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Action badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
            <ActionIcon className="h-4 w-4" />
            {t(`audit.eventTypes.${event.action}`)} — {event.module}
          </div>

          {/* Description */}
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">{t('audit.description')}</p>
            <p className="text-sm text-gray-900">{event.description}</p>
          </div>

          {/* Before / After */}
          {(event.oldValue || event.newValue) && (
            <div className="grid grid-cols-2 gap-3">
              {event.oldValue && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-600 mb-1">{t('audit.valueBefore')}</p>
                  <p className="text-sm text-red-800 font-mono">{event.oldValue}</p>
                </div>
              )}
              {event.newValue && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-green-600 mb-1">{t('audit.valueAfter')}</p>
                  <p className="text-sm text-green-800 font-mono">{event.newValue}</p>
                </div>
              )}
            </div>
          )}

          {/* Comment */}
          {event.comment && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <p className="text-xs font-bold text-teal-600 mb-1.5">{t('audit.auditComment')}</p>
              <p className="text-sm text-teal-900 italic">"{event.comment}"</p>
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { labelKey: 'audit.metaUser', val: event.user, icon: User },
              { labelKey: 'audit.metaRole', val: event.userRole, icon: Shield },
              { labelKey: 'audit.metaTimestamp', val: formatDate(event.timestamp), icon: Calendar },
              { labelKey: 'audit.metaEntity', val: `${event.entity} #${event.entityId}`, icon: Database },
              { labelKey: 'audit.metaIp', val: event.ipAddress, icon: Lock },
              { labelKey: 'audit.metaSession', val: event.sessionId, icon: GitBranch },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <item.icon className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t(item.labelKey)}</span>
                </div>
                <span className="text-sm text-gray-800 font-mono break-all">{item.val}</span>
              </div>
            ))}
          </div>

          {/* Integrity hash */}
          <div className="bg-slate-900 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="h-4 w-4 text-green-400" />
              <span className="text-xs font-bold text-green-400 uppercase tracking-wider">{t('audit.integrityFootprint')}</span>
            </div>
            <code className="text-xs text-slate-300 font-mono break-all">{event.hash ?? '—'}</code>
            <p className="text-[11px] text-slate-400 mt-2">{t('audit.hashHint', "Empreinte SHA-256 de l'entrée, chaînée à la précédente. Utilisez « Vérifier l'intégrité » (onglet Export) pour recalculer la chaîne.")}</p>
          </div>

          {/* Approval fingerprint — only on approval events */}
          {event.signatureHash && (
            <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Lock className="h-4 w-4 text-indigo-300" />
                <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
                  {t('audit.approvalFingerprint', "Empreinte d'approbation")}
                </span>
                <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-100/20 text-indigo-100 border border-indigo-300/30">
                  SHA-256
                </span>
              </div>
              <code className="block text-xs text-indigo-100 font-mono break-all bg-black/30 px-3 py-2 rounded-lg">
                {event.signatureHash}
              </code>
              <p className="text-[11px] text-indigo-200 mt-2 leading-relaxed">
                {t('audit.approvalFingerprintHint', "Empreinte des éléments de la décision, pour recoupement. Ce n'est pas une signature électronique qualifiée.")}
              </p>
            </div>
          )}

          {/* Attachments */}
          {event.attachments && event.attachments.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-2">{t('audit.supportingDocs')}</p>
              <div className="space-y-2">
                {event.attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <FileText className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                    <span className="text-sm text-indigo-800 flex-1 truncate">{att}</span>
                    <button className="text-indigo-600 hover:text-indigo-800 transition-colors">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AuditTrail() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>('journal');
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('Tous');
  const [actionFilter, setActionFilter] = useState<ActionType | 'Tous'>('Tous');
  const [userFilter, setUserFilter] = useState('Tous');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exporting, setExporting] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyReport, setVerifyReport] = useState<null | {
    checked: number; invalid: number; unsealed: number; is_valid: boolean;
    first_broken_at: string | null; checked_at: string; limitations?: string;
  }>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loadError, setLoadError] = useState(false);
  // ── API state ──
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [statsData, setStatsData] = useState<{ total: number; recent_7_days: number; by_action: Record<string, number> } | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const params: Record<string, string> = { page: '1', page_size: '100' };
      if (actionFilter !== 'Tous') params.action = actionFilter.toLowerCase();
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const res = await api.get('/audit-trail', { params });
      setEvents(res.data.items ?? []);
      setEventsTotal(res.data.total ?? 0);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoadingEvents(false);
    }
  }, [actionFilter, debouncedSearch]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    api.get('/audit-trail/stats', { params: { days: 30 } })
      .then(r => setStatsData(r.data))
      .catch(() => {});
  }, []);

  // ── Derive unique users from loaded events (replaces hardcoded USERS list) ──
  const uniqueUsers = useMemo(
    () => ['Tous', ...Array.from(new Set(events.map(e => e.user).filter(Boolean))).sort()],
    [events]
  );

  const getUserColor = useMemo(() => {
    const map: Record<string, string> = {};
    uniqueUsers.filter(u => u !== 'Tous').forEach((u, i) => {
      map[u] = USER_COLOR_PALETTE[i % USER_COLOR_PALETTE.length];
    });
    return map;
  }, [uniqueUsers]);

  // KPIs — derived from API stats when available, else from loaded events
  const totalEvents = eventsTotal;
  const last7Events = statsData?.recent_7_days ?? 0;
  const modifyEvents = statsData
    ? ((statsData.by_action['create'] ?? 0) + (statsData.by_action['update'] ?? 0) + (statsData.by_action['delete'] ?? 0))
    : events.filter(e => ['CREATE', 'UPDATE', 'DELETE'].includes(e.action)).length;
  const approvalEvents = statsData
    ? ((statsData.by_action['validate'] ?? 0) + (statsData.by_action['reject'] ?? 0))
    : events.filter(e => ['APPROVE', 'REJECT'].includes(e.action)).length;
  // Client-side filter on top of server-fetched page (module/user filters applied locally)
  const filtered = useMemo(() => events.filter(e => {
    if (moduleFilter !== 'Tous' && e.module !== moduleFilter) return false;
    if (userFilter !== 'Tous' && e.user !== userFilter) return false;
    return true;
  }), [events, moduleFilter, userFilter]);

  const handleExport = async () => {
    setExporting(true); setExportError(null);
    try {
      const params: Record<string, string> = { format: exportFormat };
      if (exportFrom) params.date_from = `${exportFrom}T00:00:00+00:00`;
      if (exportTo) params.date_to = `${exportTo}T23:59:59+00:00`;
      const res = await api.get('/audit-trail/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `piste-audit.${exportFormat}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError(t('audit.exportError', "L'export a échoué. Réessayez ou contactez le support."));
    } finally {
      setExporting(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true); setVerifyError(null);
    try {
      const res = await api.get('/audit-trail/verify');
      setVerifyReport(res.data);
    } catch {
      setVerifyReport(null);
      setVerifyError(t('audit.verifyError', 'La vérification a échoué.'));
    } finally {
      setVerifying(false);
    }
  };

  const tabs = [
    { id: 'journal' as TabId, label: `${t('audit.tabs.journal')} (${eventsTotal || events.length})` },
    { id: 'versions' as TabId, label: t('audit.tabs.versions') },
    { id: 'export' as TabId, label: t('audit.tabs.export') },
  ];

  return (
    <div className="space-y-6">
      <BackButton to="/app/settings" label="Paramètres" />

      {/* ── Hero (signature) ── */}
      <PageHero
        badge="Traçabilité & Conformité"
        badgeIcon={Lock}
        icon={ClipboardList}
        title={t('audit.title')}
        description={t('audit.subtitle')}
        actions={
          <PageHeroPrimaryButton onClick={() => setTab('export')} icon={Download}>
            {t('audit.exportForAudit')}
          </PageHeroPrimaryButton>
        }
      />

      {/* ── Tabs ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {tabs.map(tb => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                tab === tb.id
                  ? 'border-slate-700 text-slate-900 bg-slate-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        <div className="p-6">

        {/* ── Journal d'audit ── */}
        {tab === 'journal' && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: t('audit.totalEvents'), val: totalEvents, sub: t('audit.kpiSinceStart'), color: 'text-slate-900', bg: 'bg-white border-gray-200' },
                { label: t('audit.kpiLast7', '7 derniers jours'), val: last7Events, sub: t('audit.kpiLast7Sub', 'événements enregistrés'), color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                { label: t('audit.kpiDataChanges'), val: modifyEvents, sub: t('audit.kpiLast30', '30 derniers jours'), color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
                { label: t('audit.kpiValidationDecisions'), val: approvalEvents, sub: t('audit.kpiLast30', '30 derniers jours'), color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
              ].map((k, i) => (
                <div key={i} className={`rounded-2xl border-2 ${k.bg} p-4`}>
                  <div className={`text-3xl font-extrabold ${k.color}`}>{k.val}</div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">{k.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{k.sub}</div>
                </div>
              ))}
            </div>

            {loadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {t('audit.loadError', "Impossible de charger le journal d'audit. Réessayez dans un instant.")}
              </div>
            )}

            {/* Search & Filters */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('audit.searchJournal')} className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
                <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${showFilters ? 'bg-slate-800 text-white border-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <Filter className="h-4 w-4" /> {t('audit.filters')}
                </button>
              </div>
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">{t('audit.filterModule')}</label>
                    <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                      {MODULES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">{t('audit.filterActionType')}</label>
                    <select value={actionFilter} onChange={e => setActionFilter(e.target.value as ActionType | 'Tous')} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                      {ACTIONS.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">{t('audit.filterUser')}</label>
                    <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                      {uniqueUsers.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-400">{t('audit.eventCount', { count: filtered.length })}</div>

            {/* Timeline */}
            {loadingEvents ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm">Chargement de la piste d'audit…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ClipboardList className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Aucun événement trouvé</p>
                <p className="text-xs mt-1">Les actions des utilisateurs apparaîtront ici</p>
              </div>
            ) : (
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-2">
                {filtered.map((event) => {
                  const cfg = getActionCfg(event.action);
                  const ActionIcon = cfg.icon;
                  const initials = userInitials(event.user);
                  const avatarColor = getUserColor[event.user] || 'bg-gray-400';
                  return (
                    <div key={event.id} className="relative flex items-start gap-4 pl-4">
                      {/* Timeline dot */}
                      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm ${cfg.bg}`}>
                        <ActionIcon className={`h-3.5 w-3.5 ${cfg.color}`} />
                      </div>

                      {/* Card */}
                      <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer" onClick={() => setSelectedEvent(event)}>
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                              <ActionIcon className="h-3 w-3" />{t(`audit.eventTypes.${event.action}`)}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg font-medium">{event.module}</span>
                            {event.attachments && event.attachments.length > 0 && (
                              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg flex items-center gap-1">
                                <Paperclip className="h-3 w-3" />{event.attachments.length}
                              </span>
                            )}
                            {event.signatureHash && (
                              <span
                                className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg flex items-center gap-1 font-semibold shadow-sm"
                                title={t('audit.approvalFingerprint', "Empreinte d'approbation")}
                              >
                                <Lock className="h-3 w-3" />{t('audit.fingerprintBadge', 'Empreinte')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
                            <span>{formatDate(event.timestamp)}</span>
                            <Eye className="h-3.5 w-3.5 text-gray-300" />
                          </div>
                        </div>

                        <p className="text-sm text-gray-800 mt-2">{event.description}</p>

                        {(event.oldValue || event.newValue) && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {event.oldValue && <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-lg font-mono line-through opacity-70">{event.oldValue}</span>}
                            {event.oldValue && event.newValue && <ArrowRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />}
                            {event.newValue && <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-lg font-mono">{event.newValue}</span>}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                          <div className={`w-6 h-6 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                            {initials}
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{event.user}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-400">{event.userRole}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <code className="text-xs text-gray-300 font-mono">{event.hash ? event.hash.substring(0, 16) + '…' : '—'}</code>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}
          </div>
        )}

        {/* ── Historique versions ── */}
        {tab === 'versions' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-base font-bold text-gray-900 mb-2">{t('audit.versioningTitle')}</h2>
              <p className="text-sm text-gray-500">{t('audit.versioningDesc')}</p>
            </div>

            <div className="space-y-4">
              {events.filter(e => e.action === 'UPDATE' || e.action === 'CALCULATE').map(event => {
                const cfg = getActionCfg(event.action);
                const ActionIcon = cfg.icon;
                return (
                  <div key={event.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                        <ActionIcon className="h-3.5 w-3.5" />{t(`audit.eventTypes.${event.action}`)}
                      </span>
                      <span className="text-sm font-bold text-gray-900">{event.entity} — {event.entityId}</span>
                      <span className="text-xs text-gray-400 ml-auto">{formatDate(event.timestamp)}</span>
                    </div>

                    <p className="text-sm text-gray-700 mb-4">{event.description}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {event.oldValue && (
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-red-400" />
                            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">{t('audit.previousVersion')}</span>
                          </div>
                          <p className="text-sm font-mono text-red-800">{event.oldValue}</p>
                        </div>
                      )}
                      {event.newValue && (
                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-xs font-bold text-green-600 uppercase tracking-wider">{t('audit.currentVersion')}</span>
                          </div>
                          <p className="text-sm font-mono text-green-800">{event.newValue}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                      <div className={`w-6 h-6 rounded-full ${getUserColor[event.user] || 'bg-gray-400'} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {userInitials(event.user)}
                      </div>
                      <span className="text-xs text-gray-600">{event.user} · {event.userRole}</span>
                      <span className="ml-auto flex items-center gap-1 text-xs text-gray-300 font-mono">
                        <Hash className="h-3 w-3" />{event.hash}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Export & vérification ── */}
        {tab === 'export' && (
          <div className="space-y-8 max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Shield className="h-6 w-6 text-slate-700" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{t('audit.verifyTitle', "Vérifier l'intégrité de la chaîne")}</h2>
                  <p className="text-sm text-gray-500">{t('audit.verifyDesc', "Recalcule les empreintes SHA-256 de toutes les entrées du journal et signale la première rupture éventuelle.")}</p>
                </div>
              </div>
              <button onClick={handleVerify} disabled={verifying}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors">
                <RefreshCw className={`h-4 w-4 ${verifying ? 'animate-spin' : ''}`} />
                {verifying ? t('audit.verifying', 'Vérification…') : t('audit.verifyRun', 'Lancer la vérification')}
              </button>
              {verifyError && <p className="text-sm text-red-600">{verifyError}</p>}
              {verifyReport && (
                <div className={`rounded-xl border p-4 text-sm ${verifyReport.is_valid ? 'bg-green-50 border-green-200 text-green-800' : verifyReport.checked === 0 ? 'bg-gray-50 border-gray-200 text-gray-700' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <p className="font-semibold">
                    {verifyReport.checked === 0
                      ? t('audit.verifyNone', 'Aucune entrée scellée à vérifier pour le moment.')
                      : verifyReport.is_valid
                        ? t('audit.verifyOk', '{{n}} entrée(s) vérifiée(s) : aucune rupture détectée.', { n: verifyReport.checked })
                        : t('audit.verifyKo', '{{n}} entrée(s) en anomalie sur {{total}}.', { n: verifyReport.invalid, total: verifyReport.checked })}
                  </p>
                  {verifyReport.first_broken_at && (
                    <p className="mt-1">{t('audit.verifyFirstBroken', 'Première rupture : {{date}}', { date: formatDate(verifyReport.first_broken_at) })}</p>
                  )}
                  {verifyReport.unsealed > 0 && (
                    <p className="mt-1">{t('audit.verifyUnsealed', '{{n}} entrée(s) plus anciennes ne sont pas scellées dans la chaîne.', { n: verifyReport.unsealed })}</p>
                  )}
                  {verifyReport.limitations && <p className="mt-2 text-xs opacity-80">{verifyReport.limitations}</p>}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              <h3 className="font-bold text-gray-900">{t('audit.configureExport')}</h3>
              <p className="text-sm text-gray-500">{t('audit.exportDesc', "Exporte le journal (utilisateur, action, valeurs avant/après, adresse IP et empreintes de chaîne). L'export est lui-même tracé dans le journal.")}</p>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">{t('audit.formatLabel')}</label>
                <div className="flex gap-3">
                  {(['csv', 'json'] as const).map(fmt => (
                    <button key={fmt} onClick={() => setExportFormat(fmt)}
                      className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition-colors uppercase ${exportFormat === fmt ? 'bg-slate-800 text-white border-slate-800' : 'border-gray-200 text-gray-600 hover:border-slate-300'}`}>
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">{t('audit.periodLabel')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} aria-label={t('audit.periodFrom', 'Du')} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                  <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} aria-label={t('audit.periodTo', 'Au')} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
                <p className="text-xs text-gray-400 mt-1">{t('audit.periodEmpty', 'Laissez vide pour tout exporter.')}</p>
              </div>

              {exportError && <p className="text-sm text-red-600">{exportError}</p>}
              <button onClick={handleExport} disabled={exporting} className="w-full flex items-center justify-center gap-2 py-4 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-bold rounded-2xl transition-colors text-base">
                <Download className="h-5 w-5" /> {exporting ? t('audit.exporting', 'Export en cours…') : t('audit.generateReport', { format: exportFormat.toUpperCase() })}
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-2">
              <h3 className="font-bold text-gray-900">{t('audit.auditorAccess')}</h3>
              <p className="text-sm text-gray-500">{t('audit.auditorAccessHonest', "Pour donner accès à un auditeur externe, utilisez le Portail Audit CSRD : il reçoit un lien personnel pour commenter le rapport et rendre sa décision.")}</p>
              <a href="/app/audit/preparation" className="inline-block text-sm font-semibold text-emerald-700 hover:underline">{t('audit.openPortal', 'Ouvrir le Portail Audit CSRD')}</a>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
              {t('audit.legalDisclaimer')}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Event detail drawer */}
      {selectedEvent && <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
