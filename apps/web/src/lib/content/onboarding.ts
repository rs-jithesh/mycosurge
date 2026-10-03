import type { GamePhase } from '@mycosurge/game-engine';
import type { IconKey } from './icons';

export type Tone = 'mint' | 'amber' | 'coral' | 'cyan' | 'violet';
export type TutorialStepId = 'feed' | 'grow' | 'automate' | 'expand';

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

export const TUTORIAL_TOTAL_STEPS = 4;

export const TUTORIAL_STEPS: Record<TutorialStepId, TutorialStep> = {
  feed: {
    id: 'feed',
    index: 1,
    total: TUTORIAL_TOTAL_STEPS,
    tag: 'Objective',
    title: 'Draw water and nutrients from the substrate',
    description: 'Tap Absorb to feed your spore.',
    tone: 'mint',
    hint: "Water and nutrients drain over time — you'll learn to make them yourself soon.",
  },
  grow: {
    id: 'grow',
    index: 2,
    total: TUTORIAL_TOTAL_STEPS,
    tag: 'Objective',
    title: 'Turn resources into Biomass',
    description: 'Spend 10 Water + 10 Nutrients to grow 1 Biomass.',
    tone: 'mint',
    hint: 'You need 2 Biomass to install your first generator.',
  },
  automate: {
    id: 'automate',
    index: 3,
    total: TUTORIAL_TOTAL_STEPS,
    tag: 'Objective',
    title: 'Install a generator so resources make themselves',
    description: 'Pick one — you can install the other later.',
    tone: 'mint',
    hint: "Generators keep working while you're away. That's the whole point.",
  },
  expand: {
    id: 'expand',
    index: 4,
    total: TUTORIAL_TOTAL_STEPS,
    tag: 'Objective',
    title: 'Extend your hyphae across the substrate',
    description: 'Spend 5 Biomass to grow your network by 1mm.',
    tone: 'mint',
    hint: 'Reach 5mm and something will find you.',
  },
};

export const HANDOFF_STEP: TutorialStep = {
  id: 'expand',
  index: 4,
  total: TUTORIAL_TOTAL_STEPS,
  tag: 'Threat detected',
  title: 'Confront the nematode on your outer hyphae',
  description: "It's grazing on your network. Head to the Radar to scan and engage.",
  tone: 'coral',
  hint: 'Combat is real-time — dodge what it throws at you.',
};

export function resolveTutorialStep(state: {
  phase: GamePhase;
  biomass: number;
  mycelialNetwork: number;
}): TutorialStepId {
  const { phase, biomass } = state;
  if (phase === 'awakening') return 'feed';
  if (phase === 'manager') return biomass >= 2 ? 'automate' : 'grow';
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
    effect: '+1 Water / sec',
    glyph: '≋',
    icon: 'osmotic_pump',
    recommended: true,
  },
  {
    id: 'enzymaticExudates',
    name: 'Enzymatic Exudates',
    description: 'Digests organic matter into nutrients.',
    effect: '+1 Nutrients / sec',
    glyph: '✦',
    icon: 'enzymatic_exudates',
  },
];

export const TUTORIAL_GENERATOR_COST = 2;

export const LOCK_REASONS = {
  synthesize: 'Gather 10 Water + 10 Nutrients',
  generators: 'Gather 2 Biomass',
  extend: 'Install a generator first',
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
  absorb: { label: 'Absorb', effect: '+1 Water · +1 Nutrients' },
  synthesize: { label: 'Synthesize Biomass', effect: '10 Water + 10 Nutrients → 1 Biomass' },
  extend: { label: 'Extend Hyphae', effect: '5 Biomass → +1mm network' },
  install: { label: 'Install', cost: (cost: number) => `Cost: ${cost} Biomass` },
  proceed: { label: 'Proceed to Radar', effect: 'Scan for the nematode' },
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
    blurb: 'Manage Water, Nutrients and Biomass. Install and upgrade generators.',
  },
  {
    glyph: '◎',
    icon: 'radar',
    name: 'Radar',
    blurb: 'Scan the substrate, engage hosts, and earn Lysate from combat.',
  },
];

export const UNLOCKED_NOTE =
  'Evolution and Expeditions unfold as your network grows — nothing else to learn right now.';
