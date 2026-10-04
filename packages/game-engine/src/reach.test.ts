import { describe, it, expect, beforeEach } from 'vitest';
import { REACH_COST_BASE, REACH_START } from '@mycosurge/config';
import { createInitialState } from './state';
import { getReachCost, getReachBand, getNextReachTier, canExtendReach, extendReach } from './reach';
import { resetRadarSeq } from './radar';

beforeEach(() => {
  resetRadarSeq();
});

describe('getReachCost', () => {
  it('starts at the base cost and rises with each mm', () => {
    expect(getReachCost(REACH_START)).toBe(REACH_COST_BASE);
    expect(getReachCost(REACH_START + 1)).toBeGreaterThan(getReachCost(REACH_START));
    expect(getReachCost(REACH_START + 5)).toBeGreaterThan(getReachCost(REACH_START + 4));
  });
});

describe('reach bands', () => {
  it('opens host tiers at their reach thresholds', () => {
    expect(getReachBand(4)).toBe(0);
    expect(getReachBand(5)).toBe(1);
    expect(getReachBand(10)).toBe(2);
    expect(getReachBand(35)).toBe(5);
  });

  it('points at the next tier and reach that opens it', () => {
    expect(getNextReachTier(5)).toEqual({ tier: 2, at: 10 });
    expect(getNextReachTier(36)).toBeNull();
  });
});

describe('extendReach', () => {
  it('spends Biomass and pushes reach one mm deeper', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.mycelialNetwork = REACH_START;
    state.biomass = 1000;

    const before = state.biomass;
    const result = extendReach(state);

    expect(result.success).toBe(true);
    expect(state.mycelialNetwork).toBe(REACH_START + 1);
    expect(state.biomass).toBe(before - result.cost);
  });

  it('refuses when Biomass is short', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.mycelialNetwork = REACH_START;
    state.biomass = 1;

    expect(canExtendReach(state)).toBe(false);
    const result = extendReach(state);
    expect(result.success).toBe(false);
    expect(state.mycelialNetwork).toBe(REACH_START);
    expect(state.biomass).toBe(1);
  });

  it('draws a signal in from the new frontier when a slot is free', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.mycelialNetwork = REACH_START;
    state.biomass = 1000;

    const result = extendReach(state);
    expect(result.spawned).not.toBeNull();
    expect(state.contacts).toHaveLength(1);
  });
});
