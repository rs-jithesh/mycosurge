<script lang="ts">
  import { gameStore } from '$lib/stores/game.svelte';
  import { SKILL_NODES, UPGRADES, getGeneratorCost } from '@mycosurge/config';
  import type { UpgradeCategory } from '@mycosurge/config';
  import { getSkillLevelCost, arePrerequisitesMet } from '@mycosurge/game-engine';
  import Overlay from '$lib/components/Overlay.svelte';

  let { onClose }: { onClose: () => void } = $props();

  let openCategory = $state<UpgradeCategory | null>(null);

  function skillCost(skillId: string): number {
    const current = gameStore.state.skillAllocations[skillId] ?? 0;
    const def = SKILL_NODES.find((s) => s.id === skillId);
    if (!def) return Infinity;
    return getSkillLevelCost(def.baseCost, current, gameStore.echoEffects.skillCostMult);
  }

  function upgradeCost(upgradeId: string): number {
    const current = gameStore.state.upgradeLevels[upgradeId] ?? 0;
    const def = UPGRADES.find((u) => u.id === upgradeId);
    if (!def) return Infinity;
    return getGeneratorCost(def.baseCost, current, def.costScale);
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
        return 'Network';
      case 'incursion':
        return 'Combat';
      case 'structural':
        return 'Structure';
    }
  }

  function categoryUpgrades(cat: UpgradeCategory) {
    return UPGRADES.filter((u) => u.category === cat);
  }

  function nameFor(id: string): string {
    return (
      SKILL_NODES.find((s) => s.id === id)?.name ?? UPGRADES.find((u) => u.id === id)?.name ?? id
    );
  }

  function prereqLabel(ids: string[]): string {
    return `Requires ${ids.map(nameFor).join(', ')}`;
  }

  let activeBonuses = $derived.by(() => {
    const e = gameStore.echoEffects;
    const list: { label: string; value: string }[] = [];
    if (e.biomassMult)
      list.push({ label: 'Passive Biomass', value: `+${Math.round(e.biomassMult * 100)}%` });
    if (e.damageMult)
      list.push({ label: 'Spore damage', value: `+${Math.round(e.damageMult * 100)}%` });
    if (e.fireRateMult)
      list.push({ label: 'Fire rate', value: `+${Math.round(e.fireRateMult * 100)}%` });
    if (e.poisonDamage) list.push({ label: 'Poison', value: `+${e.poisonDamage}/s` });
    if (e.hpRegen) list.push({ label: 'HP regen', value: `+${e.hpRegen}/s` });
    if (e.moveSpeedBonus)
      list.push({ label: 'Move speed', value: `+${Math.round(e.moveSpeedBonus * 100)}%` });
    if (e.dodgeWindowBonus)
      list.push({ label: 'Dodge window', value: `+${Math.round(e.dodgeWindowBonus * 100)}%` });
    if (e.evadeChance)
      list.push({ label: 'Evasion', value: `${Math.round(e.evadeChance * 100)}%` });
    if (e.skillCostMult < 1)
      list.push({ label: 'Mutation cost', value: `−${Math.round((1 - e.skillCostMult) * 100)}%` });
    return list;
  });
</script>

