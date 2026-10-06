import { describe, it, expect } from 'vitest';
import {
  absorbResources,
  canGrowTutorial,
  getTutorialReserveCap,
  getTutorialSectorDepths,
  grantTutorialStart,
  growTutorialSector,
  isTutorialSignalReached,
  purchaseTutorialUpgrade,
  signalSectorFor,
  TUTORIAL_ABSORB_NUTRIENTS,
  TUTORIAL_ABSORB_WATER,
  TUTORIAL_GENERATOR2_NUTRIENT_COST,
  TUTORIAL_GENERATOR2_WATER_COST,
  TUTORIAL_GENERATOR_WATER_COST,
  TUTORIAL_RESERVE_CAP,
  TUTORIAL_SECTOR_NUTRIENT_COST,
  TUTORIAL_SECTOR_WATER_COST,
  TUTORIAL_SIGNAL_STEPS,
  TUTORIAL_START_NUTRIENTS,
  TUTORIAL_START_WATER,
} from './tutorial';
import { createInitialState } from './state';

/** A fresh tutorial with the signal pinned to sector 0 (networkSeed 0). */
function freshTutorial() {
  const state = createInitialState();
  state.networkSeed = 0;
  grantTutorialStart(state);
  return state;
}

describe('grantTutorialStart', () => {
  it('grants the opening store and no sector growth', () => {
    const state = createInitialState();
    grantTutorialStart(state);
    expect(state.water).toBe(TUTORIAL_START_WATER);
    expect(state.nutrients).toBe(TUTORIAL_START_NUTRIENTS);
    expect(getTutorialSectorDepths(state)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe('absorbResources', () => {
  it('grants Water and Nutrients, clamped to the tutorial cap', () => {
    const state = createInitialState();
    state.water = 0;
    state.nutrients = 0;
    absorbResources(state);
    expect(state.water).toBe(TUTORIAL_ABSORB_WATER);
    expect(state.nutrients).toBe(TUTORIAL_ABSORB_NUTRIENTS);

    for (let i = 0; i < 20; i++) absorbResources(state);
    expect(state.water).toBe(TUTORIAL_RESERVE_CAP);
    expect(state.nutrients).toBe(TUTORIAL_RESERVE_CAP);
  });
});

describe('getTutorialReserveCap', () => {
  it('is the small tutorial cap until the full game is active', () => {
    const state = createInitialState();
    expect(getTutorialReserveCap(state, 'water')).toBe(TUTORIAL_RESERVE_CAP);
    state.gamePhase = 'active';
    expect(getTutorialReserveCap(state, 'water')).toBe(state.waterCap);
  });
});

describe('growTutorialSector', () => {
  it('spends Water and Nutrients to grow a sector', () => {
    const state = freshTutorial();
    const result = growTutorialSector(state, 1);
    expect(result.success).toBe(true);
    expect(state.water).toBe(TUTORIAL_START_WATER - TUTORIAL_SECTOR_WATER_COST);
    expect(state.nutrients).toBe(TUTORIAL_START_NUTRIENTS - TUTORIAL_SECTOR_NUTRIENT_COST);
    expect(getTutorialSectorDepths(state)[1]).toBe(1);
  });

  it('refuses without the reserves', () => {
    const state = freshTutorial();
    state.water = 0;
    state.nutrients = 0;
    expect(canGrowTutorial(state)).toBe(false);
    expect(growTutorialSector(state, 0).success).toBe(false);
  });

  it('hands off once the signal sector is fully grown', () => {
    const state = freshTutorial();
    const sector = signalSectorFor(state);
    for (let i = 0; i < TUTORIAL_SIGNAL_STEPS; i++) {
      state.water = TUTORIAL_SECTOR_WATER_COST;
      state.nutrients = TUTORIAL_SECTOR_NUTRIENT_COST;
      expect(growTutorialSector(state, sector).success).toBe(true);
    }
    expect(isTutorialSignalReached(state)).toBe(true);
    expect(state.gamePhase).toBe('tactician');
  });
});

describe('purchaseTutorialUpgrade', () => {
  it('installs the first generator for Water', () => {
    const state = freshTutorial();
    state.water = TUTORIAL_GENERATOR_WATER_COST;
    expect(purchaseTutorialUpgrade(state, 'osmoticPump').success).toBe(true);
    expect(state.water).toBe(0);
  });

  it('charges Water and Nutrients for the second generator', () => {
    const state = freshTutorial();
    state.water = TUTORIAL_GENERATOR2_WATER_COST;
    state.nutrients = TUTORIAL_GENERATOR2_NUTRIENT_COST;
    expect(purchaseTutorialUpgrade(state, 'enzymaticExudates').success).toBe(true);
    expect(state.water).toBe(0);
    expect(state.nutrients).toBe(0);
  });
});
