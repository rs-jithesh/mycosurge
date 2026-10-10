import { describe, it, expect } from 'vitest';
import { ICON_META, ICON_KEYS, resolveIcon } from './icons';

describe('ICON_META', () => {
  it('defines a glyph, label and tone for every key', () => {
    expect(ICON_KEYS.length).toBeGreaterThan(0);
    for (const key of ICON_KEYS) {
      const meta = ICON_META[key];
      expect(meta.glyph.length).toBeGreaterThan(0);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(['mint', 'amber', 'coral', 'cyan', 'violet']).toContain(meta.tone);
    }
  });
});

describe('resolveIcon', () => {
  it('resolves registry keys and resources to a glyph, label and tone', () => {
    for (const name of [...ICON_KEYS, 'reach'] as const) {
      const icon = resolveIcon(name);
      expect(icon.glyph.length).toBeGreaterThan(0);
      expect(icon.label.length).toBeGreaterThan(0);
      expect(['mint', 'amber', 'coral', 'cyan', 'violet']).toContain(icon.tone);
    }
  });

  it('takes resource glyphs from RESOURCES', () => {
    expect(resolveIcon('water').glyph).toBe('ψ');
    expect(resolveIcon('reach').glyph).toBe('μ');
  });
});
