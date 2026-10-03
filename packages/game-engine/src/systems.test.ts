import { describe, it, expect } from 'vitest';
import { createInitialState } from './state';
import { getSystemUnlocks, EVOLUTION_BIOMASS_THRESHOLD } from './systems';

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

  it('reveals Evolution once enough Biomass has been earned', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.totalBiomassEarned = EVOLUTION_BIOMASS_THRESHOLD;
    expect(getSystemUnlocks(state).evolution).toBe(true);
  });

  it('reveals Expeditions once an echo has been grown over', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.acquiredEchoes = ['echo_leaf'];
    expect(getSystemUnlocks(state).expeditions).toBe(true);
  });

  it('does not re-lock a system when Biomass is spent', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.totalBiomassEarned = EVOLUTION_BIOMASS_THRESHOLD;
    state.biomass = 0;
    expect(getSystemUnlocks(state).evolution).toBe(true);
  });
});
