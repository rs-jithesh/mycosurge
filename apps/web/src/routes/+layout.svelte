<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { afterNavigate, goto, pushState } from '$app/navigation';
  import { base, resolve } from '$app/paths';
  import { gameStore } from '$lib/stores/game.svelte';
  import { logStore } from '$lib/stores/log.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { devStore } from '$lib/stores/dev.svelte';
  import ActivityLog from '$lib/components/ActivityLog.svelte';
  import EvolutionPanel from '$lib/components/panels/EvolutionPanel.svelte';
  import ExpeditionsPanel from '$lib/components/panels/ExpeditionsPanel.svelte';
  import CombatModal from '$lib/components/CombatModal.svelte';

  let { children } = $props();

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
  let menuOpen = $state(false);

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
    logStore.info('Hyphae taste the dark — the network is awake.');
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${base}/sw.js`).catch(() => {});
    }
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
    if (e.key !== 'Escape') return;
    if (menuOpen) {
      menuOpen = false;
      return;
    }
    if (uiStore.combatHostId !== null) return;
    if (uiStore.activePanel !== null) uiStore.closeTop();
  }
</script>

<svelte:window onkeydown={handleEscape} />

<div class="terminal-frame">
  <!-- Blurred bio-luminescent backdrop (decorative) -->
  <div
    class="bg-layer"
    aria-hidden="true"
    style="--bg-mobile: url('{base}/assets/bg-mobile.jpg'); --bg-desktop: url('{base}/assets/bg-desktop.jpg');"
  ></div>

  <!-- Top Bar -->
  <header class="top-bar">
    <span class="top-bar-brand text-headline-md">
      <img
        class="top-bar-logo"
        src="{base}/assets/logo.png"
        width="26"
        height="26"
        alt=""
        aria-hidden="true"
        draggable="false"
      />
      MYCOSURGE
    </span>

    <div class="top-bar-actions">
      <span class="top-bar-status text-label-caps">● Online</span>

      <div class="desktop-actions">
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

      <div class="mobile-actions">
        <button
          class="overflow-btn"
          aria-label="More options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onclick={() => (menuOpen = !menuOpen)}
        >
          ⋯
        </button>
        {#if menuOpen}
          <button
            class="menu-backdrop"
            aria-label="Close menu"
            tabindex="-1"
            onclick={() => (menuOpen = false)}
          ></button>
          <div class="overflow-menu" role="menu">
            {#if devStore.enabled}
              <button
                class="menu-item"
                role="menuitem"
                onclick={() => {
                  menuOpen = false;
                  devStore.previewWelcomeBack();
                }}
              >
                Preview welcome back
              </button>
            {/if}
            <button
              class="menu-item"
              role="menuitem"
              onclick={() => {
                menuOpen = false;
                devStore.set(!devStore.enabled);
              }}
            >
              {devStore.enabled ? 'Disable developer tools' : 'Enable developer tools'}
            </button>
            <button
              class="menu-item danger-item"
              role="menuitem"
              onclick={() => {
                menuOpen = false;
                handleReset();
              }}
            >
              Reset progress
            </button>
          </div>
        {/if}
      </div>
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
      <ActivityLog collapsible />
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
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    /* dvh tracks the visible area as mobile browser chrome shows/hides; vh is the fallback. */
    height: 100vh;
    height: 100dvh;
    width: 100%;
    background: transparent;
  }

  /* A heavily downscaled, blurred image scaled up — cheap to load and paint.
     Sits behind the HUD inside the frame's stacking context. */
  .bg-layer {
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(14, 21, 19, 0.62), rgba(14, 21, 19, 0.78)), var(--bg-mobile);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    filter: blur(26px) saturate(1.05);
    transform: scale(1.15);
    transform-origin: center;
  }

  @media (min-width: 768px) {
    .bg-layer {
      background-image:
        linear-gradient(rgba(14, 21, 19, 0.58), rgba(14, 21, 19, 0.76)), var(--bg-desktop);
      filter: blur(34px) saturate(1.05);
    }
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
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .top-bar-logo {
    width: 26px;
    height: 26px;
    object-fit: contain;
    flex: none;
    filter: drop-shadow(0 0 6px color-mix(in srgb, var(--primary) 35%, transparent));
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

  /* Desktop actions fold into the header row; mobile swaps to an overflow menu. */
  .desktop-actions {
    display: contents;
  }

  .mobile-actions {
    display: none;
    position: relative;
  }

  .overflow-btn {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    padding: 0 0 6px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-container);
    color: var(--on-surface);
    font-size: 18px;
    line-height: 1;
  }

  .overflow-btn:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  .menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    padding: 0;
    border: 0;
    background: transparent;
  }

  .overflow-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 100;
    min-width: 190px;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface-container);
    box-shadow: var(--shadow-md);
    overflow: hidden;
  }

  .menu-item {
    padding: 12px var(--space-panel-padding);
    border: 0;
    background: transparent;
    color: var(--on-surface);
    font-family: inherit;
    font-size: 13px;
    text-align: left;
  }

  .menu-item + .menu-item {
    border-top: 1px solid var(--border);
  }

  .menu-item:hover {
    background: var(--surface-container-high);
  }

  .menu-item.danger-item {
    color: var(--alert);
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
    max-width: 840px;
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

    .desktop-actions {
      display: none;
    }

    .mobile-actions {
      display: inline-flex;
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
