import {
  HOSTS,
  COMBAT_BIOMASS_BASE,
  COMBAT_BIOMASS_PER_DIFFICULTY,
  LYSATE_BASE_REWARD,
  HOST_ASSIMILATION_TARGET,
  getStrain,
} from '@mycosurge/config';
import type { CombatStats, GameState } from './state';
import { enterTrauma, getCombatYieldMultiplier, getEffectiveMaxBiomass, addBiomass } from './math';
import { clearActiveEncounter } from './radar';

export interface CombatResult {
  victory: boolean;
  biomassEarned: number;
  assimilationGained: number;
  lysateEarned: number;
  hostDefeated: boolean;
}

export function calculateVictoryReward(state: GameState, hostId: string): CombatResult {
  const host = HOSTS.find((h) => h.id === hostId);
  if (!host) {
    return {
      victory: true,
      biomassEarned: 0,
      assimilationGained: 0,
      lysateEarned: 0,
      hostDefeated: false,
    };
  }

  const strain = getStrain(state.activeStrainId);
  const yieldMult = getCombatYieldMultiplier(state);
  const biomassEarned = Math.floor(
    (COMBAT_BIOMASS_BASE + COMBAT_BIOMASS_PER_DIFFICULTY * host.difficulty) *
      yieldMult *
      strain.rewardMult,
  );
  const assimilationGained = 10 + host.difficulty * 5;

  const previous = state.hostAssimilation[hostId] ?? 0;
  const next = Math.min(HOST_ASSIMILATION_TARGET, previous + assimilationGained);
  state.hostAssimilation[hostId] = next;
  const hostDefeated = next >= HOST_ASSIMILATION_TARGET;

  const lysateEarned = Math.floor(LYSATE_BASE_REWARD * host.difficulty * strain.lysateMult);

  return {
    victory: true,
    biomassEarned,
    assimilationGained,
    lysateEarned,
    hostDefeated,
  };
}

/**
 * Side-effect-free preview of the rewards a host would yield, for showing the
 * expected payout before engaging. Mirrors {@link calculateVictoryReward}.
 */
export function previewCombatReward(
  state: GameState,
  hostId: string,
  strainId?: string,
): { biomassEarned: number; lysateEarned: number } {
  const host = HOSTS.find((h) => h.id === hostId);
  if (!host) return { biomassEarned: 0, lysateEarned: 0 };

  const strain = getStrain(strainId ?? state.activeStrainId);
  const yieldMult = getCombatYieldMultiplier(state);
  const biomassEarned = Math.floor(
    (COMBAT_BIOMASS_BASE + COMBAT_BIOMASS_PER_DIFFICULTY * host.difficulty) *
      yieldMult *
      strain.rewardMult,
  );
  const lysateEarned = Math.floor(LYSATE_BASE_REWARD * host.difficulty * strain.lysateMult);
  const storableBiomass = Math.min(
    biomassEarned,
    Math.max(0, getEffectiveMaxBiomass(state) - state.biomass),
  );
  return { biomassEarned: storableBiomass, lysateEarned };
}

export function applyVictory(state: GameState, hostId: string): CombatResult {
  const alreadyGrownOver = state.grownOverHosts.includes(hostId);

  const result = calculateVictoryReward(state, hostId);

  result.biomassEarned = addBiomass(state, result.biomassEarned);
  state.totalBiomassEarned += result.biomassEarned;
  state.lysateRaw += result.lysateEarned;
  state.lysateEarned += result.lysateEarned;

  if (result.hostDefeated && !alreadyGrownOver) {
    state.grownOverHosts = [...state.grownOverHosts, hostId];
    state.hostsDefeated += 1;
  }

  clearActiveEncounter(state);

  return result;
}

export function applyDefeat(state: GameState): void {
  clearActiveEncounter(state);
  enterTrauma(state);
}

/**
 * Combat stats used by the arena. Mutation effects are already baked into
 * `state.combatStats`, so this is a defensive copy for the renderer.
 */
export function getEffectiveCombatStats(state: GameState): CombatStats {
  return { ...state.combatStats };
}
