import type { GamePhase } from '@mycosurge/game-engine';
import {
  TUTORIAL_ABSORB_NUTRIENTS,
  TUTORIAL_ABSORB_WATER,
  TUTORIAL_GENERATOR_WATER_COST,
  TUTORIAL_GROW_NUTRIENT_COST,
  TUTORIAL_GROW_WATER_COST,
} from '@mycosurge/game-engine';
import { resourceLabel } from '@mycosurge/config';
import type { IconKey } from './icons';

export type Tone = 'mint' | 'amber' | 'coral' | 'cyan' | 'violet';
export type TutorialStepId = 'feed' | 'grow' | 'nutrients' | 'automate' | 'expand';

export interface TutorialStep {
  id: TutorialStepId;
  index: number;
  total: number;
  tag: string;
  title: string;
  description: string;
  tone: Tone;
  hint?: string;
}

export const TUTORIAL_TOTAL_STEPS = 5;

export const TUTORIAL_STEPS: Record<TutorialStepId, TutorialStep> = {
  feed: {
    id: 'feed',
    index: 1,
    total: TUTORIAL_TOTAL_STEPS,
    tag: 'Objective',
    title: 'Draw water from the substrate',
    description: 'Tap Absorb to gather water.',
    tone: 'mint',
    hint: 'Water is all you need right now.',
  },
  grow: {
    id: 'grow',
    index: 2,
    total: TUTORIAL_TOTAL_STEPS,
    tag: 'Objective',
    title: 'Grow your first hypha',
    description: `Spend ${TUTORIAL_GROW_WATER_COST} Water to push out a hypha.`,
    tone: 'mint',
    hint: 'Growth reveals what else the substrate holds.',
  },
  nutrients: {
    id: 'nutrients',
    index: 3,
    total: TUTORIAL_TOTAL_STEPS,
    tag: 'New',
    title: 'Nutrients appear',
    description: 'Tap Absorb to gather Water and Nutrients.',
    tone: 'violet',
    hint: 'Nutrients feed your reach — growth needs both now.',
  },
  automate: {
    id: 'automate',
    index: 4,
    total: TUTORIAL_TOTAL_STEPS,
    tag: 'Objective',
    title: 'Install a generator so resources make themselves',
    description: `Spend ${TUTORIAL_GENERATOR_WATER_COST} Water — you can install the other next.`,
    tone: 'mint',
    hint: "Generators keep working while you're away. That's the whole point.",
  },
  expand: {
    id: 'expand',
    index: 5,
    total: TUTORIAL_TOTAL_STEPS,
    tag: 'Objective',
    title: 'Reach deeper across the substrate',
    description: `Spend ${TUTORIAL_GROW_WATER_COST} Water + ${TUTORIAL_GROW_NUTRIENT_COST} Nutrients per mm.`,
    tone: 'mint',
    hint: 'Reach 5mm and something will find you.',
  },
};

export const HANDOFF_STEP: TutorialStep = {
  id: 'expand',
  index: 5,
  total: TUTORIAL_TOTAL_STEPS,
  tag: 'Threat detected',
  title: 'Confront the nematode on your outer hyphae',
  description: "It's grazing on your network. Scan the substrate and engage.",
  tone: 'coral',
  hint: 'Combat is real-time — dodge what it throws at you.',
};

export function resolveTutorialStep(state: {
  phase: GamePhase;
  water: number;
  nutrients: number;
}): TutorialStepId {
  const { phase, water, nutrients } = state;
  if (phase === 'awakening') return water >= TUTORIAL_GROW_WATER_COST ? 'grow' : 'feed';
  if (phase === 'manager') {
    return nutrients >= TUTORIAL_GROW_NUTRIENT_COST ? 'automate' : 'nutrients';
  }
  return 'expand';
}

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
    effect: `+1 ${resourceLabel('water', 'first')} / sec`,
    glyph: '≋',
    icon: 'osmotic_pump',
    recommended: true,
  },
  {
    id: 'enzymaticExudates',
    name: 'Enzymatic Exudates',
    description: 'Digests organic matter into nutrients.',
    effect: `+1 ${resourceLabel('nutrients', 'first')} / sec`,
    glyph: '✦',
    icon: 'enzymatic_exudates',
  },
];

export const LOCK_REASONS = {
  grow: `Gather ${TUTORIAL_GROW_WATER_COST} ${resourceLabel('water', 'first')}`,
  generators: `Gather ${TUTORIAL_GENERATOR_WATER_COST} ${resourceLabel('water', 'first')}`,
  automate: 'Install both generators first',
};

export const ONBOARDING_COPY = {
  brand: 'MYCOSURGE',
  brandSub: 'INCUBATION',
  stepLabel: (index: number, total: number) => `Step ${index} of ${total}`,
  resources: 'Resources',
  resourcesLive: 'Live',
  activity: 'Activity',
  tools: 'Tools',
  network: 'Network',
  absorb: {
    label: 'Absorb',
    effectWater: `+${TUTORIAL_ABSORB_WATER} Water`,
    effectBoth: `+${TUTORIAL_ABSORB_WATER} Water · +${TUTORIAL_ABSORB_NUTRIENTS} Nutrients`,
  },
  grow: {
    label: 'Grow Hyphae',
    effectWater: `${TUTORIAL_GROW_WATER_COST} Water → +1mm network`,
    effectBoth: `${TUTORIAL_GROW_WATER_COST} Water + ${TUTORIAL_GROW_NUTRIENT_COST} Nutrients → +1mm`,
  },
  install: { label: 'Install', cost: (cost: number) => `Cost: ${cost} Water` },
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
