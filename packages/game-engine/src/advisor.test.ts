import { describe, it, expect } from 'vitest';
import { ADVISOR_TUNING } from '@mycosurge/config';
import { createInitialState } from './state';
import type { GameState, RadarContact } from './state';
import {
  evaluateAdvisor,
  observePlayerChoice,
  observePlayerAction,
  recordHostEngaged,
  recordCombatOutcome,
  getAdvisorMaturity,
  applyCurve,
  getCheapestGeneratorCost,
  getSectorAdvice,
} from './advisor';

function activeState(): GameState {
  const state = createInitialState();
  state.gamePhase = 'active';
  state.water = state.waterCap * 0.7;
  state.nutrients = state.nutrientsCap * 0.7;
  return state;
}

function contact(revealed: boolean): RadarContact {
  return {
    id: 'contact-1',
    hostId: 'mycelium_mite',
    strainId: 'normal',
    revealed,
    timeRemaining: 60,
    totalTime: 120,
  };
}

function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function scoreOf(state: GameState, actionId: string): number {
  const candidate = evaluateAdvisor(state).candidates.find((c) => c.actionId === actionId);
  return candidate ? candidate.score : 0;
}

describe('applyCurve', () => {
  it('clamps the input and maps presets into [0,1]', () => {
    expect(applyCurve({ type: 'linear' }, 0.25)).toBeCloseTo(0.25);
    expect(applyCurve({ type: 'inverse' }, 0.25)).toBeCloseTo(0.75);
    expect(applyCurve({ type: 'binary' }, 0)).toBe(0);
    expect(applyCurve({ type: 'binary' }, 0.001)).toBe(1);
    expect(applyCurve({ type: 'threshold', threshold: 0.9 }, 0.9)).toBe(1);
    expect(applyCurve({ type: 'threshold', threshold: 0.9 }, 0.89)).toBe(0);
    expect(applyCurve({ type: 'inverse' }, 2)).toBe(0);
    expect(applyCurve({ type: 'linear' }, -1)).toBe(0);
  });
});

describe('advisor emergency bucket', () => {
  it('forces Gather before the full game begins', () => {
    const result = evaluateAdvisor(createInitialState());
    expect(result.bucket).toBe('emergency');
    expect(result.phase).toBe('gather');
    expect(result.reasonId).toBe('notActive');
  });

  it('forces Gather while recovering from trauma', () => {
    const state = activeState();
    state.isInTrauma = true;
    expect(evaluateAdvisor(state).reasonId).toBe('trauma');
  });

  it('forces Gather when starving', () => {
    const state = activeState();
    state.water = 0;
    expect(evaluateAdvisor(state).reasonId).toBe('starving');
  });

  it('forces Hunt while a host is entangled', () => {
    const state = activeState();
    state.currentHostId = 'mycelium_mite';
    const result = evaluateAdvisor(state);
    expect(result.phase).toBe('hunt');
    expect(result.reasonId).toBe('fighting');
  });

  it('tops up reserves before a revealed signal', () => {
    const state = activeState();
    state.nutrients = state.nutrientsCap * 0.2;
    state.contacts = [contact(true)];
    expect(evaluateAdvisor(state).reasonId).toBe('reserveLow');
  });

  it('forces Hunt when a signal is revealed', () => {
    const state = activeState();
    state.contacts = [contact(true)];
    expect(evaluateAdvisor(state).reasonId).toBe('signal');
  });

  it('is immune to learned weights', () => {
    const state = activeState();
    state.water = 0; // starving
    state.advisor.memory.bias['expand.reach.affordable'] = 10;
    state.advisor.memory.bias['gather.lowReserve'] = -10;
    expect(evaluateAdvisor(state).phase).toBe('gather');
    expect(evaluateAdvisor(state).bucket).toBe('emergency');
  });
});

