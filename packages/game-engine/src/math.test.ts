import { describe, it, expect } from 'vitest';
import {
  getResourceProduction,
  getEffectiveMaxBiomass,
  getEffectiveBiomassPerSec,
  isStarving,
  tickIdle,
  enterTrauma,
  expandBiomassCap,
  getCapExpandCost,
  expandCap,
  getUpkeepRate,
  getResourceDrain,
  getNetResourceRate,
} from './math';
import { getGeneratorCost, UPKEEP_PER_REACH } from '@mycosurge/config';
import { createInitialState, type GameState } from './state';
import { setReachMm } from './sectors';

describe('getResourceProduction', () => {
  it('returns 0 with no generators installed', () => {
    const state = createInitialState();
    expect(getResourceProduction(state, 'nutrients')).toBe(0);
    expect(getResourceProduction(state, 'water')).toBe(0);
  });

  it('scales with the pool generator level', () => {
    const state = createInitialState();
    state.generators = { osmotic_pump: 2 };
    expect(getResourceProduction(state, 'water')).toBe(2);
  });
});

describe('getEffectiveMaxBiomass', () => {
  it('returns base max with no skills', () => {
    const state = createInitialState();
    expect(getEffectiveMaxBiomass(state)).toBe(100);
  });

  it('grows when the biomass cap is expanded with Lysate', () => {
    const state = createInitialState();
    state.lysateBanked = 100;
    expect(expandBiomassCap(state)).toBe(true);
    expect(state.maxBiomass).toBe(150);
    expect(getEffectiveMaxBiomass(state)).toBe(150);
  });

  it('grows with network reach beyond the starting depth', () => {
    const state = createInitialState();
    setReachMm(state, 20);
    // 100 base + 24 per mm × (20 − 5) = 460
    expect(getEffectiveMaxBiomass(state)).toBe(460);
  });
});

describe('getGeneratorCost', () => {
  it('uses the provided cost scale', () => {
    expect(getGeneratorCost(5, 0, 2)).toBe(5);
    expect(getGeneratorCost(5, 1, 2)).toBe(10);
    expect(getGeneratorCost(5, 2, 2)).toBe(20);
  });

  it('defaults to a 1.5 scale', () => {
    expect(getGeneratorCost(5, 1)).toBe(7);
  });
});

describe('getEffectiveBiomassPerSec', () => {
  it('returns 0 during trauma', () => {
    const state = createInitialState();
    state.isInTrauma = true;
    expect(getEffectiveBiomassPerSec(state)).toBe(0);
  });

  it('returns base rate with no modifiers', () => {
    const state = createInitialState();
    expect(getEffectiveBiomassPerSec(state)).toBe(0.5);
  });
});

describe('reach upkeep', () => {
  it('is not charged before the full game', () => {
    const state = createInitialState();
    setReachMm(state, 20);
    expect(getUpkeepRate(state, 'water')).toBe(0);
    expect(getUpkeepRate(state, 'nutrients')).toBe(0);
  });

  it('scales with reach in the full game', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    setReachMm(state, 10);
    expect(getUpkeepRate(state, 'water')).toBeCloseTo(UPKEEP_PER_REACH * 10);
    expect(getUpkeepRate(state, 'nutrients')).toBeCloseTo(UPKEEP_PER_REACH * 10);
  });

  it('adds reach upkeep to the baseline drain', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    setReachMm(state, 5);
    expect(getResourceDrain(state, 'water')).toBeCloseTo(0.8 + UPKEEP_PER_REACH * 5);
  });

  it('drags net production negative when reach outruns income', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    setReachMm(state, 35);
    state.generators = { osmotic_pump: 1 };
    expect(getNetResourceRate(state, 'water')).toBeLessThan(0);
  });
});

describe('isStarving', () => {
  it('is true when either reserve is below the starvation-state threshold', () => {
    const state = createInitialState();
    state.water = 4;
    state.nutrients = 100;
    expect(isStarving(state)).toBe(true);
  });

  it('is false just above the threshold', () => {
    const state = createInitialState();
    state.water = 5;
    state.nutrients = 100;
    expect(isStarving(state)).toBe(false);
  });

  it('is false with healthy reserves', () => {
    const state = createInitialState();
    state.water = 100;
    state.nutrients = 100;
    expect(isStarving(state)).toBe(false);
  });
});

describe('starvation and passive growth', () => {
  it('halts passive growth in the full game while starving', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.water = 0;
    state.nutrients = 0;
    expect(getEffectiveBiomassPerSec(state)).toBe(0);
  });

  it('ignores starvation during the tutorial', () => {
    const state = createInitialState();
    expect(state.gamePhase).toBe('awakening');
    expect(getEffectiveBiomassPerSec(state)).toBe(0.5);
  });

  it('resumes once reserves recover', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.water = 100;
    state.nutrients = 100;
    expect(getEffectiveBiomassPerSec(state)).toBe(0.5);
  });
});

describe('tickIdle', () => {
  it('adds biomass over time', () => {
    const state = createInitialState();
    tickIdle(state, 10);
    expect(state.biomass).toBeCloseTo(5);
  });

  it('does not exceed max biomass', () => {
    const state = createInitialState();
    tickIdle(state, 1000);
    expect(state.biomass).toBeLessThanOrEqual(100);
  });

  it('preserves rewards that arrived above the cap', () => {
    const state = createInitialState();
    state.biomass = 137;
    tickIdle(state, 1);
    expect(state.biomass).toBe(137);
  });

  it('counts trauma timer down', () => {
    const state = createInitialState();
    enterTrauma(state);
    expect(state.isInTrauma).toBe(true);
    expect(state.traumaTimer).toBe(30);

    tickIdle(state, 10);
    expect(state.traumaTimer).toBeCloseTo(20);
  });

  it('clears trauma when timer hits 0', () => {
    const state = createInitialState();
    state.isInTrauma = true;
    state.traumaTimer = 5;
    tickIdle(state, 10);
    expect(state.isInTrauma).toBe(false);
    expect(state.traumaTimer).toBe(0);
  });

  it('does not generate biomass during trauma', () => {
    const state = createInitialState();
    state.isInTrauma = true;
    tickIdle(state, 10);
    expect(state.biomass).toBe(0);
  });
});

describe('expandCap', () => {
  it('expands each resource through the shared helper', () => {
    const state = createInitialState();
    state.lysateBanked = 100;
    expect(getCapExpandCost(state, 'water')).toBe(3);
    expect(expandCap(state, 'water')).toBe(true);
    expect(state.waterCap).toBe(150);
    expect(expandCap(state, 'nutrients')).toBe(true);
    expect(state.nutrientsCap).toBe(150);
    expect(expandCap(state, 'biomass')).toBe(true);
    expect(state.maxBiomass).toBe(150);
  });
});

describe('enterTrauma', () => {
  it('sets trauma state with full duration', () => {
    const state = createInitialState();
    enterTrauma(state);
    expect(state.isInTrauma).toBe(true);
    expect(state.traumaTimer).toBe(30);
  });

  it('resets shield hits', () => {
    const state = createInitialState();
    state.combatStats.shieldHits = 3;
    enterTrauma(state);
    expect(state.combatStats.shieldHits).toBe(0);
  });
});
