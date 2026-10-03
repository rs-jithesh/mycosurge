<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { onDestroy } from 'svelte';
  import { gameStore } from '$lib/stores/game.svelte';
  import { logStore } from '$lib/stores/log.svelte';
  import ObjectiveBanner from './ObjectiveBanner.svelte';
  import ProgressBar from './ProgressBar.svelte';
  import CountUp from './CountUp.svelte';
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
  let latest = $derived(logStore.entries.at(-1));

  let atThreshold = $derived(!isHandoff && (stepId === 'feed' || stepId === 'grow'));
  let waterMax = $derived(atThreshold ? 10 : s.waterCap);
  let nutrientMax = $derived(atThreshold ? 10 : s.nutrientsCap);
  let showNetwork = $derived(stepId === 'expand' || isHandoff);

  let canSynthesize = $derived(s.water >= 10 && s.nutrients >= 10);
  let canInstall = $derived(s.biomass >= TUTORIAL_GENERATOR_COST);
  let canExtend = $derived(s.biomass >= 5);

  let hasPump = $derived(s.tutorialUpgrades.osmoticPump);
  let hasExudates = $derived(s.tutorialUpgrades.enzymaticExudates);
  let shock = $derived(s.tutorialShockTimer);

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
  });

  function absorb() {
    gameStore.absorbResources();
  }

  function synthesize() {
    if (!canSynthesize) return;
    gameStore.synthesizeBiomass();
  }

  function buy(id: 'osmoticPump' | 'enzymaticExudates') {
    if (s.tutorialUpgrades[id] || !canInstall) return;
    gameStore.purchaseTutorialUpgrade(id);
  }

  function extend() {
    if (!canExtend) return;
    gameStore.extendHyphae();
  }

  function goToRadar() {
    goto(resolve('/radar/'));
  }

  function skipIntro() {
    gameStore.skipIntro();
    goto(resolve('/'));
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
      <button class="skip-btn text-label-caps" onclick={skipIntro}>Skip intro</button>
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

  {#if shock > 0}
    <div class="shock text-label-caps">⚠ {ONBOARDING_COPY.shock(Math.ceil(shock))}</div>
  {/if}

  <section class="panel">
    <div class="panel-body resources">
      <div class="res-grid">
        <ProgressBar
          tone="cyan"
          label="Water"
          value={s.water}
          max={waterMax}
          valueText={`${Math.floor(s.water)}/${Math.floor(waterMax)}`}
        />
        <ProgressBar
          tone="violet"
          label="Nutrients"
          value={s.nutrients}
          max={nutrientMax}
          valueText={`${Math.floor(s.nutrients)}/${Math.floor(nutrientMax)}`}
        />
      </div>
      <div class="stat-line">
        <span class="stat-label text-label-caps">Biomass</span>
        <span class="stat-value text-data-mono">
          <CountUp value={s.biomass} format={fmtWhole} />
        </span>
        <span class="stat-sub text-data-mono">
          <span class="sub-arrow">↑</span>
          <CountUp value={s.totalBiomassEarned} format={fmtWhole} />
          harvested
        </span>
      </div>
      {#if showNetwork}
        <ProgressBar
          tone="mint"
          label="Network"
          value={s.mycelialNetwork}
          max={5}
          valueText={`${s.mycelialNetwork} / 5 mm`}
        />
      {/if}
    </div>
  </section>

  <section class="panel">
    <div class="panel-body actions">
      {#if isHandoff}
        <button class="action-btn current" onclick={goToRadar}>
          <span class="action-verb">{ONBOARDING_COPY.proceed.label}</span>
          <span class="action-sub">{ONBOARDING_COPY.proceed.effect}</span>
        </button>
      {:else}
        <!-- Actions -->
        <div class="group">
          <span class="group-label text-label-caps">Actions</span>

          <!-- Absorb -->
          <button class="action-btn" class:current={stepId === 'feed'} onclick={absorb}>
            <span class="action-verb">Absorb</span>
            <span class="action-sub">+1 Water · +1 Nutrients</span>
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
                  ? '10 Water + 10 Nutrients → 1 Biomass'
                  : 'Need 10 Water + 10 Nutrients'}
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
                {canExtend ? '5 Biomass → +1mm network' : 'Need 5 Biomass'}
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
                <span class="gen-glyph">{gen.glyph}</span>
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
                    {canInstall ? 'Install' : 'Need 2 Biomass'}
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
      {/if}
    </div>
  </section>

  <section class="panel activity-panel">
    <span class="activity-label text-label-caps">Latest</span>
    <span class="activity-text text-data-mono">
      {latest?.text ?? 'Awaiting your first move…'}
    </span>
  </section>
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

  .stat-line {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 2px;
  }

  .stat-label {
    color: var(--on-surface);
  }

  .stat-value {
    color: var(--primary);
    font-size: var(--font-headline-md);
    font-weight: 700;
    line-height: 1;
  }

  .stat-sub {
    margin-left: auto;
    color: var(--on-surface-variant);
    font-size: 11px;
  }

  .stat-sub .sub-arrow {
    color: var(--primary);
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
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-sm);
    background: var(--surface-container-lowest);
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
    font: inherit;
    font-weight: 600;
    color: var(--on-primary);
    background: var(--primary);
    border: 1px solid var(--primary);
    border-radius: var(--radius-sm);
    padding: 8px 14px;
    box-shadow: var(--shadow-sm);
    cursor: pointer;
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

  /* Activity ticker */
  .activity-panel {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 9px 12px;
  }

  .activity-label {
    color: var(--primary);
    flex-shrink: 0;
  }

  .activity-text {
    color: var(--on-surface-variant);
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
