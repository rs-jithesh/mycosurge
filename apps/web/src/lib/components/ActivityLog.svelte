<script lang="ts">
  import { logStore } from '$lib/stores/log.svelte';
  import { tick } from 'svelte';

  let { embedded = false, collapsible = false }: { embedded?: boolean; collapsible?: boolean } =
    $props();

  let expanded = $state(false);
  let container = $state<HTMLDivElement>();
  let panel = $state<HTMLDivElement>();
  let autoScroll = $state(true);

  // Resizable when expanded (mobile): drag the top handle, capped at half the viewport.
  let openHeight = $state(240);
  let resizing = false;
  let resizeStartY = 0;
  let resizeStartH = 0;
  const MIN_HEIGHT = 96;
  const MAX_FRACTION = 0.5;

  function maxHeight(): number {
    return typeof window !== 'undefined' ? Math.round(window.innerHeight * MAX_FRACTION) : 400;
  }

  function clampHeight(h: number): number {
    return Math.min(maxHeight(), Math.max(MIN_HEIGHT, h));
  }

  function startResize(event: PointerEvent) {
    resizing = true;
    resizeStartY = event.clientY;
    resizeStartH = panel?.clientHeight ?? openHeight;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function moveResize(event: PointerEvent) {
    if (!resizing) return;
    // Dragging up grows the panel (it is anchored to the bottom of the screen).
    openHeight = clampHeight(resizeStartH + (resizeStartY - event.clientY));
  }

  function endResize(event: PointerEvent) {
    if (!resizing) return;
    resizing = false;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  }

  function resizeKey(event: KeyboardEvent) {
    const step = 24;
    if (event.key === 'ArrowUp') openHeight = clampHeight(openHeight + step);
    else if (event.key === 'ArrowDown') openHeight = clampHeight(openHeight - step);
    else return;
    event.preventDefault();
  }

  // Re-clamp the height whenever it opens (or the viewport changes).
  $effect(() => {
    if (expanded) openHeight = clampHeight(openHeight);
  });

  function handleScroll() {
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    autoScroll = scrollHeight - scrollTop - clientHeight < 32;
  }

  function scrollToBottom() {
    if (container && autoScroll) {
      container.scrollTop = container.scrollHeight;
    }
  }

  $effect(() => {
    logStore.entries;
    expanded;
    tick().then(scrollToBottom);
  });

  function pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  function formatTime(ts: number): string {
    const d = new Date(ts);
    return `[${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]`;
  }
</script>

<div
  class="log-panel"
  class:embedded
  class:collapsible
  class:open={expanded}
  bind:this={panel}
  style={collapsible && expanded ? `height: ${openHeight}px` : ''}
>
  {#if collapsible && expanded}
    <button
      type="button"
      class="log-resize"
      aria-label="Resize activity log"
      onpointerdown={startResize}
      onpointermove={moveResize}
      onpointerup={endResize}
      onpointercancel={endResize}
      onkeydown={resizeKey}
    >
      <span class="log-grip" aria-hidden="true"></span>
    </button>
  {/if}
  {#if collapsible}
    <button
      class="log-header log-toggle text-label-caps"
      aria-expanded={expanded}
      aria-controls="activity-log"
      onclick={() => (expanded = !expanded)}
    >
      <span>Activity</span>
      <span class="chevron" class:up={expanded} aria-hidden="true">⌄</span>
    </button>
  {:else}
    <div class="log-header text-label-caps">Activity</div>
  {/if}
  {#if !collapsible || expanded}
    <div
      id="activity-log"
      class="log-container"
      role="log"
      aria-live="polite"
      aria-label="Activity log"
      bind:this={container}
      onscroll={handleScroll}
    >
      {#each logStore.entries as entry (entry.id)}
        <p
          class="line"
          class:is-info={entry.level === 'info'}
          class:is-warn={entry.level === 'warn'}
          class:is-error={entry.level === 'error'}
          class:is-success={entry.level === 'success'}
        >
          <span class="time">{formatTime(entry.timestamp)}</span>
          <span class="msg"
            >{entry.text}{#if entry.count > 1}<span class="count">×{entry.count}</span>{/if}</span
          >
        </p>
      {/each}
    </div>
  {/if}
</div>

<style>
  .log-panel {
    border-top: 1px solid var(--border);
    background: var(--surface-container-lowest);
    display: flex;
    flex-direction: column;
    max-height: 140px;
  }

  /* Embedded: rendered as a bordered card (e.g. inside the Core column). */
  .log-panel.embedded {
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--surface-container);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    max-height: 260px;
  }

  .log-panel.embedded .log-header {
    background: var(--surface-container-low);
  }

  .log-header {
    color: var(--primary);
    padding: var(--space-unit) var(--space-panel-padding);
    background: var(--surface-container-low);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .log-container {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-unit) var(--space-panel-padding);
    font-size: var(--font-data-mono);
    line-height: var(--line-data-mono);
  }

  @media (max-width: 480px) {
    .log-panel:not(.collapsible) {
      max-height: 100px;
    }
  }

  /* ── Collapsible (mobile): compact bar that opens into the feed ── */
  .log-panel.collapsible {
    flex-shrink: 0;
    max-height: none;
    background: var(--surface-container-lowest);
  }

  .log-panel.collapsible.open {
    max-height: 50vh;
  }

  /* Drag handle: sits at the top edge, drag up to grow the log. */
  .log-resize {
    flex-shrink: 0;
    width: 100%;
    height: 16px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-bottom: 1px solid var(--border);
    cursor: ns-resize;
    touch-action: none;
    background: var(--surface-container-low);
  }

  .log-grip {
    width: 44px;
    height: 4px;
    border-radius: 2px;
    background: var(--outline-variant);
    transition: background var(--duration-fast) var(--ease-out-soft);
  }

  .log-resize:hover .log-grip {
    background: var(--primary);
  }

  .log-resize:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: -2px;
  }

  .log-resize:focus-visible .log-grip {
    background: var(--primary);
  }

  .log-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 40px;
    border: 0;
    border-radius: 0;
    font-family: inherit;
    cursor: pointer;
  }

  .log-panel.collapsible:not(.open) .log-toggle {
    border-bottom: 0;
  }

  .chevron {
    color: var(--on-surface-variant);
    font-size: 15px;
    line-height: 1;
    transition: transform var(--duration-fast) var(--ease-out-soft);
  }

  .chevron.up {
    transform: rotate(180deg);
  }

  .log-panel.collapsible .log-container {
    min-height: 0;
  }

  .line {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .time {
    color: var(--secondary);
    margin-right: var(--space-unit);
  }

  .count {
    margin-left: 6px;
    color: var(--on-surface-variant);
    opacity: 0.75;
  }

  .is-info .msg {
    color: var(--on-surface-variant);
  }

  .is-warn .msg {
    color: var(--on-surface);
  }

  .is-error .msg {
    color: var(--alert);
  }

  .is-success .msg {
    color: var(--primary);
  }
</style>
