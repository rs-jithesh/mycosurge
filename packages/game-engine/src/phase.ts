import type { GameState } from './state';
import { evaluateAdvisor } from './advisor';

/**
 * The four stages of the Core growth cycle, in loop order:
 * Gather -> Grow -> Hunt -> Expand -> (Gather).
 */
export type GrowthPhase = 'gather' | 'grow' | 'hunt' | 'expand';

export const GROWTH_PHASES: readonly GrowthPhase[] = ['gather', 'grow', 'hunt', 'expand'];

export { getCheapestGeneratorCost, getCheapestExpandCost } from './advisor';

/**
 * Suggest which stage of the growth cycle needs attention, so the Core wheel can
 * point the player at the current bottleneck. This is a hint only — the player can
 * inspect any stage.
 *
 * The decision is now made by the organism advisor in `advisor.ts`: a guaranteed
 * emergency bucket followed by utility scoring of fine-grained actions. This
 * entry point is kept stable for callers and tests.
 */
export function getRecommendedPhase(state: GameState): GrowthPhase {
  return evaluateAdvisor(state).phase;
}
