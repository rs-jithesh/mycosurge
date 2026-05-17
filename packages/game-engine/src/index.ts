export { createInitialState } from './state';
export type { GameState, CombatStats, Expedition, GamePhase, TutorialUpgrades } from './state';
export {
  tickIdle,
  tickAlertDecay,
  getEffectiveBiomassPerSec,
  getEffectiveMaxBiomass,
  enterTrauma,
  getSkillLevelCost,
  canAffordSkill,
  getWaterPercent,
  getNutrientPercent,
  getCombatYieldMultiplier,
  expandWaterCap,
  expandNutrientCap,
  expandBiomassCap,
  getWaterExpandCount,
  getNutrientExpandCount,
  getBiomassExpandCount,
} from './math';
export {
  purchaseSkill,
  getAllSkills,
  getSkill,
  getCurrentLevel,
  getNextCost,
  arePrerequisitesMet,
  getAvailableSkills,
  getPurchasableSkills,
} from './skills';
export {
  startExpedition,
  tickExpeditions,
  collectExpedition,
  cleanCompletedExpeditions,
  getActiveExpeditions,
} from './expeditions';
export { tickGenerators, purchaseGenerator } from './generators';
export { purchaseUpgrade, getUpgradeLevel } from './upgrades';
export { applyVictory, applyDefeat, getCombatDifficultyMultiplier } from './combat';
export type { CombatResult } from './combat';
export {
  absorbResources,
  synthesizeBiomass,
  purchaseTutorialUpgrade,
  extendHyphae,
  tutorialTick,
  completeTutorial,
  resetAbsorbCount,
  applyTutorialDefeat,
  getTutorialShockMultiplier,
} from './tutorial';
