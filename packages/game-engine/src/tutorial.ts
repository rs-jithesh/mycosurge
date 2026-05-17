import type { GameState } from './state';

export const AWAKENING_MESSAGES = [
  'The substrate is dry.',
  'A drop of dew permeates the cell wall.',
  'Consciousness sparks.',
];

const REPEAT_MESSAGE = 'Absorbed moisture and trace minerals.';

let _absorbCount = 0;

export function resetAbsorbCount(): void {
  _absorbCount = 0;
}

export function absorbResources(state: GameState): string {
  state.water += 1;
  state.nutrients += 1;

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
    return { success: false, message: 'Insufficient water or nutrients.' };
  }
  state.water -= 10;
  state.nutrients -= 10;
  state.biomass += 1;
  state.totalBiomassEarned += 1;
  return { success: true, message: 'Biomass synthesized. Structural proteins forming.' };
}

export function purchaseTutorialUpgrade(
  state: GameState,
  upgrade: 'osmoticPump' | 'enzymaticExudates',
): { success: boolean; message: string } {
  if (state.biomass < 2) {
    return { success: false, message: 'Insufficient biomass.' };
  }
  if (state.tutorialUpgrades[upgrade]) {
    return { success: false, message: 'Upgrade already installed.' };
  }
  state.biomass -= 2;
  state.tutorialUpgrades[upgrade] = true;

  if (state.gamePhase === 'manager') {
    state.gamePhase = 'explorer';
  }

  const messages: Record<string, string> = {
    osmoticPump: 'Osmotic pump installed. Passive water intake: +1/s.',
    enzymaticExudates: 'Enzymatic exudates deployed. Passive nutrient absorption: +1/s.',
  };
  return { success: true, message: messages[upgrade] };
}

export function extendHyphae(state: GameState): { success: boolean; message: string } {
  if (state.biomass < 5) {
    return { success: false, message: 'Insufficient biomass.' };
  }
  state.biomass -= 5;
  state.mycelialNetwork += 1;

  const message =
    state.mycelialNetwork === 1
      ? 'Hyphal network extended into the dark substrate.'
      : `Mycelial boundary expanded. Territory: ${state.mycelialNetwork}mm.`;

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
  penalties.push(`-${prevMN - state.mycelialNetwork}mm Hyphae distance`);

  const prevBio = state.biomass;
  state.biomass = Math.floor(state.biomass * 0.9);
  const lost = prevBio - state.biomass;
  if (lost > 0) penalties.push(`-${lost} Biomass (10%)`);

  state.tutorialShockTimer = 60;
  penalties.push('Water/Nutrient gen: 50% for 60s');

  return penalties;
}

export function tutorialTick(state: GameState, deltaSec: number): void {
  if (state.gamePhase === 'awakening') return;

  if (state.gamePhase !== 'active') {
    const shockMul = getTutorialShockMultiplier(state);

    if (state.tutorialUpgrades.osmoticPump) {
      state.water = Math.min(state.waterCap, state.water + 1 * deltaSec * shockMul);
    }
    if (state.tutorialUpgrades.enzymaticExudates) {
      state.nutrients = Math.min(state.nutrientsCap, state.nutrients + 1 * deltaSec * shockMul);
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
  _absorbCount = 0;
}
