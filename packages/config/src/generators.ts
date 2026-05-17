export interface GeneratorDef {
  id: string;
  name: string;
  description: string;
  baseRate: number;
  baseCost: number;
  costScale: number;
  maxLevel: number;
  resource: 'water' | 'nutrients';
}

export const GENERATORS: GeneratorDef[] = [
  {
    id: 'osmotic_pump',
    name: 'Osmotic Pump',
    description: 'Passive water intake from substrate.',
    baseRate: 1,
    baseCost: 5,
    costScale: 2,
    maxLevel: 10,
    resource: 'water',
  },
  {
    id: 'enzymatic_exudates',
    name: 'Enzymatic Exudates',
    description: 'Passive nutrient absorption from organic matter.',
    baseRate: 1,
    baseCost: 5,
    costScale: 2,
    maxLevel: 10,
    resource: 'nutrients',
  },
];

export function getGeneratorCost(baseCost: number, currentLevel: number): number {
  return Math.floor(baseCost * Math.pow(1.5, currentLevel));
}

export const LYSATE_CAP_EXPAND_COST_BASE = 10;
export const LYSATE_CAP_EXPAND_AMOUNT = 10;
export const LYSATE_CAP_COST_SCALE = 1.5;

export function getLysateCapExpandCost(expansionCount: number): number {
  return Math.floor(LYSATE_CAP_EXPAND_COST_BASE * Math.pow(LYSATE_CAP_COST_SCALE, expansionCount));
}
