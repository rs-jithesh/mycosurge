<script lang="ts">
  import { page } from '$app/stores';
  import { gameStore } from '$lib/stores/game.svelte';

  const links = [
    { href: '/', label: 'Core' },
    { href: '/radar', label: 'Radar' },
    { href: '/evolution', label: 'Evolution' },
    { href: '/expeditions', label: 'Expeditions' },
  ];

  let radarAlert = $derived(gameStore.state.gamePhase === 'tactician');

  function isActive(href: string): boolean {
    const path = $page.url.pathname;
    if (href === '/') return path === '/';
    return path.startsWith(href);
  }
</script>

<aside class="sidebar">
  <div class="section-header">
    <div class="sidebar-brand text-headline-md">Navigation</div>
    <div class="sidebar-sub text-data-mono">Mycosurge Network</div>
  </div>

  <nav class="nav-links">
    {#each links as link}
      <a
        href={link.href}
        class="nav-link"
        class:active={isActive(link.href)}
        class:inactive={!isActive(link.href)}
      >
        {link.label}
        {#if link.href === '/radar' && radarAlert}
          <span class="alert-badge" role="status" aria-label="New threat on the Radar">[!]</span>
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

  @media (min-width: 768px) and (max-width: 1024px) {
    .sidebar {
      width: 200px;
    }
  }
</style>
