import {
  MANUAL_ABSORB_AMOUNT,
  MANUAL_SYNTH_WATER_COST,
  MANUAL_SYNTH_NUTRIENT_COST,
  NUTRIENT_YIELD_THRESHOLD,
  STARVATION_STATE_THRESHOLD,
  SYNTHESIS_BRIM_RATIO,
  SYNTHESIS_BRIM_BONUS,
  getManualUpgrade,
  getManualUpgradeCost as calculateManualUpgradeCost,
} from '@mycosurge/config';
import type { ManualUpgradeId } from '@mycosurge/config';
import type { GameState } from './state';
import { addBiomass } from './math';

export interface SynthesisResult {
  success: boolean;
  yield: number;
}

// ── Manual-action upgrades ──
// Levels live in the (otherwise unused) `upgradeLevels` record, so no new state field.

export function getManualUpgradeLevel(state: GameState, id: ManualUpgradeId): number {
  return state.upgradeLevels[id] ?? 0;
}

/** Price of the next level of a manual upgrade, or null when maxed/unknown. */
export function getManualUpgradeCost(
  state: GameState,
  id: ManualUpgradeId,
): { lysate: number; biomass: number } | null {
  const def = getManualUpgrade(id);
  if (!def) return null;
  const level = state.upgradeLevels[id] ?? 0;
  if (level >= def.maxLevel) return null;
  return calculateManualUpgradeCost(def, level);
}

export function canPurchaseManualUpgrade(state: GameState, id: ManualUpgradeId): boolean {
  const cost = getManualUpgradeCost(state, id);
  if (!cost) return false;
  return state.lysateBanked >= cost.lysate && state.biomass >= cost.biomass;
}

export function purchaseManualUpgrade(state: GameState, id: ManualUpgradeId): boolean {
  if (!canPurchaseManualUpgrade(state, id)) return false;
  const cost = getManualUpgradeCost(state, id)!;
  state.lysateBanked -= cost.lysate;
  state.biomass -= cost.biomass;
  state.upgradeLevels[id] = (state.upgradeLevels[id] ?? 0) + 1;
  return true;
}

/** Water + Nutrients one Absorb grants at the current Absorption Depth level. */
export function getManualAbsorbAmount(state: GameState): number {
  const def = getManualUpgrade('absorption_depth');
  return (
    MANUAL_ABSORB_AMOUNT +
    (def?.absorbPerLevel ?? 0) * getManualUpgradeLevel(state, 'absorption_depth')
  );
}

/** Extra Biomass per synthesis from the Assimilation Yield upgrade. */
export function getManualYieldBonus(state: GameState): number {
  const def = getManualUpgrade('assimilation_yield');
  return (def?.yieldPerLevel ?? 0) * getManualUpgradeLevel(state, 'assimilation_yield');
}

/** Active-play floor: a Water/Nutrient top-up, deepened by upgrades. No cooldown. */
export function manualAbsorb(state: GameState): boolean {
  const amount = getManualAbsorbAmount(state);
  state.water = Math.min(state.waterCap, state.water + amount);
  state.nutrients = Math.min(state.nutrientsCap, state.nutrients + amount);
  return true;
}

export function canManualSynthesize(state: GameState): boolean {
  return state.water >= MANUAL_SYNTH_WATER_COST && state.nutrients >= MANUAL_SYNTH_NUTRIENT_COST;
}

/**
 * Biomass the next synthesis would yield, based on the reserves left afterwards.
 * Healthy reserves give a full unit; strained reserves a half; near-starvation wastes
 * the conversion entirely. When both reserves are brimming, a timely synthesis earns a
 * small bonus — a reward for collecting before production goes to waste. The Assimilation
 * Yield upgrade adds a flat bonus on top.
 */
export function getSynthesisYield(state: GameState): number {
  const bonus = getManualYieldBonus(state);
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
    return (currentMinRatio >= SYNTHESIS_BRIM_RATIO ? 1 + SYNTHESIS_BRIM_BONUS : 1) + bonus;
  }
  if (minRatio >= STARVATION_STATE_THRESHOLD) return 0.5 + bonus;
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
