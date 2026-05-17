import { UPGRADES } from '@mycosurge/config';
import type { GameState } from './state';
import { getSkillLevelCost } from './math';

export function purchaseUpgrade(state: GameState, upgradeId: string): boolean {
  const def = UPGRADES.find((u) => u.id === upgradeId);
  if (!def) return false;

  const currentLevel = state.upgradeLevels[upgradeId] ?? 0;
  if (currentLevel >= def.maxLevel) return false;

  for (const prereqId of def.prereqs) {
    const prereqLevel = state.upgradeLevels[prereqId] ?? 0;
    if (prereqLevel < 1) return false;
  }

  const cost = getSkillLevelCost(def.baseCost, currentLevel);
  if (state.biomass < cost) return false;

  state.biomass -= cost;
  state.upgradeLevels[upgradeId] = currentLevel + 1;
  return true;
}

export function getUpgradeLevel(state: GameState, upgradeId: string): number {
  return state.upgradeLevels[upgradeId] ?? 0;
}
