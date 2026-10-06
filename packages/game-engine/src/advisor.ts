import {
  ADVISOR_ACTIONS,
  ADVISOR_EMERGENCY,
  ADVISOR_TUNING,
  EXPANSION_MAP,
  GENERATORS,
  getGeneratorCost,
  getStageBandWidth,
  getStageForReach,
  MANUAL_SYNTH_NUTRIENT_COST,
  MANUAL_SYNTH_WATER_COST,
  SCAN_WATER_COST,
} from '@mycosurge/config';
import type {
  AdvisorActionDef,
  AdvisorInputId,
  AdvisorMaturity,
  AdvisorPhase,
  ConsiderationDef,
  CurveDef,
  EmergencyDef,
} from '@mycosurge/config';
import type { GameState } from './state';
import type { CapResource } from './math';
import { getCapExpandCost, getEffectiveMaxBiomass, isStarving } from './math';
import { isGeneratorUnlocked } from './generators';
import { getNextReachTier, getReachCost } from './reach';
import { generateHostPlacements } from './network';
import { getGrowCost, getMaxReach, getSectorDepths, sectorIndexForAngle } from './sectors';

// ── Cheapest-cost helpers (previously in phase.ts, now the advisor owns them) ──

/** Cheapest Biomass price among generators that still have levels left, or null when maxed. */
export function getCheapestGeneratorCost(state: GameState): number | null {
  let cheapest: number | null = null;
  for (const gen of GENERATORS) {
    if (!isGeneratorUnlocked(state, gen)) continue;
    const level = state.generators[gen.id] ?? 0;
    if (level >= gen.maxLevel) continue;
    const cost = getGeneratorCost(gen.baseCost, level, gen.costScale);
    if (cheapest === null || cost < cheapest) cheapest = cost;
  }
  return cheapest;
}

/** Cheapest Lysate price to expand any of the three capacity pools. */
export function getCheapestExpandCost(state: GameState): number {
  const resources: CapResource[] = ['water', 'nutrients', 'biomass'];
  return Math.min(...resources.map((r) => getCapExpandCost(state, r)));
}

// ── Result types (consumed by the web layer for the wheel, log and debug view) ──

export interface AdvisorContribution {
  considerationId: string;
  input: AdvisorInputId;
  /** Raw normalized input before the curve. */
  value: number;
  /** Curve output in [0,1]. */
  curve: number;
  /** Learned-adjusted weight. */
  weight: number;
  /** `curve * weight` — the factor this consideration contributes to the product. */
  contribution: number;
}

export interface AdvisorCandidate {
  actionId: string;
  phase: AdvisorPhase;
  label: string;
  score: number;
  contributions: AdvisorContribution[];
  /** The input with the largest contribution, used to pick the reason line. */
  reasonId: AdvisorInputId | null;
  reason: string;
}

export interface AdvisorResult {
  bucket: 'emergency' | 'normal';
  actionId: string;
  phase: AdvisorPhase;
  reasonId: string;
  explanation: string;
  candidates: AdvisorCandidate[];
  maturity: AdvisorMaturity;
  /** Suggested wedge when the top action is `expand.sector`, else null. */
  sector: number | null;
}

const EMPTY_MEMORY = {
  observations: 0,
  actionCounts: {} as Record<string, number>,
  phaseCounts: {} as Record<string, number>,
  hostTypeCounts: {} as Record<string, number>,
  outcomes: { victories: 0, defeats: 0 },
  alignment: 0,
  bias: {} as Record<string, number>,
  lastObservedAt: 0,
  lastActionAt: {} as Record<string, number>,
};

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function ratio(value: number, cap: number): number {
  return cap > 0 ? value / cap : 0;
}

// ── Response curves ──

/** Map an input in [0,1] through a preset response curve to a score in [0,1]. */
export function applyCurve(curve: CurveDef, input: number): number {
  const x = clamp01(input);
  switch (curve.type) {
    case 'linear':
      return x;
    case 'inverse':
      return 1 - x;
    case 'quadratic':
      return x * x;
    case 'inverseQuadratic':
      return (1 - x) * (1 - x);
    case 'constant':
      return 1;
    case 'binary':
      return x > 0 ? 1 : 0;
    case 'threshold':
      return curve.invert ? (x <= curve.threshold ? 1 : 0) : x >= curve.threshold ? 1 : 0;
    case 'logistic':
      return 1 / (1 + Math.exp(-curve.steepness * (x - curve.midpoint)));
  }
}

// ── Context ──

export interface SectorAdvice {
  index: number;
  /** 0–1: how worthwhile the best wedge is (strongest of signal/tier pull). */
  pull: number;
  signalPull: number;
  tierPull: number;
  affordable: boolean;
}

