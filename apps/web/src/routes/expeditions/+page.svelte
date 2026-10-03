<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { gameStore } from '$lib/stores/game.svelte';
  import { HOSTS } from '@mycosurge/config';

  onMount(() => {
    if (gameStore.state.gamePhase !== 'active') goto(resolve('/'));
  });

  let slots = $derived(gameStore.state.maxExpeditionSlots);
  let active = $derived(gameStore.expeditions.length);
  let slotsFull = $derived(active >= slots);

  function hostName(id: string): string {
    return HOSTS.find((h) => h.id === id)?.name ?? id;
  }

  function progress(timeRemaining: number, duration: number): number {
    if (duration <= 0) return 100;
    return Math.max(0, Math.min(100, ((duration - timeRemaining) / duration) * 100));
  }
</script>

<div class="expeditions-view">
  <section class="panel">
    <div class="panel-head">
      <span class="text-label-caps">Active expeditions</span>
      <span class="text-data-mono">{active} / {slots}</span>
    </div>

    {#if gameStore.expeditions.length === 0}
      <div class="empty">
        <span class="empty-glyph">◌</span>
        <p class="empty-title">No expeditions underway</p>
        <p class="empty-text">
          Start an expedition to gather Biomass while you tend the network. It takes real time to
          return.
        </p>
      </div>
    {:else}
      <div class="expedition-list">
        {#each gameStore.expeditions as exp, i}
          <div class="expedition-item">
            <div class="exp-top">
              <span class="exp-host">{hostName(exp.hostId)}</span>
              {#if exp.completed}
                <span class="status-done text-label-caps">Ready</span>
              {:else}
                <span class="status-pending text-data-mono">
                  {Math.ceil(exp.timeRemaining)}s
                </span>
              {/if}
            </div>
            <div
              class="track"
              role="progressbar"
              aria-label="Expedition progress"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={Math.round(progress(exp.timeRemaining, exp.duration))}
            >
              <span style="width: {progress(exp.timeRemaining, exp.duration)}%"></span>
            </div>
            {#if exp.completed}
              <button
                class="cmd-btn collect"
                onclick={() => {
                  gameStore.collectExpedition(i);
                  gameStore.cleanupExpeditions();
                }}
              >
                Collect Biomass
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section class="panel">
    <div class="panel-head">
      <span class="text-label-caps">Start an expedition</span>
    </div>
    {#if slotsFull}
      <p class="empty-text notice">
        All expedition slots are busy. Wait for one to return, or collect a finished one.
      </p>
    {:else}
      <div class="host-list">
        {#each HOSTS as host (host.id)}
          <div class="host-row">
            <div class="host-meta">
              <span class="host-name">{host.name}</span>
              <span class="host-reward text-data-mono">+{host.biomassReward} Biomass</span>
            </div>
            <button class="cmd-btn" onclick={() => gameStore.startExpedition(host.id)}>
              Start
            </button>
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
    background: var(--surface-container);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }

  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px var(--space-panel-padding);
    background: var(--surface-container-low);
    border-bottom: 1px solid var(--border);
    color: var(--on-surface-variant);
  }

  .empty {
    padding: var(--space-margin) var(--space-panel-padding);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-unit);
  }

  .empty-glyph {
    font-size: 28px;
    color: var(--primary);
    line-height: 1;
  }

  .empty-title {
    margin: 0;
    font-weight: 600;
    color: var(--on-surface);
  }

  .empty-text {
    margin: 0;
    max-width: 320px;
    color: var(--on-surface-variant);
    font-size: var(--font-body-md);
    line-height: 1.5;
  }

  .notice {
    padding: var(--space-panel-padding);
  }

  .expedition-list {
    display: flex;
    flex-direction: column;
  }

  .expedition-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: var(--space-panel-padding);
    border-bottom: 1px solid var(--border);
  }

  .expedition-item:last-child {
    border-bottom: none;
  }

  .exp-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .exp-host {
    font-weight: 600;
  }

  .status-pending {
    color: var(--on-surface-variant);
  }

  .status-done {
    color: var(--primary);
  }

  .track {
    height: 8px;
    border-radius: var(--radius-pill);
    background: var(--surface-container-high);
    overflow: hidden;
  }

  .track > span {
    display: block;
    height: 100%;
    background: var(--secondary);
    border-radius: var(--radius-pill);
    transition: width var(--duration-normal) var(--ease-out-soft);
  }

  .collect {
    align-self: flex-start;
    background: var(--primary);
    border-color: var(--primary);
    color: var(--on-primary);
    font-weight: 600;
  }

  .host-list {
    display: flex;
    flex-direction: column;
  }

  .host-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-gutter);
    padding: var(--space-unit) var(--space-panel-padding);
    border-bottom: 1px solid var(--border);
  }

  .host-row:last-child {
    border-bottom: none;
  }

  .host-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .host-name {
    font-weight: 600;
  }

  .host-reward {
    color: var(--on-surface-variant);
  }
</style>
