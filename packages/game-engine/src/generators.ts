import { GENERATORS, getGeneratorCost } from '@mycosurge/config';
import type { GameState } from './state';

export function tickGenerators(state: GameState, deltaSec: number): void {
  for (const def of GENERATORS) {
    const level = state.generators[def.id] ?? 0;
    if (level <= 0) continue;

    const production = def.baseRate * level * deltaSec;

    if (def.resource === 'water') {
      state.water = Math.min(state.waterCap, state.water + production);
    } else {
      state.nutrients = Math.min(state.nutrientsCap, state.nutrients + production);
    }
  }
}

export function purchaseGenerator(state: GameState, generatorId: string): boolean {
  const def = GENERATORS.find((g) => g.id === generatorId);
  if (!def) return false;

  const currentLevel = state.generators[generatorId] ?? 0;
  if (currentLevel >= def.maxLevel) return false;

  const cost = getGeneratorCost(def.baseCost, currentLevel, def.costScale);
  if (state.biomass < cost) return false;

  state.biomass -= cost;
  state.generators[generatorId] = currentLevel + 1;
  return true;
}
