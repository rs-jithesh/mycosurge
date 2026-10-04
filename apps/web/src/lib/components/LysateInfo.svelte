<script lang="ts">
  import {
    LYSATE_MAX_STABILIZE_RATE,
    LYSATE_STABILIZE_WATER_COST,
    LYSATE_STABILIZE_NUTRIENT_COST,
  } from '@mycosurge/config';
  import Tooltip from './Tooltip.svelte';
</script>

<Tooltip tone="amber">
  {#snippet content()}
    <span class="tip-title">Lysate drain</span>
    <span class="tip-desc">
      Raw Lysate decays over time. Up to {LYSATE_MAX_STABILIZE_RATE}/s stabilises into Banked
      Lysate, spending {LYSATE_STABILIZE_WATER_COST} Water and {LYSATE_STABILIZE_NUTRIENT_COST}
      Nutrients per unit — an ongoing drain that competes with your reach upkeep.
    </span>
  {/snippet}
  <span class="lysate-info" aria-label="About Lysate upkeep">ⓘ</span>
</Tooltip>

<style>
  .lysate-info {
    color: var(--warning);
    font-size: 13px;
    line-height: 1;
  }
</style>
