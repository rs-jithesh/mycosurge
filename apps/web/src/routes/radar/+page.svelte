<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { gameStore } from '$lib/stores/game.svelte';
  import { logStore } from '$lib/stores/log.svelte';
  import { previewCombatReward } from '@mycosurge/game-engine';
  import { HOSTS, getStrain, isHostUnlocked, SCAN_WATER_COST } from '@mycosurge/config';
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
  let contacts = $derived(gameStore.contacts);
  let canPing = $derived(water >= SCAN_WATER_COST && contacts.length < gameStore.radarSlots);
  let lockedCount = $derived(
    HOSTS.filter((h) => h.id !== 'soil_nematode' && !isHostUnlocked(h, gs.acquiredEchoes.length))
      .length,
  );

  function hostFor(id: string) {
    return HOSTS.find((h) => h.id === id);
  }

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
    logStore.info('Scanning the substrate for signs of life...');
    scanState = 'scanning';
    scanTimeout = setTimeout(() => {
      scanState = 'complete';
      logStore.info("It's a Soil Nematode — and it's feeding on your hyphae.");
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

  function engage(contactId: string) {
    const contact = gameStore.contacts.find((c) => c.id === contactId);
    if (!contact) return;
    if (gameStore.engageContact(contactId)) {
      selectedHostId = contact.hostId;
    }
  }

  function closeModal() {
    selectedHostId = null;
  }

  // Open the arena whenever a host is engaged (e.g. from the Core cycle panel).
  $effect(() => {
    const host = gameStore.currentHost;
    if (host && !selectedHostId) {
      selectedHostId = host;
    }
  });
</script>

<div class="radar-view">
  {#if phase === 'awakening' || phase === 'manager' || phase === 'explorer'}
    <!-- Tutorial — radar offline -->
    <div class="panel offline-panel">
      <div class="offline-content">
        <span class="offline-icon">[~]</span>
        <span class="text-label-caps">Radar offline</span>
        <span class="offline-sub">Your network is too small to detect hosts yet. Keep growing.</span
        >
      </div>
    </div>
  {:else if phase === 'tactician'}
    <!-- Tutorial — 3-phase scan flow -->
    {#if shock > 0}
      <div class="shock-banner text-label-caps">
        ⚠ Production halved for {Math.ceil(shock)}s while you recover
      </div>
    {/if}

    {#if scanState === 'idle'}
      <!-- IDLE: Show scan prompt -->
      <div class="panel">
        <div class="panel-header text-label-caps">Threat detected</div>
        <div class="scan-body">
          <div class="scan-text">
            <p>Something is grazing on your outer hyphae.</p>
            <p>Scan the substrate to identify it.</p>
          </div>
          <button
            class="cmd-btn scan-btn"
            class:scan-btn-disabled={!canAffordScan}
            onclick={startScan}
          >
            Scan substrate
            <span class="cost-label">[5 Water]</span>
          </button>
          {#if !canAffordScan}
            <div class="scan-insufficient-text text-label-caps">You need 5 Water to scan</div>
          {/if}
        </div>
      </div>
    {:else if scanState === 'scanning'}
      <!-- SCANNING: Pulse animation -->
      <div class="panel">
        <div class="panel-header text-label-caps">Scanning</div>
        <div class="scan-body scanning-body">
          <div class="pulse-icon">[~]</div>
          <div class="scanning-text">
            <p>Scanning the substrate...</p>
            <p>Reading the vibrations...</p>
          </div>
          <div class="sweep-bar">
            <span class="sweep-track">{'\u2591'.repeat(12)}</span>
            <span class="sweep-fill">{'\u2588'.repeat(12)}</span>
          </div>
        </div>
      </div>
    {:else if scanState === 'complete'}
      <!-- COMPLETE: Show nematode with directive -->
      <div class="directive text-label-caps">Engage the host to drive it off</div>
      <div class="panel">
        <div class="table-header">
          <span class="text-label-caps th-badge"></span>
          <span class="text-label-caps th-name">Host</span>
          <span class="text-label-caps th-lvl">Level</span>
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
      <h2 class="panel-title text-label-caps">Recovering</h2>
      <p class="status-msg">{Math.ceil(gameStore.state.traumaTimer)}s left</p>
      <p class="sub-msg text-data-mono">Your network is recovering. Give it a moment.</p>
    </div>
  {:else}
    <!-- Full game — sonar contacts -->
    <div class="panel">
      <div class="panel-header">
        <span class="text-label-caps">Radar</span>
        <span class="text-data-mono badge-filter"
          >{contacts.length} / {gameStore.radarSlots} signals</span
        >
      </div>
      <div class="scan-body">
        <p class="radar-help">
          Signals drift in over time. Scan one to identify it, then engage at your discretion.
        </p>
        <button
          class="cmd-btn scan-btn"
          disabled={!canPing}
          onclick={() => gameStore.pingSubstrate()}
        >
          Ping substrate
          <span class="cost-label">[{SCAN_WATER_COST} Water]</span>
        </button>
      </div>

      {#if contacts.length === 0}
        <div class="empty-radar">
          <span class="offline-icon">[~]</span>
          <p class="empty-title">No signals right now</p>
          <p class="offline-sub">Wait for one to drift in, or ping the substrate.</p>
        </div>
      {:else}
        <div class="contact-list">
          {#each contacts as contact (contact.id)}
            {@const chost = hostFor(contact.hostId)}
            {@const cstrain = getStrain(contact.strainId)}
            {@const lvl = chost ? hostLvl(chost.difficulty) : 1}
            {@const assim = gs.hostAssimilation[contact.hostId] ?? 0}
            {@const preview = previewCombatReward(gs, contact.hostId, contact.strainId)}
            <div class="contact-card">
              <div class="contact-top">
                <span class="host-badge" style="color: {badgeColor(lvl)}">
                  {contact.revealed ? `[${badgeChar(lvl)}]` : '[?]'}
                </span>
                <span class="host-name">
                  {contact.revealed ? (chost?.name ?? contact.hostId) : 'Unidentified signal'}
                </span>
                <span class="contact-timer text-data-mono">{Math.ceil(contact.timeRemaining)}s</span
                >
              </div>

              {#if !contact.revealed}
                <button
                  class="cmd-btn contact-btn"
                  disabled={water < SCAN_WATER_COST}
                  onclick={() => gameStore.scanContact(contact.id)}
                >
                  Scan · {SCAN_WATER_COST} Water
                </button>
              {:else}
                <div class="contact-meta">
                  {#if chost?.isBoss}
                    <span class="boss-tag text-label-caps">Boss</span>
                  {:else}
                    <span class="text-data-mono">Level {lvl}</span>
                  {/if}
                  {#if cstrain.id !== 'normal'}
                    <span class="strain-tag text-label-caps">{cstrain.name}</span>
                  {/if}
                  <span class="text-data-mono contact-assim">Assimilated {Math.floor(assim)}%</span>
                </div>
                <div class="contact-reward text-data-mono">
                  +{preview.biomassEarned} Biomass · +{preview.lysateEarned} Lysate
                </div>
                {#if cstrain.id !== 'normal'}
                  <div class="contact-desc">{cstrain.description}</div>
                {/if}
                <div class="contact-actions">
                  <button class="cmd-btn engage-btn" onclick={() => engage(contact.id)}>
                    Engage
                  </button>
                  <button class="cmd-btn" onclick={() => gameStore.dismissContact(contact.id)}>
                    Dismiss
                  </button>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    {#if lockedCount > 0}
      <div class="locked-teaser text-label-caps">
        {lockedCount} fainter signal{lockedCount === 1 ? '' : 's'} beyond your network's reach
      </div>
    {/if}
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
    background: var(--surface-container);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
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
    padding: 12px var(--space-panel-padding);
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
    background: var(--error-container);
    color: var(--on-error-container);
    border-radius: var(--radius-md);
    padding: 10px var(--space-panel-padding);
    text-align: center;
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
    color: var(--on-primary-container);
    background: var(--primary-container);
    border: 1px solid var(--primary);
    border-radius: var(--radius-md);
    padding: 10px var(--space-panel-padding);
    text-align: center;
  }

  /* ── Full game: sonar contacts ── */
  .radar-help {
    margin: 0;
    color: var(--on-surface-variant);
    font-size: var(--font-body-md);
    line-height: 1.5;
    max-width: 340px;
  }

  .empty-radar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-unit);
    padding: var(--space-margin) var(--space-panel-padding);
    text-align: center;
  }

  .empty-title {
    margin: 0;
    font-weight: 600;
    color: var(--on-surface);
  }

  .contact-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-unit);
    padding: var(--space-panel-padding);
    border-top: 1px solid var(--border);
  }

  .contact-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid var(--outline-variant);
    background: var(--surface-container-high);
    border-radius: var(--radius-md);
    padding: 12px 14px;
  }

  .contact-top {
    display: grid;
    grid-template-columns: 32px 1fr auto;
    gap: var(--space-unit);
    align-items: center;
  }

  .contact-timer {
    color: var(--on-surface-variant);
    font-size: 12px;
  }

  .contact-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    color: var(--on-surface-variant);
  }

  .strain-tag {
    color: var(--warning);
    border: 1px solid var(--warning);
    border-radius: var(--radius-pill);
    padding: 2px 8px;
  }

  .contact-assim {
    margin-left: auto;
  }

  .contact-reward {
    color: var(--primary);
  }

  .contact-desc {
    color: var(--on-surface-variant);
    font-size: 13px;
  }

  .contact-actions {
    display: flex;
    gap: var(--space-unit);
  }

  .contact-btn {
    align-self: flex-start;
  }

  .engage-btn {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--on-primary);
    font-weight: 600;
  }

  .engage-btn:hover {
    background: var(--primary-fixed-dim);
    border-color: var(--primary-fixed-dim);
  }

  .locked-teaser {
    color: var(--on-surface-variant);
    text-align: center;
    padding: var(--space-unit);
  }
</style>
