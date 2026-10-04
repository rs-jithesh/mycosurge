<script lang="ts">
  import { onDestroy } from 'svelte';
  import { previewCombatReward } from '@mycosurge/game-engine';
  import { HOSTS, getStrain, SCAN_WATER_COST, resourceLabel } from '@mycosurge/config';
  import { gameStore } from '$lib/stores/game.svelte';
  import { logStore } from '$lib/stores/log.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import ResourceIcon from '$lib/components/ResourceIcon.svelte';
  import { hostIconKey } from '$lib/content/icons';

  let { mode, hideAction = false }: { mode: 'full' | 'tutorial'; hideAction?: boolean } = $props();

  let gs = $derived(gameStore.state);
  let water = $derived(gs.water);

  function hostFor(id: string) {
    return HOSTS.find((h) => h.id === id);
  }

  function hostLvl(difficulty: number): number {
    return Math.min(5, Math.ceil(difficulty / 1.4));
  }

  // ── Full game ──
  let contacts = $derived(gameStore.contacts);
  let isInTrauma = $derived(gameStore.isInTrauma);
  let hasActiveHost = $derived(gameStore.currentHost !== null);
  let activeHost = $derived(HOSTS.find((h) => h.id === gameStore.currentHost));
  let cataloguedCount = $derived(gameStore.cataloguedHosts.length);
  let noKnownSpecies = $derived(cataloguedCount === 0);
  let canPing = $derived(
    water >= SCAN_WATER_COST && contacts.length < gameStore.radarSlots && !noKnownSpecies,
  );

  let pingBtn = $state<HTMLButtonElement | null>(null);
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ping() {
    if (!gameStore.pingSubstrate()) return;
    if (reduceMotion || !pingBtn) return;
    pingBtn.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.09)' },
        { transform: 'scale(0.98)' },
        { transform: 'scale(1)' },
      ],
      { duration: 440, easing: 'ease-out' },
    );
  }

  function engage(contactId: string) {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;
    if (gameStore.engageContact(contactId)) {
      uiStore.openCombat(contact.hostId);
    } else {
      logStore.warn('The network is still raw — wait before engaging.');
    }
  }

  function resumeFight() {
    const host = gameStore.currentHost;
    if (host) uiStore.openCombat(host);
  }

  // ── Tutorial scan flow ──
  let scanState = $state<'idle' | 'scanning' | 'complete'>('idle');
  let scanTimeout: ReturnType<typeof setTimeout> | null = null;
  let blinkOn = $state(false);
  let blinkHandle: ReturnType<typeof setInterval> | null = null;

  let tutorialHost = $derived(HOSTS.find((h) => h.id === 'soil_nematode'));
  let canAffordScan = $derived(water >= 5);

  function startScan() {
    if (!canAffordScan || scanState !== 'idle') return;
    gs.water -= 5;
    logStore.info('Sensing the substrate...');
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
    uiStore.openCombat('soil_nematode');
  }

  onDestroy(() => {
    if (scanTimeout) clearTimeout(scanTimeout);
    if (blinkHandle) clearInterval(blinkHandle);
  });
</script>

