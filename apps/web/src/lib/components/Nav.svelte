<script lang="ts">
  import { page } from '$app/stores';
  import { gameStore } from '$lib/stores/game.svelte';

  const links = [
    { href: '/', label: 'OVERVIEW' },
    { href: '/radar', label: 'RADAR' },
    { href: '/evolution', label: 'EVOLVE' },
    { href: '/expeditions', label: 'SCOUT' },
  ];

  let radarAlert = $derived(gameStore.state.gamePhase === 'tactician');
</script>

<nav class="nav">
  {#each links as link}
    <a href={link.href} class="tab" class:active={$page.url.pathname === link.href}>
      {link.label}
      {#if link.href === '/radar' && radarAlert}
        <span class="alert-badge">[!]</span>
      {/if}
    </a>
  {/each}
</nav>

<style>
  .nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    border-top: 1px solid var(--border);
    background: var(--background);
    z-index: 100;
  }

  .tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-unit);
    padding: var(--space-panel-padding) var(--space-unit);
    text-transform: uppercase;
    text-decoration: none;
    border-right: 1px solid var(--border);
    color: var(--on-surface-variant);
  }

  .alert-badge {
    color: var(--alert);
    font-weight: 700;
  }

  .tab:last-child {
    border-right: none;
  }

  .tab:hover {
    background: var(--surface-container-highest);
    color: var(--on-surface);
  }

  .active {
    background: var(--primary);
    color: var(--background);
  }

  .active:hover {
    background: var(--primary);
    color: var(--background);
  }
</style>
