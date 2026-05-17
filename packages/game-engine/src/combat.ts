import {
  HOSTS,
  COMBAT_BIOMASS_BASE,
  COMBAT_BIOMASS_PER_DIFFICULTY,
  LYSATE_BASE_REWARD,
} from '@mycosurge/config';
import type { GameState } from './state';
import { enterTrauma, applyDepletion, getCombatYieldMultiplier } from './math';

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

  const yieldMult = getCombatYieldMultiplier(state);
  const biomassEarned = Math.floor(
    (COMBAT_BIOMASS_BASE + COMBAT_BIOMASS_PER_DIFFICULTY * host.difficulty) * yieldMult,
  );
  const assimilationGained = 10 + host.difficulty * 5;
  const totalAssimilation = state.assimilationPercent + assimilationGained;
  const hostDefeated = totalAssimilation >= 100;
  const lysateEarned = LYSATE_BASE_REWARD * host.difficulty;

  const echoUnlocked = hostDefeated && !state.acquiredEchoes.includes(host.echoes.id);

  applyDepletion(state, assimilationGained);

  return {
    victory: true,
    biomassEarned: Math.floor(biomassEarned),
    assimilationGained,
    lysateEarned,
    hostDefeated,
    echoUnlocked,
  };
}

export function applyVictory(state: GameState, hostId: string): CombatResult {
  const result = calculateVictoryReward(state, hostId);

  state.biomass += result.biomassEarned;
  state.totalBiomassEarned += result.biomassEarned;
  state.lysateRaw += result.lysateEarned;

  if (result.hostDefeated) {
    const host = HOSTS.find((h) => h.id === hostId);
    if (host && !state.acquiredEchoes.includes(host.echoes.id)) {
      state.acquiredEchoes.push(host.echoes.id);
    }
    state.currentHostId = null;
    state.hostsDefeated += 1;
  }

  return result;
}

export function applyDefeat(state: GameState): void {
  enterTrauma(state);
}

export function getCombatDifficultyMultiplier(alertLevel: number): number {
  return 1 + (alertLevel / 100) * 0.5;
}
