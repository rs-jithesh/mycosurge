import { REACH_START } from '@mycosurge/config';
import type { GameState } from './state';
import { addBiomass } from './math';

export const AWAKENING_MESSAGES = [
  'The substrate is dry. You are a single spore, waiting.',
  'A drop of dew seeps through your cell wall.',
  'Something stirs. You are awake.',
];

const REPEAT_MESSAGE = 'You draw in moisture and minerals.';

/**
 * Early tutorial reserves are deliberately tiny so the player learns the 10 + 10 synthesis
 * before capacity opens up. The cap lifts once enough Biomass is banked to automate.
 */
export const TUTORIAL_RESERVE_CAP = 10;

/**
 * What one Absorb grants during the hook. Deliberately generous: the first synthesis should
 * be a handful of taps away, not ten, so an unlock lands every few seconds.
 */
export const TUTORIAL_ABSORB_AMOUNT = 2;

/** Reserve cost of one synthesis. Kept at the canonical 10 + 10 the copy teaches. */
export const TUTORIAL_SYNTH_WATER_COST = 10;
export const TUTORIAL_SYNTH_NUTRIENT_COST = 10;

/**
 * Hook-only generator price. Lower than the full game's `GENERATORS.baseCost` on purpose —
 * the real cost curve starts once the loop is learned.
 */
export const TUTORIAL_GENERATOR_COST = 1;

/**
 * Effective Water/Nutrients capacity. During the feed/grow steps it is {@link TUTORIAL_RESERVE_CAP};
 * from the automate step onward the real pool cap applies. Never reduces a value already above it.
 */
export function getTutorialReserveCap(state: GameState, resource: 'water' | 'nutrients'): number {
  const base = resource === 'water' ? state.waterCap : state.nutrientsCap;
  const early =
    state.gamePhase === 'awakening' ||
    (state.gamePhase === 'manager' && state.biomass < TUTORIAL_GENERATOR_COST);
  return early ? Math.min(base, TUTORIAL_RESERVE_CAP) : base;
}

function fillPool(current: number, cap: number, amount: number): number {
  if (current >= cap) return current;
  return Math.min(cap, current + amount);
}

let _absorbCount = 0;

export function resetAbsorbCount(): void {
  _absorbCount = 0;
}

export function absorbResources(state: GameState): string {
  state.water = fillPool(
    state.water,
    getTutorialReserveCap(state, 'water'),
    TUTORIAL_ABSORB_AMOUNT,
  );
  state.nutrients = fillPool(
    state.nutrients,
    getTutorialReserveCap(state, 'nutrients'),
    TUTORIAL_ABSORB_AMOUNT,
  );

  let message: string;
  if (_absorbCount < AWAKENING_MESSAGES.length) {
    message = AWAKENING_MESSAGES[_absorbCount];
  } else {
    message = REPEAT_MESSAGE;
  }
  _absorbCount++;

  if (
    state.gamePhase === 'awakening' &&
    state.water >= TUTORIAL_SYNTH_WATER_COST &&
    state.nutrients >= TUTORIAL_SYNTH_NUTRIENT_COST
  ) {
    state.gamePhase = 'manager';
  }

  return message;
}

export function synthesizeBiomass(state: GameState): { success: boolean; message: string } {
  if (state.water < TUTORIAL_SYNTH_WATER_COST || state.nutrients < TUTORIAL_SYNTH_NUTRIENT_COST) {
    return {
      success: false,
      message: `You need ${TUTORIAL_SYNTH_WATER_COST} Water and ${TUTORIAL_SYNTH_NUTRIENT_COST} Nutrients.`,
    };
  }
  state.water -= TUTORIAL_SYNTH_WATER_COST;
  state.nutrients -= TUTORIAL_SYNTH_NUTRIENT_COST;
  state.totalBiomassEarned += addBiomass(state, 1);
  return { success: true, message: 'Biomass formed — your cell has structural mass now.' };
}

