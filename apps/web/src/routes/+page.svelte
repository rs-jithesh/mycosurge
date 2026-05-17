<script lang="ts">
  import { tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { gameStore } from '$lib/stores/game.svelte';
  import { logStore } from '$lib/stores/log.svelte';
  import TutorialIntro from '$lib/components/TutorialIntro.svelte';
  import AsciiBar from '$lib/components/AsciiBar.svelte';
  import {
    WATER_YIELD_THRESHOLD,
    NUTRIENT_YIELD_THRESHOLD,
    MAX_WATER_BASE,
    MAX_NUTRIENT_BASE,
    MAX_BIOMASS_BASE,
    LYSATE_CAP_EXPAND_AMOUNT,
    GENERATORS,
    getGeneratorCost,
    getLysateCapExpandCost,
  } from '@mycosurge/config';

  let logContainer = $state<HTMLDivElement>();
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

  let isFullGame = $derived(gameStore.state.gamePhase === 'active');

  let biomassDisplay = $derived.by(() => {
    const b = gameStore.biomass;
    if (b >= 1000000) return (b / 1000000).toFixed(1) + 'M';
    if (b >= 1000) return (b / 1000).toFixed(1) + 'k';
    return Math.floor(b).toString();
  });

  let waterPercent = $derived(
    Math.min(100, Math.round((gameStore.state.water / gameStore.state.waterCap) * 100)),
  );
  let nutrientsPercent = $derived(
    Math.min(100, Math.round((gameStore.state.nutrients / gameStore.state.nutrientsCap) * 100)),
  );

  let isWaterCritical = $derived(waterPercent < WATER_YIELD_THRESHOLD * 100);
  let hasRawLysate = $derived(gameStore.state.lysateRaw > 0);
  let hasBankedLysate = $derived(gameStore.state.lysateBanked > 0);

  let waterExpandCost = $derived(
    hasBankedLysate
      ? getLysateCapExpandCost(
          Math.max(0, (gameStore.state.waterCap - MAX_WATER_BASE) / LYSATE_CAP_EXPAND_AMOUNT),
        )
      : 0,
  );
  let nutrientExpandCost = $derived(
    hasBankedLysate
      ? getLysateCapExpandCost(
          Math.max(
            0,
            (gameStore.state.nutrientsCap - MAX_NUTRIENT_BASE) / LYSATE_CAP_EXPAND_AMOUNT,
          ),
        )
      : 0,
  );
  let biomassExpandCost = $derived(
    hasBankedLysate
      ? getLysateCapExpandCost(
          Math.max(0, (gameStore.state.maxBiomass - MAX_BIOMASS_BASE) / LYSATE_CAP_EXPAND_AMOUNT),
        )
      : 0,
  );
  let isNutrientCritical = $derived(nutrientsPercent < NUTRIENT_YIELD_THRESHOLD * 100);

  let waterStatus = $derived.by(() => {
    if (waterPercent < 15) return 'STATUS: STARVATION';
    if (isWaterCritical) return 'STATUS: CRITICAL DEPLETION';
    return 'STATUS: STABLE';
  });

  let nutrientsStatus = $derived.by(() => {
    if (nutrientsPercent < 15) return 'STATUS: STARVATION';
    if (isNutrientCritical) return 'STATUS: CRITICAL';
    return 'STATUS: STABLE';
  });

  function pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  function fmtTime(ts: number): string {
    const d = new Date(ts);
    return `[${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]`;
  }
</script>

{#if !isFullGame}
  <TutorialIntro />
{/if}

{#if isFullGame}
  <!-- ── Desktop View ── -->
  <div class="desktop-view">
    <!-- CURRENT STATE Cards -->
    <div class="panel state-panel">
      <div class="panel-header">
        <span class="text-label-caps">CURRENT STATE</span>
        <span class="text-data-mono badge-overview">SYS_STATUS_OVERVIEW</span>
      </div>
      <div class="resource-cards">
        <!-- Biomass -->
        <div class="res-card">
          <div class="res-card-header text-label-caps">BIOMASS</div>
          <div class="res-card-value">{biomassDisplay}</div>
          <div class="res-card-status text-label-caps">STATUS: OPTIMAL</div>
          <div class="res-card-cap text-data-mono">CAP: {Math.floor(gameStore.maxBiomass)}</div>
        </div>
        <!-- Water -->
        <div class="res-card" class:res-critical={isWaterCritical}>
          <div class="res-card-header text-label-caps">
            <span>WATER (W)</span>
            {#if isWaterCritical}
              <span class="alert-badge">[!]</span>
            {/if}
          </div>
          <div class="res-card-value">{waterPercent}%</div>
          <div class="res-card-status text-label-caps">{waterStatus}</div>
          <div class="res-card-bar">
            <AsciiBar
              value={gameStore.state.water}
              max={gameStore.state.waterCap}
              variant={isWaterCritical ? 'alert' : 'primary'}
              showPercent={false}
            />
          </div>
          <div class="res-card-cap text-data-mono">REQ: {WATER_YIELD_THRESHOLD * 100}%</div>
        </div>
        <!-- Nutrients -->
        <div class="res-card" class:res-critical={isNutrientCritical}>
          <div class="res-card-header text-label-caps">
            <span>NUTRIENTS (N)</span>
            {#if isNutrientCritical}
              <span class="alert-badge">[!]</span>
            {/if}
          </div>
          <div class="res-card-value">{nutrientsPercent}%</div>
          <div class="res-card-status text-label-caps">{nutrientsStatus}</div>
          <div class="res-card-bar">
            <AsciiBar
              value={gameStore.state.nutrients}
              max={gameStore.state.nutrientsCap}
              variant={isNutrientCritical ? 'alert' : 'primary'}
              showPercent={false}
            />
          </div>
          <div class="res-card-cap text-data-mono">
            CAP: {Math.floor(gameStore.state.nutrientsCap)}
          </div>
        </div>
      </div>
    </div>

    <!-- Lysate Panel -->
    <div class="panel lysate-panel">
      <div class="panel-header">
        <span class="text-label-caps">LYSATE BANK</span>
        <span class="text-data-mono badge-filter">
          RAW: {Math.floor(gameStore.state.lysateRaw * 10) / 10}
          {#if hasRawLysate}<span class="lysate-raw-indicator">[~]</span>{/if}
        </span>
      </div>
      <div class="lysate-body">
        <div class="lysate-banked text-label-caps">
          BANKED: {Math.floor(gameStore.state.lysateBanked)}
        </div>
        <div class="lysate-actions">
          <button
            class="cmd-btn lysate-btn"
            disabled={!hasBankedLysate || gameStore.state.lysateBanked < waterExpandCost}
            onclick={() => gameStore.expandWaterCap()}
          >
            > EXE: EXPAND WATER [{waterExpandCost} L]
          </button>
          <button
            class="cmd-btn lysate-btn"
            disabled={!hasBankedLysate || gameStore.state.lysateBanked < nutrientExpandCost}
            onclick={() => gameStore.expandNutrientCap()}
          >
            > EXE: EXPAND NUTRIENTS [{nutrientExpandCost} L]
          </button>
          <button
            class="cmd-btn lysate-btn"
            disabled={!hasBankedLysate || gameStore.state.lysateBanked < biomassExpandCost}
            onclick={() => gameStore.expandBiomassCap()}
          >
            > EXE: EXPAND BIOMASS [{biomassExpandCost} L]
          </button>
        </div>
      </div>
    </div>

    <!-- Action Row -->
    <div class="action-row">
      <button class="cmd-btn action-btn-inverted" onclick={() => goto('/radar')}
        >&gt; SYS: SCAN</button
      >
      <button class="cmd-btn action-btn-inverted" onclick={() => goto('/evolution')}
        >&gt; SYS: UPGRADES</button
      >
    </div>

    <!-- Generators Panel -->
    {#each GENERATORS as gen}
      {@const level = gameStore.state.generators[gen.id] ?? 0}
      {@const cost = getGeneratorCost(gen.baseCost, level)}
      {@const canAfford = gameStore.biomass >= cost}
      <div class="gen-row">
        <span class="text-label-caps gen-name">{gen.name}</span>
        <span class="text-data-mono gen-rate">LV.{level} (+{gen.baseRate * level}/s)</span>
        <span class="text-data-mono gen-cost">COST: {cost} BM</span>
        {#if level < gen.maxLevel}
          <button
            class="cmd-btn gen-btn"
            disabled={!canAfford}
            onclick={() => gameStore.purchaseGenerator(gen.id)}
          >
            > EXE: UPGRADE
          </button>
        {:else}
          <span class="text-label-caps gen-max">MAX</span>
        {/if}
      </div>
    {/each}

    <!-- SYS_LOG -->
    <div class="panel event-log-panel">
      <div class="panel-header">
        <span class="text-label-caps">SYS_LOG :: HISTORICAL</span>
        <span class="text-data-mono badge-filter">FILTER: ALL</span>
      </div>
      <div class="log-entries" bind:this={logContainer} onscroll={handleLogScroll}>
        {#each logStore.entries as entry (entry.id)}
          <div
            class="log-line"
            class:is-warn={entry.level === 'warn'}
            class:is-error={entry.level === 'error'}
            class:is-success={entry.level === 'success'}
          >
            <span class="log-time">{fmtTime(entry.timestamp)}</span>
            <span class="log-msg">{entry.text}</span>
          </div>
        {/each}
        <div class="log-line cursor-line">
          <span class="log-time">[--:--:--]</span>
          <span class="log-msg">_</span>
        </div>
      </div>
    </div>

    <!-- Trauma Banner -->
    {#if gameStore.isInTrauma}
      <div class="trauma-banner">
        TRAUMA LOCK — {Math.ceil(gameStore.state.traumaTimer)}s REMAINING
      </div>
    {/if}
  </div>

  <!-- ── Mobile View ── -->
  <div class="mobile-view">
    <!-- MICRO-RADAR -->
    <section class="panel radar-panel">
      <div class="panel-header">
        <span class="text-label-caps header-title">MICRO-RADAR</span>
        <span class="text-label-caps header-live">[LIVE]</span>
      </div>
      <div class="radar-canvas">
        <div class="grid-bg"></div>
        <div class="crosshair-h"></div>
        <div class="crosshair-v"></div>
        <div class="player-core">[O]</div>
        <div class="hostile h1">[X]</div>
        <div class="hostile h2">[X]</div>
        <div class="unknown">[?]</div>
      </div>
      <div class="radar-footer">
        <span class="text-label-caps">SEC: 4A-99</span>
        <span class="text-label-caps">COORD: 34.1, -12.4</span>
      </div>
    </section>

    <!-- RESOURCE_STATUS // VITAL_SIGNS -->
    <section class="panel">
      <div class="panel-header">
        <span class="text-label-caps header-title">RESOURCE_STATUS</span>
        <span class="text-label-caps header-sub">VITAL_SIGNS</span>
      </div>
      <div class="stats">
        <div class="state-row">
          <span class="text-label-caps state-label">BIOMASS</span>
          <span class="text-data-mono state-val">{Math.floor(gameStore.biomass)}</span>
        </div>
        <div class="state-row">
          <span class="text-label-caps state-label">WATER (W)</span>
          <span class="text-data-mono state-val">{Math.floor(gameStore.state.water)}</span>
        </div>
        <div class="state-row">
          <span class="text-label-caps state-label">NUTRIENTS (N)</span>
          <span class="text-data-mono state-val">{Math.floor(gameStore.state.nutrients)}</span>
        </div>
        <div class="state-row">
          <span class="text-label-caps state-label">GROWTH</span>
          <span class="text-data-mono state-val">+{gameStore.biomassPerSec.toFixed(2)}/s</span>
        </div>
      </div>
    </section>

    <!-- Action Button -->
    <button class="cmd-btn purge-btn">
      <span>&gt; EXE: PURGE_SECTOR</span>
      <span class="warn-icon">[!]</span>
    </button>

    <!-- COLONIZATION RECORD -->
    <section class="panel">
      <div class="panel-header">
        <span class="text-label-caps header-title">COLONIZATION RECORD</span>
      </div>
      <div class="record-grid">
        <div class="record-item">
          <span class="record-value">{gameStore.hostsDefeated}</span>
          <span class="text-label-caps record-label">HOSTS DEFEATED</span>
        </div>
        <div class="record-item">
          <span class="record-value">{gameStore.acquiredEchoes.length}</span>
          <span class="text-label-caps record-label">ECHOES</span>
        </div>
        <div class="record-item">
          <span class="record-value"
            >{Math.floor(gameStore.totalBiomassEarned).toLocaleString()}</span
          >
          <span class="text-label-caps record-label">BIOMASS EARNED</span>
        </div>
        <div class="record-item">
          <span class="record-value">{gameStore.currentHost?.toUpperCase() ?? 'NONE'}</span>
          <span class="text-label-caps record-label">ACTIVE HOST</span>
        </div>
      </div>
    </section>

    <!-- Trauma Banner -->
    {#if gameStore.isInTrauma}
      <div class="trauma-banner">
        TRAUMA LOCK — {Math.ceil(gameStore.state.traumaTimer)}s REMAINING
      </div>
    {/if}
  </div>
{/if}

<style>
  /* ── Responsive visibility ── */
  .desktop-view {
    display: none;
  }

  .mobile-view {
    display: flex;
    flex-direction: column;
    gap: var(--space-gutter);
  }

  @media (min-width: 768px) {
    .desktop-view {
      display: flex;
      flex-direction: column;
      gap: var(--space-gutter);
    }

    .mobile-view {
      display: none;
    }
  }

  /* ── Shared panel styles ── */
  .panel {
    border: 1px solid var(--border);
    background: var(--surface);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-unit) var(--space-panel-padding);
    background: var(--surface-container-low);
    border-bottom: 1px solid var(--border);
    color: var(--primary);
  }

  /* ── Mobile resource rows (still used in mobile view) ── */
  .stats {
    padding: var(--space-panel-padding);
    display: flex;
    flex-direction: column;
    gap: var(--space-unit);
  }

  .state-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .state-label {
    color: var(--on-surface-variant);
  }

  .state-val {
    font-variant-numeric: tabular-nums;
    color: var(--on-surface);
  }

  /* ── Desktop: Resource Cards ── */
  .resource-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-gutter);
    padding: var(--space-panel-padding);
  }

  .res-card {
    border: 1px solid var(--border);
    padding: var(--space-panel-padding);
    display: flex;
    flex-direction: column;
    gap: var(--space-unit);
  }

  .res-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--on-surface);
    border-bottom: 1px solid var(--border);
    padding-bottom: var(--space-unit);
  }

  .res-card-value {
    font-size: var(--font-headline-lg);
    font-weight: 700;
    color: var(--primary);
    line-height: 1;
  }

  .res-card-status {
    color: var(--secondary);
    font-size: 10px;
  }

  .res-card-bar {
    color: var(--on-surface-variant);
    letter-spacing: 1px;
    white-space: pre;
  }

  .res-card-cap {
    text-align: right;
    color: var(--on-surface-variant);
    font-size: 10px;
  }

  .res-critical .res-card-value,
  .res-critical .res-card-header .alert-badge {
    color: var(--alert);
  }

  .res-critical .res-card-header,
  .res-critical .res-card-status {
    color: var(--alert);
  }

  .res-critical .res-card-bar {
    color: var(--alert);
  }

  .badge-overview {
    color: var(--secondary);
    font-size: 10px;
  }

  /* ── Desktop: Lysate Panel ── */
  .lysate-panel {
    display: flex;
    flex-direction: column;
  }

  .lysate-body {
    padding: var(--space-panel-padding);
    display: flex;
    flex-direction: column;
    gap: var(--space-gutter);
  }

  .lysate-banked {
    color: var(--primary);
    font-size: var(--font-body-lg);
  }

  .lysate-raw-indicator {
    color: var(--secondary);
    animation: pulse 1s ease-in-out infinite;
  }

  .lysate-actions {
    display: flex;
    gap: var(--space-unit);
    flex-wrap: wrap;
  }

  .lysate-btn {
    padding: var(--space-unit) var(--space-panel-padding);
    font-size: 10px;
  }

  .lysate-btn:disabled {
    opacity: 0.4;
    cursor: default;
    pointer-events: none;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.3;
    }
    50% {
      opacity: 1;
    }
  }

  /* ── Desktop: Action Row ── */
  .action-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-gutter);
  }

  .action-btn-inverted {
    width: 100%;
    padding: var(--space-gutter);
    text-align: center;
    background: var(--primary);
    color: var(--background);
    border-color: var(--primary);
    font-size: var(--font-body-md);
    font-weight: 700;
  }

  .action-btn-inverted:hover {
    background: transparent;
    color: var(--primary);
  }

  /* ── Desktop: Generator Rows ── */
  .gen-row {
    display: flex;
    align-items: center;
    gap: var(--space-gutter);
    padding: var(--space-unit) var(--space-panel-padding);
    border: 1px solid var(--border);
    background: var(--surface);
  }

  .gen-name {
    min-width: 160px;
    color: var(--on-surface);
  }

  .gen-rate {
    min-width: 120px;
    color: var(--primary);
  }

  .gen-cost {
    min-width: 100px;
    color: var(--on-surface-variant);
  }

  .gen-btn {
    margin-left: auto;
    padding: var(--space-unit) var(--space-panel-padding);
    font-size: 10px;
  }

  .gen-btn:disabled {
    opacity: 0.4;
    cursor: default;
    pointer-events: none;
  }

  .gen-max {
    margin-left: auto;
    color: var(--secondary);
  }

  /* ── Desktop: SYS_LOG ── */
  .event-log-panel {
    display: flex;
    flex-direction: column;
  }

  .badge-filter {
    color: var(--secondary);
    font-size: 10px;
  }

  .log-entries {
    flex: 1;
    padding: var(--space-panel-padding);
    font-size: var(--font-data-mono);
    line-height: var(--line-data-mono);
    overflow-y: auto;
    max-height: 200px;
  }

  .log-line {
    display: flex;
    gap: var(--space-gutter);
    line-height: 1.8;
  }

  .log-time {
    color: var(--secondary);
    flex-shrink: 0;
    width: 72px;
  }

  .log-msg {
    color: var(--on-surface-variant);
  }

  .is-warn .log-msg {
    color: var(--on-surface);
  }

  .is-error .log-msg {
    color: var(--alert);
  }

  .is-success .log-msg {
    color: var(--primary);
  }

  .cursor-line .log-msg {
    color: var(--primary);
  }

  /* ── Mobile-only styles ── */
  .header-title {
    color: var(--primary);
  }

  .header-sub {
    color: var(--on-surface-variant);
  }

  .header-live {
    color: var(--primary);
  }

  .radar-canvas {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    border-bottom: 1px solid var(--border);
  }

  .grid-bg {
    position: absolute;
    inset: 0;
    background-color: var(--surface);
    background-image:
      linear-gradient(var(--border) 1px, transparent 1px),
      linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 20px 20px;
    background-position: center center;
  }

  .crosshair-h {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--border);
  }

  .crosshair-v {
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--border);
  }

  .player-core {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--player-core);
    font-weight: 700;
    z-index: 1;
  }

  .hostile {
    position: absolute;
    color: var(--alert);
    font-weight: 700;
  }

  .h1 {
    top: 20%;
    left: 30%;
  }
  .h2 {
    top: 75%;
    left: 65%;
  }

  .unknown {
    position: absolute;
    top: 40%;
    left: 80%;
    color: var(--on-surface-variant);
    font-weight: 700;
  }

  .radar-footer {
    display: flex;
    justify-content: space-between;
    padding: var(--space-unit) var(--space-panel-padding);
    background: var(--surface-container-lowest);
    color: var(--on-surface-variant);
  }

  .purge-btn {
    width: 100%;
    justify-content: space-between;
    padding: var(--space-panel-padding) var(--space-gutter);
  }

  .warn-icon {
    color: var(--alert);
  }
  .purge-btn:hover .warn-icon {
    color: var(--background);
  }

  .record-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-panel-padding);
    padding: var(--space-panel-padding);
  }

  .record-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-unit);
  }

  .record-value {
    color: var(--on-surface);
    font-variant-numeric: tabular-nums;
    font-size: var(--font-body-lg);
  }

  .record-label {
    color: var(--on-surface-variant);
  }

  .trauma-banner {
    border: 1px solid var(--alert);
    color: var(--alert);
    padding: var(--space-unit) var(--space-panel-padding);
    text-align: center;
    text-transform: uppercase;
  }
</style>
