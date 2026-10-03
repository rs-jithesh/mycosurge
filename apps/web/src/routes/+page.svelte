<script lang="ts">
  import { onMount } from 'svelte';
  import { gameStore } from '$lib/stores/game.svelte';
  import TutorialIntro from '$lib/components/TutorialIntro.svelte';
  import SystemsUnlocked from '$lib/components/SystemsUnlocked.svelte';
  import GrowthCycleWheel from '$lib/components/GrowthCycleWheel.svelte';
  import CycleCore from '$lib/components/CycleCore.svelte';
  import ResourcePanel from '$lib/components/ResourcePanel.svelte';
  import PhaseDetailPanel from '$lib/components/PhaseDetailPanel.svelte';
  import ActivityLog from '$lib/components/ActivityLog.svelte';
  import WelcomeBackDialog from '$lib/components/WelcomeBackDialog.svelte';
  import { devStore } from '$lib/stores/dev.svelte';
  import { PHASES } from '$lib/content/phases';
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
  <div class="core">
    {#if gameStore.isInTrauma}
      <div class="warning-strip trauma">
        Recovering — {Math.ceil(gameStore.state.traumaTimer)}s left
      </div>
    {/if}
    {#if gameStore.isStarving}
      <div class="warning-strip starving">
        Starving — restore Water &amp; Nutrients to resume growth.
      </div>
    {/if}

    <div class="core-grid">
      <!-- Left: all resources -->
      <section class="resources-col">
        <ResourcePanel />
      </section>

      <!-- Center: the growth cycle -->
      <section class="cycle-col">
        <div class="wheel-wrap">
          {#snippet nucleus()}
            <CycleCore {phase} {suggested} />
          {/snippet}
          <GrowthCycleWheel {phase} {recommended} onselect={selectPhase} {nucleus} />
        </div>

        <div class="stepper" role="tablist" aria-label="Growth cycle stages">
          {#each PHASES as p}
            <button
              class="step"
              class:is-active={phase === p.id}
              class:is-suggested={recommended === p.id && phase !== p.id}
              data-tone={p.tone}
              role="tab"
              aria-selected={phase === p.id}
              onclick={() => selectPhase(p.id)}
            >
              <span>{p.label}</span>
            </button>
          {/each}
        </div>
      </section>

      <!-- Right: stage-specific options, with activity below -->
      <section class="stage-col">
        <PhaseDetailPanel {phase} />
        <div class="activity-slot">
          <ActivityLog embedded />
        </div>
      </section>
    </div>
  </div>
{/if}

{#if showUnlock}
  <SystemsUnlocked onClose={dismissUnlock} />
{/if}

<style>
  .core {
    display: flex;
    flex-direction: column;
    gap: var(--space-gutter);
  }

  .core-grid {
    display: grid;
    gap: var(--space-gutter);
    grid-template-columns: 1fr;
    grid-template-areas:
      'resources'
      'cycle'
      'stage';
    align-items: start;
  }

  .resources-col {
    grid-area: resources;
    min-width: 0;
  }

  .cycle-col {
    grid-area: cycle;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-gutter);
  }

  .stage-col {
    grid-area: stage;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-gutter);
  }

  .activity-slot {
    display: none;
  }

  /* ── Warnings ── */
  .warning-strip {
    border-radius: var(--radius-md);
    padding: 10px var(--space-panel-padding);
    text-align: center;
    font-weight: 600;
  }

  .warning-strip.trauma {
    border: 1px solid var(--alert);
    background: var(--error-container);
    color: var(--on-error-container);
  }

  .warning-strip.starving {
    border: 1px solid var(--warning);
    background: var(--surface-container-high);
    color: var(--warning);
  }

  /* ── Cycle ── */
  .wheel-wrap {
    display: none;
    width: 100%;
  }

  .stepper {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    width: 100%;
    margin: 0;
    padding: 0;
  }

  .step {
    --tone: var(--primary);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 4px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface-container);
    color: var(--on-surface-variant);
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }

  .step:focus-visible {
    outline: 2px solid var(--tone);
    outline-offset: 2px;
  }

  .step.is-suggested {
    border-style: dashed;
    border-color: var(--tone);
    color: var(--on-surface);
  }

  .step[data-tone='cyan'] {
    --tone: var(--secondary);
  }
  .step[data-tone='amber'] {
    --tone: var(--warning);
  }
  .step[data-tone='coral'] {
    --tone: var(--alert);
  }
  .step[data-tone='mint'] {
    --tone: var(--primary);
  }

  .step.is-active {
    border-color: var(--tone);
    color: var(--tone);
    background: var(--surface-container-high);
  }

  /* ── Desktop: resources strip on top, cycle + stage side by side ── */
  @media (min-width: 768px) {
    .core {
      justify-content: center;
      min-height: calc(100dvh - 80px);
    }

    .core-grid {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      grid-template-areas:
        'resources resources'
        'cycle stage';
    }

    .wheel-wrap {
      display: block;
    }

    .stepper {
      display: none;
    }

    .activity-slot {
      display: block;
    }
  }

  /* ── Wide: three fluid columns (resources | cycle | stage+activity). The cycle
     takes a growing share so the wheel fills the taller viewports. ── */
  @media (min-width: 1080px) {
    .core-grid {
      grid-template-columns: minmax(0, 1fr) minmax(0, 2.1fr) minmax(0, 1.1fr);
      grid-template-areas: 'resources cycle stage';
      align-items: stretch;
    }
  }

  @media (min-width: 1500px) {
    .core-grid {
      grid-template-columns: minmax(0, 1fr) minmax(0, 2.6fr) minmax(0, 1.1fr);
    }
  }

  @media (min-width: 1900px) {
    .core-grid {
      grid-template-columns: minmax(0, 1fr) minmax(0, 3fr) minmax(0, 1.1fr);
    }
  }
</style>