/**
 * Which wedge the network should grow next. Pulls toward a sensed host in that
 * direction, or toward the next host tier when no signal is close.
 */
export function getSectorAdvice(state: GameState): SectorAdvice {
  const depths = getSectorDepths(state);
  const placements = generateHostPlacements(state.networkSeed >>> 0);
  const catalogued = new Set(state.cataloguedHosts);
  const maxReach = getMaxReach(state);
  const nextTier = getNextReachTier(maxReach);
  const senseMm = getStageBandWidth(getStageForReach(maxReach)) * EXPANSION_MAP.senseFraction;
  const affordable = state.biomass >= getGrowCost(state);

  let index = 0;
  let bestSignal = 0;
  let bestTier = 0;

  for (let i = 0; i < depths.length; i++) {
    const depth = depths[i];

    let signal = 0;
    for (const placement of placements) {
      if (catalogued.has(placement.hostId)) continue;
      if (sectorIndexForAngle(placement.angle) !== i) continue;
      const ahead = placement.distanceMm - depth;
      if (ahead <= 0) signal = Math.max(signal, 0.4);
      else if (ahead <= senseMm) {
        signal = Math.max(signal, 1 - ahead / senseMm);
      }
    }

    let tier = 0;
    const gap = nextTier ? nextTier.at - maxReach : Infinity;
    // Only pull toward a stage boundary when it is genuinely close, so this never
    // overrides the resting economy from a standing start.
    if (Math.abs(depth - maxReach) < 1e-6 && gap <= senseMm) {
      tier = clamp01(1 - gap / senseMm);
    }

    if (Math.max(signal, tier) > Math.max(bestSignal, bestTier) + 1e-9) {
      index = i;
      bestSignal = signal;
      bestTier = tier;
    }
  }

  return {
    index,
    pull: Math.max(bestSignal, bestTier),
    signalPull: bestSignal,
    tierPull: bestTier,
    affordable,
  };
}

function buildInputs(state: GameState, advice: SectorAdvice): Record<AdvisorInputId, number> {
  const full = ADVISOR_TUNING.fullReserveRatio;
  const waterRatio = ratio(state.water, state.waterCap);
  const nutrientRatio = ratio(state.nutrients, state.nutrientsCap);
  const biomassRatio = ratio(state.biomass, getEffectiveMaxBiomass(state));
  const lowestReserve = Math.min(waterRatio, nutrientRatio);

  const genCost = getCheapestGeneratorCost(state);
  const expandCost = getCheapestExpandCost(state);

  const canSynthesize =
    state.water >= MANUAL_SYNTH_WATER_COST && state.nutrients >= MANUAL_SYNTH_NUTRIENT_COST;

  const generatorMaxed = genCost === null;
  const anyPoolFull = waterRatio >= full || nutrientRatio >= full || biomassRatio >= full;

  return {
    lowestReserve,
    synthesisReadiness: canSynthesize ? lowestReserve : 0,
    biomassScarcity: clamp01(1 - biomassRatio),
    generatorAvailable: generatorMaxed ? 0 : 1,
    generatorScarcity: generatorMaxed ? 0 : clamp01(1 - state.biomass / genCost),
    lysateNeed:
      expandCost > 0 ? clamp01(1 - (state.lysateBanked + state.lysateRaw) / expandCost) : 0,
    contactOpen: state.contacts.some((c) => !c.revealed) ? 1 : 0,
    contactRevealed: state.contacts.some((c) => c.revealed) ? 1 : 0,
    noContacts: state.contacts.length === 0 ? 1 : 0,
    waterForPing: state.water >= SCAN_WATER_COST ? 1 : 0,
    systemSaturated: anyPoolFull || generatorMaxed ? 1 : 0,
    reachAffordable: state.biomass >= getReachCost(state.mycelialNetwork) ? 1 : 0,
    sectorAffordable: advice.affordable ? 1 : 0,
    sectorPull: advice.pull,
    poolFullWater: waterRatio >= full ? 1 : 0,
    poolFullNutrients: nutrientRatio >= full ? 1 : 0,
    poolFullBiomass: biomassRatio >= full ? 1 : 0,
    capReadyWater: state.lysateBanked >= getCapExpandCost(state, 'water') ? 1 : 0,
    capReadyNutrients: state.lysateBanked >= getCapExpandCost(state, 'nutrients') ? 1 : 0,
    capReadyBiomass: state.lysateBanked >= getCapExpandCost(state, 'biomass') ? 1 : 0,
  };
}

// ── Emergency bucket ──

function emergencyFor(reasonId: EmergencyDef['reasonId']): EmergencyDef {
  return ADVISOR_EMERGENCY.find((e) => e.reasonId === reasonId) as EmergencyDef;
}

/**
 * The guaranteed behaviours, evaluated before utility. Preserves the old rule
 * cascade exactly and is deliberately immune to learned weights.
 */
