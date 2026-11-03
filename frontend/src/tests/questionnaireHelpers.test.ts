import { describe, expect, it } from 'vitest';
import {
  confidenceLabel, countStatuses, currentStep, effectiveOf, isDirty, nextUnresolvedId, preparedPercent, sourceLink,
} from '@/pages/Questionnaires/questionnaireHelpers';
import type { QQuestion } from '@/services/questionnaireService';

const Q = (id: string, status: QQuestion['status'], answer: string | null = 'x'): QQuestion =>
  ({ id, text: id, answer_type: 'text', answer, status, confidence: 'high', sources: [] });
const QS = [Q('a', 'validated'), Q('b', 'prefilled'), Q('c', 'to_complete', null), Q('d', 'prefilled')];

describe('comptage et progression', () => {
  it('compte par statut, en tenant compte des brouillons', () => {
    expect(countStatuses(QS, {})).toEqual({ total: 4, validated: 1, prefilled: 2, to_complete: 1 });
    expect(countStatuses(QS, { b: { answer: 'x', status: 'validated' } })).toMatchObject({ validated: 2, prefilled: 1 });
  });
  it('« préparées » = validées + pré-remplies', () => {
    expect(preparedPercent({ total: 4, validated: 1, prefilled: 2, to_complete: 1 })).toBe(75);
    expect(preparedPercent({ total: 0, validated: 0, prefilled: 0, to_complete: 0 })).toBe(0);
  });
  it('un brouillon prend le pas sur la valeur du serveur', () => {
    expect(effectiveOf(QS[1], { b: { answer: 'y', status: 'validated' } })).toEqual({ answer: 'y', status: 'validated' });
    expect(effectiveOf(QS[2], {})).toEqual({ answer: '', status: 'to_complete' });
  });
});

describe('étape en cours (déduite, sans champ serveur)', () => {
  const c = (validated: number, total = 4) => ({ total, validated, prefilled: total - validated, to_complete: 0 });
  it('traitement ou échec : étape 2', () => {
    expect(currentStep('processing', c(0))).toBe(2);
    expect(currentStep('failed', c(0))).toBe(2);
  });
  it('relecture tant qu’il reste des réponses non validées', () => expect(currentStep('ready', c(3))).toBe(3));
  it('export quand tout est validé', () => expect(currentStep('ready', c(4))).toBe(4));
  it('un questionnaire sans question reste en relecture', () => expect(currentStep('ready', c(0, 0))).toBe(3));
});

describe('navigation entre questions', () => {
  it('passe à la prochaine question non validée, puis reboucle', () => {
    expect(nextUnresolvedId(QS, {}, 'b')).toBe('c');
    expect(nextUnresolvedId(QS, {}, 'd')).toBe('b');
  });
  it('ignore ce qui vient d’être validé', () => {
    expect(nextUnresolvedId(QS, { c: { answer: 'z', status: 'validated' } }, 'b')).toBe('d');
  });
  it('null quand tout est validé', () => {
    const all = Object.fromEntries(QS.map(q => [q.id, { answer: 'x', status: 'validated' as const }]));
    expect(nextUnresolvedId(QS, all, 'a')).toBeNull();
  });
});

describe('confiance, source, modifications', () => {
  it('libellés de confiance', () => {
    expect(confidenceLabel('high')).toEqual({ text: 'Confiance élevée', tone: 'ok' });
    expect(confidenceLabel('low')?.tone).toBe('bad');
    expect(confidenceLabel(null)).toBeNull();
  });
  it('le lien de source ouvre la collecte filtrée sur l’indicateur', () => {
    expect(sourceLink({ label: 'Émissions Scope 1' })).toBe('/app/data-entry?search=%C3%89missions%20Scope%201');
  });
  it('détecte les modifications non enregistrées', () => {
    expect(isDirty(QS, {})).toBe(false);
    expect(isDirty(QS, { b: { answer: 'x', status: 'prefilled' } })).toBe(false);
    expect(isDirty(QS, { b: { answer: 'x', status: 'validated' } })).toBe(true);
  });
});
