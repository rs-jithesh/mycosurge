<script lang="ts">
  // Chat panel — reserved for future use
</script>

<aside class="chat-panel">
  <div class="chat-header">
    <span class="text-label-caps">GLOBAL COMMS</span>
    <span class="online-badge text-label-caps">ONLINE: 4,092</span>
  </div>

  <div class="chat-entries">
    <div class="entry-text chat-empty">[No messages]</div>
  </div>

  <div class="chat-input">
    <span class="input-prompt">&gt;</span>
    <span class="input-cursor">_</span>
  </div>
</aside>

<style>
  .chat-panel {
    width: 320px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--border);
    background: var(--surface-container-lowest);
    overflow: hidden;
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--primary);
    padding: var(--space-unit) var(--space-panel-padding);
    background: var(--surface-container-low);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .online-badge {
    color: var(--primary);
    background: var(--surface-container-highest);
    padding: 1px var(--space-unit);
  }

  .chat-entries {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-panel-padding);
    display: flex;
    flex-direction: column;
    gap: var(--space-gutter);
  }

  .chat-input {
    display: flex;
    align-items: center;
    gap: var(--space-unit);
    padding: var(--space-panel-padding);
    border-top: 1px solid var(--border);
    color: var(--on-surface-variant);
  }

  .input-prompt {
    color: var(--on-surface-variant);
  }

  .input-cursor {
    color: var(--primary);
  }

  .chat-empty {
    color: var(--on-surface-variant);
  }
</style>
