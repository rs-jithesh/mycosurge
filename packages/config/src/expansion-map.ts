/**
 * Expansion & discovery map tuning. Every value the map geometry, host placement,
 * sensing and cord upgrade depend on lives here so the engine stays pure math.
 */

export const EXPANSION_MAP = {
  // ── Ring grid (mm from the colony centre) ──
  /** A faint dashed ring every this many mm. */
  ringStepMm: 2.5,
  /** Every Nth ring is a labelled major ring (2 → 5 mm, 10 mm, …). */
  majorRingEvery: 2,
  /** Minimum view radius drawn, so early rings are never cramped. */
  baseViewMm: 12,
  /** Hard geometry extent. Must exceed the deepest host tier threshold. */
  maxMm: 36,

  // ── Sensing ──
  /** Hosts beyond reach but within this range are sensed (dashed, unnamed). */
  senseRangeMm: 3,
  /** How far past the reach edge the dotted "ghost" growth is shown. */
  ghostMm: 1.5,

  // ── Hyphae generation (all deterministic from the seed) ──
  /** Number of primary branches radiating from the colony. */
  branchCount: 7,
  /** Length of one growth step (mm). */
  stepMm: 0.9,
  /** Per-step angular wobble (radians). */
  branchJitter: 0.22,
  /** Per-branch starting-angle wobble (radians). */
  baseJitter: 0.5,
  /** Chance per step that a branch throws off a fork. */
  forkChance: 0.08,
  /** Forks may fork once more, but no deeper than this. */
  maxForkDepth: 2,
  /** Angle a fork deviates from its parent (radians). */
  forkAngle: 0.7,
  /** Fork length as a fraction of the remaining steps. */
  forkLengthRatio: 0.5,
  /** Safety cap on generated segments. */
  maxSegments: 900,
  /** Stroke width at the colony, decaying by this factor per fork depth. */
  widthBase: 3.4,
  widthDecay: 0.7,

  // ── Host placement ──
  /** A host sits this far past its tier's reach threshold. */
  hostTierOffsetMm: 0.5,
  /** Extra seeded distance spread so same-tier hosts differ. */
  hostDistanceJitterMm: 2.5,

  // ── Territory ──
  /** Flat fill opacity of the claimed-territory wash. */
  territoryOpacity: 0.06,

  // ── Rhizomorph cord ──
  /** Cord build cost, as a multiple of the next reach cost. */
  cordCostMult: 5,
  /** Reserved: upkeep multiplier once a cord exists (wired in a later slice). */
  cordUpkeepMult: 0.6,

  // ── Rendering ──
  /** Milliseconds the drawn reach takes to ease toward its target. */
  reachAnimMs: 320,
} as const;

export type ExpansionMapTuning = typeof EXPANSION_MAP;
