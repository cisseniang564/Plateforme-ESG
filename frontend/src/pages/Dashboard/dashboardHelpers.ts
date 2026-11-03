// Logique pure de l'accueil (testée dans src/tests/dashboardHelpers.test.ts).
// Principe : tout ce qui s'affiche vient de données réelles ; rien n'est complété par une valeur de repli.

export interface EsrsSection { code: string; label: string; pct: number }
export type Level = 'covered' | 'partial' | 'missing';

/** Niveau de couverture d'une norme ESRS : couvert (70 % et plus), partiel (20 à 69 %), non couvert. */
export function esrsLevel(pct: number): Level {
  if (pct >= 70) return 'covered';
  if (pct >= 20) return 'partial';
  return 'missing';
}

/** Code court d'une norme : « ESRS E1 » devient « E1 », mais « ESRS 2 » reste « ESRS 2 » (« 2 » seul ne dirait rien). */
export function shortCode(code: string): string {
  const c = String(code).trim();
  return /^ESRS\s*\d/i.test(c) ? c.replace(/^ESRS\s*/i, 'ESRS ') : c.replace(/^ESRS\s*/i, '');
}

/** Couverture moyenne des normes analysées, ou null si l'analyse n'est pas disponible. */
export function esrsAverage(sections: EsrsSection[] | null): number | null {
  if (!sections || sections.length === 0) return null;
  return Math.round(sections.reduce((a, s) => a + s.pct, 0) / sections.length);
}

export type ActionTone = 'danger' | 'warning' | 'info';
export interface NextAction { id: string; tone: ActionTone; title: string; why: string; to: string }

interface OrgLike { overall_score?: number | null }

/**
 * « Prochaines actions » : jusqu'à 3 lignes, classées par urgence, déduites des données réelles.
 * 1) organisations sans score  2) normes ESRS les moins couvertes (de la plus basse)  3) organisations sous le seuil.
 */
export function buildNextActions(orgs: OrgLike[], esrs: EsrsSection[] | null, threshold = 45): NextAction[] {
  const out: NextAction[] = [];
  const unscored = orgs.filter(o => o.overall_score == null).length;
  if (unscored > 0) {
    out.push({
      id: 'unscored', tone: 'info',
      title: unscored === 1 ? 'Calculer le score d’une organisation' : `Calculer le score de ${unscored} organisations`,
      why: 'Saisissez ou importez des données pour obtenir un premier score.', to: '/app/data-entry',
    });
  }
  const weak = [...(esrs ?? [])].filter(s => s.pct < 50).sort((a, b) => a.pct - b.pct);
  for (const s of weak.slice(0, 2)) {
    const code = shortCode(s.code);
    out.push({
      id: `esrs-${code}`, tone: s.pct < 20 ? 'danger' : 'warning',
      title: `Compléter la norme ${code.startsWith('ESRS') ? code : 'ESRS ' + code}`,
      why: `${s.label} : couverture à ${s.pct} %.`, to: '/app/esrs-gap',
    });
  }
  const low = orgs.filter(o => o.overall_score != null && (o.overall_score as number) < threshold).length;
  if (low > 0) {
    out.push({
      id: 'low', tone: 'danger',
      title: low === 1 ? 'Renforcer une organisation sous le seuil' : `Renforcer ${low} organisations sous le seuil`,
      why: `Score inférieur à ${threshold} / 100.`, to: '/app/organizations',
    });
  }
  return out.slice(0, 3);
}

/** Écart à l'objectif d'un pilier, en points (négatif = en dessous). */
export function gapToTarget(score: number, target = 75): number {
  return Math.round(score - target);
}

/** Tendance entre les deux derniers points de l'historique, ou null s'il y en a moins de deux. */
export function trend(history: { global: number }[]): number | null {
  if (history.length < 2) return null;
  return history[history.length - 1].global - history[history.length - 2].global;
}