function getEmergency(state: GameState): EmergencyDef | null {
  if (state.gamePhase !== 'active') return emergencyFor('notActive');
  if (state.isInTrauma) return emergencyFor('trauma');
  if (isStarving(state)) return emergencyFor('starving');
  if (state.currentHostId) return emergencyFor('fighting');

  const waterLow = ratio(state.water, state.waterCap) < ADVISOR_TUNING.lowReserveRatio;
  const nutrientLow = ratio(state.nutrients, state.nutrientsCap) < ADVISOR_TUNING.lowReserveRatio;
  if (waterLow || nutrientLow) return emergencyFor('reserveLow');

  if (state.contacts.some((c) => c.revealed)) return emergencyFor('signal');

  return null;
}

// ── Utility scoring ──

function effectiveWeight(base: number, id: string, bias: Record<string, number>): number {
  const bounded = clamp(bias[id] ?? 0, -ADVISOR_TUNING.biasCap, ADVISOR_TUNING.biasCap);
  return base * (1 + bounded);
}

function scoreAction(
  def: AdvisorActionDef,
  inputs: Record<AdvisorInputId, number>,
  bias: Record<string, number>,
): AdvisorCandidate {
  let score = 1;
  let best = -Infinity;
  let reasonId: AdvisorInputId | null = null;

  const contributions = def.considerations.map((c: ConsiderationDef): AdvisorContribution => {
    const value = inputs[c.input] ?? 0;
    const curve = applyCurve(c.curve, value);
    const weight = effectiveWeight(c.weight, c.id, bias);
    const contribution = curve * weight;
    score *= contribution;
    if (contribution > 0 && contribution > best) {
      best = contribution;
      reasonId = c.input;
    }
    return { considerationId: c.id, input: c.input, value, curve, weight, contribution };
  });

  const reason = (reasonId && def.reasons[reasonId]) || def.fallbackReason;
  return {
    actionId: def.id,
    phase: def.phase,
    label: def.label,
    score,
    contributions,
    reasonId,
    reason,
  };
}

/** Maturity ladder state. Only germinating/aware are reachable until autonomy ships. */
export function getAdvisorMaturity(state: GameState): AdvisorMaturity {
  const observations = state.advisor?.memory?.observations ?? 0;
  const level = state.advisor?.autonomyLevel ?? 0;
  const ready = observations >= ADVISOR_TUNING.responsiveAtObservations;
  if (level >= 2 && ready) return 'symbiotic';
  if (level >= 1 && ready) return 'responsive';
  return observations >= ADVISOR_TUNING.awareAtObservations ? 'aware' : 'germinating';
}

/**
 * Score every candidate and return the organism's recommendation. Deterministic:
 * the same state and memory always produce the same result.
 */
export function evaluateAdvisor(state: GameState): AdvisorResult {
  const maturity = getAdvisorMaturity(state);
  const bias = state.advisor?.memory?.bias ?? EMPTY_MEMORY.bias;

  const emergency = getEmergency(state);
  if (emergency) {
    return {
      bucket: 'emergency',
      actionId: emergency.actionId,
      phase: emergency.phase,
      reasonId: emergency.reasonId,
      explanation: emergency.text,
      candidates: [],
      maturity,
      sector: null,
    };
  }

  const advice = getSectorAdvice(state);
  const inputs = buildInputs(state, advice);
  const candidates = ADVISOR_ACTIONS.map((def) => scoreAction(def, inputs, bias)).sort(
    (a, b) => b.score - a.score || a.actionId.localeCompare(b.actionId),
  );

  const top = candidates[0];
  if (!top || !Number.isFinite(top.score) || top.score <= 0) {
    return {
      bucket: 'normal',
      actionId: 'grow.tend',
      phase: 'grow',
      reasonId: 'default',
      explanation: 'The network is steady. I will keep tending it.',
      candidates,
      maturity,
      sector: null,
    };
  }

  return {
    bucket: 'normal',
    actionId: top.actionId,
    phase: top.phase,
    reasonId: top.reasonId ?? 'default',
    explanation: top.reason,
    candidates,
    maturity,
    sector: top.actionId === 'expand.sector' ? advice.index : null,
  };
}

// ── Behaviour memory / weight adaptation ──

/** Every consideration id belonging to actions of a phase. */
export function considerationsForPhase(phase: AdvisorPhase): Set<string> {
  const ids = new Set<string>();
  for (const action of ADVISOR_ACTIONS) {
    if (action.phase !== phase) continue;
    for (const c of action.considerations) ids.add(c.id);
  }
  return ids;
}

