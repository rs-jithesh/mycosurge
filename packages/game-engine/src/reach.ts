import { HOST_TIER_REACH, REACH_COST_BASE, REACH_COST_SCALE, REACH_START } from '@mycosurge/config';
import type { GameState, RadarContact } from './state';
import { spawnBlip } from './radar';

/** Biomass needed to extend the network by one more mm. Rises with each mm. */
export function getReachCost(reach: number): number {
  const steps = Math.max(0, reach - REACH_START);
  return Math.floor(REACH_COST_BASE * Math.pow(REACH_COST_SCALE, steps));
}

/** Highest host tier unlocked at this reach (0 when nothing is in range yet). */
export function getReachBand(reach: number): number {
  let band = 0;
  for (const [tier, at] of Object.entries(HOST_TIER_REACH)) {
    if (reach >= at) band = Math.max(band, Number(tier));
  }
  return band;
}

/** The next host tier and the reach that opens it, or null once everything is in range. */
export function getNextReachTier(reach: number): { tier: number; at: number } | null {
  const upcoming = Object.entries(HOST_TIER_REACH)
    .map(([tier, at]) => ({ tier: Number(tier), at }))
    .filter((t) => t.at > reach)
    .sort((a, b) => a.at - b.at);
  return upcoming[0] ?? null;
}

export function canExtendReach(state: GameState): boolean {
  return state.gamePhase === 'active' && state.biomass >= getReachCost(state.mycelialNetwork);
}

export interface ReachResult {
  success: boolean;
  cost: number;
  reach: number;
  /** A blip that drifted in on the new frontier, if a radar slot was free. */
  spawned: RadarContact | null;
  /** A host tier newly opened by this extension, if any. */
  unlockedTier: number | null;
}

/**
 * Spend Biomass to push the network one mm deeper. Deeper reach opens a stronger host
 * pool, and the extension itself may draw a signal in from the new frontier.
 */
export function extendReach(state: GameState): ReachResult {
  const cost = getReachCost(state.mycelialNetwork);
  const beforeBand = getReachBand(state.mycelialNetwork);

  if (state.biomass < cost) {
    return {
      success: false,
      cost,
      reach: state.mycelialNetwork,
      spawned: null,
      unlockedTier: null,
    };
  }

  state.biomass -= cost;
  state.mycelialNetwork += 1;
  const afterBand = getReachBand(state.mycelialNetwork);
  const spawned = spawnBlip(state);

  return {
    success: true,
    cost,
    reach: state.mycelialNetwork,
    spawned,
    unlockedTier: afterBand > beforeBand ? afterBand : null,
  };
}
