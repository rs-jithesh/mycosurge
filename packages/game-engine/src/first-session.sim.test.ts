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

describe('first-session pace (goal first, generator-driven)', () => {
  it('the opening store cannot reach the signal on its own', () => {
    const state = fresh();
    const sector = signalSectorFor(state);
    let grows = 0;
    while (growTutorialSector(state, sector).success) grows++;

    expect(grows).toBeGreaterThan(0);
    expect(grows).toBeLessThan(TUTORIAL_SIGNAL_STEPS);
    expect(isTutorialSignalReached(state)).toBe(false);
  });

  it('takes many refills of tapping to finish the reach', () => {
    const state = fresh();
    const sector = signalSectorFor(state);
    let refills = 0;
    let taps = 0;
    let guard = 0;

    while (!isTutorialSignalReached(state) && guard++ < 5000) {
      if (!canGrowTutorial(state)) {
        while (state.water < TUTORIAL_RESERVE_CAP || state.nutrients < TUTORIAL_RESERVE_CAP) {
          absorbResources(state);
          taps++;
        }
        refills++;
      } else {
        growTutorialSector(state, sector);
      }
    }

    expect(isTutorialSignalReached(state)).toBe(true);
    expect(getTutorialSectorDepths(state)[sector]).toBe(TUTORIAL_SIGNAL_STEPS);
    // With the cooldown gone, the only pressure left is tap count: hand-gathering the whole
    // reach should still take a substantial number of taps across several full-pool refills,
    // which is what keeps the generators (and their upgrades) worth building.
    expect(refills).toBeGreaterThanOrEqual(3);
    expect(taps).toBeGreaterThanOrEqual(50);
  });
});
