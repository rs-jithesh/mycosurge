export { createInitialState } from './state';
export type {
  GameState,
  CombatStats,
  Expedition,
  RadarContact,
  GamePhase,
  TutorialUpgrades,
  AdvisorMemory,
  AdvisorState,
} from './state';
export {
  getRecommendedPhase,
  getCheapestGeneratorCost,
  getCheapestExpandCost,
  GROWTH_PHASES,
} from './phase';
export type { GrowthPhase } from './phase';
export {
  evaluateAdvisor,
  observePlayerChoice,
  observePlayerAction,
  recordHostEngaged,
  recordCombatOutcome,
  getAdvisorMaturity,
  getAdvisorEvent,
  applyCurve,
  considerationsForPhase,
} from './advisor';
export type { AdvisorResult, AdvisorCandidate, AdvisorContribution, AdvisorEvent } from './advisor';
export type { AdvisorMaturity, AdvisorPhase } from '@mycosurge/config';
export { getSystemUnlocks } from './systems';
export type { SystemId, SystemUnlocks } from './systems';
export {
  tickIdle,
  tickAlertDecay,
  getEffectiveBiomassPerSec,
  getEffectiveMaxBiomass,
  addBiomass,
  isStarving,
  enterTrauma,
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
  getNutrientFixationBonus,
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
  getSkillPointCost,
  getTotalGenomePoints,
  getSpentGenomePoints,
  getAvailableGenomePoints,
  canRespec,
  getRespecCost,
  respecSkills,
  migrateSkillAllocations,
} from './skills';
export {
  startExpedition,
  tickExpeditions,
  collectExpedition,
  removeCollectedExpeditions,
  getActiveExpeditions,
} from './expeditions';
export { tickGenerators, purchaseGenerator } from './generators';
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
  ensureUniqueContactIds,
  spawnBlip,
} from './radar';
export { getReachCost, getReachBand, getNextReachTier, canExtendReach, extendReach } from './reach';
export type { ReachResult } from './reach';
export {
  generateNetwork,
  generateHostPlacements,
  getHostVisibility,
  getFirstContact,
  catalogueHost,
  isCatalogued,
  getDefaultCordBranch,
  getCordCost,
  canBuildCord,
  buildCord,
  mulberry32,
} from './network';
export type { NetworkSegment, NetworkGeometry, HostPlacement, HostVisibility } from './network';
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
  getTutorialReserveCap,
  TUTORIAL_RESERVE_CAP,
} from './tutorial';
