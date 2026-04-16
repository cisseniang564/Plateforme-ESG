import api from './api';

export interface OrgScore {
  id: string;
  date: string;
  overall_score: number;
  rating: string;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  confidence_level: number;
  data_completeness: number;
}

export interface OrgScoresResponse {
  organization_id: string;
  scores: OrgScore[];
  count: number;
}

export interface ScoringDashboard {
  statistics: {
    total_organizations: number;
    total_scores: number;
    average_score: number;
    average_environmental: number;
    average_social: number;
    average_governance: number;
    average_completeness: number;
    max_score: number;
    min_score: number;
  };
  rating_distribution: Array<{ rating: string; count: number }> | Record<string, number>;
  recent_scores: OrgScore[];
}

/**
 * Normalise un score brut retourné par l'API :
 * - Arrondi à l'entier le plus proche
 * - Clamp entre 0 et 100
 */
function round(val: number | null | undefined): number {
  if (val == null || isNaN(val)) return 0;
  return Math.min(100, Math.max(0, Math.round(val)));
}

/**
 * Normalise data_completeness : l'API peut retourner un ratio 0-1
 * ou un pourcentage 0-100 voire un entier > 1 (nb de champs).
 * On ramène toujours à un entier entre 0 et 100.
 */
function normalizeCompleteness(val: number | null | undefined): number {
  if (val == null || isNaN(val)) return 0;
  // Si <= 1 → c'est un ratio (ex: 0.95 → 95%)
  // Si > 1 et <= 100 → déjà un pourcentage
  // Si > 100 → valeur aberrante, on plafonne à 100
  const pct = val <= 1 ? val * 100 : val;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

/** Normalise un objet OrgScore brut depuis l'API. */
function normalizeScore(raw: any): OrgScore {
  return {
    id: raw.id,
    date: raw.date,
    rating: raw.rating ?? '—',
    overall_score: round(raw.overall_score),
    environmental_score: round(raw.environmental_score),
    social_score: round(raw.social_score),
    governance_score: round(raw.governance_score),
    confidence_level: round(raw.confidence_level),
    data_completeness: normalizeCompleteness(raw.data_completeness),
  };
}

/** Derniers N scores d'une organisation (tri décroissant par date). */
export async function getOrgScores(orgId: string, limit = 12): Promise<OrgScore[]> {
  try {
    const r = await api.get<OrgScoresResponse>(`/esg-scoring/organization/${orgId}?limit=${limit}`);
    return (r.data.scores ?? []).map(normalizeScore);
  } catch {
    return [];
  }
}

/** Score le plus récent d'une organisation, ou null si aucun. */
export async function getOrgLatestScore(orgId: string): Promise<OrgScore | null> {
  const scores = await getOrgScores(orgId, 1);
  return scores[0] ?? null;
}

/**
 * Scores de plusieurs organisations.
 * Utilise l'endpoint /esg-scoring/all-org-scores (1 requête SQL pour N orgs)
 * pour éviter le rate-limiting qu'entraînerait N requêtes individuelles en parallèle.
 * Fallback : batches séquentiels de 5 si l'endpoint n'est pas disponible.
 */
export async function getBatchOrgScores(
  orgIds: string[]
): Promise<Record<string, OrgScore | null>> {
  if (orgIds.length === 0) return {};

  // ── Tentative optimisée : 1 seule requête pour toutes les orgs ──────────────
  try {
    const r = await api.get<{ scores: any[]; count: number }>('/esg-scoring/all-org-scores');
    const map: Record<string, OrgScore | null> = {};
    // Initialise toutes les orgs demandées à null (au cas où certaines n'auraient pas de score)
    orgIds.forEach(id => { map[id] = null; });
    for (const s of r.data.scores ?? []) {
      if (orgIds.includes(s.organization_id)) {
        map[s.organization_id] = normalizeScore({
          id:                   s.organization_id,
          date:                 s.date,
          overall_score:        s.overall_score,
          environmental_score:  s.environmental_score,
          social_score:         s.social_score,
          governance_score:     s.governance_score,
          rating:               s.rating,
          data_completeness:    s.data_completeness,
          confidence_level:     s.confidence_level,
        });
      }
    }
    return map;
  } catch {
    // ── Fallback : batches séquentiels de 5 pour limiter les requêtes ─────────
    const BATCH = 5;
    const result: Record<string, OrgScore | null> = {};
    for (let i = 0; i < orgIds.length; i += BATCH) {
      const batch = orgIds.slice(i, i + BATCH);
      const scores = await Promise.all(batch.map(id => getOrgLatestScore(id)));
      batch.forEach((id, idx) => { result[id] = scores[idx]; });
      if (i + BATCH < orgIds.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }
    return result;
  }
}

/** Dashboard global ESG scores du tenant. */
export async function getScoringDashboard(): Promise<ScoringDashboard | null> {
  try {
    const r = await api.get<ScoringDashboard>('/esg-scoring/dashboard');
    return r.data;
  } catch {
    return null;
  }
}

/** Calcule le rating à partir d'un score numérique (déjà arrondi). */
export function scoreToRating(score: number): string {
  if (score >= 80) return 'AA';
  if (score >= 70) return 'A';
  if (score >= 60) return 'BBB';
  if (score >= 50) return 'BB';
  if (score >= 40) return 'B';
  return 'C';
}
