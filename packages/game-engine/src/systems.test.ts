import { describe, it, expect } from 'vitest';
import { createInitialState } from './state';
import { getSystemUnlocks } from './systems';

describe('getSystemUnlocks', () => {
  it('keeps the radar locked during the tutorial', () => {
    expect(getSystemUnlocks(createInitialState())).toEqual({ radar: false });
  });

  it('reveals the radar once the full game is active', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    expect(getSystemUnlocks(state)).toEqual({ radar: true });
  });
});
