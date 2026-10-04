<script lang="ts">
  import type { GrowthPhase, AdvisorMaturity } from '@mycosurge/game-engine';
  import { phaseMeta } from '$lib/content/phases';
  import ResourceIcon from './ResourceIcon.svelte';

  let {
    phase,
    suggested = null,
    reason = null,
    maturity = null,
    variant = 'nucleus',
  }: {
    phase: GrowthPhase;
    suggested?: GrowthPhase | null;
    /** The organism's short, in-voice reason for the suggestion. */
    reason?: string | null;
    /** Only shown from `aware` up; `germinating` stays a bare hint. */
    maturity?: AdvisorMaturity | null;
    /** `nucleus` is the compact wheel centre; `hero` is the larger mobile focal point. */
    variant?: 'nucleus' | 'hero';
  } = $props();

  let meta = $derived(phaseMeta(phase));
  let next = $derived(suggested && suggested !== phase ? phaseMeta(suggested) : null);
  let showReason = $derived(
    Boolean(reason && maturity && maturity !== 'germinating' && (next || variant === 'hero')),
  );
</script>

<div class="core" class:is-hero={variant === 'hero'} data-tone={meta.tone}>
  <span class="icon" aria-hidden="true"><ResourceIcon name={phase} size={44} round /></span>
  <span class="stage text-label-caps">{meta.label}</span>
  <p class="objective">{meta.objective}</p>
  <div class="wish-slot" class:is-hero={variant === 'hero'}>
    {#if next}
      <span class="wish-chip" data-tone={next.tone}>Wants to {next.label.toLowerCase()}</span>
    {:else if variant === 'hero'}
      <span class="wish-chip is-aligned" data-tone={meta.tone}>All steady</span>
    {/if}
    {#if showReason}
      <p class="wish-reason">{reason}</p>
    {/if}
  </div>
</div>

<style>
  .core {
    --tone: var(--primary);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: clamp(4px, 1.1cqw, 10px);
    width: 100%;
    text-align: center;
  }

  .core[data-tone='cyan'] {
    --tone: var(--secondary);
  }
  .core[data-tone='amber'] {
    --tone: var(--warning);
  }
  .core[data-tone='coral'] {
    --tone: var(--alert);
  }
  .core[data-tone='mint'] {
    --tone: var(--primary);
  }

  .icon {
    display: grid;
    place-items: center;
    width: clamp(44px, 13cqw, 92px);
    height: clamp(44px, 13cqw, 92px);
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--surface-container-high);
    box-shadow: inset 0 0 20px -6px var(--tone);
  }

  .icon :global(img),
  .icon :global(.resource-icon) {
    width: 100%;
    height: 100%;
  }

  .core .stage {
    font-size: clamp(10px, 2.3cqw, 16px);
    color: var(--tone);
  }

  .objective {
    margin: 0;
    max-width: 100%;
    font-size: clamp(11px, 2.3cqw, 16px);
    line-height: 1.45;
    color: var(--on-surface-variant);
  }

  /* The organism's read always occupies this slot — either "wants to X" or an
     aligned note — so the card height never changes when switching phases. */
  .wish-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(4px, 1.1cqw, 10px);
    width: 100%;
  }

  .wish-chip.is-aligned {
    border-color: color-mix(in srgb, var(--tone) 40%, transparent);
    background: color-mix(in srgb, var(--tone) 10%, var(--surface-container-high));
    opacity: 0.9;
  }

  .wish-chip {
    --tone: var(--primary);
    display: inline-flex;
    align-items: center;
    padding: 0.28em 0.85em;
    border-radius: var(--radius-pill);
    border: 1px solid color-mix(in srgb, var(--tone) 50%, transparent);
    background: color-mix(in srgb, var(--tone) 14%, var(--surface-container-high));
    color: var(--tone);
    font-family: var(--font-sans);
    font-size: clamp(9px, 1.9cqw, 13px);
    font-weight: 600;
    white-space: nowrap;
  }

  .wish-chip[data-tone='cyan'] {
    --tone: var(--secondary);
  }
  .wish-chip[data-tone='amber'] {
    --tone: var(--warning);
  }
  .wish-chip[data-tone='coral'] {
    --tone: var(--alert);
  }
  .wish-chip[data-tone='mint'] {
    --tone: var(--primary);
  }

  .wish-reason {
    margin: 0;
    max-width: 24ch;
    font-size: clamp(9px, 1.9cqw, 13px);
    line-height: 1.4;
    color: var(--on-surface-variant);
    font-style: italic;
    opacity: 0.85;
  }

  /* Pin the mobile reason to two lines too, so its length can't shift the card. */
  .wish-slot.is-hero .wish-reason {
    min-height: 2.8em;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* ── Hero: larger focal point for the mobile current-mode card ── */
  .core.is-hero {
    gap: 8px;
  }

  .core.is-hero .icon {
    width: clamp(72px, 26cqw, 116px);
    height: clamp(72px, 26cqw, 116px);
    border-color: color-mix(in srgb, var(--tone) 45%, var(--border));
    box-shadow:
      inset 0 0 26px -6px var(--tone),
      0 0 22px -8px var(--tone);
  }

  .core.is-hero .stage {
    font-size: 18px;
    letter-spacing: 0.12em;
  }

  .core.is-hero .objective {
    font-size: 14px;
    max-width: 30ch;
    /* Pin to two lines so a longer/shorter objective never resizes the card. */
    min-height: 2.9em;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
