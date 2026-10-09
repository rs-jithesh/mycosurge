import { Application, Graphics, Container, Text, TextStyle, Sprite, Texture } from 'pixi.js';
import { HOSTS } from '@mycosurge/config';
import {
  stepAgent,
  createAgent,
  resolveAiProfile,
  leadAim,
  shouldFire,
} from '@mycosurge/game-engine';
import type { Agent, AiProfile, ProjectileThreat, Vec2 } from '@mycosurge/game-engine';
import {
  RADAR_BG,
  GRID_COLOR,
  GRID_SPACING,
  MINT_COLOR,
  CORAL_COLOR,
  PLAYER_COLOR,
  PLAYER_SPEED,
  PLAYER_RADIUS,
  SPORE_SPEED,
  SPORE_FIRE_RATE,
  ANTIBODY_COLOR,
  HOST_SIZE,
  HIT_FLASH_DURATION,
  COLLISION_BUMP,
  DIFFICULTY_NODE_COUNT,
  PATTERN_INTERVALS,
  MONO_FONT,
  CHARGE_FULL_TIME,
  CHARGE_MIN_TO_DASH,
  DASH_DURATION,
  DASH_SPEED,
  MELEE_BASE_DAMAGE,
  MELEE_CHARGE_DAMAGE,
  MELEE_INVULN,
  CHARGE_COOLDOWN,
  HOST_DECAY_TIME,
  HOST_SHARD_COUNT,
  HOST_SHARD_LIFE,
} from './constants';

interface ProjectileData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  friendly: boolean;
  piercing: boolean;
  alive: boolean;
  life: number;
}

interface NodeData extends Agent {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  patternName: string;
  patternTimer: number;
  alive: boolean;
  /** True while a destroyed node is visibly shattering (no longer targeted or solid). */
  dying: boolean;
  deathTimer: number;
  angle: number;
  flashTimer: number;
  poisonDps: number;
  poisonTimer: number;
  ai: AiProfile;
}

interface ShardData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  life: number;
  maxLife: number;
  alive: boolean;
}

interface PlayerData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  shieldHits: number;
  fireTimer: number;
  invincibleTimer: number;
  flashTimer: number;
  facingAngle: number;
  /** Charge meter, 0–1 (tutorial melee only). */
  charge: number;
  /** True while the charge input is held and charging is allowed. */
  charging: boolean;
  /** Remaining lunge time; > 0 while dashing. */
  dashTimer: number;
  dashAngle: number;
  dashPower: number;
  /** Pause before the next charge can begin. */
  chargeCooldown: number;
}

const POOL_SIZE = 300;

function createProjectilePool(): ProjectileData[] {
  const pool: ProjectileData[] = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    pool.push({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      damage: 1,
      friendly: true,
      piercing: false,
      alive: false,
      life: 0,
    });
  }
  return pool;
}

function acquireProjectile(pool: ProjectileData[]): ProjectileData | null {
  for (const p of pool) {
    if (!p.alive) return p;
  }
  return null;
}

function circleCollision(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): boolean {
  const dx = ax - bx,
    dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy) < ar + br - COLLISION_BUMP;
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function hostGlyph(name: string): string {
  const clean = name.replace(/\(.*\)/g, '').trim();
  const words = clean.split(/\s+/);
  return (words[words.length - 1]?.[0] ?? 'H').toUpperCase();
}

function makeArenaGlow(size: number): Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createRadialGradient(size / 2, size * 0.4, 0, size / 2, size * 0.4, size * 0.62);
  grad.addColorStop(0, 'rgba(26, 33, 31, 1)');
  grad.addColorStop(1, 'rgba(14, 21, 19, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(canvas);
}

export interface RadarStats {
  hp: number;
  maxHp: number;
  shieldHits: number;
  hostHp: number;
  hostMaxHp: number;
  /** Charge meter, 0–1 (0 outside melee mode). */
  charge: number;
  /** True while the charge input is held. */
  charging: boolean;
}

export interface RadarCallbacks {
  onVictory: () => void;
  onDefeat: () => void;
  onStats?: (stats: RadarStats) => void;
  /** Called if the arena cannot start (e.g. no WebGL), so the UI can recover. */
  onError?: (error: unknown) => void;
}

export interface RadarInstance {
  destroy: () => void;
  /** Tutorial melee: start/stop holding the charge (release triggers the slam). */
  setCharging: (active: boolean) => void;
}

const HOST_STYLE = new TextStyle({
  fontFamily: MONO_FONT,
  fontSize: 20,
  fill: ANTIBODY_COLOR,
  fontWeight: 'bold',
});

