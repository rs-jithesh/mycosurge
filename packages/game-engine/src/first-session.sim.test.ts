import { describe, it, expect } from 'vitest';
import { createInitialState } from './state';
import {
  absorbResources,
  canGrowTutorial,
  getTutorialSectorDepths,
  grantTutorialStart,
  growTutorialSector,
  isTutorialSignalReached,
  signalSectorFor,
  TUTORIAL_RESERVE_CAP,
  TUTORIAL_SIGNAL_STEPS,
} from './tutorial';

function fresh() {
  const state = createInitialState();
  state.networkSeed = 0;
  grantTutorialStart(state);
  return state;
}

describe('first-session pace (goal first)', () => {
  it('the opening store cannot reach the signal on its own', () => {
    const state = fresh();
    const sector = signalSectorFor(state);
    let grows = 0;
    while (growTutorialSector(state, sector).success) grows++;

    expect(grows).toBeGreaterThan(0);
    expect(grows).toBeLessThan(TUTORIAL_SIGNAL_STEPS);
    expect(isTutorialSignalReached(state)).toBe(false);
  });

  it('takes a couple of full refills to finish the reach', () => {
    const state = fresh();
    const sector = signalSectorFor(state);
    let refills = 0;
    let guard = 0;

    while (!isTutorialSignalReached(state) && guard++ < 200) {
      if (!canGrowTutorial(state)) {
        while (state.water < TUTORIAL_RESERVE_CAP || state.nutrients < TUTORIAL_RESERVE_CAP) {
          absorbResources(state);
        }
        refills++;
      } else {
        growTutorialSector(state, sector);
      }
    }

    expect(isTutorialSignalReached(state)).toBe(true);
    expect(getTutorialSectorDepths(state)[sector]).toBe(TUTORIAL_SIGNAL_STEPS);
    expect(refills).toBeGreaterThanOrEqual(2);
    expect(refills).toBeLessThanOrEqual(4);
  });
});
