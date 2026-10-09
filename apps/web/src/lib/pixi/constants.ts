export const RADAR_BG = 0x0e1513;
export const GRID_COLOR = 0x70fdc3;
export const GRID_SPACING = 28;

export const MINT_COLOR = 0x70fdc3;
export const CORAL_COLOR = 0xffb4ab;
export const PLAYER_COLOR = '#70fdc3';
export const PLAYER_SPEED = 180;
export const PLAYER_RADIUS = 11;

export const SPORE_SPEED = 350;
export const SPORE_FIRE_RATE = 4;

export const ANTIBODY_COLOR = '#ffb4ab';

export const HOST_SIZE = 52;

export const HIT_FLASH_DURATION = 0.1;

export const COLLISION_BUMP = 2;

export const DIFFICULTY_NODE_COUNT = [1, 2, 3, 3, 4, 5, 6] as const;

export const PATTERN_INTERVALS: Record<string, number> = {
  slow_spiral: 1.5,
  burst: 2.5,
  scatter: 1.8,
  wave: 1.2,
  homing: 2.0,
  erratic_swarm: 0.8,
  spiral_nova: 2.0,
  pattern_combo: 1.5,
  enrage_phase: 0.6,
  multi_phase: 1.0,
  geometric_lasers: 1.5,
  summon: 4.0,
};

export const MONO_FONT = "'JetBrains Mono', monospace";

// ── Tutorial melee (charge slam) ──
// The tutorial fight trades the spore auto-fire for a charge attack: hold to fill the
// meter, release to dash, and slam into the host node. Full charge is the hardest hit.
/** Seconds of holding to fill the charge meter from empty to full. */
export const CHARGE_FULL_TIME = 0.8;
/** A release below this charge is a cancel, not a dash (guards against stray taps). */
export const CHARGE_MIN_TO_DASH = 0.15;
/** How long the lunge lasts. */
export const DASH_DURATION = 0.2;
/** Lunge speed (px/s) — well above PLAYER_SPEED so a slam reads as a burst. */
export const DASH_SPEED = 900;
/** Slam damage at zero charge and the extra at full charge (so 2–6 on the tutorial node). */
export const MELEE_BASE_DAMAGE = 2;
export const MELEE_CHARGE_DAMAGE = 4;
/** Invulnerability window granted after a connecting slam. */
export const MELEE_INVULN = 0.7;
/** Pause after a dash ends before the next charge can begin. */
export const CHARGE_COOLDOWN = 0.45;
/** Slam recoil: speed the core is thrown back at, and how long the shove lasts. */
export const MELEE_KNOCKBACK_SPEED = 380;
export const MELEE_KNOCKBACK_TIME = 0.17;

// ── Victory send-off ──
/** Seconds the host visibly breaks apart before the victory result is shown. */
export const HOST_DECAY_TIME = 1.0;
/** Shards a dying host node bursts into. */
export const HOST_SHARD_COUNT = 10;
/** Shard lifetime (seconds); they fade out over this. */
export const HOST_SHARD_LIFE = 0.9;
