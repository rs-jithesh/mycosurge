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
    id: 'cricket',
    name: 'Cricket',
    description: 'Erratic leaps make it hard to track.',
    difficulty: 4,
    stage: 4,
    biomassReward: 200,
    attackPatterns: ['erratic_swarm'],
    traits: ['dasher'],
  },
  {
    id: 'caterpillar',
    name: 'Caterpillar',
    description: 'Spiny hairs fire out when it is cornered.',
    difficulty: 4,
    stage: 4,
    biomassReward: 220,
    attackPatterns: ['scatter', 'burst'],
  },
  {
    id: 'wolf_spider',
    name: 'Wolf Spider',
    description: 'Spins web fields that slow the network.',
    difficulty: 5,
    stage: 4,
    biomassReward: 260,
    attackPatterns: ['pattern_combo', 'wave'],
    traits: ['shielded'],
  },
  {
    id: 'cicada_nymph',
    name: 'Cicada Nymph',
    description: 'Emerges mid-fight with a buzzing area attack.',
    difficulty: 5,
    stage: 4,
    biomassReward: 280,
    attackPatterns: ['multi_phase', 'summon'],
    traits: ['summoner'],
  },
  {
    id: 'snail',
    name: 'Snail',
    description: 'A hard shell shield and slick slime trails.',
    difficulty: 5,
    stage: 4,
    biomassReward: 300,
    attackPatterns: ['slow_spiral', 'burst'],
    traits: ['armored'],
  },
  {
    id: 'centipede',
    name: 'Centipede',
    description: 'A fast, segmented chain of legs.',
    difficulty: 6,
    stage: 4,
    biomassReward: 340,
    attackPatterns: ['erratic_swarm', 'homing'],
    traits: ['dasher'],
  },
  {
    id: 'tarantula',
    name: 'Tarantula (Boss)',
    description: 'Webs the arena, then leaps in for the kill.',
    difficulty: 7,
    stage: 4,
    isBoss: true,
    biomassReward: 500,
    attackPatterns: ['pattern_combo', 'geometric_lasers', 'summon'],
    traits: ['summoner', 'dasher'],
  },

  // ── Stage 5: Small vertebrates (60 cm–1 m) ──
  {
    id: 'millipede',
    name: 'Millipede',
    description: 'Bleeds poison clouds that linger.',
    difficulty: 5,
    stage: 5,
    biomassReward: 320,
    attackPatterns: ['scatter', 'multi_phase'],
  },
  {
    id: 'earthworm',
    name: 'Earthworm',
    description: 'Burrows under the plates and churns the ground.',
    difficulty: 5,
    stage: 5,
    biomassReward: 340,
    attackPatterns: ['wave', 'burst'],
  },
  {
    id: 'common_frog',
    name: 'Common Frog',
    description: 'Snaps out a tongue shot, then hops away.',
    difficulty: 5,
    stage: 5,
    biomassReward: 360,
    attackPatterns: ['homing', 'erratic_swarm'],
    traits: ['dasher'],
  },
  {
    id: 'shrew',
    name: 'Shrew',
    description: 'Fast, furious, and always aimed at the core.',
    difficulty: 6,
    stage: 5,
    biomassReward: 400,
    attackPatterns: ['burst', 'homing'],
  },
  {
    id: 'bat',
    name: 'Bat',
    description: 'Swooping passes across the dark.',
    difficulty: 6,
    stage: 5,
    biomassReward: 420,
    attackPatterns: ['wave', 'erratic_swarm'],
    traits: ['dasher'],
  },
  {
    id: 'snake',
    name: 'Snake (Boss)',
    description: 'Long sweeping arcs that coil around the arena.',
    difficulty: 8,
    stage: 5,
    isBoss: true,
    biomassReward: 650,
    attackPatterns: ['geometric_lasers', 'multi_phase', 'summon'],
    traits: ['armored'],
  },

  // ── Stage 6: Mammals & birds (1–5 m) ──
  {
    id: 'rat_pack',
    name: 'Rat Pack',
    description: 'A swarm that fires as one.',
    difficulty: 6,
    stage: 6,
    biomassReward: 440,
    attackPatterns: ['homing', 'erratic_swarm'],
    traits: ['summoner'],
  },
  {
    id: 'crow',
    name: 'Crow',
    description: 'Steals Lysate drops unless driven off first.',
    difficulty: 6,
    stage: 6,
    biomassReward: 460,
    attackPatterns: ['wave', 'scatter'],
    traits: ['dasher'],
  },
  {
    id: 'fox',
    name: 'Fox',
    description: 'Dashes in, then retreats before the spores land.',
    difficulty: 7,
    stage: 6,
    biomassReward: 520,
    attackPatterns: ['pattern_combo'],
    traits: ['dasher'],
  },
  {
    id: 'wild_boar',
    name: 'Wild Boar',
    description: 'Telegraphs a charge, then commits.',
    difficulty: 7,
    stage: 6,
    biomassReward: 560,
    attackPatterns: ['enrage_phase', 'burst'],
    traits: ['dasher'],
  },
  {
    id: 'deer',
    name: 'Deer',
    description: 'Fans a rack of shots across the clearing.',
    difficulty: 7,
    stage: 6,
    biomassReward: 580,
    attackPatterns: ['burst', 'spiral_nova'],
  },
  {
    id: 'wolf_alpha',
    name: 'Wolf Pack Alpha (Boss)',
    description: 'Coordinates the pack and calls reinforcements.',
    difficulty: 8,
    stage: 6,
    isBoss: true,
    biomassReward: 800,
    attackPatterns: ['multi_phase', 'summon', 'geometric_lasers'],
    traits: ['summoner', 'dasher'],
  },

  // ── Stage 7: Megafauna & structures (5–50 m) ──
  {
    id: 'bear',
    name: 'Bear',
    description: 'Heavy slams and a deep well of health.',
    difficulty: 8,
    stage: 7,
    biomassReward: 900,
    attackPatterns: ['burst', 'enrage_phase'],
    traits: ['armored'],
  },
  {
    id: 'termite_mound',
    name: 'Termite Mound City',
    description: 'A multi-chamber raid through living architecture.',
    difficulty: 8,
    stage: 7,
    biomassReward: 950,
    attackPatterns: ['summon', 'multi_phase'],
    traits: ['summoner', 'armored'],
  },
  {
    id: 'ancient_stag',
    name: 'Ancient Stag',
    description: 'Antlers grow into fresh shields as the fight drags on.',
    difficulty: 9,
    stage: 7,
    biomassReward: 1050,
    attackPatterns: ['spiral_nova', 'geometric_lasers'],
    traits: ['shielded'],
  },
  {
    id: 'ant_supercolony',
    name: 'Ant Supercolony',
    description: 'An endless stream of ants; strike the nest.',
    difficulty: 9,
    stage: 7,
    biomassReward: 1150,
    attackPatterns: ['summon', 'erratic_swarm'],
    traits: ['summoner'],
  },
  {
    id: 'elder_tree',
    name: 'Elder Tree (Boss)',
    description: 'Root arenas and a stationary, multi-phase defence.',
    difficulty: 10,
    stage: 7,
    isBoss: true,
    biomassReward: 1500,
    attackPatterns: ['multi_phase', 'geometric_lasers', 'summon'],
    traits: ['armored', 'summoner'],
  },

  // ── Stage 8: Apex (50 m+) ──
  {
    id: 'canopy',
    name: 'Canopy',
    description: 'A hub node linking many hosts at once.',
    difficulty: 9,
    stage: 8,
    biomassReward: 1300,
    attackPatterns: ['summon', 'spiral_nova'],
    traits: ['summoner'],
  },
  {
    id: 'rival_fungus',
    name: 'Rival Giant Fungus',
    description: 'Fights back with the network’s own mechanics.',
    difficulty: 10,
    stage: 8,
    biomassReward: 1500,
    attackPatterns: ['pattern_combo', 'multi_phase'],
    traits: ['revives'],
  },
  {
    id: 'hive_mind',
    name: 'Hive Mind',
    description: 'Controls the other hosts and shares their abilities.',
    difficulty: 10,
    stage: 8,
    biomassReward: 1700,
    attackPatterns: ['summon', 'homing', 'geometric_lasers'],
    traits: ['summoner'],
  },
  {
    id: 'apex_mycelium',
    name: 'Apex Mycelium (Final Boss)',
    description: 'The final test — every mechanic the network has learned, at once.',
    difficulty: 11,
    stage: 8,
    isBoss: true,
    biomassReward: 2500,
    attackPatterns: ['multi_phase', 'geometric_lasers', 'summon', 'enrage_phase'],
    traits: ['armored', 'summoner', 'revives'],
  },
];

/** The tutorial encounter never joins the pool or the bestiary. */
export const TUTORIAL_HOST_ID = 'soil_nematode';

export function isHostUnlocked(host: HostDef, reach: number): boolean {
  return reach >= (HOST_STAGE_REACH[host.stage] ?? 0);
}
