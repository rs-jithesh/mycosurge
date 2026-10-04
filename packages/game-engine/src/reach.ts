import { HOST_TIER_REACH, REACH_COST_BASE, REACH_COST_SCALE, REACH_START } from '@mycosurge/config';

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
