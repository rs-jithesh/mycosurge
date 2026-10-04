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
    toast: 'Sensory hyphae reach outward — Hunt is open. Scan for hosts.',
  },
  evolution: {
    id: 'evolution',
    name: 'Evolution',
    glyph: '❖',
    blurb: 'Spend Biomass on permanent mutations and growth upgrades.',
    toast: 'The genome can be rewritten — Evolution is open.',
  },
  expeditions: {
    id: 'expeditions',
    name: 'Expeditions',
    glyph: '➤',
    blurb: 'Send a subdued host to forage for Biomass while you tend the network.',
    toast: 'A host can be sent to forage — Expeditions are open.',
  },
};
