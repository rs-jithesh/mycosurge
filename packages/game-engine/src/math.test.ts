import { describe, it, expect } from 'vitest';
import {
  getAlertMultiplier,
  getDepletionMultiplier,
  getProliferationBonus,
  getTraumaReduction,
  getSkillLevelCost,
  canAffordSkill,
  getEffectiveMaxBiomass,
  getEffectiveBiomassPerSec,
  getEcologicalEfficiency,
  isStarving,
  tickIdle,
  enterTrauma,
  expandBiomassCap,
  getCapExpandCost,
  expandCap,
} from './math';
import { getGeneratorCost } from '@mycosurge/config';
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

describe('getSkillLevelCost', () => {
  it('returns base cost at level 0', () => {
    expect(getSkillLevelCost(5, 0)).toBe(5);
  });

  it('scales by 1.5 per level', () => {
    expect(getSkillLevelCost(5, 1)).toBe(7);
    expect(getSkillLevelCost(5, 2)).toBe(11);
  });
});

describe('canAffordSkill', () => {
  it('returns true when biomass is sufficient', () => {
    expect(canAffordSkill(10, 5, 0)).toBe(true);
  });

  it('returns false when biomass is insufficient', () => {
    expect(canAffordSkill(3, 5, 0)).toBe(false);
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

  it('applies alert penalty', () => {
    const state = createInitialState();
    state.alertLevel = 50;
    expect(getEffectiveBiomassPerSec(state)).toBeCloseTo(0.375);
  });
});

describe('getEcologicalEfficiency', () => {
  it('reads 1 with no strain or alert', () => {
    const state = createInitialState();
    expect(getEcologicalEfficiency(state)).toBe(1);
  });

  it('caps the combined alert and strain drag', () => {
    const state = createInitialState();
    state.alertLevel = 100;
    state.assimilationPercent = 100;
    // Additive drag is 0.5 + 0.3 = 0.8, capped at 0.5.
    expect(getEcologicalEfficiency(state)).toBeCloseTo(0.5);
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
