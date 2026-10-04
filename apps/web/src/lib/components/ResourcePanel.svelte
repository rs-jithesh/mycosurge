<script lang="ts">
  import type { CapResource } from '@mycosurge/game-engine';
  import {
    NUTRIENT_YIELD_THRESHOLD,
    STARVATION_STATE_THRESHOLD,
    STARVATION_THRESHOLD,
    WATER_YIELD_THRESHOLD,
    resourceLabel,
  } from '@mycosurge/config';
  import { gameStore } from '$lib/stores/game.svelte';
  import CountUp from './CountUp.svelte';
  import ProgressBar from './ProgressBar.svelte';
  import ResourceSymbol from './ResourceSymbol.svelte';
  import LysateInfo from './LysateInfo.svelte';

  let {
    variant = 'full',
    showLysate = true,
  }: {
    /** `compact` is the tighter mobile meter list; `full` is the desktop panel. */
    variant?: 'full' | 'compact';
    /** Mobile renders Lysate as its own panel, so hide the inline copy. */
    showLysate?: boolean;
  } = $props();

  let gs = $derived(gameStore.state);

  const waterMarkers = [
    STARVATION_STATE_THRESHOLD,
    STARVATION_THRESHOLD,
    WATER_YIELD_THRESHOLD,
  ].map((r) => r * 100);
  const nutrientMarkers = [
    STARVATION_STATE_THRESHOLD,
    STARVATION_THRESHOLD,
    NUTRIENT_YIELD_THRESHOLD,
  ].map((r) => r * 100);

  type Meter = {
    resource: CapResource;
    tone: 'cyan' | 'violet' | 'amber';
    value: number;
    max: number;
    critical: boolean;
    full: boolean;
    markers: number[];
    net: number;
    production?: number;
    upkeep?: number;
  };

  let meters = $derived<Meter[]>([
    {
      resource: 'water',
      tone: 'cyan',
      value: gs.water,
      max: gs.waterCap,
      critical: gs.waterCap > 0 && gs.water / gs.waterCap < 0.35,
      full: gs.waterCap > 0 && gs.water >= gs.waterCap - 1e-6,
      markers: waterMarkers,
      net: gameStore.netResourceRate('water'),
      production: gameStore.resourceProduction('water'),
      upkeep: gameStore.resourceUpkeep('water'),
    },
    {
      resource: 'nutrients',
      tone: 'violet',
      value: gs.nutrients,
      max: gs.nutrientsCap,
      critical: gs.nutrientsCap > 0 && gs.nutrients / gs.nutrientsCap < 0.4,
      full: gs.nutrientsCap > 0 && gs.nutrients >= gs.nutrientsCap - 1e-6,
      markers: nutrientMarkers,
      net: gameStore.netResourceRate('nutrients'),
      production: gameStore.resourceProduction('nutrients'),
      upkeep: gameStore.resourceUpkeep('nutrients'),
    },
    {
      resource: 'biomass',
      tone: 'amber',
      value: gameStore.biomass,
      max: gameStore.maxBiomass,
      critical: false,
      full: gameStore.maxBiomass > 0 && gameStore.biomass >= gameStore.maxBiomass - 1e-6,
      markers: [],
      net: gameStore.biomassPerSec,
    },
  ]);

  // Reach is the network's expansion "resource": shown here so the Biomass sink is visible.
  let reach = $derived(gameStore.reach);
  let nextReachTier = $derived(gameStore.nextReachTier);
  let reachMax = $derived(nextReachTier ? nextReachTier.at : Math.max(1, reach));
</script>

