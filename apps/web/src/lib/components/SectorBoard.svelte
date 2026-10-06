<script lang="ts">
  import { generateNetwork, sectorIndexForAngle } from '@mycosurge/game-engine';

  /**
   * The sector expansion, drawn from the same seeded geometry as the full-game map so the
   * two read as one system. Territory wedges + hyphae + markers, with each wedge tappable
   * to grow that direction. Pan/zoom and stage rings are the map's additions; this is the
   * core board both share.
   */
  let {
    depths = [0, 0, 0, 0, 0, 0],
    seed = 1,
    stageIndex = 1,
    signalSector = null,
    signalMm = 0,
    growStepMm = 0.5,
    interactive = false,
    onGrow,
    label = 'Network',
  }: {
    /** Local mm of growth per sector (index = sector). */
    depths?: number[];
    seed?: number;
    stageIndex?: number;
    /** Sector the active signal sits in, or null. */
    signalSector?: number | null;
    /** Distance (local mm) of the signal. */
    signalMm?: number;
    /** One growth step (mm), for the "next" ghost outline. */
    growStepMm?: number;
    interactive?: boolean;
    onGrow?: (sector: number) => void;
    label?: string;
  } = $props();

  const CX = 170;
  const CY = 170;
  const RADIUS = 148;
  const SECTORS = 6;
  const TAU = Math.PI * 2;

  let geometry = $derived(generateNetwork(seed, stageIndex));
  let bandWidth = $derived(Math.max(1e-6, geometry.maxMm));
  let k = $derived(RADIUS / bandWidth);

  function wedgePath(index: number, radiusMm: number): string {
    const step = TAU / SECTORS;
    const a0 = index * step;
    const a1 = a0 + step;
    const r = Math.max(0, radiusMm);
    const x0 = Math.cos(a0) * r;
    const y0 = Math.sin(a0) * r;
    const x1 = Math.cos(a1) * r;
    const y1 = Math.sin(a1) * r;
    return `M 0 0 L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(
      2,
    )} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
  }

  function sectorCentreAngle(index: number): number {
    return ((index + 0.5) / SECTORS) * TAU;
  }

  let solid = $derived(
    geometry.segments.filter(
      (s) => s.endMm <= (depths[sectorIndexForAngle(Math.atan2(s.y2, s.x2))] ?? 0) + 1e-6,
    ),
  );

  let signal = $derived.by(() => {
    if (signalSector === null) return null;
    const a = sectorCentreAngle(signalSector);
    return { x: Math.cos(a) * signalMm, y: Math.sin(a) * signalMm };
  });

  function grow(sector: number) {
    if (!interactive) return;
    onGrow?.(sector);
  }
</script>

<svg class="board" viewBox="0 0 340 340" role="group" aria-label={label}>
  <g transform={`translate(${CX} ${CY})`}>
    {#each depths as radius, i (i)}
      <path class="territory" d={wedgePath(i, Math.max(0, radius) * k)} />
    {/each}

    {#each solid as s (s.id)}
      <line
        class="hypha"
        x1={s.x1 * k}
        y1={s.y1 * k}
        x2={s.x2 * k}
        y2={s.y2 * k}
        stroke-width={s.width}
      />
    {/each}

    {#if signal}
      <g class="signal" transform={`translate(${signal.x * k} ${signal.y * k})`}>
        <circle class="signal-ring" r="9" />
        <circle class="signal-dot" r="3" />
      </g>
    {/if}

    <circle class="spore" r="8" />
    <circle class="spore-core" r="3" />

    {#if interactive}
      {#each depths as _, i (i)}
        <path
          class="hit"
          d={wedgePath(i, bandWidth * k)}
          role="button"
          tabindex="0"
          aria-label={`Grow sector ${i + 1}`}
          onclick={() => grow(i)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') grow(i);
          }}
        />
      {/each}
    {/if}
  </g>
</svg>

<style>
  .board {
    display: block;
    width: 100%;
    height: auto;
  }

  .territory {
    fill: var(--primary);
    opacity: 0.07;
    transition: d var(--duration-normal) var(--ease-out-soft);
  }

  .hypha {
    stroke: var(--primary);
    stroke-linecap: round;
    opacity: 0.82;
  }

  .spore {
    fill: var(--surface-container-high);
    stroke: var(--primary);
    stroke-width: 2.6;
  }

  .spore-core {
    fill: var(--primary);
  }

  .signal-ring {
    fill: none;
    stroke: var(--secondary);
    stroke-width: 2;
    stroke-dasharray: 3 3;
    transform-box: fill-box;
    transform-origin: center;
    animation: signal-pulse 1.4s ease-in-out infinite;
  }

  .signal-dot {
    fill: var(--secondary);
  }

  @keyframes signal-pulse {
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
    fill: transparent;
    pointer-events: all;
    cursor: pointer;
  }

  .hit:focus-visible {
    fill: color-mix(in srgb, var(--primary) 12%, transparent);
    outline: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .signal-ring {
      animation: none;
    }
  }
</style>
