export { SKILL_TREES, SKILL_NODES, SKILL_TREE_ORDER } from './skill-trees';
export type { SkillTree, SkillNodeDef } from './skill-trees';

export { HOSTS, TUTORIAL_HOST_ID, isHostUnlocked } from './hosts';
export type { HostDef, HostAiDef, HostTrait, Mobility } from './hosts';

export {
  STAGES,
  STAGE_BY_INDEX,
  FIRST_STAGE_INDEX,
  LAST_STAGE_INDEX,
  STEPS_PER_STAGE,
  HOST_STAGE_REACH,
  getStageForReach,
  getStageByIndex,
  getStageBandWidth,
  getStageGrowMm,
  mmToUnit,
  formatReach,
} from './stages';
export type { StageDef, StageUnit } from './stages';

export { STRAINS, getStrain, NORMAL_STRAIN_ID } from './strains';
export type { StrainDef, StrainId } from './strains';

export {
  RESOURCES,
  resourceName,
  resourceSymbol,
  resourceLabel,
  resourceAmount,
} from './resources';
export type { ResourceId, ResourceTone, ResourceMeta, ResourceLabelStyle } from './resources';

export {
  GENERATORS,
  getGeneratorCost,
  getLysateCapExpandCost,
  getLysateCapExpandAmount,
  LYSATE_CAP_EXPAND_COST_BASE,
  LYSATE_CAP_EXPAND_BASE,
  LYSATE_CAP_EXPAND_SCALE,
  LYSATE_CAP_COST_SCALE,
} from './generators';
export type { GeneratorDef } from './generators';

export * from './constants';

export { EXPANSION_MAP } from './expansion-map';
export type { ExpansionMapTuning } from './expansion-map';

export { EXPANSION_NODES } from './expansion-nodes';
export type { ExpansionNodeDef, NodeReward } from './expansion-nodes';

export { ADVISOR_ACTIONS, ADVISOR_EMERGENCY, ADVISOR_TUNING } from './advisor';
export type {
  AdvisorActionDef,
  AdvisorInputId,
  AdvisorMaturity,
  AdvisorPhase,
  ConsiderationDef,
  CurveDef,
  EmergencyDef,
  EmergencyReasonId,
} from './advisor';
