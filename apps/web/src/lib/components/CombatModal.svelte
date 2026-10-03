<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { gameStore } from '$lib/stores/game.svelte';
  import { HOSTS } from '@mycosurge/config';
  import { createRadar } from '$lib/pixi/radar';
  import type { RadarInstance } from '$lib/pixi/radar';
  import { completeTutorial, applyTutorialDefeat } from '@mycosurge/game-engine';
  import type { CombatResult } from '@mycosurge/game-engine';

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
  let dialogEl = $state<HTMLDivElement>();

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
  const isInTrauma = $derived(gameStore.isInTrauma);
  const strain = $derived(gameStore.activeStrain);

  onMount(async () => {
    wasTutorial = gameStore.state.gamePhase === 'tactician';
    await tick();
    if (!container || !hostId) return;
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
          gameStore.updateCombatHp(stats.hp);
        },
      },
      {
        hpMult: strain.hpMult,
        speedMult: strain.speedMult,
        moveSpeedMult: strain.speedMult,
      },
    );
  }

  function handleRetreat() {
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
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="modal-overlay" role="presentation" onclick={handleRetreat}>
  <div
    class="modal-frame"
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-labelledby="combat-modal-title"
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
        <span class="brand-sub text-label-caps">{result !== null ? 'Result' : 'Incursion'}</span>
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
          <div class="result-badge badge-victory">Host driven off</div>
          <div class="reward-panel">
            <div class="reward-header text-label-caps">Rewards</div>
            <div class="reward-line">+{reward?.biomassEarned ?? 0} Biomass</div>
            {#if (reward?.lysateEarned ?? 0) > 0}
              <div class="reward-line">+{reward?.lysateEarned} Lysate</div>
            {/if}
          </div>
          <div class="action-row">
            <button class="cmd-btn primary" onclick={handleReturn}>Return to Core</button>
          </div>
        </div>
      {:else if wasTutorial && result.kind === 'defeat'}
        <!-- Tutorial Defeat -->
        <div class="result-view">
          <div class="result-badge badge-defeat">Network breached</div>
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
          <div class="result-badge badge-victory">Host driven off</div>
          <div class="reward-panel">
            <div class="reward-header text-label-caps">Rewards</div>
            <div class="reward-line">+{reward?.biomassEarned ?? 0} Biomass</div>
            {#if (reward?.lysateEarned ?? 0) > 0}
              <div class="reward-line">+{reward?.lysateEarned} Lysate</div>
            {/if}
          </div>
          <div class="action-row">
            <button class="cmd-btn primary" onclick={handleReturn}>Return to Core</button>
          </div>
        </div>
      {:else}
        <!-- Normal Defeat -->
        <div class="result-view">
          <div class="result-badge badge-defeat">Forced retreat</div>
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
    {:else}
      <div class="combat-layout">
        <div class="objective danger">
          <span class="tag-alert text-label-caps">◆ Objective</span>
          <h2 class="objective-title">Drive off {host?.name ?? hostId}</h2>
          <p class="objective-sub">Spores fire automatically — focus on dodging.</p>
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
          <div class="control-hint">DRAG TO MOVE · SPORES AUTO-FIRE</div>
        </div>

        <div class="hpbar mine">
          <span>YOU</span>
          <div class="track"><span class="fill-mint" style="width: {hpPct}%"></span></div>
          <span>{Math.max(0, Math.ceil(hp))} / {maxHp}</span>
        </div>

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

  .control-hint {
    position: absolute;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    font-size: 11px;
    color: var(--on-surface);
    background: var(--overlay);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    padding: 6px 12px;
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

  .result-badge {
    font-size: var(--font-body-lg);
    font-weight: 600;
  }

  .badge-victory {
    color: var(--primary);
  }

  .badge-defeat {
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
