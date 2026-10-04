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
  extendReach as engineExtendReach,
  growSector as engineGrowSector,
  growEvenly as engineGrowEvenly,
  getSectorDepths,
  getGrowCost,
  getEvenCost,
  getMaxReach,
  getNextReachTier,
  pingSubstrate as enginePingSubstrate,
  scanContact as engineScanContact,
  engageContact as engineEngageContact,
  dismissContact as engineDismissContact,
  clearActiveEncounter,
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
  getFarmPool,
  evaluateAdvisor,
  observePlayerChoice,
  observePlayerAction,
  recordHostEngaged,
  recordCombatOutcome,
  getAdvisorEvent,
  catalogueHost,
  buildCord as engineBuildCord,
  getCordCost,
  getDefaultCordBranch,
  generateNetwork,
  canBuildCord as engineCanBuildCord,
} from '@mycosurge/game-engine';
import type {
  GameState,
  CombatResult,
  CapResource,
  PoolResource,
  OfflineReport,
  SystemId,
  SystemUnlocks,
  GrowthPhase,
  AdvisorResult,
} from '@mycosurge/game-engine';
import { HOSTS, SKILL_NODES, GENERATORS, REACH_START, ADVISOR_TUNING } from '@mycosurge/config';
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

/** Assign a stable map seed the first time the full game is reached. */
function assignNetworkSeed(target: GameState): void {
  if (target.networkSeed) return;
  target.networkSeed = ((Date.now() >>> 0) ^ 0x9e3779b9) >>> 0 || 1;
}

