/**
 * Test « Suis-je concerné par la CSRD ? » — règles après l'Omnibus I (adopté fin 2025,
 * approuvé par le Conseil le 24 février 2026). Pur calcul, sans appel réseau : testable.
 * Indicatif : ce n'est pas un avis juridique ; la transposition nationale peut préciser les cas limites.
 */
export type Region = 'eu' | 'non_eu';
/** Bandes strictes : « Jusqu'à 1 000 » = ≤ 1 000 ; « De 1 001 à 5 000 » = > 1 000 et ≤ 5 000. */
export type EmployeeBand = 'le250' | 'le1000' | 'le5000' | 'gt5000';
export type TurnoverBand = 'le50' | 'le450' | 'le1500' | 'gt1500';

export interface EligibilityAnswers {
  region: Region;
  /** UE : déclare déjà au titre de la CSRD / NFRD (exercice 2024 ou avant). */
  alreadyReporting: boolean;
  employees: EmployeeBand;
  turnover: TurnoverBand;
  /** Hors UE : CA net dans l'UE > 450 M€ sur chacun des deux derniers exercices. */
  euTurnoverOver450: boolean;
  /** Hors UE : filiale ou succursale dans l'UE dépassant 200 M€ de CA net. */
  euEntityOver200: boolean;
  /** Vend à de grandes entreprises susceptibles de demander des données ESG. */
  sellsToLargeClients: boolean;
}

export type CsrdStatus = 'already_reporting' | 'in_scope_wave2' | 'in_scope_non_eu' | 'out_of_scope';

export interface EligibilityResult {
  csrd: { status: CsrdStatus; firstReportYear: number | null; fiscalYear: number | null };
  /** CSDDD : plus de 5 000 salariés ET plus de 1,5 Md€ de CA net mondial (entreprises de l'UE). */
  csddd: boolean;
  /** Plafond de la chaîne de valeur : moins de 1 000 salariés, demandes limitées au standard VSME. */
  valueChainCap: boolean;
  /** Sollicitée par des clients : le VSME est son socle de réponse. */
  vsmeUseful: boolean;
}

const employeesOver1000 = (b: EmployeeBand) => b === 'le5000' || b === 'gt5000';
const turnoverOver450 = (b: TurnoverBand) => b === 'le1500' || b === 'gt1500';

export function assessEligibility(a: EligibilityAnswers): EligibilityResult {
  let csrd: EligibilityResult['csrd'];

  if (a.region === 'non_eu') {
    const inScope = a.euTurnoverOver450 && a.euEntityOver200;
    csrd = inScope
      ? { status: 'in_scope_non_eu', firstReportYear: 2029, fiscalYear: 2028 }
      : { status: 'out_of_scope', firstReportYear: null, fiscalYear: null };
  } else if (a.alreadyReporting) {
    csrd = { status: 'already_reporting', firstReportYear: null, fiscalYear: null };
  } else if (employeesOver1000(a.employees) && turnoverOver450(a.turnover)) {
    csrd = { status: 'in_scope_wave2', firstReportYear: 2028, fiscalYear: 2027 };
  } else {
    // Y compris les sociétés cotées sous les seuils : les PME cotées sont sorties du champ.
    csrd = { status: 'out_of_scope', firstReportYear: null, fiscalYear: null };
  }

  const euCompany = a.region === 'eu';
  const csddd = euCompany && (a.employees === 'gt5000') && a.turnover === 'gt1500';
  const small = euCompany && (a.employees === 'le250' || a.employees === 'le1000');
  const valueChainCap = small && csrd.status !== 'already_reporting';
  const vsmeUseful = csrd.status === 'out_of_scope' && a.sellsToLargeClients;

  return { csrd, csddd, valueChainCap, vsmeUseful };
}

export const SOURCES = [
  { label: 'Accountancy Europe — Omnibus explained: CSRD factsheet (janv. 2026)', url: 'https://accountancyeurope.eu/wp-content/uploads/2026/01/260129-Omnibus-explained-CSRD-factsheet.pdf' },
  { label: 'PwC Luxembourg — EU finalises agreement on Omnibus (9 janv. 2026)', url: 'https://www.pwc.lu/en/sustainability/sustainable-finance/eu-finalises-agreement-on-omnibus.html' },
  { label: 'Latham & Watkins — Omnibus published in the Official Journal', url: 'https://www.lw.com/en/insights/eu-sustainability-omnibus-published-in-the-official-journal' },
];
export const LAST_CHECKED = '31 octobre 2026';
