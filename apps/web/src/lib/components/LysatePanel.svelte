<script lang="ts">
  import { gameStore } from '$lib/stores/game.svelte';
  import ResourceSymbol from './ResourceSymbol.svelte';
  import LysateInfo from './LysateInfo.svelte';

  let gs = $derived(gameStore.state);
</script>

<div class="panel lysate-panel">
  <div class="panel-header">
    <span class="text-label-caps name"><ResourceSymbol id="lysate" /></span>
    <span class="head-right">
      <span class="tag text-label-caps">Spendable</span>
      <LysateInfo />
    </span>
  </div>
  <div class="lysate-body">
    <div class="lysate-rows">
      <div class="lysate-cell">
        <span class="text-label-caps lysate-label">Banked</span>
        <span class="text-data-mono lysate-banked">{Math.floor(gs.lysateBanked)}</span>
      </div>
      <div class="lysate-cell">
        <span class="text-label-caps lysate-label">Raw</span>
        <span class="text-data-mono lysate-raw">{Math.floor(gs.lysateRaw * 10) / 10}</span>
      </div>
    </div>
    <p class="lysate-hint">Raw Lysate stabilises into Banked; spend Banked to raise capacity.</p>
  </div>
</div>

<style>
  .panel {
    border: 1px solid color-mix(in srgb, var(--warning) 40%, var(--border));
    background: var(--surface-container);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-unit);
    padding: 10px var(--space-panel-padding);
    background: var(--surface-container-low);
    border-bottom: 1px solid var(--border);
  }

  .name {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--warning);
    text-transform: none;
  }

  .tag {
    color: var(--warning);
    font-size: 9px;
  }

  .head-right {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .lysate-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px var(--space-panel-padding);
  }

  .lysate-rows {
    display: flex;
    gap: 24px;
  }

  .lysate-cell {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .lysate-label {
    color: var(--on-surface-variant);
    font-size: 9px;
  }

  .lysate-banked {
    color: var(--warning);
    font-size: 20px;
  }

  .lysate-raw {
    color: var(--on-surface);
    font-size: 20px;
  }

  .lysate-hint {
    margin: 0;
    font-size: 11px;
    line-height: 1.4;
    color: var(--on-surface-variant);
  }
</style>
