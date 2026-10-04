/**
 * Organism advisor configuration.
 *
 * The advisor is a deterministic utility AI: every candidate action is scored by
 * multiplying the outputs of its *considerations*. A consideration reads one
 * normalized input (0–1) from the game state and pushes it through a response
 * curve, then scales it by a weight. All tuning lives here so the engine only
 * contains math.
 *
 * Nothing in this file may depend on `@mycosurge/game-engine` (the engine depends
 * on this package). Inputs are referenced by id and resolved in the engine.
 */

/** The four stages of the growth cycle, mirrored from the engine's `GrowthPhase`. */
export type AdvisorPhase = 'gather' | 'grow' | 'hunt' | 'expand';

/** Normalized (0–1) state inputs the engine knows how to read. */
export type AdvisorInputId =
  | 'lowestReserve'
  | 'synthesisReadiness'
  | 'biomassScarcity'
  | 'generatorAvailable'
  | 'generatorScarcity'
  | 'lysateNeed'
  | 'contactOpen'
  | 'contactRevealed'
  | 'noContacts'
  | 'waterForPing'
  | 'systemSaturated'
  | 'reachAffordable'
  | 'poolFullWater'
  | 'poolFullNutrients'
  | 'poolFullBiomass'
  | 'capReadyWater'
  | 'capReadyNutrients'
  | 'capReadyBiomass';

/** A response curve mapping an input in [0,1] to a score in [0,1]. */
export type CurveDef =
  | { type: 'linear' }
  | { type: 'inverse' }
  | { type: 'quadratic' }
  | { type: 'inverseQuadratic' }
  | { type: 'constant' }
  | { type: 'binary' }
  | { type: 'threshold'; threshold: number; invert?: boolean }
  | { type: 'logistic'; midpoint: number; steepness: number };

/** One scored factor of an action. `id` is the stable key for learned bias. */
export interface ConsiderationDef {
  id: string;
  input: AdvisorInputId;
  curve: CurveDef;
  weight: number;
}

/** A candidate action the organism can advise. */
export interface AdvisorActionDef {
  id: string;
  phase: AdvisorPhase;
  /** Player-facing short label. */
  label: string;
  considerations: ConsiderationDef[];
  /** Colony-voice lines keyed by input id; the top contributing input wins. */
  reasons: Partial<Record<AdvisorInputId, string>>;
  /** Used when the top input has no line. */
  fallbackReason: string;
}

/**
 * Normal-bucket actions. Scores are the product of `curve(input) * weight`.
 * The weights below are calibrated so the advisor reproduces the previous
 * hand-written phase rules on the resting economy (see advisor.test.ts).
 */
export const ADVISOR_ACTIONS: AdvisorActionDef[] = [
  {
    id: 'gather.topUp',
    phase: 'gather',
    label: 'Draw from the substrate',
    considerations: [
      { id: 'gather.lowReserve', input: 'lowestReserve', curve: { type: 'inverse' }, weight: 1.5 },
    ],
    reasons: {
      lowestReserve: 'Reserves run thin. I will draw from the substrate.',
    },
    fallbackReason: 'I will top the reserves up while I can.',
  },
  {
    id: 'grow.invest',
    phase: 'grow',
    label: 'Build toward the next generator',
    considerations: [
      {
        id: 'grow.generatorAvailable',
        input: 'generatorAvailable',
        curve: { type: 'binary' },
        weight: 1,
      },
      {
        id: 'grow.generatorScarcity',
        input: 'generatorScarcity',
        curve: { type: 'linear' },
        weight: 3,
      },
    ],
    reasons: {
      generatorScarcity: 'Income is thin. I will grow toward the next generator.',
    },
    fallbackReason: 'I will deepen the network\u2019s income.',
  },
  {
    id: 'grow.synthesize',
    phase: 'grow',
    label: 'Shape Biomass from reserves',
    considerations: [
      {
        id: 'grow.synthesisReadiness',
        input: 'synthesisReadiness',
        curve: { type: 'linear' },
        weight: 2,
      },
      {
        id: 'grow.biomassScarcity',
        input: 'biomassScarcity',
        curve: { type: 'linear' },
        weight: 1,
      },
    ],
    reasons: {
      biomassScarcity: 'Reserves are healthy but Biomass is low. I will shape more.',
    },
    fallbackReason: 'I will convert reserves into Biomass.',
  },
  {
    id: 'hunt.ping',
    phase: 'hunt',
    label: 'Pulse the substrate for a signal',
    considerations: [
      { id: 'hunt.ping.lysate', input: 'lysateNeed', curve: { type: 'linear' }, weight: 1 },
      { id: 'hunt.ping.noContacts', input: 'noContacts', curve: { type: 'binary' }, weight: 1 },
      { id: 'hunt.ping.water', input: 'waterForPing', curve: { type: 'binary' }, weight: 1 },
    ],
    reasons: {
      lysateNeed: 'Lysate is short. I will pulse the substrate for a host.',
    },
    fallbackReason: 'I will reach out for a signal.',
  },
  {
    id: 'hunt.scan',
    phase: 'hunt',
    label: 'Scan the drifting signal',
    considerations: [
      { id: 'hunt.scan.contact', input: 'contactOpen', curve: { type: 'binary' }, weight: 1 },
      { id: 'hunt.scan.lysate', input: 'lysateNeed', curve: { type: 'linear' }, weight: 1 },
    ],
    reasons: {
      contactOpen: 'A signal drifts close. I will scan it before it fades.',
    },
    fallbackReason: 'I will identify the signal.',
  },
  {
    id: 'hunt.engage',
    phase: 'hunt',
    label: 'Engage the revealed host',
    considerations: [
      {
        id: 'hunt.engage.revealed',
        input: 'contactRevealed',
        curve: { type: 'binary' },
        weight: 1,
      },
    ],
    reasons: {
      contactRevealed: 'A host is in reach. I will close on it.',
    },
    fallbackReason: 'I will engage the host.',
  },
  {
    id: 'expand.reach',
    phase: 'expand',
    label: 'Press deeper into the dark',
    considerations: [
      {
        id: 'expand.reach.saturated',
        input: 'systemSaturated',
        curve: { type: 'binary' },
        weight: 1,
      },
      {
        id: 'expand.reach.affordable',
        input: 'reachAffordable',
        curve: { type: 'binary' },
        weight: 1,
      },
    ],
    reasons: {
      systemSaturated: 'The network is brimming. I will push deeper.',
      reachAffordable: 'There is spare Biomass. I will stretch the frontier.',
    },
    fallbackReason: 'I will extend the network.',
  },
  ...(['water', 'nutrients', 'biomass'] as const).map(
    (resource): AdvisorActionDef => ({
      id: `expand.cap.${resource}`,
      phase: 'expand',
      label: `Raise the ${resource} ceiling`,
      considerations: [
        {
          id: `expand.cap.${resource}.full`,
          input: `poolFull${cap(resource)}` as AdvisorInputId,
          curve: { type: 'binary' },
          weight: 1,
        },
        {
          id: `expand.cap.${resource}.ready`,
          input: `capReady${cap(resource)}` as AdvisorInputId,
          curve: { type: 'binary' },
          weight: 1,
        },
      ],
      reasons: {
        [`poolFull${cap(resource)}` as AdvisorInputId]: `The ${resource} pool is full. I will spend Lysate to widen it.`,
      },
      fallbackReason: 'I will widen a brimming pool.',
    }),
  ),
];

