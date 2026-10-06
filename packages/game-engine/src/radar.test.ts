import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUnlockedHosts,
  getFarmPool,
  getRadarSlots,
  getRadarSlotTier,
  canUpgradeRadarSlots,
  upgradeRadarSlots,
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
import { RADAR_SLOT_TIERS } from '@mycosurge/config';
import { applyVictory, calculateVictoryReward } from './combat';
import { createInitialState, type GameState, type RadarContact } from './state';

function makeContact(overrides: Partial<RadarContact> = {}): RadarContact {
  return {
    id: 'test-contact',
    hostId: 'bacterial_film',
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
    expect(getUnlockedHosts(state).some((h) => h.id === 'rat_pack')).toBe(false);
  });

  it('gates the boss until its stage is in reach', () => {
    const state = createInitialState();
    state.mycelialNetwork = 24;
    expect(getUnlockedHosts(state).some((h) => h.id === 'wolf_alpha')).toBe(false);
    state.mycelialNetwork = 1000;
    expect(getUnlockedHosts(state).some((h) => h.id === 'wolf_alpha')).toBe(true);
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
    state.cataloguedHosts = ['bacterial_film', 'springtail', 'soil_nematode'];
    const ids = getFarmPool(state)
      .map((h) => h.id)
      .sort();
    expect(ids).toEqual(['bacterial_film', 'springtail']);
  });
});

describe('getRadarSlots', () => {
  it('starts at 5 and grows with the extended_range mutation', () => {
    const state = createInitialState();
    expect(getRadarSlots(state)).toBe(5);
    state.skillAllocations['extended_range'] = 1;
    expect(getRadarSlots(state)).toBe(6);
  });
});

describe('radar slot upgrades', () => {
  it('is reach-gated and costs Lysate + Biomass', () => {
    const state = createInitialState();
    state.lysateBanked = 100;
    state.biomass = 1000;
    state.mycelialNetwork = 5;
    expect(getRadarSlotTier(state)).not.toBeNull();
    expect(canUpgradeRadarSlots(state)).toBe(false); // first tier unlocks at 10 mm

    state.mycelialNetwork = 10;
    expect(canUpgradeRadarSlots(state)).toBe(true);
    expect(upgradeRadarSlots(state)).toBe(true);
    expect(state.radarSlotLevel).toBe(1);
    expect(getRadarSlots(state)).toBe(6);
    expect(state.lysateBanked).toBe(100 - RADAR_SLOT_TIERS[0].lysate);
    expect(state.biomass).toBe(1000 - RADAR_SLOT_TIERS[0].biomass);
  });
});

describe('pingSubstrate', () => {
  it('spends water and adds a blip', () => {
    const state = createInitialState();
    state.mycelialNetwork = 5;
    state.cataloguedHosts = ['bacterial_film'];
    state.water = 20;
    expect(pingSubstrate(state)).toBe(true);
    expect(state.water).toBe(15);
    expect(state.contacts).toHaveLength(1);
    expect(state.contacts[0].revealed).toBe(false);
  });

  it('fails without enough water', () => {
    const state = createInitialState();
    state.cataloguedHosts = ['bacterial_film'];
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
    state.cataloguedHosts = ['bacterial_film'];
    state.water = 100;
    for (let i = 0; i < 5; i++) expect(pingSubstrate(state)).toBe(true);
    expect(pingSubstrate(state)).toBe(false);
    expect(state.contacts).toHaveLength(5);
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
    state.cataloguedHosts = ['bacterial_film'];
    state.sonarTimer = 0;
    const spawned = tickRadar(state, 1);
    expect(spawned).not.toBeNull();
    expect(state.contacts).toHaveLength(1);
  });

  it('does not spawn while a host is engaged', () => {
    const state = createInitialState();
    state.currentHostId = 'bacterial_film';
    state.sonarTimer = 0;
    expect(tickRadar(state, 1)).toBeNull();
    expect(state.contacts).toHaveLength(0);
  });

  it('expires contacts past their linger time', () => {
    const state = createInitialState();
    state.currentHostId = 'bacterial_film';
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
    expect(state.currentHostId).toBe('bacterial_film');
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
    state.cataloguedHosts = ['bacterial_film'];
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
    calculateVictoryReward(state, 'bacterial_film');
    expect(state.hostAssimilation['bacterial_film']).toBe(15);
    expect(state.hostAssimilation['tardigrade']).toBeUndefined();
  });

  it('grows a host over once and bumps hostsDefeated once', () => {
    const state: GameState = createInitialState();
    state.water = state.waterCap;
    state.nutrients = state.nutrientsCap;
    for (let i = 0; i < 7; i++) {
      applyVictory(state, 'bacterial_film');
    }
    expect(state.grownOverHosts).toContain('bacterial_film');
    expect(state.hostsDefeated).toBe(1);

    applyVictory(state, 'bacterial_film');
    expect(state.hostsDefeated).toBe(1);
  });
});

describe('strain rewards', () => {
  it('applies the strain reward multiplier', () => {
    const state: GameState = createInitialState();
    state.water = state.waterCap;
    state.nutrients = state.nutrientsCap;
    state.activeStrainId = 'bloated';
    const result = calculateVictoryReward(state, 'bacterial_film');
    expect(result.biomassEarned).toBe(64);
    expect(result.lysateEarned).toBe(7);
  });
});
