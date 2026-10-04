<script lang="ts">
  /**
   * Dev-only advisor inspector. Visible when the `mycosurge_dev` flag is set
   * (see devStore). Shows the live recommendation, every candidate's score and
   * the per-consideration contributions that produced it, plus the learned
   * profile. Read-only; it never mutates game state.
   */
  import { onMount } from 'svelte';
  import { gameStore } from '$lib/stores/game.svelte';
  import { devStore } from '$lib/stores/dev.svelte';

  let advisor = $derived(gameStore.advisor);
  let memory = $derived(gameStore.state.advisor.memory);

  let rows = $derived(
    advisor.candidates.flatMap((c) =>
      c.contributions.map((x) => ({
        action: c.actionId,
        score: c.score,
        consideration: x.considerationId,
        value: x.value,
        curve: x.curve,
        weight: x.weight,
        contribution: x.contribution,
      })),
    ),
  );

  let biasRows = $derived(
    Object.entries(memory.bias)
      .map(([id, value]) => ({ id, value }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
  );

  let hostRows = $derived(Object.entries(memory.hostTypeCounts).sort((a, b) => b[1] - a[1]));

  function n(value: number, digits = 3): string {
    return value.toFixed(digits);
  }

  function biasPct(value: number): string {
    return `${value >= 0 ? '+' : ''}${Math.round(value * 100)}%`;
  }

  // ── Dragging ──
  let panelEl: HTMLElement | undefined;
  let pos = $state<{ x: number; y: number } | null>(devStore.advisorPanelPos);
  let dragging = $state(false);
  let offset = { x: 0, y: 0 };

  function clampToViewport(value: number, size: number): number {
    const max = Math.max(8, window.innerWidth - size - 8);
    return Math.min(Math.max(8, value), max);
  }

  // Seed a bottom-right position once mounted so dragging has a concrete origin.
  onMount(() => {
    if (pos || !panelEl) return;
    const rect = panelEl.getBoundingClientRect();
    pos = {
      x: Math.max(8, window.innerWidth - rect.width - 12),
      y: Math.max(8, window.innerHeight - rect.height - 12),
    };
  });

  let panelStyle = $derived(pos ? `left:${pos.x}px; top:${pos.y}px; right:auto; bottom:auto;` : '');

  function startDrag(event: PointerEvent) {
    if (!panelEl) return;
    const rect = panelEl.getBoundingClientRect();
    offset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    dragging = true;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function moveDrag(event: PointerEvent) {
    if (!dragging || !panelEl) return;
    const rect = panelEl.getBoundingClientRect();
    pos = {
      x: clampToViewport(event.clientX - offset.x, rect.width),
      y: clampToViewport(event.clientY - offset.y, rect.height),
    };
  }

  function endDrag(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    if (pos) devStore.setAdvisorPanelPos(pos);
  }
</script>

<aside class="advisor-debug" bind:this={panelEl} style={panelStyle} aria-label="Advisor debug">
  <header
    class="handle"
    class:dragging
    role="group"
    aria-label="Advisor panel"
    onpointerdown={startDrag}
    onpointermove={moveDrag}
    onpointerup={endDrag}
    onpointercancel={endDrag}
  >
    <strong>Advisor</strong>
    <span class="head-right">
      <span class="bucket" data-bucket={advisor.bucket}>{advisor.bucket}</span>
      <button
        class="close-btn"
        type="button"
        aria-label="Hide advisor panel"
        title="Hide advisor panel"
        onpointerdown={(event) => event.stopPropagation()}
        onclick={() => devStore.setShowAdvisorPanel(false)}
      >
        ×
      </button>
    </span>
  </header>

  <p class="voice">“{advisor.explanation}”</p>

  <dl class="meta">
    <div>
      <dt>action</dt>
      <dd>{advisor.actionId}</dd>
    </div>
    <div>
      <dt>phase</dt>
      <dd>{advisor.phase}</dd>
    </div>
    <div>
      <dt>maturity</dt>
      <dd>{advisor.maturity}</dd>
    </div>
    <div>
      <dt>observations</dt>
      <dd>{memory.observations}</dd>
    </div>
    <div>
      <dt>alignment</dt>
      <dd>{n(memory.alignment, 2)}</dd>
    </div>
    <div>
      <dt>victories/defeats</dt>
      <dd>{memory.outcomes.victories}/{memory.outcomes.defeats}</dd>
    </div>
  </dl>

  {#if rows.length > 0}
    <table>
      <thead>
        <tr>
          <th>action</th>
          <th>consideration</th>
          <th class="num">value</th>
          <th class="num">curve</th>
          <th class="num">weight</th>
          <th class="num">contrib</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.action + row.consideration)}
          <tr>
            <td class="action">{row.action}</td>
            <td>{row.consideration}</td>
            <td class="num">{n(row.value, 2)}</td>
            <td class="num">{n(row.curve, 2)}</td>
            <td class="num">{n(row.weight, 2)}</td>
            <td class="num strong">{n(row.contribution)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p class="muted">Emergency bucket — utility scoring skipped.</p>
  {/if}

  <h4>Learned bias</h4>
  {#if biasRows.length > 0}
    <ul class="bias">
      {#each biasRows as row (row.id)}
        <li>
          <span class="id">{row.id}</span>
          <span class="val" class:neg={row.value < 0}>{biasPct(row.value)}</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted">No learned bias yet.</p>
  {/if}

  <h4>Hosts engaged</h4>
  {#if hostRows.length > 0}
    <ul class="bias">
      {#each hostRows as [id, count] (id)}
        <li><span class="id">{id}</span><span class="val">{count}</span></li>
      {/each}
    </ul>
  {:else}
    <p class="muted">None yet.</p>
  {/if}
</aside>

<style>
  .advisor-debug {
    position: fixed;
    right: 12px;
    bottom: 12px;
    z-index: 1000;
    width: min(380px, calc(100vw - 24px));
    max-height: 82vh;
    overflow: auto;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--surface-container-highest) 92%, transparent);
    box-shadow: var(--shadow-sm);
    backdrop-filter: blur(6px);
    color: var(--on-surface);
    font-size: 11px;
    line-height: 1.4;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--on-surface-variant);
  }

  .handle {
    cursor: grab;
    touch-action: none;
    user-select: none;
  }

  .handle.dragging {
    cursor: grabbing;
  }

  .head-right {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .close-btn {
    width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    padding: 0 0 2px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--on-surface-variant);
    font-size: 15px;
    line-height: 1;
    cursor: pointer;
  }

  .close-btn:hover {
    border-color: var(--alert);
    color: var(--alert);
  }

  .bucket {
    padding: 1px 7px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--secondary);
  }

  .bucket[data-bucket='emergency'] {
    color: var(--alert);
    border-color: color-mix(in srgb, var(--alert) 50%, transparent);
  }

  .voice {
    margin: 0 0 8px;
    color: var(--primary);
    font-style: italic;
  }

  .meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px 12px;
    margin: 0 0 10px;
  }

  .meta div {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    border-bottom: 1px dotted var(--border);
  }

  .meta dt {
    color: var(--on-surface-variant);
  }

  .meta dd {
    margin: 0;
    font-family: var(--font-mono);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
  }

  th {
    text-align: left;
    color: var(--on-surface-variant);
    font-weight: 600;
    border-bottom: 1px solid var(--border);
  }

  td,
  th {
    padding: 2px 4px;
    white-space: nowrap;
  }

  .num {
    text-align: right;
    font-family: var(--font-mono);
  }

  .strong {
    color: var(--primary);
  }

  .action {
    color: var(--secondary);
  }

  h4 {
    margin: 10px 0 4px;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--on-surface-variant);
  }

  .bias {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .bias li {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  .bias .id {
    color: var(--on-surface-variant);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bias .val {
    font-family: var(--font-mono);
    color: var(--primary);
  }

  .bias .val.neg {
    color: var(--alert);
  }

  .muted {
    margin: 0;
    color: var(--on-surface-variant);
    opacity: 0.8;
  }
</style>
