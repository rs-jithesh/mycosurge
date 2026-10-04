import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUnlockedHosts,
  getFarmPool,
  getRadarSlots,
  pingSubstrate,
  scanContact,
  engageContact,
  dismissContact,
  tickRadar,
  clearActiveEncounter,
  getActiveStrain,
  resetRadarSeq,
  ensureUniqueContactIds,
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
  it('returns only stage 1 at the starting reach, never the tutorial host', () => {
    const state = createInitialState();
    state.mycelialNetwork = 5;
    const ids = getUnlockedHosts(state)
      .map((h) => h.id)
      .sort();
    expect(ids).toEqual([
      'bacterial_film',
      'ciliate',
      'fallen_leaf',
      'nematode_brood',
      'rotifer',
      'vampire_amoeba',
      'yeast_bloom',
    ]);
    expect(ids).not.toContain('soil_nematode');
  });

  it('unlocks stage 2 at 10 mm of reach', () => {
    const state = createInitialState();
    state.mycelialNetwork = 10;
    expect(getUnlockedHosts(state).some((h) => h.id === 'oribatid_mite')).toBe(true);
    expect(getUnlockedHosts(state).some((h) => h.id === 'urban_pigeon')).toBe(false);
  });

  it('gates the boss until its stage is in reach', () => {
    const state = createInitialState();
    state.mycelialNetwork = 24;
    expect(getUnlockedHosts(state).some((h) => h.id === 'lab_rat')).toBe(false);
    state.mycelialNetwork = 1000;
    expect(getUnlockedHosts(state).some((h) => h.id === 'lab_rat')).toBe(true);
  });
});

describe('getFarmPool', () => {
  it('is empty until a host is catalogued', () => {
    const state = createInitialState();
    state.mycelialNetwork = 5;
    expect(getFarmPool(state)).toEqual([]);
  });

  it('contains only catalogued, non-tutorial hosts', () => {
    const state = createInitialState();
    state.mycelialNetwork = 20;
    state.cataloguedHosts = ['fallen_leaf', 'garden_beetle', 'soil_nematode'];
    const ids = getFarmPool(state)
      .map((h) => h.id)
      .sort();
    expect(ids).toEqual(['fallen_leaf', 'garden_beetle']);
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
    state.mycelialNetwork = 5;
    state.cataloguedHosts = ['fallen_leaf'];
    state.water = 20;
    expect(pingSubstrate(state)).toBe(true);
    expect(state.water).toBe(15);
    expect(state.contacts).toHaveLength(1);
    expect(state.contacts[0].revealed).toBe(false);
  });

  it('fails without enough water', () => {
    const state = createInitialState();
    state.cataloguedHosts = ['fallen_leaf'];
    state.water = 3;
    expect(pingSubstrate(state)).toBe(false);
    expect(state.contacts).toHaveLength(0);
  });

  it('fails when no species has been catalogued yet', () => {
    const state = createInitialState();
    state.mycelialNetwork = 5;
    state.water = 100;
    expect(pingSubstrate(state)).toBe(false);
    expect(state.contacts).toHaveLength(0);
  });

  it('respects the radar slot limit', () => {
    const state = createInitialState();
    state.mycelialNetwork = 5;
    state.cataloguedHosts = ['fallen_leaf'];
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
    state.mycelialNetwork = 5;
    state.cataloguedHosts = ['fallen_leaf'];
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

describe('contact id uniqueness', () => {
  it('does not reuse an id after the in-memory sequence resets (reload)', () => {
    const state = createInitialState();
    state.mycelialNetwork = 5;
    state.cataloguedHosts = ['fallen_leaf'];
    state.water = 100;
    pingSubstrate(state);
    expect(state.contacts[0].id).toBe('contact-1');

    // Simulate a page reload: the module sequence resets but the save keeps contact-1.
    resetRadarSeq();
    pingSubstrate(state);

    const ids = state.contacts.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('repairs duplicate ids from an older save', () => {
    const state = createInitialState();
    state.contacts = [
      makeContact({ id: 'contact-1' }),
      makeContact({ id: 'contact-1' }),
      makeContact({ id: 'contact-2' }),
    ];

    ensureUniqueContactIds(state);

    const ids = state.contacts.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('contact-1');
    expect(ids).toContain('contact-2');
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
