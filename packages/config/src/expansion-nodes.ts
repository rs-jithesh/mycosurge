/**
 * Landmark nodes nested inside the six reach wedges. Each node sits at a depth
 * along one wedge; growing that wedge past the node's depth claims it and grants
 * its reward — a small, spatial payoff for directing growth.
 */

export type NodeReward =
  | { kind: 'biomass'; amount: number }
  | { kind: 'lysate'; amount: number }
  | { kind: 'cap'; resource: 'water' | 'nutrients' | 'biomass'; amount: number };

export interface ExpansionNodeDef {
  id: string;
  name: string;
  /** Wedge index (0–5). */
  sector: number;
  /** Depth (mm) at which the node is reached. */
  depthMm: number;
  reward: NodeReward;
}

export const EXPANSION_NODES: ExpansionNodeDef[] = [
  {
    id: 'node.e.colony',
    name: 'Dense loam',
    sector: 0,
    depthMm: 7,
    reward: { kind: 'biomass', amount: 40 },
  },
  {
    id: 'node.e.deep',
    name: 'Mineral seam',
    sector: 0,
    depthMm: 12,
    reward: { kind: 'cap', resource: 'biomass', amount: 24 },
  },
  {
    id: 'node.se.pocket',
    name: 'Rich pocket',
    sector: 1,
    depthMm: 8,
    reward: { kind: 'biomass', amount: 55 },
  },
  {
    id: 'node.se.quarry',
    name: 'Lysate quarry',
    sector: 1,
    depthMm: 15,
    reward: { kind: 'lysate', amount: 12 },
  },
  {
    id: 'node.sw.damp',
    name: 'Damp hollow',
    sector: 2,
    depthMm: 9,
    reward: { kind: 'cap', resource: 'water', amount: 10 },
  },
  {
    id: 'node.sw.lode',
    name: 'Nutrient lode',
    sector: 2,
    depthMm: 16,
    reward: { kind: 'biomass', amount: 80 },
  },
  {
    id: 'node.w.strata',
    name: 'Old strata',
    sector: 3,
    depthMm: 10,
    reward: { kind: 'biomass', amount: 60 },
  },
  {
    id: 'node.w.vein',
    name: 'Deep vein',
    sector: 3,
    depthMm: 20,
    reward: { kind: 'cap', resource: 'nutrients', amount: 10 },
  },
  {
    id: 'node.nw.cache',
    name: 'Lysate cache',
    sector: 4,
    depthMm: 11,
    reward: { kind: 'lysate', amount: 15 },
  },
  {
    id: 'node.nw.bed',
    name: 'Broad bed',
    sector: 4,
    depthMm: 22,
    reward: { kind: 'cap', resource: 'biomass', amount: 48 },
  },
  {
    id: 'node.ne.sink',
    name: 'Nutrient sink',
    sector: 5,
    depthMm: 12,
    reward: { kind: 'biomass', amount: 70 },
  },
  {
    id: 'node.ne.bounty',
    name: 'Bounty',
    sector: 5,
    depthMm: 25,
    reward: { kind: 'biomass', amount: 120 },
  },
];
