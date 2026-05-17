export const RADAR_BG = 0x050505;
export const GRID_COLOR = 0x111111;
export const GRID_SPACING = 30;

export const PLAYER_COLOR = '#ffffff';
export const PLAYER_SPEED = 180;
export const PLAYER_RADIUS = 8;

export const SPORE_COLOR = '#e0e0e0';
export const SPORE_RADIUS = 3;
export const SPORE_SPEED = 350;
export const SPORE_FIRE_RATE = 4;

export const ANTIBODY_COLOR = '#cc3333';
export const ANTIBODY_RADIUS = 4;

export const NODE_STROKE_COLOR = 0x333333;
export const NODE_FILL_COLOR = 0x1a1a1a;
export const NODE_RADIUS = 20;

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

export const ANTIBODY_CHARS = ['v', 'x', '*'] as const;
export const PLAYER_CHAR = '[+]';
export const NODE_CHAR = 'H';
