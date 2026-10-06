import { GENERATORS, getGeneratorCost } from '@mycosurge/config';
import type { GeneratorDef } from '@mycosurge/config';
import type { GameState } from './state';

export function tickGenerators(state: GameState, deltaSec: number): void {
  for (const def of GENERATORS) {
    const level = state.generators[def.id] ?? 0;
    if (level <= 0) continue;

    const production = def.baseRate * level * deltaSec;

    if (def.resource === 'water') {
      state.water = Math.min(state.waterCap, state.water + production);
    } else if (def.resource === 'nutrients') {
      state.nutrients = Math.min(state.nutrientsCap, state.nutrients + production);
    }
    // Biomass converters are applied in `tickIdle` — they consume water/nutrients too.
  }
}

/** Some generators only unlock once the network has earned Lysate (i.e. won a fight). */
export function isGeneratorUnlocked(state: GameState, def: GeneratorDef): boolean {
  if (def.requiresVictory && state.lysateEarned <= 0) return false;
  return true;
}

export function purchaseGenerator(state: GameState, generatorId: string): boolean {
  const def = GENERATORS.find((g) => g.id === generatorId);
  if (!def || !isGeneratorUnlocked(state, def)) return false;

  const currentLevel = state.generators[generatorId] ?? 0;
  if (currentLevel >= def.maxLevel) return false;

  const cost = getGeneratorCost(def.baseCost, currentLevel, def.costScale);
  const wallet = def.costResource === 'lysate' ? state.lysateBanked : state.biomass;
  if (wallet < cost) return false;

  if (def.costResource === 'lysate') {
    state.lysateBanked -= cost;
  } else {
    state.biomass -= cost;
  }
  state.generators[generatorId] = currentLevel + 1;
  return true;
}
