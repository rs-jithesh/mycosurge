import { describe, it, expect } from 'vitest';
import { createInitialState } from './state';
import {
  getSkill,
  getCurrentLevel,
  arePrerequisitesMet,
  purchaseSkill,
  getSkillPointCost,
  getTotalGenomePoints,
  getSpentGenomePoints,
  getAvailableGenomePoints,
  canRespec,
  getRespecCost,
  respecSkills,
  migrateSkillAllocations,
} from './skills';
import { getNutrientFixationBonus, getEffectiveMaxBiomass } from './math';
import { getRadarSlots } from './radar';

describe('genome point budget', () => {
  it('starts at the base budget with nothing spent', () => {
    const state = createInitialState();
    expect(getTotalGenomePoints(state)).toBe(6);
    expect(getSpentGenomePoints(state)).toBe(0);
    expect(getAvailableGenomePoints(state)).toBe(6);
  });

  it('grows as the network climbs the scale ladder', () => {
    const state = createInitialState();
    // Stage 1: no stages yet reached.
    state.mycelialNetwork = 5;
    expect(getTotalGenomePoints(state)).toBe(6);
    // Stage 3 reached → 2 stages beyond the first × 2 points.
    state.mycelialNetwork = 50;
    expect(getTotalGenomePoints(state)).toBe(10);
  });

  it('sums per-level point costs (capstones cost 3)', () => {
    const state = createInitialState();
    state.skillAllocations = { spore_speed: 1, chain_reaction: 1 };
    expect(getSpentGenomePoints(state)).toBe(1 + 3);
    expect(getAvailableGenomePoints(state)).toBe(2);
  });

  it('blocks purchases once points are exhausted', () => {
    const state = createInitialState();
    state.skillAllocations = { spore_speed: 3, fire_rate: 3 }; // 6 spent = full budget
    state.biomass = 999;
    expect(getAvailableGenomePoints(state)).toBe(0);
    expect(purchaseSkill(state, 'overcharge')).toBe(false);
  });

  it('purchases without spending any Biomass', () => {
    const state = createInitialState();
    state.biomass = 0;
    expect(purchaseSkill(state, 'spore_speed')).toBe(true);
    expect(getCurrentLevel(state, 'spore_speed')).toBe(1);
    expect(state.biomass).toBe(0);
    expect(getSpentGenomePoints(state)).toBe(1);
  });

  it('gives capstones a point cost of 3', () => {
    expect(getSkillPointCost(getSkill('spore_speed')!)).toBe(1);
    expect(getSkillPointCost(getSkill('chain_reaction')!)).toBe(3);
    expect(getSkillPointCost(getSkill('emergency_evac')!)).toBe(3);
  });
});

describe('mutation prerequisites', () => {
  it('unlocks a child at level 1, not only when maxed', () => {
    const state = createInitialState();
    expect(arePrerequisitesMet(state, 'fire_rate')).toBe(false);

    state.skillAllocations['spore_speed'] = 1;
    expect(arePrerequisitesMet(state, 'fire_rate')).toBe(true);
  });

  it('still requires every listed prerequisite', () => {
    const state = createInitialState();
    state.skillAllocations['trauma_recovery'] = 1;
    expect(arePrerequisitesMet(state, 'adaptive_membrane')).toBe(false);

    state.skillAllocations['regenerative_spores'] = 1;
    expect(arePrerequisitesMet(state, 'adaptive_membrane')).toBe(true);
  });

  it('nitrogen_fixation needs Mycelial Expansion at level 1 only', () => {
    const state = createInitialState();
    expect(arePrerequisitesMet(state, 'nitrogen_fixation')).toBe(false);

    state.skillAllocations['mycelial_expansion'] = 1;
    expect(arePrerequisitesMet(state, 'nitrogen_fixation')).toBe(true);
    expect(purchaseSkill(state, 'nitrogen_fixation')).toBe(true);
    expect(getNutrientFixationBonus(state.skillAllocations)).toBe(0.5);
  });

  it('extended_range has no prerequisite and grants a radar slot', () => {
    const state = createInitialState();
    expect(getSkill('extended_range')?.prerequisites).toEqual([]);
    expect(getRadarSlots(state)).toBe(5);
    expect(purchaseSkill(state, 'extended_range')).toBe(true);
    expect(getRadarSlots(state)).toBe(6);
  });
});

