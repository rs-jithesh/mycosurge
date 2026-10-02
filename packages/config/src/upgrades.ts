export type UpgradeCategory = 'mycelial' | 'incursion' | 'structural';

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  category: UpgradeCategory;
  baseCost: number;
  costScale: number;
  maxLevel: number;
  prereqs: string[];
}

export const UPGRADES: UpgradeDef[] = [
  // ── MYCELIAL NETWORK ──
  {
    id: 'hygroscopic_mesh',
    name: 'Hygroscopic Mesh',
    description:
      'Hyphae develop water-attracting surface proteins, increasing passive Water regeneration.',
    category: 'mycelial',
    baseCost: 10,
    costScale: 1.5,
    maxLevel: 5,
    prereqs: [],
  },
  {
    id: 'vacuolar_expansion',
    name: 'Vacuolar Expansion',
    description: 'Enlarges the fungal vacuole system, increasing Water storage capacity.',
    category: 'mycelial',
    baseCost: 15,
    costScale: 1.5,
    maxLevel: 5,
    prereqs: ['hygroscopic_mesh'],
  },
  {
    id: 'osmotic_regulation_v2',
    name: 'Osmotic Regulation',
    description:
      'Improves water balance under metabolic stress, reducing Water drain during combat.',
    category: 'mycelial',
    baseCost: 25,
    costScale: 1.5,
    maxLevel: 3,
    prereqs: ['vacuolar_expansion'],
  },
  {
    id: 'aquaporin_channels',
    name: 'Aquaporin Channels',
    description: 'Biological water transport proteins that speed hyphal water movement.',
    category: 'mycelial',
    baseCost: 20,
    costScale: 1.5,
    maxLevel: 3,
    prereqs: ['hygroscopic_mesh'],
  },
  {
    id: 'exoenzyme_cascade',
    name: 'Exoenzyme Cascade',
    description:
      'More enzymes yield more extractable material, increasing Nutrients gain per cycle.',
    category: 'mycelial',
    baseCost: 10,
    costScale: 1.5,
    maxLevel: 5,
    prereqs: [],
  },
  {
    id: 'chitin_recycling',
    name: 'Chitin Recycling',
    description: 'Reclaims structural nutrients from old hyphal walls, reducing Nutrients drain.',
    category: 'mycelial',
    baseCost: 15,
    costScale: 1.5,
    maxLevel: 3,
    prereqs: ['exoenzyme_cascade'],
  },
  {
    id: 'rhizomorphic_networking',
    name: 'Rhizomorphic Networking',
    description: 'Thick bundled hyphae transport nutrients efficiently over distance.',
    category: 'mycelial',
    baseCost: 25,
    costScale: 1.5,
    maxLevel: 3,
    prereqs: ['chitin_recycling'],
  },
  {
    id: 'nitrogen_fixation_symbiosis',
    name: 'Nitrogen Fixation Symbiosis',
    description: 'Partner with nitrogen-fixing bacteria for a slow passive Nutrients trickle.',
    category: 'mycelial',
    baseCost: 30,
    costScale: 1.5,
    maxLevel: 1,
    prereqs: ['exoenzyme_cascade'],
  },

  // ── COMBAT UPGRADES ──
  {
    id: 'spore_veil',
    name: 'Spore Veil',
    description: 'Release a defensive cloud of spores when a host attacks.',
    category: 'incursion',
    baseCost: 20,
    costScale: 1.5,
    maxLevel: 3,
    prereqs: [],
  },
  {
    id: 'enzymatic_breach',
    name: 'Enzymatic Breach',
    description: 'Digestive enzymes eat through a host’s defenses.',
    category: 'incursion',
    baseCost: 30,
    costScale: 1.5,
    maxLevel: 3,
    prereqs: [],
  },
  {
    id: 'hyphal_invasion',
    name: 'Hyphal Invasion',
    description: 'Thread hyphae directly through host tissue to weaken it.',
    category: 'incursion',
    baseCost: 40,
    costScale: 1.5,
    maxLevel: 3,
    prereqs: [],
  },
  {
    id: 'neural_override',
    name: 'Neural Override',
    description: 'Overwhelm a host’s nervous system to gain the upper hand.',
    category: 'incursion',
    baseCost: 50,
    costScale: 1.5,
    maxLevel: 1,
    prereqs: [],
  },

  // ── STRUCTURAL ──
  {
    id: 'hyphal_density_protocol',
    name: 'Hyphal Density Protocol',
    description: 'Growing more hyphae per unit area increases structural mass and Biomass cap.',
    category: 'structural',
    baseCost: 10,
    costScale: 1.5,
    maxLevel: 5,
    prereqs: [],
  },
  {
    id: 'melanin_shielding',
    name: 'Melanin Shielding',
    description: 'Melanin in cell walls provides resilience against environmental stress.',
    category: 'structural',
    baseCost: 20,
    costScale: 1.5,
    maxLevel: 3,
    prereqs: ['hyphal_density_protocol'],
  },
  {
    id: 'sporulation_burst',
    name: 'Sporulation Burst',
    description:
      'Redirects metabolic energy into rapid spore production for a temporary Biomass spike.',
    category: 'structural',
    baseCost: 35,
    costScale: 1.5,
    maxLevel: 3,
    prereqs: ['melanin_shielding'],
  },
  {
    id: 'anastomosis_bridges',
    name: 'Anastomosis Bridges',
    description:
      'Hyphae fuse to share resources across the network, compensating for local deficits.',
    category: 'structural',
    baseCost: 25,
    costScale: 1.5,
    maxLevel: 1,
    prereqs: ['hyphal_density_protocol'],
  },
  {
    id: 'extended_range',
    name: 'Extended Range',
    description: 'Widen the radar array so it can hold one more contact signal at a time.',
    category: 'structural',
    baseCost: 20,
    costScale: 1.5,
    maxLevel: 1,
    prereqs: [],
  },
];
