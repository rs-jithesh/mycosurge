import { describe, it, expect } from 'vitest';
import { EXPANSION_NODES, REACH_START } from '@mycosurge/config';
import { createInitialState } from './state';
import { claimReachedNodes, describeReward, getNodeMarkers } from './nodes';
import { growSector } from './sectors';

function activeState() {
  const state = createInitialState();
  state.gamePhase = 'active';
  state.mycelialNetwork = REACH_START;
  state.biomass = 100_000;
  return state;
}

describe('expansion landmarks', () => {
  it('claims a node once its wedge is grown deep enough', () => {
    const state = activeState();
    const target = EXPANSION_NODES.find((n) => n.sector === 0)!;

    while ((state.reachSectors[0] ?? 0) + REACH_START < target.depthMm) {
      growSector(state, 0);
    }
    const fresh = claimReachedNodes(state);
    expect(fresh.some((n) => n.id === target.id)).toBe(true);
    expect(state.claimedNodes).toContain(target.id);
  });

  it('is idempotent', () => {
    const state = activeState();
    state.reachSectors = [10, 0, 0, 0, 0, 0];
    state.mycelialNetwork = REACH_START + 10;

    claimReachedNodes(state);
    const count = state.claimedNodes.length;
    claimReachedNodes(state);
    expect(state.claimedNodes.length).toBe(count);
    expect(count).toBeGreaterThan(0);
  });

  it('marks claimed nodes for the map', () => {
    const state = activeState();
    state.claimedNodes = [EXPANSION_NODES[0].id];
    const marker = getNodeMarkers(state).find((m) => m.id === EXPANSION_NODES[0].id)!;
    expect(marker.claimed).toBe(true);
    expect(getNodeMarkers(state).some((m) => !m.claimed)).toBe(true);
  });

  it('describes rewards for the log', () => {
    expect(describeReward({ kind: 'biomass', amount: 40 })).toContain('40');
    expect(describeReward({ kind: 'lysate', amount: 12 })).toContain('12');
    expect(describeReward({ kind: 'cap', resource: 'water', amount: 10 })).toContain('10');
  });
});
