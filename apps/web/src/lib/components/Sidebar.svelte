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
    const current = normalize($page.url.pathname);
    const target = normalize(resolve(href));
    const root = normalize(resolve('/'));
    if (target === root) return current === root;
    return current === target || current.startsWith(target + '/');
  }
</script>

<aside class="sidebar">
  <div class="section-header">
    <div class="sidebar-brand text-headline-md">Navigation</div>
    <div class="sidebar-sub text-data-mono">Mycosurge Network</div>
  </div>

  <nav class="nav-links">
    {#each visibleLinks as link}
      <a
        href={resolve(link.href)}
        class="nav-link"
        class:active={isActive(link.href)}
        class:inactive={!isActive(link.href)}
      >
        {link.label}
        {#if link.href === '/radar' && radarAlert}
          <span class="alert-badge" role="status" aria-label="New threat on the Radar">[!]</span>
        {:else if link.system && gameStore.isSystemNew(link.system)}
          <span class="new-badge text-label-caps">New</span>
        {/if}
      </a>
    {/each}
  </nav>
</aside>

<style>
  .sidebar {
    width: 256px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
    background: var(--background);
    padding: 0;
  }

  .section-header {
    padding: var(--space-panel-padding);
    border-bottom: 1px solid var(--border);
  }

  .sidebar-brand {
    color: var(--primary);
  }

  .sidebar-sub {
    color: var(--secondary);
    margin-top: 2px;
  }

  .nav-links {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: var(--space-panel-padding) 0;
    flex: 1;
  }

  .nav-link {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-panel-padding);
    border: 1px solid transparent;
    text-transform: uppercase;
    font-size: var(--font-label-caps);
  }

  .inactive {
    color: var(--secondary);
  }

  .inactive:hover {
    color: var(--on-surface);
    background: var(--surface-container-high);
    border-color: transparent;
  }

  .nav-link.active {
    background: var(--primary);
    color: var(--on-primary);
  }

  .alert-badge {
    color: var(--alert);
    font-weight: 700;
  }

  .active .alert-badge {
    color: var(--on-primary);
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

  @media (min-width: 768px) and (max-width: 1024px) {
    .sidebar {
      width: 200px;
    }
  }
</style>
