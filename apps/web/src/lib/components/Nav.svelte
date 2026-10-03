<script lang="ts">
  import { page } from '$app/stores';
  import { resolve } from '$app/paths';
  import type { SystemId } from '@mycosurge/game-engine';
  import { gameStore } from '$lib/stores/game.svelte';

  type NavHref = '/' | '/radar' | '/evolution' | '/expeditions';
  interface NavLink {
    href: NavHref;
    label: string;
    system?: SystemId;
  }

  const links: NavLink[] = [
    { href: '/', label: 'Core' },
    { href: '/radar', label: 'Radar', system: 'radar' },
    { href: '/evolution', label: 'Evolution', system: 'evolution' },
    { href: '/expeditions', label: 'Expeditions', system: 'expeditions' },
  ];

  let visibleLinks = $derived(
    links.filter((link) => link.system === undefined || gameStore.unlockedSystems[link.system]),
  );

  let radarAlert = $derived(gameStore.state.gamePhase === 'tactician');

  function normalize(path: string): string {
    return path.replace(/\/+$/, '') || '/';
  }

  function isActive(href: NavHref): boolean {
    return normalize($page.url.pathname) === normalize(resolve(href));
  }
</script>

<nav class="nav">
  {#each visibleLinks as link}
    <a href={resolve(link.href)} class="tab" class:active={isActive(link.href)}>
      {link.label}
      {#if link.href === '/radar' && radarAlert}
        <span class="alert-badge" role="status" aria-label="New threat on the Radar">[!]</span>
      {:else if link.system && gameStore.isSystemNew(link.system)}
        <span class="new-badge">New</span>
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
    font-size: 13px;
    text-decoration: none;
    border-right: 1px solid var(--border);
    color: var(--on-surface-variant);
  }

  .alert-badge {
    color: var(--alert);
    font-weight: 700;
  }

  .new-badge {
    border: 1px solid var(--primary);
    border-radius: var(--radius-pill);
    color: var(--primary);
    padding: 1px 6px;
    font-size: 9px;
  }

  .active .new-badge {
    border-color: var(--on-primary);
    color: var(--on-primary);
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
    color: var(--on-primary);
  }

  .active:hover {
    background: var(--primary);
    color: var(--on-primary);
  }
</style>
