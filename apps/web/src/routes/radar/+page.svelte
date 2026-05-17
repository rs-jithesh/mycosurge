<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { gameStore } from '$lib/stores/game.svelte';
  import { logStore } from '$lib/stores/log.svelte';
  import { HOSTS } from '@mycosurge/config';
  import CombatModal from '$lib/components/CombatModal.svelte';

  let selectedHostId = $state<string | null>(null);

  let gs = $derived(gameStore.state);
  let phase = $derived(gs.gamePhase);
  let water = $derived(gs.water);
  let shock = $derived(gs.tutorialShockTimer);
  let hasActiveHost = $derived(gameStore.currentHost !== null);
  let isInTrauma = $derived(gameStore.isInTrauma);

  // ── Tutorial scan state ──
  let scanState = $state<'idle' | 'scanning' | 'complete'>('idle');
  let scanTimeout: ReturnType<typeof setTimeout> | null = null;
  let blinkOn = $state(false);
  let blinkHandle: ReturnType<typeof setInterval> | null = null;

  let tutorialHost = $derived(HOSTS.find((h) => h.id === 'soil_nematode'));
  let canAffordScan = $derived(water >= 5);

  onMount(() => {
    scanState = 'idle';
  });

  onDestroy(() => {
    if (scanTimeout) clearTimeout(scanTimeout);
    if (blinkHandle) clearInterval(blinkHandle);
  });

  function startScan() {
    if (!canAffordScan || scanState !== 'idle') return;
    gs.water -= 5;
    logStore.info('Scanning substrate for hostile organisms...');
    scanState = 'scanning';
    scanTimeout = setTimeout(() => {
      scanState = 'complete';
      logStore.info('Threat identified: Soil Nematode.');
      blinkHandle = setInterval(() => {
        blinkOn = !blinkOn;
      }, 600);
    }, 2000);
  }

  function engageTutorial() {
    if (scanState !== 'complete') return;
    gameStore.engageHost('soil_nematode');
    selectedHostId = 'soil_nematode';
  }

  function hostLvl(difficulty: number): number {
    return Math.min(5, Math.ceil(difficulty / 1.4));
  }

  function badgeChar(lvl: number): string {
    if (lvl >= 4) return '!';
    if (lvl >= 3) return '*';
    return '+';
  }

  function badgeColor(lvl: number): string {
    if (lvl >= 4) return 'var(--alert)';
    if (lvl >= 3) return 'var(--secondary)';
    return 'var(--primary)';
  }

  function selectHost(hostId: string) {
    gameStore.engageHost(hostId);
    selectedHostId = hostId;
  }

  function closeModal() {
    selectedHostId = null;
  }
</script>

