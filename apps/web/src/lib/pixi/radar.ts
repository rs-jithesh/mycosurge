import { Application, Graphics, Container, Text, TextStyle, Sprite, Texture } from 'pixi.js';
import { HOSTS } from '@mycosurge/config';
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

interface NodeData {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  patternName: string;
  patternTimer: number;
  alive: boolean;
  angle: number;
  flashTimer: number;
}

interface PlayerData {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  shieldHits: number;
  fireTimer: number;
  invincibleTimer: number;
  flashTimer: number;
  facingAngle: number;
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
}

export interface RadarCallbacks {
  onVictory: () => void;
  onDefeat: () => void;
  onStats?: (stats: RadarStats) => void;
}

export interface RadarInstance {
  destroy: () => void;
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
  },
  callbacks: RadarCallbacks,
  modifiers: { hpMult?: number; speedMult?: number } = {},
): RadarInstance {
  const hpMult = modifiers.hpMult ?? 1;
  const speedMult = modifiers.speedMult ?? 1;
  const host = HOSTS.find((h) => h.id === hostId)!;
  const difficultyMult = 1 + (host.difficulty - 1) * 0.2;
  const nodeCount =
    DIFFICULTY_NODE_COUNT[Math.max(0, host.difficulty - 1)] ??
    DIFFICULTY_NODE_COUNT[DIFFICULTY_NODE_COUNT.length - 1];
  const playerRadius = PLAYER_RADIUS * (combatStats.hitboxMultiplier || 1);
  const glyph = hostGlyph(host.name);

  const app = new Application();
  let destroyed = false;

  const size = 500;

  const gridGraphics = new Graphics();
  const nodeContainer = new Container();
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
  let touchAnchorX = 0,
    touchAnchorY = 0;
  let touchDx = 0,
    touchDy = 0;

  function onKeyDown(e: KeyboardEvent) {
    keys.add(e.code);
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
  }

  function onTouchStart(e: TouchEvent) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const t = e.touches[0];
    touchAnchorX = t.clientX - rect.left;
    touchAnchorY = t.clientY - rect.top;
    touchDx = 0;
    touchDy = 0;
    touchActive = true;
  }

  function onTouchMove(e: TouchEvent) {
    e.preventDefault();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const scale = rect.width > 0 ? size / rect.width : 1;
    const t = e.touches[0];
    touchDx = (t.clientX - rect.left - touchAnchorX) * scale;
    touchDy = (t.clientY - rect.top - touchAnchorY) * scale;
  }

  function onTouchEnd() {
    touchActive = false;
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
    hp: combatStats.hp,
    maxHp: combatStats.maxHp,
    shieldHits: combatStats.shieldHits,
    fireTimer: 0,
    invincibleTimer: 0,
    flashTimer: 0,
    facingAngle: -Math.PI / 2,
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
    };
    if (
      last &&
      last.hp === next.hp &&
      last.shieldHits === next.shieldHits &&
      last.hostHp === next.hostHp
    ) {
      return;
    }
    last = next;
    callbacks.onStats?.(next);
  }

  const nodes: NodeData[] = [];
  const nodeRadius = HOST_SIZE / 2;
  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * Math.PI * 2;
    const dist = 120 + Math.random() * 60;
    const patternIdx = i % host.attackPatterns.length;
    nodes.push({
      x: centerX + Math.cos(angle) * dist,
      y: centerY + Math.sin(angle) * dist,
      hp: Math.ceil(10 * difficultyMult * hpMult),
      maxHp: Math.ceil(10 * difficultyMult * hpMult),
      radius: nodeRadius,
      patternName: host.attackPatterns[patternIdx],
      patternTimer: randomBetween(0, 2),
      alive: true,
      angle: 0,
      flashTimer: 0,
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
    node.patternTimer = 0;

    const dx = player.x - node.x,
      dy = player.y - node.y;
    const angleToPlayer = Math.atan2(dy, dx);
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);

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
        spawnAntibody(node.x, node.y, (dx / distToPlayer) * speed, (dy / distToPlayer) * speed);
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
          spawnAntibody(node.x, node.y, (dx / distToPlayer) * speed, (dy / distToPlayer) * speed);
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

  function takeDamage() {
    if (player.invincibleTimer > 0) return;
    if (player.shieldHits > 0) {
      player.shieldHits--;
      player.invincibleTimer = 0.5;
      return;
    }
    player.hp -= Math.max(0.05, 1 - combatStats.damageResistance);
    player.invincibleTimer = 1;
    player.flashTimer = HIT_FLASH_DURATION;
    if (player.hp <= 0 && combatStats.emergencyEvac) player.hp = 1;
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
      callbacks.onVictory();
      destroyed = true;
      return;
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

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      player.x += (dx / len) * PLAYER_SPEED * dt;
      player.y += (dy / len) * PLAYER_SPEED * dt;
      player.facingAngle = Math.atan2(dy, dx);
    }

    player.x = Math.max(10, Math.min(size - 10, player.x));
    player.y = Math.max(10, Math.min(size - 10, player.y));

    player.fireTimer -= dt;
    if (player.fireTimer <= 0) {
      player.fireTimer = 1 / (SPORE_FIRE_RATE * combatStats.fireRate);
      spawnSpore();
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
            if (combatStats.chainReaction) {
              for (const other of nodes) {
                if (other === node || !other.alive) continue;
                const ddx = other.x - node.x;
                const ddy = other.y - node.y;
                if (ddx * ddx + ddy * ddy < 60 * 60) {
                  other.hp -= p.damage * 0.5;
                  other.flashTimer = HIT_FLASH_DURATION;
                  if (other.hp <= 0) other.alive = false;
                }
              }
            }
            if (node.hp <= 0) {
              node.alive = false;
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
      if (!n.alive) {
        nodeGraphics[i].body.visible = false;
        nodeGraphics[i].label.visible = false;
        continue;
      }
      drawHost(nodeGraphics[i].body, n.flashTimer > 0 ? 0xffffff : CORAL_COLOR);
      nodeGraphics[i].body.position.set(n.x, n.y);
      nodeGraphics[i].label.position.set(n.x, n.y);
      n.flashTimer = Math.max(0, n.flashTimer - dt);
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

    emitStats();
  }

  function drawPlayer() {
    const color = player.flashTimer > 0 ? CORAL_COLOR : MINT_COLOR;
    playerGfx.clear();
    playerGfx.circle(0, 0, PLAYER_RADIUS + 9);
    playerGfx.fill({ color, alpha: 0.18 });
    playerGfx.circle(0, 0, PLAYER_RADIUS);
    playerGfx.fill({ color, alpha: 1 });
    playerGfx.alpha =
      player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 12) % 2 === 0 ? 0.4 : 1;
  }

  (async () => {
    await app.init({
      width: size,
      height: size,
      background: RADAR_BG,
      antialias: false,
      roundPixels: true,
      autoStart: true,
    });
    if (destroyed) return;

    container.appendChild(app.canvas);
    app.canvas.setAttribute('tabindex', '0');
    app.canvas.setAttribute('role', 'application');
    app.canvas.setAttribute(
      'aria-label',
      'Combat arena. Use WASD or arrow keys to move; spores fire automatically.',
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
  })();

  return {
    destroy: () => {
      destroyed = true;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      app.ticker.remove(tick);
      app.destroy(true, { children: true, texture: true });
    },
  };
}
