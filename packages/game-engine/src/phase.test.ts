import { describe, it, expect } from 'vitest';
import { createInitialState } from './state';
import type { RadarContact } from './state';
import { getRecommendedPhase, getCheapestGeneratorCost, getCheapestExpandCost } from './phase';

function activeState() {
  const state = createInitialState();
  state.gamePhase = 'active';
  state.water = state.waterCap * 0.7;
  state.nutrients = state.nutrientsCap * 0.7;
  return state;
}

function contact(revealed: boolean): RadarContact {
  return {
    id: 'contact-1',
    hostId: 'mycelium_mite',
    strainId: 'normal',
    revealed,
    timeRemaining: 60,
    totalTime: 120,
  };
}

describe('getRecommendedPhase', () => {
  it('points at Gather before the full game begins', () => {
    const state = createInitialState();
    expect(getRecommendedPhase(state)).toBe('gather');
  });

  it('points at Gather during the tutorial phases', () => {
    const state = createInitialState();
    state.gamePhase = 'manager';
    expect(getRecommendedPhase(state)).toBe('gather');
  });

  it('prioritises Gather over an active fight when starving', () => {
    const state = activeState();
    state.water = 0;
    state.currentHostId = 'mycelium_mite';
    expect(getRecommendedPhase(state)).toBe('gather');
  });

  it('points at Gather while recovering from trauma', () => {
    const state = activeState();
    state.isInTrauma = true;
    expect(getRecommendedPhase(state)).toBe('gather');
  });

  it('points at Gather when starving', () => {
    const state = activeState();
    state.water = 0;
    expect(getRecommendedPhase(state)).toBe('gather');
  });

  it('points at Gather when a reserve runs low', () => {
    const state = activeState();
    state.nutrients = state.nutrientsCap * 0.2;
    expect(getRecommendedPhase(state)).toBe('gather');
  });

  it('points at Hunt while fighting a host', () => {
    const state = activeState();
    state.currentHostId = 'mycelium_mite';
    expect(getRecommendedPhase(state)).toBe('hunt');
  });

  it('points at Hunt when a signal is revealed', () => {
    const state = activeState();
    state.contacts = [contact(true)];
    expect(getRecommendedPhase(state)).toBe('hunt');
  });

  it('tops up reserves before acting on a revealed signal', () => {
    const state = activeState();
    state.nutrients = state.nutrientsCap * 0.2;
    state.contacts = [contact(true)];
    expect(getRecommendedPhase(state)).toBe('gather');
  });

  it('points at Grow when biomass cannot afford the next generator', () => {
    const state = activeState();
    state.biomass = 0;
    expect(getRecommendedPhase(state)).toBe('grow');
  });

  it('points at Hunt when stable but short on Lysate', () => {
    const state = activeState();
    state.biomass = 50;
    expect(getRecommendedPhase(state)).toBe('hunt');
  });

  it('points at Gather when a reserve is full and Lysate is ready', () => {
    const state = activeState();
    state.biomass = 100;
    state.water = state.waterCap;
    state.lysateBanked = 10;
    expect(getRecommendedPhase(state)).toBe('gather');
  });

  it('does not suggest Expand when only an unaffordable pool is full', () => {
    const state = activeState();
    state.waterCap = 200; // ten expansions -> 576 Lysate
    state.water = 200;
    state.biomass = 1; // reach is unaffordable too, so nothing can be expanded
    state.lysateBanked = 10; // enough for a fresh +10 cap, not the water one
    expect(getRecommendedPhase(state)).toBe('grow');
  });

  it('suggests Expand once every generator is maxed and Lysate is banked', () => {
    const state = activeState();
    state.generators = { osmotic_pump: 10, enzymatic_exudates: 10 };
    state.biomass = 50;
    state.lysateBanked = 10;
    expect(getRecommendedPhase(state)).toBe('expand');
  });

  it('falls back to Grow when stable and nothing else is pressing', () => {
    const state = activeState();
    state.biomass = 50;
    state.lysateBanked = 10;
    expect(getRecommendedPhase(state)).toBe('grow');
  });
});

describe('getCheapestGeneratorCost', () => {
  it('returns the base price of the first generator level', () => {
    const state = createInitialState();
    expect(getCheapestGeneratorCost(state)).toBe(5);
  });

  it('returns null when every generator is maxed', () => {
    const state = createInitialState();
    state.generators = { osmotic_pump: 10, enzymatic_exudates: 10 };
    expect(getCheapestGeneratorCost(state)).toBeNull();
  });
});

describe('getCheapestExpandCost', () => {
  it('returns the base capacity expansion price', () => {
    const state = createInitialState();
    expect(getCheapestExpandCost(state)).toBe(3);
  });
});
