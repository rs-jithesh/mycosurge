import { REACH_START } from '@mycosurge/config';
import type { GameState } from './state';
import { addBiomass } from './math';

export const AWAKENING_MESSAGES = [
  'The substrate is dry. You are a single spore, waiting.',
  'A drop of dew seeps through your cell wall.',
  'Something stirs. You are awake.',
];

const WATER_MESSAGE = 'You draw water from the substrate.';
const BOTH_MESSAGE = 'Water and minerals seep into the hyphae.';

/**
 * First-session tuning. **Water is the only resource at the start.** Nutrients are revealed
 * by the first growth, and the whole hook is paid in Water (then Water + Nutrients). Biomass
 * is deliberately absent — it arrives with the full game.
 *
 * Every value lives here so the opening can be tuned in one place and simulated by
 * `first-session.sim.test.ts`.
 */
export const TUTORIAL_RESERVE_CAP = 12;
/** What one Absorb grants, Water always and Nutrients once they are unlocked. */
export const TUTORIAL_ABSORB_WATER = 2;
export const TUTORIAL_ABSORB_NUTRIENTS = 2;
/** Cost of one hypha (growth). Nutrients are only charged once unlocked. */
export const TUTORIAL_GROW_WATER_COST = 3;
export const TUTORIAL_GROW_NUTRIENT_COST = 2;
/** Water price of the first generator — Osmotic Pump (+1 Water/s). */
export const TUTORIAL_GENERATOR_WATER_COST = 6;
/** Water + Nutrients price of the second generator — Enzymatic Exudates (+1 Nutrients/s). */
export const TUTORIAL_GENERATOR2_WATER_COST = 6;
export const TUTORIAL_GENERATOR2_NUTRIENT_COST = 6;
/** Reach (mm) at which the sensed signal resolves into the tutorial threat. */
export const TUTORIAL_REACH_TARGET = 5;

/** Full-game Biomass synthesis costs (kept, but not part of the first-session hook). */
export const TUTORIAL_SYNTH_WATER_COST = 10;
export const TUTORIAL_SYNTH_NUTRIENT_COST = 10;

/** Nutrients stay hidden until the first hypha grows. */
export function nutrientsUnlocked(state: GameState): boolean {
  return state.gamePhase !== 'awakening';
}

/**
 * Effective Water/Nutrients capacity. During the water/grow steps it is
 * {@link TUTORIAL_RESERVE_CAP}; from the first generator onward the real pool cap applies.
 * Never reduces a value already above it.
 */
export function getTutorialReserveCap(state: GameState, resource: 'water' | 'nutrients'): number {
  const base = resource === 'water' ? state.waterCap : state.nutrientsCap;
  const early = state.gamePhase === 'awakening' || state.gamePhase === 'manager';
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
  state.water = fillPool(state.water, getTutorialReserveCap(state, 'water'), TUTORIAL_ABSORB_WATER);
  if (nutrientsUnlocked(state)) {
    state.nutrients = fillPool(
      state.nutrients,
      getTutorialReserveCap(state, 'nutrients'),
      TUTORIAL_ABSORB_NUTRIENTS,
    );
  }

  let message: string;
  if (_absorbCount < AWAKENING_MESSAGES.length) {
    message = AWAKENING_MESSAGES[_absorbCount];
  } else {
    message = nutrientsUnlocked(state) ? BOTH_MESSAGE : WATER_MESSAGE;
  }
  _absorbCount++;
  return message;
}

/**
 * Grow one hypha. Paid in Water (and Nutrients once they are unlocked). The first growth
 * reveals Nutrients; reaching {@link TUTORIAL_REACH_TARGET} after the first generator hands
 * off to the tutorial threat.
 */
export function extendHyphae(state: GameState): { success: boolean; message: string } {
  const waterCost = TUTORIAL_GROW_WATER_COST;
  const nutrientCost = nutrientsUnlocked(state) ? TUTORIAL_GROW_NUTRIENT_COST : 0;
  if (state.water < waterCost || state.nutrients < nutrientCost) {
    return {
      success: false,
      message:
        nutrientCost > 0
          ? `You need ${waterCost} Water and ${nutrientCost} Nutrients.`
          : `You need ${waterCost} Water.`,
    };
  }
  state.water -= waterCost;
  state.nutrients -= nutrientCost;
  state.mycelialNetwork += 1;

  // The first growth opens Nutrients — the second resource of the session.
  if (state.gamePhase === 'awakening') {
    state.gamePhase = 'manager';
  }

  const message =
    state.mycelialNetwork === 1
      ? 'Your first hypha threads into the dark substrate.'
      : `Network extended — ${state.mycelialNetwork}mm of hyphae.`;

  if (state.mycelialNetwork >= TUTORIAL_REACH_TARGET && state.gamePhase === 'explorer') {
    state.gamePhase = 'tactician';
  }

  return { success: true, message };
}

/**
 * Full-game Synthesis (10 Water + 10 Nutrients → 1 Biomass). Not used by the first-session
 * hook — Biomass arrives with the full game — but kept for the store and future use.
 */
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
  if (state.tutorialUpgrades[upgrade]) {
    return { success: false, message: 'That generator is already installed.' };
  }
  if (!nutrientsUnlocked(state)) {
    return { success: false, message: 'Establish your first growth first.' };
  }

  const cost =
    upgrade === 'osmoticPump'
      ? { water: TUTORIAL_GENERATOR_WATER_COST, nutrients: 0 }
      : { water: TUTORIAL_GENERATOR2_WATER_COST, nutrients: TUTORIAL_GENERATOR2_NUTRIENT_COST };

  if (state.water < cost.water || state.nutrients < cost.nutrients) {
    return {
      success: false,
      message:
        cost.nutrients > 0
          ? `You need ${cost.water} Water and ${cost.nutrients} Nutrients.`
          : `You need ${cost.water} Water.`,
    };
  }

  state.water -= cost.water;
  state.nutrients -= cost.nutrients;
  state.tutorialUpgrades[upgrade] = true;

  if (state.gamePhase === 'manager') {
    state.gamePhase = state.mycelialNetwork >= TUTORIAL_REACH_TARGET ? 'tactician' : 'explorer';
  }

  const messages: Record<string, string> = {
    osmoticPump: 'Osmotic Pump installed — +1 Water per second.',
    enzymaticExudates: 'Enzymatic Exudates installed — +1 Nutrients per second.',
  };
  return { success: true, message: messages[upgrade] };
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
