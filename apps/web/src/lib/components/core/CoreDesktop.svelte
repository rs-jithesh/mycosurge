<script lang="ts">
  import type { GrowthPhase, AdvisorMaturity } from '@mycosurge/game-engine';
  import ResourcePanel from '$lib/components/ResourcePanel.svelte';
  import PhaseDetailPanel from '$lib/components/PhaseDetailPanel.svelte';
  import NetworkMap from '$lib/components/map/NetworkMap.svelte';
  import ModeSelector from './ModeSelector.svelte';
  import StatusWarnings from './StatusWarnings.svelte';

  let {
    phase,
    recommended,
    onselect,
  }: {
    phase: GrowthPhase;
    recommended: GrowthPhase;
    suggested?: GrowthPhase | null;
    reason?: string | null;
    maturity?: AdvisorMaturity | null;
    onselect: (phase: GrowthPhase) => void;
  } = $props();
</script>

<div class="core">
  <div class="core-grid">
    <section class="resources-col">
      <ResourcePanel />
    </section>

    <!-- The map is the home view. -->
    <section class="map-col">
      <div class="map-wrap"><NetworkMap /></div>
      <StatusWarnings />
    </section>

    <!-- The active phase's controls, switched by the compact phase tabs. -->
    <section class="stage-col">
      <ModeSelector {phase} {recommended} {onselect} />
      <PhaseDetailPanel {phase} />
    </section>
  </div>
</div>

<style>
  .core {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: calc(100dvh - 90px);
  }

  .core-grid {
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: grid;
    gap: 12px;
    grid-template-columns: 210px minmax(0, 1fr);
    grid-template-areas:
      'resources map'
      'stage stage';
    align-items: stretch;
  }

  .resources-col {
    grid-area: resources;
    min-width: 0;
  }

  .map-col {
    grid-area: map;
    min-width: 0;
    min-height: 460px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .map-wrap {
    flex: 1;
    min-height: 0;
  }

  .stage-col {
    grid-area: stage;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* Wide: resources | map | controls, all beside each other. */
  @media (min-width: 1180px) {
    .core-grid {
      grid-template-columns: 250px minmax(0, 1fr) 330px;
      grid-template-areas: 'resources map stage';
    }
  }
</style>
