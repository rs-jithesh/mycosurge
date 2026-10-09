<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { OfflineReport } from '@mycosurge/game-engine';
  import ResourceSymbol from './ResourceSymbol.svelte';

  let {
    report,
    onDismiss,
  }: {
    report: OfflineReport;
    onDismiss: () => void;
  } = $props();

  let dialogEl = $state<HTMLDivElement>();
  let dismissBtn = $state<HTMLButtonElement>();

  onMount(async () => {
    await tick();
    dismissBtn?.focus();
  });

  function fmtDuration(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds));
    const days = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (days > 0) return `${days}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${total}s`;
  }

  function fmtStat(n: number): string {
    return Math.abs(n) < 10 ? n.toFixed(1) : Math.round(n).toLocaleString();
  }

  function signed(n: number): string {
    return `${n >= 0 ? '+' : '−'}${fmtStat(Math.abs(n))}`;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onDismiss();
  }

  function trapFocus(e: KeyboardEvent) {
    if (e.key !== 'Tab' || !dialogEl) return;
    const focusables = dialogEl.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="scrim" role="presentation" onclick={onDismiss}>
  <div
    class="dialog"
    role="dialog"
    aria-modal="true"
    aria-labelledby="welcome-title"
    tabindex="-1"
    bind:this={dialogEl}
    onclick={(e) => e.stopPropagation()}
    onkeydown={trapFocus}
  >
    <header class="hero">
      <span class="hero-mark" aria-hidden="true">❂</span>
      <h2 id="welcome-title" class="hero-title">Welcome back</h2>
      <p class="hero-sub">Your network kept growing while you were away.</p>
      <p class="hero-away text-data-mono">
        Away for <b>{fmtDuration(report.elapsedSeconds)}</b>
        {#if report.wasCapped}
          <span class="capped">· capped at 8h</span>
        {/if}
      </p>
    </header>

    <div class="stats">
      {#if report.biomassGained !== 0}
        <div class="stat" data-tone="mint">
          <span class="stat-val text-data-mono" class:neg={report.biomassGained < 0}>
            {signed(report.biomassGained)}
          </span>
          <span class="stat-label text-label-caps"
            ><ResourceSymbol id="biomass" focusable={false} /></span
          >
        </div>
      {/if}

      {#if report.waterGained !== 0}
        <div class="stat" data-tone="cyan">
          <span class="stat-val text-data-mono" class:neg={report.waterGained < 0}>
            {signed(report.waterGained)}
          </span>
          <span class="stat-label text-label-caps"
            ><ResourceSymbol id="water" focusable={false} /></span
          >
        </div>
      {/if}

      {#if report.nutrientsGained !== 0}
        <div class="stat" data-tone="violet">
          <span class="stat-val text-data-mono" class:neg={report.nutrientsGained < 0}>
            {signed(report.nutrientsGained)}
          </span>
          <span class="stat-label text-label-caps"
            ><ResourceSymbol id="nutrients" focusable={false} /></span
          >
        </div>
      {/if}

      {#if report.lysateStabilized !== 0}
        <div class="stat" data-tone="amber">
          <span class="stat-val text-data-mono" class:neg={report.lysateStabilized < 0}>
            {signed(report.lysateStabilized)}
          </span>
          <span class="stat-label text-label-caps"
            ><ResourceSymbol id="lysate" focusable={false} /> banked</span
          >
        </div>
      {/if}
    </div>

    {#if report.biomassGained >= 0}
      <p class="rate-note text-data-mono">
        Offline efficiency <b>{Math.round(report.rate * 100)}%</b> — Dormant Spores improves it.
      </p>
    {/if}

    <button class="cmd-btn primary collect-btn" bind:this={dismissBtn} onclick={onDismiss}>
      Collect
    </button>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 250;
    /* Track the visible mobile viewport and allow scrolling on short screens. */
    height: 100vh;
    height: 100dvh;
    overflow-y: auto;
    display: flex;
    padding: var(--space-gutter);
    background: var(--overlay);
    backdrop-filter: blur(3px);
  }

  .dialog {
    display: flex;
    flex-direction: column;
    gap: var(--space-gutter);
    width: min(92vw, 440px);
    margin: auto;
    max-height: calc(100vh - 2 * var(--space-gutter));
    max-height: calc(100dvh - 2 * var(--space-gutter));
    overflow-y: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    background: var(--surface-container);
    padding: var(--space-margin) var(--space-panel-padding) var(--space-panel-padding);
  }

  .hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 4px;
  }

  .hero-mark {
    font-size: 34px;
    line-height: 1;
    color: var(--primary);
    filter: drop-shadow(0 0 12px color-mix(in srgb, var(--primary) 55%, transparent));
  }

  .hero-title {
    margin: 0;
    font-size: var(--font-title-lg, 22px);
    font-weight: 700;
    letter-spacing: 0.01em;
    color: var(--on-surface);
  }

  .hero-sub {
    margin: 0;
    color: var(--on-surface-variant);
    font-size: 13px;
  }

  .hero-away {
    margin: 2px 0 0;
    color: var(--secondary);
    font-size: 12px;
  }

  .hero-away b {
    color: var(--on-surface);
  }

  .capped {
    color: var(--warning);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    border: 1px solid var(--outline-variant);
    border-radius: var(--radius-md);
    background: var(--surface-container-high);
  }

  .stat-val {
    font-size: 18px;
    font-weight: 600;
    color: var(--primary);
  }

  .stat[data-tone='cyan'] .stat-val {
    color: var(--secondary);
  }

  .stat[data-tone='violet'] .stat-val {
    color: var(--nutrient);
  }

  .stat[data-tone='amber'] .stat-val {
    color: var(--warning);
  }

  .stat-val.neg {
    color: var(--alert);
  }

  .stat-label {
    color: var(--on-surface-variant);
    font-size: 10px;
    text-align: center;
    text-transform: none;
  }

  .rate-note {
    margin: 0;
    text-align: center;
    font-size: 11px;
    color: var(--on-surface-variant);
  }

  .rate-note b {
    color: var(--on-surface);
  }

  .collect-btn {
    width: 100%;
    padding: 12px;
    font-weight: 600;
  }
</style>
