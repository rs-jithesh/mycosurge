import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js';
import { HOSTS } from '@mycosurge/config';
import type { CombatResult } from '@mycosurge/game-engine';
import {
  RADAR_BG,
  GRID_COLOR,
  GRID_SPACING,
  PLAYER_COLOR,
  PLAYER_SPEED,
  SPORE_COLOR,
  SPORE_SPEED,
  SPORE_FIRE_RATE,
  ANTIBODY_COLOR,
  NODE_STROKE_COLOR,
  NODE_FILL_COLOR,
  NODE_RADIUS,
  HIT_FLASH_DURATION,
  COLLISION_BUMP,
  DIFFICULTY_NODE_COUNT,
  PATTERN_INTERVALS,
  ANTIBODY_CHARS,
  PLAYER_CHAR,
  NODE_CHAR,
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
  charIdx: number;
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
      charIdx: 0,
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

export interface RadarCallbacks {
  onVictory: (result: CombatResult) => void;
  onDefeat: () => void;
}

export interface RadarInstance {
  destroy: () => void;
}

const TEXT_STYLE = new TextStyle({
  fontFamily: 'monospace',
  fontSize: 14,
  fill: '#e0e0e0',
  letterSpacing: 0,
});

const PLAYER_STYLE = new TextStyle({
  fontFamily: 'monospace',
  fontSize: 16,
  fill: '#ffffff',
  fontWeight: 'bold',
});

const ALERT_STYLE = new TextStyle({
  fontFamily: 'monospace',
  fontSize: 13,
  fill: '#cc3333',
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
  },
  callbacks: RadarCallbacks,
): RadarInstance {
  const host = HOSTS.find((h) => h.id === hostId)!;
  const difficultyMult = 1 + (host.difficulty - 1) * 0.2;
  const nodeCount = Math.min(
    DIFFICULTY_NODE_COUNT[host.difficulty] ??
      DIFFICULTY_NODE_COUNT[DIFFICULTY_NODE_COUNT.length - 1],
    8,
  );

  const app = new Application();
  let destroyed = false;

  const size = 500;

  const gridGraphics = new Graphics();
  const nodeContainer = new Container();
  const projectileContainer = new Container();
  const playerText = new Text({ text: PLAYER_CHAR, style: PLAYER_STYLE });
  playerText.anchor.set(0.5);

  const stage = new Container();
  stage.addChild(gridGraphics);
  stage.addChild(nodeContainer);
  stage.addChild(playerText);
  stage.addChild(projectileContainer);

  drawGrid(size);
  function drawGrid(s: number) {
    gridGraphics.clear();
    for (let x = 0; x < s; x += GRID_SPACING) {
      for (let y = 0; y < s; y += GRID_SPACING) {
        gridGraphics.circle(x, y, 1);
        gridGraphics.fill({ color: GRID_COLOR, alpha: 1 });
      }
    }
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
    const t = e.touches[0];
    touchDx = t.clientX - rect.left - touchAnchorX;
    touchDy = t.clientY - rect.top - touchAnchorY;
  }

  function onTouchEnd() {
    touchActive = false;
    touchDx = 0;
    touchDy = 0;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  const pool = createProjectilePool();
  const poolTexts: Text[] = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const t = new Text({ text: '.', style: TEXT_STYLE });
    t.anchor.set(0.5);
    t.visible = false;
    projectileContainer.addChild(t);
    poolTexts.push(t);
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

  const nodes: NodeData[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * Math.PI * 2;
    const dist = 120 + Math.random() * 60;
    const patternIdx = i % host.attackPatterns.length;
    nodes.push({
      x: centerX + Math.cos(angle) * dist,
      y: centerY + Math.sin(angle) * dist,
      hp: Math.ceil(10 * difficultyMult),
      maxHp: Math.ceil(10 * difficultyMult),
      radius: NODE_RADIUS,
      patternName: host.attackPatterns[patternIdx],
      patternTimer: randomBetween(0, 2),
      alive: true,
      angle: 0,
      flashTimer: 0,
    });
  }

  const nodeGraphics: { ring: Graphics; label: Text }[] = [];
  for (const n of nodes) {
    const ring = new Graphics();
    ring.position.set(n.x, n.y);
    nodeContainer.addChild(ring);

    const label = new Text({ text: NODE_CHAR, style: TEXT_STYLE });
    label.anchor.set(0.5);
    label.position.set(n.x, n.y);
    nodeContainer.addChild(label);

    nodeGraphics.push({ ring, label });
    drawNodeRing(ring, 0x333333, n.radius);
  }

  function drawNodeRing(g: Graphics, strokeColor: number, radius: number) {
    g.clear();
    g.circle(0, 0, radius);
    g.fill({ color: NODE_FILL_COLOR, alpha: 1 });
    g.circle(0, 0, radius - 1);
    g.stroke({ color: strokeColor, alpha: 1, width: 1 });
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
      p.x = player.x + Math.cos(a) * 12;
      p.y = player.y + Math.sin(a) * 12;
      p.vx = Math.cos(a) * speed;
      p.vy = Math.sin(a) * speed;
      p.damage = combatStats.damage;
      p.friendly = true;
      p.piercing = combatStats.piercing;
      p.alive = true;
      p.life = 3;
      p.charIdx = 0;
    }
  }

  function spawnAntibody(x: number, y: number, vx: number, vy: number) {
    const p = acquireProjectile(pool);
    if (!p) return;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.damage = 1;
    p.friendly = false;
    p.piercing = false;
    p.alive = true;
    p.life = 5;
    p.charIdx = Math.floor(Math.random() * ANTIBODY_CHARS.length);
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
    player.hp--;
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
      callbacks.onVictory({
        victory: true,
        biomassEarned: 0,
        assimilationGained: 0,
        lysateEarned: 0,
        hostDefeated: false,
        echoUnlocked: false,
      });
      destroyed = true;
      return;
    }

    player.flashTimer = Math.max(0, player.flashTimer - dt);
    player.invincibleTimer = Math.max(0, player.invincibleTimer - dt);

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
        poolTexts[i].visible = false;
        continue;
      }

      if (p.friendly) {
        for (const node of nodes) {
          if (!node.alive) continue;
          if (circleCollision(p.x, p.y, 3, node.x, node.y, node.radius)) {
            node.hp -= p.damage;
            node.flashTimer = HIT_FLASH_DURATION;
            if (node.hp <= 0) {
              node.alive = false;
            }
            if (!p.piercing) {
              p.alive = false;
              poolTexts[i].visible = false;
            }
            break;
          }
        }
      } else {
        if (circleCollision(p.x, p.y, 4, player.x, player.y, 8)) {
          takeDamage();
          p.alive = false;
          poolTexts[i].visible = false;
        }
      }
    }

    playerText.style =
      player.flashTimer > 0
        ? new TextStyle({
            fontFamily: 'monospace',
            fontSize: 16,
            fill: '#cc3333',
            fontWeight: 'bold',
          })
        : PLAYER_STYLE;
    playerText.position.set(player.x, player.y);

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n.alive) {
        nodeGraphics[i].ring.visible = false;
        nodeGraphics[i].label.visible = false;
        continue;
      }
      const strokeColor = n.flashTimer > 0 ? 0x888888 : 0x333333;
      drawNodeRing(nodeGraphics[i].ring, strokeColor, n.radius);
      nodeGraphics[i].ring.position.set(n.x, n.y);
      nodeGraphics[i].label.position.set(n.x, n.y);
      n.flashTimer = Math.max(0, n.flashTimer - dt);
    }

    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.alive) {
        poolTexts[i].visible = false;
        continue;
      }
      const t = poolTexts[i];
      if (p.friendly) {
        t.text = '.';
        t.style = TEXT_STYLE;
      } else {
        t.text = ANTIBODY_CHARS[p.charIdx % ANTIBODY_CHARS.length];
        t.style = ALERT_STYLE;
      }
      t.position.set(p.x, p.y);
      t.visible = true;
    }
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
    app.canvas.style.outline = 'none';
    app.canvas.addEventListener('keydown', onKeyDown);
    app.canvas.addEventListener('keyup', onKeyUp);
    app.canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    app.canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    app.canvas.addEventListener('touchend', onTouchEnd);
    app.canvas.addEventListener('touchcancel', onTouchEnd);
    app.stage.addChild(stage);
    app.ticker.add(tick);
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
