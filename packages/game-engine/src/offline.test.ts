import { describe, it, expect } from 'vitest';
import { createInitialState } from './state';
import { applyOfflineProgress, getOfflineRate } from './offline';
import { OFFLINE_MAX_SECONDS } from '@mycosurge/config';

function activeState() {
  const state = createInitialState();
  state.gamePhase = 'active';
  state.water = state.waterCap;
  state.nutrients = state.nutrientsCap;
  return state;
}

describe('getOfflineRate', () => {
  it('starts at half rate', () => {
    expect(getOfflineRate({})).toBe(0.5);
  });

  it('rises with Dormant Spores', () => {
    expect(getOfflineRate({ dormant_spores: 1 })).toBeCloseTo(0.75);
    expect(getOfflineRate({ dormant_spores: 2 })).toBe(1);
  });

  it('never exceeds the online rate', () => {
    expect(getOfflineRate({ dormant_spores: 9 })).toBe(1);
  });
});

describe('applyOfflineProgress', () => {
  it('does nothing outside the full game', () => {
    expect(applyOfflineProgress(createInitialState(), 600)).toBeNull();
  });

  it('ignores extremely short absences', () => {
    expect(applyOfflineProgress(activeState(), 0.5)).toBeNull();
  });

  it('accrues biomass at the offline rate', () => {
    const state = activeState();
    const report = applyOfflineProgress(state, 100);
    expect(report).not.toBeNull();
    // 0.5 Biomass/s * 100s * 0.5 rate = 25
    expect(report!.biomassGained).toBeCloseTo(25);
    expect(state.biomass).toBeCloseTo(25);
  });

  it('uses the full rate with Dormant Spores maxed', () => {
    const state = activeState();
    state.skillAllocations.dormant_spores = 2;
    const report = applyOfflineProgress(state, 100);
    expect(report!.biomassGained).toBeCloseTo(50);
  });

  it('caps long absences at the offline limit', () => {
    const state = activeState();
    const report = applyOfflineProgress(state, OFFLINE_MAX_SECONDS + 3600 * 12);
    expect(report!.wasCapped).toBe(true);
    expect(report!.appliedSeconds).toBeCloseTo(OFFLINE_MAX_SECONDS * 0.5);
  });

  it('clears contacts that drift away', () => {
    const state = activeState();
    state.contacts = [
      {
        id: 'c1',
        hostId: 'bacterial_film',
        strainId: 'normal',
        revealed: false,
        timeRemaining: 30,
        totalTime: 120,
      },
    ];
    applyOfflineProgress(state, 120);
    expect(state.contacts).toHaveLength(0);
  });
});
