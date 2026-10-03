import {
  ALERT_INCREASE_RATE,
  ALERT_DECAY_RATE,
  ALERT_EFFECT_CAP,
  DEPLETION_RATE_PER_ASSIM,
  MAX_BIOMASS_BASE,
  MAX_WATER_BASE,
  MAX_NUTRIENT_BASE,
  WATER_DEPLETION_RATE,
  NUTRIENT_DEPLETION_RATE,
  WATER_YIELD_THRESHOLD,
  NUTRIENT_YIELD_THRESHOLD,
  STARVATION_THRESHOLD,
  STARVATION_STATE_THRESHOLD,
  LYSATE_RAW_DECAY_RATE,
  LYSATE_MAX_STABILIZE_RATE,
  LYSATE_STABILIZE_WATER_COST,
  LYSATE_STABILIZE_NUTRIENT_COST,
  LYSATE_CAP_EXPAND_AMOUNT,
  SKILL_COST_SCALE,
  TRAUMA_BASE_DURATION,
  UPKEEP_PER_LEVEL,
  UPKEEP_PER_ECHO,
  UPKEEP_PER_EXPANSION,
  GENERATORS,
  getLysateCapExpandCost,
} from '@mycosurge/config';
import type { GameState } from './state';
import { tickGenerators } from './generators';
import { getEchoEffects } from './echoes';

export function getAlertMultiplier(alertLevel: number): number {
  return 1 - (alertLevel / 100) * ALERT_EFFECT_CAP;
}

export function getDepletionMultiplier(assimilationPercent: number): number {
  return Math.max(0.1, 1 - assimilationPercent * DEPLETION_RATE_PER_ASSIM);
}

/**
 * Combined passive-Biomass efficiency from ecological strain and alert level (0–1).
 * `1` means no drag; lower means the network is running below its raw capacity.
 */
export function getEcologicalEfficiency(state: GameState): number {
  return getAlertMultiplier(state.alertLevel) * getDepletionMultiplier(state.assimilationPercent);
}

export function getProliferationBonus(allocations: Record<string, number>): number {
  const level = allocations['metabolic_efficiency'] ?? 0;
  return level * 0.25;
}

export function getMaxBiomassBonus(allocations: Record<string, number>): number {
  const level = allocations['mycelial_expansion'] ?? 0;
  return level * 0.75;
}

export function getExpeditionTimeBonus(allocations: Record<string, number>): number {
  const level = allocations['rapid_scouts'] ?? 0;
  return level * 0.2;
}

export function getExpeditionRewardBonus(allocations: Record<string, number>): number {
  const level = allocations['resource_routing'] ?? 0;
  return level * 0.3;
}

export function getTraumaReduction(allocations: Record<string, number>): number {
  const level = allocations['trauma_recovery'] ?? 0;
  return level * 0.15;
}

export function getEffectiveMaxBiomass(state: GameState): number {
  const bonus = getMaxBiomassBonus(state.skillAllocations);
  return state.maxBiomass * (1 + bonus);
}

/** True when either reserve is below the starvation-state threshold. */
export function isStarving(state: GameState): boolean {
  const waterRatio = state.waterCap > 0 ? state.water / state.waterCap : 1;
  const nutrientRatio = state.nutrientsCap > 0 ? state.nutrients / state.nutrientsCap : 1;
  return waterRatio < STARVATION_STATE_THRESHOLD || nutrientRatio < STARVATION_STATE_THRESHOLD;
}

export function getEffectiveBiomassPerSec(state: GameState): number {
  if (state.isInTrauma) return 0;
  // Starvation halts passive growth in the full game (the tutorial manages its own economy).
  if (state.gamePhase === 'active' && isStarving(state)) return 0;

  const alertMult = getAlertMultiplier(state.alertLevel);
  const depletionMult = getDepletionMultiplier(state.assimilationPercent);
  const skillBonus = getProliferationBonus(state.skillAllocations);
  const echoBonus = getEchoEffects(state.acquiredEchoes).biomassMult;

  return state.baseBiomassPerSec * alertMult * depletionMult * (1 + skillBonus + echoBonus);
}

