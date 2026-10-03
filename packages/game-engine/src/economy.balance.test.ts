import { describe, it, expect } from 'vitest';
import { GENERATORS, getGeneratorCost } from '@mycosurge/config';
import { createInitialState } from './state';
import type { GameState } from './state';
import {
  tickIdle,
  getNetResourceRate,
  getUpkeepRate,
  getResourceProduction,
  getCapExpansionTotal,
} from './math';
import { purchaseGenerator } from './generators';
import { manualSynthesize } from './manual';

const MINUTE = 60;
const HALF_HOUR = 30 * MINUTE;

function fullGameState(): GameState {
  const state = createInitialState();
  state.gamePhase = 'active';
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
    const level = state.generators[gen.id] ?? 0;
    if (level >= gen.maxLevel) continue;
    const cost = getGeneratorCost(gen.baseCost, level, gen.costScale);
    if (cost < bestCost) {
      bestCost = cost;
      bestId = gen.id;
    }
  }
  if (bestId === null || state.biomass < bestCost) return false;
  return purchaseGenerator(state, bestId);
}

describe('metabolic upkeep', () => {
  it('is not charged before the full game', () => {
    const state = createInitialState();
    state.generators = { osmotic_pump: 10, enzymatic_exudates: 10 };
    expect(getUpkeepRate(state, 'water')).toBe(0);
  });

  it('keeps an early single generator net-positive', () => {
    const state = fullGameState();
    state.generators = { osmotic_pump: 1 };
    // +1/s production − 0.8/s depletion − 0.1/s upkeep
    expect(getNetResourceRate(state, 'water')).toBeGreaterThan(0);
  });

  it('scales upkeep with complexity', () => {
    const state = fullGameState();
    state.generators = { osmotic_pump: 5 };
    const before = getUpkeepRate(state, 'water');
    state.acquiredEchoes = ['echo_leaf', 'echo_worm'];
    state.waterCap += 20;
    expect(getUpkeepRate(state, 'water')).toBeGreaterThan(before);
    expect(getCapExpansionTotal(state)).toBe(2);
  });

  it('trims a fully grown network to a gentle net surplus', () => {
    const state = fullGameState();
    state.generators = { osmotic_pump: 10, enzymatic_exudates: 10 };
    state.acquiredEchoes = new Array(9).fill('x');
    state.waterCap += 60;
    state.nutrientsCap += 60;

    const net = getNetResourceRate(state, 'water');
    expect(net).toBeGreaterThan(5.5);
    expect(net).toBeLessThan(7.5);

    // Upkeep should be a meaningful but not dominant share of production.
    const upkeepShare = getUpkeepRate(state, 'water') / getResourceProduction(state, 'water');
    expect(upkeepShare).toBeGreaterThan(0.15);
    expect(upkeepShare).toBeLessThan(0.4);
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
