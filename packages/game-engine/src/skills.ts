import {
  SKILL_NODES,
  GENOME_BASE_POINTS,
  GENOME_POINTS_PER_ECHO,
  RESPEC_BIOMASS_COST,
} from '@mycosurge/config';
import type { SkillNodeDef } from '@mycosurge/config';
import type { GameState } from './state';
import { getEffectiveMaxBiomass } from './math';
import { getEchoEffects } from './echoes';

const DEFAULT_POINT_COST = 1;

/** Genome points a single level of a mutation costs. */
export function getSkillPointCost(def: SkillNodeDef): number {
  return def.pointCost ?? DEFAULT_POINT_COST;
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

/** Total genome points the player can spend (base + echoes + echo bonuses). */
export function getTotalGenomePoints(state: GameState): number {
  const echoBonus = getEchoEffects(state.acquiredEchoes).genomePoints;
  return GENOME_BASE_POINTS + GENOME_POINTS_PER_ECHO * state.acquiredEchoes.length + echoBonus;
}

/** Genome points currently tied up in allocated mutation levels. */
export function getSpentGenomePoints(state: GameState): number {
  let spent = 0;
  for (const def of SKILL_NODES) {
    const level = state.skillAllocations[def.id] ?? 0;
    if (level > 0) spent += level * getSkillPointCost(def);
  }
  return spent;
}

/** Genome points still available to spend. */
export function getAvailableGenomePoints(state: GameState): number {
  return Math.max(0, getTotalGenomePoints(state) - getSpentGenomePoints(state));
}

/** Point cost of the next level of a mutation, or null when it is maxed. */
export function getNextCost(state: GameState, skillId: string): number | null {
  const def = getSkill(skillId);
  if (!def) return null;

  if (getCurrentLevel(state, skillId) >= def.maxLevel) return null;

  return getSkillPointCost(def);
}

export function arePrerequisitesMet(state: GameState, skillId: string): boolean {
  const def = getSkill(skillId);
  if (!def) return false;
  if (def.prerequisites.length === 0) return true;

  return def.prerequisites.every((preReqId) => {
    const preReq = getSkill(preReqId);
    if (!preReq) return false;
    return getCurrentLevel(state, preReqId) >= 1;
  });
}

export function purchaseSkill(state: GameState, skillId: string): boolean {
  const def = getSkill(skillId);
  if (!def) return false;

  const current = getCurrentLevel(state, skillId);
  if (current >= def.maxLevel) return false;

  if (!arePrerequisitesMet(state, skillId)) return false;

  const cost = getSkillPointCost(def);
  if (getAvailableGenomePoints(state) < cost) return false;

  state.skillAllocations[skillId] = current + 1;

  applySkillEffects(state, skillId);

  return true;
}

/** True when the player may respec: no active fight, not in trauma, points spent. */
export function canRespec(state: GameState): boolean {
  if (state.currentHostId) return false;
  if (state.isInTrauma) return false;
  return getSpentGenomePoints(state) > 0;
}

/** Biomass cost of the next respec (the first one is free). */
export function getRespecCost(state: GameState): number {
  return state.respecsUsed === 0 ? 0 : RESPEC_BIOMASS_COST;
}

/**
 * Clear every mutation, recompute all derived effects from the (now empty)
 * allocations, and clamp Biomass to the reduced max (Mycelial Expansion may
 * have been raising the cap). The first respec is free; later ones cost
 * `RESPEC_BIOMASS_COST`.
 */
export function respecSkills(state: GameState): boolean {
  if (!canRespec(state)) return false;

  const cost = getRespecCost(state);
  if (state.biomass < cost) return false;

  state.biomass -= cost;
  state.skillAllocations = {};
  state.respecsUsed += 1;

  recomputeSkillEffects(state);
  state.biomass = Math.min(state.biomass, getEffectiveMaxBiomass(state));

  return true;
}

/**
 * Pre-release migration: a save may have spent more genome points than the
 * current budget allows (or predate the point system entirely). When overspent,
 * clear all allocations without refund and recompute effects. Returns true when
 * the player's mutations were reset so the caller can surface a one-time toast.
 */
export function migrateSkillAllocations(state: GameState): boolean {
  if (getSpentGenomePoints(state) <= getTotalGenomePoints(state)) return false;

  state.skillAllocations = {};
  recomputeSkillEffects(state);
  state.biomass = Math.min(state.biomass, getEffectiveMaxBiomass(state));

  return true;
}

/** Reset every skill-derived stat to base, then re-apply the current allocations. */
function recomputeSkillEffects(state: GameState): void {
  state.combatStats.projectileSpeed = 1;
  state.combatStats.fireRate = 1;
  state.combatStats.projectileCount = 1;
  state.combatStats.piercing = false;
  state.combatStats.damage = 1;
  state.combatStats.chainReaction = false;
  state.combatStats.hitboxMultiplier = 1;
  state.combatStats.shieldHits = 0;
  state.combatStats.hpRegen = 0;
  state.combatStats.damageResistance = 0;
  state.combatStats.emergencyEvac = false;
  state.maxExpeditionSlots = 1;

  for (const def of SKILL_NODES) {
    if ((state.skillAllocations[def.id] ?? 0) > 0) applySkillEffects(state, def.id);
  }
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
    case 'extended_range':
      // Extra radar contact slot is read lazily by getRadarSlots(); no raw stat here.
      break;
    case 'nitrogen_fixation':
      // Passive Nutrients trickle is read lazily by getNutrientFixationBonus().
      break;
  }
}

export function getAvailableSkills(state: GameState): SkillNodeDef[] {
  return SKILL_NODES.filter((def) => getCurrentLevel(state, def.id) < def.maxLevel);
}

export function getPurchasableSkills(state: GameState): SkillNodeDef[] {
  const available = getAvailableGenomePoints(state);
  return getAvailableSkills(state).filter(
    (def) => arePrerequisitesMet(state, def.id) && available >= getSkillPointCost(def),
  );
}
