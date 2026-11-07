import { describe, it, expect } from 'vitest';
import src from '../pages/Analytics/IntelligenceDashboard.tsx?raw';

describe('IntelligenceDashboard — plus de simulation présentée comme réelle', () => {
  it("n'a plus d'OCR ni de facture fictive enregistrée dans le Bilan", () => {
    expect(src).not.toMatch(/simulateOCR|ocrResult|Transport Express|collection_method: 'ocr'/);
  });
  it("n'a plus de génération de rapport simulée", () => {
    expect(src).not.toMatch(/simulateGeneration|setReportGenerated|generatingReport/);
    expect(src).toContain('/app/reports/generate');
  });
  it('a retiré le simulateur à coefficients arbitraires', () => {
    expect(src).not.toMatch(/simBaseScore|simRenewable|activeTab === 'simulator'/);
  });
  it("n'invente plus de réponses de chatbot ni de données manquantes d'exemple", () => {
    expect(src).not.toMatch(/ESG_KB|getESGResponse|MISSING_DATA_EXAMPLES/);
    expect(src).toContain('CHAT_UNAVAILABLE');
  });
});
