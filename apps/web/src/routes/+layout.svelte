<script lang="ts">
  import '../app.css';
  import { gameStore } from '$lib/stores/game.svelte';
  import { logStore } from '$lib/stores/log.svelte';
  import { onMount } from 'svelte';
  import Nav from '$lib/components/Nav.svelte';
  import TerminalLog from '$lib/components/TerminalLog.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import ChatPanel from '$lib/components/ChatPanel.svelte';

  let { children } = $props();

  let isFullGame = $derived(gameStore.state.gamePhase === 'active');

  onMount(() => {
    gameStore.startTick();
    logStore.info('Mycelial network boot sequence v0.1.0');
    logStore.info('Biomass assimilation engine online');
    return () => {
      gameStore.stopTick();
    };
  });
</script>

<div class="terminal-frame">
  <!-- Top Bar -->
  <header class="top-bar">
    <span class="top-bar-brand text-headline-md">MYCOSURGE v0.1.0 [ACTIVE]</span>
    <div class="top-bar-actions">
      <button class="cmd-btn top-btn">&gt; SYS:TERM</button>
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
    {#if isFullGame}
      <ChatPanel />
    {/if}
  </div>

  <!-- Mobile Layout (hidden on desktop) -->
  <div class="mobile-layout">
    <main class="content" class:content-full={!isFullGame}>
      {@render children()}
    </main>
    {#if isFullGame}
      <TerminalLog />
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
    gap: var(--space-gutter);
  }

  .top-btn {
    padding: var(--space-unit);
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
