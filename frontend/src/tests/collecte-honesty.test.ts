import { describe, it, expect } from 'vitest'
import imp from '../pages/DataEntry/ImportCSV.tsx?raw'
import myd from '../pages/DataEntry/MyDataDashboard.tsx?raw'
import entry from '../pages/DataEntry/DataEntryForm.tsx?raw'
import stats from '../pages/DataEntry/MyDataStatsDashboard.tsx?raw'
import { canImport, errorDetail, importTarget, sourceLabel } from '../pages/DataEntry/dataEntryHelpers'

describe('Pages Collecte', () => {
  it("ne revendiquent ni ISAE 3000, ni CSRD Art. 29a, ni « IA », ni révocation inexistante", () => {
    for (const src of [imp, myd, entry, stats]) {
      expect(src).not.toMatch(/ISAE|Art\. 29a|Auto IA|Automatique \(IA\)|révoquer/)
    }
    expect(imp).not.toContain('facteur ADEME')
  })
  it('« Mes données » pagine côté serveur, exporte côté serveur et demande un motif de rejet', () => {
    expect(myd).toContain('x-total-count')
    expect(myd).toContain("api.get('/data-entry/export'")
    expect(myd).toContain('rejectReason.trim().length < 3')
    expect(myd).not.toContain('Rejeté depuis Mes données')
  })
  it("l'import envoie l'organisation du FEC sous le nom attendu par l'API et bloque le double envoi", () => {
    expect(imp).toContain("body.append('org_id', orgId)")
    expect(imp).toContain('if (!preview || busy) return')
  })
  it('la saisie accepte la valeur 0 et exporte avec la recherche affichée', () => {
    expect(entry).toContain("formData.value_numeric !== ''")
    expect(entry).toContain('params.search = search.trim()')
  })
})

describe('dataEntryHelpers (import, erreurs, origine)', () => {
  it('un import dédié ne réclame pas les colonnes Indicateur / Valeur', () => {
    expect(canImport('suppliers', {})).toBe(true)
    expect(canImport('generic', { metric_name: 'a' })).toBe(false)
    expect(canImport('generic', { metric_name: 'a', value_numeric: 'b' })).toBe(true)
    expect(canImport('inconnu', {})).toBe(false)
  })
  it('renvoie vers la bonne page selon la destination', () => {
    expect(importTarget('risks').path).toBe('/app/risks')
    expect(importTarget(undefined).path).toBe('/app/my-data')
    expect(importTarget('nimporte').path).toBe('/app/my-data')
  })
  it("rend lisible une erreur d'API, chaîne ou liste de validation", () => {
    expect(errorDetail({ response: { data: { detail: 'Non' } } }, 'x')).toBe('Non')
    expect(errorDetail({ response: { data: { detail: [{ msg: 'Value error, Pilier invalide.' }] } } }, 'x')).toBe('Pilier invalide.')
    expect(errorDetail(new Error('réseau'), 'Secours')).toBe('Secours')
  })
  it("nomme honnêtement l'origine « automatic »", () => {
    expect(sourceLabel('automatic')).toBe('Estimation sectorielle')
    expect(sourceLabel(null)).toBe('—')
    expect(sourceLabel('autre_chose')).toBe('autre_chose')
  })
})
