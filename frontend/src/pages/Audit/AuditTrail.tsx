import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList, Search, Download, Filter, Eye, CheckCircle,
  XCircle, AlertTriangle, Clock, ChevronDown, ChevronRight,
  FileText, Upload, Trash2, Edit3, Plus, LogIn, Send,
  RefreshCw, Shield, Lock, Hash, Paperclip, Calendar,
  User, Database, ArrowRight, X, Check, Info,
  BookOpen, GitBranch, Star, Stamp,
} from 'lucide-react';

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

// ─── Mock data ────────────────────────────────────────────────────────────────
const EVENTS: AuditEvent[] = [
  { id: 'e001', timestamp: '2026-03-20T09:42:11Z', user: 'Marie Dupont', userRole: 'RSE Manager', action: 'APPROVE', module: 'Validation', entity: 'Indicateur', entityId: 'E1-1', description: 'Approbation de la valeur GHG Scope 1 — T1 2026', oldValue: 'En révision', newValue: 'Approuvé', ipAddress: '192.168.1.45', sessionId: 'ses_8a2f', hash: 'sha256:3e9a1f2b', attachments: ['audit_scope1_q1.pdf'] },
  { id: 'e002', timestamp: '2026-03-20T08:15:33Z', user: 'Jean-Baptiste Moreau', userRole: 'Auditeur', action: 'COMMENT', module: 'Validation', entity: 'Indicateur', entityId: 'S1-3', description: 'Commentaire d\'audit : données absentéisme incomplètes pour le site Lyon', ipAddress: '10.0.2.12', sessionId: 'ses_7c3d', hash: 'sha256:8b4c2e1a', comment: 'Le taux d\'absentéisme ne couvre pas le site de Lyon (180 salariés). Données requises avant clôture.' },
  { id: 'e003', timestamp: '2026-03-19T16:58:02Z', user: 'Sophie Chen', userRole: 'Data Analyst', action: 'UPDATE', module: 'Collecte Données', entity: 'Indicateur', entityId: 'E1-6', description: 'Correction de la valeur Scope 3 — Achats de biens & services', oldValue: '4 280 tCO₂e', newValue: '5 120 tCO₂e (+19.6%)', ipAddress: '192.168.1.88', sessionId: 'ses_4e9b', hash: 'sha256:1f7d3a5c', attachments: ['factures_fournisseurs_q4.xlsx'] },
  { id: 'e004', timestamp: '2026-03-19T14:30:45Z', user: 'Thomas Bernard', userRole: 'Responsable SI', action: 'IMPORT', module: 'Collecte Données', entity: 'Import CSV', entityId: 'imp_382', description: 'Import de 847 lignes — Indicateurs sociaux Q4 2025', oldValue: undefined, newValue: '847 lignes importées, 3 erreurs ignorées', ipAddress: '10.0.1.5', sessionId: 'ses_2b1a', hash: 'sha256:9c5e7f2d', attachments: ['social_indicators_q4_2025.csv'] },
  { id: 'e005', timestamp: '2026-03-19T11:22:18Z', user: 'Marie Dupont', userRole: 'RSE Manager', action: 'SUBMIT', module: 'Validation', entity: 'Rapport', entityId: 'rep_csrd_2025', description: 'Soumission du rapport CSRD 2025 pour validation finale', oldValue: 'Brouillon', newValue: 'Soumis pour approbation', ipAddress: '192.168.1.45', sessionId: 'ses_5f6c', hash: 'sha256:2a8b4d9e' },
  { id: 'e006', timestamp: '2026-03-18T17:45:00Z', user: 'Aurélie Martin', userRole: 'Directrice RSE', action: 'APPROVE', module: 'Rapports', entity: 'Rapport', entityId: 'rep_dpef_2025', description: 'Approbation finale du rapport DPEF 2025', oldValue: 'Soumis', newValue: 'Approuvé — prêt à publier', ipAddress: '192.168.1.2', sessionId: 'ses_1a2b', hash: 'sha256:6e3c1a7f', attachments: ['rapport_dpef_2025_final.pdf', 'signature_direction.pdf'] },
  { id: 'e007', timestamp: '2026-03-18T15:10:55Z', user: 'Sophie Chen', userRole: 'Data Analyst', action: 'CALCULATE', module: 'Calculs Auto', entity: 'Indicateur', entityId: 'G1-4', description: 'Recalcul automatique — Ratio femmes postes direction', oldValue: '28.4%', newValue: '31.2%', ipAddress: '192.168.1.88', sessionId: 'ses_3c4d', hash: 'sha256:7b9e2f4a' },
  { id: 'e008', timestamp: '2026-03-18T09:00:00Z', user: 'Système', userRole: 'Automatique', action: 'CALCULATE', module: 'IA & Automatisation', entity: 'Anomalie', entityId: 'ano_441', description: 'Détection automatique IA — anomalie Scope 2 Q3 vs Q4 (+340%)', oldValue: undefined, newValue: 'Alerte créée — vérification humaine requise', ipAddress: '127.0.0.1', sessionId: 'sys_auto', hash: 'sha256:4d1a8b5c' },
  { id: 'e009', timestamp: '2026-03-17T16:30:22Z', user: 'Jean-Baptiste Moreau', userRole: 'Auditeur', action: 'REJECT', module: 'Validation', entity: 'Indicateur', entityId: 'E2-1', description: 'Rejet — Consommation électricité site Paris manque pièce justificative', oldValue: 'En révision', newValue: 'Rejeté — pièce manquante', ipAddress: '10.0.2.12', sessionId: 'ses_8d9e', hash: 'sha256:5c2e9a1b', comment: 'La facture électricité EDF Q4 n\'est pas jointe. Merci de télécharger le justificatif.' },
  { id: 'e010', timestamp: '2026-03-17T14:15:08Z', user: 'Thomas Bernard', userRole: 'Responsable SI', action: 'CREATE', module: 'Gestion Données', entity: 'Indicateur', entityId: 'S2-8', description: 'Création indicateur — Heures de formation par employé 2025', oldValue: undefined, newValue: '0 h (valeur initiale)', ipAddress: '10.0.1.5', sessionId: 'ses_6f7a', hash: 'sha256:1e4c8b3d' },
  { id: 'e011', timestamp: '2026-03-17T10:42:33Z', user: 'Marie Dupont', userRole: 'RSE Manager', action: 'ATTACH', module: 'Pilotage ESG', entity: 'Indicateur', entityId: 'E1-2', description: 'Ajout pièce justificative — Facture gaz naturel Q4 2025', ipAddress: '192.168.1.45', sessionId: 'ses_9a1b', hash: 'sha256:3f7d2c9e', attachments: ['facture_gaz_q4_2025.pdf'] },
  { id: 'e012', timestamp: '2026-03-16T15:55:17Z', user: 'Aurélie Martin', userRole: 'Directrice RSE', action: 'PUBLISH', module: 'Rapports', entity: 'Rapport', entityId: 'rep_materiality_2025', description: 'Publication de la matrice de matérialité 2025 — accès parties prenantes', oldValue: 'Interne', newValue: 'Publié', ipAddress: '192.168.1.2', sessionId: 'ses_7b8c', hash: 'sha256:9d5f1a2e', attachments: ['matrice_materialite_2025.pdf'] },
  { id: 'e013', timestamp: '2026-03-16T11:20:44Z', user: 'Sophie Chen', userRole: 'Data Analyst', action: 'UPDATE', module: 'Supply Chain', entity: 'Fournisseur', entityId: 'TextileCo Asia', description: 'Mise à jour score ESG fournisseur — suite audit social tiers', oldValue: 'Score : 28/100', newValue: 'Score : 34/100 (+6 points)', ipAddress: '192.168.1.88', sessionId: 'ses_2c3d', hash: 'sha256:6a4b8f1c', attachments: ['audit_social_textileco_2026.pdf'] },
  { id: 'e014', timestamp: '2026-03-15T17:00:00Z', user: 'Système', userRole: 'Automatique', action: 'EXPORT', module: 'Rapports', entity: 'Export', entityId: 'exp_785', description: 'Export automatique mensuel — données ESG vers système BI', ipAddress: '127.0.0.1', sessionId: 'sys_auto', hash: 'sha256:2e7c4a9b' },
  { id: 'e015', timestamp: '2026-03-15T09:15:30Z', user: 'Jean-Baptiste Moreau', userRole: 'Auditeur', action: 'LOGIN', module: 'Authentification', entity: 'Session', entityId: 'ses_4f5e', description: 'Connexion auditeur externe — début de la revue trimestrielle Q4 2025', ipAddress: '82.65.114.32', sessionId: 'ses_4f5e', hash: 'sha256:8c1d5b3f' },
  { id: 'e016', timestamp: '2026-03-14T16:40:12Z', user: 'Thomas Bernard', userRole: 'Responsable SI', action: 'DELETE', module: 'Gestion Données', entity: 'Indicateur', entityId: 'E1-temp', description: 'Suppression valeur temporaire de test — non conforme', oldValue: '999 tCO₂e (test)', newValue: 'Supprimé', ipAddress: '10.0.1.5', sessionId: 'ses_3a4b', hash: 'sha256:4f2d6c8a' },
  { id: 'e017', timestamp: '2026-03-14T11:30:00Z', user: 'Marie Dupont', userRole: 'RSE Manager', action: 'UPDATE', module: 'Matérialité', entity: 'Enjeu', entityId: 'mat_biodiv', description: 'Mise à jour importance enjeu Biodiversité — suite workshop parties prenantes', oldValue: 'Impact financier : 3.2 / Importance parties prenantes : 2.8', newValue: 'Impact financier : 4.1 / Importance parties prenantes : 4.5', ipAddress: '192.168.1.45', sessionId: 'ses_6e7f', hash: 'sha256:7b3a1d5c', attachments: ['compte_rendu_workshop_materialite.pdf'] },
  { id: 'e018', timestamp: '2026-03-13T14:22:05Z', user: 'Aurélie Martin', userRole: 'Directrice RSE', action: 'APPROVE', module: 'Décarbonation', entity: 'Plan action', entityId: 'act_enr_01', description: 'Validation budget plan de décarbonation — passage EnR 1 800 tCO₂e/an', oldValue: 'Proposé', newValue: 'Approuvé — budget 5k€ alloué', ipAddress: '192.168.1.2', sessionId: 'ses_5c6d', hash: 'sha256:1c4e8a2f' },
];