export function getWaterPercent(state: GameState): number {
  return Math.min(100, (state.water / state.waterCap) * 100);
}

export function getNutrientPercent(state: GameState): number {
  return Math.min(100, (state.nutrients / state.nutrientsCap) * 100);
}

export function getCombatYieldMultiplier(state: GameState): number {
  const waterRatio = state.waterCap > 0 ? state.water / state.waterCap : 0;
  const nutrientRatio = state.nutrientsCap > 0 ? state.nutrients / state.nutrientsCap : 0;

  if (waterRatio < STARVATION_THRESHOLD || nutrientRatio < STARVATION_THRESHOLD) {
    return 0;
  }

  const waterOK = waterRatio >= WATER_YIELD_THRESHOLD;
  const nutrientOK = nutrientRatio >= NUTRIENT_YIELD_THRESHOLD;

  if (waterOK && nutrientOK) return 1;
  if (!waterOK && !nutrientOK) return 0.15;

  return 0.5;
}

export function getWaterExpandCount(state: GameState): number {
  return Math.max(0, (state.waterCap - MAX_WATER_BASE) / LYSATE_CAP_EXPAND_AMOUNT);
}

export function getNutrientExpandCount(state: GameState): number {
  return Math.max(0, (state.nutrientsCap - MAX_NUTRIENT_BASE) / LYSATE_CAP_EXPAND_AMOUNT);
}

export function getBiomassExpandCount(state: GameState): number {
  return Math.max(0, (state.maxBiomass - MAX_BIOMASS_BASE) / LYSATE_CAP_EXPAND_AMOUNT);
}

export type PoolResource = 'water' | 'nutrients';

/** Total capacity expansions bought across all three pools. */
export function getCapExpansionTotal(state: GameState): number {
  return getWaterExpandCount(state) + getNutrientExpandCount(state) + getBiomassExpandCount(state);
}

/**
 * Continuous metabolic drain on a pool, scaling with network complexity. Charged
 * only in the full game so the tutorial economy is unaffected.
 */
export function getUpkeepRate(state: GameState, resource: PoolResource): number {
  if (state.gamePhase !== 'active') return 0;
  const def = GENERATORS.find((g) => g.resource === resource);
  const level = def ? (state.generators[def.id] ?? 0) : 0;
  return (
    UPKEEP_PER_LEVEL * level +
    UPKEEP_PER_ECHO * state.acquiredEchoes.length +
    UPKEEP_PER_EXPANSION * getCapExpansionTotal(state)
  );
}

/** Passive production from a pool's generator, before drain. */
export function getResourceProduction(state: GameState, resource: PoolResource): number {
  const def = GENERATORS.find((g) => g.resource === resource);
  if (!def) return 0;
  const level = state.generators[def.id] ?? 0;
  return def.baseRate * level;
}

/** Total drain on a pool: the baseline depletion plus metabolic upkeep. */
export function getResourceDrain(state: GameState, resource: PoolResource): number {
  const base = resource === 'water' ? WATER_DEPLETION_RATE : NUTRIENT_DEPLETION_RATE;
  return base + getUpkeepRate(state, resource);
}

/** Net flow for a pool (production − drain); negative means it is being drawn down. */
export function getNetResourceRate(state: GameState, resource: PoolResource): number {
  return getResourceProduction(state, resource) - getResourceDrain(state, resource);
}

export function expandWaterCap(state: GameState): boolean {
  const count = getWaterExpandCount(state);
  const cost = getLysateCapExpandCost(count);
  if (state.lysateBanked < cost) return false;
  state.lysateBanked -= cost;
  state.waterCap += LYSATE_CAP_EXPAND_AMOUNT;
  return true;
}

export function expandNutrientCap(state: GameState): boolean {
  const count = getNutrientExpandCount(state);
  const cost = getLysateCapExpandCost(count);
  if (state.lysateBanked < cost) return false;
  state.lysateBanked -= cost;
  state.nutrientsCap += LYSATE_CAP_EXPAND_AMOUNT;
  return true;
}

