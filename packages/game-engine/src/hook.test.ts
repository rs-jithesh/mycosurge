import { describe, it, expect } from 'vitest';
import { createInitialState } from './state';
import { getNextHookObjective, tutorialGeneratorCount } from './hook';
import { grantTutorialStart, signalSectorFor, TUTORIAL_SIGNAL_STEPS } from './tutorial';

function fresh() {
  const state = createInitialState();
  state.networkSeed = 0;
  grantTutorialStart(state);
  return state;
}

describe('getNextHookObjective', () => {
  it('starts by pointing at the signal', () => {
    expect(getNextHookObjective(fresh()).id).toBe('reach-signal');
  });

  it('asks for a generator once the store runs dry', () => {
    const state = fresh();
    state.water = 0;
    state.nutrients = 0;
    expect(getNextHookObjective(state).id).toBe('build');
  });

  it('asks to gather once a generator is running but reserves are low', () => {
    const state = fresh();
    state.water = 0;
    state.nutrients = 0;
    state.tutorialUpgrades.osmoticPump = true;
    expect(getNextHookObjective(state).id).toBe('gather');
  });

  it('switches to engage once the signal resolves', () => {
    const state = fresh();
    state.tutorialSectors = Array.from({ length: 6 }, () => 0);
    state.tutorialSectors[signalSectorFor(state)] = TUTORIAL_SIGNAL_STEPS;
    const objective = getNextHookObjective(state);
    expect(objective.id).toBe('reach-signal');
    expect(objective.tag).toBe('Threat detected');
  });
});

describe('tutorialGeneratorCount', () => {
  it('counts installed generators', () => {
    const state = fresh();
    expect(tutorialGeneratorCount(state)).toBe(0);
    state.tutorialUpgrades.osmoticPump = true;
    expect(tutorialGeneratorCount(state)).toBe(1);
  });
});
