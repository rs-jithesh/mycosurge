<script lang="ts">
  import { onDestroy } from 'svelte';
  import {
    getHookProgress,
    getNextHookObjective,
    getTutorialReserveCap,
    isSignalSensed,
    nutrientsUnlocked,
    TUTORIAL_ABSORB_NUTRIENTS,
    TUTORIAL_ABSORB_WATER,
    TUTORIAL_GENERATOR2_NUTRIENT_COST,
    TUTORIAL_GENERATOR2_WATER_COST,
    TUTORIAL_GENERATOR_WATER_COST,
    TUTORIAL_GROW_NUTRIENT_COST,
    TUTORIAL_GROW_WATER_COST,
  } from '@mycosurge/game-engine';
  import { resourceLabel } from '@mycosurge/config';
  import { gameStore } from '$lib/stores/game.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { devStore } from '$lib/stores/dev.svelte';
  import { logStore } from '$lib/stores/log.svelte';
  import ObjectiveBanner from './ObjectiveBanner.svelte';
  import ProgressBar from './ProgressBar.svelte';
  import ColonyBloom from './ColonyBloom.svelte';
  import NextGoalChip from './NextGoalChip.svelte';
  import ResourceIcon from './ResourceIcon.svelte';
  import ActivityLog from './ActivityLog.svelte';
  import HuntSection from '$lib/components/hunt/HuntSection.svelte';
  import {
    TUTORIAL_STEPS,
    HANDOFF_STEP,
    resolveTutorialStep,
    TUTORIAL_GENERATORS,
    LOCK_REASONS,
    ONBOARDING_COPY,
  } from '$lib/content/onboarding';

  let s = $derived(gameStore.state);

  let isHandoff = $derived(s.gamePhase === 'tactician');
  let stepId = $derived(
    resolveTutorialStep({ phase: s.gamePhase, water: s.water, nutrients: s.nutrients }),
  );
  let step = $derived(isHandoff ? HANDOFF_STEP : TUTORIAL_STEPS[stepId]);

  let nutrientsShown = $derived(nutrientsUnlocked(s));
  let waterMax = $derived(getTutorialReserveCap(s, 'water'));
  let nutrientMax = $derived(getTutorialReserveCap(s, 'nutrients'));

  // Growth past the first hypha waits until both generators are installed.
  let growBlocked = $derived(
    s.mycelialNetwork >= 1 &&
      !(s.tutorialUpgrades.osmoticPump && s.tutorialUpgrades.enzymaticExudates),
  );
  let canGrow = $derived(
    !growBlocked &&
      s.water >= TUTORIAL_GROW_WATER_COST &&
      (!nutrientsShown || s.nutrients >= TUTORIAL_GROW_NUTRIENT_COST),
  );
  let growCostText = $derived(
    growBlocked
      ? LOCK_REASONS.automate
      : canGrow
        ? nutrientsShown
          ? ONBOARDING_COPY.grow.effectBoth
          : ONBOARDING_COPY.grow.effectWater
        : LOCK_REASONS.grow,
  );

  let hasPump = $derived(s.tutorialUpgrades.osmoticPump);
  let hasExudates = $derived(s.tutorialUpgrades.enzymaticExudates);
  let shock = $derived(s.tutorialShockTimer);

  function canAffordGenerator(id: 'osmoticPump' | 'enzymaticExudates'): boolean {
    return id === 'osmoticPump'
      ? s.water >= TUTORIAL_GENERATOR_WATER_COST
      : s.water >= TUTORIAL_GENERATOR2_WATER_COST &&
          s.nutrients >= TUTORIAL_GENERATOR2_NUTRIENT_COST;
  }

  function generatorCostText(id: 'osmoticPump' | 'enzymaticExudates'): string {
    return id === 'osmoticPump'
      ? `${TUTORIAL_GENERATOR_WATER_COST} Water`
      : `${TUTORIAL_GENERATOR2_WATER_COST} Water + ${TUTORIAL_GENERATOR2_NUTRIENT_COST} Nutrients`;
  }

  // ── Colony bloom ──
  // The bloom is the network, so it grows only when the player grows hyphae — tapping
  // Absorb changes reserves, not the organism. Generators are shown elsewhere.
  let sensedSignal = $derived(isSignalSensed(s));
  let bloomReach = $derived(s.mycelialNetwork);
  let bloomBurst = $state(0);
  function burst() {
    bloomBurst += 1;
  }

  // The always-close goal, derived from the engine's hook track.
  let hookObjective = $derived(getNextHookObjective(s));
  let hookProgress = $derived(getHookProgress(s));

  // Live production the tutorial actually applies: +1/s per generator, halved during shock.
  let shockMul = $derived(s.tutorialShockTimer > 0 ? 0.5 : 1);
  let waterRate = $derived(hasPump ? shockMul : 0);
  let nutrientRate = $derived(hasExudates ? shockMul : 0);

  // The first reveal: note it once when the frontier signal is first sensed.
  let signalAnnounced = false;
  $effect(() => {
    if (sensedSignal && !signalAnnounced) {
      signalAnnounced = true;
      logStore.info('A tremor at the edge of the hyphae — something is out there.');
    }
  });

  // Small "+2" pops on the Absorb button so a tap has a visible result.
  let absorbPops = $state<number[]>([]);
  const popTimers: ReturnType<typeof setTimeout>[] = [];
  function popAbsorb() {
    const id = Date.now() + Math.random();
    absorbPops = [...absorbPops, id];
    popTimers.push(
      setTimeout(() => {
        absorbPops = absorbPops.filter((p) => p !== id);
      }, 720),
    );
  }

  // Generators unlock with Nutrients; flash them the moment they appear.
  let genAvailable = $derived(nutrientsShown);
  let flashGen = $state(false);
  const flashTimers: ReturnType<typeof setTimeout>[] = [];
  let prevGenAvailable: boolean | null = null;

  $effect(() => {
    if (prevGenAvailable !== null && genAvailable && !prevGenAvailable) {
      flashGen = true;
      flashTimers.push(setTimeout(() => (flashGen = false), 1500));
    }
    prevGenAvailable = genAvailable;
  });

  onDestroy(() => {
    for (const t of flashTimers) clearTimeout(t);
    for (const t of popTimers) clearTimeout(t);
  });

  function absorb() {
    gameStore.absorbResources();
    popAbsorb();
  }

  function buy(id: 'osmoticPump' | 'enzymaticExudates') {
    if (s.tutorialUpgrades[id] || !canAffordGenerator(id)) return;
    gameStore.purchaseTutorialUpgrade(id);
    burst();
  }

  function grow() {
    if (!canGrow) return;
    gameStore.extendHyphae();
    burst();
  }

  function skipIntro() {
    gameStore.skipIntro();
    uiStore.closeAll();
  }
