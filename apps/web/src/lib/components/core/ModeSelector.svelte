<script lang="ts">
  import type { GrowthPhase } from '@mycosurge/game-engine';
  import { PHASES } from '$lib/content/phases';
  import ResourceIcon from '$lib/components/ResourceIcon.svelte';

  let {
    phase,
    recommended,
    onselect,
  }: {
    phase: GrowthPhase;
    recommended: GrowthPhase;
    onselect: (phase: GrowthPhase) => void;
  } = $props();

  let activeIndex = $derived(PHASES.findIndex((p) => p.id === phase));
  let suggestedIndex = $derived(PHASES.findIndex((p) => p.id === recommended));
  let showSuggested = $derived(suggestedIndex !== activeIndex);
</script>

<div class="mode-selector" role="tablist" aria-label="Growth cycle stages">
  {#each PHASES as p, i (p.id)}
    <button
      class="mode"
      class:is-active={i === activeIndex}
      class:is-suggested={showSuggested && i === suggestedIndex}
      data-tone={p.tone}
      role="tab"
      aria-selected={i === activeIndex}
      onclick={() => onselect(p.id)}
    >
      <span class="mode-icon" aria-hidden="true"><ResourceIcon name={p.id} size={22} /></span>
      <span class="mode-label">{p.label}</span>
    </button>
  {/each}
</div>

<style>
  .mode-selector {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    width: 100%;
  }

  .mode {
    --tone: var(--primary);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    min-width: 0;
    padding: 8px 2px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface-container);
    color: var(--on-surface-variant);
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition:
      border-color var(--duration-normal) var(--ease-out-soft),
      color var(--duration-normal) var(--ease-out-soft),
      box-shadow var(--duration-normal) var(--ease-out-soft),
      background-color var(--duration-normal) var(--ease-out-soft);
  }

  .mode[data-tone='cyan'] {
    --tone: var(--secondary);
  }
  .mode[data-tone='amber'] {
    --tone: var(--warning);
  }
  .mode[data-tone='coral'] {
    --tone: var(--alert);
  }
  .mode[data-tone='mint'] {
    --tone: var(--primary);
  }

  .mode:focus-visible {
    outline: 2px solid var(--tone);
    outline-offset: 2px;
  }

  .mode-icon {
    display: grid;
    place-items: center;
    color: currentColor;
  }

  .mode-icon :global(.resource-icon) {
    opacity: 0.85;
  }

  .mode-label {
    white-space: nowrap;
  }

  .mode.is-suggested {
    border-style: dashed;
    border-color: var(--tone);
    color: var(--on-surface);
  }

  .mode.is-active {
    border-color: var(--tone);
    color: var(--tone);
    background: var(--surface-container-high);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--tone) 35%, transparent),
      0 0 14px -4px var(--tone);
  }

  .mode.is-active .mode-icon :global(.resource-icon) {
    opacity: 1;
  }
</style>
