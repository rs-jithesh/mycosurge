<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { afterNavigate, goto, pushState } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { gameStore } from '$lib/stores/game.svelte';
  import { logStore } from '$lib/stores/log.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { devStore } from '$lib/stores/dev.svelte';
  import type { PanelId } from '$lib/stores/ui.svelte';
  import ActivityLog from '$lib/components/ActivityLog.svelte';
  import EvolutionPanel from '$lib/components/panels/EvolutionPanel.svelte';
  import ExpeditionsPanel from '$lib/components/panels/ExpeditionsPanel.svelte';
  import CombatModal from '$lib/components/CombatModal.svelte';
  import { SYSTEM_META } from '$lib/content/systems';

  let { children } = $props();

  const LAUNCHERS: PanelId[] = ['evolution', 'expeditions'];

  const EXIT_MESSAGE = 'Leave Mycosurge? Your network keeps growing while you are away.';
  let allowExit = false;

  // Arm one history entry so the first Back press reaches us instead of leaving the
  // app. While an overlay is open Back closes it; otherwise it confirms before exit.
  // Uses SvelteKit's pushState so we do not fight the router.
  function armHistory() {
    pushState(location.href, { mycosurge: true });
  }

  function handlePopState() {
    if (uiStore.hasOverlay) {
      uiStore.closeTop();
      armHistory();
      return;
    }
    if (allowExit) return;
    armHistory();
    if (confirm(EXIT_MESSAGE)) {
      allowExit = true;
      history.back();
    }
  }

  let isFullGame = $derived(gameStore.state.gamePhase === 'active');

  // Arm once, after the router has initialised, so Back reaches our handler.
  let historyArmed = false;
  afterNavigate(() => {
    if (historyArmed) return;
    historyArmed = true;
    armHistory();
  });

  onMount(() => {
    gameStore.startTick();
    window.addEventListener('popstate', handlePopState);
    logStore.info('Your mycelial network is coming online.');
    logStore.info('Growing automatically now.');
    return () => {
      gameStore.stopTick();
      window.removeEventListener('popstate', handlePopState);
    };
  });

  // Announce each system once as it is reached.
  $effect(() => {
    gameStore.unlockedSystems;
    gameStore.announceNewSystems();
  });

  function openSystem(id: PanelId) {
    uiStore.openPanel(id);
    gameStore.markSystemSeen(id);
  }

  function handleReset() {
    if (confirm('Reset all progress and restart from the tutorial?')) {
      gameStore.resetGame();
      uiStore.closeAll();
      goto(resolve('/'));
    }
  }

  // Esc closes the topmost overlay. Combat owns its own Esc (retreat) so we bow out
  // while it is open to avoid closing the Radar drawer underneath it as well.
  function handleEscape(e: KeyboardEvent) {
    if (e.key !== 'Escape' || uiStore.combatHostId !== null) return;
    if (uiStore.activePanel !== null) uiStore.closeTop();
  }
</script>

<svelte:window onkeydown={handleEscape} />

<div class="terminal-frame">
  <!-- Top Bar -->
  <header class="top-bar">
    <span class="top-bar-brand text-headline-md">MYCOSURGE</span>

    {#if isFullGame}
      <nav class="launchers" aria-label="Systems">
        {#each LAUNCHERS as id}
          {#if gameStore.unlockedSystems[id]}
            <button class="cmd-btn secondary launcher" onclick={() => openSystem(id)}>
              <span>{SYSTEM_META[id].name}</span>
              {#if gameStore.isSystemNew(id)}
                <span class="launch-new text-label-caps">New</span>
              {/if}
            </button>
          {/if}
        {/each}
      </nav>
    {/if}

    <div class="top-bar-actions">
      <span class="top-bar-status text-label-caps">● Online</span>
      {#if devStore.enabled}
        <button
          class="cmd-btn secondary dev-btn"
          title="Developer preview (mycosurge_dev)"
          onclick={() => devStore.previewWelcomeBack()}
        >
          Preview welcome
        </button>
        <button class="cmd-btn danger reset-btn" onclick={handleReset}>Reset</button>
      {/if}
    </div>
  </header>

  <!-- Desktop Layout (hidden on mobile) -->
  <div class="desktop-layout">
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
    {/if}
  </div>
</div>

<!-- System drawers -->
{#if uiStore.activePanel === 'evolution'}
  <EvolutionPanel onClose={() => uiStore.closeTop()} />
{:else if uiStore.activePanel === 'expeditions'}
  <ExpeditionsPanel onClose={() => uiStore.closeTop()} />
{/if}

<!-- Combat is layered on top of the single Core view (Hunt) -->
{#if uiStore.combatHostId}
  <CombatModal
    hostId={uiStore.combatHostId}
    onClose={() => uiStore.closeCombat()}
    onReturn={() => uiStore.closeAll()}
  />
{/if}

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
    gap: var(--space-gutter);
    padding: var(--space-unit) var(--space-margin);
    border-bottom: 1px solid var(--border);
    user-select: none;
    flex-shrink: 0;
    min-height: 48px;
  }

  .top-bar-brand {
    color: var(--primary);
    flex-shrink: 0;
  }

  .launchers {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  .launcher {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    font-size: 11px;
  }

  .launch-new {
    color: var(--primary);
    font-size: 9px;
  }

  .top-bar-actions {
    display: flex;
    align-items: center;
    gap: var(--space-gutter);
    flex-shrink: 0;
  }

  .top-bar-status {
    color: var(--primary);
  }

  .reset-btn {
    padding: 4px 12px;
    font-size: var(--font-label-caps);
  }

  .dev-btn {
    padding: 4px 10px;
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
  }

  .content-full {
    padding-bottom: var(--space-gutter);
  }

  @media (max-width: 767px) {
    .top-bar {
      flex-wrap: wrap;
      row-gap: 6px;
    }

    .launchers {
      order: 3;
      flex-basis: 100%;
      justify-content: flex-start;
      overflow-x: auto;
      flex-wrap: nowrap;
    }

    .top-bar-status {
      display: none;
    }
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
