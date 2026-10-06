import { describe, it, expect } from 'vitest';
import { createInitialState } from './state';
import {
  getHookProgress,
  getNextHookObjective,
  isSignalSensed,
  SENSE_REACH_RESOLVE,
  SENSE_REACH_THRESHOLD,
} from './hook';
import { TUTORIAL_GROW_NUTRIENT_COST, TUTORIAL_GROW_WATER_COST } from './tutorial';

describe('hook objective track', () => {
  it('starts by asking the player to draw water', () => {
    const state = createInitialState();
    expect(getNextHookObjective(state).id).toBe('absorb-water');
    expect(getHookProgress(state)).toEqual({
      current: 0,
      target: TUTORIAL_GROW_WATER_COST,
      unit: 'Water',
    });
  });

  it('moves to the first growth once water can afford it', () => {
    const state = createInitialState();
    state.water = TUTORIAL_GROW_WATER_COST;
    expect(getNextHookObjective(state).id).toBe('first-growth');
  });

  it('reveals Nutrients, then walks the two generators', () => {
    const state = createInitialState();
    state.mycelialNetwork = 1;
    state.gamePhase = 'manager';
    expect(getNextHookObjective(state).id).toBe('gather-nutrients');

    state.nutrients = TUTORIAL_GROW_NUTRIENT_COST;
    expect(getNextHookObjective(state).id).toBe('first-generator');

    state.tutorialUpgrades.osmoticPump = true;
    expect(getNextHookObjective(state).id).toBe('second-generator');

    state.tutorialUpgrades.enzymaticExudates = true;
    expect(getNextHookObjective(state).id).toBe('reach');
  });

  it('ends at reach, then completes', () => {
    const state = createInitialState();
    state.mycelialNetwork = 4;
    state.gamePhase = 'explorer';
    state.nutrients = TUTORIAL_GROW_NUTRIENT_COST;
    state.tutorialUpgrades.osmoticPump = true;
    state.tutorialUpgrades.enzymaticExudates = true;
    expect(getNextHookObjective(state).id).toBe('reach');
    expect(getHookProgress(state)).toEqual({ current: 4, target: 5, unit: 'mm' });

    state.mycelialNetwork = 5;
    expect(getNextHookObjective(state).progress(state)).toBeNull();
  });
});

describe('isSignalSensed', () => {
  it('stays quiet until the network reaches the threshold', () => {
    const state = createInitialState();
    state.gamePhase = 'explorer';
    state.mycelialNetwork = SENSE_REACH_THRESHOLD - 1;
    expect(isSignalSensed(state)).toBe(false);

    state.mycelialNetwork = SENSE_REACH_THRESHOLD;
    expect(isSignalSensed(state)).toBe(true);
  });

  it('stays quiet once the full game owns signals', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.mycelialNetwork = SENSE_REACH_RESOLVE + 5;
    expect(isSignalSensed(state)).toBe(false);
  });
});
