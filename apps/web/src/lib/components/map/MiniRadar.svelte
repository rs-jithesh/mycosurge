<script lang="ts">
  import {
    REACH_SECTORS,
    formatReach,
    getStageBandWidth,
    getStageForReach,
  } from '@mycosurge/config';
  import { gameStore } from '$lib/stores/game.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';

  /**
   * Persistent mini radar: a live six-spoke summary of the network's reach that also
   * opens the full map. Reach touches every phase, so this lives in the header rather
   * than inside the Expand stage. The organism's wedge suggestion pulses the matching
   * spoke, so "something wants attention" reads from any stage without opening the map.
   */

  let depths = $derived(gameStore.sectorDepths);
  let reach = $derived(gameStore.reach);
  let stage = $derived(getStageForReach(reach));
  let band = $derived(getStageBandWidth(stage));
  let label = $derived(formatReach(reach));
  /** Wedge index the organism suggests growing, or null when it has no advice. */
  let suggested = $derived(gameStore.advisor.sector);
  let hasSuggestion = $derived(suggested !== null);

  const C = 16;
  const INNER = 3.4;
  const OUTER = 12.8;
  const TAU = Math.PI * 2;

  /** One spoke per wedge, matching the engine's sector-centre angles. */
  let spokes = $derived(
    depths.map((depth, i) => {
      const local = Math.max(0, Math.min(band, depth - stage.minMm));
      const frac = band > 0 ? local / band : 0;
      const a = ((i + 0.5) / REACH_SECTORS) * TAU - Math.PI / 2;
      const r = INNER + frac * (OUTER - INNER);
      return {
        i,
        x: C + Math.cos(a) * r,
        y: C + Math.sin(a) * r,
        tipX: C + Math.cos(a) * OUTER,
        tipY: C + Math.sin(a) * OUTER,
        suggested: i === suggested,
      };
    }),
  );
</script>

<button
  class="mini-radar"
  class:pulse={hasSuggestion}
  onclick={() => uiStore.openPanel('map')}
  title="Network map"
  aria-label={`Open the network map. Reach ${label.label}${
    hasSuggestion ? '. A direction wants attention.' : ''
  }`}
>
  <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" focusable="false">
    <circle class="rim" cx={C} cy={C} r={OUTER} />
    {#each spokes as s (s.i)}
      <line class="spoke" class:suggested={s.suggested} x1={C} y1={C} x2={s.x} y2={s.y} />
      <circle class="spoke-tip" class:suggested={s.suggested} cx={s.tipX} cy={s.tipY} r="0.9" />
    {/each}
    <circle class="hub" cx={C} cy={C} r="1.9" />
    {#if hasSuggestion}
      <circle class="ping" cx={C} cy={C} r={OUTER} />
    {/if}
  </svg>
  <span class="label text-data-mono">
    {label.value}<span class="unit">{label.unit}</span>
  </span>
</button>

<style>
  .mini-radar {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 3px 9px 3px 5px;
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    background: var(--surface-container);
    color: var(--on-surface-variant);
    cursor: pointer;
  }

  .mini-radar:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  .mini-radar:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .mini-radar svg {
    display: block;
    overflow: visible;
  }

  .rim {
    fill: none;
    stroke: var(--outline-variant);
    stroke-width: 1;
    opacity: 0.6;
  }

  .spoke {
    stroke: var(--primary);
    stroke-width: 1.6;
    stroke-linecap: round;
    opacity: 0.85;
  }

  .spoke-tip {
    fill: var(--primary);
    opacity: 0.85;
  }

  .hub {
    fill: var(--primary);
  }

  .spoke.suggested,
  .spoke-tip.suggested {
    stroke: var(--warning);
    fill: var(--warning);
    opacity: 1;
  }

  .ping {
    fill: none;
    stroke: var(--warning);
    stroke-width: 1.4;
    opacity: 0;
    animation: mini-ping 1.5s ease-out infinite;
    transform-origin: 16px 16px;
  }

  @keyframes mini-ping {
    0% {
      opacity: 0.7;
      transform: scale(0.85);
    }
    100% {
      opacity: 0;
      transform: scale(1.35);
    }
  }

  .mini-radar.pulse .spoke-tip.suggested {
    animation: spoke-blink 900ms ease-in-out infinite;
  }

  @keyframes spoke-blink {
    0%,
    100% {
      opacity: 0.25;
    }
    50% {
      opacity: 1;
    }
  }

  .label {
    font-size: 12px;
    white-space: nowrap;
  }

  .unit {
    margin-left: 2px;
    opacity: 0.7;
  }

  @media (prefers-reduced-motion: reduce) {
    .ping {
      animation: none;
      opacity: 0;
    }

    .mini-radar.pulse .spoke-tip.suggested {
      animation: none;
    }
  }
</style>
