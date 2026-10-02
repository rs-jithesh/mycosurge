<script lang="ts">
  import { tick, onMount } from 'svelte';
  import { gameStore } from '$lib/stores/game.svelte';
  import { logStore } from '$lib/stores/log.svelte';
  import TutorialIntro from '$lib/components/TutorialIntro.svelte';
  import SystemsUnlocked from '$lib/components/SystemsUnlocked.svelte';
  import GrowthCycleWheel from '$lib/components/GrowthCycleWheel.svelte';
  import ColonyNucleus from '$lib/components/ColonyNucleus.svelte';
  import PhaseDetailPanel from '$lib/components/PhaseDetailPanel.svelte';
  import { PHASES, phaseMeta } from '$lib/content/phases';

  let logContainer = $state<HTMLDivElement>();
  let logAutoScroll = $state(true);

  function handleLogScroll() {
    if (!logContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = logContainer;
    logAutoScroll = scrollHeight - scrollTop - clientHeight < 32;
  }

  function scrollLogToBottom() {
    if (logContainer && logAutoScroll) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  }

  $effect(() => {
    logStore.entries;
    tick().then(scrollLogToBottom);
  });

  let isFullGame = $derived(gameStore.state.gamePhase === 'active');

  // The wheel and detail panel always follow the engine's suggested stage.
  let phase = $derived(gameStore.recommendedPhase);

  const UNLOCK_SEEN_KEY = 'mycosurge_unlock_seen';
  let showUnlock = $state(false);

  onMount(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('skipintro') && !isFullGame) {
        gameStore.skipIntro();
        return;
      }
    } catch {
      // no URL access — treat as a normal load
    }
    try {
      if (isFullGame && localStorage.getItem(UNLOCK_SEEN_KEY) !== '1') {
        showUnlock = true;
      }
    } catch {
      // storage unavailable — skip the one-time overlay
    }
  });

  function dismissUnlock() {
    try {
      localStorage.setItem(UNLOCK_SEEN_KEY, '1');
    } catch {
      // ignore
    }
    showUnlock = false;
  }

  function pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  function fmtTime(ts: number): string {
    const d = new Date(ts);
    return `[${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]`;
  }
</script>

{#if !isFullGame}
  <TutorialIntro />
{/if}

{#if isFullGame}
  <div class="core">
    {#if gameStore.isInTrauma}
      <div class="trauma-banner">
        Recovering — {Math.ceil(gameStore.state.traumaTimer)}s left
      </div>
    {/if}

    <div class="core-grid">
      <!-- Growth cycle wheel (desktop) -->
      <section class="wheel-col">
        {#snippet nucleus()}
          <ColonyNucleus />
        {/snippet}
        <GrowthCycleWheel {phase} {nucleus} />
      </section>

      <!-- Contextual detail -->
      <section class="detail-col">
        <div class="focus-bar" data-tone={phaseMeta(phase).tone}>
          <span class="focus-label text-label-caps">Next step</span>
          <span class="focus-text">{phaseMeta(phase).objective}</span>
        </div>

        <div class="mobile-only">
          <ColonyNucleus compact />
          <ol class="stepper" aria-label="Growth cycle stages">
            {#each PHASES as p}
              <li class="step" class:is-active={phase === p.id} data-tone={p.tone}>
                <span class="step-num text-data-mono">{p.index}</span>
                <span>{p.label}</span>
              </li>
            {/each}
          </ol>
        </div>

        <PhaseDetailPanel {phase} />

        <div class="panel activity-panel">
          <div class="panel-header">
            <span class="text-label-caps">Activity</span>
          </div>
          <div
            class="log-entries"
            role="log"
            aria-live="polite"
            aria-label="Activity log"
            bind:this={logContainer}
            onscroll={handleLogScroll}
          >
            {#each logStore.entries as entry (entry.id)}
              <div
                class="log-line"
                class:is-warn={entry.level === 'warn'}
                class:is-error={entry.level === 'error'}
                class:is-success={entry.level === 'success'}
              >
                <span class="log-time">{fmtTime(entry.timestamp)}</span>
                <span class="log-msg">{entry.text}</span>
              </div>
            {/each}
          </div>
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
    grid-template-columns: 1fr;
    gap: var(--space-gutter);
  }

  .wheel-col {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-gutter) 0;
  }

  .detail-col {
    display: flex;
    flex-direction: column;
    gap: var(--space-gutter);
    min-width: 0;
  }

  /* Focus strip */
  .focus-bar {
    --tone: var(--primary);
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid var(--border);
    border-left: 3px solid var(--tone);
    border-radius: var(--radius-md);
    background: var(--surface-container-high);
    padding: 10px 14px;
  }

  .focus-bar[data-tone='cyan'] {
    --tone: var(--secondary);
  }
  .focus-bar[data-tone='amber'] {
    --tone: var(--warning);
  }
  .focus-bar[data-tone='coral'] {
    --tone: var(--alert);
  }
  .focus-bar[data-tone='mint'] {
    --tone: var(--primary);
  }

  .focus-label {
    color: var(--tone);
    flex-shrink: 0;
  }

  .focus-text {
    flex: 1;
    color: var(--on-surface);
    font-size: 13px;
    min-width: 0;
  }

  /* Mobile stepper */
  .mobile-only {
    display: none;
    flex-direction: column;
    gap: var(--space-gutter);
  }

  .stepper {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    list-style: none;
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
    font-size: 11px;
    font-weight: 600;
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

  .step-num {
    color: var(--on-surface-variant);
    font-size: 10px;
  }

  .step.is-active .step-num {
    color: var(--tone);
  }

  /* Activity (desktop) */
  .panel {
    border: 1px solid var(--border);
    background: var(--surface-container);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-unit) var(--space-panel-padding);
    background: var(--surface-container-low);
    border-bottom: 1px solid var(--border);
    color: var(--primary);
  }

  .log-entries {
    padding: var(--space-panel-padding);
    font-size: var(--font-data-mono);
    line-height: var(--line-data-mono);
    overflow-y: auto;
    max-height: 200px;
  }

  .log-line {
    display: flex;
    gap: var(--space-gutter);
    line-height: 1.8;
  }

  .log-time {
    color: var(--secondary);
    flex-shrink: 0;
    width: 72px;
  }

  .log-msg {
    color: var(--on-surface-variant);
  }

  .is-warn .log-msg {
    color: var(--on-surface);
  }

  .is-error .log-msg {
    color: var(--alert);
  }

  .is-success .log-msg {
    color: var(--primary);
  }

  .trauma-banner {
    border: 1px solid var(--alert);
    background: var(--error-container);
    color: var(--on-error-container);
    border-radius: var(--radius-md);
    padding: 10px var(--space-panel-padding);
    text-align: center;
    font-weight: 600;
  }

  /* Two-column cockpit on wide screens */
  @media (min-width: 1100px) {
    .core-grid {
      grid-template-columns: minmax(380px, 1fr) 460px;
      align-items: start;
    }

    .wheel-col {
      position: sticky;
      top: var(--space-gutter);
      padding: calc(var(--space-gutter) * 2) 0;
    }
  }

  /* Mobile: stepper replaces the wheel; layout owns the activity log */
  @media (max-width: 767px) {
    .wheel-col {
      display: none;
    }

    .mobile-only {
      display: flex;
    }

    .activity-panel {
      display: none;
    }
  }
</style>
