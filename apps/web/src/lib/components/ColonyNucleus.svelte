<script lang="ts">
  import { gameStore } from '$lib/stores/game.svelte';
  import CountUp from './CountUp.svelte';
  import ProgressBar from './ProgressBar.svelte';

  let { compact = false }: { compact?: boolean } = $props();

  function fmtBiomass(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return Math.floor(n).toString();
  }

  let rate = $derived(gameStore.biomassPerSec);
  let starving = $derived(gameStore.isStarving);
</script>

<div class="nucleus" class:compact>
  {#if compact}
    <div class="head">
      <span class="tag text-label-caps">Colony organism</span>
      <span class="rate text-data-mono" class:is-halted={starving || rate <= 0}>
        +{rate.toFixed(1)} / s
      </span>
    </div>
    <div class="meter-row">
      <span class="biomass text-data-mono">
        <CountUp value={gameStore.biomass} format={fmtBiomass} />
        <span class="cap">/ {Math.floor(gameStore.maxBiomass)}</span>
      </span>
      <ProgressBar
        tone="amber"
        value={gameStore.biomass}
        max={gameStore.maxBiomass}
        showValue={false}
      />
    </div>
    {#if starving}
      <span class="starve text-label-caps">Starving — restore Water &amp; Nutrients</span>
    {/if}
  {:else}
    <span class="tag text-label-caps">Colony organism</span>
    <span class="biomass text-data-mono">
      <CountUp value={gameStore.biomass} format={fmtBiomass} />
      <span class="cap">/ {Math.floor(gameStore.maxBiomass)}</span>
    </span>
    <div class="bar">
      <ProgressBar
        tone="amber"
        value={gameStore.biomass}
        max={gameStore.maxBiomass}
        showValue={false}
      />
    </div>
    <span class="rate text-data-mono" class:is-halted={starving || rate <= 0}>
      +{rate.toFixed(1)} Biomass / sec
    </span>
    {#if starving}
      <span class="starve text-label-caps">Starving — restore Water &amp; Nutrients</span>
    {/if}
  {/if}
</div>

<style>
  .nucleus {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    text-align: center;
    padding: 14%;
    background: radial-gradient(
      circle at 50% 35%,
      var(--surface-container-high) 0%,
      var(--surface) 78%
    );
    border: 1px solid var(--border);
    box-shadow: inset 0 0 26px -8px var(--primary-glow);
  }

  .tag {
    color: var(--on-surface-variant);
    font-size: 10px;
  }

  .biomass {
    color: var(--warning);
    font-size: 20px;
    font-weight: 700;
    line-height: 1.1;
  }

  .cap {
    color: var(--on-surface-variant);
    font-size: 12px;
    font-weight: 500;
  }

  .bar {
    width: 80%;
  }

  .rate {
    color: var(--primary);
    font-size: 12px;
  }

  .rate.is-halted {
    color: var(--on-surface-variant);
  }

  .starve {
    color: var(--alert);
    font-size: 10px;
    line-height: 1.3;
  }

  /* ── Compact (mobile banner) ── */
  .nucleus.compact {
    border-radius: var(--radius-lg);
    gap: 8px;
    padding: 12px 14px;
    background: var(--surface-container);
    box-shadow: var(--shadow-sm);
  }

  .head {
    width: 100%;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-unit);
  }

  .meter-row {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .meter-row .biomass {
    font-size: 16px;
  }
</style>
