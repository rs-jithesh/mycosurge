<script lang="ts">
  import '../app.css';
  import { gameStore } from '$lib/stores/game.svelte';
  import { logStore } from '$lib/stores/log.svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import Nav from '$lib/components/Nav.svelte';
  import ActivityLog from '$lib/components/ActivityLog.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';

  let { children } = $props();

  let isFullGame = $derived(gameStore.state.gamePhase === 'active');

  onMount(() => {
    gameStore.startTick();
    logStore.info('Your mycelial network is coming online.');
    logStore.info('Growing automatically now.');
    return () => {
      gameStore.stopTick();
    };
  });

  // Announce each system once as it is reached.
  $effect(() => {
    gameStore.unlockedSystems;
    gameStore.announceNewSystems();
  });

  function handleReset() {
    if (confirm('Reset all progress and restart from the tutorial?')) {
      gameStore.resetGame();
      goto(resolve('/'));
    }
  }
</script>

<div class="terminal-frame">
  <!-- Top Bar -->
  <header class="top-bar">
    <span class="top-bar-brand text-headline-md">MYCOSURGE</span>
    <div class="top-bar-actions">
      <span class="top-bar-status text-label-caps">● Online</span>
      <button class="cmd-btn danger reset-btn" onclick={handleReset}>Reset</button>
    </div>
  </header>

  <!-- Desktop Layout (hidden on mobile) -->
  <div class="desktop-layout">
    {#if isFullGame}
      <Sidebar />
    {/if}
    <main class="center-content" class:center-full={!isFullGame}>
      {@render children()}
    </main>
  </div>

  <!-- Mobile Layout (hidden on desktop) -->
  <div class="mobile-layout">
    <main class="content" class:content-full={!isFullGame}>
      {@render children()}
    </main>
    {#if isFullGame}
      <ActivityLog />
      <Nav />
    {/if}
  </div>
</div>

<style>
  .terminal-frame {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    background: var(--background);
  }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-unit) var(--space-margin);
    border-bottom: 1px solid var(--border);
    user-select: none;
    flex-shrink: 0;
    height: 48px;
  }

  .top-bar-brand {
    color: var(--primary);
  }

  .top-bar-actions {
    display: flex;
    align-items: center;
    gap: var(--space-gutter);
  }

  .top-bar-status {
    color: var(--primary);
  }

  .reset-btn {
    padding: 4px 12px;
    font-size: var(--font-label-caps);
  }

  .desktop-layout {
    display: none;
    flex: 1;
    min-height: 0;
  }

  .mobile-layout {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .center-content {
    flex: 1;
    overflow-y: auto;
    min-width: 0;
    padding: var(--space-gutter);
  }

  .center-full {
    max-width: 600px;
    margin: 0 auto;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-gutter);
    padding-bottom: 56px;
  }

  .content-full {
    padding-bottom: var(--space-gutter);
  }

  @media (min-width: 768px) {
    .desktop-layout {
      display: flex;
    }

    .mobile-layout {
      display: none;
    }
  }
</style>
