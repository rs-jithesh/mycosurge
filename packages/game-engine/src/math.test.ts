import { describe, it, expect } from 'vitest';
import {
  getAlertMultiplier,
  getDepletionMultiplier,
  getProliferationBonus,
  getTraumaReduction,
  getNutrientFixationBonus,
  getResourceProduction,
  getEffectiveMaxBiomass,
  getEffectiveBiomassPerSec,
  getEcologicalEfficiency,
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

describe('getAlertMultiplier', () => {
  it('returns 1 at alert level 0', () => {
    expect(getAlertMultiplier(0)).toBe(1);
  });

  it('returns 0.5 at alert level 100', () => {
    expect(getAlertMultiplier(100)).toBe(0.5);
  });

  it('linearly scales between 0 and 100', () => {
    expect(getAlertMultiplier(50)).toBe(0.75);
  });
});

describe('getDepletionMultiplier', () => {
  it('returns 1 at 0% assimilation', () => {
    expect(getDepletionMultiplier(0)).toBe(1);
  });

  it('returns 0.7 at 100% assimilation', () => {
    expect(getDepletionMultiplier(100)).toBeCloseTo(0.7);
  });

  it('floors at 0.1', () => {
    expect(getDepletionMultiplier(500)).toBe(0.1);
  });
});

describe('getProliferationBonus', () => {
  it('returns 0 with no allocations', () => {
    expect(getProliferationBonus({})).toBe(0);
  });

  it('returns 0.25 per level', () => {
    expect(getProliferationBonus({ metabolic_efficiency: 2 })).toBe(0.5);
  });
});

describe('getTraumaReduction', () => {
  it('returns 0.15 per level', () => {
    expect(getTraumaReduction({ trauma_recovery: 3 })).toBeCloseTo(0.45);
  });
});

describe('getNutrientFixationBonus', () => {
  it('returns 0 with no allocations', () => {
    expect(getNutrientFixationBonus({})).toBe(0);
  });

  it('returns 0.5 per level', () => {
    expect(getNutrientFixationBonus({ nitrogen_fixation: 1 })).toBe(0.5);
  });

  it('feeds into Nutrients production but not Water', () => {
    const state = createInitialState();
    state.skillAllocations['nitrogen_fixation'] = 1;
    expect(getResourceProduction(state, 'nutrients')).toBe(0.5);
    expect(getResourceProduction(state, 'water')).toBe(0);
  });

  it('adds a passive Nutrients trickle each tick', () => {
    const baseline = createInitialState();
    baseline.gamePhase = 'active';
    baseline.nutrients = 50;
    tickIdle(baseline, 1);

    const fixed = createInitialState();
    fixed.gamePhase = 'active';
    fixed.nutrients = 50;
    fixed.skillAllocations['nitrogen_fixation'] = 1;
    tickIdle(fixed, 1);

    expect(fixed.nutrients - baseline.nutrients).toBeCloseTo(0.5);
  });

  it('does not push Nutrients past the cap', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.nutrients = state.nutrientsCap;
    state.skillAllocations['nitrogen_fixation'] = 1;
    tickIdle(state, 1);
    expect(state.nutrients).toBeLessThanOrEqual(state.nutrientsCap);
  });
});

describe('getEffectiveMaxBiomass', () => {
  it('returns base max with no skills', () => {
    const state = createInitialState();
    expect(getEffectiveMaxBiomass(state)).toBe(100);
  });

  it('increases with mycelial_expansion', () => {
    const state = createInitialState();
    state.skillAllocations['mycelial_expansion'] = 1;
    expect(getEffectiveMaxBiomass(state)).toBe(175);
  });

  it('grows when the biomass cap is expanded with Lysate', () => {
    const state = createInitialState();
    state.lysateBanked = 100;
    expect(expandBiomassCap(state)).toBe(true);
    expect(state.maxBiomass).toBe(110);
    expect(getEffectiveMaxBiomass(state)).toBe(110);
  });

  it('combines Lysate expansions with the expansion skill', () => {
    const state = createInitialState();
    state.lysateBanked = 100;
    expandBiomassCap(state);
    state.skillAllocations['mycelial_expansion'] = 1;
    expect(getEffectiveMaxBiomass(state)).toBeCloseTo(192.5);
  });

  it('grows with network reach beyond the starting depth', () => {
    const state = createInitialState();
    state.mycelialNetwork = 20;
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

  it('ignores alert while the drag is disabled', () => {
    const state = createInitialState();
    state.alertLevel = 50;
    expect(getEffectiveBiomassPerSec(state)).toBe(0.5);
  });
});

describe('getEcologicalEfficiency', () => {
  it('reads 1 with no strain or alert', () => {
    const state = createInitialState();
    expect(getEcologicalEfficiency(state)).toBe(1);
  });

  it('stays neutral while strain/alert drag is disabled', () => {
    const state = createInitialState();
    state.alertLevel = 100;
    state.assimilationPercent = 100;
    expect(getEcologicalEfficiency(state)).toBe(1);
  });
});

describe('reach upkeep', () => {
  it('is not charged before the full game', () => {
    const state = createInitialState();
    state.mycelialNetwork = 20;
    expect(getUpkeepRate(state, 'water')).toBe(0);
    expect(getUpkeepRate(state, 'nutrients')).toBe(0);
  });

  it('scales with reach in the full game', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.mycelialNetwork = 10;
    expect(getUpkeepRate(state, 'water')).toBeCloseTo(UPKEEP_PER_REACH * 10);
    expect(getUpkeepRate(state, 'nutrients')).toBeCloseTo(UPKEEP_PER_REACH * 10);
  });

  it('adds reach upkeep to the baseline drain', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.mycelialNetwork = 5;
    expect(getResourceDrain(state, 'water')).toBeCloseTo(0.8 + UPKEEP_PER_REACH * 5);
  });

  it('drags net production negative when reach outruns income', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.mycelialNetwork = 35;
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
    expect(getCapExpandCost(state, 'water')).toBe(10);
    expect(expandCap(state, 'water')).toBe(true);
    expect(state.waterCap).toBe(110);
    expect(expandCap(state, 'nutrients')).toBe(true);
    expect(state.nutrientsCap).toBe(110);
    expect(expandCap(state, 'biomass')).toBe(true);
    expect(state.maxBiomass).toBe(110);
  });
});

describe('enterTrauma', () => {
  it('sets trauma state with full duration', () => {
    const state = createInitialState();
    enterTrauma(state);
    expect(state.isInTrauma).toBe(true);
    expect(state.traumaTimer).toBe(30);
  });

  it('reduces duration with trauma_recovery skill', () => {
    const state = createInitialState();
    state.skillAllocations['trauma_recovery'] = 2;
    enterTrauma(state);
    expect(state.traumaTimer).toBeCloseTo(21);
  });

  it('floors at 5 seconds minimum', () => {
    const state = createInitialState();
    state.skillAllocations['trauma_recovery'] = 3;
    enterTrauma(state);
    expect(state.traumaTimer).toBeGreaterThanOrEqual(5);
  });

  it('resets shield hits', () => {
    const state = createInitialState();
    state.combatStats.shieldHits = 3;
    enterTrauma(state);
    expect(state.combatStats.shieldHits).toBe(0);
  });
});
