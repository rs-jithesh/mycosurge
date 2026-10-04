<script lang="ts">
  import { onMount } from 'svelte';
  import { gameStore } from '$lib/stores/game.svelte';
  import TutorialIntro from '$lib/components/TutorialIntro.svelte';
  import SystemsUnlocked from '$lib/components/SystemsUnlocked.svelte';
  import CoreDesktop from '$lib/components/core/CoreDesktop.svelte';
  import CoreMobile from '$lib/components/core/CoreMobile.svelte';
  import WelcomeBackDialog from '$lib/components/WelcomeBackDialog.svelte';
  import { devStore } from '$lib/stores/dev.svelte';
  import { viewport } from '$lib/stores/viewport.svelte';
  import type { GrowthPhase } from '@mycosurge/game-engine';

  let isFullGame = $derived(gameStore.state.gamePhase === 'active');

  // The engine suggests a stage, but never switches for the player. The active stage
  // is seeded from the suggestion on load and then only changes when the player picks
  // one. The suggestion is surfaced purely as a hint while it differs from the active
  // stage, and disappears once the player is on it.
  let recommended = $derived(gameStore.recommendedPhase);
  let phase = $state<GrowthPhase>(gameStore.recommendedPhase);
  let suggested = $derived(recommended === phase ? null : recommended);

  function selectPhase(next: GrowthPhase) {
    phase = next;
  }

  const UNLOCK_SEEN_KEY = 'mycosurge_unlock_seen';
  let showUnlock = $state(false);
  let unlockSeen = $state(true);

  onMount(() => {
    try {
      unlockSeen = localStorage.getItem(UNLOCK_SEEN_KEY) === '1';
    } catch {
      // storage unavailable — skip the one-time overlay
      unlockSeen = true;
    }
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('skipintro') && !isFullGame) {
        gameStore.skipIntro();
      }
    } catch {
      // no URL access — treat as a normal load
    }
  });

  // Reactive so the overlay also appears when the tutorial ends without the Core
  // route remounting (e.g. the tutorial fight, or `?skipintro`).
  $effect(() => {
    if (isFullGame && !unlockSeen) showUnlock = true;
  });

  function dismissUnlock() {
    try {
      localStorage.setItem(UNLOCK_SEEN_KEY, '1');
    } catch {
      // ignore
    }
    showUnlock = false;
  }
</script>

{#if !isFullGame}
  <TutorialIntro />
{/if}

{#if gameStore.offlineReport || devStore.previewReport}
  <WelcomeBackDialog
    report={gameStore.offlineReport ?? devStore.previewReport!}
    onDismiss={() => {
      gameStore.dismissOfflineReport();
      devStore.clearPreview();
    }}
  />
{/if}

{#if isFullGame}
  {#if viewport.isDesktop}
    <CoreDesktop {phase} {recommended} {suggested} onselect={selectPhase} />
  {:else}
    <CoreMobile {phase} {recommended} {suggested} onselect={selectPhase} />
  {/if}
{/if}

{#if showUnlock}
  <SystemsUnlocked onClose={dismissUnlock} />
{/if}