function createGameStore() {
  let offlineReport = $state<OfflineReport | null>(null);
  let didResetSkills = $state(false);
  let state = $state<GameState>(loadState());
  let tickHandle: ReturnType<typeof setInterval> | null = null;
  let revealState = $state<RevealState>(loadReveals());
  let allSystemsUnlocked = $state(false);
  let lastAdvisorPhase: GrowthPhase | null = null;
  let lastAdvisorLogAt = 0;

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
          networkSeed: parsed.networkSeed ?? initial.networkSeed,
          cordBranchId: parsed.cordBranchId ?? initial.cordBranchId,
          cataloguedHosts: parsed.cataloguedHosts ?? initial.cataloguedHosts,
          reachSectors: parsed.reachSectors ?? initial.reachSectors,
          advisor: {
            ...initial.advisor,
            ...(parsed.advisor ?? {}),
            memory: {
              ...initial.advisor.memory,
              ...(parsed.advisor?.memory ?? {}),
              actionCounts: { ...(parsed.advisor?.memory?.actionCounts ?? {}) },
              phaseCounts: { ...(parsed.advisor?.memory?.phaseCounts ?? {}) },
              hostTypeCounts: { ...(parsed.advisor?.memory?.hostTypeCounts ?? {}) },
              bias: { ...(parsed.advisor?.memory?.bias ?? {}) },
              lastActionAt: { ...(parsed.advisor?.memory?.lastActionAt ?? {}) },
              outcomes: {
                victories: parsed.advisor?.memory?.outcomes?.victories ?? 0,
                defeats: parsed.advisor?.memory?.outcomes?.defeats ?? 0,
              },
            },
          },
        };

        // Pre-release: drop mutations that no longer fit the genome-point budget.
        if (migrateSkillAllocations(merged)) didResetSkills = true;
        // Repair duplicate radar-contact ids from older saves (they crash keyed lists).
        ensureUniqueContactIds(merged);
        // Reach replaced echo-gating; active saves continue from at least the tutorial's 5 mm.
        if (merged.gamePhase === 'active') {
          merged.mycelialNetwork = Math.max(merged.mycelialNetwork, REACH_START);
        }

        // Slice 2 migration: hosts already fought count as catalogued, so an existing
        // save keeps its radar farm pool.
        if (merged.cataloguedHosts.length === 0) {
          merged.cataloguedHosts = Object.entries(merged.hostAssimilation)
            .filter(([id, value]) => id !== 'soil_nematode' && value > 0)
            .map(([id]) => id);
        }

        const elapsed = merged.lastSavedAt > 0 ? (Date.now() - merged.lastSavedAt) / 1000 : 0;
        if (elapsed > 0) {
          const report = applyOfflineProgress(merged, elapsed);
          if (report && (report.biomassGained >= 1 || report.expeditionsCompleted > 0)) {
            offlineReport = report;
          }
        }
        if (merged.gamePhase === 'active') assignNetworkSeed(merged);
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

  /**
   * Forward the organism's advice to the observation log when the advised stage
   * changes. The advisor emits a structured event; only this adapter knows about
   * the log, so a future log pipeline only has to change here.
   */
  function reportAdvisor(result: AdvisorResult) {
    const changed = result.phase !== lastAdvisorPhase;
    lastAdvisorPhase = result.phase;
    if (!changed || result.maturity === 'germinating') return;

    const now = Date.now();
    if (now - lastAdvisorLogAt < ADVISOR_TUNING.logMinSeconds * 1000) return;
    lastAdvisorLogAt = now;
    logStore.info(getAdvisorEvent(result).text);
  }

  /** Record a concrete player action so the organism can learn from real play. */
  function observeAction(actionId: string) {
    observePlayerAction(state, actionId, Date.now());
  }

  function startTick() {
    if (tickHandle) return;

    if (didResetSkills) {
      didResetSkills = false;
      logStore.error('Some mutations unravel — the genome overreached. Rebuild the network.');
    }

    let wasInTrauma = state.isInTrauma;
    let wasStarving = engineIsStarving(state);

    tickHandle = setInterval(() => {
      tutorialTick(state, 1);
      if (state.gamePhase === 'active') {
        assignNetworkSeed(state);
        tickIdle(state, 1);
        tickExpeditions(state, 1);
        tickManualCooldown(state, 1);
        const spawned = engineTickRadar(state, 1);
        if (spawned) {
          logStore.info('A tremor in the substrate — a signal drifts in. Scan to identify.');
        }
        if (!state.currentHostId && !state.isInTrauma) {
          tickAlertDecay(state, 1);
        }
        const starving = engineIsStarving(state);
        if (starving && !wasStarving) {
          logStore.error('The substrate runs dry. Growth holds its breath.');
        } else if (!starving && wasStarving) {
          logStore.success('Moisture returns — the hyphae breathe again.');
        }
        wasStarving = starving;
      }

      if (!state.isInTrauma && wasInTrauma) {
        logStore.info('The wounds close. The network steadies.');
      }
      wasInTrauma = state.isInTrauma;

      if (state.gamePhase === 'active') {
        const advisor = evaluateAdvisor(state);
        reportAdvisor(advisor);
      }

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
      logStore.warn('The network is still raw — wait before engaging.');
      return;
    }
    if (state.currentHostId) {
      logStore.warn('A host is already entangled.');
      return;
    }

    state.currentHostId = hostId;
    state.combatStats.hp = state.combatStats.maxHp;
    logStore.info(`You close on ${host.name}. Spores fire on their own — dodge.`);
    observeAction('hunt.engage');
    recordHostEngaged(state, hostId);
  }

  function purchaseSkill(skillId: string): boolean {
    const result = enginePurchaseSkill(state, skillId);
    if (result) {
      const def = SKILL_NODES.find((s) => s.id === skillId);
      if (def) {
        const level = state.skillAllocations[skillId] ?? 0;
        logStore.success(`A new pattern settles in: ${def.name} (Lv.${level}).`);
      }
      saveState();
    }
    return result;
  }

  function respecSkills(): boolean {
    const result = engineRespecSkills(state);
    if (result) {
      logStore.info('The patterns unwind; their points scatter back.');
      saveState();
    }
    return result;
  }

  function startExpedition(hostId: string): boolean {
    const host = HOSTS.find((h) => h.id === hostId);
    const result = engineStartExpedition(state, hostId);
    if (result && host) {
      logStore.info(`${host.name} sets out to forage.`);
      saveState();
    }
    return result;
  }

  function collectExpedition(index: number): number {
    const reward = engineCollectExpedition(state, index);
    if (reward > 0) {
      logStore.success(`The forager returns, heavy with ${reward} Biomass.`);
      saveState();
    }
    return reward;
  }

  function expandWaterCap(): boolean {
    const result = engineExpandWaterCap(state);
    if (result) {
      logStore.success(`The membrane stretches — Water capacity ${Math.floor(state.waterCap)}.`);
      observeAction('expand.cap.water');
      saveState();
    }
    return result;
  }

  function expandNutrientCap(): boolean {
    const result = engineExpandNutrientCap(state);
    if (result) {
      logStore.success(
        `The membrane stretches — Nutrients capacity ${Math.floor(state.nutrientsCap)}.`,
      );
      observeAction('expand.cap.nutrients');
      saveState();
    }
    return result;
  }

  function expandBiomassCap(): boolean {
    const result = engineExpandBiomassCap(state);
    if (result) {
      logStore.success(
        `The membrane stretches — Biomass capacity ${Math.floor(state.maxBiomass)}.`,
      );
      observeAction('expand.cap.biomass');
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
      logStore.success(`The membrane stretches — ${labels[resource]} (+10).`);
      observeAction(`expand.cap.${resource}`);
      saveState();
    }
    return result;
  }

  function manualAbsorb(): boolean {
    const result = engineManualAbsorb(state);
    if (result) {
      logStore.info('Dew beads along the hyphae and sinks in.');
      observeAction('gather.topUp');
      saveState();
    }
    return result;
  }

  function manualSynthesize(): boolean {
    const result = engineManualSynthesize(state);
    if (!result.success) {
      logStore.warn('Not enough stored to shape Biomass.');
      return false;
    }
    if (result.yield >= 1) {
      logStore.success('Mass gathers — a knot of self thickens.');
    } else if (result.yield > 0) {
      logStore.warn('Reserves thin — only half a unit forms.');
    } else {
      logStore.error('Too little to hold — the conversion slips away.');
    }
    observeAction('grow.synthesize');
    saveState();
    return true;
  }

  function extendReach(): boolean {
    const result = engineExtendReach(state);
    if (!result.success) {
      logStore.warn('The network cannot stretch that far yet.');
      return false;
    }
    logStore.success('New filaments press deeper into the dark.');
    if (result.spawned) {
      logStore.info('A signal blooms at the frontier.');
    }
    observeAction('expand.reach');
    saveState();
    return true;
  }

  function growSector(index: number): boolean {
    const result = engineGrowSector(state, index);
    if (!result.success) {
      logStore.warn('The network cannot stretch that far yet.');
      return false;
    }
    logStore.success('New filaments press deeper into the dark.');
    if (result.spawned) {
      logStore.info('A signal blooms at the frontier.');
    }
    observeAction('expand.reach');
    saveState();
    return true;
  }

  function growEvenly(): boolean {
    const result = engineGrowEvenly(state);
    if (!result.success) {
      logStore.warn('The network cannot stretch that far yet.');
      return false;
    }
    logStore.success('The network thickens all around.');
    if (result.spawned) {
      logStore.info('A signal blooms at the frontier.');
    }
    observeAction('expand.reach');
    saveState();
    return true;
  }

  function pingSubstrate(): boolean {
    if (getFarmPool(state).length === 0) {
      logStore.info('No known species to track yet — find one at the frontier.');
      return false;
    }
    const result = enginePingSubstrate(state);
    if (result) {
      logStore.info('A pulse travels out — the substrate answers.');
      observeAction('hunt.ping');
      saveState();
      return true;
    }
    if (state.contacts.length >= getRadarSlots(state)) {
      logStore.warn('The array is full — engage or dismiss a signal.');
    } else {
      logStore.warn('Not enough Water to ping the substrate.');
    }
    return false;
  }

  function scanContact(contactId: string): boolean {
    const contact = state.contacts.find((c) => c.id === contactId);
    const result = engineScanContact(state, contactId);
    if (result) {
      const host = contact ? HOSTS.find((h) => h.id === contact.hostId) : undefined;
      logStore.info(`Something surfaces from the noise: ${host?.name ?? 'unknown host'}.`);
      observeAction('hunt.scan');
      saveState();
      return true;
    }
    logStore.warn('Not enough Water to scan a signal.');
    return false;
  }

  function engageContact(contactId: string): boolean {
    const result = engineEngageContact(state, contactId);
    if (result) {
      const host = HOSTS.find((h) => h.id === state.currentHostId);
      logStore.info(`You close on ${host?.name ?? 'the host'}. Spores fire on their own — dodge.`);
      observeAction('hunt.engage');
      if (state.currentHostId) recordHostEngaged(state, state.currentHostId);
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
      logStore.success(`${genName} deepens.`);
      observeAction('grow.invest');
      saveState();
    }
    return result;
  }

  function cleanupExpeditions() {
    removeCollectedExpeditions(state);
    saveState();
  }

  function disengageHost() {
    // Dismiss the originating contact too, so a retreated signal leaves the map.
    clearActiveEncounter(state);
  }

  function updateCombatHp(hp: number) {
    state.combatStats.hp = hp;
  }

  function resolveCombat(outcome: 'victory' | 'defeat', hostId: string): CombatResult | null {
    if (outcome === 'victory') {
      const result = engineApplyVictory(state, hostId);
      const host = HOSTS.find((h) => h.id === hostId);
      logStore.success(
        `The ${host?.name ?? hostId} stills — ${result.biomassEarned} Biomass harvested.`,
      );
      if (result.hostDefeated) {
        logStore.success('Its pattern sinks in — a new echo joins the network.');
      }
      const wasKnown = state.cataloguedHosts.includes(hostId);
      catalogueHost(state, hostId);
      if (!wasKnown) {
        logStore.success(`${host?.name ?? hostId} catalogued — added to the bestiary.`);
      }
      recordCombatOutcome(state, 'victory');
      clearActiveEncounter(state);
      saveState();
      return result;
    }
    engineApplyDefeat(state);
    logStore.warn('The network recoils — retreat, and recover.');
    recordCombatOutcome(state, 'defeat');
    clearActiveEncounter(state);
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
    logStore.info('A fresh spore. The network begins again.');
  }

  // ── Tutorial Methods ──

  function absorbResources() {
    const message = engineAbsorb(state);
    logStore.info(message);
    if (state.gamePhase === 'manager') {
      logStore.info('Reserves brim — Biomass can now be shaped.');
    }
    saveState();
  }

  function synthesizeBiomass() {
    const result = engineSynthesize(state);
    if (result.success) {
      logStore.info(result.message);
      if (state.biomass >= 2) {
        logStore.info('A generator can now be grown to feed you.');
      }
    }
    saveState();
  }

  function purchaseTutorialUpgrade(upgrade: 'osmoticPump' | 'enzymaticExudates') {
    const result = enginePurchaseUpgrade(state, upgrade);
    if (result.success) {
      logStore.success(result.message);
      if (state.tutorialUpgrades.osmoticPump || state.tutorialUpgrades.enzymaticExudates) {
        logStore.info('Automation stirs. The network can grow on its own.');
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
    logStore.info('The intro is skipped; the network wakes fully grown.');
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
    get reach() {
      return getMaxReach(state);
    },
    get sectorDepths() {
      return getSectorDepths(state);
    },
    get reachCost() {
      return getGrowCost(state);
    },
    get evenCost() {
      return getEvenCost(state);
    },
    get nextReachTier() {
      return getNextReachTier(getMaxReach(state));
    },
    extendReach() {
      return extendReach();
    },
    growSector(index: number) {
      return growSector(index);
    },
    growEvenly() {
      return growEvenly();
    },
    get networkSeed() {
      return state.networkSeed;
    },
    get cataloguedHosts() {
      return state.cataloguedHosts;
    },
    get cordBranchId() {
      return state.cordBranchId;
    },
    get cordCost() {
      return getCordCost(state);
    },
    get canBuildCord() {
      return engineCanBuildCord(state);
    },
    reinforceCord() {
      const geometry = generateNetwork(state.networkSeed);
      const branch = getDefaultCordBranch(geometry);
      const ok = engineBuildCord(state, branch);
      if (ok) {
        logStore.success('The main hypha thickens — a rhizomorph cord forms.');
        saveState();
      }
      return ok;
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
    /** Full advisor result: top action, reason and every scored candidate. */
    get advisor(): AdvisorResult {
      return evaluateAdvisor(state);
    },
    /** Record a deliberate phase choice so the organism can learn the player's habits. */
    observePhase(phase: GrowthPhase) {
      observePlayerChoice(state, phase, Date.now());
      saveState();
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
