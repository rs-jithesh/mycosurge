import { describe, it, expect } from 'vitest';
import {
  GENERATORS,
  getGeneratorCost,
  MAX_BIOMASS_BASE,
  REACH_START,
  UPKEEP_PER_REACH,
} from '@mycosurge/config';
import { createInitialState } from './state';
import type { GameState } from './state';
import {
  tickIdle,
  getNetResourceRate,
  getUpkeepRate,
  getResourceProduction,
  getEffectiveBiomassPerSec,
  getBiomassConverterOutput,
} from './math';
import { purchaseGenerator, isGeneratorUnlocked } from './generators';
import { manualSynthesize } from './manual';

const MINUTE = 60;
const HALF_HOUR = 30 * MINUTE;

function fullGameState(): GameState {
  const state = createInitialState();
  state.gamePhase = 'active';
  // A freshly-unlocked full game continues from the tutorial's reach.
  state.mycelialNetwork = REACH_START;
  state.water = state.waterCap * 0.6;
  state.nutrients = state.nutrientsCap * 0.6;
  return state;
}

/** Simulate `seconds` one-second ticks, letting `onTick` drive the player. */
function simulate(
  state: GameState,
  seconds: number,
  onTick?: (s: GameState, t: number) => void,
): void {
  for (let t = 0; t < seconds; t++) {
    tickIdle(state, 1);
    onTick?.(state, t);
  }
}

function buyCheapestGenerator(state: GameState): boolean {
  let bestId: string | null = null;
  let bestCost = Number.POSITIVE_INFINITY;
  for (const gen of GENERATORS) {
    if (!isGeneratorUnlocked(state, gen)) continue;
    const level = state.generators[gen.id] ?? 0;
    if (level >= gen.maxLevel) continue;
    const cost = getGeneratorCost(gen.baseCost, level, gen.costScale);
    const wallet = gen.costResource === 'lysate' ? state.lysateBanked : state.biomass;
    if (wallet < cost) continue;
    if (cost < bestCost) {
      bestCost = cost;
      bestId = gen.id;
    }
  }
  if (bestId === null) return false;
  return purchaseGenerator(state, bestId);
}

describe('reach upkeep', () => {
  it('charges per mm of reach at the full-game start', () => {
    const state = fullGameState();
    expect(getUpkeepRate(state, 'water')).toBeCloseTo(UPKEEP_PER_REACH * REACH_START);
    expect(getUpkeepRate(state, 'nutrients')).toBeCloseTo(UPKEEP_PER_REACH * REACH_START);
  });

  it('keeps an early single generator net-positive at the starting reach', () => {
    const state = fullGameState();
    state.generators = { osmotic_pump: 1 };
    // +1/s production − 0.8/s base − reach upkeep > 0
    expect(getNetResourceRate(state, 'water')).toBeGreaterThan(0);
  });

  it('needs more generators to hold a deeper network', () => {
    const shallow = fullGameState();
    shallow.generators = { osmotic_pump: 1 };

    const deep = fullGameState();
    deep.mycelialNetwork = 35;
    deep.generators = { osmotic_pump: 1 };

    expect(getNetResourceRate(deep, 'water')).toBeLessThan(getNetResourceRate(shallow, 'water'));
    expect(getNetResourceRate(deep, 'water')).toBeLessThan(0);

    // Two generators cover the deeper maintenance.
    deep.generators = { osmotic_pump: 3 };
    expect(getNetResourceRate(deep, 'water')).toBeGreaterThan(0);
  });

  it('reduces net production by exactly the reach drain', () => {
    const state = fullGameState();
    state.generators = { osmotic_pump: 4 };
    expect(getNetResourceRate(state, 'water')).toBeCloseTo(
      getResourceProduction(state, 'water') - 0.8 - UPKEEP_PER_REACH * REACH_START,
    );
  });
});