const DOCUMENTS: Document[] = [
  { id: 'd1', name: 'Facture gaz naturel Q4 2025.pdf', type: 'PDF', size: '1.2 Mo', uploadedBy: 'Marie Dupont', uploadedAt: '2026-03-17', linkedEntity: 'Indicateur E1-2', linkedModule: 'Pilotage ESG', status: 'Validé', hash: 'sha256:3f7d2c9e' },
  { id: 'd2', name: 'Factures fournisseurs Q4 — Scope 3.xlsx', type: 'Excel', size: '4.8 Mo', uploadedBy: 'Sophie Chen', uploadedAt: '2026-03-19', linkedEntity: 'Indicateur E1-6', linkedModule: 'Collecte Données', status: 'Validé', hash: 'sha256:1f7d3a5c' },
  { id: 'd3', name: 'Audit social TextileCo Asia 2026.pdf', type: 'PDF', size: '3.1 Mo', uploadedBy: 'Sophie Chen', uploadedAt: '2026-03-16', linkedEntity: 'Fournisseur TextileCo', linkedModule: 'Supply Chain', status: 'Validé', hash: 'sha256:6a4b8f1c' },
  { id: 'd4', name: 'Rapport DPEF 2025 — version finale.pdf', type: 'PDF', size: '8.4 Mo', uploadedBy: 'Aurélie Martin', uploadedAt: '2026-03-18', linkedEntity: 'Rapport DPEF 2025', linkedModule: 'Rapports', status: 'Validé', hash: 'sha256:6e3c1a7f' },
  { id: 'd5', name: 'Compte-rendu workshop matérialité.pdf', type: 'PDF', size: '2.2 Mo', uploadedBy: 'Marie Dupont', uploadedAt: '2026-03-14', linkedEntity: 'Matrice matérialité', linkedModule: 'Matérialité', status: 'Validé', hash: 'sha256:7b3a1d5c' },
  { id: 'd6', name: 'Indicateurs sociaux Q4 2025.csv', type: 'CSV', size: '0.6 Mo', uploadedBy: 'Thomas Bernard', uploadedAt: '2026-03-19', linkedEntity: 'Import #382', linkedModule: 'Collecte Données', status: 'Validé', hash: 'sha256:9c5e7f2d' },
  { id: 'd7', name: 'Facture électricité EDF Q4 2025.pdf', type: 'PDF', size: '0.9 Mo', uploadedBy: undefined as any, uploadedAt: '—', linkedEntity: 'Indicateur E2-1', linkedModule: 'Pilotage ESG', status: 'En attente', hash: '—' },
  { id: 'd8', name: 'Signature direction — DPEF 2025.pdf', type: 'PDF', size: '0.3 Mo', uploadedBy: 'Aurélie Martin', uploadedAt: '2026-03-18', linkedEntity: 'Rapport DPEF 2025', linkedModule: 'Rapports', status: 'Validé', hash: 'sha256:2a8b4d9e' },
  { id: 'd9', name: 'Certificat ISO 14001 — GreenPack.pdf', type: 'PDF', size: '1.8 Mo', uploadedBy: 'Sophie Chen', uploadedAt: '2026-03-12', linkedEntity: 'Fournisseur GreenPack', linkedModule: 'Supply Chain', status: 'Validé', hash: 'sha256:5c2e9a1b' },
];

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
const USERS = ['Tous', 'Marie Dupont', 'Jean-Baptiste Moreau', 'Sophie Chen', 'Thomas Bernard', 'Aurélie Martin', 'Système'];

