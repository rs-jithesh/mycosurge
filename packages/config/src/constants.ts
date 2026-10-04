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
// A gentle continuous drain on Water and Nutrients. Upkeep is driven by network
// reach: the deeper the network spreads, the more it costs to maintain. Applied
// only while `gamePhase === 'active'` (the tutorial runs its own economy).
/** Continuous drain on Water and Nutrients per mm of reach. */
export const UPKEEP_PER_REACH = 0.02;
/** Legacy complexity-based upkeep (disabled while reach drives upkeep). */
export const UPKEEP_PER_LEVEL = 0.1;
export const UPKEEP_PER_ECHO = 0.1;
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
/** Both reserves at or above this fraction make a synthesis "brimming". */
export const SYNTHESIS_BRIM_RATIO = 0.9;
/** Extra Biomass granted for a timely (brimming) synthesis — a reward, never a penalty. */
export const SYNTHESIS_BRIM_BONUS = 0.5;

// ── Network reach / expansion ──
/** Reach (mm) the network starts the full game with — the tutorial's 5 mm. */
export const REACH_START = 5;
/** Biomass cost of the first reach extension. */
export const REACH_COST_BASE = 10;
/** Each mm beyond the first costs this much more than the last. */
export const REACH_COST_SCALE = 1.16;
/** Extra Biomass storage per mm of reach beyond the starting depth. */
export const BIOMASS_CAP_PER_REACH = 24;

// ── Directional reach (sectors) ──
/** Number of wedges the network grows into. Each has its own depth. */
export const REACH_SECTORS = 6;
/** mm added to the chosen wedge by a targeted growth. */
export const SECTOR_GROW_MM = 1;
/** mm added to every wedge by a single "grow evenly" action. */
export const EVEN_GROW_MM = 0.5;

// ── Observation log ──
/** Most recent entries kept in the activity log. */
export const LOG_MAX_ENTRIES = 100;
/** Identical consecutive lines within this window collapse into one `×N` entry. */
export const LOG_REPEAT_WINDOW_SECONDS = 30;

// ── Offline progression ──
/** Longest stretch of absence that still accrues progress. */
export const OFFLINE_MAX_SECONDS = 8 * 60 * 60;
/** Fraction of the online economy that runs while away. */
export const OFFLINE_BASE_RATE = 0.5;
/** Extra offline rate per level of the Dormant Spores mutation. */
export const OFFLINE_DORMANT_BONUS_PER_LEVEL = 0.25;