describe('advisor normal bucket', () => {
  it('scores Grow when Biomass cannot afford the next generator', () => {
    const state = activeState();
    state.biomass = 0;
    const result = evaluateAdvisor(state);
    expect(result.bucket).toBe('normal');
    expect(result.phase).toBe('grow');
  });

  it('scores Hunt when stable but short on Lysate', () => {
    const state = activeState();
    state.biomass = 50;
    expect(evaluateAdvisor(state).phase).toBe('hunt');
  });

  it('scores Grow when stable and nothing else is pressing', () => {
    const state = activeState();
    state.biomass = 50;
    state.lysateBanked = 10;
    expect(evaluateAdvisor(state).phase).toBe('grow');
  });

  it('scores Expand when a reserve is full and Lysate is ready', () => {
    const state = activeState();
    state.biomass = 100;
    state.water = state.waterCap;
    state.lysateBanked = 10;
    expect(evaluateAdvisor(state).phase).toBe('expand');
  });

  it('scores Expand once every generator is maxed and Lysate is banked', () => {
    const state = activeState();
    state.generators = { osmotic_pump: 10, enzymatic_exudates: 10 };
    state.biomass = 50;
    state.lysateBanked = 10;
    expect(evaluateAdvisor(state).phase).toBe('expand');
  });

  it('does not score Expand when only an unaffordable pool is full', () => {
    const state = activeState();
    state.waterCap = 200;
    state.water = 200;
    state.biomass = 1;
    state.lysateBanked = 10;
    expect(evaluateAdvisor(state).phase).toBe('grow');
  });

  it('reports the action score as the product of its contributions', () => {
    const state = activeState();
    state.biomass = 0;
    const candidate = evaluateAdvisor(state).candidates.find((c) => c.actionId === 'grow.invest');
    expect(candidate).toBeDefined();
    const product = candidate!.contributions.reduce((acc, c) => acc * c.contribution, 1);
    expect(candidate!.score).toBeCloseTo(product);
  });

  it('returns candidates sorted by descending score, deterministically', () => {
    const state = activeState();
    state.biomass = 50;
    const a = evaluateAdvisor(state).candidates.map((c) => c.actionId);
    const b = evaluateAdvisor(state).candidates.map((c) => c.actionId);
    expect(a).toEqual(b);
    const scores = evaluateAdvisor(state).candidates.map((c) => c.score);
    for (let i = 1; i < scores.length; i++) expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
  });

  it('knows the cheapest generator cost helper still works', () => {
    expect(getCheapestGeneratorCost(createInitialState())).toBe(5);
  });
});

describe('advisor maturity ladder', () => {
  it('starts germinating and reaches aware after enough observations', () => {
    const state = activeState();
    expect(getAdvisorMaturity(state)).toBe('germinating');
    state.advisor.memory.observations = ADVISOR_TUNING.awareAtObservations;
    expect(getAdvisorMaturity(state)).toBe('aware');
  });

  it('reaches responsive and symbiotic only with opt-in autonomy', () => {
    const state = activeState();
    state.advisor.memory.observations = ADVISOR_TUNING.responsiveAtObservations;
    expect(getAdvisorMaturity(state)).toBe('aware');
    state.advisor.autonomyLevel = 1;
    expect(getAdvisorMaturity(state)).toBe('responsive');
    state.advisor.autonomyLevel = 2;
    expect(getAdvisorMaturity(state)).toBe('symbiotic');
  });
});

describe('advisor sector advice', () => {
  it('has no pull from a standing start', () => {
    const state = activeState();
    state.mycelialNetwork = 0;
    state.biomass = 1000;
    const advice = getSectorAdvice(state);
    expect(advice.pull).toBe(0);
  });

  it('pulls toward a sensed host once it is within sensing range', () => {
    const state = activeState();
    state.mycelialNetwork = 5;
    state.biomass = 1000;
    const advice = getSectorAdvice(state);
    expect(advice.affordable).toBe(true);
    expect(advice.signalPull).toBeGreaterThan(0);
    expect(advice.index).toBeGreaterThanOrEqual(0);
    expect(advice.index).toBeLessThan(6);
  });
});

