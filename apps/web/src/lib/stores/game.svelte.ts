import {
  createInitialState,
  tickIdle,
  tickExpeditions,
  purchaseSkill as enginePurchaseSkill,
  getTotalGenomePoints,
  getSpentGenomePoints,
  getAvailableGenomePoints,
  canRespec as engineCanRespec,
  getRespecCost,
  respecSkills as engineRespecSkills,
  migrateSkillAllocations,
  startExpedition as engineStartExpedition,
  collectExpedition as engineCollectExpedition,
  removeCollectedExpeditions,
  getEffectiveBiomassPerSec,
  getEffectiveMaxBiomass,
  tickAlertDecay,
  applyVictory as engineApplyVictory,
  applyDefeat as engineApplyDefeat,
  absorbResources as engineAbsorb,
  synthesizeBiomass as engineSynthesize,
  purchaseTutorialUpgrade as enginePurchaseUpgrade,
  extendHyphae as engineExtend,
  completeTutorial,
  tutorialTick,
  resetAbsorbCount,
  purchaseGenerator as enginePurchaseGenerator,
  expandWaterCap as engineExpandWaterCap,
  expandNutrientCap as engineExpandNutrientCap,
  expandBiomassCap as engineExpandBiomassCap,
  getCapExpandCost,
  expandCap as engineExpandCap,
  tickRadar as engineTickRadar,
  ensureUniqueContactIds,
  pingSubstrate as enginePingSubstrate,
  scanContact as engineScanContact,
  engageContact as engineEngageContact,
  dismissContact as engineDismissContact,
  getRadarSlots,
  getActiveStrain,
  manualAbsorb as engineManualAbsorb,
  manualSynthesize as engineManualSynthesize,
  getSynthesisYield,
  tickManualCooldown,
  isStarving as engineIsStarving,
  getRecommendedPhase,
  getEchoEffects,
  getEffectiveCombatStats,
  getEchoName,
  getEchoDescription,
  getUpkeepRate,
  getResourceProduction,
  getNetResourceRate,
  getEcologicalEfficiency,
  getSystemUnlocks,
  applyOfflineProgress,
} from '@mycosurge/game-engine';
import type {
  GameState,
  CombatResult,
  CapResource,
  PoolResource,
  OfflineReport,
  SystemId,
  SystemUnlocks,
} from '@mycosurge/game-engine';
import { HOSTS, SKILL_NODES, GENERATORS } from '@mycosurge/config';
import { SYSTEM_META } from '$lib/content/systems';
import { logStore } from './log.svelte';

const SAVE_KEY = 'mycosurge_save';
const REVEAL_KEY = 'mycosurge_reveals';
const ALL_SYSTEM_IDS: SystemId[] = ['radar', 'evolution', 'expeditions'];
const TICK_INTERVAL = 1000;

interface RevealState {
  announced: SystemId[];
  seen: SystemId[];
}

function loadReveals(): RevealState {
  try {
    const raw = localStorage.getItem(REVEAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RevealState>;
      return { announced: parsed.announced ?? [], seen: parsed.seen ?? [] };
    }
  } catch {
    // storage unavailable — start with nothing announced
  }
  return { announced: [], seen: [] };
}

