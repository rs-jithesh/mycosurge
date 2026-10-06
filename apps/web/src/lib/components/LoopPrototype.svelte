<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resourceLabel } from '@mycosurge/config';
  import { gameStore } from '$lib/stores/game.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import SectorBoard from './SectorBoard.svelte';
  import ProgressBar from './ProgressBar.svelte';

  /**
   * Throwaway QA prototype (`?loop`) of the goal-first opening:
   *   you wake with a store of resources and a signal far away →
   *   spend it, run dry, can't reach it → the economy is revealed as the answer →
   *   build up, finish the reach, hunt.
   * Reachable at `/?loop`. Never touches the save.
   */

  const SECTORS = 6;
  const STEPS = 8;
  const BAND_MM = 5;
  const STEP_MM = BAND_MM / STEPS;

  const START_WATER = 40;
  const START_NUTRIENTS = 40;
  const CAP = 60;
  const GROW_WATER = 8;
  const GROW_NUTRIENTS = 6;
  const ABSORB = 4;
  const PUMP_COST = 20;
  const EXUDATES_WATER = 25;
  const EXUDATES_NUTRIENTS = 25;
  const PRODUCTION = 2;
  const HOST_ID = 'soil_nematode';

  let water = $state(START_WATER);
  let nutrients = $state(START_NUTRIENTS);
  let depthSteps = $state<number[]>(Array.from({ length: SECTORS }, () => 0));
  let signalSector = $state(0);
  let pump = $state(false);
  let exudates = $state(false);
  let fought = $state(false);
  let economyRevealed = $state(false);

  onMount(() => {
    signalSector = Math.floor(Math.random() * SECTORS);
  });

  let depthsMm = $derived(depthSteps.map((s) => s * STEP_MM));
  let signalMm = STEPS * STEP_MM;
  let signalReached = $derived(depthSteps[signalSector] >= STEPS);
  let canGrow = $derived(water >= GROW_WATER && nutrients >= GROW_NUTRIENTS);
  let stuck = $derived(!signalReached && !canGrow);

  // The economy appears the first time the player can't afford to grow — the reveal.
  $effect(() => {
    if (stuck) economyRevealed = true;
  });

  // Passive production from installed generators.
  $effect(() => {
    const id = setInterval(() => {
      if (pump) water = Math.min(CAP, water + PRODUCTION);
      if (exudates) nutrients = Math.min(CAP, nutrients + PRODUCTION);
    }, 1000);
    return () => clearInterval(id);
  });

  function grow(sector: number) {
    if (signalReached || !canGrow) return;
    if (depthSteps[sector] >= STEPS) return;
    water -= GROW_WATER;
    nutrients -= GROW_NUTRIENTS;
    const next = depthSteps.slice();
    next[sector] += 1;
    depthSteps = next;
  }

  function absorb() {
    water = Math.min(CAP, water + ABSORB);
    nutrients = Math.min(CAP, nutrients + ABSORB);
  }

  function buyPump() {
    if (pump || water < PUMP_COST) return;
    water -= PUMP_COST;
    pump = true;
  }

  function buyExudates() {
    if (exudates || water < EXUDATES_WATER || nutrients < EXUDATES_NUTRIENTS) return;
    water -= EXUDATES_WATER;
    nutrients -= EXUDATES_NUTRIENTS;
    exudates = true;
  }

  function engage() {
    if (!signalReached) return;
    gameStore.engageHost(HOST_ID);
    uiStore.openCombat(HOST_ID);
  }

  function again() {
    water = START_WATER;
    nutrients = START_NUTRIENTS;
    depthSteps = Array.from({ length: SECTORS }, () => 0);
    signalSector = Math.floor(Math.random() * SECTORS);
    pump = false;
    exudates = false;
    fought = false;
    economyRevealed = false;
  }

  let wasInCombat = false;
  $effect(() => {
    const active = uiStore.combatHostId !== null;
    if (wasInCombat && !active) fought = true;
    wasInCombat = active;
  });

  function leave() {
    goto('/');
  }
</script>

