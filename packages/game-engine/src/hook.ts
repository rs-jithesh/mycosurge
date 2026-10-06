import type { GameState } from './state';
import {
  TUTORIAL_GENERATOR2_NUTRIENT_COST,
  TUTORIAL_GENERATOR2_WATER_COST,
  TUTORIAL_GENERATOR_WATER_COST,
  TUTORIAL_GROW_NUTRIENT_COST,
  TUTORIAL_GROW_WATER_COST,
  TUTORIAL_REACH_TARGET,
} from './tutorial';

/**
 * The ordered beats of the first session. This is a *view* over the tutorial state, not a
 * second progression system: each objective is a pure predicate over `GameState`, so the
 * hook never needs its own persisted progress and existing saves need no migration.
 *
 * Order reflects one-new-idea-at-a-time: Water → first growth (which reveals Nutrients) →
 * gather Nutrients → first generator → second generator → reach the signal. Biomass is not
 * part of the hook.
 */
export type HookObjectiveId =
  | 'absorb-water'
  | 'first-growth'
  | 'gather-nutrients'
  | 'first-generator'
  | 'second-generator'
  | 'reach';

/** Live progress toward the next objective, for the always-close goal chip. */
export interface HookProgress {
  current: number;
  target: number;
  /** Singular noun for the chip, e.g. `generator` or `Water`. */
  unit: string;
  /** Plural form used when more than one remains; defaults to `unit`. */
  unitPlural?: string;
}

export interface HookObjective {
  id: HookObjectiveId;
  /** Short imperative headline. */
  title: string;
  /** One-line action hint. */
  action: string;
  /** The objective has been met (or the network has moved past it). */
  done(state: GameState): boolean;
  /** Live progress toward `target`, or `null` once complete. */
  progress(state: GameState): HookProgress | null;
}

/** How many hook generators are installed. */
export function tutorialGeneratorCount(state: GameState): number {
  return (
    (state.tutorialUpgrades.osmoticPump ? 1 : 0) +
    (state.tutorialUpgrades.enzymaticExudates ? 1 : 0)
  );
}

function hasTutorialGenerator(state: GameState): boolean {
  return state.tutorialUpgrades.osmoticPump || state.tutorialUpgrades.enzymaticExudates;
}

/**
 * Reach at which a faint signal first appears at the frontier — the "something is out
 * there" moment, before any hunting.
 */
export const SENSE_REACH_THRESHOLD = 3;

/** Reach at which the sensed signal resolves into the scripted tutorial threat. */
export const SENSE_REACH_RESOLVE = TUTORIAL_REACH_TARGET;

/**
 * True while a faint blip should pulse at the edge of the bloom. Purely derived from
 * network reach, and silent once the full game begins (the radar owns signals from there).
 */
export function isSignalSensed(state: GameState): boolean {
  return state.gamePhase !== 'active' && state.mycelialNetwork >= SENSE_REACH_THRESHOLD;
}

export const HOOK_OBJECTIVES: readonly HookObjective[] = [
  {
    id: 'absorb-water',
    title: 'Draw water from the substrate',
    action: 'Tap Absorb',
    done: (s) => s.water >= TUTORIAL_GROW_WATER_COST || s.mycelialNetwork >= 1,
    progress: (s) =>
      s.water >= TUTORIAL_GROW_WATER_COST || s.mycelialNetwork >= 1
        ? null
        : { current: s.water, target: TUTORIAL_GROW_WATER_COST, unit: 'Water' },
  },
  {
    id: 'first-growth',
    title: 'Grow your first hypha',
    action: `Spend ${TUTORIAL_GROW_WATER_COST} Water`,
    done: (s) => s.mycelialNetwork >= 1,
    progress: (s) =>
      s.mycelialNetwork >= 1 ? null : { current: s.mycelialNetwork, target: 1, unit: 'mm' },
  },
  {
    id: 'gather-nutrients',
    title: 'The substrate yields Nutrients too',
    action: 'Tap Absorb to gather Nutrients',
    done: (s) => s.nutrients >= TUTORIAL_GROW_NUTRIENT_COST || hasTutorialGenerator(s),
    progress: (s) =>
      s.nutrients >= TUTORIAL_GROW_NUTRIENT_COST || hasTutorialGenerator(s)
        ? null
        : { current: s.nutrients, target: TUTORIAL_GROW_NUTRIENT_COST, unit: 'Nutrients' },
  },
  {
    id: 'first-generator',
    title: 'Install a generator so water makes itself',
    action: `Spend ${TUTORIAL_GENERATOR_WATER_COST} Water — pick either`,
    done: (s) => hasTutorialGenerator(s),
    progress: (s) => {
      const count = tutorialGeneratorCount(s);
      return count >= 1
        ? null
        : { current: count, target: 1, unit: 'generator', unitPlural: 'generators' };
    },
  },
  {
    id: 'second-generator',
    title: 'Install the second generator',
    action: `Spend ${TUTORIAL_GENERATOR2_WATER_COST} Water + ${TUTORIAL_GENERATOR2_NUTRIENT_COST} Nutrients`,
    done: (s) => tutorialGeneratorCount(s) >= 2,
    progress: (s) => {
      const count = tutorialGeneratorCount(s);
      return count >= 2
        ? null
        : { current: count, target: 2, unit: 'generator', unitPlural: 'generators' };
    },
  },
  {
    id: 'reach',
    title: 'Reach deeper — something is out there',
    action: 'Grow toward the signal',
    done: (s) => s.mycelialNetwork >= TUTORIAL_REACH_TARGET,
    progress: (s) =>
      s.mycelialNetwork >= TUTORIAL_REACH_TARGET
        ? null
        : { current: s.mycelialNetwork, target: TUTORIAL_REACH_TARGET, unit: 'mm' },
  },
];

/**
 * The first objective not yet met, or the final objective once the hook is complete
 * (its `progress` then returns `null`).
 */
export function getNextHookObjective(state: GameState): HookObjective {
  for (const objective of HOOK_OBJECTIVES) {
    if (!objective.done(state)) return objective;
  }
  return HOOK_OBJECTIVES[HOOK_OBJECTIVES.length - 1];
}

/** Live progress toward the next objective, or `null` once the hook is complete. */
export function getHookProgress(state: GameState): HookProgress | null {
  return getNextHookObjective(state).progress(state);
}
