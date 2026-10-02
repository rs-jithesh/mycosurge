export { createInitialState } from './state';
export type {
  GameState,
  CombatStats,
  Expedition,
  RadarContact,
  GamePhase,
  TutorialUpgrades,
} from './state';
export {
  getRecommendedPhase,
  getCheapestGeneratorCost,
  getCheapestExpandCost,
  GROWTH_PHASES,
} from './phase';
export type { GrowthPhase } from './phase';
export {
  tickIdle,
  tickAlertDecay,
  getEffectiveBiomassPerSec,
  getEffectiveMaxBiomass,
  isStarving,
  enterTrauma,
  getSkillLevelCost,
  canAffordSkill,
  getWaterPercent,
  getNutrientPercent,
  getCombatYieldMultiplier,
  expandWaterCap,
  expandNutrientCap,
  expandBiomassCap,
  getCapExpandCost,
  expandCap,
  getWaterExpandCount,
  getNutrientExpandCount,
  getBiomassExpandCount,
} from './math';
export type { CapResource } from './math';
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
  removeCollectedExpeditions,
  getActiveExpeditions,
} from './expeditions';
export { tickGenerators, purchaseGenerator } from './generators';
export { purchaseUpgrade, getUpgradeLevel } from './upgrades';
export {
  canManualAbsorb,
  manualAbsorb,
  tickManualCooldown,
  canManualSynthesize,
  getSynthesisYield,
  manualSynthesize,
} from './manual';
export type { SynthesisResult } from './manual';
export {
  TUTORIAL_HOST_ID,
  getUnlockedHosts,
  getRadarSlots,
  rollContact,
  pingSubstrate,
  scanContact,
  dismissContact,
  engageContact,
  clearActiveEncounter,
  getActiveStrain,
  tickRadar,
  resetRadarSeq,
} from './radar';
export {
  applyVictory,
  applyDefeat,
  calculateVictoryReward,
  previewCombatReward,
  getCombatDifficultyMultiplier,
} from './combat';
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