<div class="panel resource-panel" class:compact={variant === 'compact'}>
  <div class="panel-header">
    <span class="text-label-caps">Resources</span>
  </div>

  <div class="res-list">
    {#each meters as m (m.resource)}
      <div class="res-row" data-tone={m.tone} class:is-critical={m.critical}>
        <div class="res-top">
          <span class="res-name"
            ><ResourceSymbol id={m.resource} info />
            {#if m.full}<span class="full-tag text-label-caps">Full</span>{/if}</span
          >
          <span class="text-data-mono res-val">
            {#if m.resource === 'biomass'}
              <b><CountUp value={m.value} format={(n) => n.toFixed(n < 10 ? 1 : 0)} /></b>
            {:else}
              <b>{Math.floor(m.value)}</b>
            {/if}
            <span class="cap">/ {Math.floor(m.max)}</span>
          </span>
        </div>
        <ProgressBar
          tone={m.critical ? 'coral' : m.tone}
          value={m.value}
          max={m.max}
          showValue={false}
          markers={m.markers}
        />
        <div class="res-foot">
          <span class="text-data-mono net" class:neg={m.net < 0}>
            {m.net >= 0 ? '+' : ''}{m.net.toFixed(1)}/s
          </span>
          {#if m.production !== undefined}
            <span class="text-data-mono detail">
              +{m.production.toFixed(1)} produced
              {#if (m.upkeep ?? 0) > 0}· −{(m.upkeep ?? 0).toFixed(1)} upkeep{/if}
            </span>
          {:else}
            <span class="text-data-mono detail">passive growth</span>
          {/if}
        </div>
      </div>
    {/each}

    <div class="res-row reach-row" data-tone="mint">
      <div class="res-top">
        <span class="res-name"><ResourceSymbol id="reach" info /></span>
        <span class="text-data-mono res-val">
          <b>{reach}</b>
          <span class="cap">/ {reachMax} mm</span>
        </span>
      </div>
      <ProgressBar tone="mint" value={reach} max={reachMax} showValue={false} />
      <div class="res-foot">
        <span class="text-data-mono net">Deepest {reach} mm · grow on the map</span>
        {#if nextReachTier}
          <span class="text-data-mono detail">Deeper signals at {nextReachTier.at} mm</span>
        {:else}
          <span class="text-data-mono detail">All hosts in range</span>
        {/if}
      </div>
    </div>

    {#if showLysate}
      <div class="res-row lysate" data-tone="amber">
        <div class="res-top">
          <span class="res-name"><ResourceSymbol id="lysate" /></span>
          <span class="lysate-head-right">
            <span class="tag text-label-caps">Spendable</span>
            <LysateInfo />
          </span>
        </div>
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
        <p class="lysate-hint">
          Raw Lysate stabilises into Banked; spend Banked to raise capacity.
        </p>
      </div>
    {/if}
  </div>

  <div class="vitals">
    <div class="vital">
      <span class="text-label-caps vital-label">Echoes</span>
      <span class="text-data-mono vital-val">{gameStore.acquiredEchoes.length}</span>
    </div>
    <div class="vital">
      <span class="text-label-caps vital-label">Hosts</span>
      <span class="text-data-mono vital-val">{gameStore.hostsDefeated}</span>
    </div>
  </div>
</div>

<style>
  .panel {
    border: 1px solid var(--border);
    background: var(--surface-container);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  @media (min-width: 1080px) {
    .panel {
      height: 100%;
    }
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-unit);
    padding: var(--space-unit) var(--space-panel-padding);
    background: var(--surface-container-low);
    border-bottom: 1px solid var(--border);
    color: var(--primary);
  }

  .res-list {
    flex: 1;
    padding: 2px var(--space-panel-padding);
  }

  .res-row {
    --tone: var(--primary);
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 0;
  }

  .res-row + .res-row {
    border-top: 1px solid var(--border);
  }

  .res-row[data-tone='cyan'] {
    --tone: var(--secondary);
  }
  .res-row[data-tone='violet'] {
    --tone: var(--nutrient);
  }
  .res-row[data-tone='amber'] {
    --tone: var(--warning);
  }

  .res-row.is-critical {
    --tone: var(--alert);
  }

  .res-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .res-name {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 600;
    color: var(--tone);
  }

  .res-row.is-critical .res-name {
    color: var(--alert);
  }

  .full-tag {
    margin-left: 4px;
    padding: 1px 6px;
    border: 1px solid color-mix(in srgb, var(--warning) 55%, transparent);
    border-radius: var(--radius-pill);
    color: var(--warning);
    font-size: 9px;
    line-height: 1.4;
  }

  .res-val {
    color: var(--on-surface-variant);
    font-size: 13px;
    white-space: nowrap;
  }

  .res-val b {
    color: var(--on-surface);
    font-weight: 600;
  }

  .cap {
    color: var(--on-surface-variant);
  }

  .res-row.is-critical .res-val,
  .res-row.is-critical .res-val b {
    color: var(--alert);
  }

  .res-foot {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 6px;
    font-size: 11px;
  }

  .net {
    color: var(--primary);
  }

  .net.neg {
    color: var(--alert);
  }

  .detail {
    color: var(--on-surface-variant);
    font-size: 10px;
  }

  /* ── Lysate ── */
  .lysate-rows {
    display: flex;
    gap: 18px;
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
    font-size: 18px;
  }

  .lysate-raw {
    color: var(--on-surface);
    font-size: 18px;
  }

  .lysate-hint {
    margin: 0;
    font-size: 10px;
    line-height: 1.4;
    color: var(--on-surface-variant);
  }

  .tag {
    color: var(--warning);
    font-size: 9px;
  }

  .lysate-head-right {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  /* ── Vitals ── */
  .vitals {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    padding: 10px var(--space-panel-padding);
    border-top: 1px solid var(--border);
    background: var(--surface-container-low);
  }

  .vital {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .vital-label {
    color: var(--on-surface-variant);
    font-size: 9px;
  }

  .vital-val {
    color: var(--on-surface);
    font-size: 15px;
  }

  /* ── Compact (mobile): tighter rows, every datum kept ── */
  .panel.compact .res-list {
    padding: 0 var(--space-panel-padding);
  }

  .panel.compact .res-row {
    padding: 8px 0;
    gap: 4px;
  }

  .panel.compact .res-name {
    font-size: 13px;
  }

  .panel.compact .res-val {
    font-size: 12px;
  }

  .panel.compact .res-foot {
    font-size: 10px;
  }

  .panel.compact .vitals {
    padding: 8px var(--space-panel-padding);
  }

  .panel.compact .vital-val {
    font-size: 14px;
  }
</style>
