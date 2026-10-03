import type { GameState } from './state';

/** Full-game systems that are revealed progressively rather than all at once. */
export type SystemId = 'radar' | 'evolution' | 'expeditions';

export interface SystemUnlocks {
  radar: boolean;
  evolution: boolean;
  expeditions: boolean;
}

/** Lifetime Biomass needed before Mutations/Growth upgrades are worth showing. */
export const EVOLUTION_BIOMASS_THRESHOLD = 5;

/**
 * Which full-game systems the player has reached. Triggers use cumulative
 * counters (lifetime Biomass, echoes collected) so a system never re-locks once
 * the player has invested in it.
 */
export function getSystemUnlocks(state: GameState): SystemUnlocks {
  const active = state.gamePhase === 'active';
  return {
    radar: active,
    evolution: active && state.totalBiomassEarned >= EVOLUTION_BIOMASS_THRESHOLD,
    expeditions: active && state.acquiredEchoes.length >= 1,
  };
}
