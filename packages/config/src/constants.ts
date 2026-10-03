export const BASE_BIOMASS_PER_SEC = 0.5;

export const MAX_BIOMASS_BASE = 100;

export const ALERT_INCREASE_RATE = 0.5;
export const ALERT_DECAY_RATE = 0.3;
export const ALERT_EFFECT_CAP = 0.5;

export const DEPLETION_RATE_PER_ASSIM = 0.003;

/** Hard ceiling on the *combined* alert + strain drag on passive Biomass. */
export const ECOLOGICAL_DRAG_CAP = 0.5;

export const TRAUMA_BASE_DURATION = 30;

export const EXPEDITION_BASE_TIME = 300;

export const COMBAT_BIOMASS_BASE = 25;
export const COMBAT_BIOMASS_PER_DIFFICULTY = 15;

// ── Genome points (mutation budget) ──
// Mutations are paid with a limited point budget, not Biomass, so a player
// cannot own every node and builds diverge. Total points grow with echoes.
export const GENOME_BASE_POINTS = 6;
/** Extra genome points granted per acquired echo. */
export const GENOME_POINTS_PER_ECHO = 2;
/** Biomass cost of every respec after the first (free) one. */
export const RESPEC_BIOMASS_COST = 40;

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

// ── Metabolic upkeep (full game) ──
// A gentle continuous drain on Water and Nutrients that scales with network
// complexity, so automation is a tradeoff rather than a permanent surplus.
// Applied only while `gamePhase === 'active'` (the tutorial runs its own economy).
/** Extra drain on a pool per level of its own generator. */
export const UPKEEP_PER_LEVEL = 0.1;
/** Extra drain on both pools per acquired echo (complexity tax). */
export const UPKEEP_PER_ECHO = 0.1;
/** Extra drain on both pools per capacity expansion. */
export const UPKEEP_PER_EXPANSION = 0.05;

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
// Ecological strain added to `assimilationPercent` per victory. Kept small and
// separate from the per-host echo progress so the two meters mean different things.
export const GLOBAL_STRAIN_PER_WIN = 2;

// ── Manual actions (full game) ──
export const MANUAL_ABSORB_AMOUNT = 2;
export const MANUAL_ABSORB_COOLDOWN = 5;
export const MANUAL_SYNTH_WATER_COST = 10;
export const MANUAL_SYNTH_NUTRIENT_COST = 10;

// ── Offline progression ──
/** Longest stretch of absence that still accrues progress. */
export const OFFLINE_MAX_SECONDS = 8 * 60 * 60;
/** Fraction of the online economy that runs while away. */
export const OFFLINE_BASE_RATE = 0.5;
/** Extra offline rate per level of the Dormant Spores mutation. */
export const OFFLINE_DORMANT_BONUS_PER_LEVEL = 0.25;