export function createRadar(
  container: HTMLElement,
  hostId: string,
  combatStats: {
    maxHp: number;
    hp: number;
    damage: number;
    fireRate: number;
    projectileSpeed: number;
    projectileCount: number;
    piercing: boolean;
    shieldHits: number;
    emergencyEvac: boolean;
    hitboxMultiplier: number;
    damageResistance: number;
    hpRegen: number;
    chainReaction: boolean;
    poisonDamage: number;
    moveSpeedMult: number;
    dodgeWindowMult: number;
    evadeChance: number;
  },
  callbacks: RadarCallbacks,
  modifiers: { hpMult?: number; speedMult?: number; moveSpeedMult?: number } = {},
  options: { melee?: boolean } = {},
): RadarInstance {
  const hpMult = modifiers.hpMult ?? 1;
  const speedMult = modifiers.speedMult ?? 1;
  const moveSpeedMult = modifiers.moveSpeedMult ?? 1;
  // Tutorial melee: no auto-fire — the player charges and slams instead.
  const melee = options.melee ?? false;
  const host = HOSTS.find((h) => h.id === hostId)!;
  const difficultyMult = 1 + (host.difficulty - 1) * 0.2;
  const nodeCount =
    DIFFICULTY_NODE_COUNT[Math.max(0, host.difficulty - 1)] ??
    DIFFICULTY_NODE_COUNT[DIFFICULTY_NODE_COUNT.length - 1];
  const playerRadius = PLAYER_RADIUS * (combatStats.hitboxMultiplier || 1);
  const glyph = hostGlyph(host.name);

  const app = new Application();
  let destroyed = false;
  let ready = false;
  // Set once the host is dead so the dissolve animation can play before the result.
  let victoryPending = false;
  let victoryDelay = 0;
  // If Pixi never comes up (no WebGL, blocked context, etc.) we must not hang the
  // fight: report failure so the modal can offer a way out.
  const watchdog = setTimeout(() => {
    if (!ready && !destroyed) callbacks.onError?.(new Error('Arena failed to start.'));
  }, 5000);

  const size = 500;

  const gridGraphics = new Graphics();
  const nodeContainer = new Container();
  const shardContainer = new Container();
  const projectileContainer = new Container();
  const playerGfx = new Graphics();

  const stage = new Container();
  stage.addChild(gridGraphics);
  const glowTexture = makeArenaGlow(size);
  if (glowTexture) {
    const glow = new Sprite(glowTexture);
    glow.width = size;
    glow.height = size;
    stage.addChild(glow);
  }
  stage.addChild(nodeContainer);
  stage.addChild(shardContainer);
  stage.addChild(playerGfx);
  stage.addChild(projectileContainer);

  drawGrid();
  function drawGrid() {
    gridGraphics.clear();
    for (let x = 0; x <= size; x += GRID_SPACING) {
      gridGraphics.moveTo(x, 0);
      gridGraphics.lineTo(x, size);
    }
    for (let y = 0; y <= size; y += GRID_SPACING) {
      gridGraphics.moveTo(0, y);
      gridGraphics.lineTo(size, y);
    }
    gridGraphics.stroke({ color: GRID_COLOR, alpha: 0.06, width: 1 });
  }

  const keys: Set<string> = new Set();
  let touchActive = false;
  // The drag finger, tracked by identifier so a second finger — e.g. one holding the
  // Charge button — never hijacks the joystick. Only touches that begin on the canvas are
  // adopted; the button's touches never reach these handlers.
  let touchId: number | null = null;
  let touchAnchorX = 0,
    touchAnchorY = 0;
  let touchDx = 0,
    touchDy = 0;

  function findTouch(list: TouchList, id: number): Touch | null {
    for (let i = 0; i < list.length; i++) {
      if (list[i].identifier === id) return list[i];
    }
    return null;
  }

  function onKeyDown(e: KeyboardEvent) {
    keys.add(e.code);
    if (melee && e.code === 'Space') {
      e.preventDefault();
      setCharging(true);
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
    if (melee && e.code === 'Space') {
      e.preventDefault();
      setCharging(false);
    }
  }

  function onTouchStart(e: TouchEvent) {
    // Adopt the first touch that lands on the canvas; ignore any others.
    if (touchId !== null) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    touchId = t.identifier;
    touchAnchorX = t.clientX - rect.left;
    touchAnchorY = t.clientY - rect.top;
    touchDx = 0;
    touchDy = 0;
    touchActive = true;
  }

  function onTouchMove(e: TouchEvent) {
    if (touchId === null) return;
    const t = findTouch(e.touches, touchId);
    if (!t) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const scale = rect.width > 0 ? size / rect.width : 1;
    touchDx = (t.clientX - rect.left - touchAnchorX) * scale;
    touchDy = (t.clientY - rect.top - touchAnchorY) * scale;
  }

  function onTouchEnd(e: TouchEvent) {
    // Only release the joystick when the finger that owns it lifts.
    if (touchId === null || !findTouch(e.changedTouches, touchId)) return;
    touchActive = false;
    touchId = null;
    touchDx = 0;
    touchDy = 0;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  const pool = createProjectilePool();
  const poolGfx: Graphics[] = [];
  const drawnFriendly: (boolean | null)[] = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const g = new Graphics();
    g.visible = false;
    projectileContainer.addChild(g);
    poolGfx.push(g);
    drawnFriendly.push(null);
  }

  function drawProjectile(g: Graphics, friendly: boolean) {
    g.clear();
    if (friendly) {
      g.roundRect(-2, -6, 4, 12, 2);
      g.fill({ color: MINT_COLOR, alpha: 1 });
    } else {
      g.circle(0, 0, 4);
      g.fill({ color: CORAL_COLOR, alpha: 1 });
    }
  }

  const centerX = size / 2,
    centerY = size / 2;

  const player: PlayerData = {
    x: centerX,
    y: centerY,
    vx: 0,
    vy: 0,
    hp: combatStats.hp,
    maxHp: combatStats.maxHp,
    shieldHits: combatStats.shieldHits,
    fireTimer: 0,
    invincibleTimer: 0,
    flashTimer: 0,
    facingAngle: -Math.PI / 2,
    charge: 0,
    charging: false,
    dashTimer: 0,
    dashAngle: -Math.PI / 2,
    dashPower: 0,
    chargeCooldown: 0,
  };

  function hostTotals() {
    let hp = 0,
      maxHp = 0;
    for (const n of nodes) {
      if (n.alive) hp += n.hp;
      maxHp += n.maxHp;
    }
    return { hp, maxHp };
  }

  let last: RadarStats | null = null;
  function emitStats() {
    const totals = hostTotals();
    const next: RadarStats = {
      hp: player.hp,
      maxHp: player.maxHp,
      shieldHits: player.shieldHits,
      hostHp: Math.max(0, totals.hp),
      hostMaxHp: totals.maxHp,
      charge: player.charge,
      charging: player.charging,
    };
    if (
      last &&
      last.hp === next.hp &&
      last.shieldHits === next.shieldHits &&
      last.hostHp === next.hostHp &&
      last.charge === next.charge &&
      last.charging === next.charging
    ) {
      return;
    }
    last = next;
    callbacks.onStats?.(next);
  }

  const nodes: NodeData[] = [];
  const nodeRadius = HOST_SIZE / 2;
  const ai = resolveAiProfile(host.difficulty, { moveSpeedMult }, host.ai);
  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * Math.PI * 2;
    const dist = 120 + Math.random() * 60;
    const patternIdx = i % host.attackPatterns.length;
    const agent = createAgent(
      centerX + Math.cos(angle) * dist,
      centerY + Math.sin(angle) * dist,
      Math.random,
    );
    nodes.push({
      ...agent,
      hp: Math.ceil(10 * difficultyMult * hpMult),
      maxHp: Math.ceil(10 * difficultyMult * hpMult),
      radius: nodeRadius,
      patternName: host.attackPatterns[patternIdx],
      patternTimer: randomBetween(0, 2),
      alive: true,
      dying: false,
      deathTimer: 0,
      angle: 0,
      flashTimer: 0,
      poisonDps: 0,
      poisonTimer: 0,
      ai,
    });
  }

  const nodeGraphics: { body: Graphics; label: Text }[] = [];
  for (const n of nodes) {
    const body = new Graphics();
    body.position.set(n.x, n.y);
    nodeContainer.addChild(body);

    const label = new Text({ text: glyph, style: HOST_STYLE });
    label.anchor.set(0.5);
    label.position.set(n.x, n.y);
    nodeContainer.addChild(label);

    nodeGraphics.push({ body, label });
    drawHost(body, CORAL_COLOR);
  }

  function drawHost(g: Graphics, strokeColor: number) {
    g.clear();
    g.roundRect(-HOST_SIZE / 2, -HOST_SIZE / 2, HOST_SIZE, HOST_SIZE, 10);
    g.fill({ color: CORAL_COLOR, alpha: 0.16 });
    g.roundRect(-HOST_SIZE / 2, -HOST_SIZE / 2, HOST_SIZE, HOST_SIZE, 10);
    g.stroke({ color: strokeColor, width: 2 });
  }

  // ── Host death: shatter + dissolve (played before the victory result) ──
  const SHARD_POOL = Math.max(24, nodeCount * HOST_SHARD_COUNT * 2);
  const shards: ShardData[] = [];
  const shardGfx: Graphics[] = [];
  for (let i = 0; i < SHARD_POOL; i++) {
    shards.push({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rot: 0,
      vr: 0,
      size: 0,
      life: 0,
      maxLife: 1,
      alive: false,
    });
    const g = new Graphics();
    g.visible = false;
    shardContainer.addChild(g);
    shardGfx.push(g);
  }

  function spawnShards(node: NodeData) {
    let spawned = 0;
    for (let i = 0; i < shards.length && spawned < HOST_SHARD_COUNT; i++) {
      const s = shards[i];
      if (s.alive) continue;
      const a = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      s.x = node.x;
      s.y = node.y;
      s.vx = Math.cos(a) * speed;
      s.vy = Math.sin(a) * speed;
      s.rot = Math.random() * Math.PI;
      s.vr = (Math.random() - 0.5) * 8;
      s.size = 4 + Math.random() * 6;
      s.maxLife = HOST_SHARD_LIFE * (0.6 + Math.random() * 0.4);
      s.life = s.maxLife;
      s.alive = true;
      spawned++;
    }
  }

  /** Draw a dissolving node: it swells and fades as its outline breaks up. */
  function drawDyingHost(g: Graphics, t: number) {
    const w = HOST_SIZE * (1 + t * 0.7);
    g.clear();
    g.roundRect(-w / 2, -w / 2, w, w, 10);
    g.fill({ color: CORAL_COLOR, alpha: 0.16 * (1 - t) });
    g.roundRect(-w / 2, -w / 2, w, w, 10);
    g.stroke({ color: CORAL_COLOR, width: 2, alpha: 1 - t });
  }

  /** Mark a node destroyed and hand its corpse to the dissolve animation. */
  function killNode(node: NodeData) {
    if (!node.alive) return;
    node.alive = false;
    node.dying = true;
    node.deathTimer = HOST_DECAY_TIME;
    spawnShards(node);
  }

  function isOffScreen(x: number, y: number): boolean {
    return x < -40 || x > size + 40 || y < -40 || y > size + 40;
  }

  function spawnSpore() {
    const count = combatStats.projectileCount;
    const spreadAngle = count > 1 ? 0.2 : 0;
    const baseAngle = player.facingAngle;
    const startOffset = ((count - 1) * spreadAngle) / 2;
    const speed = SPORE_SPEED * combatStats.projectileSpeed;

    for (let i = 0; i < count; i++) {
      const p = acquireProjectile(pool);
      if (!p) break;
      const a = baseAngle - startOffset + i * spreadAngle;
      p.x = player.x + Math.cos(a) * 14;
      p.y = player.y + Math.sin(a) * 14;
      p.vx = Math.cos(a) * speed;
      p.vy = Math.sin(a) * speed;
      p.damage = combatStats.damage;
      p.friendly = true;
      p.piercing = combatStats.piercing;
      p.alive = true;
      p.life = 3;
    }
  }

  function spawnAntibody(x: number, y: number, vx: number, vy: number) {
    const p = acquireProjectile(pool);
    if (!p) return;
    p.x = x;
    p.y = y;
    p.vx = vx * speedMult;
    p.vy = vy * speedMult;
    p.damage = 1;
    p.friendly = false;
    p.piercing = false;
    p.alive = true;
    p.life = 5;
  }

  function runPattern(node: NodeData, dt: number) {
    const interval = PATTERN_INTERVALS[node.patternName] ?? 2;
    node.patternTimer += dt;
    if (node.patternTimer < interval) return;

    const dx = player.x - node.x,
      dy = player.y - node.y;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);

    if (!shouldFire(node, node.ai, distToPlayer)) {
      // Hold the pattern loaded so it fires the moment the node is engaged.
      node.patternTimer = Math.min(node.patternTimer, interval);
      return;
    }
    node.patternTimer = 0;

    // Lead the player using a nominal antibody speed for this difficulty.
    const aim = leadAim(node, player, player.vx, player.vy, 130 * difficultyMult);
    const angleToPlayer = aim.angle;

    switch (node.patternName) {
      case 'slow_spiral': {
        node.angle += 0.5;
        const speed = 100 * difficultyMult;
        spawnAntibody(node.x, node.y, Math.cos(node.angle) * speed, Math.sin(node.angle) * speed);
        break;
      }
      case 'burst': {
        const count = 5,
          spread = 0.3,
          speed = 150 * difficultyMult;
        for (let i = 0; i < count; i++) {
          const a = angleToPlayer + (i - 2) * spread;
          spawnAntibody(node.x, node.y, Math.cos(a) * speed, Math.sin(a) * speed);
        }
        break;
      }
      case 'scatter': {
        const speed = 130 * difficultyMult;
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2;
          spawnAntibody(node.x, node.y, Math.cos(a) * speed, Math.sin(a) * speed);
        }
        break;
      }
      case 'wave': {
        const speed = 120 * difficultyMult;
        const perp = angleToPlayer + Math.PI / 2;
        spawnAntibody(
          node.x,
          node.y,
          Math.cos(angleToPlayer) * speed + Math.cos(perp) * 60,
          Math.sin(angleToPlayer) * speed + Math.sin(perp) * 60,
        );
        break;
      }
      case 'homing': {
        const speed = 100 * difficultyMult;
        spawnAntibody(
          node.x,
          node.y,
          Math.cos(angleToPlayer) * speed,
          Math.sin(angleToPlayer) * speed,
        );
        break;
      }
      case 'erratic_swarm': {
        const speed = 160 * difficultyMult;
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          spawnAntibody(node.x, node.y, Math.cos(a) * speed, Math.sin(a) * speed);
        }
        break;
      }
      case 'spiral_nova': {
        node.angle += 0.8;
        const speed = 120 * difficultyMult;
        for (let ring = 0; ring < 2; ring++) {
          const a = node.angle + ring * Math.PI;
          spawnAntibody(node.x, node.y, Math.cos(a) * speed, Math.sin(a) * speed);
        }
        break;
      }
      case 'pattern_combo': {
        node.angle += 1;
        const speed = 130 * difficultyMult;
        if (Math.floor(node.angle) % 2 === 0) {
          for (let i = 0; i < 4; i++) {
            const a = angleToPlayer + (i - 1.5) * 0.2;
            spawnAntibody(node.x, node.y, Math.cos(a) * speed, Math.sin(a) * speed);
          }
        } else {
          for (let i = 0; i < 3; i++) {
            const a = Math.random() * Math.PI * 2;
            spawnAntibody(node.x, node.y, Math.cos(a) * speed, Math.sin(a) * speed);
          }
        }
        break;
      }
      case 'enrage_phase': {
        const hpRatio = node.maxHp > 0 ? node.hp / node.maxHp : 1;
        const rage = 1 + (1 - hpRatio) * 1.5;
        node.angle += 0.6;
        const speed = 110 * difficultyMult * rage;
        spawnAntibody(node.x, node.y, Math.cos(node.angle) * speed, Math.sin(node.angle) * speed);
        spawnAntibody(
          node.x,
          node.y,
          Math.cos(node.angle + Math.PI) * speed,
          Math.sin(node.angle + Math.PI) * speed,
        );
        break;
      }
      case 'multi_phase': {
        node.angle += 1;
        const phase = Math.floor(node.angle / 3) % 3;
        const speed = 130 * difficultyMult;
        if (phase === 0) {
          for (let i = 0; i < 6; i++) {
            const a = Math.random() * Math.PI * 2;
            spawnAntibody(node.x, node.y, Math.cos(a) * speed, Math.sin(a) * speed);
          }
        } else if (phase === 1) {
          spawnAntibody(
            node.x,
            node.y,
            Math.cos(angleToPlayer) * speed,
            Math.sin(angleToPlayer) * speed,
          );
        } else {
          node.angle += 0.4;
          for (let ring = 0; ring < 2; ring++) {
            const a = node.angle + ring * Math.PI;
            spawnAntibody(node.x, node.y, Math.cos(a) * speed, Math.sin(a) * speed);
          }
        }
        break;
      }
      case 'geometric_lasers': {
        node.angle += 0.3;
        const speed = 260 * difficultyMult;
        const spokes = [
          node.angle,
          node.angle + Math.PI / 2,
          node.angle + Math.PI,
          node.angle + (3 * Math.PI) / 2,
        ];
        for (const a of spokes) {
          spawnAntibody(node.x, node.y, Math.cos(a) * speed, Math.sin(a) * speed);
        }
        break;
      }
      case 'summon': {
        const speed = 90 * difficultyMult;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + node.angle;
          spawnAntibody(node.x, node.y, Math.cos(a) * speed, Math.sin(a) * speed);
        }
        node.angle += 0.4;
        break;
      }
      default: {
        node.angle += 0.5;
        const speed = 100 * difficultyMult;
        spawnAntibody(node.x, node.y, Math.cos(node.angle) * speed, Math.sin(node.angle) * speed);
      }
    }
  }

  const dodgeWindow = 1 * (combatStats.dodgeWindowMult || 1);
  const neighborScratch: Vec2[] = [];
  const threatScratch: ProjectileThreat[] = [];

  function takeDamage() {
    if (victoryPending) return;
    if (player.invincibleTimer > 0) return;
    if (combatStats.evadeChance > 0 && Math.random() < combatStats.evadeChance) return;
    if (player.shieldHits > 0) {
      player.shieldHits--;
      player.invincibleTimer = 0.5 * (combatStats.dodgeWindowMult || 1);
      return;
    }
    player.hp -= Math.max(0.05, 1 - combatStats.damageResistance);
    player.invincibleTimer = dodgeWindow;
    player.flashTimer = HIT_FLASH_DURATION;
    if (player.hp <= 0 && combatStats.emergencyEvac) player.hp = 1;
  }

  /** Release a held charge into a lunge (if it's worth dashing). */
  function releaseCharge() {
    if (player.dashTimer > 0 || player.chargeCooldown > 0 || player.charge < CHARGE_MIN_TO_DASH) {
      player.charge = 0;
      return;
    }
    player.dashPower = player.charge;
    player.dashAngle = player.facingAngle;
    player.dashTimer = DASH_DURATION;
    player.charge = 0;
  }

  /** Tutorial melee input: hold to charge, release to slam. */
  function setCharging(active: boolean) {
    if (!melee || destroyed) return;
    if (active) {
      if (player.dashTimer > 0 || player.chargeCooldown > 0) return;
      player.charging = true;
    } else if (player.charging) {
      player.charging = false;
      releaseCharge();
    }
  }

  function tick() {
    if (destroyed) return;
    const dt = app.ticker.deltaMS / 1000;

    if (player.hp <= 0) {
      callbacks.onDefeat();
      destroyed = true;
      return;
    }

    const aliveNodes = nodes.filter((n) => n.alive);
    if (aliveNodes.length === 0) {
      if (!victoryPending) {
        // The fight is won, but let the last host shatter before the result lands.
        victoryPending = true;
        victoryDelay = HOST_DECAY_TIME;
        // Sweep away in-flight shots and protect the player during the send-off.
        for (const p of pool) {
          if (p.alive && !p.friendly) p.alive = false;
        }
      } else {
        victoryDelay -= dt;
        if (victoryDelay <= 0) {
          callbacks.onVictory();
          destroyed = true;
          return;
        }
      }
    }

    player.flashTimer = Math.max(0, player.flashTimer - dt);
    player.invincibleTimer = Math.max(0, player.invincibleTimer - dt);

    if (combatStats.hpRegen > 0 && player.hp > 0 && player.hp < player.maxHp) {
      player.hp = Math.min(player.maxHp, player.hp + combatStats.hpRegen * dt);
    }

    let dx = 0,
      dy = 0;

    if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1;

    if (touchActive && (Math.abs(touchDx) > 10 || Math.abs(touchDy) > 10)) {
      const len = Math.sqrt(touchDx * touchDx + touchDy * touchDy);
      dx = touchDx / len;
      dy = touchDy / len;
    }

    const prevPlayerX = player.x;
    const prevPlayerY = player.y;

    const dashing = melee && player.dashTimer > 0;
    if (dashing) {
      player.x += Math.cos(player.dashAngle) * DASH_SPEED * dt;
      player.y += Math.sin(player.dashAngle) * DASH_SPEED * dt;
      player.facingAngle = player.dashAngle;
      player.dashTimer = Math.max(0, player.dashTimer - dt);
    } else if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      const speed = PLAYER_SPEED * (combatStats.moveSpeedMult || 1);
      player.x += (dx / len) * speed * dt;
      player.y += (dy / len) * speed * dt;
      player.facingAngle = Math.atan2(dy, dx);
    }

    player.x = Math.max(10, Math.min(size - 10, player.x));
    player.y = Math.max(10, Math.min(size - 10, player.y));

    if (dt > 0) {
      player.vx = (player.x - prevPlayerX) / dt;
      player.vy = (player.y - prevPlayerY) / dt;
    }

    if (melee) {
      if (player.chargeCooldown > 0) {
        player.chargeCooldown = Math.max(0, player.chargeCooldown - dt);
      }
      if (player.charging && player.chargeCooldown <= 0) {
        player.charge = Math.min(1, player.charge + dt / CHARGE_FULL_TIME);
      }

      if (dashing) {
        for (const node of nodes) {
          if (!node.alive) continue;
          if (circleCollision(player.x, player.y, playerRadius, node.x, node.y, node.radius)) {
            node.hp -= MELEE_BASE_DAMAGE + MELEE_CHARGE_DAMAGE * player.dashPower;
            node.flashTimer = HIT_FLASH_DURATION;
            if (node.hp <= 0) killNode(node);
            player.dashTimer = 0;
            player.invincibleTimer = MELEE_INVULN;
            // Bounce clear of the node so the slam reads as a recoil, not a pass-through.
            const nx = player.x - node.x;
            const ny = player.y - node.y;
            const len = Math.sqrt(nx * nx + ny * ny) || 1;
            const push = node.radius + playerRadius + 4;
            player.x = Math.max(10, Math.min(size - 10, node.x + (nx / len) * push));
            player.y = Math.max(10, Math.min(size - 10, node.y + (ny / len) * push));
            break;
          }
        }
      }

      if (dashing && player.dashTimer <= 0) {
        player.chargeCooldown = CHARGE_COOLDOWN;
      }
    } else if (!victoryPending) {
      player.fireTimer -= dt;
      if (player.fireTimer <= 0) {
        player.fireTimer = 1 / (SPORE_FIRE_RATE * combatStats.fireRate);
        spawnSpore();
      }
    }

    neighborScratch.length = 0;
    for (const node of nodes) {
      if (node.alive) neighborScratch.push({ x: node.x, y: node.y });
    }

    threatScratch.length = 0;
    if (ai.dodgeSkill > 0) {
      for (const p of pool) {
        if (p.alive && p.friendly) {
          threatScratch.push({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, radius: 3 });
        }
      }
    }

    const steeringWorld = {
      player: { x: player.x, y: player.y },
      playerVx: player.vx,
      playerVy: player.vy,
      arenaSize: size,
      neighbors: neighborScratch,
      threats: threatScratch,
      dt,
    };

    for (const node of nodes) {
      if (!node.alive) continue;
      stepAgent(node, node.ai, steeringWorld, Math.random);
    }

    for (const node of nodes) {
      if (node.alive) runPattern(node, dt);
    }

    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.alive) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0 || isOffScreen(p.x, p.y)) {
        p.alive = false;
        continue;
      }

      if (p.friendly) {
        for (const node of nodes) {
          if (!node.alive) continue;
          if (circleCollision(p.x, p.y, 3, node.x, node.y, node.radius)) {
            node.hp -= p.damage;
            node.flashTimer = HIT_FLASH_DURATION;
            if (combatStats.poisonDamage > 0) {
              node.poisonDps = combatStats.poisonDamage;
              node.poisonTimer = 3;
            }
            if (combatStats.chainReaction) {
              for (const other of nodes) {
                if (other === node || !other.alive) continue;
                const ddx = other.x - node.x;
                const ddy = other.y - node.y;
                if (ddx * ddx + ddy * ddy < 60 * 60) {
                  other.hp -= p.damage * 0.5;
                  other.flashTimer = HIT_FLASH_DURATION;
                  if (other.hp <= 0) killNode(other);
                }
              }
            }
            if (node.hp <= 0) {
              killNode(node);
            }
            if (!p.piercing) {
              p.alive = false;
            }
            break;
          }
        }
      } else {
        if (circleCollision(p.x, p.y, 4, player.x, player.y, playerRadius)) {
          takeDamage();
          p.alive = false;
        }
      }
    }

    drawPlayer();
    playerGfx.position.set(player.x, player.y);

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const gfx = nodeGraphics[i];
      if (n.alive) {
        drawHost(gfx.body, n.flashTimer > 0 ? 0xffffff : CORAL_COLOR);
        gfx.body.position.set(n.x, n.y);
        gfx.label.position.set(n.x, n.y);
        n.flashTimer = Math.max(0, n.flashTimer - dt);
        if (n.poisonTimer > 0) {
          n.hp -= n.poisonDps * dt;
          n.poisonTimer = Math.max(0, n.poisonTimer - dt);
          if (n.hp <= 0) killNode(n);
        }
      } else if (n.dying) {
        // The corpse swells and fades while its shards fly apart.
        n.deathTimer = Math.max(0, n.deathTimer - dt);
        const t = 1 - n.deathTimer / HOST_DECAY_TIME;
        drawDyingHost(gfx.body, t);
        gfx.body.position.set(n.x, n.y);
        gfx.body.rotation = t * 0.6;
        gfx.label.position.set(n.x, n.y);
        gfx.label.alpha = Math.max(0, 1 - t * 1.4);
        if (n.deathTimer <= 0) {
          n.dying = false;
          gfx.body.visible = false;
          gfx.label.visible = false;
        }
      } else {
        gfx.body.visible = false;
        gfx.label.visible = false;
      }
    }

    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      const g = poolGfx[i];
      if (!p.alive) {
        g.visible = false;
        continue;
      }
      if (drawnFriendly[i] !== p.friendly) {
        drawProjectile(g, p.friendly);
        drawnFriendly[i] = p.friendly;
      }
      g.position.set(p.x, p.y);
      g.rotation = p.friendly ? Math.atan2(p.vy, p.vx) + Math.PI / 2 : 0;
      g.visible = true;
    }

    for (let i = 0; i < shards.length; i++) {
      const s = shards[i];
      const g = shardGfx[i];
      if (!s.alive) {
        g.visible = false;
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 1 - 1.5 * dt;
      s.vy *= 1 - 1.5 * dt;
      s.rot += s.vr * dt;
      s.life -= dt;
      if (s.life <= 0) {
        s.alive = false;
        g.visible = false;
        continue;
      }
      g.clear();
      g.roundRect(-s.size / 2, -s.size / 2, s.size, s.size, 1.5);
      g.fill({ color: CORAL_COLOR, alpha: Math.max(0, s.life / s.maxLife) });
      g.position.set(s.x, s.y);
      g.rotation = s.rot;
      g.visible = true;
    }

    emitStats();
  }

  function drawPlayer() {
    const color = player.flashTimer > 0 ? CORAL_COLOR : MINT_COLOR;
    playerGfx.clear();
    playerGfx.circle(0, 0, PLAYER_RADIUS + 9);
    playerGfx.fill({ color, alpha: 0.18 });
    playerGfx.circle(0, 0, PLAYER_RADIUS);
    playerGfx.fill({ color, alpha: 1 });
    if (melee && player.charging) {
      // A ring that swells (and brightens) as the charge fills — the slam's tell.
      const ringR = PLAYER_RADIUS + 8 + player.charge * 14;
      playerGfx.circle(0, 0, ringR);
      playerGfx.stroke({ color: MINT_COLOR, width: 2, alpha: 0.55 + player.charge * 0.45 });
    }
    playerGfx.alpha =
      player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 12) % 2 === 0 ? 0.4 : 1;
  }

  (async () => {
    try {
      await app.init({
        width: size,
        height: size,
        background: RADAR_BG,
        antialias: false,
        roundPixels: true,
        autoStart: true,
      });
      if (destroyed) return;
      ready = true;
      clearTimeout(watchdog);

      container.appendChild(app.canvas);
      app.canvas.setAttribute('tabindex', '0');
      app.canvas.setAttribute('role', 'application');
      app.canvas.setAttribute(
        'aria-label',
        melee
          ? 'Combat arena. Move with WASD or arrow keys. Hold Space to charge, release to slam into the host.'
          : 'Combat arena. Use WASD or arrow keys to move; spores fire automatically.',
      );
      app.canvas.style.display = 'block';
      app.canvas.style.width = '100%';
      app.canvas.style.height = '100%';
      app.canvas.style.touchAction = 'none';
      app.canvas.addEventListener('keydown', onKeyDown);
      app.canvas.addEventListener('keyup', onKeyUp);
      app.canvas.addEventListener('touchstart', onTouchStart, { passive: true });
      app.canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      app.canvas.addEventListener('touchend', onTouchEnd);
      app.canvas.addEventListener('touchcancel', onTouchEnd);
      app.stage.addChild(stage);
      app.ticker.add(tick);
      emitStats();
    } catch (error) {
      clearTimeout(watchdog);
      if (!destroyed) callbacks.onError?.(error);
    }
  })();

  return {
    setCharging,
    destroy: () => {
      destroyed = true;
      clearTimeout(watchdog);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      try {
        app.ticker.remove(tick);
        app.destroy(true, { children: true, texture: true });
      } catch {
        // The app may never have finished initialising; nothing to tear down.
      }
    },
  };
}
