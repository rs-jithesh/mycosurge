/**
 * The scale ladder. Network reach is stored in millimetres (the single base unit);
 * these stages slice that axis into readable bands whose display unit changes as
 * the player grows — mm → cm → m. Each stage owns the whole map band: the colony
 * starts at the band centre and the band's boss sits on the outer ring as a gate.
 *
 * Pacing comes from the reach cost curve re-basing at every band (see
 * `getReachCost`), so a narrow band can still be a long stage.
 */

export type StageUnit = 'mm' | 'cm' | 'm';

export interface StageDef {
  /** 1-based stage index. */
  index: number;
  id: string;
  name: string;
  /** Home biome — recorded for the bestiary; a property of the stage. */
  biome: string;
  /** Display unit for this band's rings and reach label. */
  unit: StageUnit;
  /** Absolute reach (mm) entering this band. */
  minMm: number;
  /** Absolute reach (mm) leaving this band (exclusive upper bound). */
  maxMm: number;
}

export const STAGES: StageDef[] = [
  {
    index: 1,
    id: 'microbial',
    name: 'Microbial',
    biome: 'Leaf litter & soil',
    unit: 'mm',
    minMm: 5,
    maxMm: 10,
  },
  {
    index: 2,
    id: 'mesofauna',
    name: 'Soil mesofauna',
    biome: 'Leaf litter & soil',
    unit: 'cm',
    minMm: 10,
    maxMm: 50,
  },
  {
    index: 3,
    id: 'insects',
    name: 'Insects',
    biome: 'Leaf litter & soil',
    unit: 'cm',
    minMm: 50,
    maxMm: 200,
  },
  {
    index: 4,
    id: 'arthropods',
    name: 'Larger arthropods',
    biome: 'Rotting log',
    unit: 'cm',
    minMm: 200,
    maxMm: 600,
  },
  {
    index: 5,
    id: 'vertebrates',
    name: 'Small vertebrates',
    biome: 'Forest floor',
    unit: 'cm',
    minMm: 600,
    maxMm: 1000,
  },
  {
    index: 6,
    id: 'mammals',
    name: 'Mammals & birds',
    biome: 'Forest floor',
    unit: 'm',
    minMm: 1000,
    maxMm: 5000,
  },
  {
    index: 7,
    id: 'megafauna',
    name: 'Megafauna',
    biome: 'Living forest',
    unit: 'm',
    minMm: 5000,
    maxMm: 50000,
  },
  {
    index: 8,
    id: 'apex',
    name: 'Apex',
    biome: 'Living forest',
    unit: 'm',
    minMm: 50000,
    maxMm: 200000,
  },
];

export const FIRST_STAGE_INDEX = STAGES[0].index;
export const LAST_STAGE_INDEX = STAGES[STAGES.length - 1].index;

/**
 * Growth actions per band. Each band is divided into this many steps, so the
 * physical size of a step scales with the band — a few mm in Stage 1, kilometres
 * in the Apex. This keeps the cost curve and click count constant per stage.
 */
export const STEPS_PER_STAGE = 20;

export const STAGE_BY_INDEX: Record<number, StageDef> = Object.fromEntries(
  STAGES.map((stage) => [stage.index, stage]),
);

/** The stage a given reach (mm) falls in. Clamps below the start and above the end. */
export function getStageForReach(reachMm: number): StageDef {
  if (reachMm < STAGES[0].minMm) return STAGES[0];
  for (const stage of STAGES) {
    if (reachMm < stage.maxMm) return stage;
  }
  return STAGES[STAGES.length - 1];
}

export function getStageByIndex(index: number): StageDef {
  return STAGE_BY_INDEX[index] ?? STAGES[0];
}

/** Width of a band in mm. */
export function getStageBandWidth(stage: StageDef): number {
  return stage.maxMm - stage.minMm;
}

/** Physical size (mm) of one growth step within a band. */
export function getStageGrowMm(stage: StageDef): number {
  return getStageBandWidth(stage) / STEPS_PER_STAGE;
}

/** mm → the stage's display unit. */
export function mmToUnit(mm: number, unit: StageUnit): number {
  switch (unit) {
    case 'm':
      return mm / 1000;
    case 'cm':
      return mm / 10;
    default:
      return mm;
  }
}

function roundUnit(value: number): number {
  if (value >= 100) return Math.round(value);
  if (value >= 10) return Math.round(value * 10) / 10;
  return Math.round(value * 100) / 100;
}

/** Human-readable reach in its stage's unit, e.g. `{ value: 23, unit: 'cm' }`. */
export function formatReach(reachMm: number): { value: number; unit: StageUnit; label: string } {
  const stage = getStageForReach(reachMm);
  const value = roundUnit(mmToUnit(reachMm, stage.unit));
  return { value, unit: stage.unit, label: `${value} ${stage.unit}` };
}

/**
 * Reach (mm) that opens each stage, keyed by stage index. Replaces the old
 * host-tier thresholds — a host's stage decides when it enters the pool.
 */
export const HOST_STAGE_REACH: Record<number, number> = Object.fromEntries(
  STAGES.map((stage) => [stage.index, stage.minMm]),
);
