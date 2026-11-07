import { describe, it, expect } from 'vitest'
import notice from '../pages/Legal/LegalNotice.tsx?raw'

// Tant que la société n'est pas immatriculée et la forme choisie, rien n'est affirmé :
// les champs restent à compléter et visibles (surlignés).
describe('Mentions légales : pas d\'affirmation non vérifiée', () => {
  it('forme juridique et capital sont à renseigner', () => {
    expect(notice).toMatch(/Forme juridique :<\/strong> <mark>\[À renseigner\]/)
    expect(notice).toMatch(/Capital social :<\/strong> <mark>\[À renseigner\]/)
  })
  it('ne prétend pas que les marques sont déposées', () => {
    expect(notice).not.toContain('marques\n              déposées')
    expect(notice).not.toMatch(/déposées/)
    expect(notice).not.toContain('L.335-2')
  })
})
