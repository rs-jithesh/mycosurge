<script lang="ts">
  import { gameStore } from '$lib/stores/game.svelte';
</script>

{#if gameStore.isInTrauma}
  <div class="warning-strip trauma">
    Recovering — {Math.ceil(gameStore.state.traumaTimer)}s left
  </div>
{/if}
{#if gameStore.isStarving}
  <div class="warning-strip starving">
    Starving — restore Water &amp; Nutrients to resume growth.
  </div>
{/if}

<style>
  .warning-strip {
    border-radius: var(--radius-md);
    padding: 10px var(--space-panel-padding);
    text-align: center;
    font-weight: 600;
  }

  .warning-strip.trauma {
    border: 1px solid var(--alert);
    background: var(--error-container);
    color: var(--on-error-container);
  }

  .warning-strip.starving {
    border: 1px solid var(--warning);
    background: var(--surface-container-high);
    color: var(--warning);
  }
</style>
