import {
  MAX_BIOMASS_BASE,
  BASE_BIOMASS_PER_SEC,
  MAX_WATER_BASE,
  MAX_NUTRIENT_BASE,
  SONAR_INITIAL_DELAY,
  NORMAL_STRAIN_ID,
} from '@mycosurge/config';

export type GamePhase = 'awakening' | 'manager' | 'explorer' | 'tactician' | 'active';

export interface TutorialUpgrades {
  osmoticPump: boolean;
  enzymaticExudates: boolean;
}

/**
 * What the organism has observed of the player and learned from it. All values
 * are bounded and persist with the save; nothing here is ever advanced offline.
 */
export interface AdvisorMemory {
  /** Deliberate player choices observed, lifetime. */
  observations: number;
  /** Count of player actions by action id. */
  actionCounts: Record<string, number>;
  /** Count of chosen phases by phase. */
  phaseCounts: Record<string, number>;
  /** Count of hosts engaged, by host id. */
  hostTypeCounts: Record<string, number>;
  /** Lifetime combat outcomes. */
  outcomes: { victories: number; defeats: number };
  /** EMA of "player chose what the organism wanted" in [0,1]. */
  alignment: number;
  /** Learned multiplicative bias per consideration id, clamped. */
  bias: Record<string, number>;
  /** Timestamp of the last observation (informational). */
  lastObservedAt: number;
  /** Last observation time per action id, used to rate-limit action spam. */
  lastActionAt: Record<string, number>;
}

export interface AdvisorState {
  memory: AdvisorMemory;
  /** 0 = hints only; future autonomy levels gate on this. */
  autonomyLevel: number;
}

export interface CombatStats {
  maxHp: number;
  hp: number;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  projectileCount: number;
  piercing: boolean;
  hitboxMultiplier: number;
  shieldHits: number;
  damageResistance: number;
  hpRegen: number;
  emergencyEvac: boolean;
  poisonDamage: number;
  chainReaction: boolean;
  moveSpeedMult: number;
  dodgeWindowMult: number;
  evadeChance: number;
}

export interface Expedition {
  hostId: string;
  timeRemaining: number;
  duration: number;
  completed: boolean;
  rewardCollected: boolean;
}

export interface RadarContact {
  id: string;
  hostId: string;
  strainId: string;
  revealed: boolean;
  timeRemaining: number;
  totalTime: number;
}

export interface GameState {
  biomass: number;
  maxBiomass: number;
  baseBiomassPerSec: number;
  currentHostId: string | null;
  currentContactId: string | null;
  contacts: RadarContact[];
  sonarTimer: number;
  lastContactHostId: string | null;
  activeStrainId: string;
  hostAssimilation: Record<string, number>;
  assimilationPercent: number;
  alertLevel: number;
  traumaTimer: number;
  isInTrauma: boolean;
  combatStats: CombatStats;
  skillAllocations: Record<string, number>;
  upgradeLevels: Record<string, number>;
  /** Number of times the player has respecced mutations (first is free). */
  respecsUsed: number;
  generators: Record<string, number>;
  lysateRaw: number;
  lysateBanked: number;
  /** Host ids fully grown over (assimilation reached its target). */
  grownOverHosts: string[];
  expeditions: Expedition[];
  maxExpeditionSlots: number;
  totalBiomassEarned: number;
  hostsDefeated: number;
  gamePhase: GamePhase;
  water: number;
  waterCap: number;
  nutrients: number;
  nutrientsCap: number;
  manualCooldown: number;
  mycelialNetwork: number;
  /**
   * Per-wedge growth beyond the base circle, newest design. Empty = a uniform
   * circle at `mycelialNetwork` (legacy/tutorial); otherwise each entry is the
   * extra mm grown in that sector (see `sectors.ts`).
   */
  reachSectors: number[];
  /** Seed for the deterministic expansion-map geometry (0 = not yet assigned). */
  networkSeed: number;
  /** Branch id reinforced into a rhizomorph cord, or null. */
  cordBranchId: string | null;
  /** Host ids uncovered (first defeat); drives the bestiary and farming pool. */
  cataloguedHosts: string[];
  /** Expansion landmark nodes claimed by growing past their depth. */
  claimedNodes: string[];
  advisor: AdvisorState;
  tutorialUpgrades: TutorialUpgrades;
  tutorialShockTimer: number;
  /** Epoch ms of the last save; 0 means no save has been written yet. */
  lastSavedAt: number;
}

export function createInitialState(): GameState {
  return {
    biomass: 0,
    maxBiomass: MAX_BIOMASS_BASE,
    baseBiomassPerSec: BASE_BIOMASS_PER_SEC,
    currentHostId: null,
    currentContactId: null,
    contacts: [],
    sonarTimer: SONAR_INITIAL_DELAY,
    lastContactHostId: null,
    activeStrainId: NORMAL_STRAIN_ID,
    hostAssimilation: {},
    assimilationPercent: 0,
    alertLevel: 0,
    traumaTimer: 0,
    isInTrauma: false,
    combatStats: {
      maxHp: 5,
      hp: 5,
      damage: 1,
      fireRate: 1,
      projectileSpeed: 1,
      projectileCount: 1,
      piercing: false,
      hitboxMultiplier: 1,
      shieldHits: 0,
      damageResistance: 0,
      hpRegen: 0,
      emergencyEvac: false,
      poisonDamage: 0,
      chainReaction: false,
      moveSpeedMult: 1,
      dodgeWindowMult: 1,
      evadeChance: 0,
    },
    skillAllocations: {},
    upgradeLevels: {},
    respecsUsed: 0,
    generators: {},
    lysateRaw: 0,
    lysateBanked: 0,
    grownOverHosts: [],
    expeditions: [],
    maxExpeditionSlots: 1,
    totalBiomassEarned: 0,
    hostsDefeated: 0,
    gamePhase: 'awakening',
    water: 0,
    waterCap: MAX_WATER_BASE,
    nutrients: 0,
    nutrientsCap: MAX_NUTRIENT_BASE,
    manualCooldown: 0,
    mycelialNetwork: 0,
    reachSectors: [],
    networkSeed: 0,
    cordBranchId: null,
    cataloguedHosts: [],
    claimedNodes: [],
    advisor: {
      memory: {
        observations: 0,
        actionCounts: {},
        phaseCounts: {},
        hostTypeCounts: {},
        outcomes: { victories: 0, defeats: 0 },
        alignment: 0,
        bias: {},
        lastObservedAt: 0,
        lastActionAt: {},
      },
      autonomyLevel: 0,
    },
    tutorialUpgrades: { osmoticPump: false, enzymaticExudates: false },
    tutorialShockTimer: 0,
    lastSavedAt: 0,
  };
}
