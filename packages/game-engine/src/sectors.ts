import { EVEN_GROW_MM, REACH_SECTORS, REACH_START, SECTOR_GROW_MM } from '@mycosurge/config';
import type { GameState, RadarContact } from './state';
import { getReachBand, getReachCost } from './reach';
import { spawnBlip } from './radar';

/**
 * Directional reach. The network grows into `REACH_SECTORS` wedges, each with its
 * own depth in mm. Tier access tracks the **deepest** wedge (max reach); Biomass
 * storage and upkeep track the **average** growth (coverage). An empty
 * `reachSectors` means a uniform circle at `mycelialNetwork` (legacy/tutorial).
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

/** True while the network is still the legacy uniform circle. */
export function isUniformReach(state: GameState): boolean {
  return state.reachSectors.length === 0 || state.reachSectors.every((value) => value === 0);
}

/** Expand a uniform circle into explicit per-wedge extras (so we can grow one). */
export function materializeReach(state: GameState): void {
  if (!isUniformReach(state)) return;
  const extra = Math.max(0, state.mycelialNetwork - REACH_START);
  state.reachSectors = Array.from({ length: REACH_SECTORS }, () => extra);
}

/** Absolute depth (mm) of every wedge from the colony centre. */
export function getSectorDepths(state: GameState): number[] {
  if (isUniformReach(state)) {
    return Array.from({ length: REACH_SECTORS }, () => state.mycelialNetwork);
  }
  return state.reachSectors.map((extra) => REACH_START + extra);
}

/** Deepest wedge (mm) — drives host tiers and the reach label. */
export function getMaxReach(state: GameState): number {
  if (isUniformReach(state)) return state.mycelialNetwork;
  return REACH_START + Math.max(...state.reachSectors);
}

/** Mean growth beyond the base circle — drives Biomass cap and upkeep. */
export function getCoverage(state: GameState): number {
  if (isUniformReach(state)) return Math.max(0, state.mycelialNetwork - REACH_START);
  const sum = state.reachSectors.reduce((total, value) => total + value, 0);
  return sum / REACH_SECTORS;
}

function syncMaxReach(state: GameState): void {
  state.mycelialNetwork = getMaxReach(state);
}

/** Biomass cost of growing one wedge by `SECTOR_GROW_MM`. */
export function getGrowCost(state: GameState): number {
  return getReachCost(getMaxReach(state));
}

/** Biomass cost of a single "grow evenly" action across every wedge. */
export function getEvenCost(state: GameState): number {
  return Math.round(getGrowCost(state) * EVEN_GROW_MM * REACH_SECTORS);
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
  syncMaxReach(state);
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
  materializeReach(state);
  state.reachSectors[sector] += SECTOR_GROW_MM;
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
  materializeReach(state);
  for (let i = 0; i < state.reachSectors.length; i++) {
    state.reachSectors[i] += EVEN_GROW_MM;
  }
  state.biomass -= cost;
  return { success: true, cost, sector: null, ...afterGrowth(state, beforeBand) };
}

// ── Legacy uniform-growth API (kept for the current UI/tests) ──

export interface ReachResult {
  success: boolean;
  cost: number;
  reach: number;
  /** A blip that drifted in on the new frontier, if a radar slot was free. */
  spawned: RadarContact | null;
  /** A host tier newly opened by this growth, if any. */
  unlockedTier: number | null;
}

export function canExtendReach(state: GameState): boolean {
  return canGrowEvenly(state);
}

/** Default growth: nudge the whole circle outward a little. */
export function extendReach(state: GameState): ReachResult {
  const result = growEvenly(state);
  return {
    success: result.success,
    cost: result.cost,
    reach: getMaxReach(state),
    spawned: result.spawned,
    unlockedTier: result.unlockedTier,
  };
}
