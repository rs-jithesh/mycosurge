export type ManualUpgradeId = 'absorption_depth' | 'assimilation_yield';

export interface ManualUpgradeDef {
  id: ManualUpgradeId;
  name: string;
  description: string;
  maxLevel: number;
  /** First-level price; both scale with `costScale`. */
  baseLysate: number;
  baseBiomass: number;
  costScale: number;
  /** Extra Water + Nutrients per Absorb, per level. */
  absorbPerLevel?: number;
  /** Extra Biomass per synthesis, per level. */
  yieldPerLevel?: number;
}

export const MANUAL_UPGRADES: ManualUpgradeDef[] = [
  {
    id: 'absorption_depth',
    name: 'Absorption Depth',
    description: 'Each Absorb draws more Water and Nutrients.',
    maxLevel: 8,
    baseLysate: 2,
    baseBiomass: 20,
    costScale: 1.6,
    absorbPerLevel: 1,
  },
  {
    id: 'assimilation_yield',
    name: 'Assimilation Yield',
    description: 'Each synthesis forms more Biomass.',
    maxLevel: 6,
    baseLysate: 3,
    baseBiomass: 30,
    costScale: 1.7,
    yieldPerLevel: 0.25,
  },
];

export function getManualUpgrade(id: ManualUpgradeId): ManualUpgradeDef | undefined {
  return MANUAL_UPGRADES.find((u) => u.id === id);
}

/** Price of the next level (both currencies scale with the level). */
export function getManualUpgradeCost(
  def: ManualUpgradeDef,
  level: number,
): { lysate: number; biomass: number } {
  const scale = Math.pow(def.costScale, level);
  return {
    lysate: Math.floor(def.baseLysate * scale),
    biomass: Math.floor(def.baseBiomass * scale),
  };
}
