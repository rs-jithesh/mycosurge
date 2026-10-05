import { describe, it, expect } from 'vitest';
import { createInitialState } from './state';
import type { GameState } from './state';
import {
  getHookProgress,
  getNextHookObjective,
  isSignalSensed,
  SENSE_REACH_RESOLVE,
  SENSE_REACH_THRESHOLD,
} from './hook';

/** A state that has cleared every earlier objective, ready for the generator beats. */
function pastSynthesis(): GameState {
  const state = createInitialState();
  state.gamePhase = 'explorer';
  state.totalBiomassEarned = 1;
  return state;
}

describe('hook objective track', () => {
  it('starts by asking the player to absorb, with a live delta', () => {
    const state = createInitialState();
    expect(getNextHookObjective(state).id).toBe('absorb');
    expect(getHookProgress(state)).toEqual({
      current: 0,
      target: 10,
      unit: 'Water & Nutrients',
    });
  });

  it('advances to shaping Biomass once the reserves brim', () => {
    const state = createInitialState();
    state.gamePhase = 'manager';
    expect(getNextHookObjective(state).id).toBe('shape-biomass');
  });

  it('walks the generators in order', () => {
    const state = pastSynthesis();
    expect(getNextHookObjective(state).id).toBe('first-generator');

    state.tutorialUpgrades.osmoticPump = true;
    expect(getNextHookObjective(state).id).toBe('second-generator');

    state.tutorialUpgrades.enzymaticExudates = true;
    expect(getNextHookObjective(state).id).toBe('extend');
  });

  it('then asks for reach before the signal resolves', () => {
    const state = pastSynthesis();
    state.tutorialUpgrades.osmoticPump = true;
    state.tutorialUpgrades.enzymaticExudates = true;

    expect(getNextHookObjective(state).id).toBe('extend');
    state.mycelialNetwork = 1;
    expect(getNextHookObjective(state).id).toBe('sense');
    expect(getHookProgress(state)).toEqual({
      current: 1,
      target: SENSE_REACH_RESOLVE,
      unit: 'mm',
    });

    state.mycelialNetwork = SENSE_REACH_RESOLVE;
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
    state.mycelialNetwork = 10;
    expect(isSignalSensed(state)).toBe(false);
  });
});
