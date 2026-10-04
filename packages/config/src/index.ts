export { SKILL_TREES, SKILL_NODES, SKILL_TREE_ORDER } from './skill-trees';
export type { SkillTree, SkillNodeDef } from './skill-trees';

export { HOSTS, HOST_TIER_REACH, isHostUnlocked } from './hosts';
export type { HostDef, HostAiDef, Mobility } from './hosts';

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
  LYSATE_CAP_EXPAND_COST_BASE,
  LYSATE_CAP_EXPAND_AMOUNT,
  LYSATE_CAP_COST_SCALE,
} from './generators';
export type { GeneratorDef } from './generators';

export * from './constants';

export { EXPANSION_MAP } from './expansion-map';
export type { ExpansionMapTuning } from './expansion-map';

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
