<script lang="ts">
  import { resolveIcon } from '$lib/content/icons';
  import type { IconName } from '$lib/content/icons';
  import Tooltip from './Tooltip.svelte';

  let {
    name,
    size = 18,
    class: className = '',
    detail = '',
    focusable = true,
    tooltip,
  }: {
    /** A registry key (`gather`, `soil_nematode`, …) or a resource id (`water`, `reach`, …). */
    name: IconName;
    size?: number;
    class?: string;
    /** Live detail (e.g. `140 / 140`) shown in a resource tooltip. */
    detail?: string;
    focusable?: boolean;
    /** Show the resource tooltip. Defaults to true for resources, false otherwise. */
    tooltip?: boolean;
  } = $props();

  const meta = $derived(resolveIcon(name));
  const showTip = $derived(tooltip ?? meta.description !== undefined);
</script>

{#snippet glyph()}
  <span
    class="resource-icon {className}"
    style="width: {size}px; height: {size}px; font-size: {size}px;"
    data-tone={meta.tone}
    aria-hidden="true">{meta.glyph}</span
  >
{/snippet}

{#if showTip}
  <Tooltip tone={meta.tone} {focusable}>
    {#snippet content()}
      <span class="tip-title">{meta.label}</span>
      {#if meta.description}<span class="tip-desc">{meta.description}</span>{/if}
      {#if detail}<span class="tip-detail text-data-mono">{detail}</span>{/if}
    {/snippet}
    {@render glyph()}
  </Tooltip>
{:else}
  {@render glyph()}
{/if}

<style>
  /* Everything renders as a glyph for now; raster artwork is deferred (ASSET-PLAN.md). */
  .resource-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    line-height: 1;
    vertical-align: -0.125em;
    color: var(--primary);
  }

  .resource-icon[data-tone='cyan'] {
    color: var(--secondary);
  }

  .resource-icon[data-tone='violet'] {
    color: var(--nutrient);
  }

  .resource-icon[data-tone='amber'] {
    color: var(--tertiary);
  }

  .resource-icon[data-tone='coral'] {
    color: var(--alert);
  }

  .resource-icon[data-tone='mint'] {
    color: var(--primary);
  }
</style>
