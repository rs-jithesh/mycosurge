import type { GameState } from './state';
import {
  TUTORIAL_EXTEND_COST,
  TUTORIAL_GENERATOR_COST,
  TUTORIAL_SYNTH_NUTRIENT_COST,
  TUTORIAL_SYNTH_WATER_COST,
} from './tutorial';

/**
 * The ordered beats of the first minute. This is a *view* over the tutorial state, not a
 * second progression system: each objective is a pure predicate over `GameState`, so the
 * hook never needs its own persisted progress and existing saves need no migration.
 */
export type HookObjectiveId =
  | 'absorb'
  | 'shape-biomass'
  | 'first-generator'
  | 'second-generator'
  | 'extend'
  | 'sense';

/** Live progress toward the next objective, for the always-close goal chip. */
export interface HookProgress {
  current: number;
  target: number;
  /** Singular noun for the chip, e.g. `generator` or `Water & Nutrients`. */
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
export const SENSE_REACH_RESOLVE = 5;

/**
 * True while a faint blip should pulse at the edge of the bloom. Purely derived from
 * network reach, and silent once the full game begins (the radar owns signals from there).
 */
export function isSignalSensed(state: GameState): boolean {
  return state.gamePhase !== 'active' && state.mycelialNetwork >= SENSE_REACH_THRESHOLD;
}

export const HOOK_OBJECTIVES: readonly HookObjective[] = [
  {
    id: 'absorb',
    title: 'Draw water and nutrients from the substrate',
    action: 'Tap the spore to absorb',
    done: (s) => s.gamePhase !== 'awakening',
    progress: (s) =>
      s.gamePhase === 'awakening'
        ? {
            current: Math.min(s.water, s.nutrients),
            target: TUTORIAL_SYNTH_WATER_COST,
            unit: 'Water & Nutrients',
          }
        : null,
  },
  {
    id: 'shape-biomass',
    title: 'Shape Biomass from your reserves',
    action: `Spend ${TUTORIAL_SYNTH_WATER_COST} Water + ${TUTORIAL_SYNTH_NUTRIENT_COST} Nutrients`,
    done: (s) => s.totalBiomassEarned >= 1,
    progress: (s) =>
      s.totalBiomassEarned >= 1
        ? null
        : { current: s.totalBiomassEarned, target: 1, unit: 'Biomass' },
  },
  {
    id: 'first-generator',
    title: 'Install a generator so resources make themselves',
    action: 'Pick one — you can install the other next',
    done: hasTutorialGenerator,
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
    action: `Spend ${TUTORIAL_GENERATOR_COST} Biomass`,
    done: (s) => tutorialGeneratorCount(s) >= 2,
    progress: (s) => {
      const count = tutorialGeneratorCount(s);
      return count >= 2
        ? null
        : { current: count, target: 2, unit: 'generator', unitPlural: 'generators' };
    },
  },
  {
    id: 'extend',
    title: 'Extend your hyphae across the substrate',
    action: `Spend ${TUTORIAL_EXTEND_COST} Biomass to grow the network`,
    done: (s) => s.mycelialNetwork >= 1,
    progress: (s) =>
      s.mycelialNetwork >= 1 ? null : { current: s.mycelialNetwork, target: 1, unit: 'mm' },
  },
  {
    id: 'sense',
    title: 'Reach deeper — something is out there',
    action: 'Extend until the signal resolves',
    done: (s) => s.mycelialNetwork >= SENSE_REACH_RESOLVE,
    progress: (s) =>
      s.mycelialNetwork >= SENSE_REACH_RESOLVE
        ? null
        : {
            current: s.mycelialNetwork,
            target: SENSE_REACH_RESOLVE,
            unit: 'mm',
          },
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
