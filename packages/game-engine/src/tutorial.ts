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
const AUTOMATE_BIOMASS = 2;

/**
 * Effective Water/Nutrients capacity. During the feed/grow steps it is {@link TUTORIAL_RESERVE_CAP};
 * from the automate step onward the real pool cap applies. Never reduces a value already above it.
 */
export function getTutorialReserveCap(state: GameState, resource: 'water' | 'nutrients'): number {
  const base = resource === 'water' ? state.waterCap : state.nutrientsCap;
  const early =
    state.gamePhase === 'awakening' ||
    (state.gamePhase === 'manager' && state.biomass < AUTOMATE_BIOMASS);
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
  state.water = fillPool(state.water, getTutorialReserveCap(state, 'water'), 1);
  state.nutrients = fillPool(state.nutrients, getTutorialReserveCap(state, 'nutrients'), 1);

  let message: string;
  if (_absorbCount < AWAKENING_MESSAGES.length) {
    message = AWAKENING_MESSAGES[_absorbCount];
  } else {
    message = REPEAT_MESSAGE;
  }
  _absorbCount++;

  if (state.gamePhase === 'awakening' && state.water >= 10 && state.nutrients >= 10) {
    state.gamePhase = 'manager';
  }

  return message;
}

export function synthesizeBiomass(state: GameState): { success: boolean; message: string } {
  if (state.water < 10 || state.nutrients < 10) {
    return { success: false, message: 'You need 10 Water and 10 Nutrients.' };
  }
  state.water -= 10;
  state.nutrients -= 10;
  state.totalBiomassEarned += addBiomass(state, 1);
  return { success: true, message: 'Biomass formed — your cell has structural mass now.' };
}

export function purchaseTutorialUpgrade(
  state: GameState,
  upgrade: 'osmoticPump' | 'enzymaticExudates',
): { success: boolean; message: string } {
  if (state.biomass < 2) {
    return { success: false, message: 'You need 2 Biomass to install a generator.' };
  }
  if (state.tutorialUpgrades[upgrade]) {
    return { success: false, message: 'That generator is already installed.' };
  }
  state.biomass -= 2;
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

export function extendHyphae(state: GameState): { success: boolean; message: string } {
  if (state.biomass < 5) {
    return { success: false, message: 'You need 5 Biomass to extend your network.' };
  }
  state.biomass -= 5;
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
