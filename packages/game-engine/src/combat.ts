import {
  HOSTS,
  COMBAT_BIOMASS_BASE,
  COMBAT_BIOMASS_PER_DIFFICULTY,
  LYSATE_BASE_REWARD,
  HOST_ASSIMILATION_TARGET,
  getStrain,
} from '@mycosurge/config';
import type { GameState } from './state';
import { enterTrauma, applyDepletion, getCombatYieldMultiplier } from './math';
import { clearActiveEncounter } from './radar';

export interface CombatResult {
  victory: boolean;
  biomassEarned: number;
  assimilationGained: number;
  lysateEarned: number;
  hostDefeated: boolean;
  echoUnlocked: boolean;
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
      echoUnlocked: false,
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
  const echoUnlocked = hostDefeated && !state.acquiredEchoes.includes(host.echoes.id);

  applyDepletion(state, assimilationGained);

  return {
    victory: true,
    biomassEarned,
    assimilationGained,
    lysateEarned,
    hostDefeated,
    echoUnlocked,
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
  return { biomassEarned, lysateEarned };
}

export function applyVictory(state: GameState, hostId: string): CombatResult {
  const host = HOSTS.find((h) => h.id === hostId);
  const alreadyAcquired = host ? state.acquiredEchoes.includes(host.echoes.id) : false;

  const result = calculateVictoryReward(state, hostId);

  state.biomass += result.biomassEarned;
  state.totalBiomassEarned += result.biomassEarned;
  state.lysateRaw += result.lysateEarned;

  if (host && result.hostDefeated && !alreadyAcquired) {
    state.acquiredEchoes.push(host.echoes.id);
    state.hostsDefeated += 1;
  }

  clearActiveEncounter(state);

  return result;
}

export function applyDefeat(state: GameState): void {
  clearActiveEncounter(state);
  enterTrauma(state);
}

export function getCombatDifficultyMultiplier(alertLevel: number): number {
  return 1 + (alertLevel / 100) * 0.5;
}
