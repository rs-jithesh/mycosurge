<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { GrowthPhase } from '@mycosurge/game-engine';
  import { PHASES } from '$lib/content/phases';

  let {
    phase,
    recommended,
    onselect,
    nucleus,
  }: {
    phase: GrowthPhase;
    recommended?: GrowthPhase;
    onselect?: (phase: GrowthPhase) => void;
    nucleus?: Snippet;
  } = $props();

  const C = 200;
  const R = 150;
  const LABEL_RATIO = 0.7;

  function point(deg: number): [number, number] {
    const a = (deg * Math.PI) / 180;
    return [C + R * Math.cos(a), C + R * Math.sin(a)];
  }

  function arcPath(index: number): string {
    const [x0, y0] = point(-90 + index * 90);
    const [x1, y1] = point(-90 + index * 90 + 90);
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }

  function labelStyle(index: number): string {
    const a = (-90 + index * 90 + 45) * (Math.PI / 180);
    const left = 50 + LABEL_RATIO * 50 * Math.cos(a);
    const top = 50 + LABEL_RATIO * 50 * Math.sin(a);
    return `left: ${left.toFixed(2)}%; top: ${top.toFixed(2)}%;`;
  }

  let activeIndex = $derived(PHASES.findIndex((p) => p.id === phase));
  let suggestedIndex = $derived(
    recommended ? PHASES.findIndex((p) => p.id === recommended) : activeIndex,
  );
  let showSuggested = $derived(suggestedIndex !== activeIndex);
</script>

<div class="wheel">
  <svg class="dial" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
    <circle class="track" cx={C} cy={C} r={R} />
    {#each PHASES as p, i}
      <path
        class="arc"
        class:is-active={i === activeIndex}
        class:is-suggested={showSuggested && i === suggestedIndex}
        data-tone={p.tone}
        d={arcPath(i)}
      />
    {/each}
    {#each PHASES as p, i}
      {@const [x, y] = point(-90 + i * 90)}
      <circle
        class="node"
        class:is-active={i === activeIndex}
        data-tone={p.tone}
        cx={x}
        cy={y}
        r="4"
      />
    {/each}
  </svg>

  <div class="orbit" aria-hidden="true"></div>

  <div class="phase-labels" role="tablist" aria-label="Growth cycle stages">
    {#each PHASES as p, i}
      <button
        class="phase-label"
        class:is-active={i === activeIndex}
        class:is-suggested={showSuggested && i === suggestedIndex}
        data-tone={p.tone}
        style={labelStyle(i)}
        role="tab"
        aria-selected={i === activeIndex}
        onclick={() => onselect?.(p.id)}
      >
        <span class="dot" aria-hidden="true"></span>
        <span class="num">{p.index}.</span>
        <span class="name">{p.label}</span>
        {#if showSuggested && i === suggestedIndex}
          <span class="suggest-flag text-label-caps">Next</span>
        {/if}
      </button>
    {/each}
  </div>

  <div class="nucleus">
    {#if nucleus}
      {@render nucleus()}
    {/if}
  </div>
</div>

<style>
  .wheel {
    position: relative;
    width: min(520px, 100%);
    aspect-ratio: 1;
    margin: 0 auto;
  }

  .dial {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .track {
    fill: none;
    stroke: var(--outline-variant);
    stroke-width: 6;
    stroke-dasharray: 2 7;
    opacity: 0.5;
  }

  .arc {
    fill: none;
    stroke: var(--tone, var(--outline-variant));
    stroke-width: 4;
    stroke-linecap: round;
    opacity: 0.3;
    transition:
      stroke var(--duration-normal) var(--ease-out-soft),
      opacity var(--duration-normal) var(--ease-out-soft);
  }

  .arc[data-tone='cyan'] {
    --tone: var(--secondary);
  }
  .arc[data-tone='amber'] {
    --tone: var(--warning);
  }
  .arc[data-tone='coral'] {
    --tone: var(--alert);
  }
  .arc[data-tone='mint'] {
    --tone: var(--primary);
  }

  .arc.is-active {
    stroke: var(--tone);
    stroke-width: 8;
    opacity: 1;
  }

  .arc.is-suggested {
    stroke: var(--tone);
    stroke-width: 6;
    opacity: 0.75;
    stroke-dasharray: 3 9;
  }

  .node {
    fill: var(--outline-variant);
    transition: fill var(--duration-normal) var(--ease-out-soft);
  }

  .node[data-tone='cyan'] {
    --tone: var(--secondary);
  }
  .node[data-tone='amber'] {
    --tone: var(--warning);
  }
  .node[data-tone='coral'] {
    --tone: var(--alert);
  }
  .node[data-tone='mint'] {
    --tone: var(--primary);
  }

  .node.is-active {
    fill: var(--tone);
  }

  .orbit {
    position: absolute;
    inset: 21%;
    border-radius: 50%;
    border: 1px dashed var(--border);
    opacity: 0.5;
    pointer-events: none;
    animation: orbit-spin 90s linear infinite;
  }

  @keyframes orbit-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .phase-labels {
    position: absolute;
    inset: 0;
  }

  .phase-label {
    position: absolute;
    transform: translate(-50%, -50%);
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border);
    background: var(--surface-container);
    color: var(--on-surface-variant);
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    transition:
      border-color var(--duration-normal) var(--ease-out-soft),
      color var(--duration-normal) var(--ease-out-soft);
  }

  .phase-label:hover {
    border-color: var(--tone, var(--primary));
    color: var(--on-surface);
  }

  .phase-label:focus-visible {
    outline: 2px solid var(--tone, var(--primary));
    outline-offset: 2px;
  }

  .phase-label[data-tone='cyan'] {
    --tone: var(--secondary);
  }
  .phase-label[data-tone='amber'] {
    --tone: var(--warning);
  }
  .phase-label[data-tone='coral'] {
    --tone: var(--alert);
  }
  .phase-label[data-tone='mint'] {
    --tone: var(--primary);
  }

  .phase-label.is-active {
    border-color: var(--tone);
    color: var(--tone);
    background: var(--surface-container-high);
    box-shadow: 0 0 14px -2px var(--tone);
  }

  .phase-label.is-suggested {
    border-style: dashed;
    border-color: var(--tone);
    color: var(--on-surface);
  }

  .suggest-flag {
    color: var(--tone);
    font-size: 8px;
    margin-left: 2px;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.7;
  }

  .phase-label.is-active .dot {
    opacity: 1;
  }

  .num {
    opacity: 0.7;
  }

  .nucleus {
    position: absolute;
    inset: 27%;
    display: grid;
    place-items: center;
  }
</style>
