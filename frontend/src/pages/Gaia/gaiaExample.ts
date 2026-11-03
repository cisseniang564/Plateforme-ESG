// Exemple de démonstration : entreprise ET chiffres fictifs, inventés pour montrer le rendu de Gaïa.
// Ne jamais présenter ces valeurs comme réelles (voir le bandeau « Exemple fictif » dans GaiaPage).
import type { GaiaAnalysisDetail } from '@/services/gaiaService';

export const GAIA_EXAMPLE_ID = 'example';

export const GAIA_EXAMPLE: GaiaAnalysisDetail = {
  id: GAIA_EXAMPLE_ID,
  filename: 'rapport-durabilite-exemple.pdf',
  status: 'done',
  page_count: 84,
  created_at: null,
  company: 'Exemple Industries SA (fictive)',
  reporting_year: '2024',
  maturity_score: 62,
  result: {
    company: 'Exemple Industries SA (fictive)',
    report_title: 'Rapport de durabilité 2024 (exemple)',
    reporting_year: '2024',
    summary: 'Exemple fictif : le rapport décrit une stratégie climat structurée et publie ses émissions des scopes 1 et 2. Les informations sociales sont partielles et le scope 3 n\'est pas chiffré.',
    maturity_score: 62,
    maturity_comment: 'Score illustratif : il mesure ce que le rapport documente, pas la performance réelle de l\'entreprise.',
    indicators: [
      { name: 'Émissions scope 1', value: '12 400', unit: 'tCO2e', year: '2024', page: 31 },
      { name: 'Émissions scope 2 (location-based)', value: '8 900', unit: 'tCO2e', year: '2024', page: 31 },
      { name: 'Émissions scope 3', value: null, unit: null, year: null, page: 33 },
      { name: 'Part d\'énergie renouvelable', value: '38', unit: '%', year: '2024', page: 35 },
      { name: 'Effectif total', value: '2 150', unit: 'salariés', year: '2024', page: 52 },
      { name: 'Taux de fréquence des accidents du travail', value: '4,2', unit: '', year: '2024', page: 58 },
      { name: 'Écart de rémunération femmes-hommes', value: null, unit: null, year: null, page: null },
    ],
    esrs_coverage: [
      { standard: 'ESRS E1', label: 'Changement climatique', coverage: 'complete', score: 82, evidence: 'Scopes 1 et 2 chiffrés, plan de transition décrit (p. 28-36).' },
      { standard: 'ESRS E2', label: 'Pollution', coverage: 'partial', score: 40, evidence: 'Émissions atmosphériques citées sans valeurs.' },
      { standard: 'ESRS E3', label: 'Eau', coverage: 'absent', score: 0, evidence: 'Aucune donnée sur les prélèvements.' },
      { standard: 'ESRS S1', label: 'Effectifs', coverage: 'partial', score: 55, evidence: 'Effectif et accidents publiés, formation et égalité absentes.' },
      { standard: 'ESRS G1', label: 'Conduite des affaires', coverage: 'complete', score: 70, evidence: 'Politique anticorruption et dispositif d\'alerte décrits.' },
    ],
    strengths: ['Trajectoire de réduction des émissions décrite avec des jalons.', 'Gouvernance climat rattachée au comité exécutif.'],
    gaps: ['Émissions du scope 3 non chiffrées.', 'Aucune donnée sur l\'eau.', 'Écart de rémunération non publié.'],
    recommendations: [
      { priority: 'haute', action: 'Chiffrer le scope 3, au moins pour les catégories les plus significatives.' },
      { priority: 'moyenne', action: 'Publier les indicateurs d\'égalité de rémunération et de formation.' },
      { priority: 'basse', action: 'Ajouter les prélèvements d\'eau par site.' },
    ],
    flags: [
      { claim: 'Une trajectoire alignée sur 1,5 °C', why: 'Le rapport ne cite ni méthode ni validation externe de cet alignement.', page: 29 },
    ],
  },
};
