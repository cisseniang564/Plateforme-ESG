// Exemple de démonstration : client, questions ET réponses fictifs, pour montrer le rendu du pré-remplissage.
import type { QDetail } from '@/services/questionnaireService';

export const Q_EXAMPLE_ID = 'example';

export const Q_EXAMPLE: QDetail = {
  id: Q_EXAMPLE_ID,
  title: 'Questionnaire fournisseur RSE (exemple)',
  client_name: 'Client Exemple (fictif)',
  status: 'ready',
  created_at: null,
  counts: { total: 5, validated: 1, prefilled: 2, to_complete: 2 },
  questions: [
    { id: 'e1', section: 'Climat', text: 'Avez-vous réalisé un bilan de gaz à effet de serre ?', answer_type: 'yes_no', answer: 'Oui', status: 'validated', confidence: 'high',
      sources: [{ label: 'Bilan GES', value: 'Réalisé', period: '2024', verified: true }] },
    { id: 'e2', section: 'Climat', text: 'Quelles sont vos émissions de scope 1 et 2 (tCO2e) ?', answer_type: 'number', answer: 'Scope 1 : 120 tCO2e ; scope 2 : 85 tCO2e (exemple)', status: 'prefilled', confidence: 'high',
      sources: [{ label: 'Émissions scope 1', value: '120', unit: 'tCO2e', period: '2024', verified: true }, { label: 'Émissions scope 2', value: '85', unit: 'tCO2e', period: '2024', verified: false }] },
    { id: 'e3', section: 'Social', text: 'Quel est votre effectif total ?', answer_type: 'number', answer: '48 salariés (exemple)', status: 'prefilled', confidence: 'medium',
      sources: [{ label: 'Effectif total', value: '48', unit: 'salariés', period: '2024', verified: false }], note: 'Valeur saisie mais non vérifiée : confirmez-la avant envoi.' },
    { id: 'e4', section: 'Social', text: 'Quel est votre taux de fréquence des accidents du travail ?', answer_type: 'number', answer: null, status: 'to_complete', confidence: null, sources: [] },
    { id: 'e5', section: 'Gouvernance', text: 'Disposez-vous d\'un code de conduite anticorruption ?', answer_type: 'yes_no', answer: null, status: 'to_complete', confidence: null, sources: [] },
  ],
};
