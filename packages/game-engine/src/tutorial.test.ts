import { describe, it, expect } from 'vitest';
import { absorbResources } from './tutorial';
import { createInitialState } from './state';

describe('absorbResources', () => {
  it('adds one water and one nutrient', () => {
    const state = createInitialState();
    absorbResources(state);
    expect(state.water).toBe(1);
    expect(state.nutrients).toBe(1);
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
});
