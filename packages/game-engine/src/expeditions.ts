import { HOSTS, EXPEDITION_BASE_TIME } from '@mycosurge/config';
import type { GameState, Expedition } from './state';
import { getExpeditionTimeBonus, getExpeditionRewardBonus, addBiomass } from './math';

export function startExpedition(state: GameState, hostId: string): boolean {
  if (state.expeditions.length >= state.maxExpeditionSlots) return false;

  const active = state.expeditions.some((e) => !e.rewardCollected);
  if (active && state.maxExpeditionSlots <= 1) return false;

  const host = HOSTS.find((h) => h.id === hostId);
  if (!host) return false;

  const timeReduction = getExpeditionTimeBonus(state.skillAllocations);
  const duration = EXPEDITION_BASE_TIME * (1 - timeReduction);

  state.expeditions.push({
    hostId,
    timeRemaining: Math.max(30, duration),
    duration: Math.max(30, duration),
    completed: false,
    rewardCollected: false,
  });

  return true;
}

export function tickExpeditions(state: GameState, deltaSec: number): void {
  for (const exp of state.expeditions) {
    if (exp.completed || exp.rewardCollected) continue;

    exp.timeRemaining -= deltaSec;
    if (exp.timeRemaining <= 0) {
      exp.timeRemaining = 0;
      exp.completed = true;
    }
  }
}

export function collectExpedition(state: GameState, index: number): number {
  const exp = state.expeditions[index];
  if (!exp || !exp.completed || exp.rewardCollected) return 0;

  const host = HOSTS.find((h) => h.id === exp.hostId);
  if (!host) return 0;

  const rewardBonus = getExpeditionRewardBonus(state.skillAllocations);
  const reward = Math.floor(host.biomassReward * (1 + rewardBonus));

  exp.rewardCollected = true;
  const stored = addBiomass(state, reward);
  state.totalBiomassEarned += stored;

  return stored;
}

export function removeCollectedExpeditions(state: GameState): void {
  state.expeditions = state.expeditions.filter((e) => !e.rewardCollected);
}

export function getActiveExpeditions(state: GameState): Expedition[] {
  return state.expeditions.filter((e) => !e.rewardCollected);
}
