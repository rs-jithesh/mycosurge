<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { gameStore } from '$lib/stores/game.svelte';
  import { HOSTS } from '@mycosurge/config';
  import { createRadar } from '$lib/pixi/radar';
  import type { RadarInstance } from '$lib/pixi/radar';
  import { completeTutorial, applyTutorialDefeat } from '@mycosurge/game-engine';

  let {
    hostId,
    onClose,
  }: {
    hostId: string;
    onClose: () => void;
  } = $props();

  let container = $state<HTMLDivElement>();
  let radarInstance: RadarInstance | null = null;
  let result = $state<{ kind: 'victory' | 'defeat' } | null>(null);
  let wasTutorial = $state(false);
  let penalties: string[] = $state([]);

  const host = $derived(HOSTS.find((h) => h.id === hostId));
  const isInTrauma = $derived(gameStore.isInTrauma);

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
  });

  function startRadar() {
    if (!container || !hostId) return;

    result = null;
    radarInstance = createRadar(
      container,
      hostId,
      {
        maxHp: gameStore.combatStats.maxHp,
        hp: gameStore.combatStats.hp,
        damage: gameStore.combatStats.damage,
        fireRate: gameStore.combatStats.fireRate,
        projectileSpeed: gameStore.combatStats.projectileSpeed,
        projectileCount: gameStore.combatStats.projectileCount,
        piercing: gameStore.combatStats.piercing,
        shieldHits: gameStore.combatStats.shieldHits,
        emergencyEvac: gameStore.combatStats.emergencyEvac,
      },
      {
        onVictory: () => {
          if (wasTutorial) {
            completeTutorial(gameStore.state);
          }
          const currentHost = gameStore.currentHost;
          if (currentHost) {
            gameStore.resolveCombat('victory', currentHost);
          }
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
    onClose();
    if (wasTutorial) {
      goto('/');
    }
  }
</script>

<!-- svelte-ignore a11y_interactive_supports_focus a11y_click_events_have_key_events -->
<div
  class="modal-overlay"
  role="button"
  tabindex="-1"
  onclick={handleRetreat}
  onkeydown={(e) => e.key === 'Escape' && handleRetreat()}
>
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div
    class="modal-frame"
    role="dialog"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={() => {}}
  >
    <header class="modal-header text-label-caps">
      {result !== null ? '> SYS:AFTER_ACTION_REPORT' : '> SYS:COMBAT_PROTOCOL'}
    </header>

    {#if result !== null}
      {#if wasTutorial && result.kind === 'victory'}
        <!-- Tutorial Victory -->
        <div class="result-view">
          <div class="result-badge badge-victory">[ HOST NEUTRALIZED ]</div>
          <div class="reward-panel">
            <div class="reward-header text-label-caps">REWARDS</div>
            <div class="reward-line">+{Math.floor(gameStore.totalBiomassEarned)} BIOMASS</div>
            <div class="reward-line">+15 WATER</div>
            <div class="reward-line">+10 NUTRIENTS</div>
          </div>
          <div class="action-row">
            <button class="cmd-btn" onclick={handleReturn}>> EXE:RETREAT</button>
          </div>
        </div>
      {:else if wasTutorial && result.kind === 'defeat'}
        <!-- Tutorial Defeat -->
        <div class="result-view">
          <div class="result-badge badge-defeat">[ NETWORK BREACHED ]</div>
          <div class="reward-panel">
            <div class="reward-header text-label-caps">PENALTIES</div>
            {#each penalties as p}
              <div class="penalty-line">{p}</div>
            {/each}
          </div>
          <div class="action-row">
            <button class="cmd-btn" onclick={handleReturn}>> EXE:RETREAT</button>
          </div>
        </div>
      {:else if result.kind === 'victory'}
        <!-- Normal Victory -->
        <div class="result-view">
          <div class="result-badge badge-victory">[ HOST NEUTRALIZED ]</div>
          <p class="reward-line">BIOMASS HARVESTED: +{Math.floor(gameStore.totalBiomassEarned)}</p>
          <div class="action-row">
            <button class="cmd-btn" onclick={handleReturn}>RETURN</button>
          </div>
        </div>
      {:else}
        <!-- Normal Defeat -->
        <div class="result-view">
          <div class="result-badge badge-defeat">[ FORCED RETREAT ]</div>
          <p class="trauma-msg">TRAUMA LOCK — {Math.ceil(gameStore.state.traumaTimer)}s</p>
          <div class="action-row">
            <button class="cmd-btn" onclick={handleReturn}>RETURN</button>
          </div>
        </div>
      {/if}
    {:else if isInTrauma && !wasTutorial}
      <div class="result-view">
        <p class="trauma-msg">TRAUMA LOCK — {Math.ceil(gameStore.state.traumaTimer)}s</p>
        <button class="cmd-btn" onclick={handleReturn}>RETURN</button>
      </div>
    {:else}
      <div class="combat-layout">
        <div class="combat-arena" bind:this={container}></div>
        <div class="combat-footer">
          <span class="text-data-mono"
            >HP: {Math.ceil(gameStore.combatStats.hp)}/{gameStore.combatStats.maxHp}</span
          >
          <span class="text-label-caps">TARGET: {host?.name ?? hostId}</span>
          <button class="cmd-btn retreat-btn" onclick={handleRetreat}>&gt; EXE: RETREAT</button>
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
    background: var(--background);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-frame {
    border: 1px solid var(--border);
    background: var(--surface);
    display: flex;
    flex-direction: column;
    width: min(90vw, 600px);
  }

  .modal-header {
    color: var(--primary);
    padding: var(--space-unit) var(--space-panel-padding);
    background: var(--surface-container-low);
    border-bottom: 1px solid var(--border);
  }

  .combat-layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-gutter);
    padding: var(--space-panel-padding);
  }

  .combat-arena {
    width: min(75vw, 500px);
    aspect-ratio: 1;
    border: 1px solid var(--border);
  }

  .combat-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: var(--space-gutter);
  }

  .retreat-btn {
    color: var(--on-surface-variant);
    padding: var(--space-unit) var(--space-panel-padding);
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
    text-transform: uppercase;
  }

  .badge-victory {
    color: var(--primary);
  }

  .badge-defeat {
    color: var(--alert);
  }

  .reward-panel {
    width: 100%;
    border: 1px solid var(--border);
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

  .trauma-msg {
    color: var(--alert);
    text-transform: uppercase;
  }
</style>
