<script lang="ts">
  import Overlay from '$lib/components/Overlay.svelte';
  import ActivityLog from '$lib/components/ActivityLog.svelte';

  let { onClose }: { onClose: () => void } = $props();
</script>

<!-- A narrow right-hand drawer holding the vertical activity log. -->
<Overlay title="Console" width="min(380px, 92vw)" {onClose}>
  <ActivityLog embedded />
</Overlay>