describe('advisor weight adaptation', () => {
  it('drifts bias toward a repeatedly chosen phase and stays within caps', () => {
    const state = activeState();
    state.biomass = 50; // hunt is the advisor's pick; the player chooses gather
    const gatherBefore = scoreOf(state, 'gather.topUp');

    for (let i = 0; i < 60; i++) observePlayerChoice(state, 'gather', i);

    expect(state.advisor.memory.observations).toBe(60);
    expect(state.advisor.memory.phaseCounts.gather).toBe(60);
    expect(scoreOf(state, 'gather.topUp')).toBeGreaterThan(gatherBefore);
    for (const value of Object.values(state.advisor.memory.bias)) {
      expect(Math.abs(value)).toBeLessThanOrEqual(ADVISOR_TUNING.biasCap + 1e-9);
    }
  });

  it('is deterministic given the same starting state and choices', () => {
    const base = activeState();
    base.biomass = 50;
    const a = clone(base);
    const b = clone(base);
    for (let i = 0; i < 30; i++) {
      observePlayerChoice(a, i % 2 === 0 ? 'gather' : 'hunt', i);
      observePlayerChoice(b, i % 2 === 0 ? 'gather' : 'hunt', i);
    }
    expect(a.advisor.memory).toEqual(b.advisor.memory);
  });

  it('tracks alignment with the organism’s advice', () => {
    const state = activeState();
    state.biomass = 50; // advisor wants hunt
    observePlayerChoice(state, 'hunt', 0);
    expect(state.advisor.memory.alignment).toBeGreaterThan(0);
    expect(evaluateAdvisor(state).maturity).toBeDefined();
  });
});

describe('advisor learns from concrete actions', () => {
  it('counts actions and rate-limits repeats within the cooldown', () => {
    const state = activeState();
    state.biomass = 50;

    observePlayerAction(state, 'hunt.ping', 1_000);
    expect(state.advisor.memory.actionCounts['hunt.ping']).toBe(1);

    // Same instant and within the cooldown -> ignored.
    observePlayerAction(state, 'hunt.ping', 1_000);
    observePlayerAction(state, 'hunt.ping', 10_000);
    expect(state.advisor.memory.actionCounts['hunt.ping']).toBe(1);

    // Past the cooldown -> counted.
    observePlayerAction(
      state,
      'hunt.ping',
      1_000 + ADVISOR_TUNING.actionObserveCooldownSeconds * 1000,
    );
    expect(state.advisor.memory.actionCounts['hunt.ping']).toBe(2);
  });

  it('ignores unknown action ids', () => {
    const state = activeState();
    observePlayerAction(state, 'not.an.action', 0);
    expect(state.advisor.memory.observations).toBe(0);
    expect(state.advisor.memory.actionCounts['not.an.action']).toBeUndefined();
  });

  it('records host types and combat outcomes', () => {
    const state = activeState();
    recordHostEngaged(state, 'mycelium_mite');
    recordHostEngaged(state, 'mycelium_mite');
    recordHostEngaged(state, 'soil_nematode');
    recordCombatOutcome(state, 'victory');
    recordCombatOutcome(state, 'defeat');
    expect(state.advisor.memory.hostTypeCounts).toEqual({
      mycelium_mite: 2,
      soil_nematode: 1,
    });
    expect(state.advisor.memory.outcomes).toEqual({ victories: 1, defeats: 1 });
  });
});

