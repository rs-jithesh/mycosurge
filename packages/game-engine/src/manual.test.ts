import { describe, it, expect } from 'vitest';
import {
  canManualAbsorb,
  manualAbsorb,
  canManualSynthesize,
  getSynthesisYield,
  manualSynthesize,
  getManualAbsorbAmount,
  getManualUpgradeLevel,
  canPurchaseManualUpgrade,
  purchaseManualUpgrade,
} from './manual';
import { createInitialState } from './state';

describe('manualAbsorb', () => {
  it('adds water and nutrients', () => {
    const state = createInitialState();
    expect(manualAbsorb(state)).toBe(true);
    expect(state.water).toBe(2);
    expect(state.nutrients).toBe(2);
    expect(canManualAbsorb(state)).toBe(true);
  });

  it('can be tapped repeatedly — no cooldown', () => {
    const state = createInitialState();
    manualAbsorb(state);
    expect(manualAbsorb(state)).toBe(true);
    expect(state.water).toBe(4);
    expect(state.nutrients).toBe(4);
  });

  it('clamps to the resource caps', () => {
    const state = createInitialState();
    state.water = state.waterCap;
    state.nutrients = state.nutrientsCap;
    manualAbsorb(state);
    expect(state.water).toBe(state.waterCap);
    expect(state.nutrients).toBe(state.nutrientsCap);
  });
});

describe('getSynthesisYield', () => {
  it('returns a full unit with healthy reserves', () => {
    const state = createInitialState();
    state.water = 60;
    state.nutrients = 100;
    expect(getSynthesisYield(state)).toBe(1);
  });

  it('adds a timely bonus when both reserves are brimming', () => {
    const state = createInitialState();
    state.water = 100;
    state.nutrients = 100;
    expect(getSynthesisYield(state)).toBe(1.5);
  });

  it('returns a half unit when reserves run strained', () => {
    const state = createInitialState();
    state.water = 40;
    state.nutrients = 40;
    expect(getSynthesisYield(state)).toBe(0.5);
  });

  it('wastes the conversion near starvation', () => {
    const state = createInitialState();
    state.water = 12;
    state.nutrients = 12;
    expect(getSynthesisYield(state)).toBe(0);
  });
});

describe('manualSynthesize', () => {
  it('brimming reserves grant the timely bonus', () => {
    const state = createInitialState();
    state.water = 100;
    state.nutrients = 100;
    expect(canManualSynthesize(state)).toBe(true);
    const result = manualSynthesize(state);
    expect(result).toEqual({ success: true, yield: 1.5 });
    expect(state.water).toBe(90);
    expect(state.nutrients).toBe(90);
    expect(state.biomass).toBe(1.5);
  });

  it('converts a full unit into biomass at healthy (not full) reserves', () => {
    const state = createInitialState();
    state.water = 60;
    state.nutrients = 100;
    const result = manualSynthesize(state);
    expect(result).toEqual({ success: true, yield: 1 });
    expect(state.water).toBe(50);
    expect(state.biomass).toBe(1);
  });

  it('halves the yield when overdrawing', () => {
    const state = createInitialState();
    state.water = 40;
    state.nutrients = 40;
    const result = manualSynthesize(state);
    expect(result.yield).toBe(0.5);
    expect(state.biomass).toBe(0.5);
    expect(state.water).toBe(30);
  });

  it('consumes resources but yields nothing when wasted', () => {
    const state = createInitialState();
    state.water = 12;
    state.nutrients = 12;
    const result = manualSynthesize(state);
    expect(result).toEqual({ success: true, yield: 0 });
    expect(state.water).toBe(2);
    expect(state.biomass).toBe(0);
  });

  it('fails without enough resources', () => {
    const state = createInitialState();
    state.water = 5;
    state.nutrients = 10;
    expect(canManualSynthesize(state)).toBe(false);
    expect(manualSynthesize(state)).toEqual({ success: false, yield: 0 });
    expect(state.biomass).toBe(0);
  });
});

describe('manual upgrades', () => {
  it('deepens Absorb with Absorption Depth', () => {
    const state = createInitialState();
    state.upgradeLevels['absorption_depth'] = 3;
    expect(getManualAbsorbAmount(state)).toBe(5);

    state.water = 0;
    state.nutrients = 0;
    state.manualCooldown = 0;
    manualAbsorb(state);
    expect(state.water).toBe(5);
    expect(state.nutrients).toBe(5);
  });

  it('adds to the synthesis yield with Assimilation Yield', () => {
    const state = createInitialState();
    state.upgradeLevels['assimilation_yield'] = 2;
    // Healthy but not brimming, so the brimming bonus doesn't stack on top.
    state.water = state.waterCap * 0.6;
    state.nutrients = state.nutrientsCap * 0.6;
    expect(getSynthesisYield(state)).toBeCloseTo(1 + 2 * 0.25);
  });

  it('buys a level for Lysate + Biomass', () => {
    const state = createInitialState();
    state.lysateBanked = 50;
    state.biomass = 500;
    expect(canPurchaseManualUpgrade(state, 'absorption_depth')).toBe(true);

    const lysateBefore = state.lysateBanked;
    const biomassBefore = state.biomass;
    expect(purchaseManualUpgrade(state, 'absorption_depth')).toBe(true);
    expect(getManualUpgradeLevel(state, 'absorption_depth')).toBe(1);
    expect(state.lysateBanked).toBeLessThan(lysateBefore);
    expect(state.biomass).toBeLessThan(biomassBefore);
  });
});
