import { describe, expect, it } from 'vitest';
import { TERMS_MD } from '@/pages/Legal/termsContent';

describe('CGU/CGV v2', () => {
  it('contient les 16 articles, dans l\'ordre', () => {
    const titles = [...TERMS_MD.matchAll(/^### Article (\d+) ·/gm)].map((m) => Number(m[1]));
    expect(titles).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });
  it('ne promet pas ce que le produit ne fait pas : OpenAI est cité comme sous-traitant', () => {
    expect(TERMS_MD).toContain('OpenAI');
    expect(TERMS_MD).not.toMatch(/aucun appel (à|au) (un )?mod[eè]le/i);
  });
});
