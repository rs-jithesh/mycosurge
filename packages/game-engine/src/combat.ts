import {
  HOSTS,
  COMBAT_BIOMASS_BASE,
  COMBAT_BIOMASS_PER_DIFFICULTY,
  LYSATE_BASE_REWARD,
  getVariant,
} from '@mycosurge/config';
import type { CombatStats, GameState } from './state';
import { enterTrauma, getCombatYieldMultiplier, getEffectiveMaxBiomass, addBiomass } from './math';
import { clearActiveEncounter } from './radar';

export interface CombatResult {
  victory: boolean;
  biomassEarned: number;
  lysateEarned: number;
}

export function calculateVictoryReward(state: GameState, hostId: string): CombatResult {
  const host = HOSTS.find((h) => h.id === hostId);
  if (!host) {
    return { victory: true, biomassEarned: 0, lysateEarned: 0 };
  }

  const variant = getVariant(state.activeVariantId);
  const yieldMult = getCombatYieldMultiplier(state);
  const biomassEarned = Math.floor(
    (COMBAT_BIOMASS_BASE + COMBAT_BIOMASS_PER_DIFFICULTY * host.difficulty) *
      yieldMult *
      variant.rewardMult,
  );
  const lysateEarned = Math.floor(LYSATE_BASE_REWARD * host.difficulty * variant.lysateMult);

  return { victory: true, biomassEarned, lysateEarned };
}

/**
 * Side-effect-free preview of the rewards a host would yield, for showing the
 * expected payout before engaging. Mirrors {@link calculateVictoryReward}.
 */
export function previewCombatReward(
  state: GameState,
  hostId: string,
  variantId?: string,
): { biomassEarned: number; lysateEarned: number } {
  const host = HOSTS.find((h) => h.id === hostId);
  if (!host) return { biomassEarned: 0, lysateEarned: 0 };

  const variant = getVariant(variantId ?? state.activeVariantId);
  const yieldMult = getCombatYieldMultiplier(state);
  const biomassEarned = Math.floor(
    (COMBAT_BIOMASS_BASE + COMBAT_BIOMASS_PER_DIFFICULTY * host.difficulty) *
      yieldMult *
      variant.rewardMult,
  );
  const lysateEarned = Math.floor(LYSATE_BASE_REWARD * host.difficulty * variant.lysateMult);
  const storableBiomass = Math.min(
    biomassEarned,
    Math.max(0, getEffectiveMaxBiomass(state) - state.biomass),
  );
  return { biomassEarned: storableBiomass, lysateEarned };
}

export function applyVictory(state: GameState, hostId: string): CombatResult {
  const result = calculateVictoryReward(state, hostId);

  result.biomassEarned = addBiomass(state, result.biomassEarned);
  state.totalBiomassEarned += result.biomassEarned;
  state.lysateRaw += result.lysateEarned;
  state.lysateEarned += result.lysateEarned;

  clearActiveEncounter(state);

  return result;
}

export function applyDefeat(state: GameState): void {
  clearActiveEncounter(state);
  enterTrauma(state);
}

/**
 * Combat stats used by the arena — a defensive copy for the renderer.
 */
export function getEffectiveCombatStats(state: GameState): CombatStats {
  return { ...state.combatStats };
}
