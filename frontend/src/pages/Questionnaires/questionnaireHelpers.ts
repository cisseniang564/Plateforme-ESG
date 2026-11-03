// Logique pure de la page Questionnaires (testée dans src/tests/questionnaireHelpers.test.ts).
import type { QQuestion, QSource, QStatus } from '@/services/questionnaireService';

export type Draft = { answer: string; status: QStatus };
export type Drafts = Record<string, Draft>;
export type Step = 1 | 2 | 3 | 4;

export interface Counts { total: number; validated: number; prefilled: number; to_complete: number }

/** Réponse en cours d'édition si elle existe, sinon celle du serveur. */
export function effectiveOf(q: QQuestion, drafts: Drafts): Draft {
  return drafts[q.id] ?? { answer: q.answer ?? '', status: q.status };
}

export function countStatuses(questions: QQuestion[], drafts: Drafts): Counts {
  const c: Counts = { total: questions.length, validated: 0, prefilled: 0, to_complete: 0 };
  for (const q of questions) c[effectiveOf(q, drafts).status] += 1;
  return c;
}

/**
 * Étape en cours, déduite de l'état réel (aucun champ supplémentaire côté serveur) :
 * 2 = lecture et pré-remplissage ; 3 = relecture ; 4 = tout est validé, export possible.
 */
export function currentStep(status: 'processing' | 'ready' | 'failed', counts: Counts): Step {
  if (status === 'processing') return 2;
  if (status === 'failed') return 2;
  if (counts.total > 0 && counts.validated === counts.total) return 4;
  return 3;
}

/** Part de réponses déjà préparées (validées ou pré-remplies), en pourcentage entier. */
export function preparedPercent(c: Counts): number {
  return c.total ? Math.round(((c.validated + c.prefilled) / c.total) * 100) : 0;
}

/** Prochaine question à traiter après `fromId` (à relire ou à compléter), en repartant du début si besoin. */
export function nextUnresolvedId(questions: QQuestion[], drafts: Drafts, fromId: string | null): string | null {
  const open = (q: QQuestion) => effectiveOf(q, drafts).status !== 'validated';
  const start = fromId ? questions.findIndex(q => q.id === fromId) : -1;
  for (let i = 1; i <= questions.length; i += 1) {
    const q = questions[(start + i) % questions.length];
    if (q && q.id !== fromId && open(q)) return q.id;
  }
  return null;
}

export type Confidence = 'high' | 'medium' | 'low' | null;
export function confidenceLabel(c: Confidence): { text: string; tone: 'ok' | 'warn' | 'bad' } | null {
  if (c === 'high') return { text: 'Confiance élevée', tone: 'ok' };
  if (c === 'medium') return { text: 'Confiance moyenne', tone: 'warn' };
  if (c === 'low') return { text: 'Confiance faible', tone: 'bad' };
  return null;
}

/** Lien vers la donnée d'origine : la page Collecte, filtrée sur l'indicateur cité. */
export function sourceLink(src: Pick<QSource, 'label'>): string {
  return `/app/data-entry?search=${encodeURIComponent(src.label)}`;
}

/** Y a-t-il des modifications non enregistrées ? */
export function isDirty(questions: QQuestion[], drafts: Drafts): boolean {
  return questions.some(q => {
    const d = drafts[q.id];
    return !!d && (d.answer !== (q.answer ?? '') || d.status !== q.status);
  });
}
