import { describe, it, expect } from 'vitest'
import page from '../pages/Validation/ValidationWorkflow.tsx?raw'
import fr from '../i18n/locales/fr.json?raw'
import en from '../i18n/locales/en.json?raw'

describe('Workflow de validation', () => {
  it("ne promet ni conformité ISAE 3000 / CSRD Art. 29a, ni « signature électronique », ni immutabilité", () => {
    expect(page).not.toMatch(/ISAE|Art\. 29a|preuve légale|immuable|Signature électronique \(SHA|signature électronique appliquée/i)
    expect(page).toContain("pas une signature électronique qualifiée")
  })
  it('liste les brouillons et permet de les soumettre', () => {
    expect(page).toContain("api.get('/validation/drafts')")
    expect(page).toContain("api.post('/validation/submit-for-review'")
  })
  it('exige un motif de refus et masque la validation de ses propres saisies', () => {
    expect(page).toContain('rejectNotes.trim().length < 3')
    expect(page).toContain('can_approve')
  })
  it('affiche le nom de l\'indicateur et non seulement son identifiant', () => {
    expect(page).toContain('indicator_name')
  })
  it("n'annonce pas de notification inexistante au refus", () => {
    expect(fr).not.toContain("notifiera le soumetteur")
    expect(en).not.toContain("will notify the submitter")
  })
})
