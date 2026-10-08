<script lang="ts">
  import { gameStore } from '$lib/stores/game.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';

  /**
   * Sticky resource readout for mobile. Always visible under the header so the economy
   * stays glanceable from every phase; tap it to open the full Resources drawer. A pool at
   * its cap lights its meter up.
   */

  let gs = $derived(gameStore.state);

  type Tone = 'water' | 'nutrients' | 'biomass';

  interface Chip {
    id: Tone;
    glyph: string;
    name: string;
    value: number;
    max: number;
    pct: number;
    full: boolean;
  }

  function meter(id: Tone, glyph: string, name: string, value: number, max: number): Chip {
    const full = max > 0 && value >= max - 1e-6;
    return {
      id,
      glyph,
      name,
      value: Math.floor(value),
      max,
      pct: max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0,
      full,
    };
  }

  let chips = $derived<Chip[]>([
    meter('water', 'ψ', 'Water', gs.water, gs.waterCap),
    meter('nutrients', 'ν', 'Nutri.', gs.nutrients, gs.nutrientsCap),
    meter('biomass', 'β', 'Biomass', gameStore.biomass, gameStore.maxBiomass),
  ]);
</script>

<button
  class="res-strip"
  onclick={() => uiStore.openPanel('resources')}
  aria-label="Open resources"
  title="Resources"
>
  {#each chips as chip (chip.id)}
    <span class="mini">
      <span class="mini-top">
        <span class="mini-name" data-tone={chip.id}>
          <span class="sym" aria-hidden="true">{chip.glyph}</span>{chip.name}
        </span>
        <span class="mini-val">{chip.value}</span>
      </span>
      <span class="mini-track">
        <span
          class="mini-fill"
          data-tone={chip.id}
          class:full={chip.full}
          style="width: {chip.pct}%"
        ></span>
      </span>
    </span>
  {/each}
</button>

<style>
  .res-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    width: 100%;
    flex: none;
    padding: 10px 14px;
    border: 0;
    border-bottom: 1px solid var(--border);
    background: var(--surface-container-low);
    cursor: pointer;
    text-align: left;
  }

  .res-strip:hover {
    background: var(--surface-container);
  }

  .res-strip:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: -2px;
  }

  .mini {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }

  .mini-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 4px;
  }

  .mini-name {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mini-name[data-tone='water'] {
    color: var(--secondary);
  }
  .mini-name[data-tone='nutrients'] {
    color: var(--nutrient);
  }
  .mini-name[data-tone='biomass'] {
    color: var(--warning);
  }

  .sym {
    font-family: var(--font-mono);
    font-size: 11px;
  }

  .mini-val {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: 11px;
    color: var(--on-surface);
  }

  .mini-track {
    height: 7px;
    border-radius: var(--radius-pill);
    background: var(--surface-container-lowest);
    border: 1px solid var(--border);
    overflow: hidden;
  }

  .mini-fill {
    display: block;
    height: 100%;
    border-radius: var(--radius-pill);
    background: var(--primary);
    transition: width var(--duration-normal) var(--ease-out-soft);
  }

  .mini-fill[data-tone='water'] {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--secondary) 55%, #0c3237),
      var(--secondary)
    );
  }
  .mini-fill[data-tone='nutrients'] {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--nutrient) 55%, #241a45),
      var(--nutrient)
    );
  }
  .mini-fill[data-tone='biomass'] {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--warning) 55%, #3a2c05),
      var(--warning)
    );
  }

  .mini-fill.full {
    animation: mini-full 1.8s ease-in-out infinite;
  }

  @keyframes mini-full {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mini-fill.full {
      animation: none;
    }
  }
</style>
