<script lang="ts">
  import { isGeneratorUnlocked, type CapResource, type GrowthPhase } from '@mycosurge/game-engine';
  import { GENERATORS, getGeneratorCost, resourceLabel } from '@mycosurge/config';
  import { gameStore } from '$lib/stores/game.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { numberPrecision } from '$lib/format';
  import { phaseMeta } from '$lib/content/phases';
  import ResourceIcon from './ResourceIcon.svelte';
  import HuntSection from '$lib/components/hunt/HuntSection.svelte';
  import PhaseAction from './core/PhaseAction.svelte';
  import ManualUpgradeRow from './ManualUpgradeRow.svelte';

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

  let activeGenerators = $derived(GENERATORS.filter((g) => (gs.generators[g.id] ?? 0) > 0).length);
  // Some generators only unlock after the first victory (they cost Lysate).
  let visibleGenerators = $derived(GENERATORS.filter((g) => isGeneratorUnlocked(gs, g)));

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

      <div class="manual-section">
        <span class="text-label-caps manual-label">Field action</span>
        <ManualUpgradeRow id="absorption_depth" />
      </div>

      <div class="cap-section">
        <div class="cap-head">
          <span class="text-label-caps">Capacity</span>
          <span class="text-data-mono cap-hint">Spend {resourceLabel('lysate')} to hold more</span>
        </div>
        <div class="cap-rows">
          {#each capRows as row}
            {@const cost = capCost(row.resource)}
            {@const amount = gameStore.capExpandAmount(row.resource)}
            <div class="cap-row">
              <div class="cap-info">
                <span class="cap-name" data-tone={row.tone}
                  ><ResourceIcon name={row.resource} size={16} /></span
                >
                <span class="text-data-mono cap-val">
                  {Math.floor(row.cap)}
                  <span class="cap-next">→ {Math.floor(row.cap) + amount}</span>
                </span>
              </div>
              <button
                class="cmd-btn cap-btn"
                disabled={!canExpand(row.resource)}
                onclick={() => gameStore.expandCap(row.resource)}
              >
                +{amount} cap · {cost}
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

      <div class="manual-section">
        <span class="text-label-caps manual-label">Field action</span>
        <ManualUpgradeRow id="assimilation_yield" />
      </div>

      <div class="gen-section">
        <div class="gen-head">
          <span class="text-label-caps">Generators</span>
          <span class="text-data-mono gen-count">{activeGenerators} active</span>
        </div>
        <div class="gen-list">
          {#each visibleGenerators as gen}
            {@const level = gs.generators[gen.id] ?? 0}
            {@const cost = getGeneratorCost(gen.baseCost, level, gen.costScale)}
            {@const costResource = gen.costResource ?? 'biomass'}
            {@const canAfford =
              costResource === 'lysate' ? gs.lysateBanked >= cost : gameStore.biomass >= cost}
            {@const unit = resourceLabel(gen.resource)}
            <div class="gen-card">
              <span class="gen-icon" data-tone={gen.resource} aria-hidden="true">{unit}</span>
              <div class="gen-meta">
                <div class="gen-name">
                  {gen.name}
                  <span class="text-data-mono gen-lv">Lv.{level}</span>
                </div>
                <div class="text-data-mono gen-rate">
                  +{numberPrecision(gen.baseRate * level)}
                  <ResourceIcon name={gen.resource} size={14} />/s
                  {#if level < gen.maxLevel}<span class="gen-next"
                      >→ +{numberPrecision(gen.baseRate * (level + 1))}</span
                    >{/if}
                </div>
                {#if gen.consumes}
                  <div class="text-data-mono gen-consume">
                    −{numberPrecision((gen.consumes.water ?? 0) * level)}
                    <ResourceIcon name="water" size={14} /> · −{numberPrecision(
                      (gen.consumes.nutrients ?? 0) * level,
                    )}
                    <ResourceIcon name="nutrients" size={14} /> /s
                  </div>
                {/if}
              </div>
              {#if level < gen.maxLevel}
                <div class="gen-action">
                  <button
                    class="cmd-btn gen-btn"
                    disabled={!canAfford}
                    onclick={() => gameStore.purchaseGenerator(gen.id)}
                  >
                    {cost} <span class="gen-unit">{resourceLabel(costResource)}</span>
                  </button>
                  {#if !canAfford && costResource === 'biomass' && affordTime(cost)}
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

      <p class="hint">
        Grow by tapping a wedge on the map — each step extends that direction. Reach works from
        every stage.
      </p>

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

  .gen-icon[data-tone='biomass'] {
    color: var(--warning);
  }

  .gen-consume {
    color: var(--on-surface-variant);
    font-size: 10px;
    margin-top: 1px;
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

  /* ── Field-action upgrades ── */
  .manual-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .manual-label {
    color: var(--on-surface-variant);
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
  .detail-panel.is-mobile {
    /* Keep a floor on the phase panel so switching to a short phase doesn't collapse
       the page (and yank the scroll position) after a tall one like Grow. */
    min-height: 200px;
  }

  .detail-panel.is-mobile .panel-body {
    padding: 12px;
    gap: 12px;
  }
</style>
