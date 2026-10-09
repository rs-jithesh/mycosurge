<script lang="ts">
  import type { GrowthPhase } from '@mycosurge/game-engine';
  import { SCAN_WATER_COST, resourceLabel } from '@mycosurge/config';
  import { gameStore } from '$lib/stores/game.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';

  let {
    phase,
    variant = 'panel',
  }: {
    phase: GrowthPhase;
    /** `panel` sits inside the desktop stage panel; `hero` is the mobile primary action. */
    variant?: 'hero' | 'panel';
  } = $props();

  let gs = $derived(gameStore.state);

  let canSynthesize = $derived(gs.water >= 10 && gs.nutrients >= 10);
  let synthYield = $derived(gameStore.synthesisYield());

  let hasActiveHost = $derived(gameStore.currentHost !== null);
  let canPing = $derived(
    gs.water >= SCAN_WATER_COST && gameStore.contacts.length < gameStore.radarSlots,
  );

  let evenCost = $derived(gameStore.evenCost);
  let canGrowEvenly = $derived(gs.biomass >= evenCost);

  function resumeFight() {
    const host = gameStore.currentHost;
    if (host) uiStore.openCombat(host);
  }

  let hero = $derived(variant === 'hero');
</script>

{#if phase === 'gather'}
  <button class="cmd-btn action-btn" class:hero onclick={() => gameStore.manualAbsorb()}>
    <span class="action-verb">Absorb</span>
    <span class="action-sub">
      +{gameStore.manualAbsorbAmount}
      {resourceLabel('water')} · +{gameStore.manualAbsorbAmount}
      {resourceLabel('nutrients')}
    </span>
  </button>
{:else if phase === 'grow'}
  <button
    class="cmd-btn action-btn"
    class:hero
    disabled={!canSynthesize}
    onclick={() => gameStore.manualSynthesize()}
  >
    <span class="action-verb">Synthesize Biomass</span>
    <span class="action-sub">
      {#if !canSynthesize}
        Need 10 {resourceLabel('water')} + 10 {resourceLabel('nutrients')}
      {:else if synthYield >= 1}
        10 {resourceLabel('water')} + 10 {resourceLabel('nutrients')} → {synthYield}
        {resourceLabel('biomass')}{synthYield > 1 ? ' · brimming bonus' : ''}
      {:else if synthYield > 0}
        10 {resourceLabel('water')} + 10 {resourceLabel('nutrients')} → 0.5 {resourceLabel(
          'biomass',
        )} (low reserves)
      {:else}
        Low reserves — this would be wasted
      {/if}
    </span>
  </button>
{:else if phase === 'hunt'}
  {#if hasActiveHost}
    <button class="cmd-btn action-btn" class:hero onclick={resumeFight}>
      <span class="action-verb">Return to the fight</span>
      <span class="action-sub">Resume the encounter with the host</span>
    </button>
  {:else}
    <button
      class="cmd-btn action-btn"
      class:hero
      disabled={!canPing}
      onclick={() => gameStore.pingSubstrate()}
    >
      <span class="action-verb">Ping substrate</span>
      <span class="action-sub">Scan for a signal · {SCAN_WATER_COST} {resourceLabel('water')}</span>
    </button>
  {/if}
{:else}
  <button
    class="cmd-btn action-btn"
    class:hero
    disabled={!canGrowEvenly}
    onclick={() => gameStore.growEvenly()}
  >
    <span class="action-verb">Grow evenly</span>
    <span class="action-sub">
      {canGrowEvenly
        ? `${evenCost} ${resourceLabel('biomass')} → all directions`
        : `Need ${evenCost} ${resourceLabel('biomass')}`}
    </span>
  </button>
{/if}

<style>
  .action-btn {
    flex-direction: column;
    gap: 2px;
    padding: 13px 12px;
    /* Primary field action: filled with a soft bloom so it never reads as a flat control. */
    box-shadow:
      0 0 0 1px rgba(112, 253, 195, 0.2),
      0 8px 22px -14px var(--primary);
  }

  .action-verb {
    font-weight: 600;
  }

  .action-sub {
    font-size: 11px;
    font-weight: 500;
    opacity: 0.85;
    /* Pin to two lines so a long label never changes the button height. */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .action-btn.hero {
    padding: 14px;
    min-height: 84px;
    justify-content: center;
    font-size: 15px;
  }
</style>
