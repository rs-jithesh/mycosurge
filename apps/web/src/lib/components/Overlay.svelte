<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    subtitle,
    onClose,
    placement = 'side',
    children,
  }: {
    title: string;
    subtitle?: string;
    onClose: () => void;
    /** `bottom` slides the sheet up from the bottom (full-screen panels on mobile). */
    placement?: 'side' | 'bottom';
    children: Snippet;
  } = $props();

  function onScrimWheel(e: WheelEvent) {
    if (e.target === e.currentTarget) e.preventDefault();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="scrim"
  class:slide-up={placement === 'bottom'}
  role="presentation"
  onclick={onClose}
  onwheel={onScrimWheel}
>
  <div
    class="shell"
    class:slide-up={placement === 'bottom'}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label={title}
    onclick={(e) => e.stopPropagation()}
  >
    <header class="bar">
      <button class="cmd-btn secondary back-btn" onclick={onClose} aria-label="Back to Core">
        ← Back
      </button>
      <div class="titles">
        <span class="title text-label-caps">{title}</span>
        {#if subtitle}
          <span class="subtitle text-data-mono">{subtitle}</span>
        {/if}
      </div>
    </header>
    <div class="body">
      {@render children()}
    </div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 150;
    display: flex;
    justify-content: flex-end;
    background: var(--overlay);
    backdrop-filter: blur(2px);
    overscroll-behavior: none;
  }

  .shell {
    display: flex;
    flex-direction: column;
    width: min(560px, 100%);
    height: 100%;
    min-height: 0;
    background: var(--background);
    border-left: 1px solid var(--border);
    box-shadow: var(--shadow-md);
  }

  .bar {
    display: flex;
    align-items: center;
    gap: var(--space-gutter);
    flex-shrink: 0;
    padding: var(--space-unit) var(--space-panel-padding);
    border-bottom: 1px solid var(--border);
    background: var(--surface-container-low);
  }

  .back-btn {
    flex-shrink: 0;
    padding: 4px 10px;
    font-size: 11px;
  }

  .titles {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .title {
    color: var(--primary);
  }

  .subtitle {
    color: var(--secondary);
  }

  .body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: var(--space-gutter);
  }

  @media (max-width: 767px) {
    .scrim {
      justify-content: stretch;
    }

    .shell {
      width: 100%;
      border-left: none;
    }
  }

  /* Bottom placement: full-screen sheets slide up from the bottom on mobile. */
  @media (max-width: 767px) {
    .shell.slide-up {
      animation: sheet-up var(--duration-normal) var(--ease-out-soft);
    }

    .scrim.slide-up {
      animation: scrim-in var(--duration-normal) var(--ease-out-soft);
    }
  }

  @keyframes sheet-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  @keyframes scrim-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .shell.slide-up,
    .scrim.slide-up {
      animation: none;
    }
  }
</style>
