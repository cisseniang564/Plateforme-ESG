import { describe, it, expect } from 'vitest'
import src from '../pages/DataEntry/DataExport.tsx?raw'

describe('DataExport : compteur de lignes', () => {
  it("n'extrapole plus un nombre approximatif", () => {
    expect(src).not.toContain('Math.round(count *')
    expect(src).not.toMatch(/~\{estimatedCount/)
  })
  it('masque le compteur dès qu\'un filtre statut ou année est actif', () => {
    expect(src).toMatch(/if \(!stats \|\| status \|\| year\) return null/)
  })
})
