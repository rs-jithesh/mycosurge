<script lang="ts">
  import { gameStore } from '$lib/stores/game.svelte';
  import { SKILL_NODES, UPGRADES, getGeneratorCost } from '@mycosurge/config';
  import type { UpgradeCategory } from '@mycosurge/config';
  import { getSkillLevelCost } from '@mycosurge/game-engine';

  let openCategory = $state<UpgradeCategory | null>(null);

  let availableSkills = $derived(
    SKILL_NODES.filter((s) => {
      const current = gameStore.state.skillAllocations[s.id] ?? 0;
      if (current >= s.maxLevel) return false;
      for (const p of s.prerequisites) {
        if ((gameStore.state.skillAllocations[p] ?? 0) < 1) return false;
      }
      return true;
    }),
  );

  function skillCost(skillId: string): number {
    const current = gameStore.state.skillAllocations[skillId] ?? 0;
    const def = SKILL_NODES.find((s) => s.id === skillId);
    if (!def) return Infinity;
    return getSkillLevelCost(def.baseCost, current);
  }

  function upgradeCost(upgradeId: string): number {
    const current = gameStore.state.upgradeLevels[upgradeId] ?? 0;
    const def = UPGRADES.find((u) => u.id === upgradeId);
    if (!def) return Infinity;
    return getGeneratorCost(def.baseCost, current);
  }

  function canPurchaseUpgrade(upgradeId: string): boolean {
    const def = UPGRADES.find((u) => u.id === upgradeId);
    if (!def) return false;
    const current = gameStore.state.upgradeLevels[upgradeId] ?? 0;
    if (current >= def.maxLevel) return false;
    for (const p of def.prereqs) {
      if ((gameStore.state.upgradeLevels[p] ?? 0) < 1) return false;
    }
    return gameStore.biomass >= upgradeCost(upgradeId);
  }

  function toggleCategory(cat: UpgradeCategory) {
    openCategory = openCategory === cat ? null : cat;
  }

  function categoryLabel(cat: UpgradeCategory): string {
    switch (cat) {
      case 'mycelial':
        return 'MYCELIAL NETWORK';
      case 'incursion':
        return 'INCURSION PROTOCOLS';
      case 'structural':
        return 'STRUCTURAL';
    }
  }

  function categoryUpgrades(cat: UpgradeCategory) {
    return UPGRADES.filter((u) => u.category === cat);
  }
</script>

