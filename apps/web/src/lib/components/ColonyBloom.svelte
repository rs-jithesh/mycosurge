<script lang="ts">
  import { generateNetwork } from '@mycosurge/game-engine';

  /**
   * The organism, drawn from the **same seeded geometry as the expansion map** so the
   * tutorial's network and the full-game map are visibly the same thing — the map is just
   * a zoomed-in view of these hyphae. No direction choice here: growth is undirected until
   * the map introduces wedges.
   *
   * `reach` is the tutorial's absolute network reach (0 → `REACH_START`, 5 mm). Stage 1's
   * geometry spans exactly that range, so the bloom fills its band as the player extends.
   */
  let {
    seed = 1,
    reach = 0,
    sensed = false,
    burstToken = 0,
  }: {
    seed?: number;
    /** Tutorial network reach in mm (0 → 5). */
    reach?: number;
    sensed?: boolean;
    burstToken?: number;
  } = $props();

  const CX = 100;
  const CY = 100;
  /** Screen radius the band is fitted into. */
  const RADIUS = 86;

  // Stage 1 geometry spans the tutorial's whole range (0 → 5 mm), so 1 mm of reach is a
  // proportional slice of the same hyphae the map will draw.
  let geometry = $derived(generateNetwork(seed, 1));
  let maxMm = $derived(Math.max(1e-6, geometry.maxMm));
  let localReach = $derived(Math.max(0, Math.min(maxMm, reach)));
  let k = $derived(RADIUS / maxMm);

  let solid = $derived(geometry.segments.filter((s) => s.endMm <= localReach + 1e-6));

  /** A few travelling lights on the longest hyphae. */
  let pulses = $derived([...solid].sort((a, b) => b.endMm - a.endMm).slice(0, 6));

  let territoryR = $derived(localReach * k);

  let blip = $derived.by(() => {
    if (solid.length === 0) return { x: CX, y: CY - RADIUS };
    const tip = solid.reduce((best, s) => (s.endMm > best.endMm ? s : best), solid[0]);
    return { x: CX + tip.x2 * k, y: CY + tip.y2 * k };
  });
</script>

<svg class="bloom" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
  <circle class="territory" cx={CX} cy={CY} r={territoryR} />
  <circle class="halo" cx={CX} cy={CY} r={territoryR + 6} />

  {#each solid as s (s.id)}
    <line
      class="hypha"
      x1={CX + s.x1 * k}
      y1={CY + s.y1 * k}
      x2={CX + s.x2 * k}
      y2={CY + s.y2 * k}
      stroke-width={s.width}
    />
  {/each}

  {#each pulses as s, i (s.id)}
    <line
      class="hypha-pulse"
      x1={CX + s.x1 * k}
      y1={CY + s.y1 * k}
      x2={CX + s.x2 * k}
      y2={CY + s.y2 * k}
      pathLength="1"
      style="animation-delay: {i * 0.35}s"
    />
  {/each}

  {#if sensed}
    <g class="blip" transform={`translate(${blip.x} ${blip.y})`}>
      <circle class="blip-ring" r="6" />
      <circle class="blip-dot" r="2" />
    </g>
  {/if}

  <circle class="spore" cx={CX} cy={CY} r="7" />
  <circle class="spore-core" cx={CX} cy={CY} r="3" />

  {#key burstToken}
    {#if burstToken > 0}
      <circle class="burst" cx={CX} cy={CY} r="9" />
    {/if}
  {/key}
</svg>

<style>
  .bloom {
    display: block;
    width: 100%;
    max-width: 200px;
    height: auto;
    margin: 0 auto;
    overflow: visible;
  }

  .territory {
    fill: var(--primary);
    opacity: 0.06;
    transition: r var(--duration-normal) var(--ease-out-soft);
  }

  .halo {
    fill: var(--primary);
    opacity: 0.04;
  }

  .hypha {
    stroke: var(--primary);
    stroke-linecap: round;
    opacity: 0.82;
  }

  /* A short bright dash that slides from the spore out to the tip. */
  .hypha-pulse {
    stroke: var(--secondary);
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-dasharray: 0.06 0.94;
    stroke-dashoffset: 1;
    opacity: 0.9;
    animation: pulse-travel 2.8s linear infinite;
  }

  @keyframes pulse-travel {
    from {
      stroke-dashoffset: 1;
    }
    to {
      stroke-dashoffset: -0.06;
    }
  }

  .spore {
    fill: var(--surface-container-high);
    stroke: var(--primary);
    stroke-width: 2.6;
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
    animation: blip-pulse 1.4s ease-in-out infinite;
  }

  .blip-dot {
    fill: var(--secondary);
  }

  @keyframes blip-pulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.35;
      transform: scale(1.35);
    }
  }

  .burst {
    fill: none;
    stroke: var(--primary);
    stroke-width: 3;
    transform-box: fill-box;
    transform-origin: center;
    animation: burst-out 620ms var(--ease-out-soft);
  }

  @keyframes burst-out {
    0% {
      opacity: 0.9;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(4.5);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hypha-pulse,
    .burst {
      display: none;
    }

    .blip-ring {
      animation: none;
    }
  }
</style>
