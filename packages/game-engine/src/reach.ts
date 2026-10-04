import {
  REACH_COST_BASE,
  REACH_COST_SCALE,
  REACH_START,
  STAGES,
  getStageForReach,
  getStageGrowMm,
} from '@mycosurge/config';

/**
 * Biomass needed to extend the network by one more step. The curve re-bases at
 * every scale band: within a stage the price climbs, but crossing into a new
 * band starts fresh, so each stage is a self-contained push. This is what keeps
 * a 5 mm → 50 km ladder affordable instead of exploding exponentially in mm.
 */
export function getReachCost(reach: number): number {
  const stage = getStageForReach(reach);
  const growMm = getStageGrowMm(stage);
  const steps = Math.max(0, (reach - stage.minMm) / growMm);
  return Math.floor(REACH_COST_BASE * Math.pow(REACH_COST_SCALE, steps));
}

/** Highest stage unlocked at this reach (1 once the network is out of the tutorial). */
export function getReachBand(reach: number): number {
  return getStageForReach(reach).index;
}

/** The next stage and the reach that opens it, or null once every band is open. */
export function getNextReachTier(reach: number): { tier: number; at: number } | null {
  const next = STAGES.find((stage) => stage.minMm > reach);
  return next ? { tier: next.index, at: next.minMm } : null;
}

/** Reach the network starts the full game with — the tutorial's 5 mm. */
export { REACH_START };
