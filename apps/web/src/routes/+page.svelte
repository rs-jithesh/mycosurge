<script lang="ts">
  import { onMount } from 'svelte';
  import { gameStore } from '$lib/stores/game.svelte';
  import TutorialIntro from '$lib/components/TutorialIntro.svelte';
  import CoreDesktop from '$lib/components/core/CoreDesktop.svelte';
  import CoreMobile from '$lib/components/core/CoreMobile.svelte';
  import WelcomeBackDialog from '$lib/components/WelcomeBackDialog.svelte';
  import AdvisorDebugPanel from '$lib/components/dev/AdvisorDebugPanel.svelte';
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
  let advisor = $derived(gameStore.advisor);

  function selectPhase(next: GrowthPhase) {
    if (next === phase) return;
    phase = next;
    // Tell the organism what the player actually chose, so it can learn habits.
    gameStore.observePhase(next);
  }

  onMount(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('skipintro') && !isFullGame) {
        gameStore.skipIntro();
      }
    } catch {
      // no URL access — treat as a normal load
    }
  });
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
    <CoreDesktop
      {phase}
      {recommended}
      {suggested}
      reason={advisor.explanation}
      maturity={advisor.maturity}
      onselect={selectPhase}
    />
  {:else}
    <CoreMobile
      {phase}
      {recommended}
      {suggested}
      reason={advisor.explanation}
      maturity={advisor.maturity}
      onselect={selectPhase}
    />
  {/if}
{/if}

{#if devStore.enabled && devStore.showAdvisorPanel}
  <AdvisorDebugPanel />
{/if}
