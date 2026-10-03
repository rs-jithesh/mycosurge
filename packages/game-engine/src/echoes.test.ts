import { describe, it, expect } from 'vitest';
import { createInitialState } from './state';
import { getEchoEffects, getEffectiveCombatStats, getEchoName, getEchoDescription } from './echoes';
import { getEffectiveBiomassPerSec } from './math';
import { getTotalGenomePoints } from './skills';

describe('getEchoEffects', () => {
  it('returns neutral bonuses with no echoes', () => {
    const effects = getEchoEffects([]);
    expect(effects.biomassMult).toBe(0);
    expect(effects.genomePoints).toBe(0);
    expect(effects.evadeChance).toBe(0);
  });

  it('stacks passive biomass echoes', () => {
    const effects = getEchoEffects(['echo_nematode', 'echo_leaf']);
    expect(effects.biomassMult).toBeCloseTo(0.08);
  });

  it('stacks fire-rate echoes', () => {
    const effects = getEchoEffects(['echo_pigeon', 'echo_squirrel']);
    expect(effects.fireRateMult).toBeCloseTo(0.18);
  });

  it('grants genome points from Experimental DNA', () => {
    const effects = getEchoEffects(['echo_lab']);
    expect(effects.genomePoints).toBe(3);
  });

  it('ignores unknown echo ids', () => {
    const effects = getEchoEffects(['not_a_real_echo']);
    expect(effects.biomassMult).toBe(0);
    expect(effects.genomePoints).toBe(0);
  });
});

describe('getEffectiveCombatStats', () => {
  it('applies echo bonuses on top of base stats', () => {
    const state = createInitialState();
    state.combatStats.fireRate = 2;
    state.combatStats.hpRegen = 0.5;
    state.acquiredEchoes = ['echo_pigeon', 'echo_worm', 'echo_frog', 'echo_mouse'];

    const stats = getEffectiveCombatStats(state);
    expect(stats.fireRate).toBeCloseTo(2 * 1.08);
    expect(stats.hpRegen).toBeCloseTo(1.5);
    expect(stats.evadeChance).toBeCloseTo(0.12);
    expect(stats.moveSpeedMult).toBeCloseTo(1.1);
  });

  it('adds poison damage from the beetle echo', () => {
    const state = createInitialState();
    state.acquiredEchoes = ['echo_beetle'];
    expect(getEffectiveCombatStats(state).poisonDamage).toBe(2);
  });
});

describe('echo integration', () => {
  it('raises passive biomass generation', () => {
    const base = createInitialState();
    base.gamePhase = 'active';
    const withEcho = { ...base, acquiredEchoes: ['echo_leaf'] };

    expect(getEffectiveBiomassPerSec(withEcho)).toBeCloseTo(getEffectiveBiomassPerSec(base) * 1.05);
  });

  it('adds Experimental DNA genome points to the budget', () => {
    const state = createInitialState();
    state.gamePhase = 'active';
    state.acquiredEchoes = ['echo_lab'];

    // 6 base + 2 per echo (1 echo) + 3 from the echo itself = 11.
    expect(getTotalGenomePoints(state)).toBe(11);
  });
});

describe('echo metadata', () => {
  it('resolves names and descriptions', () => {
    expect(getEchoName('echo_leaf')).toBe('Photosynthetic Trace');
    expect(getEchoDescription('echo_leaf')).toContain('biomass');
  });

  it('falls back to the raw id', () => {
    expect(getEchoName('echo_missing')).toBe('echo_missing');
  });
});