function formatDate(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function userInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const USER_COLORS: Record<string, string> = {
  'Marie Dupont': 'bg-violet-500',
  'Jean-Baptiste Moreau': 'bg-blue-500',
  'Sophie Chen': 'bg-emerald-500',
  'Thomas Bernard': 'bg-orange-500',
  'Aurélie Martin': 'bg-pink-500',
  'Système': 'bg-slate-400',
};

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
            <code className="text-xs text-slate-300 font-mono break-all">{event.hash}:{event.entityId}:{event.timestamp}</code>
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

  // KPIs
  const totalEvents = EVENTS.length;
  const todayEvents = EVENTS.filter(e => e.timestamp.startsWith('2026-03-20')).length;
  const modifyEvents = EVENTS.filter(e => ['CREATE', 'UPDATE', 'DELETE'].includes(e.action)).length;
  const approvalEvents = EVENTS.filter(e => ['APPROVE', 'REJECT'].includes(e.action)).length;
  const docCount = DOCUMENTS.filter(d => d.status === 'Validé').length;
  const pendingDocs = DOCUMENTS.filter(d => d.status === 'En attente').length;

  const filtered = useMemo(() => EVENTS.filter(e => {
    if (moduleFilter !== 'Tous' && e.module !== moduleFilter) return false;
    if (actionFilter !== 'Tous' && e.action !== actionFilter) return false;
    if (userFilter !== 'Tous' && e.user !== userFilter) return false;
    if (search && !e.description.toLowerCase().includes(search.toLowerCase()) &&
        !e.user.toLowerCase().includes(search.toLowerCase()) &&
        !e.entity.toLowerCase().includes(search.toLowerCase()) &&
        !e.entityId.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [moduleFilter, actionFilter, userFilter, search]);

  const filteredDocs = useMemo(() => DOCUMENTS.filter(d =>
    !docSearch || d.name.toLowerCase().includes(docSearch.toLowerCase()) ||
    d.linkedEntity.toLowerCase().includes(docSearch.toLowerCase())
  ), [docSearch]);

  const handleExport = () => {
    setExportDone(true);
    setTimeout(() => setExportDone(false), 3000);
  };

  const tabs = [
    { id: 'journal' as TabId, label: `${t('audit.tabs.journal')} (${EVENTS.length})` },
    { id: 'versions' as TabId, label: t('audit.tabs.versions') },
    { id: 'documents' as TabId, label: `${t('audit.tabs.documents')} (${DOCUMENTS.length})` },
    { id: 'export' as TabId, label: t('audit.tabs.export') },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('audit.title')}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{t('audit.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-xl text-xs font-semibold text-green-700">
              <Lock className="h-3.5 w-3.5" />
              {t('audit.integrityVerified')}
            </div>
            <button onClick={() => setTab('export')} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
              <Download className="h-4 w-4" /> {t('audit.exportForAudit')}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-7xl mx-auto flex gap-0">
          {tabs.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`px-5 py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === tb.id ? 'border-slate-700 text-slate-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

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
                      {USERS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-400">{t('audit.eventCount', { count: filtered.length })}</div>

            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-2">
                {filtered.map((event) => {
                  const cfg = ACTION_CFG[event.action];
                  const ActionIcon = cfg.icon;
                  const initials = userInitials(event.user);
                  const avatarColor = USER_COLORS[event.user] || 'bg-gray-400';
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
                          <code className="text-xs text-gray-300 font-mono">{event.hash.substring(0, 16)}…</code>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
              {EVENTS.filter(e => e.action === 'UPDATE' || e.action === 'CALCULATE').map(event => {
                const cfg = ACTION_CFG[event.action];
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
                      <div className={`w-6 h-6 rounded-full ${USER_COLORS[event.user] || 'bg-gray-400'} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
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
            <div className="border-2 border-dashed border-gray-300 hover:border-slate-400 transition-colors rounded-2xl p-8 text-center bg-white cursor-pointer">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">{t('audit.dropDocuments')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('audit.dropDocumentsFormats')}</p>
              <button className="mt-3 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 transition-colors">
                {t('audit.chooseFiles')}
              </button>
            </div>

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
                          <button className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors" title="Télécharger">
                            <Download className="h-3.5 w-3.5 text-blue-600" />
                          </button>
                          {doc.status === 'En attente' && (
                            <button className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors" title="Télécharger">
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
                  <p className="text-sm text-gray-500">Conforme aux exigences d'assurance limitée CSRD et aux normes ISAE 3000 / ISAE 3410</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: t('audit.miniStatEvents'), val: EVENTS.length, icon: ClipboardList, color: 'text-slate-700', bg: 'bg-slate-50' },
                  { label: t('audit.miniStatDocuments'), val: DOCUMENTS.filter(d => d.status === 'Validé').length, icon: FileText, color: 'text-indigo-700', bg: 'bg-indigo-50' },
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
              La piste d'audit ESGFlow est conforme aux exigences de traçabilité de la directive CSRD (art. 19a/29a), aux normes d'assurance ISAE 3000 et ISAE 3410, et aux bonnes pratiques ICAEW pour la vérification extra-financière. Chaque événement est horodaté, hashé (SHA-256) et non modifiable.
            </div>
          </div>
        )}
      </div>

      {/* Event detail drawer */}
      {selectedEvent && <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
