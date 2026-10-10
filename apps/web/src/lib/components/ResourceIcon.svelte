<script lang="ts">
  import { base } from '$app/paths';
  import { resolveIcon } from '$lib/content/icons';
  import type { IconName } from '$lib/content/icons';
  import Tooltip from './Tooltip.svelte';

  let {
    name,
    size = 18,
    label,
    round = false,
    class: className = '',
    detail = '',
    focusable = true,
    tooltip,
  }: {
    /** A registry key (`gather`, `soil_nematode`, …) or a resource id (`water`, `reach`, …). */
    name: IconName;
    size?: number;
    label?: string;
    round?: boolean;
    class?: string;
    /** Live detail (e.g. `140 / 140`) shown in a resource tooltip. */
    detail?: string;
    focusable?: boolean;
    /** Show the resource tooltip. Defaults to true for resources, false otherwise. */
    tooltip?: boolean;
  } = $props();

  const meta = $derived(resolveIcon(name));
  let failed = $state(false);
  const showTip = $derived(tooltip ?? meta.description !== undefined);
</script>

{#snippet glyph()}
  {#if !meta.file || failed}
    <span
      class="resource-icon resource-icon--glyph {className}"
      style="width: {size}px; height: {size}px; font-size: {size}px;"
      data-tone={meta.tone}
      aria-hidden="true">{meta.glyph}</span
    >
  {:else}
    <img
      class="resource-icon resource-icon--img {className}"
      class:resource-icon--round={round}
      src="{base}/assets/icons/{meta.file}"
      width={size}
      height={size}
      style="width: {size}px; height: {size}px;"
      alt={label ?? ''}
      aria-hidden={label ? undefined : 'true'}
      draggable="false"
      onerror={() => (failed = true)}
    />
  {/if}
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
  .resource-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    vertical-align: -0.125em;
    object-fit: contain;
  }

  .resource-icon--round {
    border-radius: 50%;
  }

  .resource-icon--glyph {
    line-height: 1;
    color: var(--primary);
  }

  .resource-icon--glyph[data-tone='cyan'] {
    color: var(--secondary);
  }

  .resource-icon--glyph[data-tone='violet'] {
    color: var(--nutrient);
  }

  .resource-icon--glyph[data-tone='amber'] {
    color: var(--tertiary);
  }

  .resource-icon--glyph[data-tone='coral'] {
    color: var(--alert);
  }

  .resource-icon--glyph[data-tone='mint'] {
    color: var(--primary);
  }
</style>
