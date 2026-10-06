import {
  TUTORIAL_ABSORB_NUTRIENTS,
  TUTORIAL_ABSORB_WATER,
  TUTORIAL_GENERATOR_WATER_COST,
} from '@mycosurge/game-engine';
import { resourceLabel } from '@mycosurge/config';
import type { IconKey } from './icons';

export type Tone = 'mint' | 'amber' | 'coral' | 'cyan' | 'violet';

export interface TutorialGeneratorContent {
  id: 'osmoticPump' | 'enzymaticExudates';
  name: string;
  description: string;
  effect: string;
  glyph: string;
  icon: IconKey;
  recommended?: boolean;
}

export const TUTORIAL_GENERATORS: TutorialGeneratorContent[] = [
  {
    id: 'osmoticPump',
    name: 'Osmotic Pump',
    description: 'Pulls moisture from the surrounding air.',
    effect: `+3 ${resourceLabel('water', 'first')} / sec`,
    glyph: '≋',
    icon: 'osmotic_pump',
    recommended: true,
  },
  {
    id: 'enzymaticExudates',
    name: 'Enzymatic Exudates',
    description: 'Digests organic matter into nutrients.',
    effect: `+3 ${resourceLabel('nutrients', 'first')} / sec`,
    glyph: '✦',
    icon: 'enzymatic_exudates',
  },
];

export const LOCK_REASONS = {
  generators: `Spend ${TUTORIAL_GENERATOR_WATER_COST} ${resourceLabel('water', 'first')}`,
};

export const ONBOARDING_COPY = {
  brand: 'MYCOSURGE',
  brandSub: 'SPORE',
  resources: 'Resources',
  activity: 'Activity',
  absorb: {
    label: 'Absorb',
    effect: `+${TUTORIAL_ABSORB_WATER} Water · +${TUTORIAL_ABSORB_NUTRIENTS} Nutrients`,
  },
  shock: (seconds: number) => `Recovering from shock — production halved for ${seconds}s`,
};

export interface UnlockCard {
  glyph: string;
  icon: IconKey;
  name: string;
  blurb: string;
}

export const UNLOCKED_SYSTEMS: UnlockCard[] = [
  {
    glyph: '❋',
    icon: 'core',
    name: 'Core',
    blurb: 'Manage Water and Nutrients. Install and upgrade generators.',
  },
  {
    glyph: '◈',
    icon: 'hunt',
    name: 'Hunt',
    blurb: 'Scan the substrate, engage hosts, and earn Lysate from combat.',
  },
];

export const UNLOCKED_NOTE =
  'Evolution unfolds as your network grows — nothing else to learn right now.';
