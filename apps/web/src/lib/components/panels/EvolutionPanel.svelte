<script lang="ts">
  import { gameStore } from '$lib/stores/game.svelte';
  import { SKILL_NODES, SKILL_TREE_ORDER, resourceLabel } from '@mycosurge/config';
  import type { SkillTree, SkillNodeDef } from '@mycosurge/config';
  import { arePrerequisitesMet, getSkillPointCost } from '@mycosurge/game-engine';
  import Overlay from '$lib/components/Overlay.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';

  let { onClose }: { onClose: () => void } = $props();

  const TREE_LABELS: Record<SkillTree, string> = {
    aggression: 'Aggression',
    resilience: 'Resilience',
    proliferation: 'Proliferation',
  };

  function skillsForTree(tree: SkillTree): SkillNodeDef[] {
    return SKILL_NODES.filter((s) => s.tree === tree);
  }

  let genomeSpent = $derived(gameStore.genomePointsSpent);
  let genomeTotal = $derived(gameStore.genomePointsTotal);
  let genomeAvailable = $derived(gameStore.genomePointsAvailable);
  let respecCost = $derived(gameStore.respecCost);
  let canRespec = $derived(gameStore.canRespec);
  let respecReason = $derived.by(() => {
    if (gameStore.currentHost) return 'Unavailable during combat';
    if (gameStore.isInTrauma) return 'Unavailable while recovering';
    if (genomeSpent === 0) return 'No mutations to reset';
    return '';
  });

  function handleRespec() {
    const message =
      respecCost === 0
        ? 'Respec? This clears every mutation and refunds all genome points. Your first respec is free.'
        : `Respec? This clears every mutation and refunds all genome points for ${respecCost} Biomass.`;
    if (confirm(message)) gameStore.respecSkills();
  }

  function nameFor(id: string): string {
    return SKILL_NODES.find((s) => s.id === id)?.name ?? id;
  }

  function prereqLabel(ids: string[]): string {
    return `Requires ${ids.map(nameFor).join(', ')}`;
  }
</script>

<Overlay title="Evolution" {onClose}>
  <div class="evolution-view">
    <!-- ── NEURAL MUTATIONS (Skills) ── -->
    <section class="panel">
      <h2 class="panel-title text-label-caps">Mutations</h2>

      <div class="genome-bar">
        <div class="genome-meter">
          <ProgressBar
            tone="mint"
            value={genomeAvailable}
            max={genomeTotal}
            label="Genome"
            valueText="{genomeAvailable} available"
          />
        </div>
        <button
          class="cmd-btn secondary respec-btn"
          disabled={!canRespec}
          title={respecReason ||
            `Reset mutations (${respecCost === 0 ? 'free' : `${respecCost} ${resourceLabel('biomass')}`})`}
          onclick={handleRespec}
        >
          Respec · {respecCost === 0 ? 'free' : `${respecCost} ${resourceLabel('biomass')}`}
        </button>
      </div>
      {#if respecReason}
        <p class="respec-reason text-data-mono">{respecReason}</p>
      {/if}

      {#if SKILL_NODES.length === 0}
        <p class="empty-text text-data-mono">No mutations available right now.</p>
      {:else}
        <div class="tree-list">
          {#each SKILL_TREE_ORDER as tree}
            <div class="tree-section">
              <h3 class="tree-title text-label-caps">{TREE_LABELS[tree]}</h3>
              <div class="skill-grid">
                {#each skillsForTree(tree) as skill}
                  {@const level = gameStore.state.skillAllocations[skill.id] ?? 0}
                  {@const pointCost = getSkillPointCost(skill)}
                  {@const maxed = level >= skill.maxLevel}
                  {@const meetsPrereqs = arePrerequisitesMet(gameStore.state, skill.id)}
                  {@const canAffordPoints = gameStore.genomePointsAvailable >= pointCost}
                  {@const purchasable = !maxed && meetsPrereqs && canAffordPoints}
                  <div class="upgrade-item" class:upgrade-locked={!maxed && !meetsPrereqs}>
                    <div class="upgrade-header">
                      <span class="text-label-caps upgrade-name">{skill.name}</span>
                      <span class="text-data-mono upgrade-level"
                        >Level {level}/{skill.maxLevel}</span
                      >
                    </div>
                    <div class="upgrade-desc text-data-mono">{skill.description}</div>
                    <div class="upgrade-footer">
                      {#if maxed}
                        <span class="text-label-caps upgrade-max">Maxed</span>
                      {:else}
                        <span class="text-data-mono upgrade-cost">{pointCost} pt</span>
                        <button
                          class="cmd-btn upgrade-btn"
                          disabled={!purchasable}
                          onclick={() => gameStore.purchaseSkill(skill.id)}
                        >
                          Upgrade
                        </button>
                      {/if}
                    </div>
                    {#if !maxed && !purchasable}
                      <div class="upgrade-reason text-data-mono">
                        {!meetsPrereqs
                          ? prereqLabel(skill.prerequisites)
                          : 'Not enough genome points'}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/each}
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

  .genome-bar {
    display: flex;
    align-items: flex-end;
    gap: var(--space-panel-padding);
    margin-bottom: var(--space-panel-padding);
  }

  .genome-meter {
    flex: 1;
    min-width: 0;
  }

  .respec-btn {
    flex: none;
    padding: var(--space-unit) var(--space-panel-padding);
    font-size: 10px;
  }

  .respec-reason {
    margin: calc(-1 * var(--space-unit)) 0 var(--space-panel-padding);
    color: var(--on-surface-variant);
  }

  .upgrade-reason {
    color: var(--alert);
  }

  /* ── Skill Grid & Tree Groups ── */
  .tree-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-panel-padding);
  }

  .tree-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-unit);
  }

  .tree-title {
    margin: 0;
    color: var(--secondary);
    font-weight: 400;
  }

  .skill-grid {
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

  .upgrade-max {
    color: var(--primary);
  }

  .upgrade-btn {
    margin-left: auto;
    padding: var(--space-unit) var(--space-panel-padding);
    font-size: 10px;
  }
</style>
