import { describe, it, expect } from 'vitest';
import { TUTORIAL_GROW_NUTRIENT_COST, TUTORIAL_GROW_WATER_COST } from '@mycosurge/game-engine';
import {
  resolveTutorialStep,
  TUTORIAL_GENERATORS,
  TUTORIAL_STEPS,
  TUTORIAL_TOTAL_STEPS,
  LOCK_REASONS,
} from './onboarding';

describe('resolveTutorialStep', () => {
  it('starts at feed during awakening with no water', () => {
    expect(resolveTutorialStep({ phase: 'awakening', water: 0, nutrients: 0 })).toBe('feed');
  });

  it('moves to grow once water can afford a hypha', () => {
    expect(
      resolveTutorialStep({ phase: 'awakening', water: TUTORIAL_GROW_WATER_COST, nutrients: 0 }),
    ).toBe('grow');
  });

  it('asks for nutrients once managing', () => {
    expect(resolveTutorialStep({ phase: 'manager', water: 0, nutrients: 0 })).toBe('nutrients');
  });

  it('moves to automate once nutrients are gathered', () => {
    expect(
      resolveTutorialStep({
        phase: 'manager',
        water: 0,
        nutrients: TUTORIAL_GROW_NUTRIENT_COST,
      }),
    ).toBe('automate');
  });

  it('moves to expand in explorer and beyond', () => {
    expect(resolveTutorialStep({ phase: 'explorer', water: 0, nutrients: 0 })).toBe('expand');
    expect(resolveTutorialStep({ phase: 'tactician', water: 0, nutrients: 0 })).toBe('expand');
    expect(resolveTutorialStep({ phase: 'active', water: 0, nutrients: 0 })).toBe('expand');
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
