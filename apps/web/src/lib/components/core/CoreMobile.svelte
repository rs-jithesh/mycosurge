<script lang="ts">
  import type { GrowthPhase, AdvisorMaturity } from '@mycosurge/game-engine';
  import { gameStore } from '$lib/stores/game.svelte';
  import PhaseDetailPanel from '$lib/components/PhaseDetailPanel.svelte';
  import NetworkMap from '$lib/components/map/NetworkMap.svelte';
  import StatusWarnings from './StatusWarnings.svelte';
  import ModeHero from './ModeHero.svelte';
  import ModeSelector from './ModeSelector.svelte';
  import PhaseAction from './PhaseAction.svelte';

  let {
    phase,
    recommended,
    suggested = null,
    reason = null,
    maturity = null,
    onselect,
  }: {
    phase: GrowthPhase;
    recommended: GrowthPhase;
    suggested: GrowthPhase | null;
    reason?: string | null;
    maturity?: AdvisorMaturity | null;
    onselect: (phase: GrowthPhase) => void;
  } = $props();

  // While a host is engaged the hero owns the "return to the fight" action, so the
  // secondary Hunt list is hidden to avoid duplicating it.
  let showSecondary = $derived(!(phase === 'hunt' && gameStore.currentHost !== null));
</script>

<div class="core-mobile">
  <!-- The map leads on mobile too. -->
  <div class="map-wrap"><NetworkMap /></div>

  <StatusWarnings />

  <ModeHero {phase} {suggested} {reason} {maturity}>
    <PhaseAction {phase} variant="hero" />
  </ModeHero>

  <ModeSelector {phase} {recommended} {onselect} />

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

  .map-wrap {
    height: min(52vh, 420px);
  }
</style>
