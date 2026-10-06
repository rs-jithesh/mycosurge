import { describe, it, expect } from 'vitest';
import {
  absorbResources,
  extendHyphae,
  getTutorialReserveCap,
  nutrientsUnlocked,
  purchaseTutorialUpgrade,
  TUTORIAL_ABSORB_NUTRIENTS,
  TUTORIAL_ABSORB_WATER,
  TUTORIAL_GENERATOR2_NUTRIENT_COST,
  TUTORIAL_GENERATOR2_WATER_COST,
  TUTORIAL_GENERATOR_WATER_COST,
  TUTORIAL_GROW_NUTRIENT_COST,
  TUTORIAL_GROW_WATER_COST,
  TUTORIAL_RESERVE_CAP,
} from './tutorial';
import { createInitialState } from './state';

describe('absorbResources', () => {
  it('gathers only Water before the first growth', () => {
    const state = createInitialState();
    absorbResources(state);
    expect(state.water).toBe(TUTORIAL_ABSORB_WATER);
    expect(state.nutrients).toBe(0);
    expect(nutrientsUnlocked(state)).toBe(false);
  });

  it('gathers Water and Nutrients once they are unlocked', () => {
    const state = createInitialState();
    state.gamePhase = 'manager';
    absorbResources(state);
    expect(state.water).toBe(TUTORIAL_ABSORB_WATER);
    expect(state.nutrients).toBe(TUTORIAL_ABSORB_NUTRIENTS);
  });

  it('holds early reserves at the small tutorial cap', () => {
    const state = createInitialState();
    for (let i = 0; i < 25; i++) absorbResources(state);
    expect(state.water).toBe(TUTORIAL_RESERVE_CAP);
  });
});

describe('extendHyphae', () => {
  it('spends Water to grow the first hypha and reveals Nutrients', () => {
    const state = createInitialState();
    state.water = TUTORIAL_GROW_WATER_COST;
    const result = extendHyphae(state);
    expect(result.success).toBe(true);
    expect(state.mycelialNetwork).toBe(1);
    expect(state.water).toBe(0);
    expect(state.gamePhase).toBe('manager');
    expect(nutrientsUnlocked(state)).toBe(true);
  });

  it('charges Water and Nutrients after the unlock', () => {
    const state = createInitialState();
    state.gamePhase = 'manager';
    state.water = TUTORIAL_GROW_WATER_COST;
    state.nutrients = TUTORIAL_GROW_NUTRIENT_COST;
    expect(extendHyphae(state).success).toBe(true);
    expect(state.water).toBe(0);
    expect(state.nutrients).toBe(0);
  });

  it('refuses without the reserves', () => {
    const state = createInitialState();
    expect(extendHyphae(state).success).toBe(false);
  });

  it('gates further growth until both generators are installed', () => {
    const state = createInitialState();
    state.gamePhase = 'manager';
    state.mycelialNetwork = 1;
    state.water = 50;
    state.nutrients = 50;
    expect(extendHyphae(state).success).toBe(false);

    state.tutorialUpgrades.osmoticPump = true;
    state.tutorialUpgrades.enzymaticExudates = true;
    expect(extendHyphae(state).success).toBe(true);
  });
});

describe('purchaseTutorialUpgrade', () => {
  it('is gated until the first growth', () => {
    const state = createInitialState();
    expect(purchaseTutorialUpgrade(state, 'osmoticPump').success).toBe(false);
  });

  it('installs the first generator for Water', () => {
    const state = createInitialState();
    state.gamePhase = 'manager';
    state.water = TUTORIAL_GENERATOR_WATER_COST;
    const result = purchaseTutorialUpgrade(state, 'osmoticPump');
    expect(result.success).toBe(true);
    expect(state.water).toBe(0);
    expect(state.gamePhase).toBe('explorer');
  });

  it('charges Water and Nutrients for the second generator', () => {
    const state = createInitialState();
    state.gamePhase = 'manager';
    state.water = TUTORIAL_GENERATOR2_WATER_COST;
    state.nutrients = TUTORIAL_GENERATOR2_NUTRIENT_COST;
    expect(purchaseTutorialUpgrade(state, 'enzymaticExudates').success).toBe(true);
    expect(state.water).toBe(0);
    expect(state.nutrients).toBe(0);
  });
});

describe('getTutorialReserveCap', () => {
  it('is small while feeding and growing', () => {
    const state = createInitialState();
    expect(getTutorialReserveCap(state, 'water')).toBe(TUTORIAL_RESERVE_CAP);

    state.gamePhase = 'manager';
    expect(getTutorialReserveCap(state, 'nutrients')).toBe(TUTORIAL_RESERVE_CAP);
  });

  it('opens to the full pool once a generator is installed', () => {
    const state = createInitialState();
    state.gamePhase = 'explorer';
    expect(getTutorialReserveCap(state, 'water')).toBe(state.waterCap);
    expect(getTutorialReserveCap(state, 'nutrients')).toBe(state.nutrientsCap);
  });
});
