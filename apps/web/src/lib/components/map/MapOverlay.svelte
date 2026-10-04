<script lang="ts">
  import { untrack } from 'svelte';
  import {
    EXPANSION_MAP,
    HOSTS,
    REACH_SECTORS,
    SECTOR_LABELS,
    getStageForReach,
    getStageBandWidth,
    getStageGrowMm,
    formatReach,
    getStrain,
    resourceLabel,
  } from '@mycosurge/config';
  import {
    generateNetwork,
    generateHostPlacements,
    getHostVisibility,
    getFirstContact,
    getContactMarkers,
    sectorIndexForAngle,
  } from '@mycosurge/game-engine';
  import type { HostPlacement, ContactMarker } from '@mycosurge/game-engine';
  import { gameStore } from '$lib/stores/game.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { logStore } from '$lib/stores/log.svelte';

  let { onClose }: { onClose: () => void } = $props();

  /** Screen-space radius of the drawn colony core; hover/taps inside it are ignored. */
  const CORE_HIT_PX = 13;

  // The viewport is measured in CSS pixels (1 viewBox unit == 1px), so panning is
  // direct. The map always shows the network's current scale band, in band-local mm.
  let viewW = $state(1000);
  let viewH = $state(700);
  let cx = $derived(Math.max(1, viewW) / 2);
  let cy = $derived(Math.max(1, viewH) / 2);

  let gs = $derived(gameStore.state);
  /** Absolute reach (mm). */
  let reach = $derived(gameStore.reach);
  /** Absolute per-wedge depths (mm). */
  let depths = $derived(gameStore.sectorDepths);
  let seed = $derived(gameStore.networkSeed);
  let catalogued = $derived(new Set(gameStore.cataloguedHosts));

  // ── Scale band ──
  let stage = $derived(getStageForReach(reach));
  let stageIndex = $derived(stage.index);
  let bandWidth = $derived(getStageBandWidth(stage));
  let growStepMm = $derived(getStageGrowMm(stage));
  let ghostMm = $derived(bandWidth * EXPANSION_MAP.ghostFraction);
  let basePxPerMm = $derived(
    Math.max(1, Math.min(viewW, viewH) / 2 - 24) / Math.max(1e-6, bandWidth),
  );

  let geometry = $derived(generateNetwork(seed, stageIndex));
  let allPlacements = $derived(generateHostPlacements(seed));
  let placements = $derived(allPlacements.filter((p) => p.stage === stageIndex));
  let firstContact = $derived(getFirstContact(gs, allPlacements));
  let contactMarkers = $derived(
    getContactMarkers(gs.contacts, allPlacements).filter((m) => m.stage === stageIndex),
  );
  let adviceSector = $derived(gameStore.advisor.sector);

  /** Per-wedge depth clamped to the current band, in local mm. */
  let localDepths = $derived(depths.map((d) => Math.max(0, Math.min(bandWidth, d - stage.minMm))));

  // Desktop hover (fine pointer) and mobile select-then-grow both preview a wedge.
  let finePointer = $state(
    typeof window !== 'undefined' && (window.matchMedia?.('(pointer: fine)').matches ?? false),
  );
  let hoverSector = $state<number | null>(null);
  let selectedSector = $state<number | null>(null);
  let activeSector = $derived(hoverSector ?? selectedSector);
  let tipPos = $derived.by(() => {
    const s = activeSector;
    if (s === null) return null;
    const a = sectorCentreAngle(s);
    const r = Math.max(0, drawnDepths[s] ?? 0) + growStepMm + bandWidth * 0.02;
    const x = cx + panX + Math.cos(a) * r * k;
    const y = cy + panY + Math.sin(a) * r * k;
    return {
      x: Math.min(Math.max(x, 74), Math.max(74, viewW - 74)),
      y: Math.min(Math.max(y, 28), Math.max(28, viewH - 28)),
    };
  });
  let cordBranch = $derived(
    gameStore.cordBranchId ? Number(gameStore.cordBranchId.split('-')[1]) : -1,
  );

  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  /** Stage-cross "zoom out": the fresh band opens from this scale to 1. */
  let stageScale = $state(1);
  let k = $derived(basePxPerMm * zoom * stageScale);
  let inv = $derived(1 / k);

  let rings = $derived.by(() => {
    const count = EXPANSION_MAP.ringCount;
    const out: number[] = [];
    for (let i = 1; i <= count; i++) out.push((bandWidth * i) / count);
    return out;
  });

  // ── Reach easing (per wedge) ──
  let current: number[] = [];
  let drawnDepths = $state<number[]>([]);
  let firstRun = true;
  let raf = 0;

  $effect(() => {
    const target = localDepths;
    if (firstRun) {
      firstRun = false;
      current = target.slice();
      drawnDepths = target.slice();
      return;
    }
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      current = target.slice();
      drawnDepths = target.slice();
      return;
    }
    cancelAnimationFrame(raf);
    const from = current.slice();
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / EXPANSION_MAP.reachAnimMs);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = target.map((value, i) => from[i] + (value - from[i]) * eased);
      current = next;
      drawnDepths = next;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  // ── Stage-cross ceremony ──
  let prevStageIndex = untrack(() => stageIndex);
  let ceremonyLabel = $state<string | null>(null);
  let ceremonyRaf = 0;
  $effect(() => {
    const idx = stageIndex;
    const stageNow = stage;
    if (idx === prevStageIndex) return;
    const entering = idx > prevStageIndex;
    prevStageIndex = idx;
    ceremonyLabel = `${stageNow.name} · ${stageNow.unit}`;
    if (
      typeof window === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      stageScale = 1;
      return;
    }
    cancelAnimationFrame(ceremonyRaf);
    // Entering a wider band: start zoomed in, pull back. Going back: push in slightly.
    const from = entering ? 0.45 : 1.5;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / EXPANSION_MAP.stageAnimMs);
      const eased = 1 - Math.pow(1 - p, 3);
      stageScale = from + (1 - from) * eased;
      if (p < 1) {
        ceremonyRaf = requestAnimationFrame(tick);
      } else {
        stageScale = 1;
        ceremonyLabel = null;
      }
    };
    ceremonyRaf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ceremonyRaf);
  });

  function drawnDepthAt(angle: number): number {
    return drawnDepths[sectorIndexForAngle(angle)] ?? 0;
  }

  let solidSegments = $derived(
    geometry.segments.filter((s) => s.endMm <= drawnDepthAt(Math.atan2(s.y2, s.x2)) + 1e-6),
  );
  let ghostSegments = $derived(
    geometry.segments.filter((s) => {
      const depth = drawnDepthAt(Math.atan2(s.y2, s.x2));
      return s.endMm > depth && s.endMm <= depth + ghostMm;
    }),
  );

  /** SVG pie-slice path for one wedge out to `radiusMm`. */
  function wedgePath(index: number, radiusMm: number): string {
    const step = (Math.PI * 2) / sectorCount;
    const a0 = index * step;
    const a1 = a0 + step;
    const x0 = Math.cos(a0) * radiusMm;
    const y0 = Math.sin(a0) * radiusMm;
    const x1 = Math.cos(a1) * radiusMm;
    const y1 = Math.sin(a1) * radiusMm;
    return `M 0 0 L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${radiusMm.toFixed(2)} ${radiusMm.toFixed(
      2,
    )} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
  }

  const sectorCount = REACH_SECTORS;

  function wedgeAngle(index: number): number {
    return (index / sectorCount) * Math.PI * 2;
  }

  function sectorCentreAngle(index: number): number {
    return ((index + 0.5) / sectorCount) * Math.PI * 2;
  }

  // ── Pan / pinch-zoom ──
  const pointers = new Map<number, { x: number; y: number }>();
  let last = { x: 0, y: 0 };
  let pinchDist = 0;
  let pinchZoom = 1;
  let tapPointer: number | null = null;
  let tapStartX = 0;
  let tapStartY = 0;
  let tapMoved = false;

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
    if (pointers.size === 1) {
      last = { x: event.clientX, y: event.clientY };
      tapPointer = event.pointerId;
      tapStartX = event.clientX;
      tapStartY = event.clientY;
      tapMoved = false;
    } else {
      tapPointer = null;
    }
    if (pointers.size === 2) {
      pinchDist = pointerDistance();
      pinchZoom = zoom;
    }
  }

  function onMove(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) {
      updateHover(event);
      return;
    }
    hoverSector = null;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      panX += event.clientX - last.x;
      panY += event.clientY - last.y;
      last = { x: event.clientX, y: event.clientY };
      if (Math.hypot(event.clientX - tapStartX, event.clientY - tapStartY) > 8) tapMoved = true;
    } else if (pointers.size >= 2 && pinchDist > 0) {
      // Damped so a pinch feels less twitchy than raw distance ratio.
      zoom = clamp(pinchZoom * Math.pow(pointerDistance() / pinchDist, 0.55), 0.2, 3.5);
    }
  }

  function onUp(event: PointerEvent) {
    const wasTap = tapPointer === event.pointerId && !tapMoved;
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    const remaining = [...pointers.values()][0];
    if (remaining) last = { x: remaining.x, y: remaining.y };
    if (wasTap) growAtPointer(event);
    if (tapPointer === event.pointerId) tapPointer = null;
  }

  /** A tap on a wedge grows it; taps on the colony core are ignored. */
  function growAtPointer(event: PointerEvent) {
    const rect = (event.currentTarget as Element).getBoundingClientRect();
    const wx = (event.clientX - rect.left - (cx + panX)) / k;
    const wy = (event.clientY - rect.top - (cy + panY)) / k;
    if (Math.hypot(wx, wy) * k < CORE_HIT_PX) {
      selectedSector = null;
      return;
    }
    const sector = sectorIndexForAngle(Math.atan2(wy, wx));
    if (!finePointer) {
      // Touch: first tap previews the wedge, a second tap on it grows.
      if (selectedSector === sector) {
        selectedSector = null;
        gameStore.growSector(sector);
      } else {
        selectedSector = sector;
      }
      return;
    }
    gameStore.growSector(sector);
  }

  /** Highlight the wedge under a mouse cursor (desktop only). */
  function updateHover(event: PointerEvent) {
    if (!finePointer) return;
    const rect = (event.currentTarget as Element).getBoundingClientRect();
    const wx = (event.clientX - rect.left - (cx + panX)) / k;
    const wy = (event.clientY - rect.top - (cy + panY)) / k;
    if (Math.hypot(wx, wy) * k < CORE_HIT_PX) {
      hoverSector = null;
      return;
    }
    hoverSector = sectorIndexForAngle(Math.atan2(wy, wx));
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();
    zoom = clamp(zoom * (event.deltaY < 0 ? 1.05 : 0.952), 0.2, 3.5);
  }

  function fit() {
    // The base scale already fits one full stage band; Fit just recentres.
    zoom = 1;
    panX = 0;
    panY = 0;
  }

  // Fit once the viewport has been measured.
  let didFit = false;
  $effect(() => {
    if (!didFit && viewW > 0 && viewH > 0) {
      didFit = true;
      fit();
    }
  });

  function hostName(hostId: string): string {
    return HOSTS.find((h) => h.id === hostId)?.name ?? hostId;
  }

  function tapHost(placement: HostPlacement) {
    const vis = getHostVisibility(placement, depths, catalogued);
    if (vis === 'hidden') return;
    const depth = depths[sectorIndexForAngle(placement.angle)] ?? 0;
    if (vis === 'sensed' || placement.distanceMm > depth) {
      logStore.info('Something moves beyond the edge. Grow the network toward it.');
      return;
    }
    gameStore.engageHost(placement.hostId);
    uiStore.openCombat(placement.hostId);
  }

  function tapContact(marker: ContactMarker) {
    if (!marker.revealed) {
      gameStore.scanContact(marker.contactId);
      return;
    }
    if (gameStore.engageContact(marker.contactId)) {
      uiStore.openCombat(marker.hostId);
    } else {
      logStore.info('The network is not ready to engage.');
    }
  }

  function strainName(strainId: string): string {
    return getStrain(strainId).name;
  }

  const canExtend = $derived(gs.biomass >= gameStore.evenCost);
</script>

<div class="map-overlay" role="dialog" aria-modal="true" aria-label="Network map">
  <header class="map-bar">
    <button class="cmd-btn secondary bar-btn" onclick={onClose} aria-label="Back to Core">
      ← Back
    </button>
    <div class="map-title">
      <span class="text-label-caps">Network</span>
      <span class="text-data-mono map-sub">
        {stage.name} · {formatReach(reach).label}
        {#if gameStore.nextReachTier}
          · next stage at {formatReach(gameStore.nextReachTier.at).label}
        {:else}
          · apex reached
        {/if}
        {#if contactMarkers.length}
          · {contactMarkers.length} signal{contactMarkers.length === 1 ? '' : 's'}
        {/if}
        {#if adviceSector !== null}
          · wants {SECTOR_LABELS[adviceSector]}
        {/if}
      </span>
    </div>
    <div class="map-tools">
      <button
        class="cmd-btn extend-btn"
        disabled={!canExtend}
        onclick={() => gameStore.growEvenly()}
      >
        Grow evenly · {gameStore.evenCost}
        {resourceLabel('biomass')}
      </button>
      <button class="cmd-btn secondary bar-btn" onclick={fit} title="Fit network">Fit</button>
      <button
        class="cmd-btn secondary zoom-btn"
        aria-label="Zoom in"
        onclick={() => (zoom = clamp(zoom * 1.15, 0.2, 3.5))}>+</button
      >
      <button
        class="cmd-btn secondary zoom-btn"
        aria-label="Zoom out"
        onclick={() => (zoom = clamp(zoom / 1.15, 0.2, 3.5))}>−</button
      >
    </div>
  </header>

  <div class="map-stage">
    <svg
      class="map-svg"
      viewBox={`0 0 ${Math.max(1, viewW)} ${Math.max(1, viewH)}`}
      bind:clientWidth={viewW}
      bind:clientHeight={viewH}
      onpointerdown={onDown}
      onpointermove={onMove}
      onpointerup={onUp}
      onpointercancel={onUp}
      onpointerleave={() => (hoverSector = null)}
      onwheel={onWheel}
      role="group"
      aria-label="Expansion network"
    >
      <g transform={`translate(${cx + panX} ${cy + panY}) scale(${k})`}>
        {#each drawnDepths as radius, i (i)}
          <path
            d={wedgePath(i, Math.max(0, radius))}
            fill="var(--primary)"
            opacity={EXPANSION_MAP.territoryOpacity}
          />
        {/each}
        {#if activeSector !== null}
          {@const hoverDepth = Math.max(0, drawnDepths[activeSector] ?? 0)}
          <path d={wedgePath(activeSector, hoverDepth)} fill="var(--primary)" opacity="0.1" />
          <path
            d={wedgePath(activeSector, hoverDepth + growStepMm)}
            fill="none"
            stroke={gs.biomass >= gameStore.reachCost ? 'var(--primary)' : 'var(--warning)'}
            stroke-width={1.6 * inv}
            stroke-dasharray={`${4 * inv} ${3 * inv}`}
            opacity="0.6"
          />
        {/if}
        {#each drawnDepths as radius, i (i)}
          <line
            x1={0}
            y1={0}
            x2={Math.cos(wedgeAngle(i)) * Math.max(0, radius)}
            y2={Math.sin(wedgeAngle(i)) * Math.max(0, radius)}
            stroke="var(--outline-variant)"
            stroke-width={inv}
            opacity="0.25"
          />
        {/each}

        {#if adviceSector !== null}
          {@const highlightR = Math.max(0, drawnDepths[adviceSector] ?? 0) + 1.6}
          <path
            d={wedgePath(adviceSector, highlightR)}
            fill="none"
            stroke="var(--primary)"
            stroke-width={2 * inv}
            stroke-dasharray={`${5 * inv} ${4 * inv}`}
            opacity="0.85"
          />
          <text
            x={Math.cos(sectorCentreAngle(adviceSector)) * (highlightR + 2 * inv)}
            y={Math.sin(sectorCentreAngle(adviceSector)) * (highlightR + 2 * inv)}
            text-anchor="middle"
            fill="var(--primary)"
            font-family="var(--font-mono)"
            font-size={10 * inv}
          >
            grow {SECTOR_LABELS[adviceSector]}
          </text>
        {/if}

        {#each rings as mm (mm)}
          <circle
            r={mm}
            fill="none"
            stroke="var(--outline-variant)"
            stroke-width={inv}
            stroke-dasharray={`${4 * inv} ${6 * inv}`}
            opacity="0.4"
          />
          <text
            x={0}
            y={-mm - 3 * inv}
            text-anchor="middle"
            fill="var(--on-surface-variant)"
            font-family="var(--font-mono)"
            font-size={10 * inv}
          >
            {formatReach(stage.minMm + mm).label}
          </text>
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

        {#each gameStore.nodeMarkers as node (node.id)}
          {@const a = sectorCentreAngle(node.sector)}
          {@const nx = Math.cos(a) * node.depthMm}
          {@const ny = Math.sin(a) * node.depthMm}
          {@const s = 4 * inv}
          <path
            d={`M ${nx} ${ny - s} L ${nx + s} ${ny} L ${nx} ${ny + s} L ${nx - s} ${ny} Z`}
            fill={node.claimed ? 'var(--primary)' : 'transparent'}
            stroke={node.claimed ? 'var(--primary)' : 'var(--warning)'}
            stroke-width={1.4 * inv}
            opacity={node.claimed ? 0.9 : 0.7}
          />
        {/each}
      </g>

      <!-- Markers live in a screen-space group (no zoom scale) so their geometry stays
           in screen pixels — no inverse-scaled coordinates to blow up in tooling. -->
      <g transform={`translate(${cx + panX} ${cy + panY})`}>
        {#each placements as p (p.id)}
          {@const vis = getHostVisibility(p, depths, catalogued)}
          {#if vis !== 'hidden'}
            {@const isFirst = firstContact?.hostId === p.hostId}
            {@const r = p.isBoss ? 9 : vis === 'sensed' ? 4.5 : 6}
            <line
              x1={0}
              y1={0}
              x2={p.x * k}
              y2={p.y * k}
              stroke={vis === 'sensed' ? 'var(--secondary)' : 'var(--outline-variant)'}
              stroke-width={1}
              opacity={vis === 'sensed' ? 0.35 : 0.18}
              stroke-dasharray={vis === 'sensed' ? '2 4' : 'none'}
            />
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
              <!-- Markers are in a screen-space group; position by px, radius in px. -->
              <g transform={`translate(${p.x * k} ${p.y * k})`}>
                <circle r={22} fill="transparent" />
                <circle
                  class="host-marker"
                  {r}
                  fill={vis === 'sensed'
                    ? 'transparent'
                    : vis === 'catalogued'
                      ? 'var(--primary)'
                      : 'var(--alert)'}
                  stroke={vis === 'sensed' ? 'var(--secondary)' : 'var(--on-surface)'}
                  stroke-width={1.6}
                  stroke-dasharray={vis === 'sensed' ? '3 3' : 'none'}
                />
                {#if p.isBoss}
                  <circle
                    r={r + 3}
                    fill="none"
                    stroke="var(--alert)"
                    stroke-width={1}
                    opacity="0.7"
                  />
                {/if}
                {#if vis !== 'sensed'}
                  <text
                    y={-r - 4}
                    text-anchor="middle"
                    fill="var(--on-surface)"
                    font-family="var(--font-mono)"
                    font-size={10}
                  >
                    {hostName(p.hostId)}
                  </text>
                {/if}
              </g>
            </g>
          {/if}
        {/each}

        {#each contactMarkers as m (m.contactId)}
          {@const remaining =
            m.totalTime > 0 ? Math.max(0, Math.min(1, m.timeRemaining / m.totalTime)) : 0}
          <g
            class="contact"
            class:revealed={m.revealed}
            role="button"
            tabindex="0"
            aria-label={m.revealed ? `${hostName(m.hostId)} signal` : 'Unidentified signal'}
            onpointerdown={(e) => e.stopPropagation()}
            onclick={() => tapContact(m)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') tapContact(m);
            }}
          >
            <!-- Screen-space marker: position by px, radius in px. -->
            <g transform={`translate(${m.x * k} ${m.y * k})`}>
              <circle r={22} fill="transparent" />
              <circle
                r={10}
                fill="none"
                stroke="var(--warning)"
                stroke-width={1.5}
                opacity="0.5"
                stroke-dasharray={`${remaining * 62.83} ${(1 - remaining) * 62.83}`}
                transform="rotate(-90)"
              />
              <circle
                class="contact-ring"
                r={7}
                fill="none"
                stroke={m.revealed ? 'var(--warning)' : 'var(--secondary)'}
                stroke-width={2}
                stroke-dasharray={m.revealed ? 'none' : '3 2'}
                class:pulse={!m.revealed}
              />
              <circle r={2.6} fill={m.revealed ? 'var(--warning)' : 'var(--secondary)'} />
              {#if m.revealed}
                <text
                  y={-13}
                  text-anchor="middle"
                  fill="var(--on-surface)"
                  font-family="var(--font-mono)"
                  font-size={9}
                >
                  {hostName(m.hostId)}{m.strainId !== 'normal'
                    ? ` · ${strainName(m.strainId)}`
                    : ''}
                </text>
              {/if}
            </g>
          </g>
        {/each}
      </g>
    </svg>

    {#if ceremonyLabel}
      <div class="stage-ceremony" aria-live="polite">
        <span class="stage-ceremony-kicker text-label-caps">Scale shift</span>
        <span class="stage-ceremony-name">{ceremonyLabel}</span>
      </div>
    {/if}

    <p class="map-legend text-label-caps">
      {finePointer
        ? 'Hover a wedge for its cost · click to grow · tap signals to engage'
        : 'Tap a wedge to preview, tap again to grow · tap signals to engage'}
    </p>

    {#if activeSector !== null && tipPos}
      <div class="sector-tip" style="left: {tipPos.x}px; top: {tipPos.y}px;">
        <span class="tip-dir">
          {SECTOR_LABELS[activeSector]} · {formatReach(
            stage.minMm + (drawnDepths[activeSector] ?? 0),
          ).label}
        </span>
        <span class="tip-cost">{gameStore.reachCost} {resourceLabel('biomass')}</span>
        <span class="tip-sub">
          {gs.biomass >= gameStore.reachCost
            ? finePointer
              ? 'Click to grow here'
              : 'Tap again to grow here'
            : 'Not enough Biomass'}
        </span>
      </div>
    {/if}
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
    position: relative;
  }

  .map-svg {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    background: radial-gradient(
      circle at center,
      transparent 45%,
      var(--surface-container-low) 100%
    );
  }

  .host {
    cursor: pointer;
  }

  .contact {
    cursor: pointer;
  }

  .contact .pulse {
    animation: contact-pulse 1.1s ease-in-out infinite;
  }

  @keyframes contact-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }

  .map-legend {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 10px;
    margin: 0;
    text-align: center;
    color: var(--on-surface-variant);
    font-size: 10px;
    pointer-events: none;
  }

  .stage-ceremony {
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 16px;
    border: 1px solid var(--primary);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--surface-container-highest) 92%, transparent);
    box-shadow: var(--shadow-sm);
    pointer-events: none;
    animation: ceremony-in 0.35s ease-out;
  }

  .stage-ceremony-kicker {
    color: var(--secondary);
    font-size: 10px;
  }

  .stage-ceremony-name {
    color: var(--primary);
    font-size: 14px;
  }

  @keyframes ceremony-in {
    from {
      opacity: 0;
      transform: translate(-50%, -6px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .stage-ceremony {
      animation: none;
    }
  }

  .sector-tip {
    position: absolute;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--surface-container-highest) 94%, transparent);
    box-shadow: var(--shadow-sm);
    white-space: nowrap;
    pointer-events: none;
    transform: translate(-50%, 8px);
  }

  .tip-dir {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--on-surface);
  }

  .tip-cost {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--primary);
  }

  .tip-sub {
    font-size: 10px;
    color: var(--on-surface-variant);
  }

  /* The UA focus box on an SVG marker renders as a big rectangle around its
     bounding box (which includes the label). Suppress it and draw a tidy ring. */
  .host:focus,
  .host:focus-visible,
  .contact:focus,
  .contact:focus-visible {
    outline: none;
  }

  .host:focus-visible .host-marker {
    stroke: var(--primary);
    stroke-width: 3px;
  }

  .contact:focus-visible .contact-ring {
    stroke: var(--primary);
    stroke-width: 3px;
  }

  .host.first .host-marker {
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
    .host.first .host-marker {
      animation: none;
    }

    .contact .pulse {
      animation: none;
    }
  }
</style>
