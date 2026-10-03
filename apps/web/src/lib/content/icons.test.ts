import { describe, it, expect } from 'vitest';
import { ICON_META, ICON_KEYS } from './icons';

describe('ICON_META', () => {
  it('defines metadata for every key', () => {
    expect(ICON_KEYS.length).toBeGreaterThan(0);
    for (const key of ICON_KEYS) {
      const meta = ICON_META[key];
      expect(meta.file).toMatch(/^[a-z0-9_]+\.png$/);
      expect(meta.glyph.length).toBeGreaterThan(0);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(['mint', 'amber', 'coral', 'cyan', 'violet']).toContain(meta.tone);
    }
  });

  it('uses a unique file per icon', () => {
    const files = ICON_KEYS.map((key) => ICON_META[key].file);
    expect(new Set(files).size).toBe(files.length);
  });
});