describe('respec', () => {
  it('is free the first time and refunds every point', () => {
    const state = createInitialState();
    state.skillAllocations['spore_speed'] = 2;
    state.biomass = 0;

    expect(canRespec(state)).toBe(true);
    expect(getRespecCost(state)).toBe(0);
    expect(respecSkills(state)).toBe(true);
    expect(state.skillAllocations).toEqual({});
    expect(getSpentGenomePoints(state)).toBe(0);
    expect(state.respecsUsed).toBe(1);
    expect(state.biomass).toBe(0);
  });

  it('costs RESPEC_BIOMASS_COST after the first', () => {
    const state = createInitialState();
    state.skillAllocations['spore_speed'] = 1;
    respecSkills(state); // free

    state.skillAllocations['spore_speed'] = 1;
    state.biomass = 39;
    expect(getRespecCost(state)).toBe(40);
    expect(respecSkills(state)).toBe(false);

    state.biomass = 40;
    expect(respecSkills(state)).toBe(true);
    expect(state.biomass).toBe(0);
    expect(state.respecsUsed).toBe(2);
  });

  it('is unavailable while a host is engaged or in trauma', () => {
    const engaged = createInitialState();
    engaged.skillAllocations['spore_speed'] = 1;
    engaged.currentHostId = 'fallen_leaf';
    expect(canRespec(engaged)).toBe(false);
    expect(respecSkills(engaged)).toBe(false);

    const trauma = createInitialState();
    trauma.skillAllocations['spore_speed'] = 1;
    trauma.isInTrauma = true;
    expect(canRespec(trauma)).toBe(false);
    expect(respecSkills(trauma)).toBe(false);
  });

  it('recomputes all derived effects and resets combat stats', () => {
    const state = createInitialState();
    state.skillAllocations['spore_speed'] = 3;
    state.combatStats.projectileSpeed = 1.3;
    state.combatStats.shieldHits = 2;

    expect(respecSkills(state)).toBe(true);
    expect(state.combatStats.projectileSpeed).toBe(1);
    expect(state.combatStats.shieldHits).toBe(0);
  });

  it('clamps Biomass to the reduced cap after losing Mycelial Expansion', () => {
    const state = createInitialState();
    state.skillAllocations['mycelial_expansion'] = 1;
    expect(getEffectiveMaxBiomass(state)).toBe(175);

    state.biomass = 175;
    expect(respecSkills(state)).toBe(true);
    expect(getEffectiveMaxBiomass(state)).toBe(100);
    expect(state.biomass).toBe(100);
  });
});

describe('old-save migration', () => {
  it('resets allocations when they exceed the genome budget', () => {
    const state = createInitialState();
    state.skillAllocations = { spore_speed: 3, fire_rate: 3, multi_shot: 2, overcharge: 3 };
    state.combatStats.projectileSpeed = 1.3;

    expect(migrateSkillAllocations(state)).toBe(true);
    expect(state.skillAllocations).toEqual({});
    expect(state.combatStats.projectileSpeed).toBe(1);
  });

  it('leaves a valid allocation untouched', () => {
    const state = createInitialState();
    state.skillAllocations = { spore_speed: 2 };

    expect(migrateSkillAllocations(state)).toBe(false);
    expect(getCurrentLevel(state, 'spore_speed')).toBe(2);
  });

  it('clamps Biomass when a reset drops the cap', () => {
    const state = createInitialState();
    // More points than the budget allows, so the migration clears everything.
    state.skillAllocations = { mycelial_expansion: 3, metabolic_efficiency: 3, dormant_spores: 1 };
    state.biomass = 175;

    expect(migrateSkillAllocations(state)).toBe(true);
    expect(state.biomass).toBe(100);
  });
});
