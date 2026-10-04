import { describe, it, expect } from 'vitest';
import { EVEN_GROW_MM, REACH_SECTORS, REACH_START, SECTOR_GROW_MM } from '@mycosurge/config';
import { createInitialState } from './state';
import type { HostPlacement } from './network';
import { getHostVisibility } from './network';
import {
  canGrowEvenly,
  canGrowSector,
  getCoverage,
  getEvenCost,
  getGrowCost,
  getMaxReach,
  getSectorDepths,
  growEvenly,
  growSector,
  sectorCentres,
  sectorIndexForAngle,
} from './sectors';

function activeState() {
  const state = createInitialState();
  state.gamePhase = 'active';
  state.mycelialNetwork = REACH_START;
  state.biomass = 10_000;
  return state;
}

describe('sector geometry', () => {
  it('maps angles to wedges', () => {
    expect(sectorIndexForAngle(0)).toBe(0);
    expect(sectorIndexForAngle(Math.PI * 2 - 0.01)).toBe(REACH_SECTORS - 1);
    expect(sectorIndexForAngle(-0.01)).toBe(REACH_SECTORS - 1);
  });

  it('reports a uniform circle as equal depths', () => {
    const state = activeState();
    state.mycelialNetwork = 10;
    expect(getSectorDepths(state)).toEqual(Array(REACH_SECTORS).fill(10));
    expect(getMaxReach(state)).toBe(10);
    expect(getCoverage(state)).toBe(5);
  });
});

describe('growing a wedge', () => {
  it('deepens only the chosen wedge and raises max reach', () => {
    const state = activeState();
    const result = growSector(state, 2);
    expect(result.success).toBe(true);
    expect(result.cost).toBe(getGrowCost(activeState()));
    const depths = getSectorDepths(state);
    expect(depths[2]).toBeCloseTo(REACH_START + SECTOR_GROW_MM);
    expect(depths[0]).toBeCloseTo(REACH_START);
    expect(getMaxReach(state)).toBeCloseTo(REACH_START + SECTOR_GROW_MM);
    // Coverage rises by the step spread over every wedge.
    expect(getCoverage(state)).toBeCloseTo(SECTOR_GROW_MM / REACH_SECTORS);
  });

  it('refuses when Biomass is short', () => {
    const state = activeState();
    state.biomass = 0;
    expect(canGrowSector(state, 0)).toBe(false);
    expect(growSector(state, 0).success).toBe(false);
  });

  it('charges the same per mm for wedge and even growth', () => {
    const state = activeState();
    const unit = getGrowCost(state);
    const evenMm = EVEN_GROW_MM * REACH_SECTORS;
    expect(Math.abs(getEvenCost(state) - unit * evenMm)).toBeLessThanOrEqual(0.5);
  });
});

describe('growing evenly', () => {
  it('nudges every wedge and charges proportionally', () => {
    const state = activeState();
    const unit = getGrowCost(state);
    expect(getEvenCost(state)).toBe(Math.round(unit * EVEN_GROW_MM * REACH_SECTORS));
    expect(canGrowEvenly(state)).toBe(true);

    const result = growEvenly(state);
    expect(result.success).toBe(true);
    for (const depth of getSectorDepths(state)) {
      expect(depth).toBeCloseTo(REACH_START + EVEN_GROW_MM);
    }
    expect(getMaxReach(state)).toBeCloseTo(REACH_START + EVEN_GROW_MM);
  });
});

describe('per-sector visibility', () => {
  function placement(angle: number, distanceMm: number): HostPlacement {
    return {
      id: 'host-x',
      hostId: 'fallen_leaf',
      tier: 1,
      isBoss: false,
      angle,
      distanceMm,
      x: Math.cos(angle) * distanceMm,
      y: Math.sin(angle) * distanceMm,
    };
  }

  it('uses the depth of the host’s own wedge', () => {
    const depths = [8, 5, 5, 5, 5, 5];
    const catalogued = new Set<string>();
    const centres = sectorCentres();
    // Sector 0 is deep: a 6mm host there is encountered.
    expect(getHostVisibility(placement(centres[0], 6), depths, catalogued)).toBe('encountered');
    // Sector 1 is shallow: the same distance is only sensed.
    expect(getHostVisibility(placement(centres[1], 6), depths, catalogued)).toBe('sensed');
  });
});