function createGameStore() {
  let offlineReport = $state<OfflineReport | null>(null);
  let didResetSkills = $state(false);
  let state = $state<GameState>(loadState());
  let tickHandle: ReturnType<typeof setInterval> | null = null;
  let revealState = $state<RevealState>(loadReveals());
  let allSystemsUnlocked = $state(false);

  function persistReveals() {
    try {
      localStorage.setItem(REVEAL_KEY, JSON.stringify(revealState));
    } catch {
      // storage unavailable — announcements are simply not remembered
    }
  }

  function unlockedSystems(): SystemUnlocks {
    if (allSystemsUnlocked) return { radar: true, evolution: true, expeditions: true };
    return getSystemUnlocks(state);
  }

  /** Emit a one-time activity-log note for each newly reached system. */
  function announceNewSystems() {
    const unlocks = unlockedSystems();
    const fresh = ALL_SYSTEM_IDS.filter((id) => unlocks[id] && !revealState.announced.includes(id));
    if (fresh.length === 0) return;
    revealState.announced = [...revealState.announced, ...fresh];
    persistReveals();
    for (const id of fresh) logStore.success(SYSTEM_META[id].toast);
  }

  function isSystemNew(id: SystemId): boolean {
    if (id === 'radar') return false;
    return unlockedSystems()[id] && !revealState.seen.includes(id);
  }

  function markSystemSeen(id: SystemId) {
    if (revealState.seen.includes(id)) return;
    revealState.seen = [...revealState.seen, id];
    persistReveals();
  }

  function loadState(): GameState {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GameState>;
        const initial = createInitialState();
        const merged: GameState = {
          ...initial,
          ...parsed,
          combatStats: { ...initial.combatStats, ...parsed.combatStats },
          tutorialUpgrades: { ...initial.tutorialUpgrades, ...parsed.tutorialUpgrades },
          skillAllocations: { ...(parsed.skillAllocations ?? {}) },
          upgradeLevels: { ...(parsed.upgradeLevels ?? {}) },
          generators: { ...(parsed.generators ?? {}) },
          hostAssimilation: { ...(parsed.hostAssimilation ?? {}) },
          contacts: parsed.contacts ?? [],
          expeditions: parsed.expeditions ?? [],
          acquiredEchoes: parsed.acquiredEchoes ?? [],
        };

        // Pre-release: drop mutations that no longer fit the genome-point budget.
        if (migrateSkillAllocations(merged)) didResetSkills = true;
        // Repair duplicate radar-contact ids from older saves (they crash keyed lists).
        ensureUniqueContactIds(merged);

        const elapsed = merged.lastSavedAt > 0 ? (Date.now() - merged.lastSavedAt) / 1000 : 0;
        if (elapsed > 0) {
          const report = applyOfflineProgress(merged, elapsed);
          if (report && (report.biomassGained >= 1 || report.expeditionsCompleted > 0)) {
            offlineReport = report;
          }
        }
        return merged;
      }
    } catch {
      // corrupted save, start fresh
    }
    return createInitialState();
  }

  function saveState() {
    state.lastSavedAt = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      // storage full or unavailable
    }
  }

  function startTick() {
    if (tickHandle) return;

    if (didResetSkills) {
      didResetSkills = false;
      logStore.error(
        'Your mutations were reset to fit the new genome budget. Rebuild your network.',
      );
    }

    let prevBiomass = state.biomass;
    let prevAlert = state.alertLevel;
    let wasInTrauma = state.isInTrauma;
    let wasStarving = engineIsStarving(state);

    tickHandle = setInterval(() => {
      tutorialTick(state, 1);
      if (state.gamePhase === 'active') {
        tickIdle(state, 1);
        tickExpeditions(state, 1);
        tickManualCooldown(state, 1);
        const spawned = engineTickRadar(state, 1);
        if (spawned) {
          const contactHost = HOSTS.find((h) => h.id === spawned.hostId);
          logStore.info(
            `Sonar contact: ${contactHost?.name ?? spawned.hostId} — scan to identify.`,
          );
        }
        if (!state.currentHostId && !state.isInTrauma) {
          tickAlertDecay(state, 1);
        }
        const starving = engineIsStarving(state);
        if (starving && !wasStarving) {
          logStore.error('Starving — passive growth has stopped. Restore Water and Nutrients.');
        } else if (!starving && wasStarving) {
          logStore.success('Reserves recovered — passive growth has resumed.');
        }
        wasStarving = starving;
      }

      if (!state.isInTrauma && wasInTrauma) {
        logStore.info('You recovered — the network is stable again.');
      }
      wasInTrauma = state.isInTrauma;

      if (Math.floor(state.biomass / 50) > Math.floor(prevBiomass / 50)) {
        logStore.info(`Biomass reserves: ${Math.floor(state.biomass)}`);
      }
      prevBiomass = state.biomass;

      if (state.alertLevel > prevAlert + 5) {
        logStore.warn(`The host is fighting back. Threat ${Math.floor(state.alertLevel)}%`);
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
      logStore.warn("You're still recovering — give it a moment.");
      return;
    }
    if (state.currentHostId) {
      logStore.warn("You're already fighting a host.");
      return;
    }

    state.currentHostId = hostId;
    state.combatStats.hp = state.combatStats.maxHp;
    logStore.info(`Engaging ${host.name}. Spores auto-fire — focus on dodging.`);
  }

  function purchaseSkill(skillId: string): boolean {
    const result = enginePurchaseSkill(state, skillId);
    if (result) {
      const def = SKILL_NODES.find((s) => s.id === skillId);
      if (def) {
        const level = state.skillAllocations[skillId] ?? 0;
        logStore.success(`Mutation unlocked: ${def.name} (Lv.${level})`);
      }
      saveState();
    }
    return result;
  }

  function respecSkills(): boolean {
    const result = engineRespecSkills(state);
    if (result) {
      logStore.info('Mutations reset — genome points refunded.');
      saveState();
    }
    return result;
  }

  function startExpedition(hostId: string): boolean {
    const host = HOSTS.find((h) => h.id === hostId);
    const result = engineStartExpedition(state, hostId);
    if (result && host) {
      logStore.info(`Expedition started to ${host.name}.`);
      saveState();
    }
    return result;
  }

  function collectExpedition(index: number): number {
    const reward = engineCollectExpedition(state, index);
    if (reward > 0) {
      logStore.success(`Expedition returned — +${reward} Biomass.`);
      saveState();
    }
    return reward;
  }

  function expandWaterCap(): boolean {
    const result = engineExpandWaterCap(state);
    if (result) {
      logStore.success(`Water capacity increased to ${Math.floor(state.waterCap)}.`);
      saveState();
    }
    return result;
  }

  function expandNutrientCap(): boolean {
    const result = engineExpandNutrientCap(state);
    if (result) {
      logStore.success(`Nutrients capacity increased to ${Math.floor(state.nutrientsCap)}.`);
      saveState();
    }
    return result;
  }

  function expandBiomassCap(): boolean {
    const result = engineExpandBiomassCap(state);
    if (result) {
      logStore.success(`Biomass capacity increased to ${Math.floor(state.maxBiomass)}.`);
      saveState();
    }
    return result;
  }

  function expandCap(resource: CapResource): boolean {
    const result = engineExpandCap(state, resource);
    if (result) {
      const labels: Record<CapResource, string> = {
        water: 'Water',
        nutrients: 'Nutrients',
        biomass: 'Biomass',
      };
      logStore.success(`${labels[resource]} capacity expanded (+10).`);
      saveState();
    }
    return result;
  }

  function manualAbsorb(): boolean {
    const result = engineManualAbsorb(state);
    if (result) {
      logStore.info('You draw in a burst of moisture and minerals.');
      saveState();
    }
    return result;
  }

  function manualSynthesize(): boolean {
    const result = engineManualSynthesize(state);
    if (!result.success) {
      logStore.warn('You need 10 Water and 10 Nutrients to synthesize.');
      return false;
    }
    if (result.yield >= 1) {
      logStore.success('Biomass formed from stored Water and Nutrients.');
    } else if (result.yield > 0) {
      logStore.warn('Low reserves — the conversion only yielded 0.5 Biomass.');
    } else {
      logStore.error('Reserves too low — the synthesis was wasted.');
    }
    saveState();
    return true;
  }

  function pingSubstrate(): boolean {
    const result = enginePingSubstrate(state);
    if (result) {
      logStore.info('You ping the substrate — a new contact drifts in.');
      saveState();
      return true;
    }
    if (state.contacts.length >= getRadarSlots(state)) {
      logStore.warn('The radar is full. Engage or dismiss a contact first.');
    } else {
      logStore.warn('You need 5 Water to ping the substrate.');
    }
    return false;
  }

  function scanContact(contactId: string): boolean {
    const contact = state.contacts.find((c) => c.id === contactId);
    const result = engineScanContact(state, contactId);
    if (result) {
      const host = contact ? HOSTS.find((h) => h.id === contact.hostId) : undefined;
      logStore.info(`Contact identified: ${host?.name ?? 'unknown host'}.`);
      saveState();
      return true;
    }
    logStore.warn('You need 5 Water to scan a signal.');
    return false;
  }

  function engageContact(contactId: string): boolean {
    const result = engineEngageContact(state, contactId);
    if (result) {
      const host = HOSTS.find((h) => h.id === state.currentHostId);
      logStore.info(`Engaging ${host?.name ?? 'host'}. Spores auto-fire — focus on dodging.`);
      saveState();
    }
    return result;
  }

  function dismissContact(contactId: string): void {
    engineDismissContact(state, contactId);
    saveState();
  }

  function purchaseGenerator(genId: string): boolean {
    const result = enginePurchaseGenerator(state, genId);
    if (result) {
      const genName = GENERATORS.find((g) => g.id === genId)?.name ?? 'Generator';
      logStore.success(`${genName} upgraded.`);
      saveState();
    }
    return result;
  }

  function cleanupExpeditions() {
    removeCollectedExpeditions(state);
    saveState();
  }

  function disengageHost() {
    state.currentHostId = null;
    state.currentContactId = null;
    state.activeStrainId = 'normal';
  }

  function updateCombatHp(hp: number) {
    state.combatStats.hp = hp;
  }

  function resolveCombat(outcome: 'victory' | 'defeat', hostId: string): CombatResult | null {
    if (outcome === 'victory') {
      const result = engineApplyVictory(state, hostId);
      const host = HOSTS.find((h) => h.id === hostId);
      logStore.success(`You drove off ${host?.name ?? hostId}.`);
      logStore.info(`+${result.biomassEarned} Biomass harvested.`);
      if (result.hostDefeated) {
        logStore.success('Host fully grown over — a new echo joined your network.');
      }
      state.currentHostId = null;
      saveState();
      return result;
    }
    engineApplyDefeat(state);
    logStore.warn('You had to retreat — the network is in recovery.');
    state.currentHostId = null;
    saveState();
    return null;
  }

  function resetGame() {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem('mycosurge_unlock_seen');
    localStorage.removeItem(REVEAL_KEY);
    state = createInitialState();
    offlineReport = null;
    revealState = { announced: [], seen: [] };
    allSystemsUnlocked = false;
    resetAbsorbCount();
    logStore.clear();
    logStore.info('Reset — starting a fresh network.');
  }

  // ── Tutorial Methods ──

  function absorbResources() {
    const message = engineAbsorb(state);
    logStore.info(message);
    if (state.gamePhase === 'manager') {
      logStore.info('You have enough to grow. Biomass synthesis is now available.');
    }
    saveState();
  }

  function synthesizeBiomass() {
    const result = engineSynthesize(state);
    if (result.success) {
      logStore.info(result.message);
      if (state.biomass >= 2) {
        logStore.info('You can now install a generator to make resources automatically.');
      }
    }
    saveState();
  }

  function purchaseTutorialUpgrade(upgrade: 'osmoticPump' | 'enzymaticExudates') {
    const result = enginePurchaseUpgrade(state, upgrade);
    if (result.success) {
      logStore.success(result.message);
      if (state.tutorialUpgrades.osmoticPump || state.tutorialUpgrades.enzymaticExudates) {
        logStore.info('Automation online — you can now grow your network.');
      }
    }
    saveState();
  }

  function extendHyphae() {
    const result = engineExtend(state);
    if (result.success) {
      logStore.info(result.message);
      if (state.mycelialNetwork >= 5) {
        logStore.warn('Something is grazing on your outer hyphae. Head to the Radar.');
      }
    }
    saveState();
  }

  function skipIntro() {
    completeTutorial(state);
    state.water = state.waterCap;
    state.nutrients = state.nutrientsCap;
    resetAbsorbCount();
    // QA affordance: reveal every system and mark them seen so no toasts fire.
    allSystemsUnlocked = true;
    revealState = { announced: [...ALL_SYSTEM_IDS], seen: [...ALL_SYSTEM_IDS] };
    persistReveals();
    saveState();
    logStore.info('Skipped the intro — systems online, reserves topped up.');
  }

  return {
    get state() {
      return state;
    },
    get offlineReport() {
      return offlineReport;
    },
    dismissOfflineReport() {
      offlineReport = null;
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
    get ecologicalEfficiency() {
      return getEcologicalEfficiency(state);
    },
    get strainPercent() {
      return state.assimilationPercent;
    },
    resourceUpkeep(resource: PoolResource) {
      return getUpkeepRate(state, resource);
    },
    resourceProduction(resource: PoolResource) {
      return getResourceProduction(state, resource);
    },
    netResourceRate(resource: PoolResource) {
      return getNetResourceRate(state, resource);
    },
    get isInTrauma() {
      return state.isInTrauma;
    },
    get currentHost() {
      return state.currentHostId;
    },
    get contacts() {
      return state.contacts;
    },
    get radarSlots() {
      return getRadarSlots(state);
    },
    get activeStrain() {
      return getActiveStrain(state);
    },
    get isStarving() {
      return engineIsStarving(state);
    },
    get recommendedPhase() {
      return getRecommendedPhase(state);
    },
    get unlockedSystems() {
      return unlockedSystems();
    },
    isSystemNew,
    markSystemSeen,
    announceNewSystems,
    synthesisYield() {
      return getSynthesisYield(state);
    },
    capExpandCost(resource: CapResource) {
      return getCapExpandCost(state, resource);
    },
    get acquiredEchoes() {
      return state.acquiredEchoes;
    },
    get echoEffects() {
      return getEchoEffects(state.acquiredEchoes);
    },
    get genomePointsSpent() {
      return getSpentGenomePoints(state);
    },
    get genomePointsTotal() {
      return getTotalGenomePoints(state);
    },
    get genomePointsAvailable() {
      return getAvailableGenomePoints(state);
    },
    get canRespec() {
      return engineCanRespec(state);
    },
    get respecCost() {
      return getRespecCost(state);
    },
    echoName(echoId: string) {
      return getEchoName(echoId);
    },
    echoDescription(echoId: string) {
      return getEchoDescription(echoId);
    },
    get expeditions() {
      return state.expeditions;
    },
    get hostsDefeated() {
      return state.hostsDefeated;
    },
    get combatStats() {
      return state.combatStats;
    },
    get effectiveCombatStats() {
      return getEffectiveCombatStats(state);
    },
    get totalBiomassEarned() {
      return state.totalBiomassEarned;
    },
    engageHost,
    disengageHost,
    updateCombatHp,
    resolveCombat,
    purchaseSkill,
    respecSkills,
    purchaseGenerator,
    expandWaterCap,
    expandNutrientCap,
    expandBiomassCap,
    expandCap,
    manualAbsorb,
    manualSynthesize,
    pingSubstrate,
    scanContact,
    engageContact,
    dismissContact,
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
    skipIntro,
  };
}

export const gameStore = createGameStore();
