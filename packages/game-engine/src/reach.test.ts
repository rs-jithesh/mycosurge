import { describe, it, expect, beforeEach } from 'vitest';
import { REACH_COST_BASE, REACH_START } from '@mycosurge/config';
import { createInitialState } from './state';
import { getReachCost, getReachBand, getNextReachTier } from './reach';
import {
  canGrowSector,
  growSector,
  growEvenly,
  getSectorDepths,
  getGrowStepMm,
  getEvenStepMm,
  getMaxReach,
} from './sectors';
import { resetRadarSeq } from './radar';

beforeEach(() => {
  resetRadarSeq();
});

describe('getReachCost', () => {
  it('starts at the base cost and rises within a band', () => {
    expect(getReachCost(REACH_START)).toBe(REACH_COST_BASE);
    expect(getReachCost(REACH_START + 1)).toBeGreaterThan(getReachCost(REACH_START));
    expect(getReachCost(REACH_START + 2)).toBeGreaterThan(getReachCost(REACH_START + 1));
  });

  it('re-bases at each stage boundary so a new band starts fresh', () => {
    // 10 mm is the start of stage 2, so the curve resets to the base price.
    expect(getReachCost(10)).toBe(REACH_COST_BASE);
    expect(getReachCost(9)).toBeGreaterThan(getReachCost(10));
  });
});

describe('reach bands', () => {
  it('opens host stages at their reach thresholds', () => {
    expect(getReachBand(5)).toBe(1);
    expect(getReachBand(10)).toBe(2);
    expect(getReachBand(35)).toBe(2);
    expect(getReachBand(50)).toBe(3);
    expect(getReachBand(1000)).toBe(6);
  });

  it('points at the next stage and reach that opens it', () => {
    expect(getNextReachTier(5)).toEqual({ tier: 2, at: 10 });
    expect(getNextReachTier(60_000)).toBeNull();
  });
});

describe('growing reach', () => {
  function activeState() {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.biomass = 1000;
    return state;
  }

  it('nudges every wedge outward with grow-evenly', () => {
    const state = activeState();
    const before = state.biomass;
    const step = getEvenStepMm(state);
    const result = growEvenly(state);

    expect(result.success).toBe(true);
    expect(getMaxReach(state)).toBeCloseTo(REACH_START + step);
    expect(state.biomass).toBe(before - result.cost);
  });

  it('grows a single wedge a full step', () => {
    const state = activeState();
    const step = getGrowStepMm(state);
    const result = growSector(state, 0);

    expect(result.success).toBe(true);
    expect(result.sector).toBe(0);
    expect(getMaxReach(state)).toBeCloseTo(REACH_START + step);
    const depths = getSectorDepths(state);
    expect(depths[0]).toBeCloseTo(REACH_START + step);
    expect(depths[1]).toBeCloseTo(REACH_START);
  });

  it('refuses when Biomass is short', () => {
    const state = activeState();
    state.biomass = 1;

    expect(canGrowSector(state, 0)).toBe(false);
    const result = growSector(state, 0);
    expect(result.success).toBe(false);
    expect(getMaxReach(state)).toBe(REACH_START);
    expect(state.biomass).toBe(1);
  });

  it('draws a signal in from the new frontier when a slot is free', () => {
    const state = activeState();
    state.cataloguedHosts = ['bacterial_film'];

    const result = growSector(state, 0);
    expect(result.spawned).not.toBeNull();
    expect(state.contacts).toHaveLength(1);
  });
});
