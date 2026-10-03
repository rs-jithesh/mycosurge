export const SKILL_TREES = {
  AGGRESSION: 'aggression',
  RESILIENCE: 'resilience',
  PROLIFERATION: 'proliferation',
} as const;

export type SkillTree = (typeof SKILL_TREES)[keyof typeof SKILL_TREES];

export interface SkillNodeDef {
  id: string;
  tree: SkillTree;
  name: string;
  description: string;
  prerequisites: string[];
  maxLevel: number;
  /** Genome points spent per level. Defaults to 1 when omitted; capstones cost 3. */
  pointCost?: number;
}

export const SKILL_NODES: SkillNodeDef[] = [
  {
    id: 'spore_speed',
    tree: 'aggression',
    name: 'Spore Speed',
    description: 'Increase projectile speed by 10% per level',
    prerequisites: [],
    maxLevel: 3,
  },
  {
    id: 'fire_rate',
    tree: 'aggression',
    name: 'Fire Rate',
    description: 'Increase fire rate by 15% per level',
    prerequisites: ['spore_speed'],
    maxLevel: 3,
  },
  {
    id: 'multi_shot',
    tree: 'aggression',
    name: 'Multi-Shot',
    description: 'Fire additional projectiles per volley',
    prerequisites: ['fire_rate'],
    maxLevel: 2,
  },
  {
    id: 'piercing_shot',
    tree: 'aggression',
    name: 'Piercing Shot',
    description: 'Projectiles pierce through one enemy',
    prerequisites: ['multi_shot'],
    maxLevel: 1,
  },
  {
    id: 'overcharge',
    tree: 'aggression',
    name: 'Overcharge',
    description: 'Increase damage by 20% per level',
    prerequisites: ['spore_speed'],
    maxLevel: 3,
  },
  {
    id: 'chain_reaction',
    tree: 'aggression',
    name: 'Chain Reaction',
    description: 'Destroyed enemies explode, damaging nearby',
    prerequisites: ['piercing_shot', 'overcharge'],
    maxLevel: 1,
    pointCost: 3,
  },
  {
    id: 'compact_core',
    tree: 'resilience',
    name: 'Compact Core',
    description: 'Reduce hitbox size by 10% per level',
    prerequisites: [],
    maxLevel: 3,
  },
  {
    id: 'spore_shield',
    tree: 'resilience',
    name: 'Spore Shield',
    description: 'Absorb extra hit per level before trauma',
    prerequisites: ['compact_core'],
    maxLevel: 3,
  },
  {
    id: 'trauma_recovery',
    tree: 'resilience',
    name: 'Trauma Recovery',
    description: 'Reduce trauma duration by 15% per level',
    prerequisites: ['spore_shield'],
    maxLevel: 3,
  },
  {
    id: 'regenerative_spores',
    tree: 'resilience',
    name: 'Regenerative Spores',
    description: 'Regenerate 0.5 HP per second in combat per level',
    prerequisites: ['compact_core'],
    maxLevel: 2,
  },
  {
    id: 'adaptive_membrane',
    tree: 'resilience',
    name: 'Adaptive Membrane',
    description: 'Reduce damage taken by 15% per level',
    prerequisites: ['trauma_recovery', 'regenerative_spores'],
    maxLevel: 2,
  },
  {
    id: 'emergency_evac',
    tree: 'resilience',
    name: 'Emergency Evac',
    description: 'Auto-retreat at 1 HP instead of dying',
    prerequisites: ['adaptive_membrane'],
    maxLevel: 1,
    pointCost: 3,
  },
  {
    id: 'mycelial_expansion',
    tree: 'proliferation',
    name: 'Mycelial Expansion',
    description: 'Increase max biomass cap by 75% per level',
    prerequisites: [],
    maxLevel: 3,
  },
  {
    id: 'metabolic_efficiency',
    tree: 'proliferation',
    name: 'Metabolic Efficiency',
    description: 'Increase passive biomass gen by 25% per level',
    prerequisites: ['mycelial_expansion'],
    maxLevel: 3,
  },
  {
    id: 'rapid_scouts',
    tree: 'proliferation',
    name: 'Rapid Scouts',
    description: 'Reduce expedition time by 20% per level',
    prerequisites: ['metabolic_efficiency'],
    maxLevel: 3,
  },
  {
    id: 'resource_routing',
    tree: 'proliferation',
    name: 'Resource Routing',
    description: 'Increase expedition rewards by 30% per level',
    prerequisites: ['mycelial_expansion'],
    maxLevel: 2,
  },
  {
    id: 'nitrogen_fixation',
    tree: 'proliferation',
    name: 'Nitrogen Fixation',
    description: 'Partner with nitrogen-fixing bacteria for a passive +0.5 Nutrients/s trickle',
    prerequisites: ['mycelial_expansion'],
    maxLevel: 1,
  },
  {
    id: 'dormant_spores',
    tree: 'proliferation',
    name: 'Dormant Spores',
    description: 'Increase offline progress rate by 25% per level (base rate 50%)',
    prerequisites: ['rapid_scouts', 'resource_routing'],
    maxLevel: 2,
  },
  {
    id: 'overmind',
    tree: 'proliferation',
    name: 'Overmind',
    description: 'Run expeditions on 2 hosts simultaneously',
    prerequisites: ['dormant_spores'],
    maxLevel: 1,
    pointCost: 3,
  },
  {
    id: 'extended_range',
    tree: 'proliferation',
    name: 'Extended Range',
    description: 'Widen the radar array to hold one more contact signal at a time',
    prerequisites: [],
    maxLevel: 1,
  },
];

export const SKILL_TREE_ORDER: SkillTree[] = ['aggression', 'resilience', 'proliferation'];
