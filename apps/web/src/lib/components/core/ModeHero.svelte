<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { GrowthPhase, AdvisorMaturity } from '@mycosurge/game-engine';
  import { phaseMeta } from '$lib/content/phases';
  import CycleCore from '$lib/components/CycleCore.svelte';

  let {
    phase,
    suggested = null,
    reason = null,
    maturity = null,
    children,
  }: {
    phase: GrowthPhase;
    suggested?: GrowthPhase | null;
    reason?: string | null;
    maturity?: AdvisorMaturity | null;
    children?: Snippet;
  } = $props();

  let meta = $derived(phaseMeta(phase));
</script>

<div class="mode-hero" data-tone={meta.tone}>
  <CycleCore {phase} {suggested} {reason} {maturity} variant="hero" />
  {#if children}
    <div class="hero-action">{@render children()}</div>
  {/if}
</div>

<style>
  .mode-hero {
    --tone: var(--primary);
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 20px var(--space-panel-padding);
    border: 1px solid color-mix(in srgb, var(--tone) 40%, var(--border));
    border-radius: var(--radius-lg);
    background: var(--surface-container);
    box-shadow:
      var(--shadow-sm),
      inset 0 0 40px -22px var(--tone);
  }

  .mode-hero[data-tone='cyan'] {
    --tone: var(--secondary);
  }
  .mode-hero[data-tone='amber'] {
    --tone: var(--warning);
  }
  .mode-hero[data-tone='coral'] {
    --tone: var(--alert);
  }
  .mode-hero[data-tone='mint'] {
    --tone: var(--primary);
  }

  .hero-action {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
</style>
