import { describe, it, expect } from 'vitest';
import {
  resolveAiProfile,
  createAgent,
  updateAiState,
  steer,
  computeDodgeForce,
  stepAgent,
  leadAim,
  shouldFire,
} from './combat-ai';
import type { Agent, Rng, SteeringWorld } from './combat-ai';

/** Deterministic mulberry32 PRNG for reproducible tests. */
function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeAgent(x: number, y: number, overrides: Partial<Agent> = {}): Agent {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    state: 'engage',
    stateTimer: 10,
    strafeDir: 1,
    dodgeTimer: 0,
    dodgeCooldown: 0,
    ...overrides,
  };
}

function world(
  playerX: number,
  playerY: number,
  extra: Partial<SteeringWorld> = {},
): SteeringWorld {
  return {
    player: { x: playerX, y: playerY },
    playerVx: 0,
    playerVy: 0,
    arenaSize: 1000,
    neighbors: [],
    dt: 1 / 60,
    ...extra,
  };
}

describe('resolveAiProfile', () => {
  it('keeps difficulty 1 hosts static', () => {
    const profile = resolveAiProfile(1);
    expect(profile.mobility).toBe('static');
    expect(profile.moveSpeed).toBe(0);
  });

  it('gives difficulty 2 hosts gentle drift', () => {
    expect(resolveAiProfile(2).mobility).toBe('drift');
  });

  it('gives difficulty 3+ hosts orbit mobility and dodge skill', () => {
    const profile = resolveAiProfile(4);
    expect(profile.mobility).toBe('orbit');
    expect(profile.moveSpeed).toBeGreaterThan(0);
    expect(profile.dodgeSkill).toBeGreaterThan(0);
  });

  it('scales movement speed with the moveSpeedMult modifier', () => {
    const base = resolveAiProfile(4);
    const boosted = resolveAiProfile(4, { moveSpeedMult: 2 });
    expect(boosted.moveSpeed).toBeCloseTo(base.moveSpeed * 2);
  });

  it('applies per-host overrides over derived defaults', () => {
    const profile = resolveAiProfile(
      1,
      {},
      { mobility: 'orbit', moveSpeed: 99, preferredRange: 130 },
    );
    expect(profile.mobility).toBe('orbit');
    expect(profile.moveSpeed).toBe(99);
    expect(profile.preferredRange).toBe(130);
  });
});

describe('createAgent', () => {
  it('starts idle with a unit strafe direction', () => {
    const agent = createAgent(100, 100, seededRng(1));
    expect(agent.state).toBe('idle');
    expect([1, -1]).toContain(agent.strafeDir);
    expect(agent.vx).toBe(0);
    expect(agent.vy).toBe(0);
  });
});

describe('updateAiState', () => {
  it('keeps static hosts idle forever', () => {
    const agent = makeAgent(0, 0, { state: 'idle' });
    const profile = resolveAiProfile(1);
    for (let i = 0; i < 10; i++) updateAiState(agent, profile, world(0, 0), seededRng(3));
    expect(agent.state).toBe('idle');
  });

  it('advances mobile hosts from idle to engage', () => {
    const rng = seededRng(7);
    const agent = makeAgent(0, 0, { state: 'idle', stateTimer: 0.1 });
    const profile = resolveAiProfile(4);
    let engaged = false;
    for (let i = 0; i < 12; i++) {
      updateAiState(agent, profile, world(200, 0, { dt: 1 }), rng);
      if (agent.state === 'engage') engaged = true;
    }
    expect(engaged).toBe(true);
  });
});

