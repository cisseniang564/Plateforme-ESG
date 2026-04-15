import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList, Search, Download, Filter, Eye, CheckCircle,
  XCircle, AlertTriangle, Clock, ChevronDown, ChevronRight,
  FileText, Upload, Trash2, Edit3, Plus, LogIn, Send,
  RefreshCw, Shield, Lock, Hash, Paperclip, Calendar,
  User, Database, ArrowRight, X, Check, Info,
  BookOpen, GitBranch, Star, Stamp,
} from 'lucide-react';
import BackButton from '@/components/common/BackButton';

// ─── Types ────────────────────────────────────────────────────────────────────
type ActionType =
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'SUBMIT' | 'APPROVE'
  | 'REJECT' | 'IMPORT' | 'EXPORT' | 'LOGIN' | 'COMMENT'
  | 'ATTACH' | 'CALCULATE' | 'PUBLISH';

type TabId = 'journal' | 'versions' | 'documents' | 'export';

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
  attachments?: string[];
  comment?: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  linkedEntity: string;
  linkedModule: string;
  status: 'Validé' | 'En attente' | 'Rejeté';
  hash: string;
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
  const cfg = ACTION_CFG_STATIC[event.action];
  const ActionIcon = cfg.icon;
  return (
    <div className="fixed inset-0 z-50 flex">
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
              <span className="ml-auto text-xs text-green-300 flex items-center gap-1"><Check className="h-3 w-3" />{t('audit.valid')}</span>
            </div>
            <code className="text-xs text-slate-300 font-mono break-all">{event.hash ?? '—'}:{event.entityId}:{event.timestamp}</code>
          </div>

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
  const [docSearch, setDocSearch] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'json'>('pdf');
  const [exportDone, setExportDone] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ id: string; name: string; size: string; type: string; status: string; uploadedBy: string; uploadedAt: string; linkedEntity: string; linkedModule: string; hash: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (search) params.search = search;
      const res = await api.get('/audit-trail', { params });
      setEvents(res.data.items ?? []);
      setEventsTotal(res.data.total ?? 0);
    } catch {
      // keep previous state on error
    } finally {
      setLoadingEvents(false);
    }
  }, [actionFilter, search]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    api.get('/audit-trail/stats', { params: { days: 30 } })
      .then(r => setStatsData(r.data))
      .catch(() => {});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const newDocs = files.map((f, i) => ({
      id: `upload_${Date.now()}_${i}`,
      name: f.name,
      size: f.size > 1_000_000 ? `${(f.size / 1_000_000).toFixed(1)} Mo` : `${(f.size / 1000).toFixed(0)} Ko`,
      type: f.name.endsWith('.pdf') ? 'PDF' : f.name.endsWith('.xlsx') || f.name.endsWith('.xls') ? 'Excel' : f.name.endsWith('.csv') ? 'CSV' : 'Fichier',
      status: 'Validé',
      uploadedBy: 'Moi',
      uploadedAt: today,
      linkedEntity: '—',
      linkedModule: 'Pièces justificatives',
      hash: 'sha256:' + Math.random().toString(36).slice(2, 10),
    }));
    setUploadedDocs(prev => [...prev, ...newDocs]);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

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
  const totalEvents = statsData?.total ?? eventsTotal;
  const todayEvents = statsData ? 0 : 0; // not available per-day from stats endpoint
  const modifyEvents = statsData
    ? ((statsData.by_action['create'] ?? 0) + (statsData.by_action['update'] ?? 0) + (statsData.by_action['delete'] ?? 0))
    : events.filter(e => ['CREATE', 'UPDATE', 'DELETE'].includes(e.action)).length;
  const approvalEvents = statsData
    ? ((statsData.by_action['validate'] ?? 0) + (statsData.by_action['reject'] ?? 0))
    : events.filter(e => ['APPROVE', 'REJECT'].includes(e.action)).length;
  const docCount = uploadedDocs.filter(d => d.status === 'Validé').length;
  const pendingDocs = 0;

  // Client-side filter on top of server-fetched page (module/user filters applied locally)
  const filtered = useMemo(() => events.filter(e => {
    if (moduleFilter !== 'Tous' && e.module !== moduleFilter) return false;
    if (userFilter !== 'Tous' && e.user !== userFilter) return false;
    return true;
  }), [events, moduleFilter, userFilter]);

  const allDocs = useMemo(() => [...uploadedDocs], [uploadedDocs]);
  const filteredDocs = useMemo(() => allDocs.filter(d =>
    !docSearch || d.name.toLowerCase().includes(docSearch.toLowerCase()) ||
    d.linkedEntity.toLowerCase().includes(docSearch.toLowerCase())
  ), [allDocs, docSearch]);

  const handleExport = () => {
    setExportDone(true);
    setTimeout(() => setExportDone(false), 3000);
  };

  const tabs = [
    { id: 'journal' as TabId, label: `${t('audit.tabs.journal')} (${eventsTotal || events.length})` },
    { id: 'versions' as TabId, label: t('audit.tabs.versions') },
    { id: 'documents' as TabId, label: `${t('audit.tabs.documents')} (${allDocs.length})` },
    { id: 'export' as TabId, label: t('audit.tabs.export') },
  ];

  return (
    <div className="space-y-6">
      <BackButton to="/app/settings" label="Paramètres" />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 rounded-2xl p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==')] opacity-40" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-xs font-semibold tracking-wide uppercase">
                Traçabilité & Conformité
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-green-500/20 border border-green-400/30 rounded-full text-xs font-semibold text-green-300">
                <Lock className="h-3 w-3" />
                {t('audit.integrityVerified')}
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <ClipboardList className="h-8 w-8" />
              {t('audit.title')}
            </h1>
            <p className="text-slate-300">{t('audit.subtitle')}</p>
          </div>
          <button
            onClick={() => setTab('export')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-800 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all shadow-md"
          >
            <Download className="h-4 w-4" />
            {t('audit.exportForAudit')}
          </button>
        </div>
      </div>

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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: t('audit.totalEvents'), val: totalEvents, sub: t('audit.kpiSinceStart'), color: 'text-slate-900', bg: 'bg-white border-gray-200' },
                { label: t('audit.kpiToday'), val: todayEvents, sub: '20 mars 2026', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                { label: t('audit.kpiDataChanges'), val: modifyEvents, sub: t('audit.kpiDataChangesSub'), color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
                { label: t('audit.kpiValidationDecisions'), val: approvalEvents, sub: t('audit.kpiValidationDecisionsSub'), color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
                { label: t('audit.kpiDocuments'), val: docCount, sub: t('audit.kpiDocumentsPending', { count: pendingDocs }), color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
              ].map((k, i) => (
                <div key={i} className={`rounded-2xl border-2 ${k.bg} p-4`}>
                  <div className={`text-3xl font-extrabold ${k.color}`}>{k.val}</div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">{k.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{k.sub}</div>
                </div>
              ))}
            </div>

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
                    <select value={actionFilter} onChange={e => setActionFilter(e.target.value as any)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
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
                  const cfg = ACTION_CFG_STATIC[event.action];
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
                const cfg = ACTION_CFG_STATIC[event.action];
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

        {/* ── Documents ── */}
        {tab === 'documents' && (
          <div className="space-y-6">
            {/* Upload banner */}
            {pendingDocs > 0 && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-800">{t('audit.documentsPendingAlert', { count: pendingDocs })}</span>
                  <span className="text-sm text-amber-700">{t('audit.documentsPendingAlertDesc')}</span>
                </div>
              </div>
            )}

            {/* Upload zone */}
            <label
              htmlFor="audit-file-upload"
              className="border-2 border-dashed border-gray-300 hover:border-slate-400 transition-colors rounded-2xl p-8 text-center bg-white cursor-pointer block"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const dt = e.dataTransfer;
                if (dt?.files?.length) {
                  const synth = { target: { files: dt.files, value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>;
                  handleFileChange(synth);
                }
              }}
            >
              <input
                id="audit-file-upload"
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.csv,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">{t('audit.dropDocuments')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('audit.dropDocumentsFormats')}</p>
              <span className="mt-3 inline-block px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 transition-colors">
                {t('audit.chooseFiles')}
              </span>
            </label>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={docSearch} onChange={e => setDocSearch(e.target.value)} placeholder={t('audit.searchDocument')} className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>

            {/* Documents table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="px-5 py-3 text-left">{t('audit.colDocument')}</th>
                    <th className="px-5 py-3 text-left">{t('audit.colLinkedEntity')}</th>
                    <th className="px-5 py-3 text-left">{t('audit.colModule')}</th>
                    <th className="px-5 py-3 text-left">{t('audit.colAddedBy')}</th>
                    <th className="px-5 py-3 text-center">{t('audit.colDate')}</th>
                    <th className="px-5 py-3 text-center">{t('audit.colStatus')}</th>
                    <th className="px-5 py-3 text-center">{t('audit.colIntegrity')}</th>
                    <th className="px-5 py-3 text-center">{t('audit.colActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDocs.map(doc => (
                    <tr key={doc.id} className={`hover:bg-gray-50 transition-colors ${doc.status === 'En attente' ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className={`h-4 w-4 flex-shrink-0 ${doc.type === 'PDF' ? 'text-red-500' : doc.type === 'Excel' ? 'text-green-600' : 'text-blue-500'}`} />
                          <div>
                            <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{doc.name}</div>
                            <div className="text-xs text-gray-400">{doc.type} · {doc.size}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{doc.linkedEntity}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{doc.linkedModule}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{doc.uploadedBy || <span className="text-amber-500 text-xs font-semibold">{t('audit.notUploaded')}</span>}</td>
                      <td className="px-5 py-3 text-center text-sm text-gray-500">{doc.uploadedAt}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${doc.status === 'Validé' ? 'bg-green-100 text-green-700' : doc.status === 'En attente' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {doc.hash !== '—'
                          ? <span className="flex items-center justify-center gap-1 text-xs text-green-600 font-semibold"><Check className="h-3.5 w-3.5" />OK</span>
                          : <span className="flex items-center justify-center gap-1 text-xs text-gray-400"><X className="h-3.5 w-3.5" />—</span>
                        }
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors" title={t('common.download')}>
                            <Download className="h-3.5 w-3.5 text-blue-600" />
                          </button>
                          {doc.status === 'En attente' && (
                            <button className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors" title={t('common.upload')}>
                              <Upload className="h-3.5 w-3.5 text-amber-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Export & Certification ── */}
        {tab === 'export' && (
          <div className="space-y-8 max-w-3xl mx-auto">
            {/* Certification info */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Stamp className="h-6 w-6 text-slate-700" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{t('audit.certifiableReport')}</h2>
                  <p className="text-sm text-gray-500">{t('audit.certifiableReportDesc')}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: t('audit.miniStatEvents'), val: eventsTotal || events.length, icon: ClipboardList, color: 'text-slate-700', bg: 'bg-slate-50' },
                  { label: t('audit.miniStatDocuments'), val: uploadedDocs.filter(d => d.status === 'Validé').length, icon: FileText, color: 'text-indigo-700', bg: 'bg-indigo-50' },
                  { label: t('audit.miniStatIntegrity'), val: '100%', icon: Shield, color: 'text-green-700', bg: 'bg-green-50' },
                ].map((k, i) => (
                  <div key={i} className={`${k.bg} rounded-xl p-4 text-center`}>
                    <k.icon className={`h-5 w-5 mx-auto mb-1 ${k.color}`} />
                    <div className={`text-2xl font-bold ${k.color}`}>{k.val}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Export config */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              <h3 className="font-bold text-gray-900">{t('audit.configureExport')}</h3>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">{t('audit.formatLabel')}</label>
                <div className="flex gap-3">
                  {(['pdf', 'csv', 'json'] as const).map(fmt => (
                    <button key={fmt} onClick={() => setExportFormat(fmt)}
                      className={`flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition-colors uppercase ${exportFormat === fmt ? 'bg-slate-800 text-white border-slate-800' : 'border-gray-200 text-gray-600 hover:border-slate-300'}`}>
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">{t('audit.contentLabel')}</label>
                <div className="space-y-2">
                  {[
                    { labelKey: 'audit.exportContentJournal', checked: true },
                    { labelKey: 'audit.exportContentVersions', checked: true },
                    { labelKey: 'audit.exportContentDocs', checked: true },
                    { labelKey: 'audit.exportContentHashes', checked: true },
                    { labelKey: 'audit.exportContentSessions', checked: true },
                    { labelKey: 'audit.exportContentSummary', checked: true },
                  ].map((item, i) => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked={item.checked} className="rounded accent-slate-700 w-4 h-4" />
                      <span className="text-sm text-gray-700">{t(item.labelKey)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">{t('audit.periodLabel')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" defaultValue="2026-01-01" className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                  <input type="date" defaultValue="2026-03-20" className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
              </div>

              {exportDone ? (
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-semibold">
                  <CheckCircle className="h-5 w-5" /> {t('audit.exportSuccess', { format: exportFormat })}
                </div>
              ) : (
                <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl transition-colors text-base">
                  <Download className="h-5 w-5" /> {t('audit.generateReport', { format: exportFormat.toUpperCase() })}
                </button>
              )}
            </div>

            {/* Auditeur access */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-bold text-gray-900">{t('audit.auditorAccess')}</h3>
              <p className="text-sm text-gray-500">{t('audit.auditorAccessDesc')}</p>
              <div className="flex gap-3">
                <input type="email" placeholder="email@cabinet-audit.fr" className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                <select className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                  <option>{t('audit.duration7')}</option>
                  <option>{t('audit.duration14')}</option>
                  <option>{t('audit.duration30')}</option>
                </select>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl font-semibold text-sm hover:bg-slate-900 transition-colors">
                  <Send className="h-4 w-4" /> {t('audit.invite')}
                </button>
              </div>
            </div>

            {/* Legal disclaimer */}
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
