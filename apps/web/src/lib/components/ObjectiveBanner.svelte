<script lang="ts">
  import type { Tone } from '$lib/content/onboarding';

  let {
    tag,
    title,
    description = '',
    hint = '',
    tone = 'mint',
  }: {
    tag: string;
    title: string;
    description?: string;
    hint?: string;
    tone?: Tone;
  } = $props();
</script>

<div class="objective" data-tone={tone}>
  <span class="tag text-label-caps"><span class="glyph">◆</span>{tag}</span>
  <h2 class="title text-headline-md">{title}</h2>
  {#if description}
    <p class="desc">{description}</p>
  {/if}
  {#if hint}
    <p class="hint"><span class="glyph">◆</span>{hint}</p>
  {/if}
</div>

<style>
  .objective {
    background: linear-gradient(180deg, var(--surface-container-high) 0%, var(--surface) 100%);
    border: 1px solid var(--border);
    border-left: 3px solid var(--primary);
    border-radius: var(--radius-md);
    padding: 12px 14px;
  }

  .objective[data-tone='amber'] {
    border-left-color: var(--warning);
  }

  .objective[data-tone='coral'] {
    border-left-color: var(--alert);
  }

  .objective[data-tone='cyan'] {
    border-left-color: var(--secondary);
  }

  .objective[data-tone='cyan'] .tag {
    color: var(--secondary);
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--primary);
  }

  .objective[data-tone='amber'] .tag {
    color: var(--warning);
  }

  .objective[data-tone='coral'] .tag {
    color: var(--alert);
  }

  .glyph {
    font-size: 10px;
  }

  .title {
    margin: 5px 0 0;
    color: var(--on-surface);
    line-height: 1.25;
  }

  .desc {
    margin: 5px 0 0;
    color: var(--on-surface-variant);
    font-size: var(--font-body-md);
    line-height: 1.45;
  }

  .hint {
    margin: 8px 0 0;
    display: flex;
    gap: 7px;
    color: var(--on-surface-variant);
    font-size: var(--font-label-caps);
    line-height: 1.5;
  }

  .hint .glyph {
    color: var(--warning);
    font-size: 9px;
    line-height: 1.7;
  }

  .objective[data-tone='mint'] .hint .glyph {
    color: var(--primary);
  }

  .objective[data-tone='coral'] .hint .glyph {
    color: var(--alert);
  }
</style>
