import {
  EXPANSION_MAP,
  HOSTS,
  TUTORIAL_HOST_ID,
  getStageBandWidth,
  getStageByIndex,
  getStageForReach,
} from '@mycosurge/config';
import type { GameState, RadarContact } from './state';
import { getSectorDepths, sectorIndexForAngle } from './sectors';

/**
 * The expansion/discovery map is generated deterministically from a persisted seed.
 * The engine owns the geometry, host placement and discovery state; the UI only draws it.
 *
 * Geometry is generated **per stage band**, in local millimetres (0 → band width), so
 * the map always reads clearly no matter how many orders of magnitude the network has
 * grown. Host placements are absolute (mm) for gating, but carry local coordinates for
 * drawing within their own band.
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
  /** Distance from the colony centre at the segment tip, in band-local mm. */
  endMm: number;
  width: number;
}

export interface NetworkGeometry {
  seed: number;
  /** Stage band this geometry was generated for. */
  stageIndex: number;
  /** Band width in mm (local geometry spans `0 → maxMm`). */
  maxMm: number;
  segments: NetworkSegment[];
}

export interface HostPlacement {
  id: string;
  hostId: string;
  stage: number;
  isBoss: boolean;
  angle: number;
  /** Absolute reach (mm) at which this host is encountered. */
  distanceMm: number;
  /** Distance from the band centre, in band-local mm (for drawing). */
  localMm: number;
  /** Local x/y within the host's own band. */
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
 * Grow the hyphal network for a seed within one stage band. Same seed always yields
 * the same segments, so the map shape is stable across sessions and reloads, while a
 * different stage reads as a fresh, wider frontier.
 */
export function generateNetwork(seed: number, stageIndex = 1): NetworkGeometry {
  const cfg = EXPANSION_MAP;
  const stage = getStageByIndex(stageIndex);
  const bandWidth = getStageBandWidth(stage);
  const stepMm = bandWidth / cfg.networkSteps;
  // Mix the stage into the seed so each band has its own character but stays deterministic.
  const rng = mulberry32((seed ^ (stageIndex * 0x9e3779b1)) >>> 0 || 1);
  const segments: NetworkSegment[] = [];
  const steps = cfg.networkSteps;
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
      const nx = px + Math.cos(angle) * stepMm;
      const ny = py + Math.sin(angle) * stepMm;
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

  return { seed: seed >>> 0, stageIndex, maxMm: bandWidth, segments };
}

/**
 * Deterministic host placement. Every non-tutorial host sits at a radial fraction of
 * its own stage band (ordered by its position in `HOSTS`), with the band boss near the
 * outer ring. `distanceMm` is absolute for gating; `x`/`y` are band-local for drawing.
 */
export function generateHostPlacements(seed: number): HostPlacement[] {
  const cfg = EXPANSION_MAP;
  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);

  const byStage = new Map<number, typeof HOSTS>();
  for (const host of HOSTS) {
    if (host.id === TUTORIAL_HOST_ID) continue;
    const list = byStage.get(host.stage) ?? [];
    list.push(host);
    byStage.set(host.stage, list);
  }

  const placements: HostPlacement[] = [];
  for (const host of HOSTS) {
    if (host.id === TUTORIAL_HOST_ID) continue;
    const stage = getStageByIndex(host.stage);
    const bandWidth = getStageBandWidth(stage);
    const peers = byStage.get(host.stage) ?? [host];
    const index = peers.indexOf(host);
    const spread = peers.length > 1 ? index / (peers.length - 1) : 0.5;
    const jitter = rng() * cfg.hostJitterFraction;
    const bossPeers = peers.filter((p) => p.isBoss);
    const bossRank = bossPeers.indexOf(host);
    const fraction = host.isBoss
      ? Math.max(0.55, cfg.bossFraction - bossRank * 0.12)
      : Math.min(0.82, cfg.hostOffsetFraction + spread * 0.72 + jitter);
    const localMm = fraction * bandWidth;
    const angle = rng() * TAU;

    placements.push({
      id: `host-${host.id}`,
      hostId: host.id,
      stage: host.stage,
      isBoss: Boolean(host.isBoss),
      angle,
      distanceMm: stage.minMm + localMm,
      localMm,
      x: Math.cos(angle) * localMm,
      y: Math.sin(angle) * localMm,
    });
  }
  return placements;
}

