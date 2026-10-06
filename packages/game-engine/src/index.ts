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
  getSectorAdvice,
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
  getFarmPool,
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
export { getReachCost, getReachBand, getNextReachTier } from './reach';
export {
  canExtendReach,
  extendReach,
  growSector,
  growEvenly,
  getSectorDepths,
  getMaxReach,
  getCoverage,
  getGrowCost,
  getEvenCost,
  getGrowStepMm,
  getEvenStepMm,
  canGrowSector,
  canGrowEvenly,
  sectorCentres,
  sectorIndexForAngle,
} from './sectors';
export type { ReachResult, SectorGrowResult } from './sectors';
export { getNodeMarkers, claimReachedNodes, describeReward } from './nodes';
export type { NodeMarker } from './nodes';
export {
  generateNetwork,
  generateHostPlacements,
  getHostVisibility,
  getFirstContact,
  getContactMarkers,
  catalogueHost,
  isCatalogued,
  getDefaultCordBranch,
  getCordCost,
  canBuildCord,
  buildCord,
  mulberry32,
} from './network';
export type {
  NetworkSegment,
  NetworkGeometry,
  HostPlacement,
  HostVisibility,
  ContactMarker,
} from './network';
export {
  applyVictory,
  applyDefeat,
  calculateVictoryReward,
  previewCombatReward,
  getCombatDifficultyMultiplier,
  getEffectiveCombatStats,
} from './combat';
export type { CombatResult } from './combat';
export { applyOfflineProgress, getOfflineRate } from './offline';
export type { OfflineReport } from './offline';
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
  nutrientsUnlocked,
  TUTORIAL_RESERVE_CAP,
  TUTORIAL_ABSORB_WATER,
  TUTORIAL_ABSORB_NUTRIENTS,
  TUTORIAL_GROW_WATER_COST,
  TUTORIAL_GROW_NUTRIENT_COST,
  TUTORIAL_GENERATOR_WATER_COST,
  TUTORIAL_GENERATOR2_WATER_COST,
  TUTORIAL_GENERATOR2_NUTRIENT_COST,
  TUTORIAL_REACH_TARGET,
  TUTORIAL_SYNTH_WATER_COST,
  TUTORIAL_SYNTH_NUTRIENT_COST,
} from './tutorial';
export {
  HOOK_OBJECTIVES,
  getNextHookObjective,
  getHookProgress,
  tutorialGeneratorCount,
  isSignalSensed,
  SENSE_REACH_THRESHOLD,
  SENSE_REACH_RESOLVE,
} from './hook';
export type { HookObjective, HookObjectiveId, HookProgress } from './hook';
