import { describe, it, expect } from 'vitest';
import {
  absorbResources,
  getTutorialReserveCap,
  purchaseTutorialUpgrade,
  TUTORIAL_ABSORB_AMOUNT,
  TUTORIAL_GENERATOR_COST,
  TUTORIAL_RESERVE_CAP,
} from './tutorial';
import { createInitialState } from './state';

describe('absorbResources', () => {
  it('grants the hook absorb amount to water and nutrients', () => {
    const state = createInitialState();
    absorbResources(state);
    expect(state.water).toBe(TUTORIAL_ABSORB_AMOUNT);
    expect(state.nutrients).toBe(TUTORIAL_ABSORB_AMOUNT);
  });

  it('reaches synthesis in a handful of taps', () => {
    const state = createInitialState();
    let taps = 0;
    while (state.gamePhase === 'awakening' && taps < 20) {
      absorbResources(state);
      taps++;
    }
    // +2 per tap against a 10 cap: the first synthesis is five taps away.
    expect(taps).toBe(5);
    expect(state.gamePhase).toBe('manager');
  });

  it('never exceeds the water and nutrient caps', () => {
    const state = createInitialState();
    state.water = state.waterCap;
    state.nutrients = state.nutrientsCap;
    absorbResources(state);
    expect(state.water).toBe(state.waterCap);
    expect(state.nutrients).toBe(state.nutrientsCap);
  });

  it('advances the phase once both pools reach the threshold', () => {
    const state = createInitialState();
    state.water = 9;
    state.nutrients = 9;
    absorbResources(state);
    expect(state.gamePhase).toBe('manager');
  });

  it('holds early reserves at the small tutorial cap', () => {
    const state = createInitialState();
    for (let i = 0; i < 25; i++) absorbResources(state);
    expect(state.water).toBe(TUTORIAL_RESERVE_CAP);
    expect(state.nutrients).toBe(TUTORIAL_RESERVE_CAP);
  });

  it('does not reduce reserves already above the early cap', () => {
    const state = createInitialState();
    state.water = 50;
    absorbResources(state);
    expect(state.water).toBe(50);
  });
});

describe('getTutorialReserveCap', () => {
  it('is small while feeding and growing', () => {
    const state = createInitialState();
    expect(getTutorialReserveCap(state, 'water')).toBe(TUTORIAL_RESERVE_CAP);

    state.gamePhase = 'manager';
    state.biomass = 0;
    expect(getTutorialReserveCap(state, 'nutrients')).toBe(TUTORIAL_RESERVE_CAP);
  });

  it('opens to the full pool cap once automation is within reach', () => {
    const state = createInitialState();
    state.gamePhase = 'manager';
    state.biomass = TUTORIAL_GENERATOR_COST;
    expect(getTutorialReserveCap(state, 'water')).toBe(state.waterCap);
    expect(getTutorialReserveCap(state, 'nutrients')).toBe(state.nutrientsCap);
  });
});

describe('purchaseTutorialUpgrade', () => {
  it('installs the first generator for the hook price', () => {
    const state = createInitialState();
    state.gamePhase = 'manager';
    state.biomass = TUTORIAL_GENERATOR_COST;
    const result = purchaseTutorialUpgrade(state, 'osmoticPump');
    expect(result.success).toBe(true);
    expect(state.biomass).toBe(0);
    expect(state.gamePhase).toBe('explorer');
  });

  it('refuses without enough Biomass', () => {
    const state = createInitialState();
    state.gamePhase = 'manager';
    state.biomass = TUTORIAL_GENERATOR_COST - 1;
    const result = purchaseTutorialUpgrade(state, 'osmoticPump');
    expect(result.success).toBe(false);
  });
});
