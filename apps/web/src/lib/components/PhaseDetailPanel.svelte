<script lang="ts">
  import { type CapResource, type GrowthPhase } from '@mycosurge/game-engine';
  import {
    GENERATORS,
    getGeneratorCost,
    LYSATE_CAP_EXPAND_AMOUNT,
    resourceLabel,
  } from '@mycosurge/config';
  import { gameStore } from '$lib/stores/game.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { phaseMeta } from '$lib/content/phases';
  import ResourceIcon from './ResourceIcon.svelte';
  import ResourceSymbol from './ResourceSymbol.svelte';
  import HuntSection from '$lib/components/hunt/HuntSection.svelte';
  import PhaseAction from './core/PhaseAction.svelte';

  let {
    phase,
    variant = 'full',
  }: {
    phase: GrowthPhase;
    /** `mobile` drops the header and the primary action (the mode hero owns both). */
    variant?: 'full' | 'mobile';
  } = $props();

  let meta = $derived(phaseMeta(phase));
  let gs = $derived(gameStore.state);
  let isMobile = $derived(variant === 'mobile');
  let echoOverride = $state<boolean | null>(null);
  let echoesOpen = $derived(echoOverride ?? !isMobile);

  let activeGenerators = $derived(GENERATORS.filter((g) => (gs.generators[g.id] ?? 0) > 0).length);

  let echoes = $derived(gameStore.acquiredEchoes);

  let capRows = $derived([
    {
      resource: 'water' as const,
      label: resourceLabel('water'),
      cap: gs.waterCap,
      tone: 'cyan' as const,
    },
    {
      resource: 'nutrients' as const,
      label: resourceLabel('nutrients'),
      cap: gs.nutrientsCap,
      tone: 'violet' as const,
    },
    {
      resource: 'biomass' as const,
      label: resourceLabel('biomass'),
      cap: gameStore.maxBiomass,
      tone: 'amber' as const,
    },
  ]);

  function capCost(resource: CapResource): number {
    return gameStore.capExpandCost(resource);
  }

  function canExpand(resource: CapResource): boolean {
    return gs.lysateBanked >= capCost(resource);
  }

  function affordTime(cost: number): string {
    const missing = cost - gameStore.biomass;
    const rate = gameStore.biomassPerSec;
    if (missing <= 0 || rate <= 0) return '';
    return `~${Math.ceil(missing / rate)}s`;
  }
</script>

