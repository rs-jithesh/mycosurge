import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUnlockedHosts,
  getRadarSlots,
  pingSubstrate,
  scanContact,
  engageContact,
  dismissContact,
  tickRadar,
  clearActiveEncounter,
  getActiveStrain,
  resetRadarSeq,
} from './radar';
import { applyVictory, calculateVictoryReward } from './combat';
import { createInitialState, type GameState, type RadarContact } from './state';

function makeContact(overrides: Partial<RadarContact> = {}): RadarContact {
  return {
    id: 'test-contact',
    hostId: 'fallen_leaf',
    strainId: 'normal',
    revealed: false,
    timeRemaining: 120,
    totalTime: 120,
    ...overrides,
  };
}

beforeEach(() => {
  resetRadarSeq();
});

describe('getUnlockedHosts', () => {
  it('starts with only tier 1 hosts and never the tutorial host', () => {
    const state = createInitialState();
    const ids = getUnlockedHosts(state).map((h) => h.id);
    expect(ids.sort()).toEqual(['compost_worm', 'fallen_leaf']);
    expect(ids).not.toContain('soil_nematode');
  });

  it('unlocks tier 2 at 2 echoes', () => {
    const state = createInitialState();
    state.acquiredEchoes = ['echo_leaf', 'echo_worm'];
    expect(getUnlockedHosts(state).some((h) => h.id === 'garden_beetle')).toBe(true);
    expect(getUnlockedHosts(state).some((h) => h.id === 'urban_pigeon')).toBe(false);
  });

  it('gates the boss until 9 echoes', () => {
    const state = createInitialState();
    state.acquiredEchoes = new Array(8).fill('x');
    expect(getUnlockedHosts(state).some((h) => h.id === 'lab_rat')).toBe(false);
    state.acquiredEchoes = new Array(9).fill('x');
    expect(getUnlockedHosts(state).some((h) => h.id === 'lab_rat')).toBe(true);
  });
});

describe('getRadarSlots', () => {
  it('defaults to 2 and grows with the extended_range mutation', () => {
    const state = createInitialState();
    expect(getRadarSlots(state)).toBe(2);
    state.skillAllocations['extended_range'] = 1;
    expect(getRadarSlots(state)).toBe(3);
  });
});

describe('pingSubstrate', () => {
  it('spends water and adds a blip', () => {
    const state = createInitialState();
    state.water = 20;
    expect(pingSubstrate(state)).toBe(true);
    expect(state.water).toBe(15);
    expect(state.contacts).toHaveLength(1);
    expect(state.contacts[0].revealed).toBe(false);
  });

  it('fails without enough water', () => {
    const state = createInitialState();
    state.water = 3;
    expect(pingSubstrate(state)).toBe(false);
    expect(state.contacts).toHaveLength(0);
  });

  it('respects the radar slot limit', () => {
    const state = createInitialState();
    state.water = 100;
    expect(pingSubstrate(state)).toBe(true);
    expect(pingSubstrate(state)).toBe(true);
    expect(pingSubstrate(state)).toBe(false);
    expect(state.contacts).toHaveLength(2);
  });
});

describe('scanContact', () => {
  it('reveals a blip for 5 water', () => {
    const state = createInitialState();
    state.water = 100;
    state.contacts = [makeContact()];
    expect(scanContact(state, 'test-contact')).toBe(true);
    expect(state.water).toBe(95);
    expect(state.contacts[0].revealed).toBe(true);
  });

  it('fails without enough water', () => {
    const state = createInitialState();
    state.water = 2;
    state.contacts = [makeContact()];
    expect(scanContact(state, 'test-contact')).toBe(false);
    expect(state.contacts[0].revealed).toBe(false);
  });
});

describe('tickRadar', () => {
  it('spawns a contact once the timer elapses', () => {
    const state = createInitialState();
    state.sonarTimer = 0;
    const spawned = tickRadar(state, 1);
    expect(spawned).not.toBeNull();
    expect(state.contacts).toHaveLength(1);
  });

  it('does not spawn while a host is engaged', () => {
    const state = createInitialState();
    state.currentHostId = 'fallen_leaf';
    state.sonarTimer = 0;
    expect(tickRadar(state, 1)).toBeNull();
    expect(state.contacts).toHaveLength(0);
  });

  it('expires contacts past their linger time', () => {
    const state = createInitialState();
    state.currentHostId = 'fallen_leaf';
    state.contacts = [makeContact({ timeRemaining: 5 })];
    tickRadar(state, 10);
    expect(state.contacts).toHaveLength(0);
  });
});

describe('engageContact', () => {
  it('requires a revealed contact', () => {
    const state = createInitialState();
    state.contacts = [makeContact()];
    expect(engageContact(state, 'test-contact')).toBe(false);
    state.contacts[0].revealed = true;
    expect(engageContact(state, 'test-contact')).toBe(true);
    expect(state.currentHostId).toBe('fallen_leaf');
    expect(state.currentContactId).toBe('test-contact');
  });

  it('stores the contact strain as the active strain', () => {
    const state = createInitialState();
    state.contacts = [makeContact({ strainId: 'armored', revealed: true })];
    engageContact(state, 'test-contact');
    expect(getActiveStrain(state).id).toBe('armored');
  });

  it('clears the contact when the encounter ends', () => {
    const state = createInitialState();
    state.contacts = [makeContact({ revealed: true })];
    engageContact(state, 'test-contact');
    clearActiveEncounter(state);
    expect(state.currentHostId).toBeNull();
    expect(state.currentContactId).toBeNull();
    expect(state.contacts).toHaveLength(0);
    expect(state.activeStrainId).toBe('normal');
  });
});

describe('dismissContact', () => {
  it('removes a contact', () => {
    const state = createInitialState();
    state.contacts = [makeContact()];
    dismissContact(state, 'test-contact');
    expect(state.contacts).toHaveLength(0);
  });
});

describe('per-host assimilation', () => {
  it('adds progress to the fought host only', () => {
    const state: GameState = createInitialState();
    state.water = state.waterCap;
    state.nutrients = state.nutrientsCap;
    calculateVictoryReward(state, 'fallen_leaf');
    expect(state.hostAssimilation['fallen_leaf']).toBe(15);
    expect(state.hostAssimilation['compost_worm']).toBeUndefined();
  });

  it('unlocks the echo once and bumps hostsDefeated once', () => {
    const state: GameState = createInitialState();
    state.water = state.waterCap;
    state.nutrients = state.nutrientsCap;
    for (let i = 0; i < 7; i++) {
      applyVictory(state, 'fallen_leaf');
    }
    expect(state.acquiredEchoes).toContain('echo_leaf');
    expect(state.hostsDefeated).toBe(1);

    applyVictory(state, 'fallen_leaf');
    expect(state.hostsDefeated).toBe(1);
  });
});

describe('strain rewards', () => {
  it('applies the strain reward multiplier', () => {
    const state: GameState = createInitialState();
    state.water = state.waterCap;
    state.nutrients = state.nutrientsCap;
    state.activeStrainId = 'bloated';
    const result = calculateVictoryReward(state, 'fallen_leaf');
    expect(result.biomassEarned).toBe(64);
    expect(result.lysateEarned).toBe(7);
  });
});
