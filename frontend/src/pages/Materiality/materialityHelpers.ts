// Fonctions pures de la page « Matrice de matérialité » (testées dans src/tests/materiality.test.ts).

export const CATEGORY_KEYS = ['environmental', 'social', 'governance'] as const;

// Ramène une catégorie stockée (« Environnement », « E1 », « climat »…) à l'une des trois clés du graphique.
export const normCatKey = (c: string): string => {
  const lower = (c || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (lower.startsWith('env')) return 'environmental';
  if (lower.startsWith('soc')) return 'social';
  if (lower.startsWith('gov') || lower.startsWith('gou')) return 'governance';
  // codes ESRS (E1, S2, ESRS G1…) et mots-clés courants
  if (/^(esrs ?)?e[1-5]?$/.test(lower) || /climat|pollution|biodiv|dechet|energie|carbone|eau/.test(lower)) return 'environmental';
  if (/^(esrs ?)?s[1-4]?$/.test(lower) || /travail|salarie|employ|droits|communaut|consommateur|client/.test(lower)) return 'social';
  if (/^(esrs ?)?g[1]?$/.test(lower) || /ethique|conduite|corruption|conformite|donnees|cyber/.test(lower)) return 'governance';
  return lower;
};

// Pilier d'un enjeu : sa catégorie, sinon la lettre de son sujet ESRS (E1 → environnement…), sinon « other ».
export const catOf = (i: { category: string; esrs_topic?: string | null }): string => {
  const k = normCatKey(i.category);
  if ((CATEGORY_KEYS as readonly string[]).includes(k)) return k;
  const letter = (i.esrs_topic || '').charAt(0).toUpperCase();
  return letter === 'E' ? 'environmental' : letter === 'S' ? 'social' : letter === 'G' ? 'governance' : 'other';
};

export const HORIZON_LABELS: Record<string, string> = { short: 'Court terme (≤ 1 an)', medium: 'Moyen terme (1 à 5 ans)', long: 'Long terme (> 5 ans)' };
export const VALUE_CHAIN_LABELS: Record<string, string> = { own: 'Opérations propres', upstream: 'Chaîne amont', downstream: 'Chaîne aval' };

// Une évaluation est « complète » pour un enjeu matériel quand ces cinq éléments sont renseignés.
export const missingDocumentation = (i: {
  rationale?: string | null; esrs_topic?: string | null; iro_type?: string | null; time_horizon?: string | null; stakeholders?: string | null;
}): string[] => {
  const out: string[] = [];
  if (!(i.rationale || '').trim()) out.push('justification');
  if (!i.esrs_topic) out.push('sujet ESRS');
  if (!i.iro_type) out.push('impact/risque/opportunité');
  if (!i.time_horizon) out.push('horizon de temps');
  if (!(i.stakeholders || '').trim()) out.push('parties prenantes');
  return out;
};
