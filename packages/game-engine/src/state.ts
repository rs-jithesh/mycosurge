import {
  MAX_BIOMASS_BASE,
  BASE_BIOMASS_PER_SEC,
  MAX_WATER_BASE,
  MAX_NUTRIENT_BASE,
} from '@mycosurge/config';

export type GamePhase = 'awakening' | 'manager' | 'explorer' | 'tactician' | 'active';

export interface TutorialUpgrades {
  osmoticPump: boolean;
  enzymaticExudates: boolean;
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
}

export interface Expedition {
  hostId: string;
  timeRemaining: number;
  duration: number;
  completed: boolean;
  rewardCollected: boolean;
}

export interface GameState {
  biomass: number;
  maxBiomass: number;
  baseBiomassPerSec: number;
  currentHostId: string | null;
  assimilationPercent: number;
  alertLevel: number;
  traumaTimer: number;
  isInTrauma: boolean;
  combatStats: CombatStats;
  skillAllocations: Record<string, number>;
  upgradeLevels: Record<string, number>;
  generators: Record<string, number>;
  lysateRaw: number;
  lysateBanked: number;
  acquiredEchoes: string[];
  expeditions: Expedition[];
  maxExpeditionSlots: number;
  totalBiomassEarned: number;
  hostsDefeated: number;
  gamePhase: GamePhase;
  water: number;
  waterCap: number;
  nutrients: number;
  nutrientsCap: number;
  mycelialNetwork: number;
  tutorialUpgrades: TutorialUpgrades;
  tutorialShockTimer: number;
}

export function createInitialState(): GameState {
  return {
    biomass: 0,
    maxBiomass: MAX_BIOMASS_BASE,
    baseBiomassPerSec: BASE_BIOMASS_PER_SEC,
    currentHostId: null,
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
    },
    skillAllocations: {},
    upgradeLevels: {},
    generators: {},
    lysateRaw: 0,
    lysateBanked: 0,
    acquiredEchoes: [],
    expeditions: [],
    maxExpeditionSlots: 1,
    totalBiomassEarned: 0,
    hostsDefeated: 0,
    gamePhase: 'awakening',
    water: 0,
    waterCap: MAX_WATER_BASE,
    nutrients: 0,
    nutrientsCap: MAX_NUTRIENT_BASE,
    mycelialNetwork: 0,
    tutorialUpgrades: { osmoticPump: false, enzymaticExudates: false },
    tutorialShockTimer: 0,
  };
}