<div class="hunt">
  {#if mode === 'tutorial'}
    {#if scanState === 'idle'}
      <div class="panel">
        <div class="panel-header text-label-caps">Threat detected</div>
        <div class="scan-body">
          <div class="scan-text">
            <p>Something is grazing on your outer hyphae.</p>
            <p>Scan the substrate to identify it.</p>
          </div>
          <button class="cmd-btn scan-btn" disabled={!canAffordScan} onclick={startScan}>
            Scan substrate
            <span class="cost-label">[5 {resourceLabel('water')}]</span>
          </button>
          {#if !canAffordScan}
            <div class="scan-insufficient-text text-label-caps">You need 5 Water to scan</div>
          {/if}
        </div>
      </div>
    {:else if scanState === 'scanning'}
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
    {:else}
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
            {@const tutorialIcon = hostIconKey(tutorialHost.id)}
            <button class="host-row" class:blink-border={blinkOn} onclick={engageTutorial}>
              {#if tutorialIcon}
                <ResourceIcon name={tutorialIcon} size={20} round />
              {/if}
              <span class="host-name">{tutorialHost.name}</span>
              <span class="host-lvl">{lvl}</span>
            </button>
          {/if}
        </div>
      </div>
    {/if}
  {:else if hasActiveHost}
    <div class="active-fight">
      <span class="text-label-caps fight-tag">In combat</span>
      <p class="fight-name">{activeHost?.name ?? 'A host'}</p>
      <button class="cmd-btn action-btn" onclick={resumeFight}>
        <span class="action-verb">Return to the fight</span>
      </button>
    </div>
  {:else}
    {#if contacts.length === 0}
      <div class="empty-hunt">
        {#if noKnownSpecies}
          <p class="empty-title">No species catalogued yet</p>
          <p class="empty-sub">
            Grow the network and meet a host at the frontier — drive it off and it joins the radar.
          </p>
          <button class="cmd-btn secondary map-link" onclick={() => uiStore.openPanel('map')}>
            Open network map
          </button>
        {:else}
          <p class="empty-title">No signals right now</p>
          <p class="empty-sub">Wait for one to drift in, or ping the substrate.</p>
          {#if contacts.length < gameStore.radarSlots}
            <span class="text-data-mono sweep"
              >Next sweep ~{Math.max(1, Math.ceil(gs.sonarTimer))}s</span
            >
          {/if}
        {/if}
      </div>
    {:else}
      <div class="contact-list">
        {#each contacts as contact (contact.id)}
          {@const chost = hostFor(contact.hostId)}
          {@const cstrain = getStrain(contact.strainId)}
          {@const contactIcon = chost ? hostIconKey(chost.id) : null}
          {@const lvl = chost ? hostLvl(chost.difficulty) : 1}
          {@const assim = gs.hostAssimilation[contact.hostId] ?? 0}
          {@const preview = previewCombatReward(gs, contact.hostId, contact.strainId)}
          <div class="contact-card">
            <div class="contact-top">
              {#if contact.revealed && contactIcon}
                <ResourceIcon name={contactIcon} size={50} round />
              {:else}
                <span class="host-icon-unknown text-data-mono">?</span>
              {/if}
              <span class="host-name">
                {contact.revealed ? (chost?.name ?? contact.hostId) : 'Unidentified signal'}
              </span>
              <span class="text-data-mono contact-timer">{Math.ceil(contact.timeRemaining)}s</span>
            </div>

            {#if !contact.revealed}
              <button
                class="cmd-btn contact-btn"
                disabled={water < SCAN_WATER_COST}
                onclick={() => gameStore.scanContact(contact.id)}
              >
                Scan · {SCAN_WATER_COST}
                {resourceLabel('water')}
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
                <span class="text-data-mono contact-assim">Grown {Math.floor(assim)}/100</span>
              </div>
              <div class="contact-reward text-data-mono">
                +{preview.biomassEarned}
                {resourceLabel('biomass')} · +{preview.lysateEarned}
                {resourceLabel('lysate')}
              </div>
              {#if cstrain.id !== 'normal'}
                <div class="contact-desc">{cstrain.description}</div>
              {/if}
              <div class="contact-actions">
                <button
                  class="cmd-btn engage-btn"
                  disabled={isInTrauma}
                  onclick={() => engage(contact.id)}>Engage</button
                >
                <button
                  class="cmd-btn secondary"
                  onclick={() => gameStore.dismissContact(contact.id)}
                >
                  Dismiss
                </button>
              </div>
              {#if isInTrauma}
                <p class="recovery-note text-label-caps">
                  Recovering — engage once the network stabilises.
                </p>
              {/if}
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    {#if !hideAction}
      <div class="hunt-actions">
        <button class="cmd-btn ping-btn" bind:this={pingBtn} disabled={!canPing} onclick={ping}>
          Ping substrate · {SCAN_WATER_COST}
          {resourceLabel('water')}
        </button>
        <button
          class="cmd-btn secondary"
          onclick={() => uiStore.openPanel('map')}
          title="Open the network map"
        >
          Network map
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .hunt {
    display: flex;
    flex-direction: column;
    gap: var(--space-gutter);
  }

  /* ── Panels (tutorial) ── */
  .panel {
    border: 1px solid var(--border);
    background: var(--surface-container);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    padding: 0;
  }

  .panel-header {
    color: var(--primary);
    padding: var(--space-unit) var(--space-panel-padding);
    background: var(--surface-container-low);
    border-bottom: 1px solid var(--border);
  }

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

  .cost-label {
    opacity: 0.82;
  }

  .scan-insufficient-text {
    color: var(--alert);
  }

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
    from {
      width: 0%;
    }
    to {
      width: 100%;
    }
  }

  .directive {
    color: var(--on-primary-container);
    background: var(--primary-container);
    border: 1px solid var(--primary);
    border-radius: var(--radius-md);
    padding: 10px var(--space-panel-padding);
    text-align: center;
  }

  .table-header {
    display: grid;
    grid-template-columns: auto 32px 1fr 64px;
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
    grid-template-columns: auto 32px 1fr 64px;
    gap: var(--space-unit);
    align-items: center;
    padding: 12px var(--space-panel-padding);
    border: 0;
    border-bottom: 1px solid var(--border);
    background: transparent;
    color: var(--on-surface);
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    text-align: left;
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

  .host-name {
    font-weight: 700;
    color: var(--on-surface);
  }

  .host-lvl {
    color: var(--on-surface-variant);
  }

  /* ── Active fight ── */
  .active-fight {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .fight-tag {
    color: var(--alert);
  }

  .fight-name {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--on-surface);
  }

  .action-btn {
    flex-direction: column;
    gap: 2px;
    padding: 12px;
  }

  .action-verb {
    font-weight: 600;
  }

  /* ── Contact list ── */
  .empty-hunt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    text-align: center;
    padding: 8px 0;
  }

  .empty-title {
    margin: 0;
    font-weight: 600;
    color: var(--on-surface);
  }

  .empty-sub {
    margin: 0;
    font-size: 12px;
    color: var(--on-surface-variant);
  }

  .map-link {
    margin-top: 8px;
    font-size: 12px;
    padding: 8px 12px;
  }

  .sweep {
    color: var(--secondary);
    font-size: 12px;
  }

  .contact-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .contact-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid var(--outline-variant);
    background: var(--surface-container-high);
    border-radius: var(--radius-md);
    padding: 10px 12px;
  }

  .contact-top {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: var(--space-unit);
    align-items: center;
  }

  .contact-top .host-name {
    min-width: 0;
  }

  .host-icon-unknown {
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--outline-variant);
    border-radius: 50%;
    color: var(--on-surface-variant);
    font-size: 11px;
  }

  .contact-timer {
    color: var(--on-surface-variant);
    font-size: 11px;
  }

  .contact-btn {
    align-self: flex-start;
  }

  .contact-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    color: var(--on-surface-variant);
  }

  .boss-tag {
    color: var(--alert);
  }

  .strain-tag {
    color: var(--warning);
    border: 1px solid var(--warning);
    border-radius: var(--radius-pill);
    padding: 1px 7px;
    font-size: 9px;
  }

  .contact-assim {
    margin-left: auto;
  }

  .contact-reward {
    color: var(--primary);
    font-size: 12px;
  }

  .contact-desc {
    color: var(--on-surface-variant);
    font-size: 13px;
  }

  .contact-actions {
    display: flex;
    gap: 8px;
  }

  .engage-btn {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--on-primary);
    font-weight: 600;
  }

  .engage-btn:hover:not(:disabled) {
    background: var(--primary-fixed-dim);
    border-color: var(--primary-fixed-dim);
  }

  .hunt-actions {
    display: flex;
    gap: 8px;
  }

  .hunt-actions .cmd-btn {
    flex: 1;
    font-size: 12px;
    padding: 8px 10px;
  }

  .ping-btn {
    will-change: transform;
    transform-origin: center;
  }

  .recovery-note {
    color: var(--alert);
    font-size: 10px;
  }
</style>
