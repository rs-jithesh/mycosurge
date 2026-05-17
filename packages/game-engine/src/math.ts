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
  LYSATE_RAW_DECAY_RATE,
  LYSATE_MAX_STABILIZE_RATE,
  LYSATE_STABILIZE_WATER_COST,
  LYSATE_STABILIZE_NUTRIENT_COST,
  LYSATE_CAP_EXPAND_AMOUNT,
  getLysateCapExpandCost,
} from '@mycosurge/config';
import type { GameState } from './state';
import { tickGenerators } from './generators';

export function getAlertMultiplier(alertLevel: number): number {
  return 1 - (alertLevel / 100) * ALERT_EFFECT_CAP;
}

export function getDepletionMultiplier(assimilationPercent: number): number {
  return Math.max(0.1, 1 - assimilationPercent * DEPLETION_RATE_PER_ASSIM);
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
  return MAX_BIOMASS_BASE * (1 + bonus);
}

export function getEffectiveBiomassPerSec(state: GameState): number {
  if (state.isInTrauma) return 0;

  const alertMult = getAlertMultiplier(state.alertLevel);
  const depletionMult = getDepletionMultiplier(state.assimilationPercent);
  const skillBonus = getProliferationBonus(state.skillAllocations);

  return state.baseBiomassPerSec * alertMult * depletionMult * (1 + skillBonus);
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

function tickLysate(state: GameState, deltaSec: number): void {
  if (state.lysateRaw <= 0) return;

  const stabilizeAmount = Math.min(
    state.lysateRaw,
    LYSATE_MAX_STABILIZE_RATE * deltaSec,
    state.water / (LYSATE_STABILIZE_WATER_COST * deltaSec) || 0,
    state.nutrients / (LYSATE_STABILIZE_NUTRIENT_COST * deltaSec) || 0,
  );

  if (stabilizeAmount >= 1) {
    const waterCost = stabilizeAmount * LYSATE_STABILIZE_WATER_COST * deltaSec;
    const nutrientCost = stabilizeAmount * LYSATE_STABILIZE_NUTRIENT_COST * deltaSec;
    state.water = Math.max(0, state.water - waterCost);
    state.nutrients = Math.max(0, state.nutrients - nutrientCost);
    state.lysateRaw -= stabilizeAmount;
    state.lysateBanked += stabilizeAmount;
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

  state.water = Math.max(0, state.water - WATER_DEPLETION_RATE * deltaSec);
  state.nutrients = Math.max(0, state.nutrients - NUTRIENT_DEPLETION_RATE * deltaSec);

  tickGenerators(state, deltaSec);
  tickLysate(state, deltaSec);

  const maxBiomass = getEffectiveMaxBiomass(state);
  const perSec = getEffectiveBiomassPerSec(state);
  const gained = perSec * deltaSec;

  state.biomass = Math.min(state.biomass + gained, maxBiomass);
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
  const duration = 30 * (1 - reduction);

  state.isInTrauma = true;
  state.traumaTimer = Math.max(5, duration);
  state.combatStats.hp = state.combatStats.maxHp;
  state.combatStats.shieldHits = 0;
}

export function getSkillLevelCost(baseCost: number, currentLevel: number): number {
  return Math.floor(baseCost * Math.pow(1.5, currentLevel));
}

export function canAffordSkill(biomass: number, baseCost: number, currentLevel: number): boolean {
  return biomass >= getSkillLevelCost(baseCost, currentLevel);
}
