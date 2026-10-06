export type GeneratorResource = 'water' | 'nutrients' | 'biomass';

export interface GeneratorDef {
  id: string;
  name: string;
  description: string;
  baseRate: number;
  baseCost: number;
  costScale: number;
  maxLevel: number;
  resource: GeneratorResource;
  /**
   * Converter generators also drain these pools per second per level, turning them into
   * `resource`. The drain is capped by what's available (see `tickIdle`).
   */
  consumes?: { water?: number; nutrients?: number };
  /** Resource spent to build/upgrade it. Defaults to Biomass. */
  costResource?: 'biomass' | 'lysate';
  /** When true, it only unlocks once the network has won its first fight (Lysate exists). */
  requiresVictory?: boolean;
}

export const GENERATORS: GeneratorDef[] = [
  {
    id: 'osmotic_pump',
    name: 'Osmotic Pump',
    description: 'Passive water intake from substrate.',
    baseRate: 1,
    baseCost: 5,
    costScale: 1.5,
    maxLevel: 10,
    resource: 'water',
  },
  {
    id: 'enzymatic_exudates',
    name: 'Enzymatic Exudates',
    description: 'Passive nutrient absorption from organic matter.',
    baseRate: 1,
    baseCost: 5,
    costScale: 1.5,
    maxLevel: 10,
    resource: 'nutrients',
  },
  {
    id: 'biosynthesis',
    name: 'Biosynthesis',
    description: 'Assimilates Water and Nutrients into Biomass on its own.',
    baseRate: 0.1,
    /** Priced in Lysate: combat funds automation. */
    baseCost: 4,
    costScale: 1.5,
    maxLevel: 10,
    resource: 'biomass',
    consumes: { water: 0.5, nutrients: 0.5 },
    costResource: 'lysate',
    requiresVictory: true,
  },
];

export function getGeneratorCost(baseCost: number, currentLevel: number, costScale = 1.5): number {
  return Math.floor(baseCost * Math.pow(costScale, currentLevel));
}

// Cheap, gently rising cap upgrades: the first several cost a few Lysate each.
export const LYSATE_CAP_EXPAND_COST_BASE = 3;
export const LYSATE_CAP_COST_SCALE = 1.3;
/** The first expansion adds this much cap; each one after adds ~10% more. */
export const LYSATE_CAP_EXPAND_BASE = 50;
export const LYSATE_CAP_EXPAND_SCALE = 1.1;

export function getLysateCapExpandCost(expansionCount: number): number {
  return Math.floor(LYSATE_CAP_EXPAND_COST_BASE * Math.pow(LYSATE_CAP_COST_SCALE, expansionCount));
}

/** Cap added by the next expansion, given how many have already been bought. */
export function getLysateCapExpandAmount(expansionCount: number): number {
  return Math.round(LYSATE_CAP_EXPAND_BASE * Math.pow(LYSATE_CAP_EXPAND_SCALE, expansionCount));
}
