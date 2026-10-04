<script lang="ts">
  import Overlay from '$lib/components/Overlay.svelte';
  import ResourcePanel from '$lib/components/ResourcePanel.svelte';

  let { onClose }: { onClose: () => void } = $props();
</script>

<Overlay title="Resources" placement="bottom" {onClose}>
  <ResourcePanel />
</Overlay>
