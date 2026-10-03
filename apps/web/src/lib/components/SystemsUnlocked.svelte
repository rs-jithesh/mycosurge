<script lang="ts">
  import { UNLOCKED_SYSTEMS, UNLOCKED_NOTE } from '$lib/content/onboarding';
  import ResourceIcon from './ResourceIcon.svelte';

  let { onClose }: { onClose: () => void } = $props();

  let sheetEl = $state<HTMLDivElement>();

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  function trapFocus(e: KeyboardEvent) {
    if (e.key !== 'Tab' || !sheetEl) return;
    const focusables = sheetEl.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="overlay" role="presentation">
  <div
    class="sheet"
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label="Systems unlocked"
    bind:this={sheetEl}
    onkeydown={trapFocus}
  >
    <span class="tag text-label-caps">◆ Network online</span>
    <h2 class="title text-headline-lg">Welcome to the full game</h2>
    <p class="lead">
      Your spore survived. Here's what's now available to you — more will unlock as you grow.
    </p>

    <div class="cards">
      {#each UNLOCKED_SYSTEMS as system (system.name)}
        <div class="card">
          <span class="glyph"><ResourceIcon name={system.icon} size={34} round /></span>
          <div>
            <div class="name text-label-caps">{system.name}</div>
            <p class="blurb">{system.blurb}</p>
          </div>
        </div>
      {/each}
    </div>

    <p class="note">{UNLOCKED_NOTE}</p>

    <button class="cmd-btn primary" onclick={onClose}>Start growing</button>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: grid;
    place-items: center;
    padding: var(--space-gutter);
    background: var(--overlay);
    backdrop-filter: blur(2px);
  }

  .sheet {
    width: 100%;
    max-width: 460px;
    background: var(--surface-container);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    padding: var(--space-margin);
    display: flex;
    flex-direction: column;
    gap: var(--space-gutter);
  }

  .tag {
    color: var(--primary);
  }

  .title {
    margin: 0;
    color: var(--on-surface);
    line-height: 1.2;
  }

  .lead {
    margin: 0;
    color: var(--on-surface-variant);
    font-size: var(--font-body-md);
    line-height: 1.5;
  }

  .cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-unit);
  }

  .card {
    display: flex;
    gap: var(--space-gutter);
    align-items: flex-start;
    background: var(--surface-container-low);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-panel-padding);
  }

  .glyph {
    font-size: 20px;
    color: var(--primary);
    line-height: 1;
    margin-top: 2px;
  }

  .name {
    color: var(--primary);
  }

  .blurb {
    margin: 4px 0 0;
    color: var(--on-surface-variant);
    font-size: var(--font-body-md);
    line-height: 1.45;
  }

  .note {
    margin: 0;
    color: var(--on-surface-variant);
    font-size: var(--font-label-caps);
  }

  .primary {
    justify-content: center;
    background: var(--primary);
    border-color: var(--primary);
    color: var(--on-primary);
    font-weight: 600;
    padding: 14px var(--space-gutter);
  }

  .primary:hover {
    background: var(--primary-fixed-dim);
    border-color: var(--primary-fixed-dim);
    color: var(--on-primary);
  }
</style>
