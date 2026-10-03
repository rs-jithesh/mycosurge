<script lang="ts">
  import { base } from '$app/paths';
  import { ICON_META } from '$lib/content/icons';
  import type { IconKey } from '$lib/content/icons';

  let {
    name,
    size = 18,
    label,
    round = false,
    class: className = '',
  }: {
    name: IconKey;
    size?: number;
    label?: string;
    round?: boolean;
    class?: string;
  } = $props();

  const meta = $derived(ICON_META[name]);
  let failed = $state(false);
</script>

{#if failed}
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
    alt={label ?? ''}
    aria-hidden={label ? undefined : 'true'}
    draggable="false"
    onerror={() => (failed = true)}
  />
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
