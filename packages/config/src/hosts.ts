export type Mobility = 'static' | 'drift' | 'orbit' | 'chase';

/**
 * Optional per-host AI overrides. The game engine derives sensible defaults
 * from `difficulty`; a host only needs this block to deviate from them.
 */
export interface HostAiDef {
  mobility?: Mobility;
  preferredRange?: number;
  moveSpeed?: number;
  turnRate?: number;
  aggression?: number;
  dodgeSkill?: number;
}

export interface HostDef {
  id: string;
  name: string;
  description: string;
  difficulty: number;
  tier: number;
  isBoss?: boolean;
  biomassReward: number;
  attackPatterns: string[];
  ai?: HostAiDef;
  echoes: {
    id: string;
    name: string;
    description: string;
  };
}

export const HOSTS: HostDef[] = [
  {
    id: 'soil_nematode',
    name: 'Soil Nematode',
    description:
      'A microscopic roundworm grazing on the outer hyphae. A simple, defenceless first prey.',
    difficulty: 1,
    tier: 0,
    biomassReward: 15,
    attackPatterns: ['slow_spiral'],
    echoes: {
      id: 'echo_nematode',
      name: 'Nematode Resilience',
      description: 'Passive biomass generation +3%',
    },
  },
  {
    id: 'fallen_leaf',
    name: 'Fallen Leaf',
    description: 'A decaying leaf on the forest floor. Minimal immune response.',
    difficulty: 1,
    tier: 1,
    biomassReward: 25,
    attackPatterns: ['slow_spiral'],
    echoes: {
      id: 'echo_leaf',
      name: 'Photosynthetic Trace',
      description: 'Passive biomass generation +5%',
    },
  },
  {
    id: 'garden_beetle',
    name: 'Garden Beetle',
    description: 'A common beetle. Its hemolymph carries mild toxins.',
    difficulty: 2,
    tier: 2,
    biomassReward: 50,
    attackPatterns: ['burst', 'scatter'],
    echoes: {
      id: 'echo_beetle',
      name: 'Chitinous Remnant',
      description: 'Spores deal +2 poison damage over time',
    },
  },
  {
    id: 'field_mouse',
    name: 'Field Mouse',
    description: 'A small mammal with a warm, nutrient-rich bloodstream.',
    difficulty: 3,
    tier: 2,
    biomassReward: 100,
    attackPatterns: ['erratic_swarm', 'wave'],
    echoes: {
      id: 'echo_mouse',
      name: 'Mammalian Metabolism',
      description: 'Base movement speed +10%',
    },
  },
  {
    id: 'urban_pigeon',
    name: 'Urban Pigeon',
    description: 'Adapted to city life. Its immune system is surprisingly robust.',
    difficulty: 4,
    tier: 3,
    biomassReward: 180,
    attackPatterns: ['homing', 'spiral_nova'],
    echoes: {
      id: 'echo_pigeon',
      name: 'Avian Adaptability',
      description: 'Fire rate +8%',
    },
  },
  {
    id: 'stray_cat',
    name: 'Stray Cat',
    description: 'A formidable host. Feline immune responses are notoriously aggressive.',
    difficulty: 5,
    tier: 4,
    biomassReward: 300,
    attackPatterns: ['pattern_combo', 'enrage_phase'],
    echoes: {
      id: 'echo_cat',
      name: 'Reflex Override',
      description: 'Dodge window +15%',
    },
  },
  {
    id: 'lab_rat',
    name: 'Laboratory Rat (Boss)',
    description: 'An enhanced specimen. Heavy immunosuppressants create unpredictable defenses.',
    difficulty: 7,
    tier: 5,
    isBoss: true,
    biomassReward: 600,
    attackPatterns: ['multi_phase', 'geometric_lasers', 'summon'],
    echoes: {
      id: 'echo_lab',
      name: 'Experimental DNA',
      description: 'Grants +3 genome points for mutations',
    },
  },
  {
    id: 'compost_worm',
    name: 'Compost Worm',
    description: 'Dense microbial colonies. Slow but tenacious regeneration.',
    difficulty: 1,
    tier: 1,
    biomassReward: 35,
    attackPatterns: ['slow_spiral', 'wave'],
    echoes: {
      id: 'echo_worm',
      name: 'Regenerative Matrix',
      description: 'Passive HP regen +1/sec',
    },
  },
  {
    id: 'pond_frog',
    name: 'Pond Frog',
    description: 'Amphibian host. Moist mucosal barriers resist spore adhesion.',
    difficulty: 3,
    tier: 2,
    biomassReward: 130,
    attackPatterns: ['burst', 'homing', 'scatter'],
    echoes: {
      id: 'echo_frog',
      name: 'Amphibious Membrane',
      description: 'Projectile evasion +12%',
    },
  },
  {
    id: 'backyard_squirrel',
    name: 'Backyard Squirrel',
    description: 'Erratic movements make it a difficult target. High metabolic rate.',
    difficulty: 4,
    tier: 3,
    biomassReward: 220,
    attackPatterns: ['erratic_swarm', 'scatter', 'wave'],
    echoes: {
      id: 'echo_squirrel',
      name: 'Neural Agility',
      description: 'Fire rate +10%',
    },
  },
  {
    id: 'feral_raccoon',
    name: 'Feral Raccoon',
    description: 'Omnivorous immune system. Adapts rapidly to spore patterns.',
    difficulty: 6,
    tier: 4,
    biomassReward: 450,
    attackPatterns: ['pattern_combo', 'homing', 'spiral_nova', 'enrage_phase'],
    echoes: {
      id: 'echo_raccoon',
      name: 'Adaptive Cortex',
      description: 'Spores deal +15% damage',
    },
  },
];

/** Number of distinct echoes required before each tier enters the sonar pool. */
export const HOST_TIER_UNLOCK: Record<number, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 6,
  5: 9,
};

export function isHostUnlocked(host: HostDef, echoCount: number): boolean {
  return echoCount >= (HOST_TIER_UNLOCK[host.tier] ?? 0);
}
