<script lang="ts">
  import { onDestroy } from 'svelte';
  import {
    getHookProgress,
    getNextHookObjective,
    getTutorialReserveCap,
    isSignalSensed,
    TUTORIAL_ABSORB_AMOUNT,
    TUTORIAL_EXTEND_COST,
  } from '@mycosurge/game-engine';
  import { resourceLabel } from '@mycosurge/config';
  import { gameStore } from '$lib/stores/game.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { devStore } from '$lib/stores/dev.svelte';
  import { logStore } from '$lib/stores/log.svelte';
  import ObjectiveBanner from './ObjectiveBanner.svelte';
  import ProgressBar from './ProgressBar.svelte';
  import CountUp from './CountUp.svelte';
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
    TUTORIAL_GENERATOR_COST,
    LOCK_REASONS,
    ONBOARDING_COPY,
  } from '$lib/content/onboarding';

  let s = $derived(gameStore.state);

  const fmtWhole = (n: number) => Math.floor(n).toString();

  let isHandoff = $derived(s.gamePhase === 'tactician');
  let stepId = $derived(
    resolveTutorialStep({
      phase: s.gamePhase,
      biomass: s.biomass,
      mycelialNetwork: s.mycelialNetwork,
    }),
  );
  let step = $derived(isHandoff ? HANDOFF_STEP : TUTORIAL_STEPS[stepId]);

  let waterMax = $derived(getTutorialReserveCap(s, 'water'));
  let nutrientMax = $derived(getTutorialReserveCap(s, 'nutrients'));

  let canSynthesize = $derived(s.water >= 10 && s.nutrients >= 10);
  let canInstall = $derived(s.biomass >= TUTORIAL_GENERATOR_COST);
  let canExtend = $derived(s.biomass >= TUTORIAL_EXTEND_COST);

  let hasPump = $derived(s.tutorialUpgrades.osmoticPump);
  let hasExudates = $derived(s.tutorialUpgrades.enzymaticExudates);
  let shock = $derived(s.tutorialShockTimer);

  // ── Colony bloom ──
  // The bloom grows with overall progress, not just network mm, so every early action
  // visibly sprouts something. The caption still reports the true network length.
  let sensedSignal = $derived(isSignalSensed(s));
  let bloomReach = $derived.by(() => {
    const reserve = Math.min(s.water, s.nutrients, 10) / 10;
    const gens =
      (s.tutorialUpgrades.osmoticPump ? 1 : 0) + (s.tutorialUpgrades.enzymaticExudates ? 1 : 0);
    const biomass = s.totalBiomassEarned > 0 ? 0.4 : 0;
    return Math.min(5, s.mycelialNetwork + reserve * 0.4 + gens * 0.6 + biomass);
  });
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

  // Unlock states: every control stays visible; locked ones are dimmed with a reason.
  let synthAvailable = $derived(s.gamePhase !== 'awakening');
  let genAvailable = $derived(
    s.biomass >= TUTORIAL_GENERATOR_COST || s.gamePhase === 'explorer' || isHandoff,
  );
  let extendAvailable = $derived(s.gamePhase === 'explorer' || isHandoff);

  // Flash a control the moment it unlocks so the change is announced.
  let flash = $state<{ synth: boolean; gen: boolean; extend: boolean }>({
    synth: false,
    gen: false,
    extend: false,
  });
  let prevAvailable: { synth: boolean; gen: boolean; extend: boolean } | null = null;
  const flashTimers: ReturnType<typeof setTimeout>[] = [];

  $effect(() => {
    const now = { synth: synthAvailable, gen: genAvailable, extend: extendAvailable };
    if (prevAvailable) {
      for (const key of Object.keys(now) as (keyof typeof now)[]) {
        if (now[key] && !prevAvailable[key]) {
          flash[key] = true;
          flashTimers.push(
            setTimeout(() => {
              flash[key] = false;
            }, 1500),
          );
        }
      }
    }
    prevAvailable = { ...now };
  });

  onDestroy(() => {
    for (const t of flashTimers) clearTimeout(t);
    for (const t of popTimers) clearTimeout(t);
  });

  function absorb() {
    gameStore.absorbResources();
    popAbsorb();
  }

  function synthesize() {
    if (!canSynthesize) return;
    gameStore.synthesizeBiomass();
    burst();
  }

  function buy(id: 'osmoticPump' | 'enzymaticExudates') {
    if (s.tutorialUpgrades[id] || !canInstall) return;
    gameStore.purchaseTutorialUpgrade(id);
    burst();
  }

  function extend() {
    if (!canExtend) return;
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
            <div class="res-cell">
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
          </div>
          <div class="biomass-block">
            <ProgressBar
              tone="amber"
              label={resourceLabel('biomass', 'first')}
              labelCaps={false}
              value={s.biomass}
              max={s.maxBiomass}
              animate
              format={(n) => `${Math.floor(n)}/${Math.floor(s.maxBiomass)}`}
            />
            <span class="stat-sub text-data-mono">
              <span class="sub-arrow">↑</span>
              <CountUp value={s.totalBiomassEarned} format={fmtWhole} />
              harvested
            </span>
          </div>
          <div class="bloom-block">
            <ColonyBloom
              reach={bloomReach}
              maxReach={5}
              sensed={sensedSignal}
              burstToken={bloomBurst}
              interactive
              onActivate={absorb}
            />
            {#each absorbPops as id (id)}
              <span class="tap-pop text-data-mono">+{TUTORIAL_ABSORB_AMOUNT}</span>
            {/each}
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
                <span class="action-sub">{ONBOARDING_COPY.absorb.effect}</span>
              </button>

              <!-- Synthesize -->
              {#if synthAvailable}
                <button
                  class="action-btn"
                  class:current={stepId === 'grow'}
                  class:flash={flash.synth}
                  disabled={!canSynthesize}
                  onclick={synthesize}
                >
                  <span class="action-verb">Synthesize Biomass</span>
                  <span class="action-sub">
                    {canSynthesize
                      ? `10 ${resourceLabel('water', 'first')} + 10 ${resourceLabel(
                          'nutrients',
                          'first',
                        )} → 1 ${resourceLabel('biomass', 'first')}`
                      : `Need 10 ${resourceLabel('water', 'first')} + 10 ${resourceLabel(
                          'nutrients',
                          'first',
                        )}`}
                  </span>
                </button>
              {:else}
                <div class="action-btn locked">
                  <span class="action-verb">Synthesize Biomass</span>
                  <span class="action-sub">{LOCK_REASONS.synthesize}</span>
                </div>
              {/if}

              <!-- Extend -->
              {#if extendAvailable}
                <button
                  class="action-btn"
                  class:current={stepId === 'expand'}
                  class:flash={flash.extend}
                  disabled={!canExtend}
                  onclick={extend}
                >
                  <span class="action-verb">Extend Hyphae</span>
                  <span class="action-sub">
                    {canExtend
                      ? `${TUTORIAL_EXTEND_COST} ${resourceLabel('biomass', 'first')} → +1mm network`
                      : `Need ${TUTORIAL_EXTEND_COST} ${resourceLabel('biomass', 'first')}`}
                  </span>
                </button>
              {:else}
                <div class="action-btn locked">
                  <span class="action-verb">Extend Hyphae</span>
                  <span class="action-sub">{LOCK_REASONS.extend}</span>
                </div>
              {/if}
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
                        class:flash={flash.gen}
                        disabled={!canInstall}
                        onclick={() => buy(gen.id)}
                      >
                        {TUTORIAL_GENERATOR_COST}
                        <span class="install-unit">{resourceLabel('biomass', 'first')}</span>
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

  .biomass-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .stat-sub {
    align-self: flex-end;
    color: var(--on-surface-variant);
    font-size: 11px;
  }

  .stat-sub .sub-arrow {
    color: var(--primary);
  }

  .res-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .rate {
    color: var(--primary);
    font-size: 11px;
    line-height: 1;
    text-align: right;
  }

  .bloom-block {
    position: relative;
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
    top: 6px;
    left: 50%;
    translate: -50% 0;
    color: var(--primary);
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

  .action-btn.flash {
    animation: unlock-flash 1.5s var(--ease-out-soft);
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

  .install-unit {
    font-size: 10px;
    font-weight: 500;
    opacity: 0.82;
  }

  .install-btn:disabled .install-unit {
    opacity: 1;
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
