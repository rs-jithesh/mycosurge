import { describe, it, expect } from 'vitest';
import {
  canManualAbsorb,
  manualAbsorb,
  tickManualCooldown,
  canManualSynthesize,
  getSynthesisYield,
  manualSynthesize,
} from './manual';
import { createInitialState } from './state';

describe('manualAbsorb', () => {
  it('adds water and nutrients and starts the cooldown', () => {
    const state = createInitialState();
    expect(manualAbsorb(state)).toBe(true);
    expect(state.water).toBe(2);
    expect(state.nutrients).toBe(2);
    expect(state.manualCooldown).toBe(5);
    expect(canManualAbsorb(state)).toBe(false);
  });

  it('cannot be used again while on cooldown', () => {
    const state = createInitialState();
    manualAbsorb(state);
    expect(manualAbsorb(state)).toBe(false);
    expect(state.water).toBe(2);
  });

  it('clamps to the resource caps', () => {
    const state = createInitialState();
    state.water = state.waterCap;
    state.nutrients = state.nutrientsCap;
    manualAbsorb(state);
    expect(state.water).toBe(state.waterCap);
    expect(state.nutrients).toBe(state.nutrientsCap);
  });

  it('becomes available again after the cooldown ticks down', () => {
    const state = createInitialState();
    manualAbsorb(state);
    tickManualCooldown(state, 5);
    expect(state.manualCooldown).toBe(0);
    expect(canManualAbsorb(state)).toBe(true);
  });
});

describe('getSynthesisYield', () => {
  it('returns a full unit with healthy reserves', () => {
    const state = createInitialState();
    state.water = 100;
    state.nutrients = 100;
    expect(getSynthesisYield(state)).toBe(1);
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
  it('converts a full unit into biomass at healthy reserves', () => {
    const state = createInitialState();
    state.water = 100;
    state.nutrients = 100;
    expect(canManualSynthesize(state)).toBe(true);
    const result = manualSynthesize(state);
    expect(result).toEqual({ success: true, yield: 1 });
    expect(state.water).toBe(90);
    expect(state.nutrients).toBe(90);
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
