<script lang="ts">
  import type { GrowthPhase } from '@mycosurge/game-engine';
  import { gameStore } from '$lib/stores/game.svelte';
  import ResourcePanel from '$lib/components/ResourcePanel.svelte';
  import LysatePanel from '$lib/components/LysatePanel.svelte';
  import PhaseDetailPanel from '$lib/components/PhaseDetailPanel.svelte';
  import StatusWarnings from './StatusWarnings.svelte';
  import ModeHero from './ModeHero.svelte';
  import ModeSelector from './ModeSelector.svelte';
  import PhaseAction from './PhaseAction.svelte';

  let {
    phase,
    recommended,
    suggested,
    onselect,
  }: {
    phase: GrowthPhase;
    recommended: GrowthPhase;
    suggested: GrowthPhase | null;
    onselect: (phase: GrowthPhase) => void;
  } = $props();

  // While a host is engaged the hero owns the "return to the fight" action, so the
  // secondary Hunt list is hidden to avoid duplicating it.
  let showSecondary = $derived(!(phase === 'hunt' && gameStore.currentHost !== null));
</script>

<div class="core-mobile">
  <ModeHero {phase} {suggested}>
    <PhaseAction {phase} variant="hero" />
  </ModeHero>

  <StatusWarnings />

  <ModeSelector {phase} {recommended} {onselect} />

  <ResourcePanel variant="compact" showLysate={false} />

  <LysatePanel />

  {#if showSecondary}
    <PhaseDetailPanel {phase} variant="mobile" />
  {/if}
</div>

<style>
  .core-mobile {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
</style>