describe('generator cost curve', () => {
  const gen = GENERATORS[0];

  it('keeps the first eight purchase steps within the base Biomass cap', () => {
    for (let level = 0; level < 8; level++) {
      expect(getGeneratorCost(gen.baseCost, level, gen.costScale)).toBeLessThanOrEqual(
        MAX_BIOMASS_BASE,
      );
    }
  });

  it('only asks for cap expansion beyond that', () => {
    expect(getGeneratorCost(gen.baseCost, 8, gen.costScale)).toBeGreaterThan(MAX_BIOMASS_BASE);
  });
});

describe('30-minute balance simulation', () => {
  it('idle-only fills Biomass without draining reserves below zero', () => {
    const state = fullGameState();
    simulate(state, HALF_HOUR);

    expect(Number.isFinite(state.biomass)).toBe(true);
    expect(state.biomass).toBeGreaterThan(0);
    expect(state.biomass).toBeLessThanOrEqual(100 + 1e-6);
    expect(state.water).toBeGreaterThanOrEqual(0);
    expect(state.nutrients).toBeGreaterThanOrEqual(0);
  });

  it('upgrade-rush advances the network without stalling or exploding', () => {
    const state = fullGameState();
    state.water = state.waterCap;
    state.nutrients = state.nutrientsCap;

    let minBiomass = Number.POSITIVE_INFINITY;
    let earnedBeforeLastMinute = 0;

    simulate(state, HALF_HOUR, (s, t) => {
      manualSynthesize(s);
      buyCheapestGenerator(s);
      minBiomass = Math.min(minBiomass, s.biomass);
      if (t === HALF_HOUR - MINUTE - 1) earnedBeforeLastMinute = s.totalBiomassEarned;
    });

    const totalLevels = Object.values(state.generators).reduce((a, b) => a + b, 0);
    expect(totalLevels).toBeGreaterThanOrEqual(5);
    expect(minBiomass).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(state.biomass)).toBe(true);

    // The network is still producing income in the final minute — not stalled.
    expect(state.totalBiomassEarned - earnedBeforeLastMinute).toBeGreaterThan(0);
    expect(getNetResourceRate(state, 'water')).toBeGreaterThan(0);
    expect(state.water + state.nutrients).toBeGreaterThan(0);
  });
});

describe('Biosynthesis generator', () => {
  const bio = GENERATORS.find((g) => g.id === 'biosynthesis')!;

  it('is locked until the network has earned Lysate', () => {
    const state = fullGameState();
    expect(isGeneratorUnlocked(state, bio)).toBe(false);
    state.lysateEarned = 5;
    expect(isGeneratorUnlocked(state, bio)).toBe(true);
  });

  it('is bought with Lysate, not Biomass', () => {
    const state = fullGameState();
    state.lysateEarned = 5;
    state.biomass = 0;
    state.lysateBanked = bio.baseCost;
    expect(purchaseGenerator(state, bio.id)).toBe(true);
    expect(state.generators[bio.id]).toBe(1);
    expect(state.lysateBanked).toBe(0);
    expect(state.biomass).toBe(0);
  });

  it('adds to the Biomass rate and drains Water/Nutrients over a tick', () => {
    const state = fullGameState();
    state.lysateEarned = 5;
    state.generators[bio.id] = 1;
    expect(getBiomassConverterOutput(state)).toBeCloseTo(bio.baseRate);
    expect(getEffectiveBiomassPerSec(state)).toBeGreaterThan(
      getEffectiveBiomassPerSec({ ...state, generators: {} }),
    );

    state.water = state.waterCap;
    state.nutrients = state.nutrientsCap;
    state.biomass = 0;
    const waterBefore = state.water;
    const nutrientBefore = state.nutrients;
    for (let i = 0; i < 10; i++) tickIdle(state, 0.1);

    expect(state.biomass).toBeGreaterThan(0);
    expect(state.water).toBeLessThan(waterBefore);
    expect(state.nutrients).toBeLessThan(nutrientBefore);
  });
});