/** A fresh memory with independent nested objects (never share references). */
function createMemory(): GameState['advisor']['memory'] {
  return {
    observations: 0,
    actionCounts: {},
    phaseCounts: {},
    hostTypeCounts: {},
    outcomes: { victories: 0, defeats: 0 },
    alignment: 0,
    bias: {},
    lastObservedAt: 0,
    lastActionAt: {},
  };
}

function ensureMemory(state: GameState): GameState['advisor']['memory'] {
  if (!state.advisor) {
    state.advisor = { memory: createMemory(), autonomyLevel: 0 };
  }
  const memory = state.advisor.memory;
  if (!memory) {
    state.advisor.memory = createMemory();
    return state.advisor.memory;
  }
  // Backfill collections from partial or legacy saves.
  if (!memory.actionCounts) memory.actionCounts = {};
  if (!memory.phaseCounts) memory.phaseCounts = {};
  if (!memory.hostTypeCounts) memory.hostTypeCounts = {};
  if (!memory.outcomes) memory.outcomes = { victories: 0, defeats: 0 };
  if (!memory.bias) memory.bias = {};
  if (!memory.lastActionAt) memory.lastActionAt = {};
  return memory;
}

/**
 * Drift the learned bias toward `phase`. Shared by phase choices and concrete
 * actions. Bounded, decayed, and never consulted by the emergency bucket.
 */
function driftToward(
  state: GameState,
  memory: GameState['advisor']['memory'],
  phase: AdvisorPhase,
  now: number,
): void {
  const recommended = evaluateAdvisor(state).phase;
  const aligned = phase === recommended;
  const rate = ADVISOR_TUNING.adaptRate;
  const cap = ADVISOR_TUNING.biasCap;

  memory.observations += 1;
  memory.alignment = memory.alignment * (1 - rate) + (aligned ? 1 : 0) * rate;
  memory.lastObservedAt = now;

  // Let unreinforced preferences fade.
  for (const key of Object.keys(memory.bias)) {
    memory.bias[key] = clamp(memory.bias[key] * ADVISOR_TUNING.biasDecay, -cap, cap);
  }

  const chosen = considerationsForPhase(phase);
  for (const id of chosen) {
    memory.bias[id] = clamp((memory.bias[id] ?? 0) + rate, -cap, cap);
  }

  if (!aligned) {
    for (const id of considerationsForPhase(recommended)) {
      if (chosen.has(id)) continue;
      memory.bias[id] = clamp((memory.bias[id] ?? 0) - rate, -cap, cap);
    }
  }
}

/**
 * Record a deliberate phase choice and drift the learned bias toward the
 * player's demonstrated preference. `now` is passed in (rather than read from
 * the clock) to keep this deterministic.
 */
export function observePlayerChoice(state: GameState, phase: AdvisorPhase, now = 0): void {
  const memory = ensureMemory(state);
  memory.phaseCounts[phase] = (memory.phaseCounts[phase] ?? 0) + 1;
  driftToward(state, memory, phase, now);
}

/**
 * Record a concrete player action (e.g. buying a generator, extending reach) and
 * let it nudge the bias. Rate-limited per action id so repeated low-value clicks
 * (like a spammed manual absorb) cannot dominate the learned profile.
 */
export function observePlayerAction(state: GameState, actionId: string, now = 0): void {
  const def = ADVISOR_ACTIONS.find((action) => action.id === actionId);
  if (!def) return;

  const memory = ensureMemory(state);
  const cooldownMs = ADVISOR_TUNING.actionObserveCooldownSeconds * 1000;
  const last = memory.lastActionAt[actionId];
  if (last !== undefined && now - last < cooldownMs) return;

  memory.lastActionAt[actionId] = now;
  memory.actionCounts[actionId] = (memory.actionCounts[actionId] ?? 0) + 1;
  driftToward(state, memory, def.phase, now);
}

/** Record that a host was engaged, by host id. */
export function recordHostEngaged(state: GameState, hostId: string): void {
  const memory = ensureMemory(state);
  memory.hostTypeCounts[hostId] = (memory.hostTypeCounts[hostId] ?? 0) + 1;
}

/** Record a resolved combat outcome. */
export function recordCombatOutcome(state: GameState, outcome: 'victory' | 'defeat'): void {
  const memory = ensureMemory(state);
  if (outcome === 'victory') memory.outcomes.victories += 1;
  else memory.outcomes.defeats += 1;
}

/** Structured log event; the web adapter decides where it lands. */
export interface AdvisorEvent {
  type: 'advisor';
  actionId: string;
  phase: AdvisorPhase;
  reasonId: string;
  text: string;
  maturity: AdvisorMaturity;
}

export function getAdvisorEvent(result: AdvisorResult): AdvisorEvent {
  return {
    type: 'advisor',
    actionId: result.actionId,
    phase: result.phase,
    reasonId: result.reasonId,
    text: result.explanation,
    maturity: result.maturity,
  };
}
