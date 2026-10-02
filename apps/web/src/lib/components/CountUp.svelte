<script lang="ts">
  import { untrack } from 'svelte';

  let {
    value,
    duration = 450,
    format,
  }: {
    value: number;
    duration?: number;
    format?: (n: number) => string;
  } = $props();

  let shown = $state(untrack(() => value));
  let frame = 0;
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  $effect(() => {
    const target = value;
    const start = untrack(() => shown);
    if (reduceMotion || !Number.isFinite(target) || target === start) {
      shown = target;
      return;
    }
    cancelAnimationFrame(frame);
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      shown = start + (target - start) * eased;
      if (p < 1) frame = requestAnimationFrame(tick);
      else shown = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });

  let text = $derived(format ? format(shown) : Math.round(shown).toLocaleString());
</script>

<span class="count-up">{text}</span>
