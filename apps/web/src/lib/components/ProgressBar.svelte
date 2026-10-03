<script lang="ts">
  import type { Tone } from '$lib/content/onboarding';

  let {
    value,
    max,
    tone = 'mint',
    label = '',
    valueText = '',
    showValue = true,
  }: {
    value: number;
    max: number;
    tone?: Tone;
    label?: string;
    valueText?: string;
    showValue?: boolean;
  } = $props();

  let pct = $derived(max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0);
  let display = $derived(valueText || `${Math.round(pct)}%`);
</script>

<div class="pbar">
  {#if label || showValue}
    <div class="head">
      {#if label}
        <span class="label text-label-caps">{label}</span>
      {/if}
      {#if showValue}
        <span class="val text-data-mono">{display}</span>
      {/if}
    </div>
  {/if}
  <div class="track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
    <span class="fill" data-tone={tone} style="width: {pct}%"></span>
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

  .val {
    color: var(--on-surface-variant);
  }

  .track {
    height: 10px;
    border-radius: var(--radius-pill);
    background: var(--surface-container-high);
    overflow: hidden;
  }

  .fill {
    display: block;
    height: 100%;
    border-radius: var(--radius-pill);
    background: var(--primary);
    transition: width var(--duration-normal) var(--ease-out-soft);
  }

  .fill[data-tone='amber'] {
    background: var(--warning);
  }

  .fill[data-tone='coral'] {
    background: var(--alert);
  }

  .fill[data-tone='cyan'] {
    background: var(--secondary);
  }

  .fill[data-tone='violet'] {
    background: var(--nutrient);
  }
</style>
