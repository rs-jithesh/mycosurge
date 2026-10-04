<script lang="ts">
  import { RESOURCES, resourceLabel } from '@mycosurge/config';
  import type { ResourceId, ResourceLabelStyle } from '@mycosurge/config';
  import Tooltip from './Tooltip.svelte';

  let {
    id,
    style = 'symbol',
    detail = '',
    focusable = true,
    info = false,
  }: {
    id: ResourceId;
    style?: ResourceLabelStyle;
    /** Optional live detail (e.g. `140 / 140`) shown in the tooltip. */
    detail?: string;
    /** Make the symbol keyboard-focusable so the tooltip is reachable without a mouse. */
    focusable?: boolean;
    /** Show a small ⓘ affordance so the tooltip is discoverable on touch. */
    info?: boolean;
  } = $props();

  let meta = $derived(RESOURCES[id]);
</script>

<Tooltip tone={meta.tone} {focusable}>
  {#snippet content()}
    <span class="tip-title">{meta.name}</span>
    <span class="tip-desc">{meta.description}</span>
    {#if detail}<span class="tip-detail text-data-mono">{detail}</span>{/if}
  {/snippet}
  <span class="symbol">
    {resourceLabel(id, style)}{#if info}<span class="info-glyph" aria-hidden="true">ⓘ</span>{/if}
  </span>
</Tooltip>

<style>
  .symbol {
    color: inherit;
  }

  .info-glyph {
    margin-left: 3px;
    font-size: 0.72em;
    opacity: 0.7;
  }
</style>
