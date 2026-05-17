<script lang="ts">
  import { gameStore } from '$lib/stores/game.svelte';
</script>

<div class="expeditions-view">
  <section class="panel">
    <h2 class="panel-title text-label-caps">
      &gt; ACTIVE EXPEDITIONS ({gameStore.expeditions.length}/{gameStore.state.maxExpeditionSlots})
    </h2>
    {#if gameStore.expeditions.length === 0}
      <p class="empty-text text-data-mono">
        SYS: No active expeditions. Launch scouts from the Radar.
      </p>
    {:else}
      <div class="expedition-list">
        {#each gameStore.expeditions as exp, i}
          <div class="expedition-item">
            <span class="exp-host">{exp.hostId}</span>
            {#if exp.completed}
              <span class="exp-status-done">COMPLETED</span>
            {:else}
              <span class="exp-status-pending">
                {Math.ceil(exp.timeRemaining)}s
              </span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  .expeditions-view {
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

  .expedition-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-unit);
  }

  .expedition-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-unit) var(--space-panel-padding);
    border: 1px solid var(--border);
  }

  .exp-host {
    color: var(--on-surface);
    letter-spacing: 0.05em;
  }

  .exp-status-pending {
    color: var(--on-surface-variant);
  }

  .exp-status-done {
    color: var(--on-surface);
  }
</style>
