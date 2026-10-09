<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { gameStore } from '$lib/stores/game.svelte';
  import { HOSTS, resourceLabel } from '@mycosurge/config';
  import { createRadar } from '$lib/pixi/radar';
  import type { RadarInstance } from '$lib/pixi/radar';
  import { completeTutorial, applyTutorialDefeat } from '@mycosurge/game-engine';
  import type { CombatResult } from '@mycosurge/game-engine';
  import ResourceIcon from '$lib/components/ResourceIcon.svelte';
  import { hostIconKey } from '$lib/content/icons';

  let {
    hostId,
    onClose,
    onReturn,
  }: {
    hostId: string;
    onClose: () => void;
    onReturn?: () => void;
  } = $props();

  let container = $state<HTMLDivElement>();
  let radarInstance: RadarInstance | null = null;
  let result = $state<{ kind: 'victory' | 'defeat' } | null>(null);
  let wasTutorial = $state(false);
  let penalties: string[] = $state([]);
  let reward = $state<CombatResult | null>(null);
  let hp = $state(gameStore.combatStats.hp);
  let maxHp = $state(gameStore.combatStats.maxHp);
  let shieldHits = $state(gameStore.combatStats.shieldHits);
  let hostHp = $state(0);
  let hostMaxHp = $state(1);
  let hostPct = $derived(hostMaxHp > 0 ? Math.max(0, (hostHp / hostMaxHp) * 100) : 0);
  let hpPct = $derived(maxHp > 0 ? Math.max(0, (hp / maxHp) * 100) : 0);
  // Tutorial melee: charge meter (0–1) and whether the charge input is held.
  let charge = $state(0);
  let charging = $state(false);
  let chargePct = $derived(Math.round(charge * 100));
  let dialogEl = $state<HTMLDivElement>();
  let arenaError = $state(false);
  let coarsePointer = $state(
    typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches ?? false),
  );

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') handleRetreat();
  }

  function trapFocus(e: KeyboardEvent) {
    if (e.key !== 'Tab' || !dialogEl) return;
    const focusables = dialogEl.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const host = $derived(HOSTS.find((h) => h.id === hostId));
  const hostIcon = $derived(hostIconKey(hostId));
  const isInTrauma = $derived(gameStore.isInTrauma);
  const strain = $derived(gameStore.activeStrain);

  onMount(async () => {
    wasTutorial = gameStore.state.gamePhase === 'tactician';
    // The arena container is conditionally rendered; wait for it rather than
    // starting nothing, which would leave the fight stuck with an empty arena.
    for (let i = 0; i < 12 && !container; i++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    if (!container || !hostId) {
      arenaError = true;
      return;
    }
    startRadar();
  });

  onDestroy(() => {
    if (radarInstance) {
      radarInstance.destroy();
      radarInstance = null;
    }
    // Any close path (retreat, Back, Esc) abandons the fight cleanly.
    gameStore.disengageHost();
  });

  function startRadar() {
    if (!container || !hostId) return;

    result = null;
    radarInstance = createRadar(
      container,
      hostId,
      { ...gameStore.effectiveCombatStats },
      {
        onVictory: () => {
          if (wasTutorial) {
            completeTutorial(gameStore.state);
          }
          const currentHost = gameStore.currentHost;
          reward = currentHost ? gameStore.resolveCombat('victory', currentHost) : null;
          result = { kind: 'victory' };
        },
        onDefeat: () => {
          if (wasTutorial) {
            penalties = applyTutorialDefeat(gameStore.state);
          } else {
            const currentHost = gameStore.currentHost;
            if (currentHost) {
              gameStore.resolveCombat('defeat', currentHost);
            }
          }
          result = { kind: 'defeat' };
        },
        onStats: (stats) => {
          hp = stats.hp;
          maxHp = stats.maxHp;
          shieldHits = stats.shieldHits;
          hostHp = stats.hostHp;
          hostMaxHp = stats.hostMaxHp;
          charge = stats.charge;
          charging = stats.charging;
          gameStore.updateCombatHp(stats.hp);
        },
        onError: () => {
          arenaError = true;
        },
      },
      {
        hpMult: strain.hpMult,
        speedMult: strain.speedMult,
        moveSpeedMult: strain.speedMult,
      },
      { melee: wasTutorial },
    );
  }

  function handleRetreat() {
    if (result === null && !confirm('Retreat from this fight?')) return;
    if (radarInstance) {
      radarInstance.destroy();
      radarInstance = null;
    }
    gameStore.disengageHost();
    onClose();
  }

  function handleReturn() {
    if (radarInstance) {
      radarInstance.destroy();
      radarInstance = null;
    }
    gameStore.disengageHost();
    result = null;
    if (wasTutorial) {
      onReturn?.();
    } else {
      onClose();
    }
  }

  // Tutorial melee touch controls: press-and-hold to charge, release to slam.
  function startCharge(e: PointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    radarInstance?.setCharging(true);
  }

  function endCharge() {
    radarInstance?.setCharging(false);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet resultHeadline(outcome: 'victory' | 'defeat', sub: string)}
  <div class="result-headline" data-outcome={outcome}>
    <span class="result-mark" aria-hidden="true">{outcome === 'victory' ? '✶' : '✕'}</span>
    <span class="result-word">{outcome === 'victory' ? 'Victory' : 'Defeat'}</span>
    <span class="result-sub">{sub}</span>
  </div>
{/snippet}

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="modal-overlay" role="presentation" onclick={handleRetreat}>
  <div
    class="modal-frame"
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-labelledby="combat-modal-title"
    data-outcome={result?.kind ?? 'none'}
    bind:this={dialogEl}
    onclick={(e) => e.stopPropagation()}
    onkeydown={trapFocus}
  >
    <header class="modal-header">
      <h2 id="combat-modal-title" class="sr-only">
        {result !== null ? 'Combat result' : `Combat: ${host?.name ?? hostId}`}
      </h2>
      <div class="modal-brand">
        <span class="brand-name">MYCOSURGE</span>
        <span class="brand-sub text-label-caps">
          {result !== null ? (result.kind === 'victory' ? 'Victory' : 'Defeat') : 'Incursion'}
        </span>
      </div>
      <div class="header-right">
        {#if result === null}
          <span class="hostile-chip text-label-caps">● Hostile</span>
        {/if}
        <button class="close-btn" aria-label="Close" onclick={handleRetreat}>✕</button>
      </div>
    </header>

    {#if result !== null}
      {#if wasTutorial && result.kind === 'victory'}
        <!-- Tutorial Victory -->
        <div class="result-view">
          {@render resultHeadline('victory', `You drove off ${host?.name ?? 'the host'}`)}
          <div class="reward-panel">
            <div class="reward-header text-label-caps">Rewards</div>
            <div class="reward-line">
              +{reward?.biomassEarned ?? 0}
              {resourceLabel('biomass')}
            </div>
            {#if (reward?.lysateEarned ?? 0) > 0}
              <div class="reward-line">+{reward?.lysateEarned} {resourceLabel('lysate')}</div>
            {/if}
          </div>
          <div class="action-row">
            <button class="cmd-btn primary" onclick={handleReturn}>Return to Core</button>
          </div>
        </div>
      {:else if wasTutorial && result.kind === 'defeat'}
        <!-- Tutorial Defeat -->
        <div class="result-view">
          {@render resultHeadline('defeat', 'Your network was breached')}
          <div class="reward-panel">
            <div class="reward-header text-label-caps">What it cost you</div>
            {#each penalties as p}
              <div class="penalty-line">{p}</div>
            {/each}
          </div>
          <div class="action-row">
            <button class="cmd-btn secondary" onclick={handleReturn}>Return to Core</button>
          </div>
        </div>
      {:else if result.kind === 'victory'}
        <!-- Normal Victory -->
        <div class="result-view">
          {@render resultHeadline('victory', `You drove off ${host?.name ?? 'the host'}`)}
          <div class="reward-panel">
            <div class="reward-header text-label-caps">Rewards</div>
            <div class="reward-line">
              +{reward?.biomassEarned ?? 0}
              {resourceLabel('biomass')}
            </div>
            {#if (reward?.lysateEarned ?? 0) > 0}
              <div class="reward-line">+{reward?.lysateEarned} {resourceLabel('lysate')}</div>
            {/if}
          </div>
          <div class="action-row">
            <button class="cmd-btn primary" onclick={handleReturn}>Return to Core</button>
          </div>
        </div>
      {:else}
        <!-- Normal Defeat -->
        <div class="result-view">
          {@render resultHeadline('defeat', 'You were forced to retreat')}
          <p class="trauma-msg">Recovering — {Math.ceil(gameStore.state.traumaTimer)}s left</p>
          <div class="action-row">
            <button class="cmd-btn secondary" onclick={handleReturn}>Return to Core</button>
          </div>
        </div>
      {/if}
    {:else if isInTrauma && !wasTutorial}
      <div class="result-view">
        <p class="trauma-msg">Recovering — {Math.ceil(gameStore.state.traumaTimer)}s left</p>
        <button class="cmd-btn" onclick={handleReturn}>Return to Core</button>
      </div>
    {:else if arenaError}
      <div class="result-view">
        <p class="trauma-msg">The arena could not start on this device.</p>
        <div class="action-row">
          <button class="cmd-btn secondary" onclick={handleReturn}>Return to Core</button>
        </div>
      </div>
    {:else}
      <div class="combat-layout">
        <div class="objective danger">
          <span class="tag-alert text-label-caps">◆ Objective</span>
          <div class="objective-head">
            {#if hostIcon}
              <ResourceIcon name={hostIcon} size={30} round />
            {/if}
            <h2 class="objective-title">Drive off {host?.name ?? hostId}</h2>
          </div>
          <p class="objective-sub">
            {#if wasTutorial}
              {#if coarsePointer}
                Drag to steer. Hold the Charge button, then release it to slam into the host.
              {:else}
                Move with WASD or the arrow keys. Hold Space to charge, release to slam into the
                host.
              {/if}
            {:else}
              {#if coarsePointer}
                Drag anywhere on the arena to steer.
              {:else}
                Move with WASD or the arrow keys.
              {/if}
              Spores fire on their own — focus on dodging.
            {/if}
          </p>
          {#if strain.id !== 'normal'}
            <p class="strain-line text-label-caps">Strain: {strain.name} — {strain.description}</p>
          {/if}
        </div>

        <div class="arena-holder">
          <div class="combat-arena" bind:this={container}></div>
          <div class="hpbar host">
            <span>HOST</span>
            <div class="track"><span class="fill-coral" style="width: {hostPct}%"></span></div>
            <span>{Math.round(hostPct)}%</span>
          </div>
          <div class="control-hint" data-input={coarsePointer ? 'touch' : 'keys'}>
            {#if coarsePointer}
              <svg
                class="hint-icon"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <circle cx="9" cy="15" r="3.2" />
                <path d="M11.4 12.6 L18 6" />
                <path d="M14 6 L18 6 L18 10" />
              </svg>
              <span
                >{wasTutorial
                  ? 'Drag to move · hold Charge to slam'
                  : 'Drag to move · spores fire on their own'}</span
              >
            {:else}
              <span class="keycaps" aria-hidden="true">
                <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
                <span class="hint-or">or</span>
                <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd>
              </span>
              <span
                >{wasTutorial
                  ? 'Move · hold Space to charge'
                  : 'Move · spores fire on their own'}</span
              >
            {/if}
          </div>
        </div>

        <div class="hpbar mine">
          <span>YOU</span>
          <div class="track"><span class="fill-mint" style="width: {hpPct}%"></span></div>
          <span>{Math.max(0, Math.ceil(hp))} / {maxHp}</span>
        </div>

        {#if wasTutorial}
          <div class="charge-panel">
            <div class="charge-meter">
              <span class="charge-label text-label-caps" class:full={chargePct >= 100}>
                {charging ? 'Charging…' : chargePct >= 100 ? 'Fully charged — release!' : 'Charge'}
              </span>
              <div class="charge-track">
                <span class="charge-fill" class:full={chargePct >= 100} style="width: {chargePct}%"
                ></span>
              </div>
            </div>
            {#if coarsePointer}
              <button
                class="cmd-btn charge-btn"
                onpointerdown={startCharge}
                onpointerup={endCharge}
                onpointercancel={endCharge}
              >
                Hold to charge — release to slam
              </button>
            {/if}
          </div>
        {/if}

        <div class="combat-footer">
          {#if shieldHits > 0}
            <span class="text-data-mono shield-count">Shield {shieldHits}</span>
          {/if}
          <span class="text-label-caps">Host: {host?.name ?? hostId}</span>
          <button class="cmd-btn secondary retreat-btn" onclick={handleRetreat}>Retreat</button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: var(--overlay);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-gutter);
  }

  .modal-frame {
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    background: var(--surface-container);
    display: flex;
    flex-direction: column;
    width: min(90vw, 600px);
    overflow: hidden;
  }

  .modal-frame[data-outcome='victory'] {
    border-color: color-mix(in srgb, var(--primary) 60%, var(--border));
  }

  .modal-frame[data-outcome='defeat'] {
    border-color: color-mix(in srgb, var(--alert) 60%, var(--border));
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--on-surface);
    padding: 10px var(--space-panel-padding);
    background: var(--surface-container-low);
    border-bottom: 1px solid var(--border);
  }

  .modal-brand {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }

  .brand-name {
    font-weight: 700;
    letter-spacing: 0.14em;
    font-size: 13px;
    color: var(--primary);
  }

  .brand-sub {
    color: var(--on-surface-variant);
    font-size: 10px;
    letter-spacing: 0.08em;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-unit);
  }

  .hostile-chip {
    font-family: var(--font-mono);
    color: var(--alert);
    border: 1px solid var(--alert);
    border-radius: var(--radius-pill);
    padding: 4px 10px;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--on-surface-variant);
    font-size: 15px;
    line-height: 1;
    min-width: 32px;
    min-height: 32px;
    padding: 4px;
    border-radius: var(--radius-sm);
  }

  .close-btn:hover {
    background: var(--surface-container-high);
    color: var(--on-surface);
  }

  .combat-layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-gutter);
    padding: var(--space-panel-padding);
  }

  .arena-holder {
    position: relative;
    width: min(75vw, 500px);
  }

  .combat-arena {
    width: 100%;
    aspect-ratio: 1;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .objective {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    background: var(--surface-container-high);
  }

  .objective.danger {
    border-left: 3px solid var(--alert);
  }

  .objective-head {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .tag-alert {
    color: var(--alert);
  }

  .objective-title {
    margin: 4px 0;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.25;
    color: var(--on-surface);
  }

  .objective-sub {
    margin: 0;
    color: var(--on-surface-variant);
    font-size: 13px;
  }

  .strain-line {
    margin: 6px 0 0;
    color: var(--warning);
  }

  .hpbar {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--on-surface-variant);
  }

  .hpbar.host {
    position: absolute;
    top: 12px;
    left: 12px;
    right: 12px;
  }

  .hpbar.mine {
    width: 100%;
  }

  .hpbar .track {
    flex: 1;
    height: 8px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    overflow: hidden;
  }

  .hpbar .track > span {
    display: block;
    height: 100%;
    border-radius: var(--radius-pill);
    transition: width var(--duration-normal) var(--ease-out-soft);
  }

  .fill-coral {
    background: var(--alert);
  }

  .fill-mint {
    background: var(--primary);
  }

  .charge-panel {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .charge-meter {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--on-surface-variant);
  }

  .charge-label {
    flex: none;
    min-width: 96px;
  }

  .charge-label.full {
    color: var(--primary);
  }

  .charge-track {
    flex: 1;
    height: 10px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    overflow: hidden;
  }

  .charge-fill {
    display: block;
    height: 100%;
    background: var(--secondary);
    border-radius: var(--radius-pill);
    transition: width 80ms linear;
  }

  .charge-fill.full {
    background: var(--primary);
  }

  .charge-btn {
    width: 100%;
    padding: 14px;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  .control-hint {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
    max-width: calc(100% - 16px);
    font-size: 12px;
    color: var(--on-surface);
    background: color-mix(in srgb, var(--surface-container-highest) 92%, transparent);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    padding: 6px 12px;
    text-align: center;
    white-space: normal;
    pointer-events: none;
  }

  .control-hint .hint-icon {
    flex: none;
    color: var(--primary);
  }

  .keycaps {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    flex: none;
  }

  .keycaps kbd {
    display: inline-grid;
    place-items: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border: 1px solid var(--outline-variant);
    border-bottom-width: 2px;
    border-radius: 4px;
    background: var(--surface-container);
    color: var(--on-surface);
    font-family: var(--font-mono);
    font-size: 10px;
    line-height: 1;
  }

  .hint-or {
    margin: 0 2px;
    color: var(--on-surface-variant);
    font-size: 10px;
  }

  .combat-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: var(--space-gutter);
  }

  .retreat-btn {
    padding: var(--space-unit) var(--space-panel-padding);
  }

  .shield-count {
    color: var(--secondary);
  }

  .combat-arena :global(canvas:focus-visible) {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  /* ── Result views ── */
  .result-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-gutter);
    padding: var(--space-margin) var(--space-panel-padding);
  }

  .result-headline {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    text-align: center;
  }

  .result-mark {
    font-size: 40px;
    line-height: 1;
  }

  .result-word {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .result-sub {
    font-size: 13px;
    color: var(--on-surface-variant);
  }

  .result-headline[data-outcome='victory'] .result-mark,
  .result-headline[data-outcome='victory'] .result-word {
    color: var(--primary);
  }

  .result-headline[data-outcome='victory'] .result-mark {
    filter: drop-shadow(0 0 12px color-mix(in srgb, var(--primary) 55%, transparent));
  }

  .result-headline[data-outcome='defeat'] .result-mark,
  .result-headline[data-outcome='defeat'] .result-word {
    color: var(--alert);
  }

  .reward-panel {
    width: 100%;
    border: 1px solid var(--outline-variant);
    background: var(--surface-container-high);
    border-radius: var(--radius-md);
    padding: var(--space-panel-padding);
  }

  .reward-header {
    color: var(--on-surface-variant);
    margin-bottom: var(--space-unit);
    border-bottom: 1px solid var(--border);
    padding-bottom: var(--space-unit);
  }

  .reward-line {
    color: var(--primary);
    line-height: 1.8;
  }

  .penalty-line {
    color: var(--alert);
    line-height: 1.8;
  }

  .action-row {
    display: flex;
    gap: var(--space-gutter);
    width: 100%;
    justify-content: center;
  }

  .action-row .cmd-btn {
    padding: var(--space-panel-padding) var(--space-gutter);
  }

  .action-row .cmd-btn.primary {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--on-primary);
    font-weight: 600;
  }

  .action-row .cmd-btn.primary:hover:not(:disabled) {
    background: var(--primary-fixed-dim);
    border-color: var(--primary-fixed-dim);
    color: var(--on-primary);
  }

  .trauma-msg {
    color: var(--alert);
  }
</style>