<div class="proto">
  <div class="proto-head">
    <span class="proto-tag text-label-caps">Prototype · goal first</span>
    <h1 class="proto-title">Something is out there</h1>
    <p class="proto-sub">
      You wake with a store of water and minerals — and a signal at the edge. Grow toward it.
    </p>
  </div>

  <div class="res-grid">
    <div class="res-cell">
      <ProgressBar
        tone="cyan"
        label={resourceLabel('water', 'first')}
        labelCaps={false}
        value={water}
        max={CAP}
        animate
        format={(n) => `${Math.floor(n)}/${CAP}`}
      />
      {#if pump}
        <span class="rate text-data-mono">+{PRODUCTION}/s</span>
      {/if}
    </div>
    <div class="res-cell">
      <ProgressBar
        tone="violet"
        label={resourceLabel('nutrients', 'first')}
        labelCaps={false}
        value={nutrients}
        max={CAP}
        animate
        format={(n) => `${Math.floor(n)}/${CAP}`}
      />
      {#if exudates}
        <span class="rate text-data-mono">+{PRODUCTION}/s</span>
      {/if}
    </div>
  </div>

  <SectorBoard
    depths={depthsMm}
    seed={gameStore.networkSeed}
    stageIndex={1}
    {signalSector}
    {signalMm}
    growStepMm={STEP_MM}
    interactive={!signalReached}
    onGrow={grow}
    label="Expansion prototype"
  />

  <div class="foot">
    {#if fought}
      <span class="status won"
        >That was the loop — reach, then fight. A tutorial would end here.</span
      >
      <button class="cmd-btn" onclick={again}>Run it again</button>
    {:else if signalReached}
      <span class="status won">Signal reached.</span>
      <button class="cmd-btn engage" onclick={engage}>Engage the host</button>
    {:else if !economyRevealed}
      <span class="status hint">Tap the wedges to grow toward the blip.</span>
    {:else}
      <span class="status hint">Out of resources to grow. Gather, then build.</span>
    {/if}
  </div>

  {#if economyRevealed && !signalReached}
    <div class="economy">
      <span class="economy-label text-label-caps">Resource handling</span>
      <div class="economy-row">
        <button class="cmd-btn" onclick={absorb}>
          Absorb · +{ABSORB} Water +{ABSORB} Nutrients
        </button>
      </div>
      <div class="economy-row">
        <button class="cmd-btn secondary" disabled={pump || water < PUMP_COST} onclick={buyPump}>
          Osmotic Pump · {PUMP_COST} Water {pump ? '· installed' : ''}
        </button>
        <button
          class="cmd-btn secondary"
          disabled={exudates || water < EXUDATES_WATER || nutrients < EXUDATES_NUTRIENTS}
          onclick={buyExudates}
        >
          Enzymatic Exudates · {EXUDATES_WATER} W + {EXUDATES_NUTRIENTS} N
          {exudates ? '· installed' : ''}
        </button>
      </div>
      <span class="hint">Generators keep producing — that's what funds the reach.</span>
    </div>
  {/if}

  <button class="leave" onclick={leave}>Leave prototype →</button>
</div>

<style>
  .proto {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    max-width: 440px;
    margin: 0 auto;
    padding: var(--space-gutter) 0 var(--space-margin);
  }

  .proto-head {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .proto-tag {
    color: var(--warning);
  }

  .proto-title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: var(--on-surface);
  }

  .proto-sub {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--on-surface-variant);
  }

  .res-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    width: 100%;
  }

  .res-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .rate {
    color: var(--primary);
    font-size: 11px;
    line-height: 1;
    text-align: right;
  }

  .foot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    min-height: 56px;
    text-align: center;
  }

  .status {
    color: var(--on-surface-variant);
  }

  .status.won {
    color: var(--warning);
    font-weight: 600;
  }

  .status.hint {
    font-size: 12px;
  }

  .engage {
    min-width: 200px;
  }

  .economy {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--surface-container);
    text-align: center;
  }

  .economy-label {
    color: var(--primary);
  }

  .economy-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    width: 100%;
  }

  .economy-row .cmd-btn {
    font-size: 12px;
    padding: 8px 12px;
    min-height: 40px;
  }

  .hint {
    margin: 0;
    font-size: 11px;
    color: var(--on-surface-variant);
  }

  .leave {
    background: transparent;
    border: none;
    color: var(--on-surface-variant);
    font: inherit;
    font-size: 12px;
    text-decoration: underline;
    cursor: pointer;
  }
</style>