<div class="detail-panel" class:is-mobile={isMobile} data-tone={meta.tone}>
  {#if !isMobile}
    <header class="panel-head">
      <div class="head-left">
        <span class="head-icon" aria-hidden="true"
          ><ResourceIcon name={phase} size={34} round /></span
        >
        <div class="head-text">
          <h2 class="head-title">{meta.label}</h2>
          <p class="head-tagline">{meta.tagline}</p>
        </div>
      </div>
    </header>
  {/if}

  <div class="panel-body">
    {#if phase === 'gather'}
      <!-- ── GATHER ── -->
      {#if !isMobile}
        <PhaseAction phase="gather" />
      {/if}
      <p class="hint">
        Draw water and nutrients straight from the substrate. Watch the reserves panel while you
        cycle.
      </p>

      <div class="cap-section">
        <div class="cap-head">
          <span class="text-label-caps">Capacity</span>
          <span class="text-data-mono cap-hint">Spend {resourceLabel('lysate')} to hold more</span>
        </div>
        <div class="cap-rows">
          {#each capRows as row}
            {@const cost = capCost(row.resource)}
            <div class="cap-row">
              <div class="cap-info">
                <span class="cap-name" data-tone={row.tone}
                  ><ResourceSymbol id={row.resource} /></span
                >
                <span class="text-data-mono cap-val">
                  {Math.floor(row.cap)}
                  <span class="cap-next">→ {Math.floor(row.cap) + LYSATE_CAP_EXPAND_AMOUNT}</span>
                </span>
              </div>
              <button
                class="cmd-btn cap-btn"
                disabled={!canExpand(row.resource)}
                onclick={() => gameStore.expandCap(row.resource)}
              >
                +{LYSATE_CAP_EXPAND_AMOUNT} cap · {cost}
                {resourceLabel('lysate')}
              </button>
            </div>
          {/each}
        </div>
      </div>
    {:else if phase === 'grow'}
      <!-- ── GROW ── -->
      {#if !isMobile}
        <PhaseAction phase="grow" />
      {/if}

      <div class="gen-section">
        <div class="gen-head">
          <span class="text-label-caps">Generators</span>
          <span class="text-data-mono gen-count">{activeGenerators} active</span>
        </div>
        <div class="gen-list">
          {#each GENERATORS as gen}
            {@const level = gs.generators[gen.id] ?? 0}
            {@const cost = getGeneratorCost(gen.baseCost, level, gen.costScale)}
            {@const canAfford = gameStore.biomass >= cost}
            {@const unit = resourceLabel(gen.resource)}
            <div class="gen-card">
              <span class="gen-icon" data-tone={gen.resource} aria-hidden="true">{unit}</span>
              <div class="gen-meta">
                <div class="gen-name">
                  {gen.name}
                  <span class="text-data-mono gen-lv">Lv.{level}</span>
                </div>
                <div class="text-data-mono gen-rate">
                  +{gen.baseRate * level}
                  <ResourceSymbol id={gen.resource} />/s
                  {#if level < gen.maxLevel}<span class="gen-next"
                      >→ +{gen.baseRate * (level + 1)}</span
                    >{/if}
                </div>
              </div>
              {#if level < gen.maxLevel}
                <div class="gen-action">
                  <button
                    class="cmd-btn gen-btn"
                    disabled={!canAfford}
                    onclick={() => gameStore.purchaseGenerator(gen.id)}
                  >
                    {cost} <span class="gen-unit">{resourceLabel('biomass')}</span>
                  </button>
                  {#if !canAfford && affordTime(cost)}
                    <span class="gen-eta text-data-mono">{affordTime(cost)}</span>
                  {/if}
                </div>
              {:else}
                <span class="text-label-caps gen-max">Maxed</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {:else if phase === 'hunt'}
      <HuntSection mode="full" hideAction={isMobile} />
    {:else}
      <!-- ── EXPAND ── -->
      {#if !isMobile}
        <PhaseAction phase="expand" />
      {/if}

      <div class="map-section">
        <button class="map-open-btn" onclick={() => uiStore.openPanel('map')}>
          <span class="map-open-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="26"
              height="26"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="6" stroke-dasharray="2 2" opacity="0.65" />
              <circle cx="12" cy="12" r="2.4" />
              <path d="M12 12 L12 3.4 M12 12 L19.4 16.3 M12 12 L4.6 16.3" />
              <circle cx="12" cy="3.4" r="1.3" fill="currentColor" stroke="none" />
              <circle cx="19.4" cy="16.3" r="1.3" fill="currentColor" stroke="none" />
              <circle cx="4.6" cy="16.3" r="1.3" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span class="map-open-text">
            <span class="map-open-title">Network map</span>
            <span class="map-open-sub">Hyphae, signals and the frontier</span>
          </span>
          <span class="map-open-arrow" aria-hidden="true">→</span>
        </button>
        {#if gameStore.cordBranchId}
          <span class="cord-status text-data-mono">Rhizomorph cord: active</span>
        {:else}
          <button
            class="cmd-btn secondary cord-btn"
            disabled={!gameStore.canBuildCord}
            onclick={() => gameStore.reinforceCord()}
          >
            Reinforce cord · {gameStore.cordCost}
            {resourceLabel('biomass')}
          </button>
        {/if}
      </div>
      <div class="echo-section">
        {#if isMobile}
          <button
            class="echo-head echo-toggle"
            aria-expanded={echoesOpen}
            onclick={() => (echoOverride = !echoesOpen)}
          >
            <span class="text-label-caps">Echoes</span>
            <span class="echo-head-right">
              <span class="text-data-mono echo-count">{echoes.length} collected</span>
              <span class="chev" class:up={echoesOpen} aria-hidden="true">⌄</span>
            </span>
          </button>
        {:else}
          <div class="echo-head">
            <span class="text-label-caps">Echoes</span>
            <span class="text-data-mono echo-count">{echoes.length} collected</span>
          </div>
        {/if}
        {#if echoesOpen}
          {#if echoes.length === 0}
            <p class="hint">
              Defeat hosts to acquire echoes. Each echo permanently enhances the network.
            </p>
          {:else}
            <ul class="echo-list">
              {#each echoes as id (id)}
                <li class="echo-chip">
                  <ResourceIcon name="echo" size={18} round />
                  <span>{gameStore.echoName(id)}</span>
                </li>
              {/each}
            </ul>
          {/if}
        {/if}
      </div>

      {#if gameStore.unlockedSystems.evolution}
        <div class="genome-available text-data-mono">
          Genome: {gameStore.genomePointsAvailable} available
        </div>
        <button
          class="cmd-btn secondary evolution-btn"
          onclick={() => uiStore.openPanel('evolution')}
        >
          Evolution · spend genome points
        </button>
      {/if}

      <p class="hint">
        Capacity upgrades live in the Gather stage — raise a cap there to hold more at once.
      </p>
    {/if}
  </div>
</div>

<style>
  .detail-panel {
    --tone: var(--primary);
    border: 1px solid var(--border);
    background: var(--surface-container);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .detail-panel[data-tone='cyan'] {
    --tone: var(--secondary);
  }
  .detail-panel[data-tone='amber'] {
    --tone: var(--warning);
  }
  .detail-panel[data-tone='coral'] {
    --tone: var(--alert);
  }
  .detail-panel[data-tone='mint'] {
    --tone: var(--primary);
  }

  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-unit);
    padding: 12px var(--space-panel-padding);
    background: var(--surface-container-low);
    border-bottom: 1px solid var(--border);
  }

  .head-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .head-icon {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    color: var(--tone);
    flex-shrink: 0;
  }

  .head-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--on-surface);
  }

  .head-tagline {
    margin: 0;
    font-size: 12px;
    color: var(--on-surface-variant);
  }

  .panel-body {
    flex: 1;
    padding: var(--space-panel-padding);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* ── Expand: map + cord ── */
  .map-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .map-open-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 60px;
    padding: 12px 14px;
    border: 1px solid color-mix(in srgb, var(--primary) 55%, var(--border));
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--primary) 14%, var(--surface-container-high));
    color: var(--on-surface);
    text-align: left;
    cursor: pointer;
    transition:
      background-color var(--duration-fast) var(--ease-out-soft),
      border-color var(--duration-fast) var(--ease-out-soft),
      transform var(--duration-fast) var(--ease-out-soft);
  }

  .map-open-btn:hover {
    background: color-mix(in srgb, var(--primary) 22%, var(--surface-container-high));
    border-color: var(--primary);
  }

  .map-open-btn:active {
    transform: translateY(1px);
  }

  .map-open-btn:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .map-open-icon {
    display: grid;
    place-items: center;
    color: var(--primary);
    flex: none;
  }

  .map-open-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    min-width: 0;
  }

  .map-open-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--on-surface);
  }

  .map-open-sub {
    font-size: 11px;
    color: var(--on-surface-variant);
  }

  .map-open-arrow {
    flex: none;
    color: var(--primary);
    font-weight: 700;
  }

  .cord-btn {
    font-size: 12px;
    padding: 8px 12px;
    min-height: 40px;
  }

  .cord-status {
    font-size: 12px;
    color: var(--primary);
  }

  /* ── Grow: generators ── */
  .gen-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .gen-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--on-surface-variant);
  }

  .gen-count {
    color: var(--secondary);
    font-size: 11px;
  }

  .gen-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .gen-card {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid var(--outline-variant);
    background: var(--surface-container-high);
    border-radius: var(--radius-md);
    padding: 10px 12px;
  }

  .gen-icon {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    color: var(--primary);
    font-size: 24px;
    line-height: 1;
    flex-shrink: 0;
  }

  .gen-icon[data-tone='water'] {
    color: var(--secondary);
  }

  .gen-icon[data-tone='nutrients'] {
    color: var(--nutrient);
  }

  .gen-meta {
    flex: 1;
    min-width: 0;
  }

  .gen-name {
    font-weight: 600;
    color: var(--on-surface);
    font-size: 13px;
  }

  .gen-lv {
    color: var(--on-surface-variant);
    font-size: 11px;
  }

  .gen-rate {
    color: var(--primary);
    font-size: 11px;
    margin-top: 2px;
  }

  .gen-next {
    color: var(--secondary);
    margin-left: 4px;
  }

  .gen-action {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    flex-shrink: 0;
  }

  .gen-btn {
    display: inline-flex;
    gap: 3px;
    padding: 6px 10px;
    font-size: 12px;
    min-height: 40px;
  }

  .gen-unit {
    font-size: 10px;
    opacity: 0.8;
  }

  .gen-eta {
    font-size: 10px;
    color: var(--on-surface-variant);
  }

  .gen-max {
    color: var(--secondary);
  }

  /* ── Gather: capacity upgrades ── */
  .cap-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .cap-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--on-surface-variant);
  }

  .cap-hint {
    color: var(--on-surface-variant);
    font-size: 10px;
  }

  .cap-rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .cap-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    border: 1px solid var(--outline-variant);
    border-radius: var(--radius-md);
    background: var(--surface-container-high);
    padding: 10px 12px;
  }

  .cap-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .cap-name {
    font-weight: 600;
  }

  .cap-name[data-tone='cyan'] {
    color: var(--secondary);
  }
  .cap-name[data-tone='violet'] {
    color: var(--nutrient);
  }
  .cap-name[data-tone='amber'] {
    color: var(--warning);
  }

  .cap-val {
    color: var(--on-surface);
    font-size: 12px;
  }

  .cap-next {
    color: var(--secondary);
  }

  .cap-btn {
    font-size: 11px;
    padding: 6px 10px;
    min-height: 40px;
    flex-shrink: 0;
  }

  /* ── Evolve: echoes ── */
  .echo-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .echo-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--on-surface-variant);
  }

  .echo-count {
    color: var(--warning);
    font-size: 11px;
  }

  .echo-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .echo-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border: 1px solid var(--outline-variant);
    border-radius: var(--radius-pill);
    background: var(--surface-container-high);
    color: var(--on-surface);
    font-size: 12px;
  }

  .genome-available {
    color: var(--primary);
    font-size: 12px;
  }

  .evolution-btn {
    font-size: 12px;
    padding: 8px 12px;
  }

  .hint {
    margin: 0;
    font-size: 12px;
    color: var(--on-surface-variant);
    line-height: 1.5;
  }

  /* ── Mobile: the mode hero owns the header and primary action ── */
  .detail-panel.is-mobile .panel-body {
    padding: 12px;
    gap: 12px;
  }

  .echo-head-right {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .echo-toggle {
    width: 100%;
    border: 0;
    background: transparent;
    padding: 0;
    font-family: inherit;
    cursor: pointer;
  }

  .chev {
    color: var(--on-surface-variant);
    font-size: 14px;
    line-height: 1;
    transition: transform var(--duration-fast) var(--ease-out-soft);
  }

  .chev.up {
    transform: rotate(180deg);
  }
</style>
