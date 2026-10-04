import type { GameState } from './state';

/** Full-game systems that are revealed progressively rather than all at once. */
export type SystemId = 'radar' | 'evolution' | 'expeditions';

export interface SystemUnlocks {
  radar: boolean;
  evolution: boolean;
  expeditions: boolean;
}

/**
 * Which full-game systems the player has reached. Triggers use cumulative
 * counters (lifetime Biomass, hosts grown over) so a system never re-locks once
 * the player has invested in it. Evolution and Expeditions both open once the
 * first host has been fully grown over.
 */
export function getSystemUnlocks(state: GameState): SystemUnlocks {
  const active = state.gamePhase === 'active';
  const hasProgress = state.hostsDefeated >= 1;
  return {
    radar: active,
    evolution: active && hasProgress,
    expeditions: active && hasProgress,
  };
}
