<script lang="ts">
  import { page } from '$app/stores';
  import { resolve } from '$app/paths';
  import { gameStore } from '$lib/stores/game.svelte';

  const links = [
    { href: '/', label: 'Core' },
    { href: '/radar', label: 'Radar' },
    { href: '/evolution', label: 'Evolution' },
    { href: '/expeditions', label: 'Expeditions' },
  ] as const;

  type NavHref = (typeof links)[number]['href'];

  let radarAlert = $derived(gameStore.state.gamePhase === 'tactician');

  function normalize(path: string): string {
    return path.replace(/\/+$/, '') || '/';
  }

  function isActive(href: NavHref): boolean {
    return normalize($page.url.pathname) === normalize(resolve(href));
  }
</script>

<nav class="nav">
  {#each links as link}
    <a href={resolve(link.href)} class="tab" class:active={isActive(link.href)}>
      {link.label}
      {#if link.href === '/radar' && radarAlert}
        <span class="alert-badge" role="status" aria-label="New threat on the Radar">[!]</span>
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
