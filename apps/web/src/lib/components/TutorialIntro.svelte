<script lang="ts">
  import { fly } from 'svelte/transition';
  import {
    getNextHookObjective,
    getTutorialReserveCap,
    TUTORIAL_GENERATOR2_NUTRIENT_COST,
    TUTORIAL_GENERATOR2_WATER_COST,
    TUTORIAL_GENERATOR_WATER_COST,
    TUTORIAL_SIGNAL_STEPS,
  } from '@mycosurge/game-engine';
  import { resourceLabel } from '@mycosurge/config';
  import { gameStore } from '$lib/stores/game.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { devStore } from '$lib/stores/dev.svelte';
  import ProgressBar from './ProgressBar.svelte';
  import SectorBoard from './SectorBoard.svelte';
  import ResourceIcon from './ResourceIcon.svelte';
  import { TUTORIAL_GENERATORS, LOCK_REASONS, ONBOARDING_COPY } from '$lib/content/onboarding';

  const TUTORIAL_HOST_ID = 'soil_nematode';
  const BAND_MM = 5;
  const STEP_MM = BAND_MM / TUTORIAL_SIGNAL_STEPS;

  let s = $derived(gameStore.state);
  let isHandoff = $derived(s.gamePhase === 'tactician');
  let objective = $derived(getNextHookObjective(s));

  let waterMax = $derived(getTutorialReserveCap(s, 'water'));
  let nutrientMax = $derived(getTutorialReserveCap(s, 'nutrients'));
  let depthsMm = $derived(gameStore.tutorialSectorDepths.map((d) => d * STEP_MM));
  let signalSector = $derived(gameStore.tutorialSignalSector);
  let signalReached = $derived(gameStore.tutorialSignalReached);
  let canGrow = $derived(gameStore.canGrowTutorial);

  let hasPump = $derived(s.tutorialUpgrades.osmoticPump);
  let hasExudates = $derived(s.tutorialUpgrades.enzymaticExudates);
  let shock = $derived(s.tutorialShockTimer);

  // The economy is hidden until the player first can't afford to grow — then it is the answer.
  let economyRevealed = $state(false);
  $effect(() => {
    if (!canGrow || hasPump || hasExudates) economyRevealed = true;
  });

  let upgradeCost = $derived(gameStore.generatorUpgradeCost);
  let canAffordUpgrade = $derived.by(() => {
    const cost = upgradeCost;
    return cost !== null && s.water >= cost.water && s.nutrients >= cost.nutrients;
  });

  function generatorEffectText(id: 'osmoticPump' | 'enzymaticExudates'): string {
    const rate = gameStore.tutorialGeneratorRate;
    return id === 'osmoticPump'
      ? `+${rate} ${resourceLabel('water', 'first')} / sec`
      : `+${rate} ${resourceLabel('nutrients', 'first')} / sec`;
  }

  function upgradeGenerators() {
    gameStore.upgradeTutorialGenerators();
  }

  function canAffordGenerator(id: 'osmoticPump' | 'enzymaticExudates'): boolean {
    return id === 'osmoticPump'
      ? s.water >= TUTORIAL_GENERATOR_WATER_COST
      : s.water >= TUTORIAL_GENERATOR2_WATER_COST &&
          s.nutrients >= TUTORIAL_GENERATOR2_NUTRIENT_COST;
  }

  function generatorCostText(id: 'osmoticPump' | 'enzymaticExudates'): string {
    return id === 'osmoticPump'
      ? `${TUTORIAL_GENERATOR_WATER_COST} Water`
      : `${TUTORIAL_GENERATOR2_WATER_COST} W · ${TUTORIAL_GENERATOR2_NUTRIENT_COST} N`;
  }

  function absorb() {
    gameStore.absorbResources();
  }

  function buy(id: 'osmoticPump' | 'enzymaticExudates') {
    if (s.tutorialUpgrades[id] || !canAffordGenerator(id)) return;
    gameStore.purchaseTutorialUpgrade(id);
  }

  function growSector(sector: number) {
    if (!canGrow) return;
    gameStore.growTutorialSector(sector);
  }

  function engageHost() {
    gameStore.engageHost(TUTORIAL_HOST_ID);
    uiStore.openCombat(TUTORIAL_HOST_ID);
  }

  function skipIntro() {
    gameStore.skipIntro();
    uiStore.closeAll();
  }

  /** Dev tool: skip the gather/automate grind and jump straight into the nematode fight. */
  function skipToFight() {
    gameStore.skipToTutorialFight();
    engageHost();
  }
