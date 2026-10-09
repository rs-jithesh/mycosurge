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
 * First-session tuning — **goal first**. The player wakes with a store of Water and
 * Nutrients and a far signal, spends the store reaching for it, runs dry, and only then
 * meets the economy that lets them finish. Every value lives here so the opening can be
 * tuned in one place (and checked by `first-session.sim.test.ts`).
 */
export const TUTORIAL_SECTORS = 6;
/** Grows needed in the signal's sector — long enough that tapping alone is a slog. */
export const TUTORIAL_SIGNAL_STEPS = 20;
/** Starting store, enough for a couple of grows and no more. */
export const TUTORIAL_START_WATER = 24;
export const TUTORIAL_START_NUTRIENTS = 24;
export const TUTORIAL_RESERVE_CAP = 60;
/**
 * What one Absorb grants. Neither the tutorial nor the full game has an Absorb cooldown, so
 * the only friction is the number of taps — a deliberately small grant keeps hand-gathering a
 * chore that the generators relieve.
 */
export const TUTORIAL_ABSORB_WATER = 3;
export const TUTORIAL_ABSORB_NUTRIENTS = 3;
/** Cost of one sector grow. */
export const TUTORIAL_SECTOR_WATER_COST = 12;
export const TUTORIAL_SECTOR_NUTRIENT_COST = 10;
/** Water price of the first generator — Osmotic Pump (+Water/s). */
export const TUTORIAL_GENERATOR_WATER_COST = 30;
/** Water + Nutrients price of the second generator — Enzymatic Exudates (+Nutrients/s). */
export const TUTORIAL_GENERATOR2_WATER_COST = 40;
export const TUTORIAL_GENERATOR2_NUTRIENT_COST = 40;
/** Base passive income per installed generator (per second); scales with the tier. */
export const TUTORIAL_GENERATOR_RATE = 2;
/** How many times the two generators can be upgraded. */
export const TUTORIAL_MAX_GENERATOR_TIER = 2;
/** Cost of each generator upgrade, indexed by the tier it buys. */
export const TUTORIAL_GENERATOR_UPGRADE_COST = [
  { water: 50, nutrients: 30 },
  { water: 80, nutrients: 50 },
] as const;

/** Per-generator output at the current tier. */
export function tutorialGeneratorRate(state: GameState): number {
  return TUTORIAL_GENERATOR_RATE * (1 + state.tutorialGeneratorTier);
}

/** The cost of the next generator upgrade, or null when fully upgraded. */
export function generatorUpgradeCost(
  state: GameState,
): { water: number; nutrients: number } | null {
  const tier = state.tutorialGeneratorTier;
  if (tier >= TUTORIAL_MAX_GENERATOR_TIER) return null;
  return TUTORIAL_GENERATOR_UPGRADE_COST[tier];
}

/** Buy the next generator upgrade (up to {@link TUTORIAL_MAX_GENERATOR_TIER} times). */
export function upgradeTutorialGenerators(state: GameState): { success: boolean; message: string } {
  const cost = generatorUpgradeCost(state);
  if (!cost) {
    return { success: false, message: 'The generators are fully upgraded.' };
  }
  if (!state.tutorialUpgrades.osmoticPump && !state.tutorialUpgrades.enzymaticExudates) {
    return { success: false, message: 'Install a generator first.' };
  }
  if (state.water < cost.water || state.nutrients < cost.nutrients) {
    return {
      success: false,
      message: `You need ${cost.water} Water and ${cost.nutrients} Nutrients.`,
    };
  }
  state.water -= cost.water;
  state.nutrients -= cost.nutrients;
  state.tutorialGeneratorTier += 1;
  return {
    success: true,
    message: `Generators upgraded — +${tutorialGeneratorRate(state)} per second each.`,
  };
}
/** Full-game Biomass synthesis costs (kept, but not part of the first-session hook). */
export const TUTORIAL_SYNTH_WATER_COST = 10;
export const TUTORIAL_SYNTH_NUTRIENT_COST = 10;

/** Which sector holds the signal — deterministic from the map seed. */
export function signalSectorFor(state: GameState): number {
  return Math.abs(Math.floor(state.networkSeed)) % TUTORIAL_SECTORS;
}

/** Growth (steps) per sector, always length {@link TUTORIAL_SECTORS}. */
export function getTutorialSectorDepths(state: GameState): number[] {
  return Array.from({ length: TUTORIAL_SECTORS }, (_, i) => state.tutorialSectors[i] ?? 0);
}

/** True once the signal's sector has been grown all the way. */
export function isTutorialSignalReached(state: GameState): boolean {
  return (state.tutorialSectors[signalSectorFor(state)] ?? 0) >= TUTORIAL_SIGNAL_STEPS;
}

/** True while the player can afford one sector grow. */
export function canGrowTutorial(state: GameState): boolean {
  return (
    state.water >= TUTORIAL_SECTOR_WATER_COST && state.nutrients >= TUTORIAL_SECTOR_NUTRIENT_COST
  );
}

/**
 * Effective Water/Nutrients capacity. The tutorial runs a small pool
 * ({@link TUTORIAL_RESERVE_CAP}); the real caps apply once the full game is active.
 */
