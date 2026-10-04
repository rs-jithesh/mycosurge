<script lang="ts">
  import { gameStore } from '$lib/stores/game.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';

  /**
   * Sticky one-line resource readout for mobile. Always visible under the header so
   * the economy stays glanceable from every phase; tap it to open the full Resources
   * drawer. A resource at its cap lights up amber.
   */

  let gs = $derived(gameStore.state);

  type Tone = 'water' | 'nutrients' | 'biomass' | 'lysate';

  interface Chip {
    id: Tone;
    glyph: string;
    value: number;
    full: boolean;
  }

  function isFull(value: number, max: number): boolean {
    return max > 0 && value >= max - 1e-6;
  }

  let chips = $derived<Chip[]>([
    { id: 'water', glyph: 'ψ', value: Math.floor(gs.water), full: isFull(gs.water, gs.waterCap) },
    {
      id: 'nutrients',
      glyph: 'ν',
      value: Math.floor(gs.nutrients),
      full: isFull(gs.nutrients, gs.nutrientsCap),
    },
    {
      id: 'biomass',
      glyph: 'β',
      value: Math.floor(gameStore.biomass),
      full: isFull(gameStore.biomass, gameStore.maxBiomass),
    },
    { id: 'lysate', glyph: 'λ', value: Math.floor(gs.lysateBanked), full: false },
  ]);
</script>

<button
  class="res-strip"
  onclick={() => uiStore.openPanel('resources')}
  aria-label="Open resources"
  title="Resources"
>
  {#each chips as chip (chip.id)}
    <span class="chip" class:full={chip.full} data-tone={chip.id}>
      <span class="g" aria-hidden="true">{chip.glyph}</span>
      <span class="v">{chip.value}</span>
    </span>
  {/each}
</button>

<style>
  .res-strip {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    flex: none;
    padding: 7px 12px;
    border: 0;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--surface-container-low) 94%, transparent);
    cursor: pointer;
  }

  .res-strip:hover {
    background: var(--surface-container);
  }

  .res-strip:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: -2px;
  }

  .chip {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    padding: 3px 9px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border);
    background: var(--surface-container);
    white-space: nowrap;
  }

  .chip .g {
    font-size: 12px;
    font-weight: 600;
  }

  .chip .v {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--on-surface);
  }

  .chip[data-tone='water'] .g {
    color: var(--secondary);
  }
  .chip[data-tone='nutrients'] .g {
    color: var(--nutrient);
  }
  .chip[data-tone='biomass'] .g {
    color: var(--primary);
  }
  .chip[data-tone='lysate'] .g {
    color: var(--warning);
  }

  /* Full: amber outline with a soft breathing glow. */
  .chip.full {
    border-color: var(--warning);
    animation: chip-full 1.8s ease-in-out infinite;
  }

  .chip.full .g,
  .chip.full .v {
    color: var(--warning);
  }

  @keyframes chip-full {
    0%,
    100% {
      box-shadow: 0 0 7px -1px color-mix(in srgb, var(--warning) 60%, transparent);
    }
    50% {
      box-shadow: 0 0 14px 1px color-mix(in srgb, var(--warning) 85%, transparent);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .chip.full {
      animation: none;
      box-shadow: 0 0 10px -1px color-mix(in srgb, var(--warning) 70%, transparent);
    }
  }
</style>
