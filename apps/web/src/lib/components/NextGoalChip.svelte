<script lang="ts">
  import type { HookObjective, HookProgress } from '@mycosurge/game-engine';

  /**
   * The always-close goal: "N more <unit>" for the next hook objective, with a thin
   * progress track. Rendered only while the hook has an active target, so it disappears
   * once the first hunt begins.
   */
  let { objective, progress }: { objective: HookObjective; progress: HookProgress } = $props();

  let remaining = $derived(Math.max(0, Math.ceil(progress.target - progress.current)));
  let unit = $derived(remaining === 1 ? progress.unit : (progress.unitPlural ?? progress.unit));
  let pct = $derived(
    progress.target > 0 ? Math.min(100, (progress.current / progress.target) * 100) : 0,
  );
</script>

<div class="goal-chip">
  <div class="goal-head">
    <span class="goal-kicker text-label-caps">Next</span>
    <span class="goal-delta text-data-mono">{remaining} more {unit}</span>
  </div>
  <span class="goal-action">{objective.action}</span>
  <div class="goal-track" aria-hidden="true">
    <span class="goal-fill" style="width: {pct}%"></span>
  </div>
</div>

<style>
  .goal-chip {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 9px var(--space-panel-padding);
    background: var(--surface-container);
    border: 1px solid var(--border);
    border-left: 3px solid var(--primary);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
  }

  .goal-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-gutter);
  }

  .goal-kicker {
    color: var(--primary);
  }

  .goal-delta {
    color: var(--on-surface);
  }

  .goal-action {
    color: var(--on-surface-variant);
    font-size: var(--font-body-md);
  }

  .goal-track {
    height: 4px;
    border-radius: var(--radius-pill);
    background: var(--surface-container-high);
    overflow: hidden;
  }

  .goal-fill {
    display: block;
    height: 100%;
    border-radius: var(--radius-pill);
    background: var(--primary);
    transition: width var(--duration-normal) var(--ease-out-soft);
  }
</style>