export function getTutorialReserveCap(state: GameState, resource: 'water' | 'nutrients'): number {
  const base = resource === 'water' ? state.waterCap : state.nutrientsCap;
  return state.gamePhase === 'active' ? base : Math.min(base, TUTORIAL_RESERVE_CAP);
}

function fillPool(current: number, cap: number, amount: number): number {
  if (current >= cap) return current;
  return Math.min(cap, current + amount);
}

let _absorbCount = 0;

export function resetAbsorbCount(): void {
  _absorbCount = 0;
}

/** Grant the opening store. Called once when a fresh tutorial begins. */
export function grantTutorialStart(state: GameState): void {
  state.water = Math.min(state.waterCap, TUTORIAL_START_WATER);
  state.nutrients = Math.min(state.nutrientsCap, TUTORIAL_START_NUTRIENTS);
  state.tutorialSectors = [];
}

/** Grants the opening store on every tap — the tutorial has no Absorb cooldown. */
export function absorbResources(state: GameState): string {
  state.water = fillPool(state.water, getTutorialReserveCap(state, 'water'), TUTORIAL_ABSORB_WATER);
  state.nutrients = fillPool(
    state.nutrients,
    getTutorialReserveCap(state, 'nutrients'),
    TUTORIAL_ABSORB_NUTRIENTS,
  );

  let message: string;
  if (_absorbCount < AWAKENING_MESSAGES.length) {
    message = AWAKENING_MESSAGES[_absorbCount];
  } else {
    message = state.gamePhase === 'awakening' ? WATER_MESSAGE : BOTH_MESSAGE;
  }
  _absorbCount++;
  return message;
}

/**
 * Grow one sector by a step. Spends Water + Nutrients. Growing the signal's sector to
 * {@link TUTORIAL_SIGNAL_STEPS} resolves it and hands off to the tutorial threat.
 */
export function growTutorialSector(
  state: GameState,
  sector: number,
): { success: boolean; message: string } {
  if (sector < 0 || sector >= TUTORIAL_SECTORS) {
    return { success: false, message: 'That is not a direction.' };
  }
  const depths = getTutorialSectorDepths(state);
  if (depths[sector] >= TUTORIAL_SIGNAL_STEPS) {
    return { success: false, message: 'That direction is as far as it reaches.' };
  }
  if (!canGrowTutorial(state)) {
    return {
      success: false,
      message: `You need ${TUTORIAL_SECTOR_WATER_COST} Water and ${TUTORIAL_SECTOR_NUTRIENT_COST} Nutrients.`,
    };
  }
  state.water -= TUTORIAL_SECTOR_WATER_COST;
  state.nutrients -= TUTORIAL_SECTOR_NUTRIENT_COST;
  depths[sector] += 1;
  state.tutorialSectors = depths;

  if (
    sector === signalSectorFor(state) &&
    depths[sector] >= TUTORIAL_SIGNAL_STEPS &&
    state.gamePhase === 'awakening'
  ) {
    state.gamePhase = 'tactician';
  }

  return {
    success: true,
    message:
      depths.reduce((a, b) => a + b, 0) === 1
        ? 'A hypha reaches into the dark.'
        : 'The hypha presses on.',
  };
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

/** Install one of the two tutorial generators. The economy reveal; no phase gate. */
export function purchaseTutorialUpgrade(
  state: GameState,
  upgrade: 'osmoticPump' | 'enzymaticExudates',
): { success: boolean; message: string } {
  if (state.tutorialUpgrades[upgrade]) {
    return { success: false, message: 'That generator is already installed.' };
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

  const rate = tutorialGeneratorRate(state);
  const messages: Record<string, string> = {
    osmoticPump: `Osmotic Pump installed — +${rate} Water per second.`,
    enzymaticExudates: `Enzymatic Exudates installed — +${rate} Nutrients per second.`,
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
  if (state.gamePhase !== 'active') {
    const shockMul = getTutorialShockMultiplier(state);
    const rate = tutorialGeneratorRate(state);

    if (state.tutorialUpgrades.osmoticPump) {
      state.water = fillPool(
        state.water,
        getTutorialReserveCap(state, 'water'),
        rate * deltaSec * shockMul,
      );
    }
    if (state.tutorialUpgrades.enzymaticExudates) {
      state.nutrients = fillPool(
        state.nutrients,
        getTutorialReserveCap(state, 'nutrients'),
        rate * deltaSec * shockMul,
      );
    }
  }

  if (state.tutorialShockTimer > 0) {
    state.tutorialShockTimer = Math.max(0, state.tutorialShockTimer - deltaSec);
  }
}

export function completeTutorial(state: GameState): void {
  // Tutorial upgrades carry into the full game as generator levels.
  const level = 1 + state.tutorialGeneratorTier;
  if (state.tutorialUpgrades.osmoticPump) {
    state.generators['osmotic_pump'] = level;
  }
  if (state.tutorialUpgrades.enzymaticExudates) {
    state.generators['enzymatic_exudates'] = level;
  }
  state.gamePhase = 'active';
  // Reach continues into the full game from the tutorial's 5 mm (even when skipped).
  state.mycelialNetwork = Math.max(state.mycelialNetwork, REACH_START);
  _absorbCount = 0;
}
