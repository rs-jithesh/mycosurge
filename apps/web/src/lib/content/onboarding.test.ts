import { describe, it, expect } from 'vitest';
import { LOCK_REASONS, ONBOARDING_COPY, TUTORIAL_GENERATORS } from './onboarding';

describe('tutorial content', () => {
  it('recommends exactly one starter generator', () => {
    expect(TUTORIAL_GENERATORS.filter((g) => g.recommended)).toHaveLength(1);
  });

  it('explains the locked generator action', () => {
    expect(LOCK_REASONS.generators.length).toBeGreaterThan(0);
  });

  it('describes what Absorb gives', () => {
    expect(ONBOARDING_COPY.absorb.effect).toContain('Water');
    expect(ONBOARDING_COPY.absorb.effect).toContain('Nutrients');
  });
});