<Overlay title="Evolution" {onClose}>
  <div class="evolution-view">
    <!-- ── NEURAL MUTATIONS (Skills) ── -->
    <section class="panel">
      <h2 class="panel-title text-label-caps">Mutations</h2>
      {#if SKILL_NODES.length === 0}
        <p class="empty-text text-data-mono">No mutations available right now.</p>
      {:else}
        <div class="skill-grid">
          {#each SKILL_NODES as skill}
            {@const level = gameStore.state.skillAllocations[skill.id] ?? 0}
            {@const cost = skillCost(skill.id)}
            {@const canAfford = gameStore.biomass >= cost}
            {@const maxed = level >= skill.maxLevel}
            {@const meetsPrereqs = arePrerequisitesMet(gameStore.state, skill.id)}
            <div class="upgrade-item" class:upgrade-locked={!meetsPrereqs && !maxed}>
              <div class="upgrade-header">
                <span class="text-label-caps upgrade-name">{skill.name}</span>
                <span class="text-data-mono upgrade-level">Level {level}/{skill.maxLevel}</span>
              </div>
              <div class="upgrade-desc text-data-mono">{skill.description}</div>
              <div class="upgrade-footer">
                {#if maxed}
                  <span class="text-label-caps upgrade-max">Maxed</span>
                {:else if !meetsPrereqs}
                  <span class="text-data-mono upgrade-prereqs"
                    >{prereqLabel(skill.prerequisites)}</span
                  >
                {:else}
                  <span class="text-data-mono upgrade-cost">{cost} Biomass</span>
                  <button
                    class="cmd-btn upgrade-btn"
                    disabled={!canAfford}
                    onclick={() => gameStore.purchaseSkill(skill.id)}
                  >
                    Upgrade
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
      <h2 class="panel-title text-label-caps">Growth upgrades</h2>

      {#each ['mycelial', 'incursion', 'structural'] as cat}
        {@const upgrades = categoryUpgrades(cat as UpgradeCategory)}
        <div class="category-section">
          <button
            class="category-header text-label-caps"
            onclick={() => toggleCategory(cat as UpgradeCategory)}
          >
            <span>{categoryLabel(cat as UpgradeCategory)} ({upgrades.length})</span>
            <span class="collapse-arrow">{openCategory === cat ? '−' : '+'}</span>
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
                    <span class="text-label-caps upgrade-name">{upgrade.name}</span>
                    <span class="text-data-mono upgrade-level"
                      >Level {level}/{upgrade.maxLevel}</span
                    >
                  </div>
                  <div class="upgrade-desc text-data-mono">{upgrade.description}</div>
                  <div class="upgrade-footer">
                    {#if maxed}
                      <span class="text-label-caps upgrade-max">Maxed</span>
                    {:else if !meetsPrereqs}
                      <span class="text-data-mono upgrade-prereqs"
                        >{prereqLabel(upgrade.prereqs)}</span
                      >
                    {:else}
                      <span class="text-data-mono upgrade-cost">{cost} Biomass</span>
                      <button
                        class="cmd-btn upgrade-btn"
                        disabled={!canBuy}
                        onclick={() => gameStore.purchaseUpgrade(upgrade.id)}
                      >
                        Upgrade
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
      <h2 class="panel-title text-label-caps">Evolutionary echoes</h2>
      {#if gameStore.acquiredEchoes.length === 0}
        <p class="empty-text text-data-mono">
          No echoes yet. Defeat a host on the Radar to inherit its trait.
        </p>
      {:else}
        <div class="echo-list">
          {#each gameStore.acquiredEchoes as echo}
            <div class="echo-item">
              <span class="echo-name">{gameStore.echoName(echo)}</span>
              <span class="echo-desc text-data-mono">{gameStore.echoDescription(echo)}</span>
            </div>
          {/each}
        </div>
      {/if}

      {#if activeBonuses.length > 0}
        <div class="echo-summary">
          <span class="text-label-caps summary-title">Active bonuses</span>
          <div class="bonus-grid">
            {#each activeBonuses as bonus (bonus.label)}
              <div class="bonus-chip">
                <span class="bonus-label">{bonus.label}</span>
                <span class="bonus-value text-data-mono">{bonus.value}</span>
              </div>
            {/each}
          </div>
          <p class="summary-note">
            Complexity raises upkeep on Water and Nutrients — but each echo repays it many times
            over.
          </p>
        </div>
      {/if}
    </section>
  </div>
</Overlay>

<style>
  .evolution-view {
    display: flex;
    flex-direction: column;
    gap: var(--space-gutter);
  }

  .panel {
    border: 1px solid var(--border);
    background: var(--surface-container);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
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
    border: 1px solid var(--outline-variant);
    background: var(--surface-container-high);
    border-radius: var(--radius-md);
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

  /* ── Category Sections ── */
  .category-section {
    margin-bottom: var(--space-unit);
  }

  .category-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 44px;
    padding: 12px var(--space-panel-padding);
    border: 1px solid var(--outline-variant);
    background: var(--surface-container-low);
    border-radius: var(--radius-md);
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
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--space-unit) var(--space-panel-padding);
    border: 1px solid var(--outline-variant);
    background: var(--surface-container-high);
    border-radius: var(--radius-md);
    color: var(--on-surface);
  }

  .echo-name {
    letter-spacing: 0.05em;
    font-weight: 600;
    color: var(--primary);
  }

  .echo-desc {
    color: var(--on-surface-variant);
    line-height: 1.5;
  }

  .echo-summary {
    margin-top: var(--space-panel-padding);
    border-top: 1px solid var(--border);
    padding-top: var(--space-panel-padding);
    display: flex;
    flex-direction: column;
    gap: var(--space-unit);
  }

  .summary-title {
    color: var(--on-surface-variant);
    font-weight: 400;
  }

  .bonus-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .bonus-chip {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    border: 1px solid var(--outline-variant);
    background: var(--surface-container-high);
    border-radius: var(--radius-pill);
    padding: 4px 10px;
  }

  .bonus-label {
    color: var(--on-surface-variant);
    font-size: 11px;
  }

  .bonus-value {
    color: var(--primary);
    font-size: 11px;
  }

  .summary-note {
    margin: 0;
    color: var(--on-surface-variant);
    font-size: 12px;
    line-height: 1.5;
  }
</style>
