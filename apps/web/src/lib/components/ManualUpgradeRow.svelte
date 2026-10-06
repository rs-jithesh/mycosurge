<script lang="ts">
  import { getManualUpgrade, resourceLabel } from '@mycosurge/config';
  import type { ManualUpgradeId } from '@mycosurge/config';
  import { gameStore } from '$lib/stores/game.svelte';

  let { id }: { id: ManualUpgradeId } = $props();

  let def = $derived(getManualUpgrade(id));
  let level = $derived(gameStore.manualUpgradeLevel(id));
  let cost = $derived(gameStore.manualUpgradeCost(id));
  let canBuy = $derived(gameStore.canUpgradeManual(id));
</script>

{#if def}
  <div class="upg-row">
    <div class="upg-meta">
      <span class="upg-name">
        {def.name}
        <span class="text-data-mono upg-lv">Lv.{level}/{def.maxLevel}</span>
      </span>
      <span class="upg-desc">{def.description}</span>
    </div>
    {#if cost}
      <button
        class="cmd-btn upg-btn"
        disabled={!canBuy}
        onclick={() => gameStore.purchaseManualUpgrade(id)}
      >
        {cost.lysate}
        {resourceLabel('lysate')} · {cost.biomass}
        {resourceLabel('biomass')}
      </button>
    {:else}
      <span class="text-label-caps upg-max">Maxed</span>
    {/if}
  </div>
{/if}

<style>
  .upg-row {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid var(--outline-variant);
    border-radius: var(--radius-md);
    background: var(--surface-container-high);
    padding: 10px 12px;
  }

  .upg-meta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .upg-name {
    font-weight: 600;
  }

  .upg-lv {
    color: var(--on-surface-variant);
    font-size: 11px;
  }

  .upg-desc {
    color: var(--on-surface-variant);
    font-size: 12px;
    line-height: 1.4;
  }

  .upg-btn {
    flex-shrink: 0;
    display: inline-flex;
    gap: 4px;
    padding: 6px 10px;
    font-size: 11px;
    min-height: 40px;
  }

  .upg-max {
    color: var(--secondary);
    flex-shrink: 0;
  }
</style>
