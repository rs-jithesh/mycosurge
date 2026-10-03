import { SKILL_NODES } from '@mycosurge/config';
import type { SkillNodeDef } from '@mycosurge/config';
import type { GameState } from './state';
import { getSkillLevelCost } from './math';
import { getEchoEffects } from './echoes';

function skillCostMultiplier(state: GameState): number {
  return getEchoEffects(state.acquiredEchoes).skillCostMult;
}

export function getAllSkills(): SkillNodeDef[] {
  return SKILL_NODES;
}

export function getSkill(id: string): SkillNodeDef | undefined {
  return SKILL_NODES.find((s) => s.id === id);
}

export function getCurrentLevel(state: GameState, skillId: string): number {
  return state.skillAllocations[skillId] ?? 0;
}

export function getNextCost(state: GameState, skillId: string): number | null {
  const def = getSkill(skillId);
  if (!def) return null;

  const current = getCurrentLevel(state, skillId);
  if (current >= def.maxLevel) return null;

  return getSkillLevelCost(def.baseCost, current, skillCostMultiplier(state));
}

export function arePrerequisitesMet(state: GameState, skillId: string): boolean {
  const def = getSkill(skillId);
  if (!def) return false;
  if (def.prerequisites.length === 0) return true;

  return def.prerequisites.every((preReqId) => {
    const preReq = getSkill(preReqId);
    if (!preReq) return false;
    const level = getCurrentLevel(state, preReqId);
    return level >= preReq.maxLevel;
  });
}

export function purchaseSkill(state: GameState, skillId: string): boolean {
  const def = getSkill(skillId);
  if (!def) return false;

  const current = getCurrentLevel(state, skillId);
  if (current >= def.maxLevel) return false;

  if (!arePrerequisitesMet(state, skillId)) return false;

  const cost = getSkillLevelCost(def.baseCost, current, skillCostMultiplier(state));
  if (state.biomass < cost) return false;

  state.biomass -= cost;
  state.skillAllocations[skillId] = current + 1;

  applySkillEffects(state, skillId);

  return true;
}

function applySkillEffects(state: GameState, skillId: string): void {
  const level = state.skillAllocations[skillId] ?? 0;

  switch (skillId) {
    case 'spore_speed':
      state.combatStats.projectileSpeed = 1 + level * 0.1;
      break;
    case 'fire_rate':
      state.combatStats.fireRate = 1 + level * 0.15;
      break;
    case 'multi_shot':
      state.combatStats.projectileCount = 1 + level;
      break;
    case 'piercing_shot':
      state.combatStats.piercing = true;
      break;
    case 'overcharge':
      state.combatStats.damage = 1 + level * 0.2;
      break;
    case 'chain_reaction':
      state.combatStats.chainReaction = true;
      break;
    case 'compact_core':
      state.combatStats.hitboxMultiplier = 1 - level * 0.1;
      break;
    case 'spore_shield':
      state.combatStats.shieldHits = level;
      break;
    case 'trauma_recovery':
      break;
    case 'regenerative_spores':
      state.combatStats.hpRegen = level * 0.5;
      break;
    case 'adaptive_membrane':
      state.combatStats.damageResistance = level * 0.15;
      break;
    case 'emergency_evac':
      state.combatStats.emergencyEvac = true;
      break;
    case 'mycelial_expansion':
      // Cap bonus is applied via getMaxBiomassBonus(); no raw mutation here.
      break;
    case 'metabolic_efficiency':
      break;
    case 'rapid_scouts':
      break;
    case 'resource_routing':
      break;
    case 'dormant_spores':
      break;
    case 'overmind':
      state.maxExpeditionSlots = 2;
      break;
  }
}

export function getAvailableSkills(state: GameState): SkillNodeDef[] {
  return SKILL_NODES.filter((def) => {
    const current = getCurrentLevel(state, def.id);
    return current < def.maxLevel;
  });
}

export function getPurchasableSkills(state: GameState): SkillNodeDef[] {
  return getAvailableSkills(state).filter(
    (def) =>
      arePrerequisitesMet(state, def.id) &&
      state.biomass >=
        getSkillLevelCost(def.baseCost, getCurrentLevel(state, def.id), skillCostMultiplier(state)),
  );
}
