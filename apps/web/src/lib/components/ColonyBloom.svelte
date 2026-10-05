<script lang="ts">
  /**
   * The organism, drawn small and undirected: a central spore with a handful of hyphae
   * that unfurl as the network grows. No wedges or sectors — direction is a later unlock.
   * A faint blip can pulse at the frontier (the first "something is out there" moment),
   * and `burstToken` fires a ring when something is bought or grown.
   */
  let {
    reach = 0,
    maxReach = 5,
    sensed = false,
    burstToken = 0,
    interactive = false,
    onActivate,
  }: {
    reach?: number;
    maxReach?: number;
    sensed?: boolean;
    burstToken?: number;
    /** Make the organism a tap target (e.g. tap to gather). */
    interactive?: boolean;
    onActivate?: () => void;
  } = $props();

  const CX = 100;
  const CY = 100;

  /** Main hyphae: angle (degrees) and how far the curve bows sideways. */
  const HYPHAE = [
    { angle: -90, curve: 0.22 },
    { angle: -18, curve: -0.24 },
    { angle: 54, curve: 0.2 },
    { angle: 126, curve: -0.2 },
    { angle: 198, curve: 0.26 },
  ] as const;

  function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function point(angleDeg: number, dist: number) {
    const a = (angleDeg * Math.PI) / 180;
    return { x: CX + Math.cos(a) * dist, y: CY + Math.sin(a) * dist };
  }

  function hyphaPath(angle: number, curve: number, len: number): string {
    const a = (angle * Math.PI) / 180;
    const perp = a + Math.PI / 2;
    const mx = CX + Math.cos(a) * (len * 0.5) + Math.cos(perp) * curve * len;
    const my = CY + Math.sin(a) * (len * 0.5) + Math.sin(perp) * curve * len;
    const end = point(angle, len);
    return `M ${CX} ${CY} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  }

  /** A side branch sprouting from 55% along a hypha, heading off at ±45°. */
  function branchPath(angle: number, curve: number, len: number, side: number, growth: number) {
    const a = (angle * Math.PI) / 180;
    const perp = a + Math.PI / 2;
    const f = 0.55;
    const ctrlX = CX + Math.cos(a) * (len * 0.5) + Math.cos(perp) * curve * len;
    const ctrlY = CY + Math.sin(a) * (len * 0.5) + Math.sin(perp) * curve * len;
    const end = point(angle, len);
    const bx = (1 - f) ** 2 * CX + 2 * (1 - f) * f * ctrlX + f ** 2 * end.x;
    const by = (1 - f) ** 2 * CY + 2 * (1 - f) * f * ctrlY + f ** 2 * end.y;
    const ba = a + side * (Math.PI / 4);
    const blen = len * 0.34 * growth;
    const ex = bx + Math.cos(ba) * blen;
    const ey = by + Math.sin(ba) * blen;
    const c2x = bx + Math.cos(ba) * blen * 0.5 + Math.cos(ba + Math.PI / 2) * side * blen * 0.25;
    const c2y = by + Math.sin(ba) * blen * 0.5 + Math.sin(ba + Math.PI / 2) * side * blen * 0.25;
    return `M ${bx.toFixed(1)} ${by.toFixed(1)} Q ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  }

  let t = $derived(clamp(reach / Math.max(1, maxReach), 0, 1));
  /** Ease-out so the first extensions read as large, satisfying steps. */
  let eased = $derived(1 - (1 - t) * (1 - t));
  let length = $derived(12 + 60 * eased);
  let haloRadius = $derived(length + 8);

  let hyphae = $derived(
    HYPHAE.map((h, i) => ({
      id: i,
      d: hyphaPath(h.angle, h.curve, length),
    })),
  );

  let branches = $derived.by(() => {
    if (t < 0.4) return [];
    const growth = clamp((t - 0.4) / 0.6, 0, 1);
    return HYPHAE.map((h, i) => ({
      id: i,
      d: branchPath(h.angle, h.curve, length, i % 2 === 0 ? 1 : -1, growth),
    }));
  });

  let blip = $derived(point(HYPHAE[0].angle, length + 13));
</script>

{#snippet bloom()}
  <svg class="bloom" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
    <circle class="halo" cx={CX} cy={CY} r={haloRadius} />

    {#each branches as b (b.id)}
      <path class="hypha branch" d={b.d} pathLength="1" />
    {/each}

    {#each hyphae as h (h.id)}
      <path class="hypha" d={h.d} pathLength="1" />
      <path class="hypha-pulse" d={h.d} pathLength="1" style="animation-delay: {h.id * 0.5}s" />
    {/each}

    {#if sensed}
      <g class="blip" transform={`translate(${blip.x} ${blip.y})`}>
        <circle class="blip-ring" r="6" />
        <circle class="blip-dot" r="2" />
      </g>
    {/if}

    <circle class="spore" cx={CX} cy={CY} r="9" />
    <circle class="spore-core" cx={CX} cy={CY} r="4" />

    {#key burstToken}
      {#if burstToken > 0}
        <circle class="burst" cx={CX} cy={CY} r="10" />
      {/if}
    {/key}
  </svg>
{/snippet}

{#if interactive}
  <button
    type="button"
    class="bloom-tap"
    aria-label="Absorb water and nutrients"
    onclick={onActivate}
  >
    {@render bloom()}
  </button>
{:else}
  {@render bloom()}
{/if}

<style>
  .bloom {
    display: block;
    width: 100%;
    max-width: 200px;
    height: auto;
    margin: 0 auto;
    overflow: visible;
  }

  .bloom-tap {
    display: block;
    width: 100%;
    margin: 0;
    padding: 0;
    background: none;
    border: none;
    border-radius: var(--radius-pill);
    cursor: pointer;
    transition: transform 120ms var(--ease-out-soft);
  }

  .bloom-tap:active {
    transform: scale(0.98);
  }

  .bloom-tap:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 4px;
  }

  .halo {
    fill: var(--primary);
    opacity: 0.06;
    transition: r var(--duration-normal) var(--ease-out-soft);
  }

  .hypha {
    fill: none;
    stroke: var(--primary);
    stroke-width: 3.4;
    stroke-linecap: round;
    opacity: 0.78;
    transition: d var(--duration-normal) var(--ease-out-soft);
  }

  .hypha.branch {
    stroke-width: 2.2;
    opacity: 0.6;
  }

  /* A short bright dash that slides from the spore out to the tip. */
  .hypha-pulse {
    fill: none;
    stroke: var(--secondary);
    stroke-width: 3.8;
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
    stroke-width: 3;
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
