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
 * counters (lifetime Biomass, echoes collected) so a system never re-locks once
 * the player has invested in it. Evolution and Expeditions both open at the
 * first echo, once the player has actually banked combat progress.
 */
export function getSystemUnlocks(state: GameState): SystemUnlocks {
  const active = state.gamePhase === 'active';
  const hasEcho = state.acquiredEchoes.length >= 1;
  return {
    radar: active,
    evolution: active && hasEcho,
    expeditions: active && hasEcho,
  };
}
