<script lang="ts">
  import { goto } from '$app/navigation';
  import { tick } from 'svelte';
  import AsciiBar from './AsciiBar.svelte';
  import { gameStore } from '$lib/stores/game.svelte';
  import { logStore } from '$lib/stores/log.svelte';

  let s = $derived(gameStore.state);

  let phase = $derived(s.gamePhase);
  let water = $derived(s.water);
  let nutrients = $derived(s.nutrients);
  let biomass = $derived(s.biomass);
  let network = $derived(s.mycelialNetwork);
  let shock = $derived(s.tutorialShockTimer);

  let hasPump = $derived(s.tutorialUpgrades.osmoticPump);
  let hasExudates = $derived(s.tutorialUpgrades.enzymaticExudates);
  let canSynthesize = $derived(water >= 10 && nutrients >= 10);
  let canExtend = $derived(biomass >= 5);
  let at4mm = $derived(network >= 4 && phase === 'explorer');
  let networkStrength = $derived.by(() => {
    if (network <= 0) return 'INACTIVE';
    if (network === 1) return 'WEAK';
    if (network === 2) return 'FRAIL';
    if (network === 3) return 'STABLE';
    if (network === 4) return 'STRONG';
    return 'EXPOSED';
  });

  let synthLocked = $derived(phase === 'awakening');
  let extendLocked = $derived(phase === 'awakening' || phase === 'manager');
  let upgradesLocked = $derived(biomass < 2);

  function absorb() {
    gameStore.absorbResources();
  }

  function synthesize() {
    if (synthLocked) return;
    gameStore.synthesizeBiomass();
  }

  function buyUpgrade(id: 'osmoticPump' | 'enzymaticExudates') {
    if (upgradesLocked) return;
    gameStore.purchaseTutorialUpgrade(id);
  }

  function extend() {
    if (extendLocked) return;
    gameStore.extendHyphae();
  }

  let logContainer: HTMLDivElement;
  let logAutoScroll = $state(true);

  function handleLogScroll() {
    if (!logContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = logContainer;
    logAutoScroll = scrollHeight - scrollTop - clientHeight < 32;
  }

  function scrollLogToBottom() {
    if (logContainer && logAutoScroll) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  }

  $effect(() => {
    logStore.entries;
    tick().then(scrollLogToBottom);
  });

  function handlePurge() {
    if (confirm('PURGE: This will wipe all game data and restart. Continue?')) {
      gameStore.resetGame();
    }
  }

  function goToRadar() {
    goto('/radar/');
  }
</script>

<div class="tutorial-frame">
  <!-- Event Log -->
  <div class="panel">
    <div class="panel-header text-label-caps">SYS:EVENT_LOG</div>
    <div class="log-entries" bind:this={logContainer} onscroll={handleLogScroll}>
      {#each logStore.entries as entry (entry.id)}
        <div
          class="log-line"
          class:is-warn={entry.level === 'warn'}
          class:is-error={entry.level === 'error'}
          class:is-success={entry.level === 'success'}
        >
          <span class="log-text">&gt; {entry.text}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Resources -->
  <div class="panel">
    <div class="panel-header text-label-caps">CORE_RESOURCES</div>
    <div class="resource-bars">
      <AsciiBar label="WATER (W)" value={water} max={30} variant="secondary" showPercent={false} />
      <AsciiBar
        label="NUTRIENTS (N)"
        value={nutrients}
        max={30}
        variant="secondary"
        showPercent={false}
      />
      <div class="biomass-count">
        <span class="label text-label-caps">BIOMASS (B)</span>
        <span class="val text-data-mono">{Math.floor(biomass)}</span>
      </div>
      {#if phase === 'explorer' || phase === 'tactician'}
        <div class="network-strength">
          <span class="label text-label-caps">NETWORK (MN)</span>
          <span class="val text-data-mono">{network}mm — {networkStrength}</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Shock Indicator -->
  {#if shock > 0}
    <div class="shock-banner">
      ⚠ SHOCK: WATER/NUTRIENT GEN AT 50% — {Math.ceil(shock)}s REMAINING
    </div>
  {/if}

  <!-- Phase 4 Warning -->
  {#if phase === 'tactician'}
    <div class="tactician-warning">
      <div class="warning-icon">⚠</div>
      <div class="warning-text text-label-caps">
        WARNING: HOSTILE ORGANISM DETECTED<br />
        NEMATODE GRAZING ON OUTER HYPHAE<br />
        PASSIVE SYSTEMS PAUSED
      </div>
    </div>
  {/if}

  <!-- Phase 4 hint -->
  {#if phase === 'explorer' && at4mm}
    <div class="proximity-hint text-label-caps">> Vibrations detected near the outer hyphae...</div>
  {/if}

  <!-- Action Buttons (always visible in phases 1-3, locked appropriately) -->
  {#if phase !== 'tactician'}
    <div class="tutorial-actions">
      <!-- Absorb — always clickable -->
      <button class="cmd-btn action-btn" onclick={absorb}> > EXE:ABSORB_RESOURCES </button>

      <!-- Synthesize — locked in phase 1 -->
      <button
        class="cmd-btn action-btn"
        class:btn-locked={synthLocked}
        class:btn-disabled={!canSynthesize && !synthLocked}
        onclick={synthesize}
      >
        > EXE:SYNTHESIZE_BIOMASS
        {#if synthLocked}
          <span class="lock-badge text-label-caps">[LOCKED]</span>
        {:else}
          <span class="cost-label text-label-caps">[10W, 10N]</span>
        {/if}
      </button>

      <!-- Extend Hyphae — locked in phases 1-2 -->
      <button
        class="cmd-btn action-btn"
        class:btn-locked={extendLocked}
        class:btn-disabled={!canExtend && !extendLocked}
        onclick={extend}
      >
        > EXE:EXTEND_HYPHAE
        {#if extendLocked}
          <span class="lock-badge text-label-caps">[LOCKED]</span>
        {:else}
          <span class="cost-label text-label-caps">[5B]</span>
        {/if}
      </button>
    </div>

    <!-- Automation Upgrades (always visible in phases 1-3, locked until biomass >= 2) -->
    <div class="panel">
      <div class="panel-header text-label-caps">AUTOMATION_UPGRADES</div>
      <div class="upgrade-cards">
        <button
          class="cmd-btn upgrade-card"
          class:card-locked={upgradesLocked}
          class:upgrade-owned={hasPump}
          onclick={() => buyUpgrade('osmoticPump')}
        >
          <span>> SYS:OSMOTIC_PUMP</span>
          {#if upgradesLocked}
            <span class="lock-badge text-label-caps">[LOCKED]</span>
          {:else if hasPump}
            <span class="cost-label">[ACTIVE]</span>
          {:else}
            <span class="cost-label">[2B]</span>
          {/if}
        </button>
        <button
          class="cmd-btn upgrade-card"
          class:card-locked={upgradesLocked}
          class:upgrade-owned={hasExudates}
          onclick={() => buyUpgrade('enzymaticExudates')}
        >
          <span>> SYS:ENZYMATIC_EXUDATES</span>
          {#if upgradesLocked}
            <span class="lock-badge text-label-caps">[LOCKED]</span>
          {:else if hasExudates}
            <span class="cost-label">[ACTIVE]</span>
          {:else}
            <span class="cost-label">[2B]</span>
          {/if}
        </button>
      </div>
    </div>
  {/if}

  <!-- Phase 4: Redirect to Radar -->
  {#if phase === 'tactician'}
    <button class="cmd-btn engage-btn" onclick={goToRadar}> > SYS:PROCEED_TO_RADAR </button>
  {/if}

  <!-- Debug: Reset -->
  <div class="purge-row">
    <button class="cmd-btn purge-btn" onclick={handlePurge}>> EXE:PURGE</button>
  </div>
</div>

<style>
  .tutorial-frame {
    display: flex;
    flex-direction: column;
    gap: var(--space-gutter);
    max-width: 480px;
    margin: 0 auto;
    padding: var(--space-gutter) 0;
    height: 100%;
  }

  .panel {
    border: 1px solid var(--border);
    background: var(--surface);
  }

  .panel-header {
    color: var(--primary);
    padding: var(--space-unit) var(--space-panel-padding);
    background: var(--surface-container-low);
    border-bottom: 1px solid var(--border);
  }

  .panel:first-child {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .log-entries {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--space-panel-padding);
    font-size: var(--font-body-md);
  }

  .log-line {
    color: var(--on-surface-variant);
    line-height: 1.6;
  }

  .is-warn .log-text {
    color: var(--on-surface);
  }

  .is-error .log-text {
    color: var(--alert);
  }

  .is-success .log-text {
    color: var(--primary);
  }

  .resource-bars {
    display: flex;
    flex-direction: column;
    gap: var(--space-unit);
    padding: var(--space-panel-padding);
  }

  .biomass-count {
    display: flex;
    align-items: center;
    gap: var(--space-unit);
    line-height: var(--line-data-mono);
  }

  .biomass-count .label {
    min-width: 110px;
    flex-shrink: 0;
    color: var(--primary);
  }

  .biomass-count .val {
    color: var(--primary);
    font-variant-numeric: tabular-nums;
  }

  .network-strength {
    display: flex;
    align-items: center;
    gap: var(--space-unit);
    line-height: var(--line-data-mono);
  }

  .network-strength .label {
    min-width: 110px;
    flex-shrink: 0;
    color: var(--primary);
  }

  .network-strength .val {
    color: var(--on-surface);
    font-variant-numeric: tabular-nums;
  }

  .shock-banner {
    border: 1px solid var(--alert);
    color: var(--alert);
    padding: var(--space-unit) var(--space-panel-padding);
    text-align: center;
    text-transform: uppercase;
    font-size: var(--font-label-caps);
  }

  .tactician-warning {
    border: 1px solid var(--alert);
    background: var(--surface);
    padding: var(--space-panel-padding);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-unit);
  }

  .warning-icon {
    color: var(--alert);
    font-size: var(--font-headline-lg);
  }

  .warning-text {
    color: var(--alert);
    line-height: 1.8;
  }

  .proximity-hint {
    color: var(--on-surface);
    border: 1px solid var(--border);
    background: var(--surface-container-low);
    padding: var(--space-unit) var(--space-panel-padding);
    text-align: center;
  }

  .tutorial-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-unit);
  }

  .action-btn {
    width: 100%;
    padding: var(--space-panel-padding);
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-gutter);
  }

  .btn-locked {
    opacity: 0.35;
    cursor: default;
  }

  .btn-locked:hover {
    background: transparent;
    color: var(--on-surface);
  }

  .btn-locked .lock-badge {
    color: var(--on-surface-variant);
  }

  .btn-disabled {
    opacity: 0.4;
  }

  .cost-label {
    color: var(--on-surface-variant);
  }

  .lock-badge {
    color: var(--secondary);
  }

  .engage-btn {
    width: 100%;
    padding: var(--space-gutter);
    text-align: center;
    background: var(--primary);
    color: var(--background);
    border-color: var(--primary);
  }

  .engage-btn:hover {
    background: var(--primary-container);
    color: var(--background);
  }

  .upgrade-cards {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background: var(--border);
  }

  .upgrade-card {
    width: 100%;
    padding: var(--space-panel-padding);
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--surface);
    border-radius: 0;
  }

  .upgrade-card:hover {
    background: var(--primary);
    color: var(--background);
  }

  .upgrade-card:hover .cost-label {
    color: var(--background);
  }

  .card-locked {
    opacity: 0.35;
    cursor: default;
  }

  .card-locked:hover {
    background: var(--surface);
    color: var(--on-surface);
  }

  .card-locked .lock-badge {
    color: var(--on-surface-variant);
  }

  .upgrade-owned {
    opacity: 0.5;
    cursor: default;
  }

  .upgrade-owned .cost-label {
    color: var(--primary);
  }

  .purge-row {
    margin-top: var(--space-gutter);
  }

  .purge-btn {
    width: 100%;
    padding: var(--space-panel-padding);
    text-align: center;
    border-color: var(--alert);
    color: var(--alert);
  }

  .purge-btn:hover {
    background: var(--alert);
    color: var(--background);
  }
</style>
