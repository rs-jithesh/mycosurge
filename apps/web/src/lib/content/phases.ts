import type { GrowthPhase } from '@mycosurge/game-engine';
import type { Tone } from './onboarding';

export interface PhaseMeta {
  id: GrowthPhase;
  index: number;
  label: string;
  /** One-line description of what the stage is for. */
  tagline: string;
  /** Short guidance shown under the wheel when this stage is in focus. */
  objective: string;
  icon: string;
  tone: Tone;
}

/** The growth cycle in loop order. */
export const PHASES: PhaseMeta[] = [
  {
    id: 'gather',
    index: 1,
    label: 'Gather',
    tagline: 'Draw water and nutrients from the substrate.',
    objective: 'Top up Water and Nutrients.',
    icon: '≋',
    tone: 'cyan',
  },
  {
    id: 'grow',
    index: 2,
    label: 'Grow',
    tagline: 'Turn reserves into Biomass and invest in income.',
    objective: 'Convert reserves and upgrade generators.',
    icon: '✦',
    tone: 'amber',
  },
  {
    id: 'hunt',
    index: 3,
    label: 'Hunt',
    tagline: 'Track signals and drive off hosts for Lysate.',
    objective: 'Scan signals and engage a host.',
    icon: '◈',
    tone: 'coral',
  },
  {
    id: 'expand',
    index: 4,
    label: 'Expand',
    tagline: 'Spend Lysate to raise capacity and evolve.',
    objective: 'Spend Lysate to raise capacity.',
    icon: '⬡',
    tone: 'mint',
  },
];

export function phaseMeta(id: GrowthPhase): PhaseMeta {
  return PHASES.find((p) => p.id === id) ?? PHASES[0];
}
