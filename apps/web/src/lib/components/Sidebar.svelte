<script lang="ts">
  import { page } from '$app/stores';
  import { gameStore } from '$lib/stores/game.svelte';

  const links = [
    { href: '/', label: '[01] CORE' },
    { href: '/radar', label: '[02] RADAR' },
    { href: '/evolution', label: '[03] Evolution' },
    { href: '/expeditions', label: '[04] LOGS' },
  ];

  let radarAlert = $derived(gameStore.state.gamePhase === 'tactician');

  function isActive(href: string): boolean {
    const path = $page.url.pathname;
    if (href === '/') return path === '/';
    return path.startsWith(href);
  }

  function handlePurge() {
    if (confirm('PURGE: This will wipe all game data and restart. Continue?')) {
      gameStore.resetGame();
    }
  }
</script>

<aside class="sidebar">
  <div class="section-header">
    <div class="sidebar-brand text-headline-md">SECTOR_NAV</div>
    <div class="sidebar-sub text-data-mono">ID: PRTCL-99</div>
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
          <span class="alert-badge">[!]</span>
        {/if}
      </a>
    {/each}
  </nav>

  <div class="sidebar-footer">
    <button class="cmd-btn sidebar-btn purge-btn" onclick={handlePurge}>&gt; EXE: PURGE</button>
  </div>
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
    color: var(--background);
  }

  .alert-badge {
    color: var(--alert);
    font-weight: 700;
  }

  .active .alert-badge {
    color: var(--background);
  }

  .sidebar-footer {
    padding: var(--space-panel-padding);
    border-top: 1px solid var(--border);
  }

  .sidebar-btn {
    width: 100%;
    text-align: left;
    padding: var(--space-panel-padding);
  }

  .purge-btn {
    border-color: var(--alert);
    color: var(--alert);
  }

  .purge-btn:hover {
    background: var(--alert);
    color: var(--background);
  }
</style>
