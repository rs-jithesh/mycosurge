<script lang="ts">
  let {
    value,
    min = 0,
    max,
    label = '',
    variant = 'primary',
    showPercent = true,
  }: {
    value: number;
    min?: number;
    max: number;
    label?: string;
    variant?: 'primary' | 'alert' | 'secondary';
    showPercent?: boolean;
  } = $props();

  let barLen = 12;

  let ratio = $derived(Math.min(1, value / max));
  let filled = $derived(Math.round(ratio * barLen));
  let empty = $derived(barLen - filled);
  let percent = $derived(Math.round(ratio * 100));

  let bar = $derived('\u2588'.repeat(Math.max(0, filled)) + '\u2591'.repeat(Math.max(0, empty)));
</script>

<div class="ascii-bar" data-variant={variant}>
  {#if label}
    <span class="label text-label-caps">{label}</span>
  {/if}
  <span class="bar-fill">[{bar}]</span>
  {#if showPercent}
    <span class="val text-data-mono">{percent}%</span>
  {/if}
</div>

<style>
  .ascii-bar {
    display: flex;
    align-items: center;
    gap: var(--space-unit);
    line-height: var(--line-data-mono);
    font-variant-numeric: tabular-nums;
  }

  .label {
    min-width: 110px;
    flex-shrink: 0;
  }

  .bar-fill {
    letter-spacing: 1px;
    white-space: pre;
  }

  .val {
    min-width: 40px;
    text-align: right;
  }

  .ascii-bar[data-variant='primary'] .label,
  .ascii-bar[data-variant='primary'] .bar-fill,
  .ascii-bar[data-variant='primary'] .val {
    color: var(--primary);
  }

  .ascii-bar[data-variant='alert'] .label,
  .ascii-bar[data-variant='alert'] .bar-fill,
  .ascii-bar[data-variant='alert'] .val {
    color: var(--alert);
  }

  .ascii-bar[data-variant='secondary'] .label {
    color: var(--secondary);
  }

  .ascii-bar[data-variant='secondary'] .bar-fill,
  .ascii-bar[data-variant='secondary'] .val {
    color: var(--secondary);
  }
</style>
