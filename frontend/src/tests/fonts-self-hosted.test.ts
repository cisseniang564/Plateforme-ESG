import { describe, it, expect } from 'vitest';
import html from '../../index.html?raw';
import main from '../main.tsx?raw';
import tw from '../../tailwind.config.js?raw';

describe('Polices auto-hébergées (pas de requête vers Google)', () => {
  it('index.html sans Google Fonts', () => {
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });
  it('Inter est servie localement', () => {
    expect(main).toMatch(/@fontsource-variable\/inter/);
    expect(tw).toMatch(/'Inter Variable'/);
  });
});
