import {
  OFFLINE_MAX_SECONDS,
  OFFLINE_BASE_RATE,
  OFFLINE_DORMANT_BONUS_PER_LEVEL,
} from '@mycosurge/config';
import type { GameState } from './state';
import { tickIdle } from './math';
import { tickExpeditions } from './expeditions';

export interface OfflineReport {
  /** Real seconds since the last save (uncapped). */
  elapsedSeconds: number;
  /** Seconds of game-time that were actually simulated. */
  appliedSeconds: number;
  /** Offline rate applied to the economy (0–1). */
  rate: number;
  biomassGained: number;
  waterGained: number;
  nutrientsGained: number;
  lysateStabilized: number;
  expeditionsCompleted: number;
  /** True when the absence was longer than the offline cap. */
  wasCapped: boolean;
}

/** Offline economy rate for a given Dormant Spores level, capped at 1. */
export function getOfflineRate(skillAllocations: Record<string, number>): number {
  const level = skillAllocations['dormant_spores'] ?? 0;
  return Math.min(1, OFFLINE_BASE_RATE + level * OFFLINE_DORMANT_BONUS_PER_LEVEL);
}

/**
 * Advance the colony while the tab was closed. Economy and Lysate run at the
 * offline rate; expeditions and trauma recovery use the full real elapsed time.
 * Radar contacts simply expire. Returns null when nothing was applied.
 */
export function applyOfflineProgress(
  state: GameState,
  elapsedSeconds: number,
): OfflineReport | null {
  if (state.gamePhase !== 'active') return null;

  const elapsed = Math.max(0, elapsedSeconds);
  const wasCapped = elapsed > OFFLINE_MAX_SECONDS;
  const capped = Math.min(elapsed, OFFLINE_MAX_SECONDS);
  if (capped < 1) return null;

  const rate = getOfflineRate(state.skillAllocations);
  const realSeconds = Math.floor(capped);
  const ecoSeconds = Math.floor(capped * rate);

  const before = {
    biomass: state.biomass,
    water: state.water,
    nutrients: state.nutrients,
    lysateBanked: state.lysateBanked,
    lysateRaw: state.lysateRaw,
  };

  // Expeditions and trauma proceed in real time.
  const completedBefore = state.expeditions.filter((e) => e.completed).length;
  tickExpeditions(state, realSeconds);
  const expeditionsCompleted =
    state.expeditions.filter((e) => e.completed).length - completedBefore;

  if (state.isInTrauma) {
    state.traumaTimer = Math.max(0, state.traumaTimer - realSeconds);
    if (state.traumaTimer <= 0) state.isInTrauma = false;
  }

  // Contacts drift away while the player is gone.
  state.contacts = state.contacts.filter((c) => {
    c.timeRemaining -= realSeconds;
    return c.timeRemaining > 0;
  });

  // Economy and Lysate accrue at the offline rate.
  for (let i = 0; i < ecoSeconds; i++) tickIdle(state, 1);

  return {
    elapsedSeconds: elapsed,
    appliedSeconds: capped * rate,
    rate,
    biomassGained: state.biomass - before.biomass,
    waterGained: state.water - before.water,
    nutrientsGained: state.nutrients - before.nutrients,
    lysateStabilized: state.lysateBanked - before.lysateBanked,
    expeditionsCompleted,
    wasCapped,
  };
}