describe('steer', () => {
  it('returns zero velocity for static profiles', () => {
    const agent = makeAgent(0, 0);
    const profile = resolveAiProfile(1);
    const v = steer(agent, profile, world(200, 0), seededRng(1));
    expect(v).toEqual({ x: 0, y: 0 });
  });

  it('strafes tangentially at the preferred range', () => {
    const profile = resolveAiProfile(4);
    const agent = makeAgent(450, 500, { state: 'engage' });
    const v = steer(agent, profile, world(450 + profile.preferredRange, 500), seededRng(1));
    // Line of sight is +x, so tangential motion must be vertical only.
    expect(Math.abs(v.x)).toBeLessThan(1e-6);
    expect(Math.abs(v.y)).toBeGreaterThan(0);
  });

  it('backs away when too close to the player', () => {
    const profile = resolveAiProfile(4);
    const agent = makeAgent(450, 500, { state: 'engage' });
    const v = steer(agent, profile, world(480, 500), seededRng(1));
    expect(v.x).toBeLessThan(0);
  });

  it('approaches when too far from the player', () => {
    const profile = resolveAiProfile(4);
    const agent = makeAgent(450, 500, { state: 'engage' });
    const v = steer(agent, profile, world(850, 500), seededRng(1));
    expect(v.x).toBeGreaterThan(0);
  });

  it('is repelled by a nearby neighbour', () => {
    const profile = resolveAiProfile(4);
    const agent = makeAgent(450, 500, { state: 'engage' });
    const near = world(450 + profile.preferredRange, 500);
    const repel = world(450 + profile.preferredRange, 500, { neighbors: [{ x: 450, y: 512 }] });
    const without = steer(agent, profile, near, seededRng(1));
    const withNeighbour = steer(agent, profile, repel, seededRng(1));
    // The neighbour below pushes the agent upward (smaller y).
    expect(withNeighbour.y).toBeLessThan(without.y);
  });

  it('never exceeds the profile move speed', () => {
    const profile = resolveAiProfile(5);
    const agent = makeAgent(500, 500, { state: 'engage' });
    const v = steer(
      agent,
      profile,
      world(900, 900, { neighbors: [{ x: 505, y: 505 }] }),
      seededRng(1),
    );
    expect(Math.hypot(v.x, v.y)).toBeLessThanOrEqual(profile.moveSpeed + 1e-6);
  });
});

describe('dodging', () => {
  const headOn = { x: 300, y: 500, vx: 300, vy: 0, radius: 3 };

  it('ignores threats when the host has no dodge skill', () => {
    const profile = resolveAiProfile(2);
    const agent = makeAgent(500, 500);
    expect(computeDodgeForce(agent, profile, world(662, 500, { threats: [headOn] }))).toBeNull();
  });

  it('returns no force when there are no threats', () => {
    const profile = resolveAiProfile(4);
    const agent = makeAgent(500, 500);
    expect(computeDodgeForce(agent, profile, world(662, 500))).toBeNull();
  });

  it('produces a lateral force for a head-on threat', () => {
    const profile = resolveAiProfile(4);
    const agent = makeAgent(500, 500);
    const force = computeDodgeForce(agent, profile, world(662, 500, { threats: [headOn] }));
    expect(force).not.toBeNull();
    expect(Math.abs(force!.y)).toBeGreaterThan(0);
  });

  it('activates a dodge and sidesteps when threatened', () => {
    const profile = resolveAiProfile(4);
    const agent = makeAgent(500, 500);
    const without = steer(agent, profile, world(662, 500), seededRng(1));
    const withThreat = steer(agent, profile, world(662, 500, { threats: [headOn] }), seededRng(1));
    expect(agent.dodgeTimer).toBeGreaterThan(0);
    expect(Math.abs(withThreat.y)).toBeGreaterThan(Math.abs(without.y));
  });

  it('paces dodges with a cooldown', () => {
    const profile = resolveAiProfile(4);
    const agent = makeAgent(500, 500);

    steer(agent, profile, world(662, 500, { threats: [headOn], dt: 1 / 60 }), seededRng(1));
    expect(agent.dodgeTimer).toBeGreaterThan(0);

    // The commit window elapses and the cooldown blocks an immediate re-dodge.
    steer(agent, profile, world(662, 500, { threats: [headOn], dt: 0.3 }), seededRng(1));
    expect(agent.dodgeTimer).toBe(0);
    expect(agent.dodgeCooldown).toBeGreaterThan(0);

    // Once the cooldown clears, the host may dodge again.
    steer(agent, profile, world(662, 500, { threats: [headOn], dt: 0.3 }), seededRng(1));
    expect(agent.dodgeTimer).toBeGreaterThan(0);
  });
});

