/**
 * Stakeholder Engagement — Sondages de double matérialité CSRD (ESRS 2)
 * Crée des sondages, partage des liens uniques, agrège les réponses en carte thermique.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Copy, CheckCircle, BarChart3, Grid3X3, Send, X, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import PageHero, { PageHeroPrimaryButton } from '@/components/layout/PageHero';
import { useTranslation, Trans } from 'react-i18next';
import type { TFunction } from 'i18next';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MaterialityTopic {
  id: string;
  code: string;
  name: string;
  pillar: 'E' | 'S' | 'G';
}

interface StakeholderContact {
  id: string;
  name: string;
  email: string;
  organization: string;
  category: 'employee' | 'client' | 'supplier' | 'investor' | 'ngo' | 'regulator' | 'other';
}

interface SurveyResponse {
  id: string;
  stakeholder_name: string;
  stakeholder_category: string;
  submitted_at: string;
  ratings: Record<string, { impact: number; financial: number }>;
}

interface Survey {
  id: string;
  name: string;
  description: string;
  topics: string[];
  stakeholders: StakeholderContact[];
  status: 'draft' | 'active' | 'closed';
  created_at: string;
  responses: SurveyResponse[];
  token: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const getTopics = (t: TFunction): MaterialityTopic[] => [
  { id: 'E1', code: 'E1', name: t('sse.topic.E1', 'Changement climatique'), pillar: 'E' },
  { id: 'E2', code: 'E2', name: t('sse.topic.E2', 'Pollution'), pillar: 'E' },
  { id: 'E3', code: 'E3', name: t('sse.topic.E3', 'Eau et ressources marines'), pillar: 'E' },
  { id: 'E4', code: 'E4', name: t('sse.topic.E4', 'Biodiversité et écosystèmes'), pillar: 'E' },
  { id: 'E5', code: 'E5', name: t('sse.topic.E5', 'Utilisation des ressources et économie circulaire'), pillar: 'E' },
  { id: 'S1', code: 'S1', name: t('sse.topic.S1', 'Effectifs propres'), pillar: 'S' },
  { id: 'S2', code: 'S2', name: t('sse.topic.S2', 'Travailleurs chaîne de valeur'), pillar: 'S' },
  { id: 'S3', code: 'S3', name: t('sse.topic.S3', 'Communautés affectées'), pillar: 'S' },
  { id: 'S4', code: 'S4', name: t('sse.topic.S4', 'Consommateurs et utilisateurs finaux'), pillar: 'S' },
  { id: 'G1', code: 'G1', name: t('sse.topic.G1', 'Conduite des affaires'), pillar: 'G' },
];

const getCategoryLabels = (t: TFunction): Record<StakeholderContact['category'], string> => ({
  employee: t('sse.cat.employee', 'Employé'),
  client: t('sse.cat.client', 'Client'),
  supplier: t('sse.cat.supplier', 'Fournisseur'),
  investor: t('sse.cat.investor', 'Investisseur'),
  ngo: t('sse.cat.ngo', 'ONG'),
  regulator: t('sse.cat.regulator', 'Régulateur'),
  other: t('sse.cat.other', 'Autre'),
});

const STORAGE_KEY = 'stakeholder_surveys';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomHex(len: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, len);
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildDemoSurvey(): Survey {
  const demoTopics = ['E1', 'E2', 'S1', 'G1'];
  const responses: SurveyResponse[] = ['Alice Martin', 'Bruno Silva', 'Claire Dupont'].map(
    (name, i) => ({
      id: `resp-${i}`,
      stakeholder_name: name,
      stakeholder_category: (['employee', 'investor', 'client'] as const)[i],
      submitted_at: new Date(Date.now() - i * 86400000).toISOString(),
      ratings: Object.fromEntries(
        demoTopics.map((t) => [t, { impact: randomBetween(2, 5), financial: randomBetween(2, 5) }])
      ),
    })
  );
  return {
    id: 'demo-1',
    name: 'Consultation parties prenantes 2025',
    description: 'Sondage annuel de double matérialité pour le rapport CSRD.',
    topics: demoTopics,
    stakeholders: [
      { id: 'sh-1', name: 'Alice Martin', email: 'alice@example.com', organization: 'Interne', category: 'employee' },
      { id: 'sh-2', name: 'Bruno Silva', email: 'bruno@fund.io', organization: 'GreenFund', category: 'investor' },
      { id: 'sh-3', name: 'Claire Dupont', email: 'claire@client.fr', organization: 'ClientCo', category: 'client' },
    ],
    status: 'active',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    responses,
    token: randomHex(16),
  };
}

function loadFromStorage(): Survey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Survey[];
  } catch (_) { /* ignore */ }
  return [];
}