export function purchaseTutorialUpgrade(
  state: GameState,
  upgrade: 'osmoticPump' | 'enzymaticExudates',
): { success: boolean; message: string } {
  if (state.biomass < TUTORIAL_GENERATOR_COST) {
    return {
      success: false,
      message: `You need ${TUTORIAL_GENERATOR_COST} Biomass to install a generator.`,
    };
  }
  if (state.tutorialUpgrades[upgrade]) {
    return { success: false, message: 'That generator is already installed.' };
  }
  state.biomass -= TUTORIAL_GENERATOR_COST;
  state.tutorialUpgrades[upgrade] = true;

  if (state.gamePhase === 'manager') {
    state.gamePhase = 'explorer';
  }

  const messages: Record<string, string> = {
    osmoticPump: 'Osmotic Pump installed — +1 Water per second.',
    enzymaticExudates: 'Enzymatic Exudates installed — +1 Nutrients per second.',
  };
  return { success: true, message: messages[upgrade] };
}

/**
 * Biomass cost of one tutorial reach extension. Deliberately low so the Expand
 * step is a short demonstration rather than a grind (the full game's reach curve
 * takes over afterwards).
 */
export const TUTORIAL_EXTEND_COST = 1;

export function extendHyphae(state: GameState): { success: boolean; message: string } {
  if (state.biomass < TUTORIAL_EXTEND_COST) {
    return {
      success: false,
      message: `You need ${TUTORIAL_EXTEND_COST} Biomass to extend your network.`,
    };
  }
  state.biomass -= TUTORIAL_EXTEND_COST;
  state.mycelialNetwork += 1;

  const message =
    state.mycelialNetwork === 1
      ? 'Your first hypha threads into the dark substrate.'
      : `Network extended — ${state.mycelialNetwork}mm of hyphae.`;

  if (state.mycelialNetwork >= 5 && state.gamePhase === 'explorer') {
    state.gamePhase = 'tactician';
  }

  return { success: true, message };
}

export function getTutorialShockMultiplier(state: GameState): number {
  return state.tutorialShockTimer > 0 ? 0.5 : 1;
}

export function applyTutorialDefeat(state: GameState): string[] {
  const penalties: string[] = [];

  const prevMN = state.mycelialNetwork;
  state.mycelialNetwork = Math.max(0, state.mycelialNetwork - 2);
  penalties.push(`Hyphae pushed back ${prevMN - state.mycelialNetwork}mm`);

  const prevBio = state.biomass;
  state.biomass = Math.floor(state.biomass * 0.9);
  const lost = prevBio - state.biomass;
  if (lost > 0) penalties.push(`${lost} Biomass burned in repairs`);

  state.tutorialShockTimer = 60;
  penalties.push('Production halved for 60s while you recover');

  return penalties;
}

export function tutorialTick(state: GameState, deltaSec: number): void {
  if (state.gamePhase === 'awakening') return;

  if (state.gamePhase !== 'active') {
    const shockMul = getTutorialShockMultiplier(state);

    if (state.tutorialUpgrades.osmoticPump) {
      state.water = fillPool(
        state.water,
        getTutorialReserveCap(state, 'water'),
        1 * deltaSec * shockMul,
      );
    }
    if (state.tutorialUpgrades.enzymaticExudates) {
      state.nutrients = fillPool(
        state.nutrients,
        getTutorialReserveCap(state, 'nutrients'),
        1 * deltaSec * shockMul,
      );
    }
  }

  if (state.tutorialShockTimer > 0) {
    state.tutorialShockTimer = Math.max(0, state.tutorialShockTimer - deltaSec);
  }
}

export function completeTutorial(state: GameState): void {
  if (state.tutorialUpgrades.osmoticPump) {
    state.generators['osmotic_pump'] = 1;
  }
  if (state.tutorialUpgrades.enzymaticExudates) {
    state.generators['enzymatic_exudates'] = 1;
  }
  state.gamePhase = 'active';
  // Reach continues into the full game from the tutorial's 5 mm (even when skipped).
  state.mycelialNetwork = Math.max(state.mycelialNetwork, REACH_START);
  _absorbCount = 0;
}