describe('stepAgent', () => {
  it('moves an orbiting agent toward its preferred range', () => {
    const profile = resolveAiProfile(4);
    const agent = makeAgent(500, 500, { state: 'engage' });
    const w = world(500 - 20, 500, { dt: 1 / 60 });
    for (let i = 0; i < 60; i++) stepAgent(agent, profile, w, () => 0.5);
    const dist = Math.hypot(agent.x - w.player.x, agent.y - w.player.y);
    expect(dist).toBeGreaterThan(20);
  });

  it('leaves a static agent in place', () => {
    const profile = resolveAiProfile(1);
    const agent = makeAgent(123, 456, { state: 'idle' });
    stepAgent(agent, profile, world(0, 0), seededRng(1));
    expect(agent.x).toBe(123);
    expect(agent.y).toBe(456);
  });

  it('keeps a mobile agent inside the arena', () => {
    const profile = resolveAiProfile(5);
    const agent = makeAgent(490, 490, { state: 'engage' });
    for (let i = 0; i < 600; i++) stepAgent(agent, profile, world(10, 10), seededRng(i));
    expect(agent.x).toBeGreaterThanOrEqual(16);
    expect(agent.x).toBeLessThanOrEqual(1000 - 16);
    expect(agent.y).toBeGreaterThanOrEqual(16);
    expect(agent.y).toBeLessThanOrEqual(1000 - 16);
  });
});

describe('leadAim', () => {
  it('aims straight at a stationary target', () => {
    const aim = leadAim({ x: 0, y: 0 }, { x: 100, y: 0 }, 0, 0, 100);
    expect(aim.angle).toBeCloseTo(0);
    expect(aim.x).toBeCloseTo(100);
    expect(aim.y).toBeCloseTo(0);
    expect(aim.time).toBeCloseTo(1);
  });

  it('leads a moving target ahead of its current position', () => {
    const player = { x: 100, y: 0 };
    const aim = leadAim({ x: 0, y: 0 }, player, 0, 50, 100);
    expect(aim.y).toBeGreaterThan(player.y);
    expect(aim.time).toBeGreaterThan(1);
  });

  it('predicts an intercept point consistent with time-of-flight', () => {
    const from = { x: 0, y: 0 };
    const player = { x: 120, y: 40 };
    const vx = 20;
    const vy = -10;
    const speed = 150;
    const aim = leadAim(from, player, vx, vy, speed);
    const predicted = { x: player.x + vx * aim.time, y: player.y + vy * aim.time };
    const travelled = Math.hypot(predicted.x - from.x, predicted.y - from.y);
    expect(travelled / speed).toBeCloseTo(aim.time, 5);
  });
});

describe('shouldFire', () => {
  it('lets static hosts fire in range but not across the arena', () => {
    const profile = resolveAiProfile(1);
    const agent = makeAgent(0, 0, { state: 'idle' });
    expect(shouldFire(agent, profile, 200)).toBe(true);
    expect(shouldFire(agent, profile, 700)).toBe(false);
  });

  it('holds fire for mobile hosts while repositioning', () => {
    const profile = resolveAiProfile(4);
    const agent = makeAgent(0, 0, { state: 'reposition' });
    expect(shouldFire(agent, profile, 100)).toBe(false);
  });

  it('lets engaged mobile hosts fire within range', () => {
    const profile = resolveAiProfile(4);
    const agent = makeAgent(0, 0, { state: 'engage' });
    expect(shouldFire(agent, profile, Math.max(200, profile.preferredRange))).toBe(true);
  });
});