function saveToStorage(surveys: Survey[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys));
  } catch (_) { /* ignore */ }
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

function aggregateResults(survey: Survey): Record<string, { impact: number; financial: number; count: number }> {
  const acc: Record<string, { impactSum: number; financialSum: number; count: number }> = {};
  for (const topic of survey.topics) {
    acc[topic] = { impactSum: 0, financialSum: 0, count: 0 };
  }
  for (const resp of survey.responses) {
    for (const [topicId, rating] of Object.entries(resp.ratings)) {
      if (acc[topicId]) {
        acc[topicId].impactSum += rating.impact;
        acc[topicId].financialSum += rating.financial;
        acc[topicId].count += 1;
      }
    }
  }
  return Object.fromEntries(
    Object.entries(acc).map(([id, { impactSum, financialSum, count }]) => [
      id,
      {
        impact: count > 0 ? Math.round((impactSum / count) * 10) / 10 : 0,
        financial: count > 0 ? Math.round((financialSum / count) * 10) / 10 : 0,
        count,
      },
    ])
  );
}

// ─── Pillar styling ───────────────────────────────────────────────────────────

const PILLAR_COLORS: Record<string, { dot: string; badge: string; text: string }> = {
  E: { dot: '#10b981', badge: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-700' },
  S: { dot: '#3b82f6', badge: 'bg-blue-100 text-blue-700', text: 'text-blue-700' },
  G: { dot: '#7c3aed', badge: 'bg-violet-100 text-violet-700', text: 'text-violet-700' },
};

// ─── Heat Map SVG ─────────────────────────────────────────────────────────────

interface HeatMapPoint {
  topicId: string;
  name: string;
  pillar: 'E' | 'S' | 'G';
  impact: number;
  financial: number;
}

function HeatMap({ points }: { points: HeatMapPoint[] }) {
  const { t } = useTranslation();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; point: HeatMapPoint } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Map 1-5 to SVG coords in a 400x300 viewBox with 40px margin each side
  const PAD = 40;
  const W = 400 - PAD * 2; // 320
  const H = 300 - PAD * 2; // 220

  const toSvgX = (v: number) => PAD + ((v - 1) / 4) * W;
  const toSvgY = (v: number) => PAD + H - ((v - 1) / 4) * H; // invert Y

  const midX = toSvgX(3);
  const midY = toSvgY(3);

  const QUADRANT_LABELS = [
    { x: midX + (400 - PAD - midX) / 2, y: PAD + (midY - PAD) / 2, label: t('sse.quadrant.double', 'Doublement matériel'), color: '#ef4444' },
    { x: PAD + (midX - PAD) / 2, y: PAD + (midY - PAD) / 2, label: t('sse.quadrant.financial', 'Mat. financière'), color: '#f97316' },
    { x: midX + (400 - PAD - midX) / 2, y: midY + (PAD + H - midY) / 2, label: t('sse.quadrant.impact', "Mat. d'impact"), color: '#3b82f6' },
    { x: PAD + (midX - PAD) / 2, y: midY + (PAD + H - midY) / 2, label: t('sse.quadrant.none', 'Non matériel'), color: '#9ca3af' },
  ];

  return (
    <div className="relative w-full" style={{ maxWidth: 540 }}>
      <svg
        ref={svgRef}
        viewBox="0 0 400 300"
        width="100%"
        className="block"
        style={{ userSelect: 'none' }}
      >
        {/* Quadrant backgrounds */}
        <rect x={midX} y={PAD} width={400 - PAD - midX} height={midY - PAD} fill="#fee2e2" opacity="0.4" rx="2" />
        <rect x={PAD} y={PAD} width={midX - PAD} height={midY - PAD} fill="#ffedd5" opacity="0.4" rx="2" />
        <rect x={midX} y={midY} width={400 - PAD - midX} height={PAD + H - midY} fill="#dbeafe" opacity="0.4" rx="2" />
        <rect x={PAD} y={midY} width={midX - PAD} height={PAD + H - midY} fill="#f3f4f6" opacity="0.4" rx="2" />

        {/* Grid lines */}
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={toSvgX(v)} y1={PAD} x2={toSvgX(v)} y2={PAD + H} stroke="#e5e7eb" strokeWidth="0.5" />
            <line x1={PAD} y1={toSvgY(v)} x2={PAD + W} y2={toSvgY(v)} stroke="#e5e7eb" strokeWidth="0.5" />
          </g>
        ))}

        {/* Quadrant dividers */}
        <line x1={midX} y1={PAD} x2={midX} y2={PAD + H} stroke="#6b7280" strokeWidth="1.5" strokeDasharray="6 3" />
        <line x1={PAD} y1={midY} x2={PAD + W} y2={midY} stroke="#6b7280" strokeWidth="1.5" strokeDasharray="6 3" />

        {/* Quadrant labels */}
        {QUADRANT_LABELS.map((q) => (
          <text
            key={q.label}
            x={q.x}
            y={q.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="7.5"
            fill={q.color}
            fontWeight="600"
            opacity="0.85"
          >
            {q.label}
          </text>
        ))}

        {/* Axis labels */}
        <text x={PAD + W / 2} y={296} textAnchor="middle" fontSize="8" fill="#6b7280" fontWeight="500">
          {t('sse.axis.impact', "Matérialité d'impact →")}
        </text>
        <text
          x={10}
          y={PAD + H / 2}
          textAnchor="middle"
          fontSize="8"
          fill="#6b7280"
          fontWeight="500"
          transform={`rotate(-90 10 ${PAD + H / 2})`}
        >
          {t('sse.axis.financial', 'Matérialité financière →')}
        </text>

        {/* Axis tick numbers */}
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <text x={toSvgX(v)} y={PAD + H + 8} textAnchor="middle" fontSize="7" fill="#9ca3af">{v}</text>
            <text x={PAD - 6} y={toSvgY(v)} textAnchor="end" dominantBaseline="middle" fontSize="7" fill="#9ca3af">{v}</text>
          </g>
        ))}

        {/* Data points */}
        {points.map((p) => {
          const cx = toSvgX(p.impact);
          const cy = toSvgY(p.financial);
          const color = PILLAR_COLORS[p.pillar].dot;
          return (
            <g
              key={p.topicId}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setTooltip({ x: cx, y: cy, point: p })}
              onMouseLeave={() => setTooltip(null)}
            >
              <circle cx={cx} cy={cy} r="9" fill={color} opacity="0.15" />
              <circle cx={cx} cy={cy} r="5.5" fill={color} stroke="#fff" strokeWidth="1.5" />
              <text x={cx + 8} y={cy + 1} fontSize="7" fill={color} fontWeight="700" dominantBaseline="middle">
                {p.topicId}
              </text>
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (() => {
          const tx = Math.min(tooltip.x + 12, 320);
          const ty = Math.max(tooltip.y - 28, PAD);
          return (
            <g>
              <rect x={tx} y={ty} width={110} height={38} rx="4" fill="#1e1b4b" opacity="0.95" />
              <text x={tx + 6} y={ty + 12} fontSize="8" fill="#fff" fontWeight="700">{tooltip.point.topicId} — {tooltip.point.name.slice(0, 20)}</text>
              <text x={tx + 6} y={ty + 23} fontSize="7.5" fill="#c7d2fe">{t('sse.tooltip.values', 'Impact: {{i}} · Financier: {{f}}', { i: tooltip.point.impact, f: tooltip.point.financial })}</text>
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      <div className="flex gap-4 justify-center mt-2 flex-wrap text-xs text-gray-600">
        {(['E', 'S', 'G'] as const).map((p) => (
          <span key={p} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: PILLAR_COLORS[p].dot }} />
            {t('sse.legend.pillar', 'Pilier {{p}}', { p })}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Create Survey Modal ──────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onCreate: (survey: Survey) => void;
}

function CreateSurveyModal({ onClose, onCreate }: CreateModalProps) {
  const { t } = useTranslation();
  const TOPICS = getTopics(t);
  const CATEGORY_LABELS = getCategoryLabels(t);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [contacts, setContacts] = useState<Array<{ name: string; email: string; organization: string; category: StakeholderContact['category'] }>>([
    { name: '', email: '', organization: '', category: 'employee' },
  ]);
  const [saving, setSaving] = useState(false);

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  };

  const addContact = () => {
    setContacts((prev) => [...prev, { name: '', email: '', organization: '', category: 'employee' }]);
  };

  const updateContact = (i: number, field: string, value: string) => {
    setContacts((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const removeContact = (i: number) => {
    setContacts((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error(t('sse.toast.nameRequired', 'Le nom du sondage est requis.')); return; }
    if (selectedTopics.length === 0) { toast.error(t('sse.toast.topicRequired', 'Sélectionnez au moins un thème.')); return; }

    setSaving(true);
    const stakeholders: StakeholderContact[] = contacts
      .filter((c) => c.name.trim() && c.email.trim())
      .map((c, i) => ({ id: `sh-${Date.now()}-${i}`, ...c }));

    const survey: Survey = {
      id: `survey-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      topics: selectedTopics,
      stakeholders,
      status: 'draft',
      created_at: new Date().toISOString(),
      responses: [],
      token: randomHex(16),
    };

    try {
      // New API returns the persisted survey with its server-side id + public_token
      const res = await api.post<any>('/stakeholder-surveys', {
        name: survey.name,
        description: survey.description,
        topics: survey.topics,
        template_type: 'custom',
        expires_in_days: 30,
        stakeholders: stakeholders.map((s) => ({
          name: s.name,
          email: s.email,
          organization: s.organization,
          category: s.category,
        })),
      });
      // Override local id / token with server values when available
      if (res.data?.id) {
        survey.id = res.data.id;
        if (res.data.public_token) survey.token = res.data.public_token;
        if (res.data.status) survey.status = res.data.status;
      }
    } catch (_) { /* silent fallback to local state */ }

    setSaving(false);
    onCreate(survey);
    toast.success(t('sse.toast.created', 'Sondage créé avec succès.'));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('sse.modal.title', 'Nouveau sondage de matérialité')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('sse.modal.subtitle', 'Un lien unique sera généré automatiquement')}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Basic info */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('sse.field.name', 'Nom du sondage *')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('sse.ph.name', 'Ex: Consultation parties prenantes 2025')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder={t('sse.ph.description', 'Objectif et contexte du sondage…')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>

          {/* Topic selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('sse.field.topics', 'Thèmes ESRS à évaluer *')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TOPICS.map((t) => {
                const selected = selectedTopics.includes(t.id);
                const style = PILLAR_COLORS[t.pillar];
                return (
                  <label
                    key={t.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                      selected ? `border-indigo-400 bg-indigo-50` : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleTopic(t.id)}
                      className="accent-indigo-600"
                    />
                    <span className={`font-semibold text-xs px-1.5 py-0.5 rounded ${style.badge}`}>{t.code}</span>
                    <span className={selected ? 'text-indigo-800' : 'text-gray-700'}>{t.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Stakeholder contacts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">{t('sse.field.stakeholders', 'Parties prenantes')}</label>
              <button
                onClick={addContact}
                className="flex items-center gap-1 text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
              >
                <Plus size={13} /> {t('sse.btn.add', 'Ajouter')}
              </button>
            </div>
            <div className="space-y-2">
              {contacts.map((c, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start bg-gray-50 rounded-lg px-3 py-2">
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => updateContact(i, 'name', e.target.value)}
                    placeholder={t('sse.ph.contactName', 'Nom')}
                    className="col-span-3 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                  />
                  <input
                    type="email"
                    value={c.email}
                    onChange={(e) => updateContact(i, 'email', e.target.value)}
                    placeholder="Email"
                    className="col-span-4 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                  />
                  <input
                    type="text"
                    value={c.organization}
                    onChange={(e) => updateContact(i, 'organization', e.target.value)}
                    placeholder={t('sse.ph.org', 'Organisation')}
                    className="col-span-3 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                  />
                  <select
                    value={c.category}
                    onChange={(e) => updateContact(i, 'category', e.target.value)}
                    className="col-span-1 border border-gray-200 rounded px-1 py-1 text-xs focus:outline-none bg-white"
                    title={t('sse.title.category', 'Catégorie')}
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeContact(i)}
                    className="col-span-1 flex justify-center items-center text-gray-400 hover:text-red-500 transition-colors"
                    title={t('sse.title.remove', 'Supprimer')}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {t('sse.btn.cancel', 'Annuler')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            <Send size={14} />
            {saving ? t('sse.btn.creating', 'Création…') : t('sse.btn.create', 'Créer le sondage')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Survey Card ──────────────────────────────────────────────────────────────

const getStatusStyles = (t: TFunction): Record<Survey['status'], { label: string; cls: string }> => ({
  draft: { label: t('sse.status.draft', 'Brouillon'), cls: 'bg-gray-100 text-gray-600' },
  active: { label: t('sse.status.active', 'Actif'), cls: 'bg-emerald-100 text-emerald-700' },
  closed: { label: t('sse.status.closed', 'Clôturé'), cls: 'bg-blue-100 text-blue-700' },
});

interface SurveyCardProps {
  survey: Survey;
  onSelect: () => void;
  onClose: () => void;
  onActivate: () => void;
  isSelected: boolean;
}

function SurveyCard({ survey, onSelect, onClose, onActivate, isSelected }: SurveyCardProps) {
  const { t } = useTranslation();
  const STATUS_STYLES = getStatusStyles(t);
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    // Use the new /survey/:token public route (PublicSurvey component)
    const link = `${window.location.origin}/survey/${survey.token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success(t('sse.toast.linkCopied', 'Lien copié dans le presse-papiers'));
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const status = STATUS_STYLES[survey.status];

  return (
    <div
      className={`bg-white rounded-xl border transition-all ${
        isSelected ? 'border-indigo-400 shadow-md ring-2 ring-indigo-100' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
            </div>
            <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">{survey.name}</h3>
            {survey.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{survey.description}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <BarChart3 size={12} className="text-indigo-400" />
            {t('sse.card.topics', '{{count}} thème{{ps}}', { count: survey.topics.length, ps: survey.topics.length > 1 ? 's' : '' })}
          </span>
          <span className="flex items-center gap-1">
            <Users size={12} className="text-violet-400" />
            {t('sse.card.stakeholders', '{{count}} partie{{ps}} prenante{{ps}}', { count: survey.stakeholders.length, ps: survey.stakeholders.length > 1 ? 's' : '' })}
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle size={12} className="text-emerald-400" />
            {t('sse.card.responses', '{{count}} réponse{{ps}}', { count: survey.responses.length, ps: survey.responses.length > 1 ? 's' : '' })}
          </span>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-2">
        <button
          onClick={onSelect}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            isSelected
              ? 'bg-indigo-600 text-white'
              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          }`}
        >
          <Grid3X3 size={12} />
          {t('sse.btn.viewResults', 'Voir les résultats')}
          {!isSelected && <ChevronRight size={11} />}
        </button>

        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {copied ? <CheckCircle size={12} className="text-emerald-500" /> : <Copy size={12} />}
          {copied ? t('sse.btn.copied', 'Copié !') : t('sse.btn.copyLink', 'Copier le lien')}
        </button>

        {survey.status === 'draft' && (
          <button
            onClick={onActivate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <Send size={11} />
            {t('sse.btn.activate', 'Activer')}
          </button>
        )}

        {survey.status === 'active' && (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            {t('sse.btn.close', 'Clôturer')}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Results Panel ────────────────────────────────────────────────────────────

function ResultsPanel({ survey }: { survey: Survey }) {
  const { t } = useTranslation();
  const TOPICS = getTopics(t);
  const [view, setView] = useState<'table' | 'heatmap'>('table');
  const agg = aggregateResults(survey);
  const topics = TOPICS.filter((topic) => survey.topics.includes(topic.id));

  const heatMapPoints: HeatMapPoint[] = topics.map((topic) => ({
    topicId: topic.id,
    name: topic.name,
    pillar: topic.pillar,
    impact: agg[topic.id]?.impact ?? 0,
    financial: agg[topic.id]?.financial ?? 0,
  })).filter((p) => p.impact > 0 || p.financial > 0);

  return (
    <div className="bg-white rounded-xl border border-indigo-200 shadow-sm">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-900">{survey.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{t('sse.results.summary', '{{resp}} réponse(s) · {{top}} thème(s)', { resp: survey.responses.length, top: topics.length })}</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setView('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              view === 'table' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 size={12} /> {t('sse.view.table', 'Tableau')}
          </button>
          <button
            onClick={() => setView('heatmap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              view === 'heatmap' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Grid3X3 size={12} /> {t('sse.view.heatmap', 'Carte thermique')}
          </button>
        </div>
      </div>

      <div className="p-5">
        {survey.responses.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <BarChart3 size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">{t('sse.results.noResponses', "Aucune réponse reçue pour l'instant.")}</p>
            <p className="text-xs mt-1">{t('sse.results.shareHint', 'Partagez le lien du sondage pour commencer à collecter des données.')}</p>
          </div>
        ) : view === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('sse.col.topic', 'Thème')}</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('sse.col.impactAvg', 'Impact moy.')}</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('sse.col.financialAvg', 'Financier moy.')}</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('sse.col.responses', 'Réponses')}</th>
                  <th className="text-center py-2 pl-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('sse.col.material', 'Matériel ?')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topics.map((topic) => {
                  const data = agg[topic.id] ?? { impact: 0, financial: 0, count: 0 };
                  const isMaterial = data.impact >= 3.0 && data.financial >= 3.0;
                  const style = PILLAR_COLORS[topic.pillar];
                  return (
                    <tr key={topic.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${style.badge}`}>{topic.code}</span>
                          <span className="text-gray-800 text-sm">{topic.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {data.count > 0 ? (
                          <span className={`font-semibold ${data.impact >= 3 ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {data.impact.toFixed(1)}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {data.count > 0 ? (
                          <span className={`font-semibold ${data.financial >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                            {data.financial.toFixed(1)}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-500">{data.count}</td>
                      <td className="py-2.5 pl-3 text-center">
                        {data.count > 0 ? (
                          isMaterial ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle size={11} /> {t('sse.material.yes', 'Oui')}
                            </span>
                          ) : (
                            <span className="inline-flex text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              {t('sse.material.no', 'Non')}
                            </span>
                          )
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-3">
              <Trans i18nKey="sse.results.threshold">Seuil de matérialité : impact ≥ 3,0 <b>et</b> financier ≥ 3,0 (sur 5)</Trans>
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {heatMapPoints.length > 0 ? (
              <HeatMap points={heatMapPoints} />
            ) : (
              <p className="text-sm text-gray-400 py-10">{t('sse.results.notEnough', 'Pas assez de données pour afficher la carte.')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StakeholderSurveys() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const initialized = useRef(false);

  // Load on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const stored = loadFromStorage();
    if (stored.length === 0) {
      const demo = buildDemoSurvey();
      const initial = [demo];
      setSurveys(initial);
      saveToStorage(initial);
      setSelectedSurveyId(demo.id);
    } else {
      setSurveys(stored);
      setSelectedSurveyId(stored[0]?.id ?? null);
    }

    // Try API merge — new API returns {items: [...], count: N}
    api.get<{ items: any[]; count: number } | any[]>('/stakeholder-surveys')
      .then((res) => {
        // Handle both old (array) and new ({items: []}) response shapes
        const raw = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        if (!Array.isArray(raw) || raw.length === 0) return;
        // Map backend shape -> frontend Survey shape
        const fromApi: Survey[] = raw.map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description || '',
          topics: s.topics || [],
          stakeholders: (s.stakeholders || []).map((sh: any) => ({
            id: sh.id,
            name: sh.name || '',
            email: sh.email,
            organization: sh.organization || '',
            category: sh.category || 'other',
          })),
          status: s.status || 'draft',
          created_at: s.created_at,
          responses: [],  // analytics endpoint loads these on demand
          token: s.public_token || '',
        }));
        setSurveys((prev) => {
          const ids = new Set(prev.map((s) => s.id));
          const merged = [...prev, ...fromApi.filter((s) => !ids.has(s.id))];
          saveToStorage(merged);
          return merged;
        });
      })
      .catch(() => { /* silent */ });
  }, []);

  const handleCreate = (survey: Survey) => {
    setSurveys((prev) => {
      const updated = [survey, ...prev];
      saveToStorage(updated);
      return updated;
    });
    setSelectedSurveyId(survey.id);
  };

  const closeSurvey = (id: string) => {
    setSurveys((prev) => {
      const updated = prev.map((s) => s.id === id ? { ...s, status: 'closed' as const } : s);
      saveToStorage(updated);
      return updated;
    });
    // Best-effort persist to backend
    api.post(`/stakeholder-surveys/${id}/close`).catch(() => { /* localStorage already updated */ });
    toast.success(t('sse.toast.closed', 'Sondage clôturé.'));
  };

  const activateSurvey = (id: string) => {
    setSurveys((prev) => {
      const updated = prev.map((s) => s.id === id ? { ...s, status: 'active' as const } : s);
      saveToStorage(updated);
      return updated;
    });
    api.post(`/stakeholder-surveys/${id}/activate`).catch(() => { /* localStorage already updated */ });
    toast.success(t('sse.toast.activated', 'Sondage activé — les réponses sont maintenant ouvertes.'));
  };

  const selectedSurvey = surveys.find((s) => s.id === selectedSurveyId) ?? null;

  const totalResponses = surveys.reduce((sum, s) => sum + s.responses.length, 0);
  const activeSurveys = surveys.filter((s) => s.status === 'active').length;
  const totalStakeholders = surveys.reduce((sum, s) => sum + s.stakeholders.length, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Hero (signature) ── */}
        <PageHero
          backTo="/app"
          badge={t('sse.hero.badge', 'CSRD / ESRS 2 · Double matérialité')}
          badgeIcon={Users}
          icon={Users}
          title={t('sse.hero.title', 'Engagement parties prenantes')}
          description={t('sse.hero.desc', 'Sondages de double matérialité · Résultats agrégés en temps réel · Liens publics partageables sans authentification')}
          actions={
            <PageHeroPrimaryButton onClick={() => setShowCreateModal(true)} icon={Plus}>
              {t('sse.btn.newSurvey', 'Nouveau sondage')}
            </PageHeroPrimaryButton>
          }
          kpis={[
            { label: t('sse.kpi.active', 'Sondages actifs'),       value: activeSurveys },
            { label: t('sse.kpi.responses', 'Réponses total'),     value: totalResponses },
            { label: t('sse.kpi.stakeholders', 'Parties prenantes'),  value: totalStakeholders },
          ]}
        />

      {/* ── Main Content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Survey list — 2 columns on lg */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
              {t('sse.list.title', 'Sondages ({{count}})', { count: surveys.length })}
            </h2>

            {surveys.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center">
                <Users size={36} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500 font-medium">{t('sse.empty.title', 'Aucun sondage créé.')}</p>
                <p className="text-xs text-gray-400 mt-1 max-w-52 mx-auto">
                  {t('sse.empty.desc', 'Commencez par créer votre premier sondage de matérialité.')}
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={14} /> {t('sse.btn.newSurvey', 'Nouveau sondage')}
                </button>
              </div>
            ) : (
              surveys.map((s) => (
                <SurveyCard
                  key={s.id}
                  survey={s}
                  isSelected={s.id === selectedSurveyId}
                  onSelect={() => setSelectedSurveyId(s.id === selectedSurveyId ? null : s.id)}
                  onClose={() => closeSurvey(s.id)}
                  onActivate={() => activateSurvey(s.id)}
                />
              ))
            )}
          </div>

          {/* Results panel — 3 columns on lg */}
          <div className="lg:col-span-3">
            {selectedSurvey ? (
              <ResultsPanel survey={selectedSurvey} />
            ) : (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center py-20 text-center px-6">
                <Grid3X3 size={36} className="mb-3 text-gray-300" />
                <p className="text-sm text-gray-500 font-medium">{t('sse.empty.selectTitle', 'Sélectionnez un sondage')}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {t('sse.empty.selectHint', 'Cliquez sur « Voir les résultats » pour afficher la carte de double matérialité.')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <CreateSurveyModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
