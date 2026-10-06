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

export const LYSATE_CAP_EXPAND_COST_BASE = 10;
export const LYSATE_CAP_EXPAND_AMOUNT = 10;
export const LYSATE_CAP_COST_SCALE = 1.5;

export function getLysateCapExpandCost(expansionCount: number): number {
  return Math.floor(LYSATE_CAP_EXPAND_COST_BASE * Math.pow(LYSATE_CAP_COST_SCALE, expansionCount));
}
