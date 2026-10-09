import { describe, it, expect } from 'vitest';
import { EXPANSION_MAP } from '@mycosurge/config';
import { createInitialState } from './state';
import type { RadarContact } from './state';
import {
  mulberry32,
  generateNetwork,
  generateHostPlacements,
  getHostVisibility,
  getFirstContact,
  getContactMarkers,
  catalogueHost,
  isCatalogued,
} from './network';

describe('mulberry32', () => {
  it('is deterministic and stays in [0,1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('generateNetwork', () => {
  it('produces identical geometry for the same seed', () => {
    expect(generateNetwork(1234)).toEqual(generateNetwork(1234));
  });

  it('produces different geometry for a different seed', () => {
    const a = generateNetwork(1).segments.map((s) => `${s.x2.toFixed(3)},${s.y2.toFixed(3)}`);
    const b = generateNetwork(2).segments.map((s) => `${s.x2.toFixed(3)},${s.y2.toFixed(3)}`);
    expect(a).not.toEqual(b);
  });

  it('stays within the segment cap and has sane values', () => {
    const geometry = generateNetwork(99);
    expect(geometry.segments.length).toBeGreaterThan(0);
    expect(geometry.segments.length).toBeLessThanOrEqual(EXPANSION_MAP.maxSegments);
    for (const segment of geometry.segments) {
      expect(Number.isFinite(segment.endMm)).toBe(true);
      expect(segment.width).toBeGreaterThan(0);
      expect(segment.depth).toBeLessThanOrEqual(EXPANSION_MAP.maxForkDepth);
    }
  });

  it('generates band-local geometry that fills the band', () => {
    for (const stage of [1, 3, 6]) {
      const geometry = generateNetwork(7, stage);
      const furthest = Math.max(...geometry.segments.map((s) => s.endMm));
      expect(geometry.maxMm).toBeGreaterThan(0);
      expect(furthest).toBeLessThanOrEqual(geometry.maxMm * 1.05);
      expect(furthest).toBeGreaterThan(geometry.maxMm * 0.7);
    }
  });
});

describe('generateHostPlacements', () => {
  it('is deterministic for the same seed', () => {
    expect(generateHostPlacements(555)).toEqual(generateHostPlacements(555));
  });

  it('places every non-tutorial host inside its own stage band', () => {
    const placements = generateHostPlacements(555);
    expect(placements.map((p) => p.hostId)).not.toContain('soil_nematode');
    const stage1 = placements.filter((p) => p.stage === 1);
    expect(stage1.length).toBeGreaterThan(0);
    for (const placement of stage1) {
      expect(placement.distanceMm).toBeGreaterThan(5);
      expect(placement.distanceMm).toBeLessThan(10);
    }
  });

  it('populates every stage band', () => {
    const placements = generateHostPlacements(555);
    for (let stage = 1; stage <= 8; stage++) {
      expect(placements.some((p) => p.stage === stage)).toBe(true);
    }
  });
});

describe('host visibility', () => {
  const catalogued = new Set<string>();
  const placement = {
    id: 'host-x',
    hostId: 'bacterial_film',
    stage: 1,
    isBoss: false,
    angle: 0,
    distanceMm: 6,
    localMm: 1,
    x: 1,
    y: 0,
  };

  it('resolves catalogued > encountered > sensed > hidden', () => {
    expect(getHostVisibility(placement, 10, new Set(['bacterial_film']))).toBe('catalogued');
    expect(getHostVisibility(placement, 10, catalogued)).toBe('encountered');
    expect(getHostVisibility(placement, 5, catalogued)).toBe('sensed');
    expect(getHostVisibility(placement, 1, catalogued)).toBe('hidden');
  });
});

describe('catalogue + first contact', () => {
  it('catalogues a host once and ignores the tutorial host', () => {
    const state = createInitialState();
    catalogueHost(state, 'bacterial_film');
    catalogueHost(state, 'bacterial_film');
    catalogueHost(state, 'soil_nematode');
    expect(state.cataloguedHosts).toEqual(['bacterial_film']);
    expect(isCatalogued(state, 'bacterial_film')).toBe(true);
    expect(isCatalogued(state, 'soil_nematode')).toBe(false);
  });

  it('offers the nearest uncatalogued host as first contact once in reach', () => {
    const state = createInitialState();
    state.mycelialNetwork = 5;
    const placements = generateHostPlacements(555);
    // At the starting 5 mm every host is still only sensed.
    expect(getFirstContact(state, placements)).toBeNull();

    // Extending past the stage-1 host distances makes the nearest one encountered.
    state.mycelialNetwork = 9;
    const first = getFirstContact(state, placements);
    expect(first).not.toBeNull();
    expect(first!.distanceMm).toBeLessThanOrEqual(9);

    catalogueHost(state, first!.hostId);
    const next = getFirstContact(state, placements);
    expect(next?.hostId).not.toBe(first!.hostId);
  });
});

function makeContact(
  id: string,
  hostId: string,
  overrides: Partial<RadarContact> = {},
): RadarContact {
  return {
    id,
    hostId,
    strainId: 'normal',
    revealed: false,
    timeRemaining: 60,
    totalTime: 120,
    ...overrides,
  };
}

describe('contact markers', () => {
  const placements = generateHostPlacements(555);

  it('places a contact at its species location', () => {
    const markers = getContactMarkers([makeContact('contact-1', 'bacterial_film')], placements);
    const placement = placements.find((p) => p.hostId === 'bacterial_film')!;
    expect(markers).toHaveLength(1);
    expect(markers[0].distanceMm).toBeCloseTo(placement.distanceMm);
    expect(markers[0].revealed).toBe(false);
  });

  it('fans out repeated species and skips unknown hosts', () => {
    const markers = getContactMarkers(
      [
        makeContact('contact-1', 'bacterial_film', { revealed: true }),
        makeContact('contact-2', 'bacterial_film'),
        makeContact('contact-3', 'not_a_host'),
      ],
      placements,
    );
    expect(markers).toHaveLength(2);
    expect(markers.map((m) => m.contactId)).toEqual(['contact-1', 'contact-2']);
    expect(markers[0].x).not.toBeCloseTo(markers[1].x);
    expect(markers[0].revealed).toBe(true);
  });
});
