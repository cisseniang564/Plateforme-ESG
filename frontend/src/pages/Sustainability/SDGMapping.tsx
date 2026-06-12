import { useState, useEffect, useCallback, useMemo } from 'react';
import { Target, Filter, Download, Save, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

type ContribLevel = 'forte' | 'moderee' | 'indirecte' | 'negatif' | 'na';
interface SDGData { level: ContribLevel | ''; note: string; id?: string; noteId?: string; }
interface DataEntry { id: string; metric_name: string; value_text?: string; category: string; pillar: string; period_start: string; period_end: string; period_type: string; }

function getSDGS(t: TFunction) {
  return [
    { id: 1,  name: t('sdg.sdg1',  'Pas de pauvreté'),                         color: '#E5243B', emoji: '🌍' },
    { id: 2,  name: t('sdg.sdg2',  'Faim zéro'),                               color: '#DDA63A', emoji: '🌾' },
    { id: 3,  name: t('sdg.sdg3',  'Bonne santé et bien-être'),                color: '#4C9F38', emoji: '💚' },
    { id: 4,  name: t('sdg.sdg4',  'Éducation de qualité'),                    color: '#C5192D', emoji: '📚' },
    { id: 5,  name: t('sdg.sdg5',  'Égalité entre les sexes'),                 color: '#FF3A21', emoji: '⚖️' },
    { id: 6,  name: t('sdg.sdg6',  'Eau propre et assainissement'),            color: '#26BDE2', emoji: '💧' },
    { id: 7,  name: t('sdg.sdg7',  "Énergie propre et d'un coût abordable"),   color: '#FCC30B', emoji: '⚡' },
    { id: 8,  name: t('sdg.sdg8',  'Travail décent et croissance économique'), color: '#A21942', emoji: '📈' },
    { id: 9,  name: t('sdg.sdg9',  'Industrie, innovation et infrastructure'), color: '#FD6925', emoji: '🏗️' },
    { id: 10, name: t('sdg.sdg10', 'Inégalités réduites'),                     color: '#DD1367', emoji: '🤝' },
    { id: 11, name: t('sdg.sdg11', 'Villes et communautés durables'),          color: '#FD9D24', emoji: '🏙️' },
    { id: 12, name: t('sdg.sdg12', 'Consommation et production responsables'), color: '#BF8B2E', emoji: '♻️' },
    { id: 13, name: t('sdg.sdg13', 'Lutte contre les changements climatiques'),color: '#3F7E44', emoji: '🌱' },
    { id: 14, name: t('sdg.sdg14', 'Vie aquatique'),                           color: '#0A97D9', emoji: '🌊' },
    { id: 15, name: t('sdg.sdg15', 'Vie terrestre'),                           color: '#56C02B', emoji: '🌿' },
    { id: 16, name: t('sdg.sdg16', 'Paix, justice et institutions efficaces'), color: '#00689D', emoji: '🕊️' },
    { id: 17, name: t('sdg.sdg17', 'Partenariats pour les objectifs'),         color: '#19486A', emoji: '🌐' },
  ];
}

function getCONTRIB_LEVELS(t: TFunction): { value: ContribLevel; label: string; color: string; bg: string }[] {
  return [
    { value: 'forte',     label: t('sdg.levForte',     'Contribution forte'),         color: '#16a34a', bg: '#dcfce7' },
    { value: 'moderee',   label: t('sdg.levModeree',   'Contribution modérée'),       color: '#2563eb', bg: '#dbeafe' },
    { value: 'indirecte', label: t('sdg.levIndirecte', 'Contribution indirecte'),     color: '#7c3aed', bg: '#ede9fe' },
    { value: 'negatif',   label: t('sdg.levNegatif',   'Impact négatif potentiel'),   color: '#dc2626', bg: '#fee2e2' },
    { value: 'na',        label: t('sdg.levNA',        'Non applicable'),             color: '#6b7280', bg: '#f3f4f6' },
  ];
}

const YEAR = new Date().getFullYear();
const PERIOD_START = `${YEAR}-01-01`;
const PERIOD_END   = `${YEAR}-12-31`;

const SDGMapping: React.FC = () => {
  const { t } = useTranslation();
  const SDGS          = getSDGS(t);
  const CONTRIB_LEVELS = getCONTRIB_LEVELS(t);

  const [data, setData]           = useState<Record<number, SDGData>>({});
  const [expanded, setExpanded]   = useState<number | null>(null);
  const [saving, setSaving]       = useState(false);
  const [loading, setLoading]     = useState(true);
  const [filterLevel, setFilterLevel] = useState<ContribLevel | 'all'>('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<DataEntry[]>('/data-entry/', { params: { category: 'SDG_MAPPING', limit: 100 } });
        const entries: DataEntry[] = Array.isArray(res.data) ? res.data : [];
        const parsed: Record<number, SDGData> = {};
        for (const entry of entries) {
          const levelMatch = entry.metric_name.match(/^SDG_(\d+)_level$/);
          const noteMatch  = entry.metric_name.match(/^SDG_(\d+)_note$/);
          if (levelMatch) { const id = parseInt(levelMatch[1],10); parsed[id] = { ...(parsed[id] ?? { level:'', note:'' }), level: (entry.value_text as ContribLevel) ?? '', id: entry.id }; }
          else if (noteMatch) { const id = parseInt(noteMatch[1],10); parsed[id] = { ...(parsed[id] ?? { level:'', note:'' }), note: entry.value_text ?? '', noteId: entry.id }; }
        }
        setData(parsed);
      } catch { /* Fail silently */ } finally { setLoading(false); }
    })();
  }, []);

  const getSDGData  = useCallback((id: number): SDGData => data[id] ?? { level: '', note: '' }, [data]);
  const updateSDGData = useCallback((id: number, patch: Partial<SDGData>) => { setData(prev => ({ ...prev, [id]: { ...(prev[id] ?? { level:'', note:'' }), ...patch } })); }, []);

  const stats = useMemo(() => {
    const all = SDGS.map(s => getSDGData(s.id));
    return { covered: all.filter(d => d.level !== '' && d.level !== 'na').length, forte: all.filter(d => d.level === 'forte').length, moderee: all.filter(d => d.level === 'moderee').length, negatif: all.filter(d => d.level === 'negatif').length };
  }, [getSDGData, SDGS]);

  const filteredSDGs = useMemo(() => {
    if (filterLevel === 'all') return SDGS;
    return SDGS.filter(s => getSDGData(s.id).level === filterLevel);
  }, [filterLevel, getSDGData, SDGS]);

  const saveSDG = useCallback(async (id: number) => {
    const sdgData = getSDGData(id);
    const basePayload = { category: 'SDG_MAPPING', pillar: 'governance', period_start: PERIOD_START, period_end: PERIOD_END, period_type: 'annual' };
    const levelPayload = { ...basePayload, metric_name: `SDG_${id}_level`, value_text: sdgData.level || '' };
    if (sdgData.id) { await api.put(`/data-entry/${sdgData.id}`, levelPayload); }
    else { const res = await api.post<DataEntry>('/data-entry/', levelPayload); updateSDGData(id, { id: res.data.id }); }
    const notePayload = { ...basePayload, metric_name: `SDG_${id}_note`, value_text: sdgData.note };
    if (sdgData.noteId) { await api.put(`/data-entry/${sdgData.noteId}`, notePayload); }
    else { const res2 = await api.post<DataEntry>('/data-entry/', notePayload); updateSDGData(id, { noteId: res2.data.id }); }
  }, [getSDGData, updateSDGData]);

  const saveAll = useCallback(async () => {
    setSaving(true);
    try { await Promise.all(SDGS.map(s => saveSDG(s.id))); toast.success(t('sdg.savedAll', 'Cartographie ODD sauvegardée avec succès')); }
    catch { toast.error(t('sdg.errSave', 'Erreur lors de la sauvegarde')); }
    finally { setSaving(false); }
  }, [saveSDG, SDGS, t]);

  const saveSingleSDG = useCallback(async (id: number) => {
    try { await saveSDG(id); toast.success(t('sdg.savedOne', 'ODD {{id}} sauvegardé', { id })); }
    catch { toast.error(t('sdg.errSaveOne', "Erreur lors de la sauvegarde de l'ODD {{id}}", { id })); }
  }, [saveSDG, t]);

  const handleExportPDF = useCallback(() => { toast(t('sdg.printHint', "Utilisez l'impression navigateur pour sauvegarder en PDF"), { icon: '🖨️' }); window.print(); }, [t]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">{t('sdg.loading', 'Chargement de la cartographie ODD…')}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#052e16 0%,#064e3b 40%,#065f46 80%,#047857 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex-shrink-0"><Target className="w-7 h-7 text-emerald-300" /></div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">{t('sdg.heroTitle', 'Contribution aux Objectifs de Développement Durable')}</h1>
                <p className="text-emerald-200 mt-1 text-sm md:text-base">{t('sdg.heroDesc', 'Alignement avec les 17 ODD des Nations Unies · Rapport investisseurs · Agenda 2030')}</p>
              </div>
            </div>
            <button onClick={handleExportPDF} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white font-medium text-sm transition-all whitespace-nowrap self-start">
              <Download className="w-4 h-4" />{t('sdg.exportPDF', 'Exporter PDF')}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-white">{stats.covered}<span className="text-emerald-300 text-xl">/17</span></p>
              <p className="text-emerald-200 text-xs mt-1 leading-tight">{t('sdg.covered', 'ODD couverts')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-300">{stats.forte}</p>
              <p className="text-emerald-200 text-xs mt-1 leading-tight">{t('sdg.strongContrib', 'dont contribution forte')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-300">{stats.moderee}</p>
              <p className="text-emerald-200 text-xs mt-1 leading-tight">{t('sdg.moderateContrib', 'dont contribution modérée')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-red-300">{stats.negatif}</p>
              <p className="text-emerald-200 text-xs mt-1 leading-tight">{t('sdg.negativeImpacts', 'impacts négatifs à gérer')}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="w-4 h-4 text-emerald-300 flex-shrink-0" />
            <button onClick={() => setFilterLevel('all')} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${filterLevel==='all' ? 'bg-white text-emerald-900 border-white' : 'bg-white/10 text-white border-white/30 hover:bg-white/20'}`}>
              {t('sdg.all', 'Tous')}
            </button>
            {CONTRIB_LEVELS.map(cl => (
              <button key={cl.value} onClick={() => setFilterLevel(filterLevel===cl.value ? 'all' : cl.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${filterLevel===cl.value ? 'border-white text-white font-semibold' : 'bg-white/10 text-white border-white/30 hover:bg-white/20'}`}
                style={filterLevel===cl.value ? { backgroundColor: cl.color, borderColor: cl.color } : {}}>
                {cl.label}
              </button>
            ))}
            <div className="ml-auto">
              <button onClick={saveAll} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-md">
                {saving ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t('sdg.saving','Sauvegarde…')}</> : <><Save className="w-4 h-4" />{t('sdg.saveAll','Sauvegarder tout')}</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {filterLevel !== 'all' && (
          <p className="text-sm text-gray-500 mb-4">{t('sdg.filteredDisplay','Affichage filtré :')} <span className="font-semibold text-gray-700">{filteredSDGs.length} ODD</span></p>
        )}
        {filteredSDGs.length === 0 ? (
          <div className="text-center py-20 text-gray-400"><Target className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{t('sdg.noSDG','Aucun ODD ne correspond à ce filtre.')}</p></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredSDGs.map(sdg => {
              const sdgData = getSDGData(sdg.id);
              const isExpanded = expanded === sdg.id;
              const levelInfo = CONTRIB_LEVELS.find(cl => cl.value === sdgData.level);
              return (
                <div key={sdg.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-md flex flex-col" style={{ borderLeft: `4px solid ${sdg.color}` }}>
                  <div className="p-3 flex items-start gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: sdg.color }}>{sdg.id}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5"><span className="text-base leading-none">{sdg.emoji}</span></div>
                      <p className="text-xs font-semibold text-gray-800 leading-tight">{sdg.name}</p>
                    </div>
                  </div>
                  {levelInfo && (
                    <div className="px-3 pb-1"><span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium" style={{ color: levelInfo.color, backgroundColor: levelInfo.bg }}>{levelInfo.label}</span></div>
                  )}
                  <div className="px-3 pb-2">
                    <select value={sdgData.level} onChange={e => updateSDGData(sdg.id, { level: e.target.value as ContribLevel | '' })}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-gray-700">
                      <option value="">{t('sdg.select','— Sélectionner —')}</option>
                      {CONTRIB_LEVELS.map(cl => <option key={cl.value} value={cl.value}>{cl.label}</option>)}
                    </select>
                  </div>
                  <button onClick={() => setExpanded(isExpanded ? null : sdg.id)} className="flex items-center justify-between px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100">
                    <span>{t('sdg.noteKPIs','Note / KPIs')}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-2 border-t border-gray-100 space-y-2 bg-gray-50">
                      <textarea rows={3} value={sdgData.note} onChange={e => updateSDGData(sdg.id, { note: e.target.value })}
                        placeholder={t('sdg.notePlaceholder','Décrivez comment vos activités contribuent à cet ODD…')}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none placeholder-gray-400" />
                      <button onClick={() => saveSingleSDG(sdg.id)} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium underline underline-offset-2 transition-colors">
                        {t('sdg.saveThis','Sauvegarder cet ODD')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SDGMapping;
