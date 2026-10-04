import { EXPANSION_NODES } from '@mycosurge/config';
import type { ExpansionNodeDef, NodeReward } from '@mycosurge/config';
import type { GameState } from './state';
import { addBiomass } from './math';
import { getSectorDepths } from './sectors';

/**
 * Landmark nodes nested in the reach wedges. Growing a wedge past a node's depth
 * claims it and grants its reward. Claiming is idempotent and deterministic.
 */

export interface NodeMarker extends ExpansionNodeDef {
  claimed: boolean;
}

export function getNodeMarkers(state: GameState): NodeMarker[] {
  const claimed = new Set(state.claimedNodes ?? []);
  return EXPANSION_NODES.map((node) => ({ ...node, claimed: claimed.has(node.id) }));
}

function applyReward(state: GameState, reward: NodeReward): void {
  switch (reward.kind) {
    case 'biomass':
      addBiomass(state, reward.amount);
      break;
    case 'lysate':
      state.lysateBanked += reward.amount;
      break;
    case 'cap':
      if (reward.resource === 'water') state.waterCap += reward.amount;
      else if (reward.resource === 'nutrients') state.nutrientsCap += reward.amount;
      else state.maxBiomass += reward.amount;
      break;
  }
}

/** Short, player-facing description of a node's reward. */
export function describeReward(reward: NodeReward): string {
  switch (reward.kind) {
    case 'biomass':
      return `+${reward.amount} Biomass`;
    case 'lysate':
      return `+${reward.amount} Lysate`;
    case 'cap':
      return `+${reward.amount} ${reward.resource} cap`;
  }
}

/** Claim every node whose wedge has grown to its depth. Returns the new ones. */
export function claimReachedNodes(state: GameState): ExpansionNodeDef[] {
  const depths = getSectorDepths(state);
  const claimed = new Set(state.claimedNodes ?? []);
  const fresh: ExpansionNodeDef[] = [];

  for (const node of EXPANSION_NODES) {
    if (claimed.has(node.id)) continue;
    if ((depths[node.sector] ?? 0) + 1e-9 >= node.depthMm) {
      state.claimedNodes = [...(state.claimedNodes ?? []), node.id];
      applyReward(state, node.reward);
      fresh.push(node);
    }
  }

  return fresh;
}
