<script lang="ts">
  import { logStore } from '$lib/stores/log.svelte';
  import { tick } from 'svelte';

  let container: HTMLDivElement;
  let autoScroll = $state(true);

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

<div class="log-panel">
  <div class="log-header text-label-caps">Activity</div>
  <div
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
        <span class="msg">{entry.text}</span>
      </p>
    {/each}
  </div>
</div>

<style>
  .log-panel {
    border-top: 1px solid var(--border);
    background: var(--surface-container-lowest);
    display: flex;
    flex-direction: column;
    max-height: 140px;
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
    .log-panel {
      max-height: 100px;
    }
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
