<script lang="ts">
  import { EXPANSION_MAP, HOSTS, resourceLabel } from '@mycosurge/config';
  import {
    generateNetwork,
    generateHostPlacements,
    getHostVisibility,
    getFirstContact,
  } from '@mycosurge/game-engine';
  import type { HostPlacement } from '@mycosurge/game-engine';
  import { gameStore } from '$lib/stores/game.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { logStore } from '$lib/stores/log.svelte';

  let { onClose }: { onClose: () => void } = $props();

  const VIEW = 1000;
  const CENTER = VIEW / 2;
  const BASE_PX_PER_MM = CENTER / EXPANSION_MAP.baseViewMm;
  const MAJOR_MM = EXPANSION_MAP.ringStepMm * EXPANSION_MAP.majorRingEvery;

  let gs = $derived(gameStore.state);
  let reach = $derived(gameStore.reach);
  let seed = $derived(gameStore.networkSeed);
  let geometry = $derived(generateNetwork(seed));
  let placements = $derived(generateHostPlacements(seed));
  let catalogued = $derived(new Set(gameStore.cataloguedHosts));
  let firstContact = $derived(getFirstContact(gs, placements));
  let cordBranch = $derived(
    gameStore.cordBranchId ? Number(gameStore.cordBranchId.split('-')[1]) : -1,
  );

  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let k = $derived(BASE_PX_PER_MM * zoom);
  let inv = $derived(1 / k);

  let ringMax = $derived(
    Math.max(
      10,
      Math.ceil((reach + EXPANSION_MAP.senseRangeMm) / EXPANSION_MAP.ringStepMm) *
        EXPANSION_MAP.ringStepMm,
    ),
  );
  let rings = $derived.by(() => {
    const out: number[] = [];
    for (let mm = EXPANSION_MAP.ringStepMm; mm <= ringMax + 1e-6; mm += EXPANSION_MAP.ringStepMm) {
      out.push(Number(mm.toFixed(2)));
    }
    return out;
  });

  // ── Reach easing ──
  let current = 0;
  let drawnReach = $state(0);
  let firstRun = true;
  let raf = 0;

  $effect(() => {
    const target = reach;
    if (firstRun) {
      firstRun = false;
      current = target;
      drawnReach = target;
      return;
    }
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      current = target;
      drawnReach = target;
      return;
    }
    cancelAnimationFrame(raf);
    const from = current;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / EXPANSION_MAP.reachAnimMs);
      const eased = 1 - Math.pow(1 - p, 3);
      current = from + (target - from) * eased;
      drawnReach = current;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  let solidSegments = $derived(geometry.segments.filter((s) => s.endMm <= drawnReach + 1e-6));
  let ghostSegments = $derived(
    geometry.segments.filter(
      (s) => s.endMm > drawnReach && s.endMm <= drawnReach + EXPANSION_MAP.ghostMm,
    ),
  );

  // ── Pan / pinch-zoom ──
  let svgEl: SVGSVGElement | undefined;
  const pointers = new Map<number, { x: number; y: number }>();
  let last = { x: 0, y: 0 };
  let pinchDist = 0;
  let pinchZoom = 1;

  function clamp(v: number, min: number, max: number): number {
    return v < min ? min : v > max ? max : v;
  }

  function pointerDistance(): number {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function onDown(event: PointerEvent) {
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) last = { x: event.clientX, y: event.clientY };
    if (pointers.size === 2) {
      pinchDist = pointerDistance();
      pinchZoom = zoom;
    }
  }

  function onMove(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      const rect = svgEl?.getBoundingClientRect();
      const scale = rect && rect.width > 0 ? VIEW / rect.width : 1;
      panX += (event.clientX - last.x) * scale;
      panY += (event.clientY - last.y) * scale;
      last = { x: event.clientX, y: event.clientY };
    } else if (pointers.size >= 2 && pinchDist > 0) {
      zoom = clamp(pinchZoom * (pointerDistance() / pinchDist), 0.15, 4);
    }
  }

  function onUp(event: PointerEvent) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    const remaining = [...pointers.values()][0];
    if (remaining) last = { x: remaining.x, y: remaining.y };
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();
    zoom = clamp(zoom * (event.deltaY < 0 ? 1.12 : 0.89), 0.15, 4);
  }

  function fit() {
    const viewMm = Math.max(EXPANSION_MAP.baseViewMm, reach + EXPANSION_MAP.senseRangeMm + 1);
    zoom = clamp(CENTER - 40 > 0 ? (CENTER - 40) / viewMm / BASE_PX_PER_MM : 1, 0.15, 4);
    panX = 0;
    panY = 0;
  }

  function hostName(hostId: string): string {
    return HOSTS.find((h) => h.id === hostId)?.name ?? hostId;
  }

  function tapHost(placement: HostPlacement) {
    const vis = getHostVisibility(placement, reach, catalogued);
    if (vis === 'hidden') return;
    if (vis === 'sensed' || placement.distanceMm > reach) {
      logStore.info('Something moves beyond the edge. Extend the network to identify it.');
      return;
    }
    gameStore.engageHost(placement.hostId);
    uiStore.openCombat(placement.hostId);
  }

  const canExtend = $derived(gs.biomass >= gameStore.reachCost);
