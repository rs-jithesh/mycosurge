import { describe, it, expect } from 'vitest';
import { SYSTEM_META } from './systems';

const SYSTEM_IDS = ['radar', 'evolution', 'expeditions'] as const;

describe('SYSTEM_META', () => {
  it('describes every revealable system', () => {
    expect(Object.keys(SYSTEM_META).sort()).toEqual([...SYSTEM_IDS].sort());
    for (const id of SYSTEM_IDS) {
      const meta = SYSTEM_META[id];
      expect(meta.id).toBe(id);
      expect(meta.route.length).toBeGreaterThan(0);
      expect(meta.name.length).toBeGreaterThan(0);
      expect(meta.blurb.length).toBeGreaterThan(0);
      expect(meta.toast.length).toBeGreaterThan(0);
    }
  });

  it('gives each system a distinct route', () => {
    const routes = SYSTEM_IDS.map((id) => SYSTEM_META[id].route);
    expect(new Set(routes).size).toBe(routes.length);
  });
});
