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
export { getSystemUnlocks } from './systems';
export type { SystemId, SystemUnlocks } from './systems';
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
  getCapExpansionTotal,
  getUpkeepRate,
  getResourceProduction,
  getResourceDrain,
  getNetResourceRate,
  getEcologicalEfficiency,
} from './math';
export type { CapResource, PoolResource } from './math';
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
export { getEchoEffects, getEffectiveCombatStats, getEchoName, getEchoDescription } from './echoes';
export type { EchoEffects } from './echoes';
export { applyOfflineProgress, getOfflineRate } from './offline';
export type { OfflineReport } from './offline';
export type { CombatResult } from './combat';
export {
  resolveAiProfile,
  createAgent,
  updateAiState,
  steer,
  computeDodgeForce,
  stepAgent,
  leadAim,
  shouldFire,
} from './combat-ai';
export type {
  AiProfile,
  AiState,
  AiModifiers,
  Agent,
  SteeringWorld,
  ProjectileThreat,
  Rng,
  Vec2,
  Mobility,
} from './combat-ai';
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
