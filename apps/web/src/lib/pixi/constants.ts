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
