<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    content,
    children,
    tone = 'mint',
    placement = 'top',
    focusable = true,
    disabled = false,
  }: {
    content: Snippet;
    children: Snippet;
    /** Semantic accent for the tooltip frame. */
    tone?: 'mint' | 'amber' | 'coral' | 'cyan' | 'violet';
    placement?: 'top' | 'bottom';
    /** Make the anchor keyboard-focusable so the tooltip is reachable without a mouse. */
    focusable?: boolean;
    disabled?: boolean;
  } = $props();

  // Devices with a real pointer get hover; touch devices get tap-to-toggle.
  const hasHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

  let open = $state(false);
  let pinned = $state(false);
  let resolved = $state<'top' | 'bottom'>('top');
  let anchor = $state<HTMLElement>();
  let left = $state(0);
  let top = $state(0);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function place() {
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const margin = 132; // half the max tip width, keeps it on-screen
    const gap = 10;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    // Flip when the preferred side has no room but the other side does.
    let side = placement;
    if (placement === 'top' && spaceAbove < 150 && spaceBelow > spaceAbove) side = 'bottom';
    else if (placement === 'bottom' && spaceBelow < 150 && spaceAbove > spaceBelow) side = 'top';
    resolved = side;

    left = Math.min(Math.max(rect.left + rect.width / 2, margin), window.innerWidth - margin);
    top =
      side === 'top'
        ? Math.max(rect.top - gap, 8)
        : Math.min(rect.bottom + gap, window.innerHeight - 8);
  }

  function openNow() {
    place();
    open = true;
  }

  function showHover() {
    if (disabled || open) return;
    timer = setTimeout(openNow, 110);
  }

  function hideHover() {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!pinned) open = false;
  }

  function close() {
    pinned = false;
    open = false;
  }

  function onAnchorClick() {
    // Desktop keeps hover behaviour; touch toggles on tap.
    if (hasHover || disabled) return;
    if (timer) clearTimeout(timer);
    timer = null;
    if (open && pinned) {
      close();
    } else {
      openNow();
      pinned = true;
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') close();
  }
</script>

{#if focusable}
  <button
    type="button"
    class="tip-anchor"
    bind:this={anchor}
    aria-describedby={open ? 'active-tooltip' : undefined}
    onmouseenter={showHover}
    onmouseleave={hideHover}
    onfocusin={showHover}
    onfocusout={hideHover}
    onclick={onAnchorClick}
    onkeydown={onKeydown}
  >
    {@render children()}
  </button>
{:else}
  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
  <span
    class="tip-anchor"
    bind:this={anchor}
    onmouseenter={showHover}
    onmouseleave={hideHover}
    onfocusin={showHover}
    onfocusout={hideHover}
    onclick={onAnchorClick}
  >
    {@render children()}
  </span>
{/if}

{#if open && pinned}
  <button class="tip-backdrop" aria-label="Dismiss tooltip" onclick={close}></button>
{/if}

{#if open}
  <span
    id="active-tooltip"
    class="tip"
    data-tone={tone}
    data-placement={resolved}
    style="left: {left}px; top: {top}px;"
    role="tooltip"
  >
    {@render content()}
  </span>
{/if}

<style>
  .tip-anchor {
    display: inline-flex;
    align-items: center;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    color: inherit;
    font: inherit;
    cursor: help;
  }

  .tip-anchor:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  /* Catches the tap that dismisses a pinned (touch) tooltip. */
  .tip-backdrop {
    position: fixed;
    inset: 0;
    z-index: 399;
    padding: 0;
    border: 0;
    background: transparent;
  }

  .tip {
    --tone: var(--primary);
    position: fixed;
    z-index: 400;
    display: flex;
    flex-direction: column;
    gap: 3px;
    width: max-content;
    max-width: min(240px, calc(100vw - 24px));
    padding: 8px 10px;
    border: 1px solid color-mix(in srgb, var(--tone) 45%, var(--border));
    border-radius: var(--radius-md);
    background: var(--surface-container-high);
    box-shadow:
      var(--shadow-md),
      inset 0 0 24px -14px var(--tone);
    color: var(--on-surface);
    font-size: 12px;
    line-height: 1.4;
    pointer-events: none;
    animation: tip-in 120ms var(--ease-out-soft);
  }

  .tip[data-placement='top'] {
    transform: translate(-50%, -100%);
  }

  .tip[data-placement='bottom'] {
    transform: translate(-50%, 0);
  }

  .tip[data-tone='cyan'] {
    --tone: var(--secondary);
  }
  .tip[data-tone='violet'] {
    --tone: var(--nutrient);
  }
  .tip[data-tone='amber'] {
    --tone: var(--warning);
  }
  .tip[data-tone='coral'] {
    --tone: var(--alert);
  }
  .tip[data-tone='mint'] {
    --tone: var(--primary);
  }

  .tip :global(.tip-title) {
    color: var(--tone);
    font-weight: 600;
  }

  .tip :global(.tip-desc) {
    color: var(--on-surface-variant);
  }

  .tip :global(.tip-detail) {
    color: var(--on-surface);
  }

  @keyframes tip-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tip {
      animation: none;
    }
  }
</style>
