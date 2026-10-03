/**
 * Pure combat AI for arena host nodes: steering, a small state machine, and
 * lead-aim fire discipline. No rendering or DOM dependencies — the Pixi arena
 * (`apps/web/src/lib/pixi/radar.ts`) owns drawing and calls into this module.
 *
 * The model follows classic game-AI building blocks:
 * - a finite state machine (idle → reposition → engage) sets intent;
 * - weighted steering behaviours (arrival, orbit/strafe, wander, separation,
 *   containment) turn intent into a desired velocity;
 * - lead-aim predicts where the player will be when a projectile arrives.
 *
 * Advanced hosts additionally dodge incoming spores via a closest-point-of-approach
 * scan, gated to difficulty 3+ by `dodgeSkill` and paced by a commit timer and
 * cooldown so the sidesteps read as deliberate rather than twitchy.
 */

import type { HostAiDef, Mobility } from '@mycosurge/config';

export type { Mobility };

export type AiState = 'idle' | 'reposition' | 'engage';

export interface Vec2 {
  x: number;
  y: number;
}

export interface AiProfile {
  mobility: Mobility;
  /** Distance from the player the node tries to hold. */
  preferredRange: number;
  /** Maximum steering speed in arena units per second. */
  moveSpeed: number;
  /** How quickly velocity blends toward the desired velocity (per second). */
  turnRate: number;
  /** 0..1 — higher repositions more and strafes harder. */
  aggression: number;
  /** 0..1 — how strongly the node evades incoming spores (0 = never dodges). */
  dodgeSkill: number;
}

export interface AiModifiers {
  moveSpeedMult?: number;
}

/** A steering agent. `NodeData` in the arena satisfies this structurally. */
export interface Agent {
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: AiState;
  stateTimer: number;
  strafeDir: 1 | -1;
  /** Remaining time of an active dodge sidestep. */
  dodgeTimer: number;
  /** Time before the node is willing to dodge again. */
  dodgeCooldown: number;
}

