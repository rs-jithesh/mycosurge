import {
  createInitialState,
  tickIdle,
  tickExpeditions,
  purchaseSkill as enginePurchaseSkill,
  startExpedition as engineStartExpedition,
  collectExpedition as engineCollectExpedition,
  cleanCompletedExpeditions,
  getEffectiveBiomassPerSec,
  getEffectiveMaxBiomass,
  applyVictory as engineApplyVictory,
  applyDefeat as engineApplyDefeat,
  absorbResources as engineAbsorb,
  synthesizeBiomass as engineSynthesize,
  purchaseTutorialUpgrade as enginePurchaseUpgrade,
  extendHyphae as engineExtend,
  tutorialTick,
  resetAbsorbCount,
  purchaseGenerator as enginePurchaseGenerator,
  purchaseUpgrade as enginePurchaseEconomyUpgrade,
  expandWaterCap as engineExpandWaterCap,
  expandNutrientCap as engineExpandNutrientCap,
  expandBiomassCap as engineExpandBiomassCap,
} from '@mycosurge/game-engine';
import type { GameState } from '@mycosurge/game-engine';
import { HOSTS, SKILL_NODES, UPGRADES } from '@mycosurge/config';
import { logStore } from './log.svelte';

const SAVE_KEY = 'mycosurge_save';
const TICK_INTERVAL = 1000;