export function expandBiomassCap(state: GameState): boolean {
  const count = getBiomassExpandCount(state);
  const cost = getLysateCapExpandCost(count);
  if (state.lysateBanked < cost) return false;
  state.lysateBanked -= cost;
  state.maxBiomass += LYSATE_CAP_EXPAND_AMOUNT;
  return true;
}

export type CapResource = 'water' | 'nutrients' | 'biomass';

export function getCapExpandCost(state: GameState, resource: CapResource): number {
  const count =
    resource === 'water'
      ? getWaterExpandCount(state)
      : resource === 'nutrients'
        ? getNutrientExpandCount(state)
        : getBiomassExpandCount(state);
  return getLysateCapExpandCost(count);
}

export function expandCap(state: GameState, resource: CapResource): boolean {
  switch (resource) {
    case 'water':
      return expandWaterCap(state);
    case 'nutrients':
      return expandNutrientCap(state);
    case 'biomass':
      return expandBiomassCap(state);
  }
}

function tickLysate(state: GameState, deltaSec: number): void {
  if (state.lysateRaw <= 0) return;

  const desired = Math.min(state.lysateRaw, LYSATE_MAX_STABILIZE_RATE * deltaSec);
  const affordableByWater = state.water / LYSATE_STABILIZE_WATER_COST;
  const affordableByNutrient = state.nutrients / LYSATE_STABILIZE_NUTRIENT_COST;

  if (desired > 0 && affordableByWater >= desired && affordableByNutrient >= desired) {
    state.water = Math.max(0, state.water - desired * LYSATE_STABILIZE_WATER_COST);
    state.nutrients = Math.max(0, state.nutrients - desired * LYSATE_STABILIZE_NUTRIENT_COST);
    state.lysateRaw -= desired;
    state.lysateBanked += desired;
  } else {
    const decay = Math.min(state.lysateRaw, LYSATE_RAW_DECAY_RATE * deltaSec);
    state.lysateRaw = Math.max(0, state.lysateRaw - decay);
  }
}

export function tickIdle(state: GameState, deltaSec: number): void {
  if (state.isInTrauma) {
    state.traumaTimer -= deltaSec;
    if (state.traumaTimer <= 0) {
      state.traumaTimer = 0;
      state.isInTrauma = false;
    }
    return;
  }

  state.water = Math.max(0, state.water - getResourceDrain(state, 'water') * deltaSec);
  state.nutrients = Math.max(0, state.nutrients - getResourceDrain(state, 'nutrients') * deltaSec);

  tickGenerators(state, deltaSec);
  tickLysate(state, deltaSec);

  const maxBiomass = getEffectiveMaxBiomass(state);
  const perSec = getEffectiveBiomassPerSec(state);
  const gained = perSec * deltaSec;

  state.biomass = Math.min(state.biomass + gained, Math.max(state.biomass, maxBiomass));
  state.totalBiomassEarned += gained;

  if (state.assimilationPercent > 0 && !state.isInTrauma) {
    state.alertLevel = Math.min(100, state.alertLevel + ALERT_INCREASE_RATE * deltaSec);
  }
}

export function tickAlertDecay(state: GameState, deltaSec: number): void {
  state.alertLevel = Math.max(0, state.alertLevel - ALERT_DECAY_RATE * deltaSec);
}

export function applyDepletion(state: GameState, assimilationDelta: number): void {
  state.assimilationPercent = Math.min(100, state.assimilationPercent + assimilationDelta);
}

export function enterTrauma(state: GameState): void {
  if (state.isInTrauma) return;
  const reduction = getTraumaReduction(state.skillAllocations);
  const duration = TRAUMA_BASE_DURATION * (1 - reduction);

  state.isInTrauma = true;
  state.traumaTimer = Math.max(5, duration);
  state.combatStats.hp = state.combatStats.maxHp;
  state.combatStats.shieldHits = 0;
}

export function getSkillLevelCost(baseCost: number, currentLevel: number, costMult = 1): number {
  return Math.floor(baseCost * Math.pow(SKILL_COST_SCALE, currentLevel) * costMult);
}

export function canAffordSkill(
  biomass: number,
  baseCost: number,
  currentLevel: number,
  costMult = 1,
): boolean {
  return biomass >= getSkillLevelCost(baseCost, currentLevel, costMult);
}
