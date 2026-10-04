import { EXPANSION_MAP, HOSTS, HOST_TIER_REACH } from '@mycosurge/config';
import type { GameState } from './state';
import { getReachCost } from './reach';

/**
 * The expansion/discovery map is generated deterministically from a persisted seed.
 * The engine owns the geometry, host placement and discovery state; the UI only draws it.
 */

export type HostVisibility = 'catalogued' | 'encountered' | 'sensed' | 'hidden';

export interface NetworkSegment {
  id: string;
  parentId: string | null;
  /** Primary branch index this segment belongs to. */
  branch: number;
  /** Fork depth (0 = primary). */
  depth: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Distance from the colony centre at the segment tip, in mm. */
  endMm: number;
  width: number;
}

export interface NetworkGeometry {
  seed: number;
  maxMm: number;
  segments: NetworkSegment[];
}

export interface HostPlacement {
  id: string;
  hostId: string;
  tier: number;
  isBoss: boolean;
  angle: number;
  distanceMm: number;
  x: number;
  y: number;
}

const TAU = Math.PI * 2;

/** Tiny deterministic PRNG (mulberry32). No dependency, stable across sessions. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Grow the hyphal network for a seed. Same seed always yields the same segments,
 * so the map shape is stable across sessions and reloads.
 */
export function generateNetwork(seed: number): NetworkGeometry {
  const cfg = EXPANSION_MAP;
  const rng = mulberry32(seed || 1);
  const segments: NetworkSegment[] = [];
  const steps = Math.ceil(cfg.maxMm / cfg.stepMm);
  let counter = 0;

  function grow(
    branch: number,
    parentId: string | null,
    depth: number,
    startX: number,
    startY: number,
    startAngle: number,
    left: number,
    forkBudget: number,
  ): void {
    let px = startX;
    let py = startY;
    let angle = startAngle;

    for (let s = 0; s < left; s++) {
      if (segments.length >= cfg.maxSegments) return;
      angle += (rng() - 0.5) * cfg.branchJitter;
      const nx = px + Math.cos(angle) * cfg.stepMm;
      const ny = py + Math.sin(angle) * cfg.stepMm;
      const id = `s${counter++}`;

      segments.push({
        id,
        parentId,
        branch,
        depth,
        x1: px,
        y1: py,
        x2: nx,
        y2: ny,
        endMm: Math.hypot(nx, ny),
        width: Math.max(0.8, cfg.widthBase * Math.pow(cfg.widthDecay, depth)),
      });

      if (forkBudget > 0 && depth < cfg.maxForkDepth && rng() < cfg.forkChance) {
        const dir = rng() < 0.5 ? -1 : 1;
        grow(
          branch,
          id,
          depth + 1,
          nx,
          ny,
          angle + dir * cfg.forkAngle,
          Math.max(1, Math.floor((left - s) * cfg.forkLengthRatio)),
          forkBudget - 1,
        );
      }

      px = nx;
      py = ny;
    }
  }

  for (let b = 0; b < cfg.branchCount; b++) {
    const base = (b / cfg.branchCount) * TAU + (rng() - 0.5) * cfg.baseJitter;
    grow(b, null, 0, 0, 0, base, steps, cfg.maxForkDepth);
  }

  return { seed: seed >>> 0, maxMm: cfg.maxMm, segments };
}

/** Deterministic host placement: each species sits just past its tier's reach gate. */
export function generateHostPlacements(seed: number): HostPlacement[] {
  const cfg = EXPANSION_MAP;
  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);

  return HOSTS.filter((h) => h.id !== 'soil_nematode').map((h) => {
    const base = HOST_TIER_REACH[h.tier] ?? 0;
    const distanceMm = base + cfg.hostTierOffsetMm + rng() * cfg.hostDistanceJitterMm;
    const angle = rng() * TAU;
    return {
      id: `host-${h.id}`,
      hostId: h.id,
      tier: h.tier,
      isBoss: Boolean(h.isBoss),
      angle,
      distanceMm,
      x: Math.cos(angle) * distanceMm,
      y: Math.sin(angle) * distanceMm,
    };
  });
}

/** Catalogued hosts stay known; in-reach hosts are encountered; near ones are sensed. */
export function getHostVisibility(
  placement: HostPlacement,
  reachMm: number,
  catalogued: ReadonlySet<string>,
): HostVisibility {
  if (catalogued.has(placement.hostId)) return 'catalogued';
  if (placement.distanceMm <= reachMm) return 'encountered';
  if (placement.distanceMm <= reachMm + EXPANSION_MAP.senseRangeMm) return 'sensed';
  return 'hidden';
}

/** The guaranteed frontier encounter: the nearest uncatalogued host now in reach. */
export function getFirstContact(
  state: GameState,
  placements: HostPlacement[],
): HostPlacement | null {
  const catalogued = new Set(state.cataloguedHosts);
  let best: HostPlacement | null = null;
  for (const placement of placements) {
    if (catalogued.has(placement.hostId)) continue;
    if (placement.distanceMm > state.mycelialNetwork) continue;
    if (!best || placement.distanceMm < best.distanceMm) best = placement;
  }
  return best;
}

/** Record a species as uncovered (first defeat). The tutorial host is never catalogued. */
export function catalogueHost(state: GameState, hostId: string): void {
  if (hostId === 'soil_nematode') return;
  if (!state.cataloguedHosts.includes(hostId)) {
    state.cataloguedHosts = [...state.cataloguedHosts, hostId];
  }
}

export function isCatalogued(state: GameState, hostId: string): boolean {
  return state.cataloguedHosts.includes(hostId);
}

/** The branch that currently reaches furthest — the natural cord candidate. */
export function getDefaultCordBranch(geometry: NetworkGeometry): string {
  const furthest = new Map<number, number>();
  for (const segment of geometry.segments) {
    furthest.set(segment.branch, Math.max(furthest.get(segment.branch) ?? 0, segment.endMm));
  }
  let best = 0;
  let bestMm = -1;
  for (const [branch, mm] of furthest) {
    if (mm > bestMm) {
      bestMm = mm;
      best = branch;
    }
  }
  return `branch-${best}`;
}

/** Biomass price to reinforce a rhizomorph cord. */
export function getCordCost(state: GameState): number {
  return Math.floor(getReachCost(state.mycelialNetwork) * EXPANSION_MAP.cordCostMult);
}

export function canBuildCord(state: GameState): boolean {
  return state.cordBranchId === null && state.biomass >= getCordCost(state);
}

/** Reinforce a branch into a cord (stub: visual + persisted state; upkeep effect later). */
export function buildCord(state: GameState, branchId: string): boolean {
  if (state.cordBranchId !== null) return false;
  const cost = getCordCost(state);
  if (state.biomass < cost) return false;
  state.biomass -= cost;
  state.cordBranchId = branchId;
  return true;
}
