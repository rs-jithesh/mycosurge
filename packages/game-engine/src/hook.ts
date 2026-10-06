import type { GameState } from './state';
import {
  canGrowTutorial,
  isTutorialSignalReached,
  TUTORIAL_GENERATOR_WATER_COST,
} from './tutorial';

/**
 * The first-session objective selector — a pure view over tutorial state. The goal is always
 * the signal; when the player can't afford to grow, the objective becomes the economy that
 * fixes that (a generator, or gathering).
 */
export type HookObjectiveId = 'reach-signal' | 'gather' | 'build';

export interface HookObjective {
  id: HookObjectiveId;
  tag: string;
  title: string;
  description: string;
  hint?: string;
  tone: 'mint' | 'violet' | 'coral' | 'cyan' | 'amber';
}

/** How many tutorial generators are installed. */
export function tutorialGeneratorCount(state: GameState): number {
  return (
    (state.tutorialUpgrades.osmoticPump ? 1 : 0) +
    (state.tutorialUpgrades.enzymaticExudates ? 1 : 0)
  );
}

function hasTutorialGenerator(state: GameState): boolean {
  return state.tutorialUpgrades.osmoticPump || state.tutorialUpgrades.enzymaticExudates;
}

export function getNextHookObjective(state: GameState): HookObjective {
  if (isTutorialSignalReached(state)) {
    return {
      id: 'reach-signal',
      tag: 'Signal reached',
      title: 'Engage the host',
      description: 'It has noticed you. Tap Engage to fight it.',
      hint: 'Combat is real-time — dodge what it throws at you.',
      tone: 'coral',
    };
  }

  if (!canGrowTutorial(state)) {
    if (!hasTutorialGenerator(state)) {
      return {
        id: 'build',
        tag: 'Objective',
        title: 'Build a generator so resources make themselves',
        description: `Spend ${TUTORIAL_GENERATOR_WATER_COST} Water on the Osmotic Pump.`,
        hint: 'Absorb still works — a generator just does it for you.',
        tone: 'mint',
      };
    }
    return {
      id: 'gather',
      tag: 'Objective',
      title: 'Gather more resources to keep growing',
      description: 'Tap Absorb to fill Water and Nutrients.',
      tone: 'violet',
    };
  }

  return {
    id: 'reach-signal',
    tag: 'Objective',
    title: 'Grow toward the signal',
    description: 'Tap a wedge to grow that direction.',
    hint: 'The signal waits at the edge of your reach.',
    tone: 'mint',
  };
}
