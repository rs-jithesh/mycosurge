import { HOST_STAGE_REACH } from './stages';

export type Mobility = 'static' | 'drift' | 'orbit' | 'chase';

/**
 * Behaviour traits a host can carry. These are the roster's "one new idea per host"
 * vocabulary; a boss combines traits the player has already learned. Only a few are
 * wired into combat today — the rest are recorded here so content can be authored
 * ahead of the engine hooks.
 */
export type HostTrait =
  | 'armored'
  | 'splits'
  | 'revives'
  | 'leech'
  | 'summoner'
  | 'dasher'
  | 'shielded'
  | 'clones';

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

export interface HostEchoDef {
  id: string;
  name: string;
  description: string;
}

export interface HostDef {
  id: string;
  name: string;
  description: string;
  difficulty: number;
  /** Scale band (1–8) this host belongs to; gates it and places it on the map. */
  stage: number;
  isBoss?: boolean;
  biomassReward: number;
  attackPatterns: string[];
  traits?: HostTrait[];
  ai?: HostAiDef;
  /**
   * Optional evolutionary echo. Echoes are being reworked; new hosts omit this
   * until the echo policy lands, and victory handling skips hosts without one.
   */
  echoes?: HostEchoDef;
}

export const HOSTS: HostDef[] = [
  // ── Stage 1: Microbial (5–10 mm) ──
  {
    id: 'bacterial_film',
    name: 'Bacterial Film',
    description: 'A slick mat of biofilm, barely alive and barely aware. The first grazing.',
    difficulty: 1,
    stage: 1,
    biomassReward: 15,
    attackPatterns: ['slow_spiral'],
  },
  {
    id: 'yeast_bloom',
    name: 'Yeast Bloom',
    description: 'Budding colonies that split apart when disturbed.',
    difficulty: 1,
    stage: 1,
    biomassReward: 20,
    attackPatterns: ['scatter'],
    traits: ['splits'],
  },
  {
    id: 'ciliate',
    name: 'Ciliate',
    description: 'A darting protozoan, all whip and urgency.',
    difficulty: 2,
    stage: 1,
    biomassReward: 30,
    attackPatterns: ['homing'],
    traits: ['dasher'],
  },
  {
    id: 'vampire_amoeba',
    name: 'Vampire Amoeba',
    description: 'Clings to a hypha and drinks it slowly dry.',
    difficulty: 2,
    stage: 1,
    biomassReward: 35,
    attackPatterns: ['wave'],
    traits: ['leech'],
  },
  {
    id: 'rotifer',
    name: 'Rotifer',
    description: 'A whirling crown of cilia, spinning its food toward itself.',
    difficulty: 2,
    stage: 1,
    biomassReward: 40,
    attackPatterns: ['spiral_nova'],
  },
  {
    id: 'fallen_leaf',
    name: 'Fallen Leaf',
    description: 'A decaying leaf on the forest floor. Minimal immune response.',
    difficulty: 1,
    stage: 1,
    biomassReward: 25,
    attackPatterns: ['slow_spiral'],
    echoes: {
      id: 'echo_leaf',
      name: 'Photosynthetic Trace',
      description: 'Passive biomass generation +5%',
    },
  },
  {
    id: 'nematode_brood',
    name: 'Nematode Brood (Boss)',
    description: 'A writhing knot of roundworms. The first true gate of the mm scale.',
    difficulty: 3,
    stage: 1,
    isBoss: true,
    biomassReward: 80,
    attackPatterns: ['wave', 'summon'],
    traits: ['summoner'],
  },
  {
    id: 'soil_nematode',
    name: 'Soil Nematode',
    description:
      'A microscopic roundworm grazing on the outer hyphae. A simple, defenceless first prey.',
    difficulty: 1,
    stage: 1,
    biomassReward: 15,
    attackPatterns: ['slow_spiral'],
    echoes: {
      id: 'echo_nematode',
      name: 'Nematode Resilience',
      description: 'Passive biomass generation +3%',
    },
  },

  // ── Stage 2: Soil mesofauna (1–5 cm) ──
  {
    id: 'oribatid_mite',
    name: 'Oribatid Mite',
    description: 'A plated grazer. Its armored back shrugs off shots — strike from the side.',
    difficulty: 2,
    stage: 2,
    biomassReward: 45,
    attackPatterns: ['burst'],
    traits: ['armored'],
  },
  {
    id: 'springtail',
    name: 'Springtail',
    description: 'Grazes hyphae, then springs away and fires where it lands.',
    difficulty: 2,
    stage: 2,
    biomassReward: 50,
    attackPatterns: ['erratic_swarm'],
    traits: ['dasher'],
  },
  {
    id: 'tardigrade',
    name: 'Tardigrade',
    description: 'The water bear. Shrugs off damage and curls back from the brink once.',
    difficulty: 3,
    stage: 2,
    biomassReward: 60,
    attackPatterns: ['slow_spiral', 'burst'],
    traits: ['revives'],
  },
  {
    id: 'gnat_larva',
    name: 'Fungus Gnat Larva',
    description: 'A translucent grub that siphons nutrients while it lives.',
    difficulty: 3,
    stage: 2,
    biomassReward: 70,
    attackPatterns: ['wave'],
    traits: ['leech'],
  },
  {
    id: 'aphid',
    name: 'Aphid',
    description: 'Doubles itself if left alone. Kill it quickly or face the swarm.',
    difficulty: 3,
    stage: 2,
    biomassReward: 75,
    attackPatterns: ['scatter', 'homing'],
    traits: ['clones'],
  },
  {
    id: 'pseudoscorpion',
    name: 'Pseudoscorpion',
    description: 'A tiny soil predator with a telegraphed, decisive claw lunge.',
    difficulty: 4,
    stage: 2,
    biomassReward: 90,
    attackPatterns: ['burst'],
    traits: ['dasher'],
  },
  {
    id: 'compost_worm',
    name: 'Compost Worm',
    description: 'Dense microbial colonies. Slow but tenacious regeneration.',
    difficulty: 1,
    stage: 2,
    biomassReward: 35,
    attackPatterns: ['slow_spiral', 'wave'],
    echoes: {
      id: 'echo_worm',
      name: 'Regenerative Matrix',
      description: 'Passive HP regen +1/sec',
    },
  },
  {
    id: 'mite_colony',
    name: 'Mite Colony (Boss)',
    description: 'An armored aggregation that sheds plates as it is worn down.',
    difficulty: 4,
    stage: 2,
    isBoss: true,
    biomassReward: 160,
    attackPatterns: ['multi_phase', 'summon'],
    traits: ['armored', 'summoner'],
  },

  // ── Stage 3: Insects (5–20 cm) ──
  {
    id: 'termite_worker',
    name: 'Termite Worker',
    description: 'Marches in columns, easy to pick off one at a time.',
    difficulty: 3,
    stage: 3,
    biomassReward: 100,
    attackPatterns: ['slow_spiral', 'wave'],
    traits: ['summoner'],
  },
  {
    id: 'termite_soldier',
    name: 'Termite Soldier',
    description: 'A broad armored head that blocks the shots that reach it.',
    difficulty: 4,
    stage: 3,
    biomassReward: 120,
    attackPatterns: ['burst'],
    traits: ['armored'],
  },
  {
    id: 'ant_worker',
    name: 'Ant Worker',
    description: 'Advances in tight columns, following the scent of the network.',
    difficulty: 4,
    stage: 3,
    biomassReward: 130,
    attackPatterns: ['homing', 'scatter'],
    traits: ['summoner'],
  },
  {
    id: 'carpenter_ant',
    name: 'Carpenter Ant',
    description: 'A big, deliberate host. The first species the network can capture and steer.',
    difficulty: 4,
    stage: 3,
    biomassReward: 140,
    attackPatterns: ['pattern_combo'],
  },
  {
    id: 'leafcutter_ant',
    name: 'Leafcutter Ant',
    description: 'Carries a leaf as a shield — a rival fungus farmer.',
    difficulty: 5,
    stage: 3,
    biomassReward: 160,
    attackPatterns: ['burst', 'wave'],
    traits: ['shielded'],
  },
  {
    id: 'beetle_grub',
    name: 'Beetle Grub',
    description: 'Enormous and slow. Its bulk lands like a hammer.',
    difficulty: 5,
    stage: 3,
    biomassReward: 180,
    attackPatterns: ['enrage_phase', 'summon'],
  },
  {
    id: 'termite_queen',
    name: "Termite Queen's Chamber (Boss)",
    description: 'The colony heart. Sends workers and soldiers in waves while you dig in.',
    difficulty: 6,
    stage: 3,
    isBoss: true,
    biomassReward: 300,
    attackPatterns: ['multi_phase', 'summon', 'geometric_lasers'],
    traits: ['summoner', 'armored'],
  },

  // ── Stage 4: Larger arthropods (20–60 cm) ──
  {
    id: 'garden_beetle',
    name: 'Garden Beetle',
    description: 'A common beetle. Its hemolymph carries mild toxins.',
    difficulty: 2,
    stage: 4,
    biomassReward: 50,
    attackPatterns: ['burst', 'scatter'],
    echoes: {
      id: 'echo_beetle',
      name: 'Chitinous Remnant',
      description: 'Spores deal +2 poison damage over time',
    },
  },

  // ── Stage 5: Small vertebrates (60 cm–1 m) ──
  {
    id: 'pond_frog',
    name: 'Pond Frog',
    description: 'Amphibian host. Moist mucosal barriers resist spore adhesion.',
    difficulty: 3,
    stage: 5,
    biomassReward: 130,
    attackPatterns: ['burst', 'homing', 'scatter'],
    echoes: {
      id: 'echo_frog',
      name: 'Amphibious Membrane',
      description: 'Projectile evasion +12%',
    },
  },

  // ── Stage 6: Mammals & birds (1–5 m) ──
  {
    id: 'field_mouse',
    name: 'Field Mouse',
    description: 'A small mammal with a warm, nutrient-rich bloodstream.',
    difficulty: 3,
    stage: 6,
    biomassReward: 100,
    attackPatterns: ['erratic_swarm', 'wave'],
    echoes: {
      id: 'echo_mouse',
      name: 'Mammalian Metabolism',
      description: 'Base movement speed +10%',
    },
  },
  {
    id: 'backyard_squirrel',
    name: 'Backyard Squirrel',
    description: 'Erratic movements make it a difficult target. High metabolic rate.',
    difficulty: 4,
    stage: 6,
    biomassReward: 220,
    attackPatterns: ['erratic_swarm', 'scatter', 'wave'],
    echoes: {
      id: 'echo_squirrel',
      name: 'Neural Agility',
      description: 'Fire rate +10%',
    },
  },
  {
    id: 'urban_pigeon',
    name: 'Urban Pigeon',
    description: 'Adapted to city life. Its immune system is surprisingly robust.',
    difficulty: 4,
    stage: 6,
    biomassReward: 180,
    attackPatterns: ['homing', 'spiral_nova'],
    echoes: {
      id: 'echo_pigeon',
      name: 'Avian Adaptability',
      description: 'Fire rate +8%',
    },
  },
  {
    id: 'feral_raccoon',
    name: 'Feral Raccoon',
    description: 'Omnivorous immune system. Adapts rapidly to spore patterns.',
    difficulty: 6,
    stage: 6,
    biomassReward: 450,
    attackPatterns: ['pattern_combo', 'homing', 'spiral_nova', 'enrage_phase'],
    echoes: {
      id: 'echo_raccoon',
      name: 'Adaptive Cortex',
      description: 'Spores deal +15% damage',
    },
  },
  {
    id: 'stray_cat',
    name: 'Stray Cat',
    description: 'A formidable host. Feline immune responses are notoriously aggressive.',
    difficulty: 5,
    stage: 6,
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
    stage: 6,
    isBoss: true,
    biomassReward: 600,
    attackPatterns: ['multi_phase', 'geometric_lasers', 'summon'],
    echoes: {
      id: 'echo_lab',
      name: 'Experimental DNA',
      description: 'Grants +3 genome points for mutations',
    },
  },
];

/** The tutorial encounter never joins the pool or the bestiary. */
export const TUTORIAL_HOST_ID = 'soil_nematode';

export function isHostUnlocked(host: HostDef, reach: number): boolean {
  return reach >= (HOST_STAGE_REACH[host.stage] ?? 0);
}
