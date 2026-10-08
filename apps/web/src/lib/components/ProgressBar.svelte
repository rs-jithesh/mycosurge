<script lang="ts">
  import type { Tone } from '$lib/content/onboarding';
  import CountUp from './CountUp.svelte';

  let {
    value,
    max,
    tone = 'mint',
    label = '',
    valueText = '',
    showValue = true,
    labelCaps = true,
    markers = [],
    animate = false,
    format,
  }: {
    value: number;
    max: number;
    tone?: Tone;
    label?: string;
    valueText?: string;
    showValue?: boolean;
    /** Render the label in normal case (e.g. a resource label carrying a lowercase symbol). */
    labelCaps?: boolean;
    /** Decorative threshold ticks, as percentages (0–100). */
    markers?: number[];
    /** Roll the numeric readout up to `value` instead of showing `valueText`. */
    animate?: boolean;
    /** Formatter for the animated readout (defaults to whole numbers). */
    format?: (n: number) => string;
  } = $props();

  let pct = $derived(max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0);
  let display = $derived(valueText || `${Math.round(pct)}%`);
</script>

<div class="pbar">
  {#if label || showValue}
    <div class="head">
      {#if label}
        <span class="label" class:text-label-caps={labelCaps} class:label-plain={!labelCaps}>
          {label}
        </span>
      {/if}
      {#if showValue}
        <span class="val text-data-mono">
          {#if animate}
            <CountUp {value} {format} />
          {:else}
            {display}
          {/if}
        </span>
      {/if}
    </div>
  {/if}
  <div class="track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
    <span class="fill" data-tone={tone} style="width: {pct}%"></span>
    {#each markers as marker, i (i)}
      <span class="marker" aria-hidden="true" style="left: {Math.max(0, Math.min(100, marker))}%"
      ></span>
    {/each}
  </div>
</div>

<style>
  .pbar {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-unit);
  }

  .label {
    color: var(--on-surface);
  }

  .label-plain {
    font-size: var(--font-label-caps);
    line-height: var(--line-label-caps);
    font-weight: var(--weight-label-caps);
    letter-spacing: normal;
    text-transform: none;
  }

  .val {
    color: var(--on-surface-variant);
  }

  .track {
    position: relative;
    height: 10px;
    border-radius: var(--radius-pill);
    background: var(--surface-container-lowest);
    border: 1px solid var(--border);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  .fill {
    display: block;
    height: 100%;
    border-radius: var(--radius-pill);
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--primary) 55%, #0d3a29),
      var(--primary)
    );
    transition: width var(--duration-normal) var(--ease-out-soft);
  }

  .marker {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1.5px;
    margin-left: -0.75px;
    background: color-mix(in srgb, var(--on-surface-variant) 55%, transparent);
    z-index: 1;
    pointer-events: none;
  }

  .fill[data-tone='amber'] {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--warning) 55%, #3a2c05),
      var(--warning)
    );
  }

  .fill[data-tone='coral'] {
    background: linear-gradient(90deg, color-mix(in srgb, var(--alert) 55%, #3a1a17), var(--alert));
  }

  .fill[data-tone='cyan'] {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--secondary) 55%, #0c3237),
      var(--secondary)
    );
  }

  .fill[data-tone='violet'] {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--nutrient) 55%, #241a45),
      var(--nutrient)
    );
  }
</style>
