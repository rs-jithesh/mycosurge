import type { SystemId } from '@mycosurge/game-engine';

export interface SystemMeta {
  id: SystemId;
  name: string;
  glyph: string;
  blurb: string;
  /** One-line announcement shown in the activity log the first time it unlocks. */
  toast: string;
}

export const SYSTEM_META: Record<SystemId, SystemMeta> = {
  radar: {
    id: 'radar',
    name: 'Hunt',
    glyph: '◈',
    blurb: 'Scan the substrate, engage hosts, and earn Lysate from combat.',
    toast: 'Hunt unlocked — scan the substrate for hosts.',
  },
  evolution: {
    id: 'evolution',
    name: 'Evolution',
    glyph: '❖',
    blurb: 'Spend Biomass on permanent mutations and growth upgrades.',
    toast: 'Evolution unlocked — spend Biomass on mutations.',
  },
  expeditions: {
    id: 'expeditions',
    name: 'Expeditions',
    glyph: '➤',
    blurb: 'Send a subdued host to forage for Biomass while you tend the network.',
    toast: 'Expeditions unlocked — send a host to forage.',
  },
};