<div class="evolution-view">
  <!-- ── NEURAL MUTATIONS (Skills) ── -->
  <section class="panel">
    <h2 class="panel-title text-label-caps">&gt; NEURAL MUTATIONS</h2>
    {#if SKILL_NODES.length === 0}
      <p class="empty-text text-data-mono">SYS: No skill tree data available.</p>
    {:else}
      <div class="skill-grid">
        {#each SKILL_NODES as skill}
          {@const level = gameStore.state.skillAllocations[skill.id] ?? 0}
          {@const cost = skillCost(skill.id)}
          {@const canAfford = gameStore.biomass >= cost}
          {@const maxed = level >= skill.maxLevel}
          {@const meetsPrereqs = skill.prerequisites.every(
            (p) => (gameStore.state.skillAllocations[p] ?? 0) >= 1,
          )}
          <div class="upgrade-item" class:upgrade-locked={!meetsPrereqs && !maxed}>
            <div class="upgrade-header">
              <span class="text-label-caps upgrade-name">{skill.name}</span>
              <span class="text-data-mono upgrade-level">LV.{level}/{skill.maxLevel}</span>
            </div>
            <div class="upgrade-desc text-data-mono">{skill.description}</div>
            <div class="upgrade-footer">
              {#if maxed}
                <span class="text-label-caps upgrade-max">MAX</span>
              {:else if !meetsPrereqs}
                <span class="text-data-mono upgrade-prereqs"
                  >REQ: {skill.prerequisites.join(', ')}</span
                >
              {:else}
                <span class="text-data-mono upgrade-cost">COST: {cost} BM</span>
                <button
                  class="cmd-btn upgrade-btn"
                  disabled={!canAfford}
                  onclick={() => gameStore.purchaseSkill(skill.id)}
                >
                  > EXE: PURCHASE
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- ── ECONOMY UPGRADES ── -->
  <section class="panel">
    <h2 class="panel-title text-label-caps">&gt; ECONOMY UPGRADES</h2>

    {#each ['mycelial', 'incursion', 'structural'] as cat}
      {@const upgrades = categoryUpgrades(cat as UpgradeCategory)}
      <div class="category-section">
        <button
          class="category-header text-label-caps"
          onclick={() => toggleCategory(cat as UpgradeCategory)}
        >
          <span>{categoryLabel(cat as UpgradeCategory)} ({upgrades.length})</span>
          <span class="collapse-arrow">{openCategory === cat ? '[-]' : '[+]'}</span>
        </button>

        {#if openCategory === cat}
          <div class="upgrade-grid">
            {#each upgrades as upgrade}
              {@const level = gameStore.state.upgradeLevels[upgrade.id] ?? 0}
              {@const cost = upgradeCost(upgrade.id)}
              {@const maxed = level >= upgrade.maxLevel}
              {@const canBuy = canPurchaseUpgrade(upgrade.id)}
              {@const meetsPrereqs = upgrade.prereqs.every(
                (p) => (gameStore.state.upgradeLevels[p] ?? 0) >= 1,
              )}
              <div class="upgrade-item" class:upgrade-locked={!meetsPrereqs && !maxed}>
                <div class="upgrade-header">
                  <span class="text-label-caps upgrade-name">UPG: {upgrade.name}</span>
                  <span class="text-data-mono upgrade-level">LV.{level}/{upgrade.maxLevel}</span>
                </div>
                <div class="upgrade-desc text-data-mono">{upgrade.description}</div>
                <div class="upgrade-footer">
                  {#if maxed}
                    <span class="text-label-caps upgrade-max">MAX</span>
                  {:else if !meetsPrereqs}
                    <span class="text-data-mono upgrade-prereqs"
                      >REQ: {upgrade.prereqs.join(', ')}</span
                    >
                  {:else}
                    <span class="text-data-mono upgrade-cost">COST: {cost} BM</span>
                    <button
                      class="cmd-btn upgrade-btn"
                      disabled={!canBuy}
                      onclick={() => gameStore.purchaseUpgrade(upgrade.id)}
                    >
                      > EXE: PURCHASE
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </section>

  <!-- ── EVOLUTIONARY ECHOES ── -->
  <section class="panel">
    <h2 class="panel-title text-label-caps">&gt; EVOLUTIONARY ECHOES</h2>
    {#if gameStore.acquiredEchoes.length === 0}
      <p class="empty-text text-data-mono">
        SYS: No echoes acquired. Consume hosts to inherit their traits.
      </p>
    {:else}
      <div class="echo-list">
        {#each gameStore.acquiredEchoes as echo}
          <div class="echo-item">
            <span class="echo-name">{echo}</span>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  .evolution-view {
    display: flex;
    flex-direction: column;
    gap: var(--space-gutter);
  }

  .panel {
    border: 1px solid var(--border);
    background: var(--surface);
    padding: var(--space-panel-padding);
  }

  .panel-title {
    margin: 0 0 var(--space-panel-padding);
    color: var(--on-surface-variant);
    font-weight: 400;
  }

  .empty-text {
    color: var(--on-surface-variant);
  }

  /* ── Skill & Upgrade Grid ── */
  .skill-grid,
  .upgrade-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-unit);
  }

  .upgrade-item {
    border: 1px solid var(--border);
    padding: var(--space-unit) var(--space-panel-padding);
    display: flex;
    flex-direction: column;
    gap: var(--space-unit);
  }

  .upgrade-locked {
    opacity: 0.5;
  }

  .upgrade-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .upgrade-name {
    color: var(--on-surface);
  }

  .upgrade-level {
    color: var(--secondary);
  }

  .upgrade-desc {
    color: var(--on-surface-variant);
    line-height: 1.5;
  }

  .upgrade-footer {
    display: flex;
    align-items: center;
    gap: var(--space-gutter);
  }

  .upgrade-cost {
    color: var(--on-surface-variant);
  }

  .upgrade-prereqs {
    color: var(--alert);
  }

  .upgrade-max {
    color: var(--primary);
  }

  .upgrade-btn {
    margin-left: auto;
    padding: var(--space-unit) var(--space-panel-padding);
    font-size: 10px;
  }

  .upgrade-btn:disabled {
    opacity: 0.4;
    cursor: default;
    pointer-events: none;
  }

  /* ── Category Sections ── */
  .category-section {
    margin-bottom: var(--space-unit);
  }

  .category-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-unit) var(--space-panel-padding);
    border: 1px solid var(--border);
    background: var(--surface-container-low);
    color: var(--primary);
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
  }

  .category-header:hover {
    background: var(--surface-container-high);
  }

  .collapse-arrow {
    color: var(--secondary);
  }

  /* ── Echoes ── */
  .echo-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-unit);
  }

  .echo-item {
    padding: var(--space-unit) var(--space-panel-padding);
    border: 1px solid var(--border);
    color: var(--on-surface);
  }

  .echo-name {
    letter-spacing: 0.05em;
  }
</style>
