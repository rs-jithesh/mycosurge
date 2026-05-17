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
  tickIdle,
  enterTrauma,
} from './math';
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