/** An incoming friendly projectile the node may try to evade. */
export interface ProjectileThreat {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

/** Per-frame world snapshot handed to the steering functions. */
export interface SteeringWorld {
  player: Vec2;
  playerVx: number;
  playerVy: number;
  arenaSize: number;
  /** Positions of the other nodes, for separation. */
  neighbors: Vec2[];
  /** Incoming friendly projectiles, for dodging. */
  threats?: ProjectileThreat[];
  dt: number;
}

export type Rng = () => number;

const SEPARATION_RADIUS = 70;
const WALL_MARGIN = 48;
const WALL_STRENGTH = 140;
const ORBIT_SPEED_RATIO = 0.75;
const DRIFT_RATIO = 0.5;
const ARRIVAL_GAIN = 2.4;
const DRIFT_SPEED = 22;
const FIRE_RANGE = 320;
const DODGE_BODY_RADIUS = 26;
const DODGE_BUFFER = 16;
const DODGE_LOOKAHEAD = 0.9;
const DODGE_REACTION = 0.06;
const DODGE_DURATION = 0.28;
const DODGE_COOLDOWN = 0.5;
const DODGE_SPEED_RATIO = 1.0;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randRange(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Derive an AI profile from a host's difficulty, encounter modifiers, and any per-host overrides. */
export function resolveAiProfile(
  difficulty: number,
  modifiers: AiModifiers = {},
  overrides: HostAiDef = {},
): AiProfile {
  const d = Math.max(1, difficulty);

  let mobility: Mobility;
  if (d <= 1) mobility = 'static';
  else if (d === 2) mobility = 'drift';
  else mobility = 'orbit';

  const preferredRange = clamp(210 - d * 12, 120, 210);
  const baseMove = mobility === 'static' ? 0 : 34 + d * 9;

  return {
    mobility: overrides.mobility ?? mobility,
    preferredRange: overrides.preferredRange ?? preferredRange,
    moveSpeed: (overrides.moveSpeed ?? baseMove) * (modifiers.moveSpeedMult ?? 1),
    turnRate: overrides.turnRate ?? 2.2 + d * 0.35,
    aggression: overrides.aggression ?? clamp(0.2 + d * 0.11, 0.2, 1),
    dodgeSkill: overrides.dodgeSkill ?? (d >= 3 ? clamp((d - 2) / 5, 0, 1) : 0),
  };
}

export function createAgent(x: number, y: number, rng: Rng): Agent {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    state: 'idle',
    stateTimer: randRange(rng, 0.2, 0.8),
    strafeDir: rng() < 0.5 ? -1 : 1,
    dodgeTimer: 0,
    dodgeCooldown: 0,
  };
}

/**
 * Advance the intent state machine. Static hosts never leave `idle`; mobile
 * hosts dwell, reposition (pick a new strafe direction / range), then engage.
 */
export function updateAiState(
  agent: Agent,
  profile: AiProfile,
  world: SteeringWorld,
  rng: Rng,
): void {
  if (profile.mobility === 'static') {
    agent.state = 'idle';
    return;
  }

  agent.stateTimer -= world.dt;
  if (agent.stateTimer > 0) return;

  if (agent.state === 'idle') {
    agent.state = 'reposition';
    agent.strafeDir = rng() < 0.5 ? -1 : 1;
    agent.stateTimer = randRange(rng, 0.4, 1.0);
  } else if (agent.state === 'reposition') {
    agent.state = 'engage';
    agent.stateTimer = randRange(rng, 1.6, 3.4) * (1.25 - profile.aggression * 0.5);
  } else {
    agent.state = 'reposition';
    agent.strafeDir = rng() < 0.5 ? -1 : 1;
    agent.stateTimer = randRange(rng, 0.4, 1.1);
  }
}

/**
 * Closest-point-of-approach scan over incoming friendly projectiles. Returns a
 * lateral avoidance velocity (away from the predicted crossing point) when a
 * threat will pass within the node's danger radius, or null otherwise.
 */
export function computeDodgeForce(
  agent: Agent,
  profile: AiProfile,
  world: SteeringWorld,
): Vec2 | null {
  if (profile.dodgeSkill <= 0 || !world.threats || world.threats.length === 0) return null;

  let bx = 0;
  let by = 0;
  let urgent = 0;

  for (const threat of world.threats) {
    const relX = agent.x - threat.x;
    const relY = agent.y - threat.y;
    const relVX = agent.vx - threat.vx;
    const relVY = agent.vy - threat.vy;
    const vv = relVX * relVX + relVY * relVY;
    if (vv < 1e-6) continue;

    const t = -(relX * relVX + relY * relVY) / vv;
    if (t < DODGE_REACTION || t > DODGE_LOOKAHEAD) continue;

    const missX = relX + relVX * t;
    const missY = relY + relVY * t;
    const miss = Math.hypot(missX, missY);
    const danger = DODGE_BODY_RADIUS + DODGE_BUFFER + threat.radius;
    if (miss >= danger) continue;

    let ax: number;
    let ay: number;
    if (miss > 1e-3) {
      ax = missX / miss;
      ay = missY / miss;
    } else {
      // Head-on: sidestep perpendicular to the projectile's travel.
      const tv = Math.hypot(threat.vx, threat.vy) || 1;
      ax = (-threat.vy / tv) * agent.strafeDir;
      ay = (threat.vx / tv) * agent.strafeDir;
    }

    const u = (1 - t / DODGE_LOOKAHEAD) * (1 - miss / danger) * profile.dodgeSkill;
    bx += ax * u;
    by += ay * u;
    if (u > urgent) urgent = u;
  }

  if (urgent <= 0) return null;
  const mag = Math.hypot(bx, by) || 1;
  const strength = profile.moveSpeed * DODGE_SPEED_RATIO;
  return { x: (bx / mag) * strength, y: (by / mag) * strength };
}

/**
 * Weighted sum of arrival, orbit/strafe, separation and containment, blended
 * with a dodge sidestep when an incoming spore threatens the node. Truncated to
 * `moveSpeed`. Returns the desired velocity (not integrated).
 */
export function steer(agent: Agent, profile: AiProfile, world: SteeringWorld, rng: Rng): Vec2 {
  if (profile.mobility === 'static' || profile.moveSpeed <= 0) return { x: 0, y: 0 };

  // Advance the dodge commit/cooldown timers.
  const wasDodging = agent.dodgeTimer > 0;
  agent.dodgeTimer = Math.max(0, agent.dodgeTimer - world.dt);
  if (wasDodging && agent.dodgeTimer <= 0) agent.dodgeCooldown = DODGE_COOLDOWN;
  agent.dodgeCooldown = Math.max(0, agent.dodgeCooldown - world.dt);

  const dx = world.player.x - agent.x;
  const dy = world.player.y - agent.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;

  let vx = 0;
  let vy = 0;

  const wandering = profile.mobility === 'drift' && agent.state === 'idle';
  if (wandering) {
    const a = rng() * Math.PI * 2;
    vx += Math.cos(a) * DRIFT_SPEED;
    vy += Math.sin(a) * DRIFT_SPEED;
  } else {
    // Arrival: approach or back off toward the preferred range.
    const error = dist - profile.preferredRange;
    const radial = clamp(error * ARRIVAL_GAIN, -profile.moveSpeed, profile.moveSpeed);
    vx += nx * radial;
    vy += ny * radial;

    // Orbit/strafe perpendicular to the line of sight.
    const orbitRatio =
      (profile.mobility === 'orbit' ? ORBIT_SPEED_RATIO : DRIFT_RATIO) *
      (agent.state === 'engage' ? 1 : 0.55) *
      (0.6 + profile.aggression * 0.4);
    const orbit = profile.moveSpeed * orbitRatio;
    vx += -ny * agent.strafeDir * orbit;
    vy += nx * agent.strafeDir * orbit;
  }

  // Dodge: a new sidestep starts only when off cooldown; while active it
  // dominates the desired velocity so the node commits to clearing the shot.
  const dodge = computeDodgeForce(agent, profile, world);
  if (dodge) {
    if (agent.dodgeTimer <= 0 && agent.dodgeCooldown <= 0) agent.dodgeTimer = DODGE_DURATION;
    if (agent.dodgeTimer > 0) {
      vx = vx * 0.25 + dodge.x;
      vy = vy * 0.25 + dodge.y;
    }
  }

  // Separation from neighbouring nodes.
  for (const other of world.neighbors) {
    const ox = agent.x - other.x;
    const oy = agent.y - other.y;
    const od = Math.hypot(ox, oy);
    if (od > 0 && od < SEPARATION_RADIUS) {
      const push = (1 - od / SEPARATION_RADIUS) * profile.moveSpeed;
      vx += (ox / od) * push;
      vy += (oy / od) * push;
    }
  }

  // Containment: push inward near the arena edges.
  const m = WALL_MARGIN;
  const s = world.arenaSize;
  if (agent.x < m) vx += ((m - agent.x) / m) * WALL_STRENGTH;
  if (agent.x > s - m) vx -= ((agent.x - (s - m)) / m) * WALL_STRENGTH;
  if (agent.y < m) vy += ((m - agent.y) / m) * WALL_STRENGTH;
  if (agent.y > s - m) vy -= ((agent.y - (s - m)) / m) * WALL_STRENGTH;

  const mag = Math.hypot(vx, vy);
  if (mag > profile.moveSpeed) {
    vx = (vx / mag) * profile.moveSpeed;
    vy = (vy / mag) * profile.moveSpeed;
  }
  return { x: vx, y: vy };
}

/** Full step: update intent, steer, blend velocity, integrate, clamp to arena. */
export function stepAgent(agent: Agent, profile: AiProfile, world: SteeringWorld, rng: Rng): void {
  updateAiState(agent, profile, world, rng);
  const desired = steer(agent, profile, world, rng);
  const smooth = 1 - Math.exp(-profile.turnRate * world.dt);
  agent.vx += (desired.x - agent.vx) * smooth;
  agent.vy += (desired.y - agent.vy) * smooth;
  agent.x += agent.vx * world.dt;
  agent.y += agent.vy * world.dt;

  const r = 16;
  agent.x = clamp(agent.x, r, world.arenaSize - r);
  agent.y = clamp(agent.y, r, world.arenaSize - r);
}

/**
 * Predict where a projectile should be aimed to intercept a moving target.
 * Solves |P + V·t − F| = s·t for the earliest positive intercept time, assuming
 * the target holds its velocity; falls back to direct aim when no intercept
 * exists (a target fleeing faster than the projectile).
 */
export function leadAim(
  from: Vec2,
  player: Vec2,
  playerVx: number,
  playerVy: number,
  projectileSpeed: number,
): { x: number; y: number; angle: number; time: number } {
  const speed = Math.max(1, projectileSpeed);
  const dx = player.x - from.x;
  const dy = player.y - from.y;

  const a = playerVx * playerVx + playerVy * playerVy - speed * speed;
  const b = 2 * (dx * playerVx + dy * playerVy);
  const c = dx * dx + dy * dy;

  let t = Math.sqrt(c) / speed;
  if (Math.abs(a) > 1e-9) {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      const roots = [(-b - sq) / (2 * a), (-b + sq) / (2 * a)].filter((r) => r > 0);
      if (roots.length > 0) t = Math.min(...roots);
    }
  }

  const px = player.x + playerVx * t;
  const py = player.y + playerVy * t;
  return { x: px, y: py, angle: Math.atan2(py - from.y, px - from.x), time: t };
}

/**
 * Fire discipline: static hosts always fire; mobile hosts only fire while
 * engaged and within range. Keeps patterns from firing mid-reposition.
 */
export function shouldFire(agent: Agent, profile: AiProfile, distToPlayer: number): boolean {
  if (profile.mobility === 'static') return distToPlayer <= FIRE_RANGE;
  if (agent.state !== 'engage') return false;
  return distToPlayer <= Math.max(FIRE_RANGE, profile.preferredRange * 1.6);
}
