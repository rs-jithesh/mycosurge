<script lang="ts">
  import type { GrowthPhase } from '@mycosurge/game-engine';
  import ResourcePanel from '$lib/components/ResourcePanel.svelte';
  import PhaseDetailPanel from '$lib/components/PhaseDetailPanel.svelte';
  import ActivityLog from '$lib/components/ActivityLog.svelte';
  import GrowthCycleWheel from '$lib/components/GrowthCycleWheel.svelte';
  import CycleCore from '$lib/components/CycleCore.svelte';
  import StatusWarnings from './StatusWarnings.svelte';

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
</script>

<div class="core">
  <StatusWarnings />

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
        <GrowthCycleWheel {phase} {recommended} {onselect} {nucleus} />
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

<style>
  .core {
    display: flex;
    flex-direction: column;
    gap: var(--space-gutter);
    justify-content: center;
    min-height: calc(100dvh - 80px);
  }

  .core-grid {
    display: grid;
    gap: var(--space-gutter);
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      'resources resources'
      'cycle stage';
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

  .wheel-wrap {
    width: 100%;
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
