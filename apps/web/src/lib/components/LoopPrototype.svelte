<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { gameStore } from '$lib/stores/game.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';

  /**
   * Throwaway QA prototype (`?loop`): the core loop with no economy — pick a direction,
   * grow toward the sensed signal, engage the host. Reachable at `/?loop`.
   */

  const SECTORS = 6;
  const STEPS = 3;
  const STEP_PX = 40;
  const CX = 170;
  const CY = 170;
  const MAX_DIST = STEPS * STEP_PX;
  const DIRECTIONS = ['North', 'North-East', 'South-East', 'South', 'South-West', 'North-West'];
  const HOST_ID = 'soil_nematode';

  let reach = $state<number[]>(Array.from({ length: SECTORS }, () => 0));
  let signalSector = $state(0);
  let fought = $state(false);

  onMount(() => {
    signalSector = Math.floor(Math.random() * SECTORS);
  });

  function angle(i: number): number {
    return (i / SECTORS) * Math.PI * 2 - Math.PI / 2;
  }

  function point(i: number, dist: number) {
    const a = angle(i);
    return { x: CX + Math.cos(a) * dist, y: CY + Math.sin(a) * dist };
  }

  let signalReached = $derived(reach[signalSector] >= STEPS);
  let stepsAway = $derived(Math.max(0, STEPS - reach[signalSector]));
  let signalPoint = $derived(point(signalSector, MAX_DIST));

  function grow(i: number) {
    if (signalReached) return;
    if (reach[i] >= STEPS) return;
    const next = reach.slice();
    next[i] = Math.min(STEPS, next[i] + 1);
    reach = next;
  }

  function engage() {
    if (!signalReached) return;
    gameStore.engageHost(HOST_ID);
    uiStore.openCombat(HOST_ID);
  }

  function again() {
    reach = Array.from({ length: SECTORS }, () => 0);
    signalSector = Math.floor(Math.random() * SECTORS);
    fought = false;
  }

  // Note when a fight ends so the recap can appear.
  let wasInCombat = false;
  $effect(() => {
    const active = uiStore.combatHostId !== null;
    if (wasInCombat && !active) fought = true;
    wasInCombat = active;
  });

  function leave() {
    goto('/');
  }
</script>

<div class="proto">
  <div class="proto-head">
    <span class="proto-tag text-label-caps">Prototype</span>
    <h1 class="proto-title">Reach the signal</h1>
    <p class="proto-sub">
      Pick a direction and grow toward the blip. When it solidifies, engage — that's the loop.
    </p>
  </div>

  <svg class="board" viewBox="0 0 340 340" role="group" aria-label="Expansion prototype">
    <circle class="guide-ring" cx={CX} cy={CY} r={MAX_DIST} />

    {#each Array.from({ length: SECTORS }) as _, i (i)}
      {@const end = point(i, MAX_DIST)}
      <line class="guide" x1={CX} y1={CY} x2={end.x} y2={end.y} />
    {/each}

    {#each Array.from({ length: SECTORS }) as _, i (i)}
      {@const end = point(i, reach[i] * STEP_PX)}
      <line class="spoke" x1={CX} y1={CY} x2={end.x} y2={end.y} />
      {#if reach[i] > 0}
        <circle class="node" cx={end.x} cy={end.y} r="4" />
      {/if}
    {/each}

    <g
      class="blip"
      class:reached={signalReached}
      transform={`translate(${signalPoint.x} ${signalPoint.y})`}
    >
      <circle class="blip-ring" r="9" />
      <circle class="blip-dot" r="3" />
    </g>

    <circle class="spore" cx={CX} cy={CY} r="8" />
    <circle class="spore-core" cx={CX} cy={CY} r="3" />

    {#each Array.from({ length: SECTORS }) as _, i (i)}
      {@const end = point(i, MAX_DIST)}
      <line
        class="hit"
        x1={CX}
        y1={CY}
        x2={end.x}
        y2={end.y}
        role="button"
        tabindex="0"
        aria-label={`Grow ${DIRECTIONS[i]}`}
        onclick={() => grow(i)}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') grow(i);
        }}
      />
    {/each}
  </svg>

  <div class="proto-foot">
    {#if fought}
      <span class="status reached">Loop complete — that's the whole game in miniature.</span>
      <button class="cmd-btn" onclick={again}>Run it again</button>
    {:else if signalReached}
      <span class="status reached">Signal reached.</span>
      <button class="cmd-btn engage" onclick={engage}>Engage the host</button>
    {:else}
      <span class="status text-data-mono"
        >{stepsAway} step{stepsAway === 1 ? '' : 's'} to the signal</span
      >
      <span class="status hint">Tap the direction the blip is in.</span>
    {/if}
  </div>

  <button class="leave" onclick={leave}>Leave prototype →</button>
</div>

<style>
  .proto {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    max-width: 420px;
    margin: 0 auto;
    padding: var(--space-gutter) 0 var(--space-margin);
  }

  .proto-head {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .proto-tag {
    color: var(--warning);
  }

  .proto-title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: var(--on-surface);
  }

  .proto-sub {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--on-surface-variant);
  }

  .board {
    width: 100%;
    max-width: 360px;
    height: auto;
    touch-action: manipulation;
  }

  .guide-ring {
    fill: none;
    stroke: var(--outline-variant);
    stroke-width: 1;
    stroke-dasharray: 4 6;
    opacity: 0.5;
  }

  .guide {
    stroke: var(--outline-variant);
    stroke-width: 1;
    opacity: 0.25;
  }

  .spoke {
    stroke: var(--primary);
    stroke-width: 4;
    stroke-linecap: round;
    opacity: 0.85;
  }

  .node {
    fill: var(--primary);
  }

  .spore {
    fill: var(--surface-container-high);
    stroke: var(--primary);
    stroke-width: 2.5;
  }

  .spore-core {
    fill: var(--primary);
  }

  .blip-ring {
    fill: none;
    stroke: var(--secondary);
    stroke-width: 2;
    stroke-dasharray: 3 3;
    transform-box: fill-box;
    transform-origin: center;
    animation: pulse 1.4s ease-in-out infinite;
  }

  .blip-dot {
    fill: var(--secondary);
  }

  .blip.reached .blip-ring {
    stroke: var(--warning);
    stroke-dasharray: none;
    animation: none;
  }

  .blip.reached .blip-dot {
    fill: var(--warning);
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.35;
      transform: scale(1.4);
    }
  }

  .hit {
    stroke: transparent;
    stroke-width: 46;
    stroke-linecap: round;
    pointer-events: stroke;
    cursor: pointer;
  }

  .hit:focus-visible {
    stroke: color-mix(in srgb, var(--primary) 25%, transparent);
    outline: none;
  }

  .proto-foot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    min-height: 64px;
    text-align: center;
  }

  .status {
    color: var(--on-surface-variant);
  }

  .status.reached {
    color: var(--warning);
    font-weight: 600;
  }

  .status.hint {
    font-size: 12px;
  }

  .engage {
    min-width: 200px;
  }

  .leave {
    background: transparent;
    border: none;
    color: var(--on-surface-variant);
    font: inherit;
    font-size: 12px;
    text-decoration: underline;
    cursor: pointer;
  }

  @media (prefers-reduced-motion: reduce) {
    .blip-ring {
      animation: none;
    }
  }
</style>