</script>

<div class="tutorial-frame">
  <header class="tut-head">
    <div class="brand">
      <span class="brand-name text-headline-md">{ONBOARDING_COPY.brand}</span>
      <span class="brand-sub text-label-caps">{ONBOARDING_COPY.brandSub}</span>
    </div>
    {#if devStore.enabled}
      <div class="dev-actions">
        <button class="skip-btn text-label-caps" onclick={skipToFight}>Skip to fight</button>
        <button class="skip-btn text-label-caps" onclick={skipIntro}>Skip intro</button>
      </div>
    {/if}
  </header>

  <div class="tut-grid">
    <div class="res-grid">
      <ProgressBar
        tone="cyan"
        label={resourceLabel('water', 'first')}
        labelCaps={false}
        value={s.water}
        max={waterMax}
        animate
        format={(n) => `${Math.floor(n)}/${Math.floor(waterMax)}`}
      />
      <ProgressBar
        tone="violet"
        label={resourceLabel('nutrients', 'first')}
        labelCaps={false}
        value={s.nutrients}
        max={nutrientMax}
        animate
        format={(n) => `${Math.floor(n)}/${Math.floor(nutrientMax)}`}
      />
    </div>

    {#if shock > 0}
      <div class="shock text-label-caps">⚠ {ONBOARDING_COPY.shock(Math.ceil(shock))}</div>
    {/if}

    <!-- The map leads on mobile; on desktop it sits on the left. -->
    <div class="col-map">
      <section class="panel board-panel">
        <SectorBoard
          depths={depthsMm}
          seed={gameStore.networkSeed}
          stageIndex={1}
          {signalSector}
          signalMm={BAND_MM}
          interactive={!signalReached && canGrow}
          onGrow={growSector}
          label="Your network"
        />
      </section>
    </div>

    <div class="col-controls">
      {#if isHandoff}
        <section class="panel handoff-panel" transition:fly={{ y: 8, duration: 350 }}>
          <div class="panel-body handoff">
            <span class="handoff-kicker text-label-caps">Hostile</span>
            <p class="handoff-name">Soil Nematode</p>
            <button class="action-btn engage-btn" onclick={engageHost}>
              <span class="action-verb">Engage the host</span>
            </button>
          </div>
        </section>
      {:else if economyRevealed && !signalReached}
        <section class="panel economy-panel" transition:fly={{ y: 8, duration: 350 }}>
          <div class="panel-body economy">
            <div class="group">
              <span class="group-label text-label-caps">Keep growing — gather</span>
              <button class="action-btn" class:current={objective.id === 'gather'} onclick={absorb}>
                <span class="action-verb">Absorb</span>
                <span class="action-sub">{ONBOARDING_COPY.absorb.effect}</span>
              </button>
            </div>

            <div class="group">
              <span class="group-label text-label-caps">Automate</span>
              {#if s.water >= TUTORIAL_GENERATOR_WATER_COST || hasPump || hasExudates}
                {#each TUTORIAL_GENERATORS as gen (gen.id)}
                  {@const owned = gen.id === 'osmoticPump' ? hasPump : hasExudates}
                  <div class="gen-row" class:current={objective.id === 'build' && !owned}>
                    <span class="gen-glyph"><ResourceIcon name={gen.icon} size={34} /></span>
                    <span class="gen-info">
                      <span class="gen-name">{gen.recommended ? '★ ' : ''}{gen.name}</span>
                      <span class="gen-rate text-data-mono">{generatorEffectText(gen.id)}</span>
                    </span>
                    {#if owned}
                      <span class="gen-owned text-label-caps">Installed</span>
                    {:else}
                      <button
                        class="install-btn"
                        disabled={!canAffordGenerator(gen.id)}
                        onclick={() => buy(gen.id)}
                      >
                        {generatorCostText(gen.id)}
                      </button>
                    {/if}
                  </div>
                {/each}
                {#if (hasPump || hasExudates) && upgradeCost}
                  <button
                    class="upgrade-btn"
                    disabled={!canAffordUpgrade}
                    onclick={upgradeGenerators}
                  >
                    Upgrade generators · {upgradeCost.water} W · {upgradeCost.nutrients} N
                  </button>
                {/if}
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
    max-width: 560px;
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

  .dev-actions {
    display: flex;
    gap: 6px;
  }

  .skip-btn {
    font: inherit;
    color: var(--on-surface-variant);
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    padding: 4px 10px;
    cursor: pointer;
  }

  .skip-btn:hover {
    color: var(--on-surface);
    border-color: var(--on-surface-variant);
  }

  .res-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .shock {
    border: 1px solid var(--alert);
    background: var(--error-container);
    border-radius: var(--radius-md);
    color: var(--on-error-container);
    padding: 10px var(--space-panel-padding);
    text-align: center;
  }

  /* Mobile: one column — resources, then the map, then the controls. */
  .tut-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .col-controls,
  .col-map {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  .panel {
    background: var(--surface-container);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }

  .board-panel {
    padding: 12px;
  }

  .economy-panel .panel-body {
    padding: 12px;
  }

  .economy {
    display: flex;
    flex-direction: column;
    gap: 14px;
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
      background-color var(--duration-fast) var(--ease-out-soft),
      box-shadow var(--duration-fast) var(--ease-out-soft);
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

  .action-btn:hover:not(:disabled) {
    background: var(--primary-fixed-dim);
    border-color: var(--primary-fixed-dim);
    box-shadow: var(--shadow-md);
  }

  .action-btn.current {
    box-shadow:
      0 0 0 2px var(--primary-glow),
      var(--shadow-sm);
  }

  /* Unavailable (e.g. an unaffordable generator): strictly greyed out. */
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
    padding: 8px 12px;
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    white-space: nowrap;
  }

  .install-btn:hover:not(:disabled) {
    background: var(--primary-fixed-dim);
    border-color: var(--primary-fixed-dim);
  }

  .install-btn:disabled {
    background: var(--surface-container);
    border-color: var(--border);
    color: var(--on-surface-variant);
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  .upgrade-btn {
    width: 100%;
    margin-top: 2px;
    font: inherit;
    font-weight: 600;
    color: var(--primary);
    background: transparent;
    border: 1px dashed var(--outline);
    border-radius: var(--radius-sm);
    padding: 9px 12px;
    cursor: pointer;
  }

  .upgrade-btn:hover:not(:disabled) {
    border-color: var(--primary);
    background: var(--surface-container-high);
  }

  .upgrade-btn:disabled {
    color: var(--on-surface-variant);
    border-color: var(--border);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .handoff {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px;
    text-align: center;
  }

  .handoff-kicker {
    color: var(--alert);
  }

  .handoff-name {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--on-surface);
  }

  .engage-btn {
    width: 100%;
    margin-top: 4px;
  }

  /* Desktop: the map on the left, resources + controls stacked on the right. */
  @media (min-width: 768px) and (orientation: landscape) {
    .tutorial-frame {
      max-width: 1040px;
    }

    .tut-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
      grid-template-areas:
        'map resources'
        'map shock'
        'map controls';
      gap: 16px;
      align-items: start;
    }

    .res-grid {
      grid-area: resources;
    }

    .shock {
      grid-area: shock;
    }

    .col-map {
      grid-area: map;
    }

    .col-controls {
      grid-area: controls;
    }
  }
</style>
