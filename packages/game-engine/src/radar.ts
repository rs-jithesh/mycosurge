import {
  HOSTS,
  STRAINS,
  BASE_CONTACT_SLOTS,
  MAX_CONTACT_SLOTS,
  SONAR_INTERVAL,
  SONAR_JITTER,
  CONTACT_LINGER,
  SCAN_WATER_COST,
  isHostUnlocked,
  getStrain,
  NORMAL_STRAIN_ID,
} from '@mycosurge/config';
import type { HostDef, StrainDef } from '@mycosurge/config';
import type { GameState, RadarContact } from './state';

export const TUTORIAL_HOST_ID = 'soil_nematode';

let contactSeq = 0;

export function resetRadarSeq(): void {
  contactSeq = 0;
}

function pickHost(pool: HostDef[], lastHostId: string | null): HostDef {
  const candidates = pool.length > 1 && lastHostId ? pool.filter((h) => h.id !== lastHostId) : pool;
  const usable = candidates.length > 0 ? candidates : pool;
  return usable[Math.floor(Math.random() * usable.length)];
}

export function pickStrain(): StrainDef {
  const total = STRAINS.reduce((sum, s) => sum + s.weight, 0);
  let roll = Math.random() * total;
  for (const s of STRAINS) {
    roll -= s.weight;
    if (roll <= 0) return s;
  }
  return STRAINS[0];
}

/** Hosts currently eligible to appear as sonar contacts. */
export function getUnlockedHosts(state: GameState): HostDef[] {
  const echoCount = state.acquiredEchoes.length;
  return HOSTS.filter((h) => h.id !== TUTORIAL_HOST_ID && isHostUnlocked(h, echoCount));
}

/** How many contacts the radar can hold at once. */
export function getRadarSlots(state: GameState): number {
  const bonus = state.skillAllocations['extended_range'] ?? 0;
  return Math.min(MAX_CONTACT_SLOTS, BASE_CONTACT_SLOTS + bonus);
}

export function rollContact(state: GameState): RadarContact | null {
  const pool = getUnlockedHosts(state);
  if (pool.length === 0) return null;

  const host = pickHost(pool, state.lastContactHostId);
  const strain = pickStrain();
  contactSeq += 1;

  return {
    id: `contact-${contactSeq}`,
    hostId: host.id,
    strainId: strain.id,
    revealed: false,
    timeRemaining: CONTACT_LINGER,
    totalTime: CONTACT_LINGER,
  };
}

function addContact(state: GameState, contact: RadarContact): void {
  state.contacts.push(contact);
  state.lastContactHostId = contact.hostId;
}

/** Spend Water to force a new blip onto a free radar slot. */
export function pingSubstrate(state: GameState): boolean {
  if (state.water < SCAN_WATER_COST) return false;
  if (state.contacts.length >= getRadarSlots(state)) return false;

  const contact = rollContact(state);
  if (!contact) return false;

  state.water -= SCAN_WATER_COST;
  addContact(state, contact);
  return true;
}

/** Spend Water to identify an existing blip. */
export function scanContact(state: GameState, contactId: string): boolean {
  const contact = state.contacts.find((c) => c.id === contactId);
  if (!contact || contact.revealed) return false;
  if (state.water < SCAN_WATER_COST) return false;

  state.water -= SCAN_WATER_COST;
  contact.revealed = true;
  return true;
}

export function dismissContact(state: GameState, contactId: string): void {
  state.contacts = state.contacts.filter((c) => c.id !== contactId);
}

export function engageContact(state: GameState, contactId: string): boolean {
  const contact = state.contacts.find((c) => c.id === contactId);
  if (!contact || !contact.revealed) return false;
  if (state.currentHostId || state.isInTrauma) return false;

  state.currentHostId = contact.hostId;
  state.currentContactId = contact.id;
  state.activeStrainId = contact.strainId;
  state.combatStats.hp = state.combatStats.maxHp;
  return true;
}

/** Clear the active host/contact after combat resolves. */
export function clearActiveEncounter(state: GameState): void {
  if (state.currentContactId) {
    dismissContact(state, state.currentContactId);
  }
  state.currentHostId = null;
  state.currentContactId = null;
  state.activeStrainId = NORMAL_STRAIN_ID;
}

export function getActiveStrain(state: GameState): StrainDef {
  return getStrain(state.activeStrainId);
}

/**
 * Expire old contacts and, when idle, spawn a new blip on the sonar interval.
 * Returns a freshly spawned contact (for logging) or null.
 */
export function tickRadar(state: GameState, deltaSec: number): RadarContact | null {
  for (const c of state.contacts) c.timeRemaining -= deltaSec;
  state.contacts = state.contacts.filter((c) => c.timeRemaining > 0);

  const idle = !state.currentHostId && !state.isInTrauma;
  if (!idle) return null;
  if (state.contacts.length >= getRadarSlots(state)) return null;

  state.sonarTimer -= deltaSec;
  if (state.sonarTimer > 0) return null;

  state.sonarTimer = SONAR_INTERVAL * (1 + (Math.random() * 2 - 1) * SONAR_JITTER);

  const contact = rollContact(state);
  if (!contact) return null;

  addContact(state, contact);
  return contact;
}
