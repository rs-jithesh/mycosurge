<script lang="ts">
  import { type CapResource, type GrowthPhase } from '@mycosurge/game-engine';
  import { GENERATORS, getGeneratorCost, LYSATE_CAP_EXPAND_AMOUNT } from '@mycosurge/config';
  import { gameStore } from '$lib/stores/game.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { phaseMeta } from '$lib/content/phases';
  import ResourceIcon from './ResourceIcon.svelte';
  import HuntSection from '$lib/components/hunt/HuntSection.svelte';

  let { phase }: { phase: GrowthPhase } = $props();

  let meta = $derived(phaseMeta(phase));
  let gs = $derived(gameStore.state);

  let activeGenerators = $derived(GENERATORS.filter((g) => (gs.generators[g.id] ?? 0) > 0).length);

  let manualCooldown = $derived(gs.manualCooldown);
  let canAbsorb = $derived(manualCooldown <= 0);
  let canSynthesize = $derived(gs.water >= 10 && gs.nutrients >= 10);
  let synthYield = $derived(gameStore.synthesisYield());

  let echoes = $derived(gameStore.acquiredEchoes);

  let capRows = $derived([
    { resource: 'water' as const, label: 'Water', cap: gs.waterCap, tone: 'cyan' as const },
    {
      resource: 'nutrients' as const,
      label: 'Nutrients',
      cap: gs.nutrientsCap,
      tone: 'violet' as const,
    },
    {
      resource: 'biomass' as const,
      label: 'Biomass',
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

<div class="detail-panel" data-tone={meta.tone}>
  <header class="panel-head">
    <div class="head-left">
      <span class="head-icon" aria-hidden="true"><ResourceIcon name={phase} size={34} round /></span
      >
      <div class="head-text">
        <h2 class="head-title">{meta.label}</h2>
        <p class="head-tagline">{meta.tagline}</p>
      </div>
    </div>
  </header>

  <div class="panel-body">
    {#if phase === 'gather'}
      <!-- ── GATHER ── -->
      <button
        class="cmd-btn action-btn"
        disabled={!canAbsorb}
        onclick={() => gameStore.manualAbsorb()}
      >
        <span class="action-verb">Absorb</span>
        <span class="action-sub">
          {canAbsorb ? '+2 Water · +2 Nutrients' : `Ready in ${Math.ceil(manualCooldown)}s`}
        </span>
      </button>
      <p class="hint">
        Draw water and nutrients straight from the substrate. Watch the reserves panel while you
        cycle.
      </p>

      <div class="cap-section">
        <div class="cap-head">
          <span class="text-label-caps">Capacity</span>
          <span class="text-data-mono cap-hint">Spend Lysate to hold more</span>
        </div>
        <div class="cap-rows">
          {#each capRows as row}
            {@const cost = capCost(row.resource)}
            <div class="cap-row">
              <div class="cap-info">
                <span class="cap-name" data-tone={row.tone}>{row.label}</span>
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
                +{LYSATE_CAP_EXPAND_AMOUNT} cap · {cost} Lysate
              </button>
            </div>
          {/each}
        </div>
      </div>
    {:else if phase === 'grow'}
      <!-- ── GROW ── -->
      <button
        class="cmd-btn action-btn"
        disabled={!canSynthesize}
        onclick={() => gameStore.manualSynthesize()}
      >
        <span class="action-verb">Synthesize Biomass</span>
        <span class="action-sub">
          {#if !canSynthesize}
            Need 10 Water + 10 Nutrients
          {:else if synthYield >= 1}
            10 Water + 10 Nutrients → 1 Biomass
          {:else if synthYield > 0}
            10 Water + 10 Nutrients → 0.5 Biomass (low reserves)
          {:else}
            Low reserves — this would be wasted
          {/if}
        </span>
      </button>

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
            {@const unit = gen.resource === 'water' ? 'Water' : 'Nutrients'}
            <div class="gen-card">
              <span class="gen-icon"><ResourceIcon name={gen.resource} size={40} round /></span>
              <div class="gen-meta">
                <div class="gen-name">
                  {gen.name}
                  <span class="text-data-mono gen-lv">Lv.{level}</span>
                </div>
                <div class="text-data-mono gen-rate">
                  +{gen.baseRate * level}
                  {unit}/s
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
                    {cost} <span class="gen-unit">Biomass</span>
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
      <HuntSection mode="full" />
    {:else}
      <!-- ── EVOLVE ── -->
      <div class="echo-section">
        <div class="echo-head">
          <span class="text-label-caps">Echoes</span>
          <span class="text-data-mono echo-count">{echoes.length} collected</span>
        </div>
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
      </div>

      {#if gameStore.unlockedSystems.evolution}
        <div class="genome-available text-data-mono">
          Genome: {gameStore.genomePointsAvailable} available
        </div>
        <button class="cmd-btn evolution-cta" onclick={() => uiStore.openPanel('evolution')}>
          <span class="action-verb">Evolution</span>
          <span class="action-sub">Spend genome points on permanent mutations</span>
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

  /* ── Actions ── */
  .action-btn {
    flex-direction: column;
    gap: 2px;
    padding: 12px;
  }

  .action-verb {
    font-weight: 600;
  }

  .action-sub {
    font-size: 11px;
    font-weight: 500;
    opacity: 0.85;
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
    flex-shrink: 0;
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

  .evolution-cta {
    flex-direction: column;
    gap: 2px;
    padding: 12px;
  }

  .genome-available {
    color: var(--primary);
    font-size: 12px;
  }

  .hint {
    margin: 0;
    font-size: 12px;
    color: var(--on-surface-variant);
    line-height: 1.5;
  }
</style>