</script>

<div class="map-overlay" role="dialog" aria-modal="true" aria-label="Network map">
  <header class="map-bar">
    <button class="cmd-btn secondary bar-btn" onclick={onClose} aria-label="Back to Core">
      ← Back
    </button>
    <div class="map-title">
      <span class="text-label-caps">Network</span>
      <span class="text-data-mono map-sub">
        {Math.floor(reach)} mm
        {#if gameStore.nextReachTier}
          · tier {gameStore.nextReachTier.tier} at {gameStore.nextReachTier.at} mm
        {:else}
          · all tiers open
        {/if}
      </span>
    </div>
    <div class="map-tools">
      <button
        class="cmd-btn extend-btn"
        disabled={!canExtend}
        onclick={() => gameStore.extendReach()}
      >
        +1 mm · {gameStore.reachCost}
        {resourceLabel('biomass')}
      </button>
      <button class="cmd-btn secondary bar-btn" onclick={fit} title="Fit network">Fit</button>
      <button
        class="cmd-btn secondary zoom-btn"
        aria-label="Zoom in"
        onclick={() => (zoom = clamp(zoom * 1.2, 0.15, 4))}>+</button
      >
      <button
        class="cmd-btn secondary zoom-btn"
        aria-label="Zoom out"
        onclick={() => (zoom = clamp(zoom / 1.2, 0.15, 4))}>−</button
      >
    </div>
  </header>

  <div class="map-stage">
    <svg
      class="map-svg"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      bind:this={svgEl}
      onpointerdown={onDown}
      onpointermove={onMove}
      onpointerup={onUp}
      onpointercancel={onUp}
      onwheel={onWheel}
      role="group"
      aria-label="Expansion network"
    >
      <g transform={`translate(${CENTER + panX} ${CENTER + panY}) scale(${k})`}>
        <circle
          r={Math.max(0, drawnReach)}
          fill="var(--primary)"
          opacity={EXPANSION_MAP.territoryOpacity}
        />

        {#each rings as mm (mm)}
          {@const major = Math.abs(mm % MAJOR_MM) < 1e-6}
          <circle
            r={mm}
            fill="none"
            stroke="var(--outline-variant)"
            stroke-width={inv}
            stroke-dasharray={major ? 'none' : `${4 * inv} ${6 * inv}`}
            opacity={major ? 0.5 : 0.28}
          />
          {#if major}
            <text
              x={0}
              y={-mm - 3 * inv}
              text-anchor="middle"
              fill="var(--on-surface-variant)"
              font-family="var(--font-mono)"
              font-size={10 * inv}
            >
              {Math.round(mm)} mm
            </text>
          {/if}
        {/each}

        {#each ghostSegments as s (s.id)}
          <line
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            stroke="var(--primary)"
            stroke-width={Math.max(0.6, s.width * 0.5) * inv}
            stroke-dasharray={`${2 * inv} ${3 * inv}`}
            opacity="0.35"
            stroke-linecap="round"
          />
        {/each}

        {#each solidSegments as s (s.id)}
          <line
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            stroke={s.branch === cordBranch ? 'var(--cord)' : 'var(--primary)'}
            stroke-width={(s.branch === cordBranch ? s.width * 2.2 : s.width) * inv}
            opacity={s.branch === cordBranch ? 1 : 0.85}
            stroke-linecap="round"
          />
        {/each}

        <circle
          r={10 * inv}
          fill="var(--surface-container-high)"
          stroke="var(--primary)"
          stroke-width={2 * inv}
        />
        <circle r={4 * inv} fill="var(--primary)" />

        {#each placements as p (p.id)}
          {@const vis = getHostVisibility(p, reach, catalogued)}
          {#if vis !== 'hidden'}
            {@const isFirst = firstContact?.hostId === p.hostId}
            {@const r = (p.isBoss ? 9 : vis === 'sensed' ? 4.5 : 6) * inv}
            <g
              class="host"
              class:first={isFirst}
              role="button"
              tabindex="0"
              aria-label={vis === 'sensed' ? 'Unidentified movement' : hostName(p.hostId)}
              onpointerdown={(e) => e.stopPropagation()}
              onclick={() => tapHost(p)}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') tapHost(p);
              }}
            >
              <circle cx={p.x} cy={p.y} r={22 * inv} fill="transparent" />
              <circle
                cx={p.x}
                cy={p.y}
                {r}
                fill={vis === 'sensed'
                  ? 'transparent'
                  : vis === 'catalogued'
                    ? 'var(--primary)'
                    : 'var(--alert)'}
                stroke={vis === 'sensed' ? 'var(--secondary)' : 'var(--on-surface)'}
                stroke-width={1.6 * inv}
                stroke-dasharray={vis === 'sensed' ? `${3 * inv} ${3 * inv}` : 'none'}
              />
              {#if p.isBoss}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r + 3 * inv}
                  fill="none"
                  stroke="var(--alert)"
                  stroke-width={inv}
                  opacity="0.7"
                />
              {/if}
              {#if vis !== 'sensed'}
                <text
                  x={p.x}
                  y={p.y - r - 4 * inv}
                  text-anchor="middle"
                  fill="var(--on-surface)"
                  font-family="var(--font-mono)"
                  font-size={10 * inv}
                >
                  {hostName(p.hostId)}
                </text>
              {/if}
            </g>
          {/if}
        {/each}
      </g>
    </svg>
  </div>
</div>

<style>
  .map-overlay {
    --cord: color-mix(in srgb, var(--primary) 55%, #0d1512);
    position: fixed;
    inset: 0;
    z-index: 160;
    display: flex;
    flex-direction: column;
    background: var(--background);
  }

  .map-bar {
    display: flex;
    align-items: center;
    gap: var(--space-gutter);
    flex-shrink: 0;
    padding: var(--space-unit) var(--space-margin);
    border-bottom: 1px solid var(--border);
    background: var(--surface-container-low);
  }

  .map-title {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    flex: 1;
  }

  .map-sub {
    color: var(--secondary);
    font-size: 12px;
  }

  .map-tools {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .bar-btn,
  .zoom-btn {
    padding: 4px 10px;
    font-size: 12px;
  }

  .zoom-btn {
    min-width: 34px;
  }

  .extend-btn {
    padding: 5px 12px;
    font-size: 12px;
  }

  .map-stage {
    flex: 1;
    min-height: 0;
    display: grid;
    place-items: center;
    padding: 8px;
  }

  .map-svg {
    width: min(100%, 92vh);
    height: min(100%, 92vh);
    aspect-ratio: 1;
    touch-action: none;
    user-select: none;
    background: radial-gradient(
      circle at center,
      transparent 55%,
      var(--surface-container-low) 100%
    );
  }

  .host {
    cursor: pointer;
  }

  .host:focus-visible {
    outline: none;
  }

  .host:focus-visible circle:nth-child(2) {
    stroke: var(--primary);
    stroke-width: 3px;
  }

  .host.first circle:nth-child(2) {
    animation: host-pulse 1.4s ease-in-out infinite;
  }

  @keyframes host-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .host.first circle:nth-child(2) {
      animation: none;
    }
  }
</style>
