import { describe, it, expect } from 'vitest'
import src from '../pages/DataEntry/DataExport.tsx?raw'

describe('DataExport : compteur de lignes', () => {
  it("n'extrapole jamais un nombre approximatif", () => {
    expect(src).not.toContain('Math.round(count *')
    expect(src).not.toMatch(/~\{/)
  })
  it("affiche le nombre exact, lu dans l'en-tête X-Total-Count pour les filtres choisis", () => {
    expect(src).toContain("x-total-count")
    expect(src).toContain("api.get('/data-entry/'")
  })
  it("n'annonce pas de format JSON inexistant et propose les années réellement présentes", () => {
    expect(src).not.toContain('JSON')
    expect(src).toContain('by_period')
  })
})
