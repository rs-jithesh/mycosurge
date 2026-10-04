<script lang="ts">
  import { HOSTS, getStageByIndex } from '@mycosurge/config';
  import Overlay from '$lib/components/Overlay.svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import { gameStore } from '$lib/stores/game.svelte';

  let { onClose }: { onClose: () => void } = $props();

  const hosts = HOSTS.filter((h) => h.id !== 'soil_nematode').sort(
    (a, b) => a.stage - b.stage || a.name.localeCompare(b.name),
  );

  let gs = $derived(gameStore.state);
  let catalogued = $derived(new Set(gameStore.cataloguedHosts));
  let foundCount = $derived(hosts.filter((h) => catalogued.has(h.id)).length);
</script>

<Overlay
  title="Bestiary"
  subtitle={`${foundCount} of ${hosts.length} catalogued`}
  placement="bottom"
  {onClose}
>
  <p class="hint">
    Every host you drive off is recorded here. Expand the network to uncover the rest.
  </p>

  <ul class="grid">
    {#each hosts as host (host.id)}
      {@const found = catalogued.has(host.id)}
      <li class="entry" class:found>
        <span class="glyph" data-stage={host.stage} data-boss={host.isBoss} aria-hidden="true">
          {found ? host.stage : '?'}
        </span>
        <div class="entry-text">
          {#if found}
            <span class="entry-name">{host.name}</span>
            <span class="entry-meta text-data-mono">
              {getStageByIndex(host.stage).name}{host.isBoss ? ' · Boss' : ''}
            </span>
          {:else}
            <span class="entry-name locked">???</span>
            <span class="entry-meta text-data-mono">
              Something stronger in {getStageByIndex(host.stage).biome}
            </span>
          {/if}
          <div class="entry-progress" class:locked={!found}>
            <ProgressBar
              value={found ? (gs.hostAssimilation[host.id] ?? 0) : 0}
              max={100}
              tone="mint"
              showValue={found}
            />
          </div>
        </div>
      </li>
    {/each}
  </ul>
</Overlay>

<style>
  .hint {
    margin: 0 0 14px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--on-surface-variant);
  }

  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  @media (max-width: 560px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  .entry {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid var(--outline-variant);
    border-radius: var(--radius-md);
    background: var(--surface-container);
    opacity: 0.72;
  }

  .entry.found {
    opacity: 1;
    border-color: color-mix(in srgb, var(--primary) 40%, var(--outline-variant));
  }

  .glyph {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--surface-container-high);
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--on-surface-variant);
  }

  .entry.found .glyph {
    color: var(--primary);
    border-color: color-mix(in srgb, var(--primary) 55%, var(--border));
  }

  .glyph[data-boss='true'] {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--alert) 45%, transparent);
  }

  .entry-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .entry-progress {
    margin-top: 6px;
  }

  .entry-progress.locked {
    opacity: 0.3;
  }

  .entry-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--on-surface);
  }

  .entry-name.locked {
    color: var(--on-surface-variant);
    letter-spacing: 0.15em;
  }

  .entry-meta {
    font-size: 11px;
    color: var(--on-surface-variant);
  }
</style>
