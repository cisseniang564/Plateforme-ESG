import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Building2, MapPin, Users, Factory, ExternalLink, Download,
  ArrowLeft, Zap, Filter, X, ChevronDown, BarChart3, CheckCircle, AlertCircle, Globe,
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import BackButton from '@/components/common/BackButton';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import i18n from '@/i18n/config';

const numLocale = () => (i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR');

interface Entreprise {
  siren?: string; siret?: string; denomination: string;
  activite_principale?: string; tranche_effectifs?: string;
  adresse?: { adresse_complete?: string; code_postal?: string; commune?: string };
  etablissement_siege?: boolean; etat_administratif?: string;
}

interface Secteur { id: string; nom: string; description: string; }

function getEFFECTIFS(t: TFunction): Record<string, { label: string; category: string; color: string }> {
  return {
    NN:  { label: t('insee.effNN',  'Non précisé'),          category: '',     color: 'gray' },
    '00':{ label: t('insee.eff00',  '0 salarié'),            category: 'Micro',color: 'gray' },
    '01':{ label: t('insee.eff01',  '1–2 salariés'),         category: 'Micro',color: 'gray' },
    '02':{ label: t('insee.eff02',  '3–5 salariés'),         category: 'Micro',color: 'gray' },
    '03':{ label: t('insee.eff03',  '6–9 salariés'),         category: 'TPE', color: 'slate' },
    '11':{ label: t('insee.eff11',  '10–19 salariés'),       category: 'TPE', color: 'slate' },
    '12':{ label: t('insee.eff12',  '20–49 salariés'),       category: 'PME', color: 'blue' },
    '21':{ label: t('insee.eff21',  '50–99 salariés'),       category: 'PME', color: 'blue' },
    '22':{ label: t('insee.eff22',  '100–199 salariés'),     category: 'PME', color: 'blue' },
    '31':{ label: t('insee.eff31',  '200–249 salariés'),     category: 'ETI', color: 'indigo' },
    '32':{ label: t('insee.eff32',  '250–499 salariés'),     category: 'ETI', color: 'indigo' },
    '41':{ label: t('insee.eff41',  '500–999 salariés'),     category: 'ETI', color: 'indigo' },
    '42':{ label: t('insee.eff42',  '1 000–1 999 salariés'), category: 'GE',  color: 'purple' },
    '51':{ label: t('insee.eff51',  '2 000–4 999 salariés'), category: 'GE',  color: 'purple' },
    '52':{ label: t('insee.eff52',  '5 000–9 999 salariés'), category: 'GE',  color: 'purple' },
    '53':{ label: t('insee.eff53',  '10 000+ salariés'),     category: 'GE',  color: 'purple' },
  };
}

const SIZE_COLORS: Record<string, string> = {
  Micro: 'bg-gray-100 text-gray-600',
  TPE: 'bg-slate-100 text-slate-700',
  PME: 'bg-blue-100 text-blue-700',
  ETI: 'bg-indigo-100 text-indigo-700',
  GE: 'bg-purple-100 text-purple-700',
};

function getInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function AvatarIcon({ name }: { name: string }) {
  const colors = ['bg-blue-500','bg-indigo-500','bg-violet-500','bg-cyan-500','bg-teal-500','bg-emerald-500'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`${color} w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
      {getInitials(name)}
    </div>
  );
}

export default function EntreprisesINSEE() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const EFFECTIFS = getEFFECTIFS(t);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'nom' | 'secteur'>('nom');
  const [selectedSecteur, setSelectedSecteur] = useState('');
  const [departement, setDepartement] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active'>('all');
  const [loading, setLoading] = useState(false);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [total, setTotal] = useState(0);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => { loadSecteurs(); }, []);

  const loadSecteurs = async () => {
    try {
      const response = await api.get('/insee/secteurs');
      setSecteurs(response.data.secteurs || []);
    } catch (error) { console.error('Error loading secteurs:', error); }
  };

  const handleSearch = async () => {
    if (searchType === 'nom' && !searchQuery.trim()) return;
    if (searchType === 'secteur' && !selectedSecteur) return;
    setLoading(true); setEntreprises([]); setSearchError(''); setHasSearched(true); setFilterActive('all');
    try {
      let response;
      if (searchType === 'nom') {
        response = await api.get('/insee/rechercher', { params: { q: searchQuery, nombre: 50 } });
      } else {
        response = await api.get(`/insee/secteur/${selectedSecteur}`, { params: { departement: departement || undefined, nombre: 100 } });
      }
      setEntreprises(response.data.entreprises || []);
      setTotal(response.data.total || 0);
    } catch (error: any) {
      setSearchError(error.response?.data?.detail || t('insee.errSearch', 'Erreur lors de la recherche'));
    } finally { setLoading(false); }
  };

  const handleExport = () => {
    if (displayed.length === 0) return;
    const headers = ['SIREN', 'SIRET', 'Dénomination', 'Activité', 'Catégorie', 'Effectifs', 'Statut', 'Adresse', 'Code Postal', 'Commune'];
    const rows = displayed.map(e => {
      const eff = EFFECTIFS[e.tranche_effectifs || ''];
      return [
        e.siren || '', e.siret || '', e.denomination || '', e.activite_principale || '',
        eff?.category || '', eff?.label || '',
        e.etat_administratif === 'A' ? 'Actif' : 'Inactif',
        e.adresse?.adresse_complete || '', e.adresse?.code_postal || '', e.adresse?.commune || '',
      ];
    });
    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `entreprises_insee_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const displayed = filterActive === 'active' ? entreprises.filter(e => e.etat_administratif === 'A') : entreprises;
  const activeCount = entreprises.filter(e => e.etat_administratif === 'A').length;

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==')] opacity-30" />
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div>
            <BackButton to="/app/settings" label={t('insee.backLabel', 'Paramètres')} className="mb-4 text-white/70 hover:text-white" />
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold tracking-wide uppercase">Base Sirene — INSEE</span>
              <span className="px-2.5 py-1 bg-blue-400/20 border border-blue-300/30 rounded-full text-xs font-semibold text-blue-200">{t('insee.officialBadge', 'Données Officielles')}</span>
            </div>
            <h1 className="text-3xl font-bold mb-1">{t('insee.heroTitle', 'Entreprises Françaises (INSEE)')}</h1>
            <p className="text-blue-100">{t('insee.heroDesc', "Recherche dans la base Sirene · Plus de 10 millions d'établissements")}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {[
              { icon: Globe,      label: t('insee.statEstab',   'Établissements'), value: '10M+' },
              { icon: BarChart3,  label: t('insee.statSectors', 'Secteurs ESG'),   value: secteurs.length || '—' },
              { icon: CheckCircle,label: 'Source',                                 value: t('insee.officielle', 'Officielle') },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20 min-w-[90px]">
                <Icon className="h-4 w-4 text-blue-200 mb-1" />
                <span className="text-lg font-bold">{value}</span>
                <span className="text-xs text-blue-200">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Search Card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit mb-5">
          {(['nom', 'secteur'] as const).map((mode) => (
            <button key={mode} onClick={() => { setSearchType(mode); setEntreprises([]); setHasSearched(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${searchType === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {mode === 'nom' ? <Search className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
              {mode === 'nom' ? t('insee.byName', 'Par nom ou SIREN') : t('insee.bySector', 'Par secteur')}
            </button>
          ))}
        </div>

        {searchType === 'nom' && (
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input ref={searchRef} type="text" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={t('insee.searchPlaceholder', "Nom d'entreprise, SIREN (9 chiffres) ou SIRET (14 chiffres)…")}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 text-sm" />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setEntreprises([]); setHasSearched(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button onClick={handleSearch} disabled={loading || !searchQuery.trim()} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {loading ? <Spinner /> : <Search className="h-4 w-4" />}
              {loading ? t('insee.searching', 'Recherche…') : t('insee.search', 'Rechercher')}
            </button>
          </div>
        )}

        {searchType === 'secteur' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('insee.sectorLabel', "Secteur d'activité")}</label>
              <div className="relative">
                <select value={selectedSecteur} onChange={(e) => setSelectedSecteur(e.target.value)}
                  aria-label={t('insee.sectorLabel', "Secteur d'activité")}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 text-sm appearance-none bg-white">
                  <option value="">{t('insee.selectSector', '— Sélectionner un secteur ESG —')}</option>
                  {secteurs.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {t('insee.deptLabel', 'Département')} <span className="font-normal normal-case text-gray-400">({t('insee.optional', 'optionnel')})</span>
              </label>
              <input type="text" value={departement}
                onChange={(e) => setDepartement(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder={t('insee.deptPlaceholder', 'ex : 75, 93, 69…')} maxLength={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 text-sm" />
            </div>
            <div className="md:col-span-3">
              <button onClick={handleSearch} disabled={loading || !selectedSecteur}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Spinner /><span className="ml-2">{t('insee.searchingInSector', 'Recherche en cours…')}</span></> : <><Search className="h-4 w-4 mr-2" />{t('insee.searchInSector', 'Rechercher dans ce secteur')}</>}
              </button>
            </div>
          </div>
        )}

        {searchError && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />{searchError}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-3">
          {searchType === 'nom'
            ? t('insee.searchHintName', 'Recherche dans la base Sirene INSEE — Données officielles mises à jour quotidiennement')
            : t('insee.searchHintSector', 'Secteurs sélectionnés pour leur fort impact ESG environnemental, social et de gouvernance')}
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-gray-200 rounded-xl" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && entreprises.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {t('insee.totalFound', '{{n}} entreprise{{s}} trouvée{{s}}', { n: total.toLocaleString(numLocale()), s: total > 1 ? 's' : '' })}
                </p>
                <p className="text-sm text-gray-500">
                  {t('insee.displayedOf', '{{d}} affichée{{ds}} · {{a}} active{{as}}', { d: displayed.length, ds: displayed.length > 1 ? 's' : '', a: activeCount, as: activeCount > 1 ? 's' : '' })}
                </p>
              </div>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {(['active', 'all'] as const).map(f => (
                  <button key={f} onClick={() => setFilterActive(f)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${filterActive === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                    {f === 'active' ? t('insee.filterActive', 'Actives ({{n}})', { n: activeCount }) : t('insee.filterAll', 'Toutes ({{n}})', { n: entreprises.length })}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors">
              <Download className="h-4 w-4" />{t('insee.exportCSV', 'Exporter CSV')}
            </button>
          </div>

          <div className="space-y-2">
            {displayed.map((e, idx) => {
              const eff = EFFECTIFS[e.tranche_effectifs || ''];
              const isActive = e.etat_administratif === 'A';
              return (
                <div key={idx} className={`bg-white border rounded-2xl p-5 hover:shadow-md transition-all group ${isActive ? 'border-gray-100 hover:border-blue-200' : 'border-gray-100 opacity-70'}`}>
                  <div className="flex items-start gap-4">
                    <AvatarIcon name={e.denomination} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <h4 className="font-bold text-gray-900 text-sm truncate">{e.denomination}</h4>
                          {isActive ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full font-semibold flex-shrink-0">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />{t('insee.statusActive', 'Actif')}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full font-semibold flex-shrink-0">{t('insee.statusClosed', 'Fermé')}</span>
                          )}
                          {e.etablissement_siege && (
                            <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-semibold flex-shrink-0">{t('insee.hq', 'Siège')}</span>
                          )}
                          {eff?.category && (
                            <span className={`px-2 py-0.5 text-xs rounded-full font-semibold flex-shrink-0 ${SIZE_COLORS[eff.category] || 'bg-gray-100 text-gray-600'}`}>{eff.category}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {e.siren && (
                            <>
                              <button onClick={() => navigate('/app/settings/esg-enrichment', { state: { siren: e.siren } })}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                                title={t('insee.enrichESG', 'Enrichir ESG')}>
                                <Zap className="h-3.5 w-3.5" />{t('insee.enrichESG', 'Enrichir ESG')}
                              </button>
                              <a href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${e.siren}`} target="_blank" rel="noopener noreferrer"
                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                title={t('insee.viewOfficial', "Voir sur l'annuaire officiel")}>
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                        {e.siren && <span className="flex items-center gap-1"><span className="font-semibold text-gray-600">SIREN</span><code className="font-mono bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded text-gray-700">{e.siren}</code></span>}
                        {e.activite_principale && <span className="flex items-center gap-1"><Factory className="h-3.5 w-3.5 text-gray-400" /><span>APE {e.activite_principale}</span></span>}
                        {eff && e.tranche_effectifs !== 'NN' && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-gray-400" /><span>{eff.label}</span></span>}
                        {e.adresse?.commune && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-gray-400" /><span>{e.adresse.code_postal} {e.adresse.commune}</span></span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {total > entreprises.length && (
            <p className="text-center text-sm text-gray-400 py-2">
              {t('insee.showingOf', 'Affichage de {{n}} sur {{total}} résultats — affinez votre recherche pour voir plus', { n: entreprises.length, total: total.toLocaleString(numLocale()) })}
            </p>
          )}
        </div>
      )}

      {!loading && hasSearched && displayed.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Building2 className="h-8 w-8 text-gray-400" /></div>
            <p className="text-gray-700 font-semibold mb-1">{t('insee.noResults', 'Aucun résultat')}</p>
            <p className="text-sm text-gray-400 mb-4">
              {filterActive === 'active' && entreprises.length > 0
                ? t('insee.noActiveResults', '{{n}} entreprise{{s}} trouvée{{s}} mais aucune active', { n: entreprises.length, s: entreprises.length > 1 ? 's' : '' })
                : t('insee.noMatch', 'Aucune entreprise ne correspond à votre recherche')}
            </p>
            {filterActive === 'active' && entreprises.length > 0 && (
              <button onClick={() => setFilterActive('all')} className="text-sm text-blue-600 hover:text-blue-800 font-medium underline">
                {t('insee.seeAll', 'Voir toutes les entreprises (y compris fermées)')}
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && !hasSearched && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Search className="h-8 w-8 text-blue-400" /></div>
            <p className="text-gray-700 font-semibold mb-1">{t('insee.emptyTitle', 'Recherchez une entreprise française')}</p>
            <p className="text-sm text-gray-400 mb-6">{t('insee.emptyDesc', "Nom, SIREN, SIRET ou secteur d'activité")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Renault', 'Carrefour', 'Danone', 'Schneider Electric', 'Veolia'].map(q => (
                <button key={q} onClick={() => { setSearchType('nom'); setSearchQuery(q); }}
                  className="px-3 py-1.5 border border-gray-200 rounded-full text-sm text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
