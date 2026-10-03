import { describe, it, expect } from 'vitest';
import { createInitialState } from './state';
import { getSystemUnlocks } from './systems';

describe('getSystemUnlocks', () => {
  it('keeps every optional system locked during the tutorial', () => {
    const state = createInitialState();
    expect(getSystemUnlocks(state)).toEqual({
      radar: false,
      evolution: false,
      expeditions: false,
    });
  });

  it('reveals only the core chain at the start of the full game', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    expect(getSystemUnlocks(state)).toEqual({
      radar: true,
      evolution: false,
      expeditions: false,
    });
  });

  it('reveals Evolution and Expeditions together at the first echo', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.acquiredEchoes = ['echo_leaf'];
    expect(getSystemUnlocks(state)).toEqual({
      radar: true,
      evolution: true,
      expeditions: true,
    });
  });

  it('does not re-lock a system once an echo has been banked', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.acquiredEchoes = ['echo_leaf'];
    state.biomass = 0;
    expect(getSystemUnlocks(state).evolution).toBe(true);
  });
});