<div class="radar-view">
  {#if phase === 'awakening' || phase === 'manager' || phase === 'explorer'}
    <!-- Tutorial — radar offline -->
    <div class="panel offline-panel">
      <div class="offline-content">
        <span class="offline-icon">[~]</span>
        <span class="text-label-caps">RADAR OFFLINE</span>
        <span class="text-data-mono offline-sub"
          >Continue expanding the mycelial network to activate.</span
        >
      </div>
    </div>
  {:else if phase === 'tactician'}
    <!-- Tutorial — 3-phase scan flow -->
    {#if shock > 0}
      <div class="shock-banner text-label-caps">
        ⚠ SHOCK: WATER/NUTRIENT GEN AT 50% — {Math.ceil(shock)}s
      </div>
    {/if}

    {#if scanState === 'idle'}
      <!-- IDLE: Show scan prompt -->
      <div class="panel">
        <div class="panel-header text-label-caps">> SYS:THREAT_PROTOCOL</div>
        <div class="scan-body">
          <div class="scan-text">
            <p>CRITICAL: HOSTILE CONTACT DETECTED ON THE OUTER HYPHAE PERIMETER.</p>
            <p>DEPLOY SCANNING SPORES TO IDENTIFY THE THREAT.</p>
          </div>
          <button
            class="cmd-btn scan-btn"
            class:scan-btn-disabled={!canAffordScan}
            onclick={startScan}
          >
            > EXE:SCAN_SUBSTRATE
            <span class="cost-label">[5W]</span>
          </button>
          {#if !canAffordScan}
            <div class="scan-insufficient-text text-label-caps">INSUFFICIENT WATER</div>
          {/if}
        </div>
      </div>
    {:else if scanState === 'scanning'}
      <!-- SCANNING: Pulse animation -->
      <div class="panel">
        <div class="panel-header text-label-caps">> SYS:THREAT_PROTOCOL</div>
        <div class="scan-body scanning-body">
          <div class="pulse-icon">[~]</div>
          <div class="scanning-text">
            <p>SCANNING SUBSTRATE...</p>
            <p>ANALYZING VIBRATIONS...</p>
          </div>
          <div class="sweep-bar">
            <span class="sweep-track">{'\u2591'.repeat(12)}</span>
            <span class="sweep-fill">{'\u2588'.repeat(12)}</span>
          </div>
        </div>
      </div>
    {:else if scanState === 'complete'}
      <!-- COMPLETE: Show nematode with directive -->
      <div class="directive text-label-caps">> DIRECTIVE: ENGAGE HOST TO NEUTRALIZE THREAT</div>
      <div class="panel">
        <div class="table-header">
          <span class="text-label-caps th-badge"></span>
          <span class="text-label-caps th-name">TARGET HOST</span>
          <span class="text-label-caps th-lvl">HOST LVL</span>
        </div>
        <div class="host-list">
          {#if tutorialHost}
            {@const lvl = hostLvl(tutorialHost.difficulty)}
            <button class="host-row" class:blink-border={blinkOn} onclick={engageTutorial}>
              <span class="host-badge" style="color: {badgeColor(lvl)}">[{badgeChar(lvl)}]</span>
              <span class="host-name">{tutorialHost.name}</span>
              <span class="host-lvl">{lvl}</span>
            </button>
          {/if}
        </div>
      </div>
    {/if}
  {:else if isInTrauma && !hasActiveHost}
    <!-- Trauma lock (full game) -->
    <div class="panel trauma-panel">
      <h2 class="panel-title text-label-caps">&gt; TRAUMA LOCK</h2>
      <p class="status-msg">{Math.ceil(gameStore.state.traumaTimer)}s REMAINING</p>
      <p class="sub-msg text-data-mono">SYS: Immune response suppression in progress.</p>
    </div>
  {:else}
    <!-- Full game — all hosts -->
    <div class="panel">
      <div class="table-header">
        <span class="text-label-caps th-badge"></span>
        <span class="text-label-caps th-name">TARGET HOST</span>
        <span class="text-label-caps th-lvl">HOST LVL</span>
      </div>
      <div class="host-list">
        {#each HOSTS as host}
          {@const lvl = hostLvl(host.difficulty)}
          <button class="host-row" onclick={() => selectHost(host.id)}>
            <span class="host-badge" style="color: {badgeColor(lvl)}">[{badgeChar(lvl)}]</span>
            <span class="host-name">{host.name}</span>
            <span class="host-lvl">
              {#if host.name.includes('(Boss)')}
                <span class="boss-tag">BOSS</span>
              {:else}
                {lvl}
              {/if}
            </span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

{#if selectedHostId}
  <CombatModal hostId={selectedHostId} onClose={closeModal} />
{/if}

<style>
  .radar-view {
    display: flex;
    flex-direction: column;
    gap: var(--space-gutter);
  }

  .panel {
    border: 1px solid var(--border);
    background: var(--surface);
    padding: 0;
  }

  .panel-title {
    color: var(--on-surface-variant);
    margin: 0 0 var(--space-panel-padding);
    font-weight: 400;
  }

  .panel-header {
    color: var(--primary);
    padding: var(--space-unit) var(--space-panel-padding);
    background: var(--surface-container-low);
    border-bottom: 1px solid var(--border);
  }

  .sub-msg {
    color: var(--on-surface-variant);
    margin: 0 0 var(--space-panel-padding);
  }

  .status-msg {
    color: var(--alert);
    font-size: calc(var(--font-body-md) + 2px);
    margin: 0 0 var(--space-unit);
  }

  .trauma-panel {
    border-color: var(--alert);
    padding: var(--space-panel-padding);
  }

  .table-header {
    display: grid;
    grid-template-columns: 32px 1fr 64px;
    gap: var(--space-unit);
    align-items: center;
    padding: var(--space-unit) var(--space-panel-padding);
    background: var(--surface-container-low);
    border-bottom: 1px solid var(--border);
    color: var(--on-surface-variant);
  }

  .host-list {
    display: flex;
    flex-direction: column;
  }

  .host-row {
    display: grid;
    grid-template-columns: 32px 1fr 64px;
    gap: var(--space-unit);
    align-items: center;
    padding: var(--space-unit) var(--space-panel-padding);
    border-bottom: 1px solid var(--border);
    text-align: left;
    border-radius: 0;
    border-width: 0 0 1px 0;
    background: transparent;
    color: var(--on-surface);
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    width: 100%;
  }

  .host-row:last-child {
    border-bottom: none;
  }

  .host-row:hover {
    background: var(--surface-container-high);
  }

  .blink-border {
    outline: 2px solid var(--primary);
    outline-offset: -2px;
  }

  .host-badge {
    font-weight: 700;
    text-align: center;
  }

  .host-name {
    font-weight: 700;
    color: var(--on-surface);
  }

  .host-lvl {
    color: var(--on-surface-variant);
  }

  .boss-tag {
    color: var(--alert);
    font-weight: 700;
  }

  /* ── Tutorial offline ── */
  .offline-panel {
    padding: var(--space-margin);
  }

  .offline-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-unit);
    color: var(--on-surface-variant);
  }

  .offline-icon {
    font-size: var(--font-headline-lg);
    color: var(--on-surface-variant);
  }

  .offline-sub {
    text-align: center;
    max-width: 280px;
  }

  /* ── Shock banner ── */
  .shock-banner {
    border: 1px solid var(--alert);
    color: var(--alert);
    padding: var(--space-unit) var(--space-panel-padding);
    text-align: center;
    text-transform: uppercase;
  }

  /* ── Scan panel ── */
  .scan-body {
    padding: var(--space-margin) var(--space-panel-padding);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-gutter);
    text-align: center;
  }

  .scan-text p {
    margin: 0 0 var(--space-unit);
    color: var(--on-surface);
    font-size: var(--font-body-md);
    line-height: 1.6;
  }

  .scan-btn {
    padding: var(--space-panel-padding) var(--space-gutter);
  }

  .scan-btn-disabled {
    opacity: 0.4;
    cursor: default;
  }

  .scan-btn-disabled:hover {
    background: transparent;
    color: var(--on-surface);
  }

  .cost-label {
    color: var(--on-surface-variant);
  }

  .scan-insufficient-text {
    color: var(--alert);
  }

  /* ── Scanning state ── */
  .scanning-body {
    gap: var(--space-gutter);
  }

  .pulse-icon {
    font-size: var(--font-headline-lg);
    color: var(--primary);
    animation: pulse-scale 1s ease-in-out infinite;
  }

  @keyframes pulse-scale {
    0%,
    100% {
      opacity: 0.3;
      transform: scale(0.8);
    }
    50% {
      opacity: 1;
      transform: scale(1.2);
    }
  }

  .scanning-text p {
    margin: 0;
    color: var(--on-surface);
    font-size: var(--font-body-md);
    line-height: 1.6;
  }

  .sweep-bar {
    position: relative;
    height: 1.2em;
    width: 156px;
    overflow: hidden;
  }

  .sweep-track {
    position: absolute;
    inset: 0;
    color: var(--border);
    letter-spacing: 1px;
    white-space: pre;
  }

  .sweep-fill {
    position: absolute;
    inset: 0;
    color: var(--primary);
    letter-spacing: 1px;
    white-space: pre;
    width: 0%;
    animation: sweep 2s ease-in-out forwards;
  }

  @keyframes sweep {
    0% {
      width: 0%;
    }
    100% {
      width: 100%;
    }
  }

  /* ── Complete state ── */
  .directive {
    color: var(--primary);
    border: 1px solid var(--primary);
    padding: var(--space-unit) var(--space-panel-padding);
    text-align: center;
  }
</style>
