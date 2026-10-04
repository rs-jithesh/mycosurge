import {
  MANUAL_ABSORB_AMOUNT,
  MANUAL_ABSORB_COOLDOWN,
  MANUAL_SYNTH_WATER_COST,
  MANUAL_SYNTH_NUTRIENT_COST,
  NUTRIENT_YIELD_THRESHOLD,
  STARVATION_STATE_THRESHOLD,
  SYNTHESIS_BRIM_RATIO,
  SYNTHESIS_BRIM_BONUS,
} from '@mycosurge/config';
import type { GameState } from './state';
import { addBiomass } from './math';

export interface SynthesisResult {
  success: boolean;
  yield: number;
}

export function canManualAbsorb(state: GameState): boolean {
  return state.manualCooldown <= 0;
}

/** Active-play floor: a small Water/Nutrient top-up on a cooldown. */
export function manualAbsorb(state: GameState): boolean {
  if (state.manualCooldown > 0) return false;

  state.water = Math.min(state.waterCap, state.water + MANUAL_ABSORB_AMOUNT);
  state.nutrients = Math.min(state.nutrientsCap, state.nutrients + MANUAL_ABSORB_AMOUNT);
  state.manualCooldown = MANUAL_ABSORB_COOLDOWN;
  return true;
}

export function tickManualCooldown(state: GameState, deltaSec: number): void {
  if (state.manualCooldown > 0) {
    state.manualCooldown = Math.max(0, state.manualCooldown - deltaSec);
  }
}

export function canManualSynthesize(state: GameState): boolean {
  return state.water >= MANUAL_SYNTH_WATER_COST && state.nutrients >= MANUAL_SYNTH_NUTRIENT_COST;
}

/**
 * Biomass the next synthesis would yield, based on the reserves left afterwards.
 * Healthy reserves give a full unit; strained reserves a half; near-starvation wastes
 * the conversion entirely. When both reserves are brimming, a timely synthesis earns a
 * small bonus — a reward for collecting before production goes to waste.
 */
export function getSynthesisYield(state: GameState): number {
  const waterAfter = Math.max(0, state.water - MANUAL_SYNTH_WATER_COST);
  const nutrientAfter = Math.max(0, state.nutrients - MANUAL_SYNTH_NUTRIENT_COST);
  const minRatio = Math.min(
    state.waterCap > 0 ? waterAfter / state.waterCap : 0,
    state.nutrientsCap > 0 ? nutrientAfter / state.nutrientsCap : 0,
  );

  if (minRatio >= NUTRIENT_YIELD_THRESHOLD) {
    const currentMinRatio = Math.min(
      state.waterCap > 0 ? state.water / state.waterCap : 0,
      state.nutrientsCap > 0 ? state.nutrients / state.nutrientsCap : 0,
    );
    return currentMinRatio >= SYNTHESIS_BRIM_RATIO ? 1 + SYNTHESIS_BRIM_BONUS : 1;
  }
  if (minRatio >= STARVATION_STATE_THRESHOLD) return 0.5;
  return 0;
}

/** Convert Water + Nutrients into Biomass, with a yield penalty when overdrawing. */
export function manualSynthesize(state: GameState): SynthesisResult {
  if (!canManualSynthesize(state)) return { success: false, yield: 0 };

  const gained = getSynthesisYield(state);
  state.water -= MANUAL_SYNTH_WATER_COST;
  state.nutrients -= MANUAL_SYNTH_NUTRIENT_COST;
  state.totalBiomassEarned += addBiomass(state, gained);
  return { success: true, yield: gained };
}
