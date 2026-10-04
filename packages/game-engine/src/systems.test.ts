import { describe, it, expect } from 'vitest';
import { EXPEDITIONS_ENABLED } from '@mycosurge/config';
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

  it('reveals Evolution once a host has been grown over', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.hostsDefeated = 1;
    const unlocks = getSystemUnlocks(state);
    expect(unlocks.radar).toBe(true);
    expect(unlocks.evolution).toBe(true);
    // Expeditions stays hidden until explicitly enabled.
    expect(unlocks.expeditions).toBe(EXPEDITIONS_ENABLED);
  });

  it('does not re-lock a system once a host has been grown over', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.hostsDefeated = 1;
    state.biomass = 0;
    expect(getSystemUnlocks(state).evolution).toBe(true);
  });
});
