import { describe, it, expect } from 'vitest';
import {
  resolveTutorialStep,
  TUTORIAL_GENERATOR_COST,
  TUTORIAL_GENERATORS,
  TUTORIAL_STEPS,
  TUTORIAL_TOTAL_STEPS,
  LOCK_REASONS,
} from './onboarding';

describe('resolveTutorialStep', () => {
  it('starts at feed during awakening', () => {
    expect(resolveTutorialStep({ phase: 'awakening', biomass: 0, mycelialNetwork: 0 })).toBe(
      'feed',
    );
  });

  it('moves to grow once managing with little biomass', () => {
    expect(resolveTutorialStep({ phase: 'manager', biomass: 0, mycelialNetwork: 0 })).toBe('grow');
  });

  it('moves to automate once a generator is affordable', () => {
    expect(
      resolveTutorialStep({
        phase: 'manager',
        biomass: TUTORIAL_GENERATOR_COST,
        mycelialNetwork: 0,
      }),
    ).toBe('automate');
  });

  it('moves to expand in explorer and beyond', () => {
    expect(resolveTutorialStep({ phase: 'explorer', biomass: 5, mycelialNetwork: 2 })).toBe(
      'expand',
    );
    expect(resolveTutorialStep({ phase: 'tactician', biomass: 5, mycelialNetwork: 5 })).toBe(
      'expand',
    );
    expect(resolveTutorialStep({ phase: 'active', biomass: 50, mycelialNetwork: 5 })).toBe(
      'expand',
    );
  });
});

describe('tutorial content', () => {
  it('numbers steps sequentially within the declared total', () => {
    expect(Object.keys(TUTORIAL_STEPS)).toHaveLength(TUTORIAL_TOTAL_STEPS);
    for (const step of Object.values(TUTORIAL_STEPS)) {
      expect(step.total).toBe(TUTORIAL_TOTAL_STEPS);
      expect(step.index).toBeGreaterThanOrEqual(1);
      expect(step.index).toBeLessThanOrEqual(TUTORIAL_TOTAL_STEPS);
    }
  });

  it('recommends exactly one starter generator', () => {
    expect(TUTORIAL_GENERATORS.filter((g) => g.recommended)).toHaveLength(1);
  });

  it('explains every locked action', () => {
    for (const reason of Object.values(LOCK_REASONS)) {
      expect(reason.length).toBeGreaterThan(0);
    }
  });
});