function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Why the emergency bucket fired; determines the forced action and its line. */
export type EmergencyReasonId =
  | 'notActive'
  | 'trauma'
  | 'starving'
  | 'reserveLow'
  | 'fighting'
  | 'signal';

export interface EmergencyDef {
  actionId: string;
  phase: AdvisorPhase;
  reasonId: EmergencyReasonId;
  text: string;
}

/**
 * The emergency bucket runs before utility scoring. It preserves the old
 * guaranteed behaviours exactly and is never influenced by learned weights.
 * Ordered: first match wins.
 */
export const ADVISOR_EMERGENCY: EmergencyDef[] = [
  {
    actionId: 'gather.recover',
    phase: 'gather',
    reasonId: 'notActive',
    text: 'The network is not fully awake. I will draw and steady it.',
  },
  {
    actionId: 'gather.recover',
    phase: 'gather',
    reasonId: 'trauma',
    text: 'The network is raw from the last wound. I will recover first.',
  },
  {
    actionId: 'gather.recover',
    phase: 'gather',
    reasonId: 'starving',
    text: 'The substrate runs dry. Reserves come first.',
  },
  {
    actionId: 'gather.recover',
    phase: 'gather',
    reasonId: 'reserveLow',
    text: 'Reserves are too thin for a fight. I will top up first.',
  },
  {
    actionId: 'hunt.engage',
    phase: 'hunt',
    reasonId: 'fighting',
    text: 'A host is already entangled. I will see it through.',
  },
  {
    actionId: 'hunt.engage',
    phase: 'hunt',
    reasonId: 'signal',
    text: 'A signal is revealed. I will not let it drift away.',
  },
];

/** Maturity ladder. Only `germinating`/`aware` are used until autonomy is built. */
export type AdvisorMaturity = 'germinating' | 'aware' | 'responsive' | 'symbiotic';

export const ADVISOR_TUNING = {
  /** Reserves under this fraction count as "low" (emergency top-up). */
  lowReserveRatio: 0.4,
  /** A pool at or above this fraction counts as "full". */
  fullReserveRatio: 0.9,
  /** Per-observation EMA rate for alignment and bias drift. */
  adaptRate: 0.05,
  /** Bias decays toward 0 by this factor before each reinforcement. */
  biasDecay: 0.98,
  /** Learned multiplicative bias is clamped to ±this on any consideration. */
  biasCap: 0.2,
  /** Observations before the organism explains itself (Aware). */
  awareAtObservations: 8,
  /** Observations before opt-in low-risk autonomy may unlock (Responsive). */
  responsiveAtObservations: 40,
  /** Minimum seconds between explanation lines in the observation log. */
  logMinSeconds: 30,
  /** Per-action cooldown before another concrete action updates the learned bias. */
  actionObserveCooldownSeconds: 15,
} as const;
