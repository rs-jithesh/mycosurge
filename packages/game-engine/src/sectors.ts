import { REACH_SECTORS, REACH_START, getStageForReach, getStageGrowMm } from '@mycosurge/config';
import type { GameState, RadarContact } from './state';
import { getReachBand, getReachCost } from './reach';
import { spawnBlip } from './radar';

/**
 * Directional reach. The network grows into `REACH_SECTORS` wedges, each with its own depth
 * in mm (`reachSectors` stores the extra mm beyond `REACH_START`). Tier access tracks the
 * **deepest** wedge (max reach); Biomass storage and upkeep track the **average** growth
 * (coverage). This is the single source of truth for reach.
 */

const TAU = Math.PI * 2;

export function sectorIndexForAngle(angle: number): number {
  const norm = ((angle % TAU) + TAU) % TAU;
  return Math.floor((norm / TAU) * REACH_SECTORS) % REACH_SECTORS;
}

/** Angles (radians) of each wedge's centre, in sector order. */
export function sectorCentres(): number[] {
  return Array.from({ length: REACH_SECTORS }, (_, i) => ((i + 0.5) / REACH_SECTORS) * TAU);
}

/** Set every wedge to the same absolute reach (mm) — used by save migration and tests. */
export function setReachMm(state: GameState, mm: number): void {
  const extra = Math.max(0, mm - REACH_START);
  state.reachSectors = Array.from({ length: REACH_SECTORS }, () => extra);
}

/** Absolute depth (mm) of every wedge from the colony centre. */
export function getSectorDepths(state: GameState): number[] {
  return state.reachSectors.map((extra) => REACH_START + extra);
}

/** Deepest wedge (mm) — drives host tiers and the reach label. */
export function getMaxReach(state: GameState): number {
  return REACH_START + Math.max(0, ...state.reachSectors);
}

/** Mean growth beyond the base circle — drives Biomass cap and upkeep. */
export function getCoverage(state: GameState): number {
  if (state.reachSectors.length === 0) return 0;
  const sum = state.reachSectors.reduce((total, value) => total + value, 0);
  return sum / state.reachSectors.length;
}

/** mm added to one wedge by a targeted growth, for the network's current band. */
export function getGrowStepMm(state: GameState): number {
  return getStageGrowMm(getStageForReach(getMaxReach(state)));
}

/** mm added to every wedge by a "grow evenly" action (half a targeted step). */
export function getEvenStepMm(state: GameState): number {
  return getGrowStepMm(state) / 2;
}

/** Biomass cost of growing one wedge by a full stage-relative step. */
export function getGrowCost(state: GameState): number {
  return getReachCost(getMaxReach(state));
}

/** Biomass cost of a single "grow evenly" action across every wedge. */
export function getEvenCost(state: GameState): number {
  return Math.round(getGrowCost(state) * getEvenStepMm(state) * REACH_SECTORS);
}

export function canGrowSector(state: GameState, sector: number): boolean {
  return state.biomass >= getGrowCost(state);
}

export function canGrowEvenly(state: GameState): boolean {
  return state.biomass >= getEvenCost(state);
}

export interface SectorGrowResult {
  success: boolean;
  cost: number;
  /** Wedge grown, or null for an even growth. */
  sector: number | null;
  spawned: RadarContact | null;
  unlockedTier: number | null;
}

function afterGrowth(
  state: GameState,
  beforeBand: number,
): Pick<SectorGrowResult, 'spawned' | 'unlockedTier'> {
  const afterBand = getReachBand(getMaxReach(state));
  return {
    spawned: spawnBlip(state),
    unlockedTier: afterBand > beforeBand ? afterBand : null,
  };
}

/** Grow one wedge by one step. */
export function growSector(state: GameState, sector: number): SectorGrowResult {
  const cost = getGrowCost(state);
  if (state.biomass < cost) {
    return { success: false, cost, sector, spawned: null, unlockedTier: null };
  }
  const beforeBand = getReachBand(getMaxReach(state));
  state.reachSectors[sector] += getGrowStepMm(state);
  state.biomass -= cost;
  return { success: true, cost, sector, ...afterGrowth(state, beforeBand) };
}

/** Nudge every wedge a little; symmetric but pricier per direction. */
export function growEvenly(state: GameState): SectorGrowResult {
  const cost = getEvenCost(state);
  if (state.biomass < cost) {
    return { success: false, cost, sector: null, spawned: null, unlockedTier: null };
  }
  const beforeBand = getReachBand(getMaxReach(state));
  for (let i = 0; i < state.reachSectors.length; i++) {
    state.reachSectors[i] += getEvenStepMm(state);
  }
  state.biomass -= cost;
  return { success: true, cost, sector: null, ...afterGrowth(state, beforeBand) };
}