describe('advisor calibration (grounded break-evens)', () => {
  // hunt.ping = lysateNeed; grow.synthesize = 2 * readiness * biomassScarcity.
  // At reserves 0.7 and Biomass 50% the break-even is lysateNeed = 0.70.
  it('switches from Grow to Hunt across lysateNeed 0.70', () => {
    const hunt = activeState();
    hunt.biomass = 50;
    // lysateNeed = 1 − banked/expandCost; the cheapest expand cost is 3.
    hunt.lysateBanked = 3 * 0.29; // lysateNeed 0.71
    expect(evaluateAdvisor(hunt).phase).toBe('hunt');

    const grow = activeState();
    grow.biomass = 50;
    grow.lysateBanked = 3 * 0.31; // lysateNeed 0.69
    expect(evaluateAdvisor(grow).phase).toBe('grow');
  });

  // grow.invest = 3 * (1 - generatorProgress); hunt.ping = 1.
  // Break-even is generatorProgress = 2/3 (solved: 3(1-p) = 1).
  it('switches from Hunt to Grow across generator progress 2/3', () => {
    const grow = activeState();
    grow.water = grow.waterCap * 0.45;
    grow.nutrients = grow.nutrientsCap * 0.45;
    grow.biomass = 3; // progress 0.6 -> grow.invest 1.2
    expect(evaluateAdvisor(grow).phase).toBe('grow');

    const hunt = activeState();
    hunt.water = hunt.waterCap * 0.45;
    hunt.nutrients = hunt.nutrientsCap * 0.45;
    hunt.biomass = 3.5; // progress 0.7 -> grow.invest 0.9 < hunt 1.0
    expect(evaluateAdvisor(hunt).phase).toBe('hunt');
  });

  // The emergency low-reserve gate (0.4) sits above gather.topUp's utility
  // break-even (1/3), so low reserves are always handled as an emergency.
  it('resolves the low-reserve boundary in the emergency bucket', () => {
    const low = activeState();
    low.water = low.waterCap * 0.39;
    low.nutrients = low.nutrientsCap * 0.39;
    const emergency = evaluateAdvisor(low);
    expect(emergency.bucket).toBe('emergency');
    expect(emergency.reasonId).toBe('reserveLow');
    expect(emergency.phase).toBe('gather');

    const ok = activeState();
    ok.water = ok.waterCap * 0.41;
    ok.nutrients = ok.nutrientsCap * 0.41;
    ok.biomass = 50;
    const normal = evaluateAdvisor(ok);
    expect(normal.bucket).toBe('normal');
  });
});

describe('advisor robustness (seeded random states)', () => {
  // Deterministic LCG so the generated states are reproducible in CI.
  function makeRng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
  }

  it('is deterministic, finite and phase-valid across many states', () => {
    const rng = makeRng(2026);
    const phases = ['gather', 'grow', 'hunt', 'expand'];
    for (let i = 0; i < 300; i++) {
      const state = activeState();
      state.water = rng() * state.waterCap;
      state.nutrients = rng() * state.nutrientsCap;
      state.biomass = rng() * 200;
      state.lysateBanked = rng() * 100;
      state.lysateRaw = rng() * 30;
      state.mycelialNetwork = Math.floor(rng() * 12);
      state.waterCap = 100 + Math.floor(rng() * 10) * 10;
      state.nutrientsCap = 100 + Math.floor(rng() * 10) * 10;
      if (rng() < 0.2) state.currentHostId = 'mycelium_mite';
      if (rng() < 0.2) state.isInTrauma = true;

      const a = evaluateAdvisor(state);
      const b = evaluateAdvisor(clone(state));
      expect(a.phase).toBe(b.phase);
      expect(a.actionId).toBe(b.actionId);
      expect(a.reasonId).toBe(b.reasonId);
      expect(phases).toContain(a.phase);
      for (const c of a.candidates) {
        expect(Number.isFinite(c.score)).toBe(true);
        expect(c.score).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('keeps learned bias bounded under random observation sequences', () => {
    const rng = makeRng(7);
    const choices: ('gather' | 'grow' | 'hunt' | 'expand')[] = ['gather', 'grow', 'hunt', 'expand'];
    const state = activeState();
    for (let i = 0; i < 500; i++) {
      observePlayerChoice(state, choices[Math.floor(rng() * choices.length)], i * 1000);
    }
    for (const value of Object.values(state.advisor.memory.bias)) {
      expect(Math.abs(value)).toBeLessThanOrEqual(ADVISOR_TUNING.biasCap + 1e-9);
    }
  });
});