function createGameStore() {
  let state = $state<GameState>(loadState());
  let tickHandle: ReturnType<typeof setInterval> | null = null;

  function loadState(): GameState {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GameState;
        return { ...createInitialState(), ...parsed };
      }
    } catch {
      // corrupted save, start fresh
    }
    return createInitialState();
  }

  function saveState() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      // storage full or unavailable
    }
  }

  function startTick() {
    if (tickHandle) return;

    let prevBiomass = state.biomass;
    let prevAlert = state.alertLevel;
    let wasInTrauma = state.isInTrauma;

    tickHandle = setInterval(() => {
      tutorialTick(state, 1);
      if (state.gamePhase === 'active') {
        tickIdle(state, 1);
        tickExpeditions(state, 1);
      }

      if (!state.isInTrauma && wasInTrauma) {
        logStore.info('Trauma response suppressed. Mycelial network re-established.');
      }
      wasInTrauma = state.isInTrauma;

      if (Math.floor(state.biomass / 50) > Math.floor(prevBiomass / 50)) {
        logStore.info(`Biomass reserves: ${Math.floor(state.biomass)} units`);
      }
      prevBiomass = state.biomass;

      if (state.alertLevel > prevAlert + 5) {
        logStore.warn(`Host immune response escalating. Alert: ${Math.floor(state.alertLevel)}%`);
      }
      prevAlert = state.alertLevel;

      saveState();
    }, TICK_INTERVAL);
  }

  function stopTick() {
    if (tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
  }

  function engageHost(hostId: string) {
    const host = HOSTS.find((h) => h.id === hostId);
    if (!host) return;
    if (state.isInTrauma) {
      logStore.warn('Cannot engage: mycelium in trauma recovery');
      return;
    }
    if (state.currentHostId) {
      logStore.warn('Already engaged with a host');
      return;
    }

    state.currentHostId = hostId;
    state.combatStats.hp = state.combatStats.maxHp;
    logStore.info(`Engaging host: ${host.name}. Deploying spores...`);
  }

  function purchaseSkill(skillId: string): boolean {
    const result = enginePurchaseSkill(state, skillId);
    if (result) {
      const def = SKILL_NODES.find((s) => s.id === skillId);
      if (def) {
        const level = state.skillAllocations[skillId] ?? 0;
        logStore.success(`Neural mutation: ${def.name} (Lv.${level})`);
      }
      saveState();
    }
    return result;
  }

  function startExpedition(hostId: string): boolean {
    const host = HOSTS.find((h) => h.id === hostId);
    const result = engineStartExpedition(state, hostId);
    if (result && host) {
      logStore.info(`Expedition launched: ${host.name}.`);
      saveState();
    }
    return result;
  }

  function collectExpedition(index: number): number {
    const reward = engineCollectExpedition(state, index);
    if (reward > 0) {
      logStore.success(`Expedition return: +${reward} biomass harvested`);
      saveState();
    }
    return reward;
  }

  function expandWaterCap(): boolean {
    const result = engineExpandWaterCap(state);
    if (result) {
      logStore.success(`Water cap expanded to ${Math.floor(state.waterCap)}`);
      saveState();
    }
    return result;
  }

  function expandNutrientCap(): boolean {
    const result = engineExpandNutrientCap(state);
    if (result) {
      logStore.success(`Nutrient cap expanded to ${Math.floor(state.nutrientsCap)}`);
      saveState();
    }
    return result;
  }

  function expandBiomassCap(): boolean {
    const result = engineExpandBiomassCap(state);
    if (result) {
      logStore.success(`Biomass cap expanded to ${Math.floor(state.maxBiomass)}`);
      saveState();
    }
    return result;
  }

  function purchaseUpgrade(upgradeId: string): boolean {
    const result = enginePurchaseEconomyUpgrade(state, upgradeId);
    if (result) {
      const def = UPGRADES.find((u) => u.id === upgradeId);
      if (def) {
        const level = state.upgradeLevels[upgradeId] ?? 0;
        logStore.success(`Upgrade purchased: ${def.name} (Lv.${level})`);
      }
      saveState();
    }
    return Boolean(result);
  }

  function purchaseGenerator(genId: string): boolean {
    const result = enginePurchaseGenerator(state, genId);
    if (result) {
      logStore.success(`Generator upgraded: ${genId}`);
      saveState();
    }
    return result;
  }

  function getGeneratorRate(genId: string): number {
    const level = state.generators[genId] ?? 0;
    return level;
  }

  function cleanupExpeditions() {
    cleanCompletedExpeditions(state);
    saveState();
  }

  function disengageHost() {
    state.currentHostId = null;
  }

  function resolveCombat(outcome: 'victory' | 'defeat', hostId: string) {
    if (outcome === 'victory') {
      const result = engineApplyVictory(state, hostId);
      const host = HOSTS.find((h) => h.id === hostId);
      logStore.success(`Host neutralized: ${host?.name ?? hostId}`);
      logStore.info(`Biomass harvested: +${result.biomassEarned}`);
      if (result.hostDefeated) {
        logStore.success(`Host fully assimilated. Evolutionary echo acquired.`);
      }
    } else {
      engineApplyDefeat(state);
      logStore.warn('Forced retreat. Mycelial network in trauma.');
    }
    state.currentHostId = null;
    saveState();
  }

  function resetGame() {
    localStorage.removeItem(SAVE_KEY);
    state = createInitialState();
    resetAbsorbCount();
    logStore.clear();
    logStore.info('System reset. Mycelial network restarting...');
  }

  // ── Tutorial Methods ──

  function absorbResources() {
    const message = engineAbsorb(state);
    logStore.info(message);
    if (state.gamePhase === 'manager') {
      logStore.info('Cellular energy threshold reached. Metabolic pathways initializing.');
    }
    saveState();
  }

  function synthesizeBiomass() {
    const result = engineSynthesize(state);
    if (result.success) {
      logStore.info(result.message);
      if (state.biomass >= 2) {
        logStore.info('Automation integration available.');
      }
    }
    saveState();
  }

  function purchaseTutorialUpgrade(upgrade: 'osmoticPump' | 'enzymaticExudates') {
    const result = enginePurchaseUpgrade(state, upgrade);
    if (result.success) {
      logStore.success(result.message);
      if (state.tutorialUpgrades.osmoticPump || state.tutorialUpgrades.enzymaticExudates) {
        logStore.info('Mycelial automation online. Expansion protocols unlocked.');
      }
    }
    saveState();
  }

  function extendHyphae() {
    const result = engineExtend(state);
    if (result.success) {
      logStore.info(result.message);
      if (state.mycelialNetwork >= 5) {
        logStore.warn('WARNING: Hostile organism detected on the outer hyphae perimeter.');
      }
    }
    saveState();
  }

  return {
    get state() {
      return state;
    },
    get biomass() {
      return state.biomass;
    },
    get maxBiomass() {
      return getEffectiveMaxBiomass(state);
    },
    get biomassPerSec() {
      return getEffectiveBiomassPerSec(state);
    },
    get alertLevel() {
      return state.alertLevel;
    },
    get isInTrauma() {
      return state.isInTrauma;
    },
    get currentHost() {
      return state.currentHostId;
    },
    get assimilationPercent() {
      return state.assimilationPercent;
    },
    get acquiredEchoes() {
      return state.acquiredEchoes;
    },
    get expeditions() {
      return state.expeditions;
    },
    get hostsDefeated() {
      return state.hostsDefeated;
    },
    get skillAllocations() {
      return state.skillAllocations;
    },
    get combatStats() {
      return state.combatStats;
    },
    get totalBiomassEarned() {
      return state.totalBiomassEarned;
    },
    engageHost,
    disengageHost,
    resolveCombat,
    purchaseSkill,
    purchaseGenerator,
    purchaseUpgrade,
    getGeneratorRate,
    expandWaterCap,
    expandNutrientCap,
    expandBiomassCap,
    startExpedition,
    collectExpedition,
    cleanupExpeditions,
    resetGame,
    startTick,
    stopTick,
    absorbResources,
    synthesizeBiomass,
    purchaseTutorialUpgrade,
    extendHyphae,
  };
}

export const gameStore = createGameStore();
