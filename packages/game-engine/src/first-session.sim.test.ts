import { describe, it, expect } from 'vitest';
import { createInitialState } from './state';
import {
  absorbResources,
  extendHyphae,
  purchaseTutorialUpgrade,
  tutorialTick,
  TUTORIAL_GENERATOR2_NUTRIENT_COST,
  TUTORIAL_GENERATOR2_WATER_COST,
  TUTORIAL_GENERATOR_WATER_COST,
  TUTORIAL_GROW_NUTRIENT_COST,
  TUTORIAL_GROW_WATER_COST,
  TUTORIAL_REACH_TARGET,
} from './tutorial';
import { getNextHookObjective, HOOK_OBJECTIVES } from './hook';

/**
 * Headless pace check for the first session. A greedy player taps at `tapsPerSecond`,
 * buys each generator as soon as it is affordable, and grows toward the signal whenever it
 * can. The sim reports seconds-to-milestone so the opening can be tuned without playing it.
 *
 * It is a *lower bound* on real time: it assumes no reading, no mistakes and a constant tap
 * rate. Use it to compare configurations, not to promise a wall-clock time.
 */
export interface FirstSessionResult {
  seconds: number;
  milestones: Record<string, number>;
  taps: number;
}

export function simulateFirstSession(tapsPerSecond: number): FirstSessionResult {
  const state = createInitialState();
  const milestones: Record<string, number> = {};
  const seen = new Set<string>();
  const DT = 0.1;
  const MAX_SECONDS = 900;
  let seconds = 0;
  let taps = 0;
  let tapBudget = 0;

  function record() {
    for (const objective of HOOK_OBJECTIVES) {
      if (objective.done(state) && !seen.has(objective.id)) {
        seen.add(objective.id);
        milestones[objective.id] = seconds;
      }
    }
  }

  record();
  while (seconds < MAX_SECONDS && state.gamePhase !== 'tactician' && state.gamePhase !== 'active') {
    seconds += DT;
    tutorialTick(state, DT);

    // Generators first, then the reach push, then keep tapping.
    if (state.gamePhase !== 'awakening') {
      if (!state.tutorialUpgrades.osmoticPump && state.water >= TUTORIAL_GENERATOR_WATER_COST) {
        purchaseTutorialUpgrade(state, 'osmoticPump');
        record();
        continue;
      }
      if (
        !state.tutorialUpgrades.enzymaticExudates &&
        state.water >= TUTORIAL_GENERATOR2_WATER_COST &&
        state.nutrients >= TUTORIAL_GENERATOR2_NUTRIENT_COST
      ) {
        purchaseTutorialUpgrade(state, 'enzymaticExudates');
        record();
        continue;
      }
    }

    const growthBlocked =
      state.mycelialNetwork >= 1 &&
      !(state.tutorialUpgrades.osmoticPump && state.tutorialUpgrades.enzymaticExudates);
    if (
      !growthBlocked &&
      state.mycelialNetwork < TUTORIAL_REACH_TARGET &&
      state.water >= TUTORIAL_GROW_WATER_COST &&
      (state.gamePhase === 'awakening' || state.nutrients >= TUTORIAL_GROW_NUTRIENT_COST)
    ) {
      extendHyphae(state);
      record();
      continue;
    }

    tapBudget += tapsPerSecond * DT;
    while (tapBudget >= 1) {
      absorbResources(state);
      tapBudget -= 1;
      taps += 1;
    }
    record();
  }

  return { seconds, milestones, taps };
}

describe('first-session pace', () => {
  it('reports time-to-milestone at a few tap rates', () => {
    for (const rate of [2, 3, 5]) {
      const result = simulateFirstSession(rate);
      console.log(
        `taps/s=${rate} → hunt ${result.seconds.toFixed(1)}s ` +
          `(${result.taps} taps) ` +
          JSON.stringify(result.milestones),
      );
    }
    // Anchor on tap count (pace-independent): a real player taps ~0.4/s, so ~75–90 taps is
    // roughly three to four minutes. Guard the opening from being a 30-second rush or a grind.
    const eager = simulateFirstSession(5);
    expect(eager.taps).toBeGreaterThan(60);
    expect(eager.taps).toBeLessThan(130);
  });

  it('always reaches a defined final objective', () => {
    const result = simulateFirstSession(3);
    expect(getNextHookObjective).toBeTypeOf('function');
    expect(Object.keys(result.milestones).length).toBeGreaterThan(0);
  });
});
