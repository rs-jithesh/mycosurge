/**
 * Expansion & discovery map tuning. Every value the map geometry, host placement,
 * sensing and cord upgrade depend on lives here so the engine stays pure math.
 *
 * Since reach now spans an 8-stage scale ladder (mm → m), the spatial values are
 * expressed as **fractions of the current band width**, not absolute millimetres.
 * The map layer multiplies them by `getStageBandWidth(stage)`.
 */

export const EXPANSION_MAP = {
  // ── Hyphae generation (deterministic from the seed) ──
  /** Number of primary branches radiating from the colony. */
  branchCount: 7,
  /** Growth steps per branch. Constant, so cost is independent of band size. */
  networkSteps: 34,
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

  // ── Sensing (fractions of the band width) ──
  /** Hosts beyond reach but within this fraction of the band are sensed. */
  senseFraction: 0.25,
  /** How far past the reach edge the dotted "ghost" growth is shown. */
  ghostFraction: 0.08,

  // ── Ring grid ──
  /** Number of labelled rings drawn across a band. */
  ringCount: 5,

  // ── Host placement (fractions of the band width) ──
  /** A host sits this fraction past its band's inner edge (plus seeded spread). */
  hostOffsetFraction: 0.04,
  /** Extra seeded distance spread so same-band hosts differ. */
  hostJitterFraction: 0.12,
  /** The band boss sits near the outer ring, as a gate. */
  bossFraction: 0.9,

  // ── Territory ──
  /** Flat fill opacity of the claimed-territory wash. */
  territoryOpacity: 0.06,

  // ── Rendering ──
  /** Milliseconds the drawn reach takes to ease toward its target. */
  reachAnimMs: 320,
  /** Milliseconds the stage-cross "zoom out" ceremony takes. */
  stageAnimMs: 900,
} as const;

export type ExpansionMapTuning = typeof EXPANSION_MAP;