/** Reached depth for a host's direction: a scalar (uniform) or per-wedge array. */
function depthFor(reach: number | readonly number[], angle: number): number {
  return Array.isArray(reach) ? (reach[sectorIndexForAngle(angle)] ?? 0) : (reach as number);
}

/** Catalogued hosts stay known; in-reach hosts are encountered; near ones are sensed. */
export function getHostVisibility(
  placement: HostPlacement,
  reach: number | readonly number[],
  catalogued: ReadonlySet<string>,
): HostVisibility {
  const depth = depthFor(reach, placement.angle);
  const stage = getStageForReach(placement.distanceMm);
  const senseRangeMm = getStageBandWidth(stage) * EXPANSION_MAP.senseFraction;
  if (catalogued.has(placement.hostId)) return 'catalogued';
  if (placement.distanceMm <= depth) return 'encountered';
  if (placement.distanceMm <= depth + senseRangeMm) return 'sensed';
  return 'hidden';
}

/** The guaranteed frontier encounter: the nearest uncatalogued host now in reach. */
export function getFirstContact(
  state: GameState,
  placements: HostPlacement[],
): HostPlacement | null {
  const catalogued = new Set(state.cataloguedHosts);
  const depths = getSectorDepths(state);
  let best: HostPlacement | null = null;
  for (const placement of placements) {
    if (catalogued.has(placement.hostId)) continue;
    const depth = depthFor(depths, placement.angle);
    if (placement.distanceMm > depth) continue;
    if (!best || placement.distanceMm < best.distanceMm) best = placement;
  }
  return best;
}

/** A live radar contact placed on the map, fanned out if its species repeats. */
export interface ContactMarker {
  contactId: string;
  hostId: string;
  stage: number;
  revealed: boolean;
  strainId: string;
  timeRemaining: number;
  totalTime: number;
  x: number;
  y: number;
  distanceMm: number;
}

/**
 * Place each active radar contact at its species' map location. Multiple contacts of
 * the same species fan out slightly so they never perfectly overlap. Contacts whose
 * species has no placement are skipped.
 */
export function getContactMarkers(
  contacts: readonly RadarContact[],
  placements: readonly HostPlacement[],
): ContactMarker[] {
  const byHost = new Map(placements.map((p) => [p.hostId, p]));
  const seen = new Map<string, number>();
  const markers: ContactMarker[] = [];

  for (const contact of contacts) {
    const placement = byHost.get(contact.hostId);
    if (!placement) continue;
    const index = seen.get(contact.hostId) ?? 0;
    seen.set(contact.hostId, index + 1);

    const baseRadius = Math.hypot(placement.x, placement.y);
    const baseAngle = Math.atan2(placement.y, placement.x);
    const step = Math.max(0.5, baseRadius * 0.04);
    const localMm = baseRadius + index * step;
    const angle = baseAngle + index * 0.18;
    markers.push({
      contactId: contact.id,
      hostId: contact.hostId,
      stage: placement.stage,
      revealed: contact.revealed,
      strainId: contact.strainId,
      timeRemaining: contact.timeRemaining,
      totalTime: contact.totalTime,
      x: Math.cos(angle) * localMm,
      y: Math.sin(angle) * localMm,
      distanceMm: placement.distanceMm,
    });
  }

  return markers;
}

/** Record a species as uncovered (first defeat). The tutorial host is never catalogued. */
export function catalogueHost(state: GameState, hostId: string): void {
  if (hostId === TUTORIAL_HOST_ID) return;
  if (!state.cataloguedHosts.includes(hostId)) {
    state.cataloguedHosts = [...state.cataloguedHosts, hostId];
  }
}

export function isCatalogued(state: GameState, hostId: string): boolean {
  return state.cataloguedHosts.includes(hostId);
}
