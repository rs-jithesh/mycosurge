<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { previewCombatReward, type GrowthPhase } from '@mycosurge/game-engine';
  import {
    GENERATORS,
    getGeneratorCost,
    HOSTS,
    getStrain,
    LYSATE_CAP_EXPAND_AMOUNT,
    SCAN_WATER_COST,
  } from '@mycosurge/config';
  import { gameStore } from '$lib/stores/game.svelte';
  import { logStore } from '$lib/stores/log.svelte';
  import { phaseMeta } from '$lib/content/phases';
  import CountUp from './CountUp.svelte';
  import ProgressBar from './ProgressBar.svelte';

  let { phase }: { phase: GrowthPhase } = $props();

  let meta = $derived(phaseMeta(phase));
  let gs = $derived(gameStore.state);

  // ── Shared readouts ──
  let waterPercent = $derived(gs.waterCap > 0 ? gs.water / gs.waterCap : 0);
  let nutrientsPercent = $derived(gs.nutrientsCap > 0 ? gs.nutrients / gs.nutrientsCap : 0);
  let isWaterCritical = $derived(waterPercent < 0.35);
  let isNutrientCritical = $derived(nutrientsPercent < 0.4);

  let activeGenerators = $derived(GENERATORS.filter((g) => (gs.generators[g.id] ?? 0) > 0).length);
  let waterIncome = $derived(
    GENERATORS.filter((g) => g.resource === 'water').reduce(
      (sum, g) => sum + g.baseRate * (gs.generators[g.id] ?? 0),
      0,
    ),
  );
  let nutrientIncome = $derived(
    GENERATORS.filter((g) => g.resource === 'nutrients').reduce(
      (sum, g) => sum + g.baseRate * (gs.generators[g.id] ?? 0),
      0,
    ),
  );

  let manualCooldown = $derived(gs.manualCooldown);
  let canAbsorb = $derived(manualCooldown <= 0);
  let canSynthesize = $derived(gs.water >= 10 && gs.nutrients >= 10);
  let synthYield = $derived(gameStore.synthesisYield());

  // ── Hunt ──
  let contacts = $derived(gameStore.contacts);
  let canPing = $derived(gs.water >= SCAN_WATER_COST && contacts.length < gameStore.radarSlots);
  let hasActiveHost = $derived(gameStore.currentHost !== null);
  let activeHost = $derived(HOSTS.find((h) => h.id === gameStore.currentHost));
  let isInTrauma = $derived(gameStore.isInTrauma);

  function hostFor(id: string | null) {
    return HOSTS.find((h) => h.id === id);
  }

  function hostLvl(difficulty: number): number {
    return Math.min(5, Math.ceil(difficulty / 1.4));
  }

  function engage(contactId: string) {
    if (gameStore.engageContact(contactId)) {
      goto(resolve('/radar'));
    } else {
      logStore.warn("You can't engage right now — you may be recovering.");
    }
  }

  // ── Expand ──
  let capRows = $derived([
    { resource: 'water' as const, label: 'Water', cap: gs.waterCap, tone: 'cyan' as const },
    {
      resource: 'nutrients' as const,
      label: 'Nutrients',
      cap: gs.nutrientsCap,
      tone: 'mint' as const,
    },
    {
      resource: 'biomass' as const,
      label: 'Biomass',
      cap: gameStore.maxBiomass,
      tone: 'amber' as const,
    },
  ]);

  function capCost(resource: 'water' | 'nutrients' | 'biomass'): number {
    return gameStore.capExpandCost(resource);
  }

  function canExpand(resource: 'water' | 'nutrients' | 'biomass'): boolean {
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
      <span class="head-icon" aria-hidden="true">{meta.icon}</span>
      <div class="head-text">
        <h2 class="head-title">{meta.label}</h2>
        <p class="head-tagline">{meta.tagline}</p>
      </div>
    </div>
  </header>

  <div class="panel-body">
    {#if phase === 'gather'}
      <!-- ── GATHER ── -->
      <div class="res" class:res-critical={isWaterCritical}>
        <div class="res-top">
          <span class="res-name water">Water</span>
          <span class="text-data-mono res-val">
            <b>{Math.floor(gs.water)}</b> / {Math.floor(gs.waterCap)}
          </span>
        </div>
        <ProgressBar
          tone={isWaterCritical ? 'coral' : 'cyan'}
          value={gs.water}
          max={gs.waterCap}
          showValue={false}
        />
      </div>
      <div class="res" class:res-critical={isNutrientCritical}>
        <div class="res-top">
          <span class="res-name nutrients">Nutrients</span>
          <span class="text-data-mono res-val">
            <b>{Math.floor(gs.nutrients)}</b> / {Math.floor(gs.nutrientsCap)}
          </span>
        </div>
        <ProgressBar
          tone={isNutrientCritical ? 'coral' : 'mint'}
          value={gs.nutrients}
          max={gs.nutrientsCap}
          showValue={false}
        />
      </div>

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

      <div class="income-strip">
        <span class="text-label-caps income-label">Passive income</span>
        <span class="text-data-mono income-val">
          +{waterIncome.toFixed(1)} Water/s · +{nutrientIncome.toFixed(1)} Nutrients/s
        </span>
        <p class="hint">Generators produce this automatically — upgrade them in Grow.</p>
      </div>
    {:else if phase === 'grow'}
      <!-- ── GROW ── -->
      <div class="biomass-block">
        <div class="res-top">
          <span class="res-name">Biomass</span>
          <span class="text-data-mono res-val">
            <b><CountUp value={gameStore.biomass} format={(n) => n.toFixed(n < 10 ? 1 : 0)} /></b>
            / {Math.floor(gameStore.maxBiomass)}
          </span>
        </div>
        <ProgressBar
          tone="amber"
          value={gameStore.biomass}
          max={gameStore.maxBiomass}
          showValue={false}
        />
        <span class="text-data-mono rate">+{gameStore.biomassPerSec.toFixed(1)} / s</span>
      </div>

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
              <span class="gen-icon" aria-hidden="true">{gen.resource === 'water' ? '≋' : '✦'}</span
              >
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
      <!-- ── HUNT ── -->
      {#if hasActiveHost}
        <div class="active-fight">
          <span class="text-label-caps fight-tag">In combat</span>
          <p class="fight-name">{activeHost?.name ?? 'A host'}</p>
          <button class="cmd-btn action-btn" onclick={() => goto(resolve('/radar'))}>
            <span class="action-verb">Return to the fight</span>
          </button>
        </div>
      {:else}
        <div class="lysate-strip">
          <div class="lysate-cell">
            <span class="text-label-caps lysate-label">Banked Lysate</span>
            <span class="text-data-mono lysate-val banked">{Math.floor(gs.lysateBanked)}</span>
          </div>
          <div class="lysate-cell">
            <span class="text-label-caps lysate-label">Raw Lysate</span>
            <span class="text-data-mono lysate-val">
              {Math.floor(gs.lysateRaw * 10) / 10}
              {#if gs.lysateRaw > 0}<span class="raw-dot" title="Stabilising">*</span>{/if}
            </span>
          </div>
        </div>

        {#if contacts.length === 0}
          <div class="empty-hunt">
            <p class="empty-title">No signals right now</p>
            <p class="empty-sub">Wait for one to drift in, or ping the substrate.</p>
            {#if contacts.length < gameStore.radarSlots}
              <span class="text-data-mono sweep"
                >Next sweep ~{Math.max(1, Math.ceil(gs.sonarTimer))}s</span
              >
            {/if}
          </div>
        {:else}
          <div class="contact-list">
            {#each contacts as contact (contact.id)}
              {@const chost = hostFor(contact.hostId)}
              {@const cstrain = getStrain(contact.strainId)}
              {@const lvl = chost ? hostLvl(chost.difficulty) : 1}
              {@const preview = previewCombatReward(gs, contact.hostId, contact.strainId)}
              <div class="contact-card">
                <div class="contact-top">
                  <span class="host-name">
                    {contact.revealed ? (chost?.name ?? contact.hostId) : 'Unidentified signal'}
                  </span>
                  <span class="text-data-mono contact-timer"
                    >{Math.ceil(contact.timeRemaining)}s</span
                  >
                </div>
                {#if !contact.revealed}
                  <button
                    class="cmd-btn contact-btn"
                    disabled={gs.water < SCAN_WATER_COST}
                    onclick={() => gameStore.scanContact(contact.id)}
                  >
                    Scan · {SCAN_WATER_COST} Water
                  </button>
                {:else}
                  <div class="contact-meta">
                    {#if chost?.isBoss}
                      <span class="boss-tag text-label-caps">Boss</span>
                    {:else}
                      <span class="text-data-mono">Level {lvl}</span>
                    {/if}
                    {#if cstrain.id !== 'normal'}
                      <span class="strain-tag text-label-caps">{cstrain.name}</span>
                    {/if}
                    <span class="text-data-mono contact-reward">
                      +{preview.biomassEarned} Biomass · +{preview.lysateEarned} Lysate
                    </span>
                  </div>
                  <div class="contact-actions">
                    <button
                      class="cmd-btn engage-btn"
                      disabled={isInTrauma}
                      onclick={() => engage(contact.id)}>Engage</button
                    >
                    <button class="cmd-btn" onclick={() => gameStore.dismissContact(contact.id)}>
                      Dismiss
                    </button>
                  </div>
                  {#if isInTrauma}
                    <p class="recovery-note text-label-caps">
                      Recovering — engage once the network stabilises.
                    </p>
                  {/if}
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        <div class="hunt-actions">
          <button class="cmd-btn" disabled={!canPing} onclick={() => gameStore.pingSubstrate()}>
            Ping substrate · {SCAN_WATER_COST} Water
          </button>
          <button class="cmd-btn" onclick={() => goto(resolve('/radar'))}>Open Radar</button>
        </div>
      {/if}
    {:else}
      <!-- ── EXPAND ── -->
      <div class="lysate-strip">
        <div class="lysate-cell">
          <span class="text-label-caps lysate-label">Banked Lysate</span>
          <span class="text-data-mono lysate-val banked">{Math.floor(gs.lysateBanked)}</span>
        </div>
        <div class="lysate-cell">
          <span class="text-label-caps lysate-label">Raw Lysate</span>
          <span class="text-data-mono lysate-val">{Math.floor(gs.lysateRaw * 10) / 10}</span>
        </div>
      </div>
      <p class="hint">Earn Lysate by defeating hosts. Spend it to raise your capacity.</p>

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

      <button class="cmd-btn evolution-cta" onclick={() => goto(resolve('/evolution'))}>
        <span class="action-verb">Evolution</span>
        <span class="action-sub">Spend Biomass on permanent mutations</span>
      </button>
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
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-sm);
    background: var(--surface-container-high);
    color: var(--tone);
    font-size: 16px;
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
    padding: var(--space-panel-padding);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* ── Resource rows ── */
  .res {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .res-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .res-name {
    font-weight: 600;
  }

  .res-name.water,
  .cap-name[data-tone='cyan'] {
    color: var(--secondary);
  }

  .res-name.nutrients,
  .cap-name[data-tone='mint'] {
    color: var(--primary);
  }

  .cap-name[data-tone='amber'] {
    color: var(--warning);
  }

  .res-val {
    color: var(--on-surface-variant);
  }

  .res-val b {
    color: var(--on-surface);
    font-weight: 600;
  }

  .res-critical .res-name,
  .res-critical .res-val,
  .res-critical .res-val b {
    color: var(--alert);
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

  .income-strip {
    display: flex;
    flex-direction: column;
    gap: 4px;
    border: 1px solid var(--outline-variant);
    border-radius: var(--radius-md);
    background: var(--surface-container-high);
    padding: 10px 12px;
  }

  .income-label {
    color: var(--on-surface-variant);
    font-size: 9px;
  }

  .income-val {
    color: var(--secondary);
  }

  /* ── Grow ── */
  .biomass-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .biomass-block .rate {
    color: var(--primary);
    font-size: 12px;
    align-self: flex-end;
  }

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
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-sm);
    background: var(--surface-container-highest);
    color: var(--primary);
    font-size: 15px;
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

  /* ── Hunt ── */
  .active-fight {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .fight-tag {
    color: var(--alert);
  }

  .fight-name {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--on-surface);
  }

  .lysate-strip {
    display: flex;
    gap: 10px;
  }

  .lysate-cell {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    border: 1px solid var(--outline-variant);
    border-radius: var(--radius-md);
    background: var(--surface-container-high);
    padding: 8px 12px;
  }

  .lysate-label {
    color: var(--on-surface-variant);
    font-size: 9px;
  }

  .lysate-val {
    font-size: 18px;
    color: var(--on-surface);
  }

  .lysate-val.banked {
    color: var(--primary);
  }

  .raw-dot {
    color: var(--secondary);
  }

  .empty-hunt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    text-align: center;
    padding: 8px 0;
  }

  .empty-title {
    margin: 0;
    font-weight: 600;
    color: var(--on-surface);
  }

  .empty-sub {
    margin: 0;
    font-size: 12px;
    color: var(--on-surface-variant);
  }

  .sweep {
    color: var(--secondary);
    font-size: 12px;
  }

  .contact-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .contact-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid var(--outline-variant);
    background: var(--surface-container-high);
    border-radius: var(--radius-md);
    padding: 10px 12px;
  }

  .contact-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-unit);
  }

  .host-name {
    font-weight: 600;
    color: var(--on-surface);
  }

  .contact-timer {
    color: var(--on-surface-variant);
    font-size: 11px;
  }

  .contact-btn {
    align-self: flex-start;
  }

  .contact-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    color: var(--on-surface-variant);
  }

  .boss-tag {
    color: var(--alert);
  }

  .strain-tag {
    color: var(--warning);
    border: 1px solid var(--warning);
    border-radius: var(--radius-pill);
    padding: 1px 7px;
    font-size: 9px;
  }

  .contact-reward {
    color: var(--primary);
    font-size: 12px;
  }

  .contact-actions {
    display: flex;
    gap: 8px;
  }

  .engage-btn {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--on-primary);
    font-weight: 600;
  }

  .engage-btn:hover {
    background: var(--primary-fixed-dim);
    border-color: var(--primary-fixed-dim);
  }

  .hunt-actions {
    display: flex;
    gap: 8px;
  }

  .hunt-actions .cmd-btn {
    flex: 1;
    font-size: 12px;
    padding: 8px 10px;
  }

  /* ── Expand ── */
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

  .recovery-note {
    color: var(--alert);
    font-size: 10px;
  }

  .evolution-cta {
    flex-direction: column;
    gap: 2px;
    padding: 12px;
  }

  .hint {
    margin: 0;
    font-size: 12px;
    color: var(--on-surface-variant);
    line-height: 1.5;
  }
</style>
