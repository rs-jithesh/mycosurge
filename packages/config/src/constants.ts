export const BASE_BIOMASS_PER_SEC = 0.5;

export const MAX_BIOMASS_BASE = 100;

export const ALERT_INCREASE_RATE = 0.5;
export const ALERT_DECAY_RATE = 0.3;
export const ALERT_EFFECT_CAP = 0.5;

export const DEPLETION_RATE_PER_ASSIM = 0.003;

export const TRAUMA_BASE_DURATION = 30;

export const EXPEDITION_BASE_TIME = 300;

export const COMBAT_BIOMASS_BASE = 25;
export const COMBAT_BIOMASS_PER_DIFFICULTY = 15;

export const SKILL_COST_SCALE = 1.5;

// ── Water & Nutrients ──
export const WATER_DEPLETION_RATE = 0.8;
export const NUTRIENT_DEPLETION_RATE = 0.8;
export const MAX_WATER_BASE = 100;
export const MAX_NUTRIENT_BASE = 100;

// ── Combat Yield Thresholds (Section 4) ──
export const WATER_YIELD_THRESHOLD = 0.35;
export const NUTRIENT_YIELD_THRESHOLD = 0.4;
export const STARVATION_THRESHOLD = 0.15;

// Reserve level below which the network is "starving" (passive growth halts).
export const STARVATION_STATE_THRESHOLD = 0.05;

// ── Lysate ──
export const LYSATE_BASE_REWARD = 5;
export const LYSATE_RAW_DECAY_RATE = 1;
export const LYSATE_MAX_STABILIZE_RATE = 1;
export const LYSATE_STABILIZE_WATER_COST = 2;
export const LYSATE_STABILIZE_NUTRIENT_COST = 2;

// ── Radar / Sonar ──
export const SONAR_INTERVAL = 20;
export const SONAR_JITTER = 0.3;
export const SONAR_INITIAL_DELAY = 5;
export const CONTACT_LINGER = 120;
export const SCAN_WATER_COST = 5;
export const BASE_CONTACT_SLOTS = 2;
export const MAX_CONTACT_SLOTS = 3;

// ── Assimilation ──
export const HOST_ASSIMILATION_TARGET = 100;

// ── Manual actions (full game) ──
export const MANUAL_ABSORB_AMOUNT = 2;
export const MANUAL_ABSORB_COOLDOWN = 5;
export const MANUAL_SYNTH_WATER_COST = 10;
export const MANUAL_SYNTH_NUTRIENT_COST = 10;
