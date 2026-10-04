import { GENERATORS, getGeneratorCost } from '@mycosurge/config';
import type { GameState } from './state';
import { getCapExpandCost, getEffectiveMaxBiomass, isStarving } from './math';
import type { CapResource } from './math';
import { getReachCost } from './reach';

/**
 * The four stages of the Core growth cycle, in loop order:
 * Gather -> Grow -> Hunt -> Expand -> (Gather).
 */
export type GrowthPhase = 'gather' | 'grow' | 'hunt' | 'expand';

export const GROWTH_PHASES: readonly GrowthPhase[] = ['gather', 'grow', 'hunt', 'expand'];

/** Reserves under this fraction of capacity ask to be topped up. */
const LOW_RESERVE_RATIO = 0.4;
/** A reserve this full is wasting headroom and wants a capacity expansion. */
const FULL_RESERVE_RATIO = 0.9;

function ratio(value: number, cap: number): number {
  return cap > 0 ? value / cap : 0;
}

/**
 * Cheapest Biomass price among generators that still have levels left, or null
 * when every generator is maxed.
 */
export function getCheapestGeneratorCost(state: GameState): number | null {
  let cheapest: number | null = null;
  for (const gen of GENERATORS) {
    const level = state.generators[gen.id] ?? 0;
    if (level >= gen.maxLevel) continue;
    const cost = getGeneratorCost(gen.baseCost, level, gen.costScale);
    if (cheapest === null || cost < cheapest) cheapest = cost;
  }
  return cheapest;
}

/** Cheapest Lysate price to expand any of the three capacity pools. */
export function getCheapestExpandCost(state: GameState): number {
  const resources: CapResource[] = ['water', 'nutrients', 'biomass'];
  return Math.min(...resources.map((r) => getCapExpandCost(state, r)));
}

/**
 * Suggest which stage of the growth cycle needs attention, so the Core wheel can
 * point the player at the current bottleneck. This is a hint only — the player can
 * inspect any stage.
 *
 * Priority:
 *   1. Not yet in the full game, or recovering -> Gather.
 *   2. Starving -> Gather.
 *   3. Mid-fight -> Hunt.
 *   4. A reserve running low -> Gather (a low-yield fight isn't worth it).
 *   5. A revealed signal -> Hunt.
 *   6. A pool is nearly full and Lysate can pay for *that* pool -> Expand.
 *   7. Biomass can't afford the next generator -> Grow.
 *   8. Nothing left to upgrade but Lysate banked -> Expand.
 *   9. Short on Lysate -> Hunt; otherwise -> Grow.
 */
export function getRecommendedPhase(state: GameState): GrowthPhase {
  if (state.gamePhase !== 'active' || state.isInTrauma) return 'gather';

  if (isStarving(state)) return 'gather';

  if (state.currentHostId) return 'hunt';

  // Top up before taking a fight: low reserves would only pay a reduced yield.
  const waterLow = ratio(state.water, state.waterCap) < LOW_RESERVE_RATIO;
  const nutrientLow = ratio(state.nutrients, state.nutrientsCap) < LOW_RESERVE_RATIO;
  if (waterLow || nutrientLow) return 'gather';

  if (state.contacts.some((c) => c.revealed)) return 'hunt';

  const waterFull = ratio(state.water, state.waterCap) >= FULL_RESERVE_RATIO;
  const nutrientFull = ratio(state.nutrients, state.nutrientsCap) >= FULL_RESERVE_RATIO;
  const maxBiomass = getEffectiveMaxBiomass(state);
  const biomassFull = ratio(state.biomass, maxBiomass) >= FULL_RESERVE_RATIO;

  // Expand when a full pool can be acted on: push reach with Biomass, or raise that pool's cap.
  const canReach = state.biomass >= getReachCost(state.mycelialNetwork);
  const fullPaidCap =
    (waterFull && state.lysateBanked >= getCapExpandCost(state, 'water')) ||
    (nutrientFull && state.lysateBanked >= getCapExpandCost(state, 'nutrients')) ||
    (biomassFull && state.lysateBanked >= getCapExpandCost(state, 'biomass'));
  if ((waterFull || nutrientFull || biomassFull) && (canReach || fullPaidCap)) return 'expand';

  const generatorCost = getCheapestGeneratorCost(state);
  if (generatorCost !== null && state.biomass < generatorCost) return 'grow';

  const expandCost = getCheapestExpandCost(state);
  // Every income upgrade is bought out: push reach, or put Lysate into capacity.
  if (generatorCost === null && (canReach || state.lysateBanked >= expandCost)) return 'expand';

  if (state.lysateBanked + state.lysateRaw < expandCost) return 'hunt';

  return 'grow';
}
