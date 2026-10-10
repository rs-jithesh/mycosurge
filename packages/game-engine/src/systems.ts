import type { GameState } from './state';

/** Full-game systems that are revealed progressively rather than all at once. */
export type SystemId = 'radar';

export interface SystemUnlocks {
  radar: boolean;
}

/** Which full-game systems the player has reached. */
export function getSystemUnlocks(state: GameState): SystemUnlocks {
  return { radar: state.gamePhase === 'active' };
}
