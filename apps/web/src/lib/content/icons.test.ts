import { describe, it, expect } from 'vitest';
import { ICON_META, ICON_KEYS, resolveIcon } from './icons';

describe('ICON_META', () => {
  it('defines a PNG for every key', () => {
    expect(ICON_KEYS.length).toBeGreaterThan(0);
    for (const key of ICON_KEYS) {
      expect(ICON_META[key].file).toMatch(/^[a-z0-9_]+\.png$/);
    }
  });

  it('uses a unique file per icon', () => {
    const files = ICON_KEYS.map((key) => ICON_META[key].file);
    expect(new Set(files).size).toBe(files.length);
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

  it('has a PNG for resources but none for `reach`', () => {
    expect(resolveIcon('water').file).toBe('water.png');
    expect(resolveIcon('reach').file).toBeNull();
  });
});