</script>

<div class="tutorial-frame">
  <header class="tut-head">
    <div class="brand">
      <span class="brand-name text-headline-md">{ONBOARDING_COPY.brand}</span>
      <span class="brand-sub text-label-caps">{ONBOARDING_COPY.brandSub}</span>
    </div>
    <div class="head-right">
      <span class="step-chip text-data-mono"
        >{ONBOARDING_COPY.stepLabel(step.index, step.total)}</span
      >
      {#if devStore.enabled}
        <button class="skip-btn text-label-caps" onclick={skipIntro}>Skip intro</button>
      {/if}
    </div>
  </header>

  <div class="stepper" aria-hidden="true">
    {#each Array.from({ length: step.total }) as _, i}
      <i class:done={i + 1 < step.index} class:active={i + 1 === step.index}></i>
    {/each}
  </div>

  <ObjectiveBanner
    tag={step.tag}
    title={step.title}
    description={step.description}
    hint={step.hint}
    tone={step.tone}
  />

  {#if hookProgress}
    <NextGoalChip objective={hookObjective} progress={hookProgress} />
  {/if}

  {#if shock > 0}
    <div class="shock text-label-caps">⚠ {ONBOARDING_COPY.shock(Math.ceil(shock))}</div>
  {/if}

  <div class="tut-grid">
    <div class="tut-col-left">
      <section class="panel area-resources">
        <div class="panel-body resources">
          <div class="res-grid">
            <div class="res-cell" class:wide={!nutrientsShown}>
              <ProgressBar
                tone="cyan"
                label={resourceLabel('water', 'first')}
                labelCaps={false}
                value={s.water}
                max={waterMax}
                animate
                format={(n) => `${Math.floor(n)}/${Math.floor(waterMax)}`}
              />
              {#if waterRate > 0}
                <span class="rate text-data-mono">+{waterRate.toFixed(1)}/s</span>
              {/if}
            </div>
            {#if nutrientsShown}
              <div class="res-cell">
                <ProgressBar
                  tone="violet"
                  label={resourceLabel('nutrients', 'first')}
                  labelCaps={false}
                  value={s.nutrients}
                  max={nutrientMax}
                  animate
                  format={(n) => `${Math.floor(n)}/${Math.floor(nutrientMax)}`}
                />
                {#if nutrientRate > 0}
                  <span class="rate text-data-mono">+{nutrientRate.toFixed(1)}/s</span>
                {/if}
              </div>
            {/if}
          </div>
          <div class="bloom-block">
            <ColonyBloom
              seed={gameStore.networkSeed}
              reach={bloomReach}
              sensed={sensedSignal}
              burstToken={bloomBurst}
            />
            <div class="bloom-caption">
              <span class="text-label-caps">Network</span>
              <span class="text-data-mono">{s.mycelialNetwork} / 5 mm</span>
            </div>
          </div>
        </div>
      </section>

      <div class="area-activity">
        <ActivityLog embedded />
      </div>
    </div>

    <div class="tut-col-actions">
      {#if isHandoff}
        <HuntSection mode="tutorial" />
      {:else}
        <section class="panel">
          <div class="panel-body actions">
            <!-- Actions -->
            <div class="group">
              <span class="group-label text-label-caps">Actions</span>

              <!-- Absorb -->
              <button class="action-btn" class:current={stepId === 'feed'} onclick={absorb}>
                <span class="action-verb">Absorb</span>
                <span class="action-sub">
                  {nutrientsShown
                    ? ONBOARDING_COPY.absorb.effectBoth
                    : ONBOARDING_COPY.absorb.effectWater}
                </span>
                {#each absorbPops as id (id)}
                  <span class="tap-pop text-data-mono">+{TUTORIAL_ABSORB_WATER}</span>
                {/each}
              </button>

              <!-- Grow -->
              <button
                class="action-btn"
                class:current={stepId === 'grow' || stepId === 'nutrients' || stepId === 'expand'}
                disabled={!canGrow}
                onclick={grow}
              >
                <span class="action-verb">Grow Hyphae</span>
                <span class="action-sub">{growCostText}</span>
              </button>
            </div>

            <!-- Generators -->
            <div class="group">
              <span class="group-label text-label-caps">Generators</span>

              {#if genAvailable}
                {#each TUTORIAL_GENERATORS as gen (gen.id)}
                  {@const owned = gen.id === 'osmoticPump' ? hasPump : hasExudates}
                  <div class="gen-row" class:current={stepId === 'automate' && !owned}>
                    <span class="gen-glyph"><ResourceIcon name={gen.icon} size={34} round /></span>
                    <span class="gen-info">
                      <span class="gen-name">{gen.recommended ? '★ ' : ''}{gen.name}</span>
                      <span class="gen-rate text-data-mono">{gen.effect}</span>
                    </span>
                    {#if owned}
                      <span class="gen-owned text-label-caps">Installed</span>
                    {:else}
                      <button
                        class="install-btn"
                        class:flash={flashGen}
                        disabled={!canAffordGenerator(gen.id)}
                        onclick={() => buy(gen.id)}
                      >
                        {generatorCostText(gen.id)}
                      </button>
                    {/if}
                  </div>
                {/each}
              {:else}
                <div class="action-btn locked">
                  <span class="action-verb">Install a generator</span>
                  <span class="action-sub">{LOCK_REASONS.generators}</span>
                </div>
              {/if}
            </div>
          </div>
        </section>
      {/if}
    </div>
  </div>
</div>

<style>
  .tutorial-frame {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 480px;
    margin: 0 auto;
    padding: var(--space-gutter) 0 var(--space-margin);
  }

  /* Mobile: single column in the original order (resources → actions → latest).
     The left wrapper dissolves so its two panels can be reordered around the actions. */
  .tut-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .tut-col-left {
    display: contents;
  }

  .area-resources {
    order: 1;
  }

  .tut-col-actions {
    order: 2;
  }

  .area-activity {
    order: 3;
  }

  .area-resources,
  .tut-col-actions,
  .area-activity {
    min-width: 0;
  }

  /* Desktop: resources + latest packed on the left, actions on the right. */
  @media (min-width: 768px) and (orientation: landscape) {
    .tutorial-frame {
      max-width: 840px;
    }

    .tut-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: start;
    }

    .tut-col-left {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;
    }
  }

  .tut-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-gutter);
  }

  .brand {
    display: flex;
    flex-direction: column;
  }

  .brand-name {
    color: var(--primary);
    letter-spacing: 0.14em;
  }

  .brand-sub {
    color: var(--on-surface-variant);
  }

  .step-chip {
    color: var(--on-surface-variant);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    padding: 4px 10px;
  }

  .head-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .skip-btn {
    font: inherit;
    color: var(--on-surface-variant);
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    padding: 4px 10px;
    cursor: pointer;
    transition:
      color var(--duration-fast) var(--ease-out-soft),
      border-color var(--duration-fast) var(--ease-out-soft);
  }

  .skip-btn:hover {
    color: var(--on-surface);
    border-color: var(--on-surface-variant);
  }

  .stepper {
    display: flex;
    gap: 6px;
  }

  .stepper i {
    flex: 1;
    height: 4px;
    border-radius: var(--radius-pill);
    background: var(--surface-container-high);
  }

  .stepper i.done {
    background: var(--primary);
  }

  .stepper i.active {
    background: var(--warning);
  }

  .shock {
    border: 1px solid var(--alert);
    background: var(--error-container);
    border-radius: var(--radius-md);
    color: var(--on-error-container);
    padding: 10px var(--space-panel-padding);
    text-align: center;
  }

  .panel {
    background: var(--surface-container);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }

  .panel-body {
    padding: 12px;
  }

  /* Compact resource strip */
  .resources {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .res-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .res-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .res-cell.wide {
    grid-column: 1 / -1;
  }

  .rate {
    color: var(--primary);
    font-size: 11px;
    line-height: 1;
    text-align: right;
  }

  .bloom-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding-top: 4px;
  }

  .bloom-caption {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-gutter);
    width: 100%;
    color: var(--on-surface-variant);
  }

  .bloom-caption .text-data-mono {
    color: var(--primary);
  }

  .tap-pop {
    position: absolute;
    top: 2px;
    right: 10px;
    color: var(--on-primary);
    font-weight: 700;
    pointer-events: none;
    animation: tap-pop 700ms var(--ease-out-soft) forwards;
  }

  @keyframes tap-pop {
    0% {
      opacity: 0;
      transform: translateY(6px);
    }
    25% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateY(-16px);
    }
  }

  /* Action groups */
  .actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .group-label {
    color: var(--on-surface-variant);
    padding: 0 2px;
  }

  /* Enabled actions are filled with the primary colour; disabled ones are
     strictly greyed out so it is obvious when you can act. */
  .action-btn {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    width: 100%;
    text-align: center;
    font: inherit;
    color: var(--on-primary);
    background: var(--primary);
    border: 1px solid var(--primary);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    transition:
      transform 120ms var(--ease-out-soft),
      box-shadow var(--duration-fast) var(--ease-out-soft),
      border-color var(--duration-fast) var(--ease-out-soft),
      background-color var(--duration-fast) var(--ease-out-soft),
      color var(--duration-fast) var(--ease-out-soft);
  }

  .action-verb {
    font-weight: 600;
  }

  .action-sub {
    font-size: var(--font-label-caps);
    font-weight: 500;
    color: var(--on-primary);
    opacity: 0.82;
  }

  button.action-btn:hover:not(:disabled) {
    background: var(--primary-fixed-dim);
    border-color: var(--primary-fixed-dim);
    box-shadow: var(--shadow-md);
  }

  button.action-btn:active:not(:disabled) {
    transform: translateY(1px);
    box-shadow: none;
  }

  /* The step's current call-to-action gets a luminous ring. */
  .action-btn.current {
    box-shadow:
      0 0 0 2px var(--primary-glow),
      var(--shadow-sm);
  }

  button.action-btn.current:hover:not(:disabled) {
    background: var(--primary-fixed-dim);
    border-color: var(--primary-fixed-dim);
  }

  .action-btn:disabled {
    background: var(--surface-container);
    border-color: var(--border);
    color: var(--on-surface-variant);
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  .action-btn:disabled .action-sub {
    color: var(--on-surface-variant);
    opacity: 1;
  }

  /* Not yet revealed: dashed and inert, distinct from merely unaffordable. */
  .action-btn.locked {
    background: transparent;
    border-style: dashed;
    border-color: var(--border);
    color: var(--on-surface-variant);
    box-shadow: none;
    cursor: not-allowed;
  }

  .action-btn.locked .action-sub {
    color: var(--on-surface-variant);
    opacity: 1;
  }

  @keyframes unlock-flash {
    0% {
      box-shadow: 0 0 0 0 var(--primary-glow);
      border-color: var(--primary);
    }
    100% {
      box-shadow: 0 0 0 14px rgba(112, 253, 195, 0);
    }
  }

  /* Generator rows */
  .gen-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    background: var(--surface-container-high);
    border: 1px solid var(--outline-variant);
    border-radius: var(--radius-md);
    padding: 9px 10px 9px 12px;
    box-shadow: var(--shadow-sm);
  }

  .gen-row.current {
    border-color: var(--primary);
    box-shadow:
      0 0 0 1px var(--primary) inset,
      var(--shadow-sm);
  }

  .gen-glyph {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    color: var(--primary);
    font-family: var(--font-mono);
    font-size: 15px;
    flex-shrink: 0;
  }

  .gen-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .gen-name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .gen-rate {
    color: var(--primary);
  }

  .gen-owned {
    color: var(--primary);
    flex-shrink: 0;
  }

  .install-btn {
    flex-shrink: 0;
    display: inline-flex;
    align-items: baseline;
    gap: 3px;
    font: inherit;
    font-weight: 600;
    color: var(--on-primary);
    background: var(--primary);
    border: 1px solid var(--primary);
    border-radius: var(--radius-sm);
    padding: 8px 14px;
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    white-space: nowrap;
    transition:
      transform 120ms var(--ease-out-soft),
      background-color var(--duration-fast) var(--ease-out-soft),
      box-shadow var(--duration-fast) var(--ease-out-soft);
  }

  .install-btn:hover:not(:disabled) {
    background: var(--primary-fixed-dim);
    border-color: var(--primary-fixed-dim);
    box-shadow: var(--shadow-md);
  }

  .install-btn:active:not(:disabled) {
    transform: translateY(1px);
    box-shadow: none;
  }

  .install-btn:disabled {
    background: var(--surface-container);
    border-color: var(--border);
    color: var(--on-surface-variant);
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  .install-btn.flash {
    animation: unlock-flash 1.5s var(--ease-out-soft);
  }

  /* Activity feed shares the left column with the resource meters. */
  .area-activity {
    min-width: 0;
  }
</style>
